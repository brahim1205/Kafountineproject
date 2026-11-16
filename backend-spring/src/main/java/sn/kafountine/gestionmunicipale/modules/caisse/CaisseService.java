package sn.kafountine.gestionmunicipale.modules.caisse;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.kafountine.gestionmunicipale.shared.audit.Actor;
import sn.kafountine.gestionmunicipale.shared.audit.AuditTrail;
import sn.kafountine.gestionmunicipale.shared.config.JacksonConfig;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;
import sn.kafountine.gestionmunicipale.shared.text.Js;

/** Journal d'encaissement de chaque agent, et clôture de sa caisse par jour. */
@Service
public class CaisseService {
  private static final Set<String> SUPERVISEURS = Set.of("ADMIN", "SUPER_ADMIN", "REGISSEUR", "SERVICE_FINANCES");

  private static final String ENCAISSEMENTS = """
      WITH encaissements AS (
        -- Les anciens tickets d'acte d'état civil comptent comme état civil, comme dans l'activité des agents.
        SELECT CASE WHEN "categorie" ~* '^[eé]tat[ _-]?civil' THEN 'État civil' ELSE 'Tickets' END AS source, "numero"::text AS numero, "service"::text AS libelle, "montant", "modePaiement" AS mode, "createdAt" AS d, "agentId"
          FROM "Transaction" WHERE "statut" = 'PAYE'
        UNION ALL
        SELECT 'Marché', COALESCE("numeroRecu", "reference", "id"), "periode", "montant", "modePaiement", COALESCE("datePaiement", "createdAt"), "agentId"
          FROM "MarketPayment" WHERE "statut" = 'PAYE'
        UNION ALL
        SELECT 'Motos', COALESCE("numeroRecu", "id"), "type", "montant", "modePaiement", COALESCE("datePaiement", "createdAt"), "agentId"
          FROM "MotoPayment" WHERE "statut" = 'PAYE'
        UNION ALL
        SELECT 'État civil', "numero", "typeDocument", "montant", "modePaiement", COALESCE("encaisseLe", "createdAt"), COALESCE("encaissePar", "agentId")
          FROM "EtatCivilRequest" WHERE "statut" IN ('DELIVREE', 'VALIDE')
        UNION ALL
        SELECT 'Urbanisme', "numero", "type", "montant", "modePaiement", COALESCE("encaisseLe", "createdAt"), COALESCE("encaissePar", "agentId")
          FROM "UrbanismeCase" WHERE "statut" = 'VALIDE'
      )
      """;
  private static final String DU_JOUR = " WHERE d >= CAST(:debut AS timestamp) AND d < CAST(:fin AS timestamp)";

  private final Db db;
  private final AuditTrail auditTrail;

  public CaisseService(Db db, AuditTrail auditTrail) {
    this.db = db;
    this.auditTrail = auditTrail;
  }

  private static boolean superviseur(Actor actor) {
    return actor.role() != null && SUPERVISEURS.contains(actor.role().toUpperCase(Locale.ROOT));
  }

  /** Le régisseur supervise les recettes de la régie ; l'état civil relève de l'administration. */
  private static String horsPerimetre(Actor actor) {
    return actor.role() != null && "REGISSEUR".equals(actor.role().toUpperCase(Locale.ROOT)) ? " AND source <> 'État civil'" : "";
  }

  private static String cible(Actor actor, String agentId) {
    if (agentId == null || agentId.isBlank() || agentId.equals(actor.userId())) return actor.userId();
    if (!superviseur(actor)) throw AppException.forbidden("Vous ne pouvez consulter que votre propre caisse.");
    return agentId;
  }

  private static LocalDate aujourdhui() {
    return LocalDate.now(ZoneOffset.UTC);
  }

  private static org.springframework.jdbc.core.namedparam.MapSqlParameterSource jour(LocalDate date) {
    return Db.params("debut", java.sql.Timestamp.from(date.atStartOfDay().toInstant(ZoneOffset.UTC)),
        "fin", java.sql.Timestamp.from(date.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC)));
  }

  /** Refuse toute écriture d'argent sur une journée dont la caisse est déjà clôturée. */
  public void assertOuverte(String agentId, Instant quand) {
    if (agentId == null) return;
    LocalDate date = (quand == null ? Instant.now() : quand).atZone(ZoneOffset.UTC).toLocalDate();
    if (db.count("SELECT COUNT(*) FROM \"CashClosure\" WHERE \"agentId\" = :agentId AND \"jour\" = CAST(:jour AS date)",
        Db.params("agentId", agentId, "jour", date.toString())) > 0) {
      throw AppException.conflict("La caisse de cet agent est clôturée pour le " + date + " : réouvrez-la avant de modifier ses encaissements.");
    }
  }

  private Map<String, Object> clotureVue(Map<String, Object> row) {
    if (row == null) return null;
    Map<String, Object> view = new LinkedHashMap<>();
    view.put("id", row.get("id"));
    view.put("jour", String.valueOf(row.get("jour")));
    view.put("agentId", row.get("agentId"));
    view.put("agent", row.get("agent"));
    view.put("montantAttendu", Db.num(row, "montantAttendu"));
    view.put("montantCompte", Db.num(row, "montantCompte"));
    view.put("ecart", Db.num(row, "ecart"));
    view.put("nombre", row.get("nombre"));
    view.put("observations", row.get("observations"));
    view.put("statut", row.get("statut"));
    return view;
  }

  private static final String SELECT_CLOTURE = """
      SELECT c.*, TRIM(COALESCE(u."prenom", '') || ' ' || COALESCE(u."nom", '')) AS "agent"
      FROM "CashClosure" c INNER JOIN "User" u ON u."id" = c."agentId"
      """;

  private Map<String, Object> cloture(String agentId, LocalDate date) {
    return db.one(SELECT_CLOTURE + " WHERE c.\"agentId\" = :agentId AND c.\"jour\" = CAST(:jour AS date)",
        Db.params("agentId", agentId, "jour", date.toString()));
  }

  public Map<String, Object> journal(Actor actor, LocalDate demande, String agentId) {
    String cible = cible(actor, agentId);
    return journal(actor, demande, cible, cible.equals(actor.userId()) ? "" : horsPerimetre(actor));
  }

  private Map<String, Object> journal(Actor actor, LocalDate demande, String cible, String filtre) {
    LocalDate date = demande == null ? aujourdhui() : demande;
    var params = jour(date).addValue("agentId", cible);
    List<Map<String, Object>> lignes = new ArrayList<>();
    Map<String, Double> parMode = new LinkedHashMap<>();
    Map<String, Double> parSource = new LinkedHashMap<>();
    double total = 0;
    for (Map<String, Object> row : db.list(ENCAISSEMENTS + " SELECT * FROM encaissements" + DU_JOUR + " AND \"agentId\" = :agentId" + filtre + " ORDER BY d ASC", params)) {
      double montant = Db.num(row, "montant");
      total += montant;
      parMode.merge(Db.str(row, "mode"), montant, Double::sum);
      parSource.merge(Db.str(row, "source"), montant, Double::sum);
      lignes.add(Api.map("source", row.get("source"), "numero", row.get("numero"), "libelle", row.get("libelle"), "montant", montant,
          "mode", row.get("mode"), "date", JacksonConfig.iso(Db.date(row, "d"))));
    }
    Map<String, Object> agent = db.one("SELECT TRIM(COALESCE(\"prenom\", '') || ' ' || COALESCE(\"nom\", '')) AS \"nom\" FROM \"User\" WHERE \"id\" = :id", Db.params("id", cible));
    if (agent == null) throw AppException.notFound("Agent introuvable.");
    return Api.map("date", date.toString(), "agentId", cible, "agent", agent.get("nom"), "total", total, "nombre", lignes.size(),
        "parMode", parMode, "parSource", parSource, "lignes", lignes, "cloture", clotureVue(cloture(cible, date)));
  }

  /** Vue du superviseur : tout ce qui a été encaissé dans la journée, agent par agent. */
  public Map<String, Object> synthese(Actor actor, LocalDate demande) {
    LocalDate date = demande == null ? aujourdhui() : demande;
    Map<String, Map<String, Object>> agents = new LinkedHashMap<>();
    double total = 0;
    for (Map<String, Object> row : db.list(ENCAISSEMENTS + """
         SELECT e."agentId", TRIM(COALESCE(u."prenom", '') || ' ' || COALESCE(u."nom", '')) AS "agent", SUM(e."montant") AS "montant", COUNT(*)::int AS "nombre"
         FROM encaissements e INNER JOIN "User" u ON u."id" = e."agentId"
         WHERE e.d >= CAST(:debut AS timestamp) AND e.d < CAST(:fin AS timestamp)""" + horsPerimetre(actor).replace("source", "e.source") + """
         GROUP BY 1, 2 ORDER BY 3 DESC
        """, jour(date))) {
      double montant = Db.num(row, "montant");
      total += montant;
      agents.put(Db.str(row, "agentId"), Api.map("agentId", row.get("agentId"), "agent", row.get("agent"), "montant", montant, "nombre", row.get("nombre"), "cloture", null));
    }
    for (Map<String, Object> row : db.list(SELECT_CLOTURE + " WHERE c.\"jour\" = CAST(:jour AS date)"
        + (horsPerimetre(actor).isEmpty() ? "" : " AND u.\"role\" <> 'ETAT_CIVIL'"), Db.params("jour", date.toString()))) {
      Map<String, Object> agent = agents.computeIfAbsent(Db.str(row, "agentId"), k -> Api.map("agentId", row.get("agentId"), "agent", row.get("agent"), "montant", 0d, "nombre", 0, "cloture", null));
      agent.put("cloture", clotureVue(row));
    }
    return Api.map("date", date.toString(), "total", total, "agents", new ArrayList<>(agents.values()));
  }

  /** Modules dans l'ordre d'affichage ; les tickets d'état civil sont rangés avec l'état civil. */
  public static final List<String> MODULES = List.of("Taxes", "Marché", "Motos", "État civil", "Urbanisme");

  private static final String RECETTES_PAR_MODULE = """
      WITH recettes AS (
        SELECT CASE WHEN "categorie" ~* '^[eé]tat[ _-]?civil' THEN 'État civil' ELSE 'Taxes' END AS module, "montant", "createdAt" AS d, "agentId"
          FROM "Transaction" WHERE "statut" = 'PAYE'
        UNION ALL
        SELECT 'Marché', "montant", COALESCE("datePaiement", "createdAt"), "agentId" FROM "MarketPayment" WHERE "statut" = 'PAYE'
        UNION ALL
        SELECT 'Motos', "montant", COALESCE("datePaiement", "createdAt"), "agentId" FROM "MotoPayment" WHERE "statut" = 'PAYE'
        UNION ALL
        SELECT 'État civil', "montant", COALESCE("encaisseLe", "createdAt"), COALESCE("encaissePar", "agentId")
          FROM "EtatCivilRequest" WHERE "statut" IN ('DELIVREE', 'VALIDE')
        UNION ALL
        SELECT 'Urbanisme', "montant", COALESCE("encaisseLe", "createdAt"), COALESCE("encaissePar", "agentId")
          FROM "UrbanismeCase" WHERE "statut" = 'VALIDE'
      )
      SELECT r."agentId", TRIM(COALESCE(u."prenom", '') || ' ' || COALESCE(u."nom", '')) AS "agent", u."role", r.module,
             SUM(r."montant") AS "montant", COUNT(*)::int AS "nombre"
      FROM recettes r INNER JOIN "User" u ON u."id" = r."agentId"
      WHERE r.d >= CAST(:debut AS timestamp) AND r.d < CAST(:fin AS timestamp)
      GROUP BY 1, 2, 3, 4
      """;

  public enum Periode { JOUR, SEMAINE, MOIS }

  /** Bornes [début, fin[ de la période qui contient la date : le jour, la semaine du lundi au dimanche, ou le mois civil. */
  public static LocalDate[] bornes(Periode periode, LocalDate date) {
    return switch (periode) {
      case JOUR -> new LocalDate[] {date, date.plusDays(1)};
      case SEMAINE -> {
        LocalDate lundi = date.minusDays(date.getDayOfWeek().getValue() - DayOfWeek.MONDAY.getValue());
        yield new LocalDate[] {lundi, lundi.plusDays(7)};
      }
      case MOIS -> new LocalDate[] {date.withDayOfMonth(1), date.withDayOfMonth(1).plusMonths(1)};
    };
  }

  /**
   * Ce que chaque agent a enregistré sur la période, module par module. Le régisseur ne voit pas
   * l'état civil, comme dans le reste de l'application.
   */
  public Map<String, Object> activite(Actor actor, Periode periode, LocalDate demande) {
    LocalDate[] b = bornes(periode, demande == null ? aujourdhui() : demande);
    boolean sansEtatCivil = "REGISSEUR".equalsIgnoreCase(actor.role());
    List<String> modules = sansEtatCivil ? MODULES.stream().filter(m -> !m.equals("État civil")).toList() : MODULES;
    var params = Db.params("debut", java.sql.Timestamp.from(b[0].atStartOfDay().toInstant(ZoneOffset.UTC)),
        "fin", java.sql.Timestamp.from(b[1].atStartOfDay().toInstant(ZoneOffset.UTC)));
    Map<String, Map<String, Object>> agents = new LinkedHashMap<>();
    Map<String, Double> totauxParModule = new LinkedHashMap<>();
    for (String module : modules) totauxParModule.put(module, 0d);
    double total = 0;
    long nombre = 0;
    for (Map<String, Object> row : db.list(RECETTES_PAR_MODULE, params)) {
      String module = Db.str(row, "module");
      if (!modules.contains(module)) continue;
      double montant = Db.num(row, "montant");
      long n = (long) Db.num(row, "nombre");
      Map<String, Object> agent = agents.computeIfAbsent(Db.str(row, "agentId"), id -> {
        Map<String, Double> vide = new LinkedHashMap<>();
        for (String m : modules) vide.put(m, 0d);
        return Api.map("agentId", id, "agent", row.get("agent"), "role", row.get("role"), "total", 0d, "nombre", 0L, "parModule", vide);
      });
      @SuppressWarnings("unchecked") Map<String, Double> parModule = (Map<String, Double>) agent.get("parModule");
      parModule.merge(module, montant, Double::sum);
      agent.put("total", (double) agent.get("total") + montant);
      agent.put("nombre", (long) agent.get("nombre") + n);
      totauxParModule.merge(module, montant, Double::sum);
      total += montant;
      nombre += n;
    }
    List<Map<String, Object>> lignes = new ArrayList<>(agents.values());
    lignes.sort((x, y) -> Double.compare((double) y.get("total"), (double) x.get("total")));
    return Api.map("periode", periode.name().toLowerCase(Locale.ROOT), "debut", b[0].toString(), "fin", b[1].minusDays(1).toString(),
        "modules", modules, "total", total, "nombre", nombre, "parModule", totauxParModule, "agents", lignes);
  }

  public List<Map<String, Object>> clotures(Actor actor, String statut, int limit) {
    StringBuilder where = new StringBuilder(" WHERE 1 = 1");
    var params = Db.params("limit", limit);
    if (!superviseur(actor)) {
      where.append(" AND c.\"agentId\" = :agentId");
      params.addValue("agentId", actor.userId());
    }
    if (statut != null) {
      where.append(" AND c.\"statut\" = :statut");
      params.addValue("statut", statut);
    }
    List<Map<String, Object>> result = new ArrayList<>();
    for (Map<String, Object> row : db.list(SELECT_CLOTURE + where + " ORDER BY c.\"jour\" DESC, c.\"createdAt\" DESC LIMIT :limit", params)) result.add(clotureVue(row));
    return result;
  }

  @Transactional
  public Map<String, Object> cloturer(Actor actor, LocalDate demande, String agentId, double montantCompte, String observations) {
    LocalDate date = demande == null ? aujourdhui() : demande;
    if (date.isAfter(aujourdhui())) throw AppException.validation("Une caisse ne peut pas être clôturée à l'avance.");
    String cible = cible(actor, agentId);
    if (cloture(cible, date) != null) throw AppException.conflict("Cette caisse est déjà clôturée pour le " + date + ".");
    // Attendu recalculé ici : un écart ne dépend jamais d'un total envoyé par le navigateur.
    Map<String, Object> journal = journal(actor, date, cible, "");
    double attendu = ((Number) journal.get("total")).doubleValue();
    if (!cible.equals(actor.userId()) && !horsPerimetre(actor).isEmpty()
        && attendu != ((Number) journal(actor, date, cible, horsPerimetre(actor)).get("total")).doubleValue()) {
      throw AppException.forbidden("Cette caisse comporte des actes d'état civil : sa clôture revient à l'administration.");
    }
    double ecart = montantCompte - attendu;
    if (ecart != 0 && (observations == null || observations.isBlank())) {
      throw AppException.validation("Un écart de caisse doit être expliqué dans les observations.");
    }
    try {
      db.update("""
          INSERT INTO "CashClosure" ("id", "jour", "agentId", "montantAttendu", "montantCompte", "ecart", "nombre", "observations", "cloturePar")
          VALUES (:id, CAST(:jour AS date), :agentId, :attendu, :compte, :ecart, :nombre, :observations, :par)
          """, Db.params("id", Db.uuid(), "jour", date.toString(), "agentId", cible, "attendu", attendu, "compte", montantCompte, "ecart", ecart,
          "nombre", journal.get("nombre"), "observations", observations == null || observations.isBlank() ? null : observations.strip(), "par", actor.userId()));
    } catch (org.springframework.dao.DuplicateKeyException duplicate) {
      throw AppException.conflict("Cette caisse est déjà clôturée pour le " + date + ".");
    }
    auditTrail.record(actor, "Clôture de caisse", "Caisse", "Caisse de " + journal.get("agent") + " du " + date + " : attendu " + Js.num(attendu)
        + " FCFA, compté " + Js.num(montantCompte) + " FCFA, écart " + Js.num(ecart) + " FCFA", ecart == 0 ? "success" : "warning");
    return clotureVue(cloture(cible, date));
  }

  private Map<String, Object> verrou(String id) {
    Map<String, Object> row = db.one("SELECT * FROM \"CashClosure\" WHERE \"id\" = :id FOR UPDATE", Db.params("id", id));
    if (row == null) throw AppException.notFound("Clôture introuvable.");
    return row;
  }

  @Transactional
  public Map<String, Object> valider(Actor actor, String id) {
    Map<String, Object> row = verrou(id);
    if (!"CLOTUREE".equals(row.get("statut"))) throw AppException.conflict("Cette clôture est déjà validée.");
    // Séparation des tâches : on ne valide pas sa propre caisse.
    if (actor.userId().equals(row.get("agentId"))) throw AppException.forbidden("Votre propre caisse doit être validée par une autre personne.");
    db.update("UPDATE \"CashClosure\" SET \"statut\" = 'VALIDEE', \"validePar\" = :par, \"valideLe\" = CURRENT_TIMESTAMP, \"updatedAt\" = CURRENT_TIMESTAMP WHERE \"id\" = :id",
        Db.params("id", id, "par", actor.userId()));
    auditTrail.record(actor, "Validation de caisse", "Caisse", "Clôture du " + row.get("jour") + " validée");
    return clotureVue(db.one(SELECT_CLOTURE + " WHERE c.\"id\" = :id", Db.params("id", id)));
  }

  @Transactional
  public void rouvrir(Actor actor, String id, String motif) {
    Map<String, Object> row = verrou(id);
    if (!"CLOTUREE".equals(row.get("statut"))) throw AppException.conflict("Une clôture validée ne peut plus être rouverte.");
    if (motif == null || motif.isBlank()) throw AppException.validation("Le motif de réouverture est requis.");
    db.update("DELETE FROM \"CashClosure\" WHERE \"id\" = :id", Db.params("id", id));
    auditTrail.record(actor, "Réouverture de caisse", "Caisse", "Clôture du " + row.get("jour") + " rouverte : " + motif.strip()
        + " (attendu " + Js.num(Db.num(row, "montantAttendu")) + " FCFA, compté " + Js.num(Db.num(row, "montantCompte")) + " FCFA)", "warning");
  }
}
