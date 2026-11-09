package sn.kafountine.gestionmunicipale.modules.marche;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;

/** Crée le loyer dû de chaque place occupée, une fois par période et sans rattrapage du passé. */
@Service
public class LoyerService {
  private static final Logger LOG = LoggerFactory.getLogger(LoyerService.class);
  private static final long VERROU = 727_001L;
  private static final String[] MOIS = {"Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"};
  private static final Set<String> TRIMESTRE = Set.of("trimestre", "trimestriel");
  private static final Set<String> SEMESTRE = Set.of("semestre", "semestriel");
  private static final Set<String> ANNEE = Set.of("annee", "année", "annuel");

  private final Db db;

  public LoyerService(Db db) {
    this.db = db;
  }

  /** Libellé de la période en cours pour un rythme de paiement ; les anciennes valeurs valent « mois ». */
  static String libelle(String rythme, LocalDate date) {
    String valeur = rythme == null ? "" : rythme.strip().toLowerCase(Locale.ROOT);
    int annee = date.getYear();
    int mois = date.getMonthValue();
    if (TRIMESTRE.contains(valeur)) {
      int trimestre = (mois - 1) / 3 + 1;
      return (trimestre == 1 ? "1er" : trimestre + "e") + " trimestre " + annee;
    }
    if (SEMESTRE.contains(valeur)) return (mois <= 6 ? "1er" : "2e") + " semestre " + annee;
    if (ANNEE.contains(valeur)) return "Année " + annee;
    return MOIS[mois - 1] + " " + annee;
  }

  /** Une saisie ancienne porte parfois le mois seul (« Février ») : c'est la même échéance. */
  static String moisSeul(String libelle) {
    int espace = libelle.indexOf(' ');
    return espace > 0 && List.of(MOIS).contains(libelle.substring(0, espace)) ? libelle.substring(0, espace) : libelle;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void auDemarrage() {
    executer();
  }

  @Scheduled(cron = "0 5 0 * * *", zone = "UTC")
  public void chaqueJour() {
    executer();
  }

  private void executer() {
    try {
      int crees = genererInterne(null);
      if (crees > 0) LOG.info("{} loyer(s) dû(s) créé(s)", crees);
    } catch (RuntimeException failure) {
      // Une échéance manquée est reprise au prochain passage : l'application reste disponible.
      LOG.error("Génération des loyers impossible", failure);
    }
  }

  /** Reconduit les places sur la nouvelle année, puis crée les loyers de la période en cours. */
  @Transactional
  public int genererInterne(String placeId) {
    db.one("SELECT pg_advisory_xact_lock(:verrou)::text AS ok", Db.params("verrou", VERROU));
    LocalDate jour = LocalDate.now(ZoneOffset.UTC);
    int annee = jour.getYear();
    if (placeId == null) reconduire(annee);
    StringBuilder sql = new StringBuilder("""
        SELECT "id", "periode", "tarif" FROM "MarketPlace"
        WHERE "year" = :year AND "statut" = 'OCCUPEE' AND "occupantId" IS NOT NULL AND "tarif" > 0
        """);
    var params = Db.params("year", annee);
    if (placeId != null) {
      sql.append(" AND \"id\" = :id");
      params.addValue("id", placeId);
    }
    int crees = 0;
    for (Map<String, Object> place : db.list(sql.toString(), params)) {
      String libelle = libelle(Db.str(place, "periode"), jour);
      crees += db.update("""
          INSERT INTO "MarketPayment" ("id", "placeId", "montant", "periode", "statut", "year", "createdAt", "updatedAt")
          SELECT :id, :placeId, :montant, :libelle, 'EN_ATTENTE', :year, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          WHERE NOT EXISTS (
            SELECT 1 FROM "MarketPayment" WHERE "placeId" = :placeId AND "year" = :year AND "statut" <> 'ANNULE'
              AND LOWER("periode") IN (LOWER(:libelle), LOWER(:mois)))
          """, Db.params("id", Db.uuid(), "placeId", place.get("id"), "montant", place.get("tarif"), "libelle", libelle,
          "mois", moisSeul(libelle), "year", annee));
    }
    return crees;
  }

  private void reconduire(int annee) {
    int copiees = db.update("""
        INSERT INTO "MarketPlace" ("id", "numeroPlace", "type", "zone", "occupantId", "activite", "telephone", "dateAttribution", "tarif", "periode", "statut", "year", "createdAt", "updatedAt")
        SELECT gen_random_uuid()::text, p."numeroPlace", p."type", p."zone", p."occupantId", p."activite", p."telephone", p."dateAttribution", p."tarif", p."periode", p."statut", :year, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM "MarketPlace" p
        WHERE p."year" = :precedente AND NOT EXISTS (SELECT 1 FROM "MarketPlace" c WHERE c."numeroPlace" = p."numeroPlace" AND c."year" = :year)
        """, Db.params("year", annee, "precedente", annee - 1));
    if (copiees > 0) LOG.info("{} place(s) reconduite(s) sur {}", copiees, annee);
  }
}
