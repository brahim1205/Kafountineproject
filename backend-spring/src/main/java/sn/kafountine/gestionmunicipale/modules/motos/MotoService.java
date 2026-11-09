package sn.kafountine.gestionmunicipale.modules.motos;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import sn.kafountine.gestionmunicipale.modules.caisse.CaisseService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.kafountine.gestionmunicipale.shared.audit.Actor;
import sn.kafountine.gestionmunicipale.shared.audit.AuditTrail;
import sn.kafountine.gestionmunicipale.shared.config.JacksonConfig;
import sn.kafountine.gestionmunicipale.shared.domain.ContribuableLookup;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.numbering.NumeroSequence;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;
import sn.kafountine.gestionmunicipale.shared.persistence.Sql;
import sn.kafountine.gestionmunicipale.shared.validation.Common;
import sn.kafountine.gestionmunicipale.shared.text.Js;

/** Motos et paiements (MotoService et PrismaMotoRepository côté Node). */
@Service
public class MotoService {
  public static final double DROIT_ADHESION = 5000;
  public static final double TARIF_MENSUEL = 2000;
  public static final double PENALITE_RETARD = 10000;
  public static final double AMENDE_POLICE = 25000;
  private static final String SELECT_MOTO = """
      SELECT m.*, p."nom" AS "proprietaireNom", p."prenom" AS "proprietairePrenom", p."nin" AS "proprietaireNin", p."telephone" AS "proprietaireTelephone",
             d."nom" AS "conducteurNom", d."prenom" AS "conducteurPrenom", d."nin" AS "conducteurNin", d."telephone" AS "conducteurTelephone"
      FROM "MotoRegistration" m
      INNER JOIN "Contribuable" p ON p."id" = m."proprietaireId"
      LEFT JOIN "Contribuable" d ON d."id" = m."conducteurId"
      """;
  private static final List<String> PEOPLE = List.of("proprietaireNom", "proprietairePrenom", "proprietaireNin", "proprietaireTelephone",
      "conducteurNom", "conducteurPrenom", "conducteurNin", "conducteurTelephone");
  private static final DateTimeFormatter MONTH_FR = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.FRENCH);

  private final Db db;
  private final ContribuableLookup contribuables;
  private final AuditTrail auditTrail;
  private final NumeroSequence numeros;

  private final CaisseService caisse;

  public MotoService(Db db, ContribuableLookup contribuables, AuditTrail auditTrail, NumeroSequence numeros, CaisseService caisse) {
    this.caisse = caisse;
    this.db = db;
    this.contribuables = contribuables;
    this.auditTrail = auditTrail;
    this.numeros = numeros;
  }

  /** La cotisation d'un mois est due en fin de mois ; le retard commence après le 10 du mois suivant. */
  static Instant limiteApres(Instant date) {
    LocalDate month = date.atZone(ZoneOffset.UTC).toLocalDate().withDayOfMonth(1).plusMonths(1);
    return month.withDayOfMonth(10).atTime(23, 59, 59, 999_000_000).toInstant(ZoneOffset.UTC);
  }

  private static String libelleMois(LocalDate date) {
    return MONTH_FR.format(date);
  }

  /** Le mois couvert par une échéance est celui qui précède sa date limite. */
  private static String moisCouvert(Instant limite) {
    return libelleMois(limite.atZone(ZoneOffset.UTC).toLocalDate().withDayOfMonth(1).minusMonths(1));
  }

  private static boolean estEnRetard(Map<String, Object> row, Instant now) {
    Instant prochain = Db.date(row, "prochainPaiement");
    return Boolean.TRUE.equals(row.get("enRetard")) || (prochain != null && prochain.isBefore(now));
  }

  private static boolean truthy(String value) {
    return value != null && !value.isEmpty();
  }

  /** peopleDisplay : le conducteur vaut le propriétaire quand il est absent. */
  private static Map<String, Object> people(Map<String, Object> proprietaire, Map<String, Object> conducteur) {
    Map<String, Object> people = new LinkedHashMap<>();
    people.put("proprietaireNom", proprietaire.get("nom"));
    people.put("proprietairePrenom", proprietaire.get("prenom"));
    people.put("proprietaireNin", proprietaire.get("nin"));
    people.put("proprietaireTelephone", proprietaire.get("telephone"));
    for (String field : List.of("nom", "prenom", "nin", "telephone")) {
      Object own = conducteur == null ? null : conducteur.get(field);
      people.put("conducteur" + Character.toUpperCase(field.charAt(0)) + field.substring(1),
          own != null && !own.toString().isEmpty() ? own : proprietaire.get(field));
    }
    return people;
  }

  private Map<String, Object>[] findPeople(String proprietaireId, String conducteurId) {
    Map<String, Object> proprietaire = contribuables.findById(proprietaireId);
    Map<String, Object> conducteur = truthy(conducteurId) ? contribuables.findById(conducteurId) : null;
    if (proprietaire == null) throw AppException.notFound("Propriétaire introuvable.");
    if (truthy(conducteurId) && conducteur == null) throw AppException.notFound("Conducteur introuvable.");
    @SuppressWarnings("unchecked") Map<String, Object>[] result = new Map[] {proprietaire, conducteur};
    return result;
  }

  private String findIdBy(String column, String value) {
    Map<String, Object> row = db.one("SELECT \"id\" FROM \"MotoRegistration\" WHERE \"" + column + "\" = :value LIMIT 1", Db.params("value", value));
    return row == null ? null : Db.str(row, "id");
  }

  private Map<String, Object> findById(String id) {
    return db.one(SELECT_MOTO + " WHERE m.\"id\" = :id LIMIT 1", Db.params("id", id));
  }

  public List<Map<String, Object>> list(int year, String search, Integer limit) {
    List<Map<String, Object>> filtered = new ArrayList<>();
    for (Map<String, Object> row : db.list(SELECT_MOTO + " WHERE m.\"year\" = :year ORDER BY m.\"createdAt\" DESC", Db.params("year", year))) {
      if (search.isEmpty()) {
        filtered.add(row);
        continue;
      }
      String haystack = String.join(" ", nz(row.get("matricule")), nz(row.get("marque")), nz(row.get("modele")), nz(row.get("permis")),
          nz(row.get("proprietaireNom")), nz(row.get("proprietairePrenom")), nz(row.get("conducteurNom")), nz(row.get("conducteurPrenom"))).toLowerCase(Locale.ROOT);
      if (haystack.contains(search)) filtered.add(row);
    }
    int count = limit != null && limit > 0 ? Math.min(limit, filtered.size()) : filtered.size();
    List<Map<String, Object>> result = new ArrayList<>();
    for (Map<String, Object> row : filtered.subList(0, count)) result.add(motoView(row));
    return result;
  }

  private static final String RETARD = "(m.\"enRetard\" OR m.\"prochainPaiement\" < CURRENT_TIMESTAMP)";

  /** Liste paginée : recherche et retards sont évalués en base, sur toute l'année. */
  public Map<String, Object> page(int year, String search, String etat, Common.Paging paging) {
    MapSqlParameterSource params = Db.params("year", year, "limit", paging.limit(), "offset", paging.offset());
    StringBuilder where = new StringBuilder(" WHERE m.\"year\" = :year");
    if (!search.isEmpty()) {
      where.append(" AND (m.\"matricule\" ILIKE :like OR m.\"marque\" ILIKE :like OR m.\"modele\" ILIKE :like OR m.\"permis\" ILIKE :like")
          .append(" OR p.\"nom\" ILIKE :like OR p.\"prenom\" ILIKE :like OR d.\"nom\" ILIKE :like OR d.\"prenom\" ILIKE :like)");
      params.addValue("like", "%" + Sql.escapeLike(search) + "%");
    }
    if ("retard".equals(etat)) where.append(" AND ").append(RETARD);
    if ("ajour".equals(etat)) where.append(" AND NOT ").append(RETARD);
    List<Map<String, Object>> data = new ArrayList<>();
    for (Map<String, Object> row : db.list(SELECT_MOTO + where + " ORDER BY m.\"createdAt\" DESC, m.\"id\" DESC LIMIT :limit OFFSET :offset", params)) data.add(motoView(row));
    long total = db.count("SELECT COUNT(*) FROM \"MotoRegistration\" m INNER JOIN \"Contribuable\" p ON p.\"id\" = m.\"proprietaireId\" LEFT JOIN \"Contribuable\" d ON d.\"id\" = m.\"conducteurId\"" + where, params);
    return Api.map("data", data, "meta", paging.meta(total));
  }

  private static String nz(Object value) {
    return value == null ? "" : value.toString();
  }

  public record MotoInput(String matricule, String marque, String modele, Integer annee, String couleur, boolean couleurProvided, String proprietaireId,
      String conducteurId, boolean conducteurProvided, String permis, boolean permisProvided, String statut, String photo, boolean photoProvided,
      Boolean enRetard, Double montantPenalite, String prochainPaiement, String dernierPaiement, Integer year) {}

  private static final String UPSERT_COLUMNS = "\"matricule\", \"marque\", \"modele\", \"annee\", \"couleur\", \"proprietaireId\", \"conducteurId\", \"permis\", \"statut\","
      + " \"photo\", \"enRetard\", \"montantPenalite\", \"prochainPaiement\", \"dernierPaiement\", \"year\"";

  @Transactional
  public Map<String, Object> create(Actor actor, MotoInput input) {
    String matricule = nz(input.matricule()).strip().toUpperCase(Locale.ROOT);
    String marque = nz(input.marque()).strip();
    String modele = nz(input.modele()).strip();
    int annee = input.annee() == null || input.annee() == 0 ? Year.now().getValue() : input.annee();
    String proprietaireId = nz(input.proprietaireId()).strip();
    String conducteurId = truthy(input.conducteurId()) ? input.conducteurId().strip() : proprietaireId;
    String permis = truthy(input.permis()) ? input.permis().strip() : null;
    if (matricule.isEmpty() || marque.isEmpty() || modele.isEmpty() || proprietaireId.isEmpty()) {
      throw AppException.validation("La moto doit avoir un matricule, une marque, un modèle et un propriétaire.");
    }
    if (findIdBy("matricule", matricule) != null) throw AppException.conflict("Ce matricule existe déjà.");
    if (permis != null && findIdBy("permis", permis) != null) throw AppException.conflict("Ce permis existe déjà.");
    Map<String, Object>[] found = findPeople(proprietaireId, conducteurId);
    int motoYear = input.year() != null && input.year() != 0 ? input.year() : Year.now().getValue();
    Common.assertOpenYear(motoYear);
    caisse.assertOuverte(actor.userId(), Instant.now());
    Map<String, Object> row = db.one("INSERT INTO \"MotoRegistration\" (\"id\", " + UPSERT_COLUMNS + ", \"createdAt\", \"updatedAt\")"
        + " VALUES (:id, :matricule, :marque, :modele, :annee, :couleur, :proprietaireId, :conducteurId, :permis, :statut, :photo, :enRetard,"
        + " :montantPenalite, :prochainPaiement, :dernierPaiement, :year, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *",
        Db.params("id", Db.uuid(), "matricule", matricule, "marque", marque, "modele", modele, "annee", annee,
            "couleur", truthy(input.couleur()) ? input.couleur().strip() : null, "proprietaireId", proprietaireId,
            "conducteurId", conducteurId.isEmpty() ? null : conducteurId, "permis", permis,
            "statut", truthy(input.statut()) ? input.statut().strip().toUpperCase(Locale.ROOT) : "ACTIVE",
            "photo", truthy(input.photo()) ? input.photo() : null, "enRetard", false, "montantPenalite", PENALITE_RETARD,
            "prochainPaiement", limiteApres(Instant.now()), "dernierPaiement", null,
            "year", motoYear));
    row.putAll(people(found[0], found[1]));
    auditTrail.record(actor, "Enregistrement moto", "Motos", "Moto " + row.get("matricule") + " enregistrée");
    // Le droit d'adhésion est encaissé à l'enregistrement, avec son propre reçu.
    Instant paiementDate = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MILLIS);
    Map<String, Object> adhesion = recordPayment(row, "ADHESION", DROIT_ADHESION, null, paiementDate,
        libelleMois(paiementDate.atZone(ZoneOffset.UTC).toLocalDate()), numeros.next(NumeroSequence.Series.RECU_MOTO, motoYear),
        auditTrail.displayName(actor.userId()), motoYear, Db.date(row, "prochainPaiement"), actor.userId(), null);
    auditTrail.record(actor, "Paiement moto", "Motos", "Droit d'adhésion encaissé pour la moto " + row.get("matricule") + " (" + Js.num(DROIT_ADHESION) + " FCFA)");
    Map<String, Object> view = motoView(row);
    view.put("adhesion", paymentView(adhesion));
    return view;
  }

  @Transactional
  public Map<String, Object> update(Actor actor, String motoId, MotoInput input) {
    Map<String, Object> existing = findById(motoId);
    if (existing == null) throw AppException.notFound("Moto introuvable.");
    // Échéance et pénalité font la dette : seul un responsable peut les corriger.
    boolean touche = input.enRetard() != null || input.montantPenalite() != null || input.prochainPaiement() != null || input.dernierPaiement() != null;
    if (touche && "AGENT".equalsIgnoreCase(actor.role())) throw AppException.forbidden("Permissions insuffisantes pour cette action");
    String nextMatricule = truthy(input.matricule()) ? input.matricule().strip().toUpperCase(Locale.ROOT) : Db.str(existing, "matricule");
    if (!nextMatricule.equals(Db.str(existing, "matricule"))) {
      String duplicate = findIdBy("matricule", nextMatricule);
      if (duplicate != null && !duplicate.equals(Db.str(existing, "id"))) throw AppException.conflict("Ce matricule existe déjà.");
    }
    String nextPermis = !input.permisProvided() ? Db.str(existing, "permis") : emptyToNull(nz(input.permis()).strip());
    if (nextPermis != null && !nextPermis.equals(Db.str(existing, "permis"))) {
      String duplicate = findIdBy("permis", nextPermis);
      if (duplicate != null && !duplicate.equals(Db.str(existing, "id"))) throw AppException.conflict("Ce permis existe déjà.");
    }
    String nextProprietaireId = input.proprietaireId() == null ? Db.str(existing, "proprietaireId") : input.proprietaireId().strip();
    String nextConducteurId = !input.conducteurProvided() ? Db.str(existing, "conducteurId") : emptyToNull(nz(input.conducteurId()).strip());
    Map<String, Object>[] found = findPeople(nextProprietaireId, nextConducteurId);
    Object prochain = input.prochainPaiement() == null ? existing.get("prochainPaiement") : date(input.prochainPaiement());
    Object dernier = input.dernierPaiement() == null ? existing.get("dernierPaiement") : date(input.dernierPaiement());
    Map<String, Object> row = db.one("UPDATE \"MotoRegistration\" SET \"matricule\" = :matricule, \"marque\" = :marque, \"modele\" = :modele, \"annee\" = :annee,"
        + " \"couleur\" = :couleur, \"proprietaireId\" = :proprietaireId, \"conducteurId\" = :conducteurId, \"permis\" = :permis, \"statut\" = :statut,"
        + " \"photo\" = :photo, \"enRetard\" = :enRetard, \"montantPenalite\" = :montantPenalite, \"prochainPaiement\" = :prochainPaiement,"
        + " \"dernierPaiement\" = :dernierPaiement, \"year\" = :year, \"updatedAt\" = CURRENT_TIMESTAMP WHERE \"id\" = :id RETURNING *",
        Db.params("id", motoId, "matricule", nextMatricule, "marque", truthy(input.marque()) ? input.marque().strip() : existing.get("marque"),
            "modele", truthy(input.modele()) ? input.modele().strip() : existing.get("modele"),
            "annee", input.annee() == null ? existing.get("annee") : input.annee(),
            "couleur", !input.couleurProvided() ? existing.get("couleur") : emptyToNull(nz(input.couleur()).strip()),
            "proprietaireId", nextProprietaireId, "conducteurId", nextConducteurId, "permis", nextPermis,
            "statut", truthy(input.statut()) ? input.statut().strip().toUpperCase(Locale.ROOT) : existing.get("statut"),
            "photo", !input.photoProvided() ? existing.get("photo") : emptyToNull(nz(input.photo())),
            "enRetard", input.enRetard() == null ? existing.get("enRetard") : input.enRetard(),
            "montantPenalite", input.montantPenalite() == null ? existing.get("montantPenalite") : input.montantPenalite(),
            "prochainPaiement", prochain, "dernierPaiement", dernier, "year", input.year() == null ? existing.get("year") : input.year()));
    row.putAll(people(found[0], found[1]));
    auditTrail.record(actor, "Mise à jour moto", "Motos", "Moto " + row.get("matricule") + " mise à jour");
    return motoView(row);
  }

  private static Instant date(String value) {
    Instant instant = Js.parseDate(value);
    if (instant == null) throw new IllegalArgumentException("Invalid Date");
    return instant;
  }

  private static String emptyToNull(String value) {
    return value == null || value.isEmpty() ? null : value;
  }

  public Map<String, Object> stats(int year) {
    List<Map<String, Object>> motos = db.list("SELECT \"enRetard\", \"statut\", \"prochainPaiement\" FROM \"MotoRegistration\" WHERE \"year\" = :year", Db.params("year", year));
    List<Map<String, Object>> paiements = db.list("SELECT \"montant\", \"datePaiement\" FROM \"MotoPayment\" WHERE \"year\" = :year AND \"statut\" = 'PAYE'", Db.params("year", year));
    long total = motos.size();
    Instant now = Instant.now();
    long enRetard = 0;
    double montantDu = 0;
    double penalites = 0;
    for (Map<String, Object> moto : motos) {
      if (!estEnRetard(moto, now)) continue;
      enRetard++;
      int mois = moisDus(Db.date(moto, "prochainPaiement"), Boolean.TRUE.equals(moto.get("enRetard")), now);
      montantDu += montantDu(mois);
      penalites += mois * PENALITE_RETARD;
    }
    double recettes = 0;
    double recettesMois = 0;
    long paiementsMois = 0;
    YearMonth courant = YearMonth.from(now.atZone(ZoneOffset.UTC));
    for (Map<String, Object> p : paiements) {
      double montant = Db.num(p, "montant");
      recettes += montant;
      Instant date = Db.date(p, "datePaiement");
      if (date != null && YearMonth.from(date.atZone(ZoneOffset.UTC)).equals(courant)) {
        recettesMois += montant;
        paiementsMois++;
      }
    }
    return Api.map("total", total, "totalMotos", total, "enRetard", enRetard, "paiementsMois", paiementsMois, "recettesMois", recettesMois,
        "recettesAnnee", recettes, "tauxPaiement", total > 0 ? Math.round((double) (total - enRetard) / total * 100) : 0,
        "penalitesEnCours", penalites, "montantEnRetard", montantDu);
  }

  /** Nombre de cotisations échues et non payées : au moins une dès que la moto est en retard. */
  public static int moisDus(Instant echeance, boolean enRetard, Instant now) {
    int mois = 0;
    if (echeance != null) {
      Instant limite = echeance;
      while (limite.isBefore(now) && mois < 120) {
        mois++;
        limite = limiteApres(limite);
      }
    }
    return Math.max(mois, enRetard ? 1 : 0);
  }

  public static double montantDu(int mois) {
    return mois * (TARIF_MENSUEL + PENALITE_RETARD);
  }

  @Transactional
  public void cancelPayment(Actor actor, String id, String motif) {
    Map<String, Object> payment = db.one("SELECT * FROM \"MotoPayment\" WHERE \"id\" = :id FOR UPDATE", Db.params("id", id));
    if (payment == null) throw AppException.notFound("Paiement introuvable.");
    if ("ANNULE".equals(payment.get("statut"))) throw AppException.conflict("Ce paiement est déjà annulé.");
    Common.assertRecordYearOpen((int) Db.num(payment, "year"));
    caisse.assertOuverte(Db.str(payment, "agentId"), Db.date(payment, "datePaiement"));
    String motoId = Db.str(payment, "motoId");
    Map<String, Object> moto = db.one("SELECT * FROM \"MotoRegistration\" WHERE \"id\" = :id FOR UPDATE", Db.params("id", motoId));
    if ("COTISATION".equals(payment.get("type"))) {
      List<Map<String, Object>> cotisations = db.list("""
          SELECT "id", "datePaiement" FROM "MotoPayment" WHERE "motoId" = :id AND "type" = 'COTISATION' AND "statut" = 'PAYE'
          ORDER BY COALESCE("datePaiement", "createdAt") DESC, "createdAt" DESC LIMIT 2
          """, Db.params("id", motoId));
      if (!id.equals(Db.str(cotisations.get(0), "id"))) throw AppException.conflict("Annulez d'abord la cotisation la plus récente de cette moto.");
      Instant echeance = Db.date(moto, "prochainPaiement");
      LocalDate precedente = echeance.atZone(ZoneOffset.UTC).toLocalDate().withDayOfMonth(1).minusMonths(1);
      db.update("UPDATE \"MotoRegistration\" SET \"prochainPaiement\" = :prochain, \"dernierPaiement\" = :dernier, \"updatedAt\" = CURRENT_TIMESTAMP WHERE \"id\" = :id",
          Db.params("id", motoId, "prochain", precedente.withDayOfMonth(10).atTime(23, 59, 59, 999_000_000).toInstant(ZoneOffset.UTC),
              "dernier", cotisations.size() > 1 ? cotisations.get(1).get("datePaiement") : null));
    }
    db.update("UPDATE \"MotoPayment\" SET \"statut\" = 'ANNULE', \"updatedAt\" = CURRENT_TIMESTAMP WHERE \"id\" = :id", Db.params("id", id));
    auditTrail.record(actor, "Annulation paiement moto", "Motos", "Paiement " + (payment.get("numeroRecu") == null ? id : payment.get("numeroRecu")) + " de la moto "
        + moto.get("matricule") + " annulé (" + Js.num(Db.num(payment, "montant")) + " FCFA) : " + motif, "warning");
  }

  public Map<String, Object> configuration() {
    return Api.map("droitAdhesion", DROIT_ADHESION, "tarifMensuel", TARIF_MENSUEL, "penaliteRetard", PENALITE_RETARD, "amendePolice", AMENDE_POLICE);
  }

  public long countPayments(int year) {
    return db.count("SELECT COUNT(*) FROM \"MotoPayment\" WHERE \"year\" = :year", Db.params("year", year));
  }

  public List<Map<String, Object>> listPayments(int year, Common.Paging paging) {
    List<Map<String, Object>> rows = db.list("""
        SELECT mp.*, m."matricule", m."marque", m."modele", m."annee", m."couleur", m."proprietaireId", m."conducteurId", m."permis",
               m."statut" AS "motoStatut", m."photo", m."enRetard", m."montantPenalite", m."prochainPaiement", m."dernierPaiement",
               p."nom" AS "proprietaireNom", p."prenom" AS "proprietairePrenom", p."nin" AS "proprietaireNin", p."telephone" AS "proprietaireTelephone",
               d."nom" AS "conducteurNom", d."prenom" AS "conducteurPrenom", d."nin" AS "conducteurNin", d."telephone" AS "conducteurTelephone"
        FROM "MotoPayment" mp
        INNER JOIN "MotoRegistration" m ON m."id" = mp."motoId"
        INNER JOIN "Contribuable" p ON p."id" = m."proprietaireId"
        LEFT JOIN "Contribuable" d ON d."id" = m."conducteurId"
        WHERE mp."year" = :year
        ORDER BY COALESCE(mp."datePaiement", mp."createdAt") DESC, mp."id" DESC
        """ + (paging == null ? "" : " LIMIT :limit OFFSET :offset"),
        paging == null ? Db.params("year", year) : Db.params("year", year, "limit", paging.limit(), "offset", paging.offset()));
    List<Map<String, Object>> result = new ArrayList<>();
    for (Map<String, Object> row : rows) result.add(paymentView(row));
    return result;
  }

  public record PaymentInput(String motoId, String type, String reference, String mois, Integer year, String modePaiement) {}

  @Transactional
  public Map<String, Object> createPayment(Actor actor, PaymentInput input) {
    String actorName = auditTrail.displayName(actor.userId());
    String motoId = nz(input.motoId()).strip();
    if (motoId.isEmpty()) throw AppException.validation("La moto est requise pour enregistrer un paiement.");
    caisse.assertOuverte(actor.userId(), Instant.now());
    // Deux encaissements simultanés sur la même moto s'exécutent l'un après l'autre.
    db.one("SELECT \"id\" FROM \"MotoRegistration\" WHERE \"id\" = :id FOR UPDATE", Db.params("id", motoId));
    Map<String, Object> moto = findById(motoId);
    if (moto == null) throw AppException.notFound("Moto introuvable.");
    String type = truthy(input.type()) ? input.type() : "COTISATION";
    boolean cotisation = type.equals("COTISATION");
    Instant paiementDate = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MILLIS);
    // Montant fixé par le règlement : jamais fourni par le navigateur.
    double montant = !cotisation ? AMENDE_POLICE
        : TARIF_MENSUEL + (estEnRetard(moto, paiementDate) ? PENALITE_RETARD : 0);
    Instant echeance = Db.date(moto, "prochainPaiement");
    int year = input.year() != null && input.year() != 0 ? input.year() : Year.now().getValue();
    // Le numéro du reçu officiel est attribué ici, jamais par le navigateur.
    String numeroRecu = numeros.next(NumeroSequence.Series.RECU_MOTO, year);
    String mois = truthy(input.mois()) ? input.mois().strip()
        : cotisation && echeance != null ? moisCouvert(echeance) : libelleMois(paiementDate.atZone(ZoneOffset.UTC).toLocalDate());
    Map<String, Object> row = recordPayment(moto, type, montant, truthy(input.reference()) ? input.reference().strip() : null, paiementDate, mois,
        numeroRecu, actorName, year, cotisation ? limiteApres(echeance != null ? echeance : paiementDate) : echeance, actor.userId(), input.modePaiement());
    auditTrail.record(actor, "Paiement moto", "Motos", (cotisation ? "Paiement enregistré" : "Amende police enregistrée") + " pour la moto " + moto.get("matricule") + " (" + Js.num(montant) + " FCFA)");
    return paymentView(row);
  }

  /** Seule la cotisation fait avancer l'échéance : adhésion et amende sont des paiements à part. */
  private Map<String, Object> recordPayment(Map<String, Object> moto, String type, double montant, String reference, Instant paiementDate, String mois,
      String numeroRecu, String agent, int year, Instant nextDue, String agentId, String modePaiement) {
    boolean cotisation = type.equals("COTISATION");
    String motoId = Db.str(moto, "id");
    Map<String, Object> row = db.one("""
        INSERT INTO "MotoPayment" ("id", "motoId", "type", "montant", "reference", "statut", "datePaiement", "mois", "numeroRecu", "agent", "year", "agentId", "modePaiement", "createdAt", "updatedAt")
        VALUES (:id, :motoId, :type, :montant, :reference, 'PAYE', :datePaiement, :mois, :numeroRecu, :agent, :year, :agentId, :modePaiement, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
        """, Db.params("id", Db.uuid(), "motoId", motoId, "type", type, "montant", montant, "reference", reference, "datePaiement", paiementDate,
        "mois", mois, "numeroRecu", numeroRecu, "agent", agent, "year", year, "agentId", agentId, "modePaiement", modePaiement == null ? "ESPECE" : modePaiement));
    for (String key : List.of("matricule", "marque", "modele", "annee", "couleur", "proprietaireId", "conducteurId", "permis", "photo", "montantPenalite")) {
      row.put(key, moto.get(key));
    }
    row.put("motoStatut", moto.get("statut"));
    row.put("enRetard", cotisation ? Boolean.FALSE : moto.get("enRetard"));
    row.put("prochainPaiement", nextDue);
    row.put("dernierPaiement", cotisation ? paiementDate : moto.get("dernierPaiement"));
    for (String key : PEOPLE) row.put(key, moto.get(key));
    if (cotisation) {
      db.update("""
          UPDATE "MotoRegistration" SET "enRetard" = false, "dernierPaiement" = :datePaiement, "prochainPaiement" = :prochain, "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = :id
          """, Db.params("id", motoId, "datePaiement", paiementDate, "prochain", nextDue));
    }
    return row;
  }

  private static Object orOwner(Map<String, Object> row, String driverKey, String ownerKey) {
    Object value = row.get(driverKey);
    return value != null && !value.toString().isEmpty() ? value : row.get(ownerKey);
  }

  private static Object orNull(Object value) {
    return value == null || value.toString().isEmpty() ? null : value;
  }

  private static Map<String, Object> motoView(Map<String, Object> row) {
    Instant prochain = Db.date(row, "prochainPaiement");
    Instant dernier = Db.date(row, "dernierPaiement");
    boolean enRetard = estEnRetard(row, Instant.now());
    long joursRetard = enRetard && prochain != null ? Math.max(0, Math.floorDiv(System.currentTimeMillis() - prochain.toEpochMilli(), 86_400_000L)) : 0;
    Map<String, Object> view = new LinkedHashMap<>();
    view.put("id", row.get("id"));
    view.put("matricule", row.get("matricule"));
    view.put("marque", row.get("marque"));
    view.put("modele", row.get("modele"));
    view.put("annee", row.get("annee"));
    view.put("couleur", orNull(row.get("couleur")));
    view.put("proprietaireId", row.get("proprietaireId"));
    view.put("conducteurId", row.get("conducteurId"));
    view.put("permis", orNull(row.get("permis")));
    view.put("statut", row.get("statut"));
    view.put("photo", orNull(row.get("photo")));
    view.put("proprietaire", Api.map("id", row.get("proprietaireId"), "nom", row.get("proprietaireNom"), "prenom", row.get("proprietairePrenom"),
        "nin", row.get("proprietaireNin"), "telephone", row.get("proprietaireTelephone"), "cni", row.get("proprietaireNin")));
    view.put("conducteur", row.get("conducteurId") == null || row.get("conducteurId").toString().isEmpty() ? null
        : Api.map("id", row.get("conducteurId"), "nom", orOwner(row, "conducteurNom", "proprietaireNom"),
            "prenom", orOwner(row, "conducteurPrenom", "proprietairePrenom"), "nin", orOwner(row, "conducteurNin", "proprietaireNin"),
            "telephone", orOwner(row, "conducteurTelephone", "proprietaireTelephone"), "cni", orOwner(row, "conducteurNin", "proprietaireNin")));
    view.put("enRetard", enRetard);
    // Montant fixé par le règlement, quelle que soit la valeur enregistrée sur la moto.
    view.put("montantPenalite", PENALITE_RETARD);
    view.put("prochainPaiement", prochain == null ? null : JacksonConfig.iso(prochain));
    view.put("dernierPaiement", dernier == null ? null : JacksonConfig.iso(dernier));
    view.put("joursRetard", joursRetard);
    return view;
  }

  private static Map<String, Object> paymentView(Map<String, Object> row) {
    Map<String, Object> view = new LinkedHashMap<>();
    view.put("id", row.get("id"));
    view.put("motoId", row.get("motoId"));
    view.put("type", row.get("type"));
    view.put("montant", Db.num(row, "montant"));
    if (orNull(row.get("reference")) != null) view.put("reference", row.get("reference"));
    view.put("statut", row.get("statut"));
    Instant date = Db.date(row, "datePaiement");
    view.put("datePaiement", date == null ? null : JacksonConfig.iso(date));
    if (orNull(row.get("mois")) != null) view.put("mois", row.get("mois"));
    if (orNull(row.get("numeroRecu")) != null) view.put("numeroRecu", row.get("numeroRecu"));
    view.put("agent", orNull(row.get("agent")) != null ? row.get("agent") : "Agent municipal");
    view.put("modePaiement", row.get("modePaiement") == null ? "ESPECE" : row.get("modePaiement"));
    Map<String, Object> moto = new LinkedHashMap<>(row);
    moto.put("id", row.get("motoId"));
    moto.put("statut", row.get("motoStatut"));
    view.put("moto", motoView(moto));
    return view;
  }
}
