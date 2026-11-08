package sn.kafountine.gestionmunicipale.modules.transactions;

import java.io.IOException;
import java.io.Writer;
import java.sql.Timestamp;
import java.text.Collator;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Year;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.UnaryOperator;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.kafountine.gestionmunicipale.shared.audit.Actor;
import sn.kafountine.gestionmunicipale.shared.audit.AuditTrail;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.numbering.NumeroSequence;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;
import sn.kafountine.gestionmunicipale.shared.text.Js;
import sn.kafountine.gestionmunicipale.shared.validation.Input;

/** Tickets de recettes (cas d'usage et PrismaTransactionRepository côté Node). */
@Service
public class TransactionService {
  /** Critères communs à la liste et à l'export ; `categories` est rempli par {@link #withCategoryVariants}. */
  public record Criteria(String search, String categorie, String statut, String agentId, String startDate, String endDate, Integer year,
      List<String> categories) {
    Criteria withCategories(List<String> values) {
      return new Criteria(search, categorie, statut, agentId, startDate, endDate, year, values);
    }
  }

  /** Champs du compte d'un agent rendus avec ses tickets : jamais le mot de passe. */
  private static final String AGENT_PUBLIC = "\"id\", \"email\", \"nom\", \"prenom\", \"role\", \"telephone\", \"isActive\", \"lastLogin\", \"createdAt\", \"updatedAt\"";
  private static final long DAY_MS = 24L * 60 * 60 * 1000;
  private static final Pattern CSV_SPECIAL = Pattern.compile("[\",\r\n]");
  private static final List<String> HEADER = List.of("Numéro", "Date", "Heure", "Catégorie", "Service", "Contribuable", "NIN", "Agent", "Montant", "Statut", "Mode de paiement");

  private final Db db;
  private final TaxCatalog catalog;
  private final CategoryLabels labels;
  private final NumeroSequence numeros;
  private final AuditTrail auditTrail;

  public TransactionService(Db db, TaxCatalog catalog, CategoryLabels labels, NumeroSequence numeros, AuditTrail auditTrail) {
    this.db = db;
    this.catalog = catalog;
    this.labels = labels;
    this.numeros = numeros;
    this.auditTrail = auditTrail;
  }

  public List<Map<String, Object>> categories() {
    return catalog.listCategories();
  }

  public List<Map<String, Object>> categoryServices(String id) {
    return catalog.listServices(id);
  }

  // --- Filtres -----------------------------------------------------------------------------------

  /** buildWhere : FROM "Transaction" t JOIN "Contribuable" c (relation obligatoire). */
  private static String where(Criteria criteria, MapSqlParameterSource params) {
    List<String> clauses = new ArrayList<>();
    String[] words = criteria.search() == null ? new String[0] : criteria.search().strip().split("\\s+");
    int i = 0;
    for (String word : words) {
      if (word.isEmpty() || i >= 5) continue;
      String name = "w" + i++;
      // Prisma « contains » n'échappe ni % ni _ ; le NIN est comparé en respectant la casse.
      // Filtres sur la relation écrits comme Prisma (sous-requêtes IN), pour un plan et un ordre identiques.
      String sub = "t.\"contribuableId\" IN (SELECT c.\"id\" FROM \"Contribuable\" c WHERE c.";
      clauses.add("(t.\"numero\" ILIKE :" + name + " OR t.\"service\" ILIKE :" + name + " OR t.\"categorie\" ILIKE :" + name
          + " OR " + sub + "\"nom\" ILIKE :" + name + ") OR " + sub + "\"prenom\" ILIKE :" + name + ") OR " + sub + "\"nin\" LIKE :" + name + "))");
      params.addValue(name, "%" + word + "%");
    }
    if (criteria.categories() != null && !criteria.categories().isEmpty()) {
      clauses.add("t.\"categorie\" IN (:categories)");
      params.addValue("categories", criteria.categories());
    } else if (criteria.categorie() != null && !criteria.categorie().isEmpty()) {
      clauses.add("t.\"categorie\" = :categorie");
      params.addValue("categorie", criteria.categorie());
    }
    if (criteria.statut() != null && !criteria.statut().isEmpty()) {
      clauses.add("t.\"statut\" = :statut");
      params.addValue("statut", criteria.statut());
    }
    if (criteria.year() != null && criteria.year() != 0) {
      clauses.add("t.\"year\" = :year");
      params.addValue("year", criteria.year());
    }
    if (criteria.agentId() != null && !criteria.agentId().isEmpty()) {
      clauses.add("t.\"agentId\" = :agentId");
      params.addValue("agentId", criteria.agentId());
    }
    Instant from = Js.utcDay(criteria.startDate());
    Instant until = Js.utcDay(criteria.endDate());
    if (from != null) {
      clauses.add("t.\"date\" >= :from");
      params.addValue("from", Timestamp.from(from));
    }
    if (until != null) {
      clauses.add("t.\"date\" < :until");
      params.addValue("until", Timestamp.from(until.plusMillis(DAY_MS)));
    }
    return clauses.isEmpty() ? "" : " WHERE " + String.join(" AND ", clauses);
  }

  private static final String FROM = " FROM \"Transaction\" t";

  /** Catégories présentes dans les tickets (toutes années si year est null). */
  private List<Map<String, Object>> usedCategoryRows(Integer year) {
    if (year != null && year != 0) {
      return db.list("SELECT \"categorie\", COUNT(*) AS nombre FROM \"Transaction\" WHERE \"year\" = :year GROUP BY \"categorie\"", Db.params("year", year));
    }
    return db.list("SELECT \"categorie\", COUNT(*) AS nombre FROM \"Transaction\" GROUP BY \"categorie\"");
  }

  /** Étend la catégorie demandée à toutes les valeurs stockées qui portent le même libellé. */
  private Criteria withCategoryVariants(Criteria criteria) {
    if (criteria.categorie() == null || criteria.categorie().isEmpty()) return criteria;
    UnaryOperator<String> label = labels.labeler();
    String target = label.apply(criteria.categorie());
    Set<String> categories = new LinkedHashSet<>();
    categories.add(criteria.categorie());
    for (Map<String, Object> row : usedCategoryRows(criteria.year())) {
      String value = Db.str(row, "categorie");
      if (label.apply(value).equals(target)) categories.add(value);
    }
    return criteria.withCategories(new ArrayList<>(categories));
  }

  // --- Lecture -----------------------------------------------------------------------------------

  private static Map<String, Object> contribuableJson(Map<String, Object> row) {
    if (row == null) return null;
    Map<String, Object> copy = new LinkedHashMap<>(row);
    copy.put("montantImpot", Js.decimal(row.get("montantImpot")));
    return copy;
  }

  public Map<String, Object> list(Criteria input, int page, int limit) {
    Criteria criteria = withCategoryVariants(input);
    MapSqlParameterSource params = new MapSqlParameterSource();
    String where = where(criteria, params);
    params.addValue("limit", limit).addValue("offset", (long) (page - 1) * limit);
    List<Map<String, Object>> rows = db.list("SELECT t.*" + FROM + where + " ORDER BY t.\"createdAt\" DESC LIMIT :limit OFFSET :offset", params);
    long total = db.count("SELECT COUNT(*)" + FROM + where, params);
    String paidWhere = where.isEmpty() ? " WHERE t.\"statut\" = 'PAYE'" : where + " AND t.\"statut\" = 'PAYE'";
    Map<String, Object> paid = db.one("SELECT COALESCE(SUM(t.\"montant\"), 0) AS montant, COUNT(*) AS nombre" + FROM + paidWhere, params);

    Map<String, Map<String, Object>> contribuables = byId("SELECT * FROM \"Contribuable\" WHERE \"id\" IN (:ids)", rows, "contribuableId");
    Map<String, Map<String, Object>> agents = byId("SELECT " + AGENT_PUBLIC + " FROM \"User\" WHERE \"id\" IN (:ids)", rows, "agentId");
    List<Map<String, Object>> data = new ArrayList<>();
    for (Map<String, Object> row : rows) {
      Map<String, Object> item = new LinkedHashMap<>(row);
      item.put("contribuable", contribuableJson(contribuables.get(Db.str(row, "contribuableId"))));
      item.put("agent", agents.get(Db.str(row, "agentId")));
      data.add(item);
    }
    Map<String, Object> meta = Api.map("page", page, "limit", limit, "total", total,
        "totalPages", Math.max(1, (long) Math.ceil((double) total / limit)),
        "montantPaye", Db.num(paid, "montant"), "nombrePaye", (long) Db.num(paid, "nombre"));
    return Api.map("data", data, "meta", meta);
  }

  private Map<String, Map<String, Object>> byId(String sql, List<Map<String, Object>> rows, String key) {
    Set<String> ids = new LinkedHashSet<>();
    for (Map<String, Object> row : rows) ids.add(Db.str(row, key));
    Map<String, Map<String, Object>> result = new LinkedHashMap<>();
    if (ids.isEmpty()) return result;
    for (Map<String, Object> row : db.list(sql, Db.params("ids", new ArrayList<>(ids)))) result.put(Db.str(row, "id"), row);
    return result;
  }

  public List<Map<String, Object>> usedCategories(int year) {
    UnaryOperator<String> label = labels.labeler();
    Map<String, Map<String, Object>> byLabel = new LinkedHashMap<>();
    for (Map<String, Object> row : usedCategoryRows(year)) {
      String libelle = label.apply(Db.str(row, "categorie"));
      Map<String, Object> current = byLabel.get(libelle);
      byLabel.put(libelle, Api.map("valeur", current != null ? current.get("valeur") : row.get("categorie"), "libelle", libelle,
          "nombre", (current != null ? (long) current.get("nombre") : 0L) + (long) Db.num(row, "nombre")));
    }
    Collator collator = Collator.getInstance(Locale.FRENCH);
    List<Map<String, Object>> result = new ArrayList<>(byLabel.values());
    result.sort((a, b) -> collator.compare((String) a.get("libelle"), (String) b.get("libelle")));
    return result;
  }

  /** Recettes encaissées (PAYE) d'une période, réparties par catégorie (periodStats). */
  private Map<String, Object> periodStats(List<Map<String, Object>> rows, UnaryOperator<String> label) {
    Map<String, Double> byCategory = new LinkedHashMap<>();
    double total = 0;
    long transactions = 0;
    for (Map<String, Object> row : rows) {
      String nom = label.apply(Db.str(row, "categorie"));
      double montant = Db.num(row, "montant");
      byCategory.merge(nom, montant, Double::sum);
      total += montant;
      transactions += (long) Db.num(row, "nombre");
    }
    final double sum = total;
    List<Map.Entry<String, Double>> entries = new ArrayList<>(byCategory.entrySet());
    entries.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));
    List<Map<String, Object>> categories = new ArrayList<>();
    for (var entry : entries) {
      categories.add(Api.map("nom", entry.getKey(), "montant", entry.getValue(),
          "pourcentage", sum > 0 ? Math.round(entry.getValue() / sum * 100) : 0));
    }
    return Api.map("total", total, "transactions", transactions, "categories", categories);
  }

  private List<Map<String, Object>> paidByCategory(int year, Instant from, Instant to) {
    String range = from != null ? " AND \"date\" >= :from AND \"date\" < :to" : "";
    return db.list("SELECT \"categorie\", COALESCE(SUM(\"montant\"), 0) AS montant, COUNT(*) AS nombre FROM \"Transaction\""
        + " WHERE \"year\" = :year AND \"statut\" = 'PAYE'" + range + " GROUP BY \"categorie\"",
        Db.params("year", year, "from", from, "to", to));
  }

  public Map<String, Object> statistics(int year) {
    ZoneId zone = ZoneId.systemDefault();
    LocalDate today = LocalDate.now(zone);
    Instant startOfDay = today.atStartOfDay(zone).toInstant();
    Instant startOfNextDay = today.plusDays(1).atStartOfDay(zone).toInstant();
    Instant startOfMonth = today.withDayOfMonth(1).atStartOfDay(zone).toInstant();
    Instant startOfNextMonth = today.withDayOfMonth(1).plusMonths(1).atStartOfDay(zone).toInstant();
    UnaryOperator<String> label = labels.labeler();
    Map<String, Object> totals = db.one("SELECT COUNT(*) AS nombre, COALESCE(SUM(\"montant\"), 0) AS montant FROM \"Transaction\" WHERE \"year\" = :year",
        Db.params("year", year));
    Map<String, Object> annee = periodStats(paidByCategory(year, null, null), label);
    return Api.map(
        "aujourdhui", periodStats(paidByCategory(year, startOfDay, startOfNextDay), label),
        "mois", periodStats(paidByCategory(year, startOfMonth, startOfNextMonth), label),
        "annee", annee,
        "totalTransactions", (long) Db.num(totals, "nombre"),
        "recettesPayees", annee.get("total"),
        "recettesTotal", Db.num(totals, "montant"));
  }

  // --- Export CSV --------------------------------------------------------------------------------

  private static String cell(Object value) {
    String text = value == null ? "" : value instanceof Double d ? Js.num(d) : value.toString();
    return CSV_SPECIAL.matcher(text).find() ? "\"" + text.replace("\"", "\"\"") + "\"" : text;
  }

  private static String line(List<?> values) {
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < values.size(); i++) {
      if (i > 0) sb.append(',');
      sb.append(cell(values.get(i)));
    }
    return sb.append("\r\n").toString();
  }

  private static String person(Object prenom, Object nom) {
    return ((prenom == null ? "" : prenom) + " " + (nom == null ? "" : nom)).strip();
  }

  /** Export par lots de 2 000 (curseur createdAt, id), écrit au fil de l'eau. */
  public void export(Criteria input, Writer out) throws IOException {
    UnaryOperator<String> label = labels.labeler();
    out.write("﻿" + line(HEADER));
    Criteria criteria = withCategoryVariants(input);
    final int batchSize = 2000;
    Instant cursorCreatedAt = null;
    String cursorId = null;
    for (;;) {
      MapSqlParameterSource params = new MapSqlParameterSource();
      String where = where(criteria, params);
      if (cursorId != null) {
        where += (where.isEmpty() ? " WHERE " : " AND ") + "(t.\"createdAt\" < :cursorCreatedAt OR (t.\"createdAt\" = :cursorCreatedAt AND t.\"id\" < :cursorId))";
        params.addValue("cursorCreatedAt", Timestamp.from(cursorCreatedAt)).addValue("cursorId", cursorId);
      }
      params.addValue("limit", batchSize);
      List<Map<String, Object>> batch = db.list("SELECT t.\"id\", t.\"numero\", t.\"date\", t.\"categorie\", t.\"service\", t.\"montant\", t.\"statut\","
          + " t.\"modePaiement\", t.\"createdAt\", c.\"nom\" AS \"cNom\", c.\"prenom\" AS \"cPrenom\", c.\"nin\" AS \"cNin\","
          + " a.\"nom\" AS \"aNom\", a.\"prenom\" AS \"aPrenom\"" + FROM + " LEFT JOIN \"Contribuable\" c ON c.\"id\" = t.\"contribuableId\" LEFT JOIN \"User\" a ON a.\"id\" = t.\"agentId\""
          + where + " ORDER BY t.\"createdAt\" DESC, t.\"id\" DESC LIMIT :limit", params);
      if (batch.isEmpty()) return;
      StringBuilder chunk = new StringBuilder();
      for (Map<String, Object> row : batch) {
        String iso = sn.kafountine.gestionmunicipale.shared.config.JacksonConfig.iso(Db.date(row, "date"));
        chunk.append(line(List.of(Db.str(row, "numero"), iso.substring(0, 10), iso.substring(11, 16), label.apply(Db.str(row, "categorie")),
            Db.str(row, "service"), person(row.get("cPrenom"), row.get("cNom")), row.get("cNin") == null ? "" : row.get("cNin"),
            person(row.get("aPrenom"), row.get("aNom")), Db.num(row, "montant"), Db.str(row, "statut"), Db.str(row, "modePaiement"))));
      }
      out.write(chunk.toString());
      out.flush();
      if (batch.size() < batchSize) return;
      Map<String, Object> last = batch.get(batch.size() - 1);
      cursorCreatedAt = Db.date(last, "createdAt");
      cursorId = Db.str(last, "id");
    }
  }

  // --- Écritures ---------------------------------------------------------------------------------

  /** Ligne Transaction telle que Prisma la rend après create/update : montants Decimal en chaîne. */
  private Map<String, Object> rawTransaction(String id) {
    Map<String, Object> row = db.one("SELECT * FROM \"Transaction\" WHERE \"id\" = :id", Db.params("id", id));
    row.put("tarifUnitaire", Js.decimal(row.get("tarifUnitaire")));
    row.put("montant", Js.decimal(row.get("montant")));
    return row;
  }

  public record CreateInput(String contribuableId, String agentId, String categorie, String type, String service, Integer quantite,
      Double montant, String modePaiement, String statut, String date) {}

  private static String firstNonEmpty(String... values) {
    for (String value : values) {
      if (value != null && !value.isEmpty()) return value;
    }
    return null;
  }

  @Transactional
  public Map<String, Object> create(Actor actor, CreateInput input) {
    int year = Year.now().getValue();
    String categorie = firstNonEmpty(input.categorie(), input.type(), "TAXE");
    String service = firstNonEmpty(input.service(), input.categorie(), input.type(), "Taxe");
    int quantite = input.quantite() == null || input.quantite() == 0 ? 1 : input.quantite();
    double montant = input.montant() == null ? 0 : input.montant();
    Instant date;
    if (input.date() != null && !input.date().isEmpty()) {
      date = Input.parseDate(input.date());
      if (date == null) throw new IllegalArgumentException("Invalid value for argument `date`: Provided Date object is invalid.");
    } else {
      date = Instant.now();
    }
    String numero = numeros.next(NumeroSequence.Series.TRANSACTION, year);
    String id = Db.uuid();
    Instant now = Instant.now();
    db.update("""
        INSERT INTO "Transaction" ("id", "numero", "contribuableId", "agentId", "categorie", "service", "quantite", "tarifUnitaire", "montant",
          "modePaiement", "statut", "date", "year", "createdAt", "updatedAt")
        VALUES (:id, :numero, :contribuableId, :agentId, :categorie, :service, :quantite, :montant, :montant, :modePaiement, :statut, :date, :year, :now, :now)
        """, Db.params("id", id, "numero", numero, "contribuableId", input.contribuableId(), "agentId", input.agentId(), "categorie", categorie,
        "service", service, "quantite", quantite, "montant", montant, "modePaiement", firstNonEmpty(input.modePaiement(), "ESPECE"),
        "statut", firstNonEmpty(input.statut(), "PAYE"), "date", date, "year", year, "now", now));
    Map<String, Object> created = rawTransaction(id);
    auditTrail.record(actor, "Encaissement", "Recettes", "Transaction " + numero + " enregistrée : " + service + " (" + Js.num(montant) + " FCFA)");
    return created;
  }

  public record UpdateInput(String contribuableId, String type, String service, Integer quantite, Double montant, String modePaiement, String statut) {}

  private Map<String, Object> summary(String id) {
    return db.one("SELECT \"numero\", \"montant\", \"service\" FROM \"Transaction\" WHERE \"id\" = :id", Db.params("id", id));
  }

  @Transactional
  public Map<String, Object> update(Actor actor, String id, UpdateInput input) {
    Map<String, Object> before = summary(id);
    if (before == null) throw AppException.notFound("Transaction introuvable.");
    Map<String, Object> changes = new LinkedHashMap<>();
    if (input.contribuableId() != null) changes.put("contribuableId", input.contribuableId());
    // input.service || input.categorie || input.type (categorie n'est pas accepté par le schéma).
    if (input.type() != null) changes.put("service", input.service() != null && !input.service().isEmpty() ? input.service() : input.type());
    if (input.quantite() != null) changes.put("quantite", input.quantite());
    if (input.montant() != null) {
      changes.put("montant", input.montant());
      changes.put("tarifUnitaire", input.montant());
    }
    if (input.modePaiement() != null) changes.put("modePaiement", input.modePaiement());
    if (input.statut() != null) changes.put("statut", input.statut());
    MapSqlParameterSource params = new MapSqlParameterSource("id", id).addValue("updatedAt", Timestamp.from(Instant.now()));
    StringBuilder set = new StringBuilder("\"updatedAt\" = :updatedAt");
    changes.forEach((key, value) -> {
      set.append(", \"").append(key).append("\" = :").append(key);
      params.addValue(key, value);
    });
    if (db.update("UPDATE \"Transaction\" SET " + set + " WHERE \"id\" = :id", params) == 0) {
      throw AppException.notFound("Ressource introuvable");
    }
    Map<String, Object> updated = rawTransaction(id);
    String montant = input.montant() == null ? "" : " ; montant " + Js.num(Db.num(before, "montant")) + " → " + Js.num(input.montant()) + " FCFA";
    auditTrail.record(actor, "Modification transaction", "Recettes", "Transaction " + before.get("numero") + " modifiée" + montant, "warning");
    return updated;
  }

  @Transactional
  public void delete(Actor actor, String id) {
    Map<String, Object> existing = summary(id);
    if (existing == null) throw AppException.notFound("Transaction introuvable.");
    if (db.update("DELETE FROM \"Transaction\" WHERE \"id\" = :id", Db.params("id", id)) == 0) {
      throw AppException.notFound("Ressource introuvable");
    }
    auditTrail.record(actor, "Suppression transaction", "Recettes",
        "Transaction " + existing.get("numero") + " supprimée : " + existing.get("service") + " (" + Js.num(Db.num(existing, "montant")) + " FCFA)", "warning");
  }
}
