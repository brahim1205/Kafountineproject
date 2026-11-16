package sn.kafountine.gestionmunicipale.modules.dashboard;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import java.util.function.UnaryOperator;
import org.springframework.stereotype.Service;
import sn.kafountine.gestionmunicipale.modules.motos.MotoService;
import sn.kafountine.gestionmunicipale.modules.recouvrement.RecouvrementService;
import sn.kafountine.gestionmunicipale.modules.transactions.CategoryLabels;
import sn.kafountine.gestionmunicipale.shared.config.JacksonConfig;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;

/** Tableau de bord (GetDashboardStatisticsUseCase et PrismaDashboardRepository côté Node). */
@Service
public class DashboardService {
  /**
   * Toutes les recettes encaissées de l'année, quel que soit le module qui les enregistre :
   * tickets payés, paiements du marché et des motos, actes délivrés, dossiers d'urbanisme validés.
   */
  public static final String LEDGER = """
      WITH recettes AS (
        SELECT 'Taxes et tickets'::text AS source, "categorie"::text AS categorie, "montant", "createdAt" AS d
          FROM "Transaction" WHERE "year" = :year AND "statut" = 'PAYE'
        UNION ALL
        SELECT 'Marché', 'Marché', "montant", COALESCE("datePaiement", "createdAt")
          FROM "MarketPayment" WHERE "year" = :year AND "statut" = 'PAYE'
        UNION ALL
        SELECT 'Motos', 'Motos', "montant", COALESCE("datePaiement", "createdAt")
          FROM "MotoPayment" WHERE "year" = :year AND "statut" = 'PAYE'
        UNION ALL
        SELECT 'État civil', 'État civil', "montant", COALESCE("encaisseLe", "createdAt")
          FROM "EtatCivilRequest" WHERE "year" = :year AND "statut" IN ('DELIVREE', 'VALIDE')
        UNION ALL
        SELECT 'Urbanisme', 'Urbanisme', "montant", COALESCE("encaisseLe", "createdAt")
          FROM "UrbanismeCase" WHERE "year" = :year AND "statut" = 'VALIDE'
      )""";
  private static final String TOTAL_SQL = LEDGER + " SELECT COALESCE(SUM(montant), 0)::float8 AS montant FROM recettes";
  private static final String BY_SOURCE_SQL = LEDGER + " SELECT source, SUM(montant)::float8 AS montant, COUNT(*)::int AS nombre FROM recettes GROUP BY source ORDER BY 2 DESC";
  private static final String BY_CATEGORY_SQL = LEDGER + " SELECT categorie, SUM(montant)::float8 AS montant FROM recettes GROUP BY categorie";
  private static final String BY_MONTH_SQL = LEDGER + " SELECT EXTRACT(MONTH FROM d)::int AS mois, SUM(montant)::float8 AS montant, COUNT(*)::int AS nombre FROM recettes GROUP BY 1";
  private static final String BETWEEN_SQL = LEDGER + " SELECT COALESCE(SUM(montant), 0)::float8 AS montant, COUNT(*)::int AS nombre"
      + " FROM recettes WHERE d >= :from AND (CAST(:to AS timestamp) IS NULL OR d < CAST(:to AS timestamp))";
  private static final String[] MONTHS = {"Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"};

  private final Db db;
  private final CategoryLabels labels;
  private final RecouvrementService recouvrement;

  public DashboardService(Db db, CategoryLabels labels, RecouvrementService recouvrement) {
    this.db = db;
    this.labels = labels;
    this.recouvrement = recouvrement;
  }

  private static <T> T orElse(Supplier<T> supplier, T fallback) {
    try {
      return supplier.get();
    } catch (RuntimeException e) {
      return fallback;
    }
  }

  private long count(String sql, Object... params) {
    return db.count(sql, Db.params(params));
  }

  private static Instant startOfToday() {
    return LocalDate.now(ZoneId.systemDefault()).atStartOfDay(ZoneId.systemDefault()).toInstant();
  }

  private Map<String, Object> revenueBetween(int year, Instant from, Instant to) {
    Map<String, Object> row = db.one(BETWEEN_SQL, Db.params("year", year, "from", Timestamp.from(from), "to", to == null ? null : Timestamp.from(to)));
    return Api.map("montant", Db.num(row, "montant"), "nombre", (long) Db.num(row, "nombre"));
  }

  /** Même forme de requête que Prisma (liste puis relations), pour le même ordre entre tickets de même date. */
  private List<Map<String, Object>> recentTransactions(int year) {
    List<Map<String, Object>> rows = db.list("SELECT * FROM \"Transaction\" WHERE \"year\" = :year ORDER BY \"createdAt\" DESC LIMIT 10", Db.params("year", year));
    Map<String, Map<String, Object>> contribuables = byId("SELECT \"id\", \"nom\", \"prenom\", \"nin\", \"telephone\" FROM \"Contribuable\" WHERE \"id\" IN (:ids)", rows, "contribuableId");
    Map<String, Map<String, Object>> agents = byId("SELECT \"id\", \"nom\", \"prenom\" FROM \"User\" WHERE \"id\" IN (:ids)", rows, "agentId");
    List<Map<String, Object>> items = new ArrayList<>();
    for (Map<String, Object> row : rows) {
      Map<String, Object> c = contribuables.get(Db.str(row, "contribuableId"));
      Map<String, Object> a = agents.get(Db.str(row, "agentId"));
      items.add(Api.map("id", row.get("id"), "numero", row.get("numero"), "montant", Db.num(row, "montant"), "categorie", row.get("categorie"),
          "statut", row.get("statut"), "createdAt", JacksonConfig.iso(Db.date(row, "createdAt")),
          "contribuable", c == null ? null : Api.map("id", c.get("id"), "nom", c.get("nom"), "prenom", c.get("prenom"), "nin", c.get("nin"), "telephone", c.get("telephone")),
          "agent", a == null ? null : Api.map("nom", a.get("nom"), "prenom", a.get("prenom"))));
    }
    return items;
  }

  private Map<String, Map<String, Object>> byId(String sql, List<Map<String, Object>> rows, String key) {
    List<String> ids = rows.stream().map(row -> Db.str(row, key)).distinct().toList();
    Map<String, Map<String, Object>> result = new LinkedHashMap<>();
    if (ids.isEmpty()) return result;
    for (Map<String, Object> row : db.list(sql, Db.params("ids", ids))) result.put(Db.str(row, "id"), row);
    return result;
  }

  private static double sum(List<Map<String, Object>> rows, String key) {
    double total = 0;
    for (Map<String, Object> row : rows) total += Db.num(row, key);
    return total;
  }

  private static long countWhere(List<Map<String, Object>> rows, String key, String... values) {
    return rows.stream().filter(row -> List.of(values).contains(Db.str(row, key))).count();
  }

  private Map<String, Object> formationsStats(int year) {
    List<Map<String, Object>> formations = db.list("SELECT \"budget\", \"statut\" FROM \"TrainingProgram\" WHERE \"year\" = :year", Db.params("year", year));
    List<Map<String, Object>> jeunes = db.list("SELECT \"id\" FROM \"YouthProfile\" WHERE \"year\" = :year", Db.params("year", year));
    List<Map<String, Object>> enrollments = db.list("""
        SELECT e."statutFinal" FROM "YouthEnrollment" e INNER JOIN "TrainingProgram" f ON f."id" = e."formationId" WHERE f."year" = :year
        """, Db.params("year", year));
    long certifies = countWhere(enrollments, "statutFinal", "Certifié");
    return Api.map("totalFormations", formations.size(), "formationsEnCours", countWhere(formations, "statut", "EN_COURS"),
        "formationsTerminees", countWhere(formations, "statut", "TERMINEE"), "totalJeunes", jeunes.size(), "totalJeunesFormes", jeunes.size(),
        "certifies", certifies, "totalCertifies", certifies, "budgetTotal", sum(formations, "budget"));
  }

  private Map<String, Object> motosStats(int year) {
    List<Map<String, Object>> motos = db.list("SELECT \"enRetard\", \"prochainPaiement\" FROM \"MotoRegistration\" WHERE \"year\" = :year", Db.params("year", year));
    Instant now = Instant.now();
    long enRetard = motos.stream().filter(row -> MotoService.estEnRetard(row, now)).count();
    return Api.map("totalMotos", motos.size(), "enRetard", enRetard);
  }

  private Map<String, Object> marcheStats(int year) {
    List<Map<String, Object>> places = db.list("SELECT \"statut\", \"occupantId\" FROM \"MarketPlace\" WHERE \"year\" = :year", Db.params("year", year));
    return Api.map("placesTotales", places.size(), "placesOccupees", countWhere(places, "statut", "OCCUPEE"));
  }

  private long etatCivilEnAttente(int year) {
    return countWhere(db.list("SELECT \"montant\", \"statut\" FROM \"EtatCivilRequest\" WHERE \"year\" = :year", Db.params("year", year)), "statut", "EN_ATTENTE");
  }

  private Map<String, Object> urbanismeStats(int year) {
    List<Map<String, Object>> rows = db.list("SELECT \"montant\", \"statut\" FROM \"UrbanismeCase\" WHERE \"year\" = :year", Db.params("year", year));
    return Api.map("total", rows.size(), "enAttente", countWhere(rows, "statut", "EN_ATTENTE"));
  }

  private long quaiPecheEnAttente(int year) {
    return countWhere(db.list("SELECT \"poids\", \"statut\" FROM \"FishCommission\" WHERE \"year\" = :year", Db.params("year", year)), "statut", "ENREGISTREE");
  }

  private long budgetEnAttente(int year) {
    return countWhere(db.list("SELECT \"statut\" FROM \"BudgetRequest\" WHERE \"year\" = :year", Db.params("year", year)), "statut", "EN_ATTENTE");
  }

  private static Object get(Map<String, Object> stats, String key) {
    return stats == null ? 0 : stats.get(key);
  }

  private static long num(Object value) {
    return value instanceof Number number ? number.longValue() : 0;
  }

  public Map<String, Object> statistics(int year) {
    long totalContribuables = count("SELECT COUNT(*) FROM \"Contribuable\"");
    long totalTransactions = count("SELECT COUNT(*) FROM \"Transaction\" WHERE \"year\" = :year", "year", year);
    double totalRecettes = Db.num(db.one(TOTAL_SQL, Db.params("year", year)), "montant");
    List<Map<String, Object>> transactionsRecentes = recentTransactions(year);
    List<Map<String, Object>> categories = db.list(BY_CATEGORY_SQL, Db.params("year", year));
    Instant today = startOfToday();
    LocalDate now = LocalDate.now(ZoneId.systemDefault());
    double recettesAujourdhui = Db.num(revenueBetween(year, today, null), "montant");
    double recettesMois = Db.num(revenueBetween(year, now.withDayOfMonth(1).atStartOfDay(ZoneId.systemDefault()).toInstant(), null), "montant");

    List<Map<String, Object>> evolutionSemaine = new ArrayList<>();
    for (int i = 6; i >= 0; i--) {
      LocalDate day = now.minusDays(i);
      Instant from = day.atStartOfDay(ZoneId.systemDefault()).toInstant();
      Instant to = day.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
      Map<String, Object> row = revenueBetween(year, from, to);
      evolutionSemaine.add(Api.map("jour", JacksonConfig.iso(from).substring(0, 10), "montant", row.get("montant"), "transactions", row.get("nombre")));
    }
    Map<Integer, Map<String, Object>> byMonth = new LinkedHashMap<>();
    for (Map<String, Object> row : db.list(BY_MONTH_SQL, Db.params("year", year))) byMonth.put((int) Db.num(row, "mois"), row);
    List<Map<String, Object>> evolutionMensuelle = new ArrayList<>();
    for (int m = 0; m < 12; m++) {
      Map<String, Object> row = byMonth.get(m + 1);
      evolutionMensuelle.add(Api.map("mois", MONTHS[m], "montant", Db.num(row, "montant"), "transactions", (long) Db.num(row, "nombre")));
    }

    List<Map<String, Object>> topAgentsRaw = orElse(() -> db.list("""
        SELECT "agentId", SUM("montant") AS montant, COUNT(*) AS nombre FROM "Transaction"
        WHERE "year" = :year AND "statut" = 'PAYE' GROUP BY "agentId" ORDER BY SUM("montant") DESC LIMIT 5
        """, Db.params("year", year)), List.of());
    long totalUsers = orElse(() -> count("SELECT COUNT(*) FROM \"User\""), 0L);
    long totalAdmins = orElse(() -> count("SELECT COUNT(*) FROM \"User\" WHERE \"role\" = 'ADMIN'"), 0L);
    long totalAgents = orElse(() -> count("SELECT COUNT(*) FROM \"User\" WHERE \"role\" = 'AGENT'"), 0L);
    Map<String, Object> formations = orElse(() -> formationsStats(year), null);
    Map<String, Object> motos = orElse(() -> motosStats(year), null);
    Map<String, Object> marche = orElse(() -> marcheStats(year), null);
    Long etatCivil = orElse(() -> etatCivilEnAttente(year), null);
    Map<String, Object> urbanisme = orElse(() -> urbanismeStats(year), null);
    Long quaiPeche = orElse(() -> quaiPecheEnAttente(year), null);
    Long budget = orElse(() -> budgetEnAttente(year), null);
    List<Map<String, Object>> recettesParSource = new ArrayList<>();
    for (Map<String, Object> row : db.list(BY_SOURCE_SQL, Db.params("year", year))) {
      recettesParSource.add(Api.map("source", row.get("source"), "montant", Db.num(row, "montant"), "nombre", (long) Db.num(row, "nombre")));
    }
    UnaryOperator<String> label = labels.labeler();

    Map<String, Double> byCategory = new LinkedHashMap<>();
    for (Map<String, Object> item : categories) byCategory.merge(label.apply(Db.str(item, "categorie")), Db.num(item, "montant"), Double::sum);

    long transactionsAujourdhui = count("SELECT COUNT(*) FROM \"Transaction\" WHERE \"year\" = :year AND \"createdAt\" >= :today", "year", year, "today", today);
    List<Map<String, Object>> topAgents = new ArrayList<>();
    if (!topAgentsRaw.isEmpty()) {
      Map<String, Map<String, Object>> users = new LinkedHashMap<>();
      List<Object> ids = topAgentsRaw.stream().map(row -> row.get("agentId")).toList();
      for (Map<String, Object> user : db.list("SELECT \"id\", \"nom\", \"prenom\" FROM \"User\" WHERE \"id\" IN (:ids)", Db.params("ids", ids))) {
        users.put(Db.str(user, "id"), user);
      }
      for (Map<String, Object> item : topAgentsRaw) {
        Map<String, Object> user = users.get(Db.str(item, "agentId"));
        String nom = user == null ? null : Db.str(user, "nom");
        String prenom = user == null ? null : Db.str(user, "prenom");
        String initiale;
        if (user == null) {
          initiale = "A";
        } else {
          String initials = ((prenom == null || prenom.isEmpty() ? "" : prenom.substring(0, 1)) + (nom == null || nom.isEmpty() ? "" : nom.substring(0, 1))).strip();
          initiale = initials.isEmpty() ? (nom == null || nom.isEmpty() ? null : nom.substring(0, 1)) : initials;
        }
        topAgents.add(Api.map("nom", nom == null || nom.isEmpty() ? "Agent" : nom, "prenom", prenom == null ? "" : prenom, "initiale", initiale,
            "collecte", Db.num(item, "montant"), "transactions", (long) Db.num(item, "nombre")));
      }
    }

    String nowIso = JacksonConfig.iso(Instant.now());
    List<Map<String, Object>> alertes = new ArrayList<>();
    long motosEnRetard = num(get(motos, "enRetard"));
    if (motosEnRetard > 0) alertes.add(Api.map("message", motosEnRetard + " motos en retard de paiement", "type", "retard", "timestamp", nowIso));
    if (budget != null && budget > 0) alertes.add(Api.map("message", budget + " demandes budgétaires en attente", "type", "info", "timestamp", nowIso));
    if (quaiPeche != null && quaiPeche > 0) alertes.add(Api.map("message", quaiPeche + " commissions frigorifiques en attente", "type", "info", "timestamp", nowIso));

    List<Map.Entry<String, Double>> sorted = new ArrayList<>(byCategory.entrySet());
    sorted.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));
    List<Map<String, Object>> categoriesOut = new ArrayList<>();
    for (var entry : sorted) categoriesOut.add(Api.map("categorie", entry.getKey(), "nombre", 0, "montant", entry.getValue()));

    Map<String, Object> stats = Api.map(
        "motos", Api.map("total", num(get(motos, "totalMotos")), "enRetard", motosEnRetard),
        "marche", Api.map("total", num(get(marche, "placesTotales")), "occupees", num(get(marche, "placesOccupees"))),
        "etatCivil", Api.map("enAttente", etatCivil == null ? 0 : etatCivil),
        "urbanisme", Api.map("enAttente", num(get(urbanisme, "enAttente"))),
        "budget", Api.map("enAttente", budget == null ? 0 : budget),
        "quaiPeche", Api.map("enAttente", quaiPeche == null ? 0 : quaiPeche),
        "validations", Api.map("total", num(get(urbanisme, "total"))));

    double impayes = num(orElse(() -> recouvrement.impayes(100_000).get("total"), 0));
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("totalContribuables", totalContribuables);
    result.put("totalRecettes", totalRecettes);
    result.put("totalFormations", num(get(formations, "totalFormations")));
    result.put("transactionsAujourdhui", transactionsAujourdhui);
    result.put("transactionsMois", totalTransactions);
    result.put("recettesAujourdhui", recettesAujourdhui);
    result.put("recettesMois", recettesMois);
    result.put("tauxRecouvrement", tauxRecouvrement(totalRecettes, impayes));
    result.put("impayes", impayes);
    result.put("totalTransactions", totalTransactions);
    result.put("totalUsers", totalUsers);
    result.put("totalAdmins", totalAdmins);
    result.put("totalAgents", totalAgents);
    result.put("alertes", alertes);
    result.put("stats", stats);
    result.put("recettesParSource", recettesParSource);
    result.put("categories", categoriesOut);
    result.put("transactionsRecentes", transactionsRecentes);
    result.put("topAgents", topAgents);
    result.put("evolutionSemaine", evolutionSemaine);
    result.put("evolutionMensuelle", evolutionMensuelle);
    return result;
  }

  /** Part de ce qui était dû qui a été enregistré : recettes ÷ (recettes + impayés restants), en pourcentage. */
  static long tauxRecouvrement(double recettes, double impayes) {
    double du = recettes + impayes;
    return du > 0 ? Math.round(recettes / du * 100) : 0;
  }

  public List<Map<String, Object>> topContribuables(int year, int limit) {
    List<Map<String, Object>> top = db.list("""
        SELECT "contribuableId", SUM("montant") AS montant FROM "Transaction"
        WHERE "year" = :year AND "statut" = 'PAYE' GROUP BY "contribuableId" ORDER BY SUM("montant") DESC LIMIT :take
        """, Db.params("year", year, "take", limit + 5));
    List<Map<String, Object>> results = new ArrayList<>();
    for (Map<String, Object> tx : top) {
      String id = Db.str(tx, "contribuableId");
      if (id == null || id.isEmpty()) continue;
      Map<String, Object> contribuable = db.one("SELECT \"id\", \"nom\", \"prenom\" FROM \"Contribuable\" WHERE \"id\" = :id", Db.params("id", id));
      if (contribuable != null) {
        results.add(Api.map("id", contribuable.get("id"), "prenom", contribuable.get("prenom") == null ? "" : contribuable.get("prenom"),
            "nom", contribuable.get("nom") == null ? "" : contribuable.get("nom"), "montantTotal", Db.num(tx, "montant")));
        if (results.size() >= limit) break;
      }
    }
    return results;
  }
}
