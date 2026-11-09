package sn.kafountine.gestionmunicipale.modules.parametres;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import sn.kafountine.gestionmunicipale.shared.config.JacksonConfig;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;

/**
 * Sauvegardes applicatives (PrismaBackupStore côté Node) : instantané JSON des tables métier dans
 * « BackupRecord ». Le format est celui de Node (Decimal en chaîne, dates ISO), si bien qu'une
 * sauvegarde faite par l'un se restaure avec l'autre.
 */
@Component
public class BackupStore {
  static final List<String> BACKUP_TABLES = List.of("User", "Contribuable", "Transaction", "BudgetLine", "BudgetRequest", "AuditLog", "EtatCivilRequest",
      "UrbanismeCase", "MarketPlace", "MarketPayment", "MotoRegistration", "MotoPayment", "TrainingProgram", "YouthProfile", "YouthEnrollment",
      "Fisherman", "FishingBoat", "FishCommission", "RefrigeratedTruck", "ShippingExpedition", "AppSettingTariff", "AppSettingPenalty",
      "AppSettingPermission", "NumeroCounter", "CashClosure");
  private static final List<String> DELETE_ORDER = List.of("CashClosure", "NumeroCounter", "Transaction", "BudgetRequest", "AuditLog", "EtatCivilRequest", "UrbanismeCase",
      "MarketPayment", "MarketPlace", "MotoPayment", "MotoRegistration", "YouthEnrollment", "FishingBoat", "FishCommission", "ShippingExpedition",
      "TrainingProgram", "YouthProfile", "Fisherman", "RefrigeratedTruck", "AppSettingTariff", "AppSettingPenalty", "AppSettingPermission", "BudgetLine",
      "Contribuable", "User");
  private static final List<String> INSERT_ORDER = List.of("NumeroCounter", "User", "Contribuable", "BudgetLine", "AppSettingTariff", "AppSettingPenalty",
      "AppSettingPermission", "TrainingProgram", "YouthProfile", "Fisherman", "RefrigeratedTruck", "MarketPlace", "MotoRegistration", "BudgetRequest",
      "AuditLog", "EtatCivilRequest", "UrbanismeCase", "Transaction", "MarketPayment", "MotoPayment", "YouthEnrollment", "FishingBoat", "FishCommission",
      "ShippingExpedition", "CashClosure");
  private static final Pattern IDENTIFIER = Pattern.compile("^[A-Za-z_][A-Za-z0-9_]*$");
  /** PostgreSQL accepte au plus 65 535 paramètres par requête (32 767 avec le pilote JDBC). */
  private static final int MAX_PARAMETERS = 30000;

  private final Db db;
  private final JdbcTemplate jdbc;
  private final ObjectMapper mapper;
  private final TransactionTemplate restoreTransaction;

  public BackupStore(Db db, ObjectMapper mapper, PlatformTransactionManager transactionManager) {
    this.db = db;
    this.jdbc = db.jdbc().getJdbcTemplate();
    this.mapper = mapper;
    // Une restauration complète dépasse largement le délai des transactions ordinaires.
    this.restoreTransaction = new TransactionTemplate(transactionManager);
    this.restoreTransaction.setTimeout(15 * 60);
  }

  static String quote(String identifier) {
    if (!IDENTIFIER.matcher(identifier).matches()) throw AppException.validation("Identifiant SQL invalide: " + identifier);
    return "\"" + identifier + "\"";
  }

  public List<Map<String, Object>> list() {
    return db.list("SELECT \"id\", \"filename\", \"size\", \"restoredAt\", \"createdAt\", \"updatedAt\" FROM \"BackupRecord\" ORDER BY \"createdAt\" DESC");
  }

  public Map<String, Object> findByFilename(String filename) {
    return db.one("SELECT * FROM \"BackupRecord\" WHERE \"filename\" = :filename LIMIT 1", Db.params("filename", filename));
  }

  /** Valeur d'une colonne telle que $queryRawUnsafe la rend puis JSON.stringify l'écrit. */
  private static Object jsonValue(Object value) {
    if (value instanceof Timestamp timestamp) return JacksonConfig.iso(timestamp.toInstant());
    if (value instanceof java.sql.Date date) return date.toString();
    if (value instanceof BigDecimal decimal) {
      String plain = decimal.stripTrailingZeros().toPlainString();
      return plain.equals("0.0") ? "0" : plain;
    }
    if (value instanceof Float f) return f.doubleValue();
    return value;
  }

  private Map<String, Object> buildSnapshot() {
    Map<String, Object> tables = new LinkedHashMap<>();
    for (String table : BACKUP_TABLES) {
      tables.put(table, jdbc.query("SELECT * FROM " + quote(table) + " ORDER BY 1 ASC", (ResultSet rs, int rowNum) -> {
        ResultSetMetaData meta = rs.getMetaData();
        Map<String, Object> row = new LinkedHashMap<>();
        for (int i = 1; i <= meta.getColumnCount(); i++) row.put(meta.getColumnLabel(i), jsonValue(rs.getObject(i)));
        return row;
      }));
    }
    Map<String, Object> snapshot = new LinkedHashMap<>();
    snapshot.put("version", 1);
    snapshot.put("createdAt", JacksonConfig.iso(Instant.now()));
    snapshot.put("tables", tables);
    return snapshot;
  }

  public Map<String, Object> create(String filename) {
    String text;
    try {
      text = mapper.writeValueAsString(buildSnapshot());
    } catch (JsonProcessingException e) {
      throw new IllegalStateException(e);
    }
    return db.one("""
        INSERT INTO "BackupRecord" ("id", "filename", "size", "snapshot", "restoredAt", "createdAt", "updatedAt")
        VALUES (:id, :filename, :size, :snapshot, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *
        """, Db.params("id", Db.uuid(), "filename", filename, "size", text.getBytes(StandardCharsets.UTF_8).length, "snapshot", text));
  }

  public void restore(Map<String, Object> backup) {
    restoreSnapshot(Db.str(backup, "snapshot"));
    db.update("UPDATE \"BackupRecord\" SET \"restoredAt\" = CURRENT_TIMESTAMP, \"updatedAt\" = CURRENT_TIMESTAMP WHERE \"id\" = :id",
        Db.params("id", backup.get("id")));
  }

  @SuppressWarnings("unchecked")
  private void restoreSnapshot(String snapshotText) {
    Map<String, Object> parsed;
    try {
      parsed = mapper.readValue(snapshotText, new TypeReference<LinkedHashMap<String, Object>>() {});
    } catch (JsonProcessingException | RuntimeException e) {
      throw AppException.validation("Le contenu de la sauvegarde est invalide.");
    }
    if (parsed == null || !(parsed.get("tables") instanceof Map<?, ?>)) throw AppException.validation("Le format de la sauvegarde est invalide.");
    Map<String, Object> tables = (Map<String, Object>) parsed.get("tables");
    Set<String> allowed = Set.copyOf(BACKUP_TABLES);
    for (String name : tables.keySet()) {
      if (!allowed.contains(name)) throw AppException.validation("Table non autorisée dans la sauvegarde: " + name);
    }
    Map<String, Map<String, String>> columnTypes = new HashMap<>();
    for (Map<String, Object> row : db.list("""
        SELECT "table_name" AS "tableName", "column_name" AS "columnName", "udt_name" AS "dataType"
        FROM "information_schema"."columns" WHERE "table_schema" = 'public'
        """)) {
      String table = Db.str(row, "tableName");
      if (!allowed.contains(table)) continue;
      columnTypes.computeIfAbsent(table, k -> new HashMap<>()).put(Db.str(row, "columnName"), Db.str(row, "dataType"));
    }
    restoreTransaction.executeWithoutResult(status -> {
      for (String table : DELETE_ORDER) jdbc.update("DELETE FROM " + quote(table));
      for (String table : INSERT_ORDER) {
        Object raw = tables.get(table);
        List<Object> rows = raw instanceof List<?> list ? (List<Object>) list : List.of();
        Map<String, String> types = columnTypes.get(table);
        if (types == null) throw AppException.validation("Aucune colonne autorisée trouvée pour la table " + table);
        // Lignes regroupées par jeu de colonnes et insérées par lots.
        Map<String, List<Map<String, Object>>> groups = new LinkedHashMap<>();
        Map<String, List<String>> groupKeys = new HashMap<>();
        for (Object item : rows) {
          if (!(item instanceof Map<?, ?>)) throw AppException.validation("Ligne invalide dans la table " + table);
          Map<String, Object> row = (Map<String, Object>) item;
          if (row.isEmpty()) continue;
          List<String> keys = new ArrayList<>(row.keySet());
          for (String key : keys) {
            if (!types.containsKey(key)) throw AppException.validation("Colonne non autorisée dans " + table + ": " + key);
          }
          String signature = String.join("\u0000", keys);
          groups.computeIfAbsent(signature, k -> new ArrayList<>()).add(row);
          groupKeys.putIfAbsent(signature, keys);
        }
        for (var entry : groups.entrySet()) {
          List<String> keys = groupKeys.get(entry.getKey());
          List<Map<String, Object>> groupRows = entry.getValue();
          String columns = String.join(", ", keys.stream().map(BackupStore::quote).toList());
          // Chaque valeur est convertie vers le type de sa colonne (le JSON ne conserve pas les types SQL).
          String tuple = "(" + String.join(", ", keys.stream().map(k -> "?::" + quote(types.get(k))).toList()) + ")";
          int batchSize = Math.max(1, MAX_PARAMETERS / keys.size());
          for (int start = 0; start < groupRows.size(); start += batchSize) {
            List<Map<String, Object>> batch = groupRows.subList(start, Math.min(groupRows.size(), start + batchSize));
            List<Object> values = new ArrayList<>(batch.size() * keys.size());
            for (Map<String, Object> row : batch) {
              for (String key : keys) values.add(row.get(key));
            }
            String sql = "INSERT INTO " + quote(table) + " (" + columns + ") VALUES " + String.join(", ", java.util.Collections.nCopies(batch.size(), tuple));
            jdbc.update(sql, values.toArray());
          }
        }
      }
    });
  }
}
