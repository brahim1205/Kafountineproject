package sn.kafountine.gestionmunicipale.modules.parametres;

import java.text.Collator;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.kafountine.gestionmunicipale.shared.audit.Actor;
import sn.kafountine.gestionmunicipale.shared.audit.AuditTrail;
import sn.kafountine.gestionmunicipale.shared.config.JacksonConfig;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;
import sn.kafountine.gestionmunicipale.shared.text.Js;

/** Paramètres : tarifs, pénalités, permissions et sauvegardes (ParametresService côté Node). */
@Service
public class ParametresService {
  private static final String SELECT_TARIFF = """
      SELECT i."id", c."id" AS "categoryId", c."nom" AS "categorie", i."nom", i."tarif" AS "montant", i."unite",
             c."description" AS "description", i."isActive" AS "actif", i."createdAt", i."updatedAt"
      FROM "MunicipalTariffItem" i
      INNER JOIN "MunicipalTariffCategory" c ON c."id" = i."categoryId"
      """;
  private static final List<String> PERMISSION_MODULES = List.of("Dashboard", "Contribuables", "Recettes", "Taxes", "Utilisateurs", "Audit", "Budget",
      "État civil", "Urbanisme", "Marché", "Motos", "Formations", "Quai de pêche", "Paramètres");
  private static final Map<String, List<String>> ROLE_MODULES = new LinkedHashMap<>();
  private static final List<String> ASSIGNABLE_ROLES = List.of("AGENT", "SUPERVISEUR", "COMPTABLE", "ADMIN", "SUPER_ADMIN");

  static {
    ROLE_MODULES.put("AGENT", List.of("Dashboard", "Contribuables", "Recettes", "Taxes", "État civil", "Urbanisme", "Marché", "Motos", "Formations", "Quai de pêche"));
    ROLE_MODULES.put("SUPERVISEUR", List.of("Dashboard", "Contribuables", "Recettes", "Taxes", "État civil", "Urbanisme"));
    ROLE_MODULES.put("COMPTABLE", List.of("Dashboard", "Contribuables", "Recettes", "Taxes", "Budget", "Marché"));
    ROLE_MODULES.put("ADMIN", null);
    ROLE_MODULES.put("SUPER_ADMIN", null);
  }

  private final Db db;
  private final BackupStore backups;
  private final AuditTrail auditTrail;

  public ParametresService(Db db, BackupStore backups, AuditTrail auditTrail) {
    this.db = db;
    this.backups = backups;
    this.auditTrail = auditTrail;
  }

  private static boolean truthy(String value) {
    return value != null && !value.isEmpty();
  }

  // --- Tarifs ------------------------------------------------------------------------------------

  public List<Map<String, Object>> listTariffs() {
    List<Map<String, Object>> result = new ArrayList<>();
    for (Map<String, Object> row : db.list(SELECT_TARIFF + " ORDER BY c.\"sortOrder\" ASC, i.\"sortOrder\" ASC, i.\"nom\" ASC")) result.add(tariffView(row));
    return result;
  }

  private Map<String, Object> findTariff(String id) {
    return db.one(SELECT_TARIFF + " WHERE i.\"id\" = :id LIMIT 1", Db.params("id", id));
  }

  private String findOrCreateCategory(String label) {
    String normalized = label.strip();
    Map<String, Object> byName = db.one("SELECT \"id\", \"nom\" FROM \"MunicipalTariffCategory\" WHERE LOWER(\"nom\") = LOWER(:nom) LIMIT 1", Db.params("nom", normalized));
    if (byName != null) return Db.str(byName, "id");
    String slug = Js.slugify(normalized);
    String id = slug.isEmpty() ? Db.uuid() : slug;
    if (db.one("SELECT \"id\", \"nom\" FROM \"MunicipalTariffCategory\" WHERE \"id\" = :id LIMIT 1", Db.params("id", id)) != null) return id;
    Map<String, Object> max = db.one("SELECT MAX(\"sortOrder\")::int AS \"max\" FROM \"MunicipalTariffCategory\"", Db.params());
    int sortOrder = (max == null || max.get("max") == null ? -1 : (int) Db.num(max, "max")) + 1;
    db.update("INSERT INTO \"MunicipalTariffCategory\" (\"id\", \"nom\", \"sortOrder\", \"isActive\", \"createdAt\", \"updatedAt\")"
        + " VALUES (:id, :nom, :sortOrder, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", Db.params("id", id, "nom", normalized, "sortOrder", sortOrder));
    return id;
  }

  public record TariffInput(String categorie, String nom, Double montant, String unite, String description, boolean descriptionProvided, Boolean actif) {}

  @Transactional
  public Map<String, Object> createTariff(Actor actor, TariffInput input) {
    String categorie = input.categorie() == null ? "" : input.categorie().strip();
    String nom = input.nom() == null ? "" : input.nom().strip();
    double montant = input.montant() == null ? 0 : input.montant();
    String unite = input.unite() == null ? "" : input.unite().strip();
    boolean actif = input.actif() == null || input.actif();
    if (categorie.isEmpty() || nom.isEmpty() || unite.isEmpty()) throw AppException.validation("La catégorie, le nom et l’unité sont requis.");
    if (montant < 0) throw AppException.validation("Le montant doit être positif.");
    String categoryId = findOrCreateCategory(categorie);
    String itemId = Db.uuid();
    Map<String, Object> max = db.one("SELECT MAX(\"sortOrder\")::int AS \"max\" FROM \"MunicipalTariffItem\" WHERE \"categoryId\" = :id", Db.params("id", categoryId));
    int sortOrder = (max == null || max.get("max") == null ? -1 : (int) Db.num(max, "max")) + 1;
    db.update("""
        INSERT INTO "MunicipalTariffItem" ("id", "categoryId", "nom", "tarif", "unite", "calcul", "legalSource", "effectiveDate", "sortOrder", "isActive", "createdAt", "updatedAt")
        VALUES (:id, :categoryId, :nom, :montant, :unite, NULL, NULL, NULL, :sortOrder, :actif, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """, Db.params("id", itemId, "categoryId", categoryId, "nom", nom, "montant", montant, "unite", unite, "sortOrder", sortOrder, "actif", actif));
    Map<String, Object> row = findTariff(itemId);
    auditTrail.record(actor, "Création tarif", "Parametres", "Tarif " + row.get("nom") + " cree dans " + row.get("categorie"));
    return tariffView(row);
  }

  @Transactional
  public Map<String, Object> updateTariff(Actor actor, String id, TariffInput input) {
    Map<String, Object> existing = findTariff(id);
    if (existing == null) throw AppException.notFound("Tarif introuvable.");
    double montant = input.montant() == null ? Db.num(existing, "montant") : input.montant();
    if (montant < 0) throw AppException.validation("Le montant doit être positif.");
    String categoryId = findOrCreateCategory(truthy(input.categorie()) ? input.categorie().strip() : Db.str(existing, "categorie"));
    Object description;
    if (!input.descriptionProvided()) {
      description = existing.get("description");
    } else {
      String trimmed = input.description() == null ? "" : input.description().strip();
      description = trimmed.isEmpty() ? null : trimmed;
    }
    db.update("UPDATE \"MunicipalTariffCategory\" SET \"description\" = :description, \"updatedAt\" = CURRENT_TIMESTAMP WHERE \"id\" = :id",
        Db.params("description", description, "id", categoryId));
    db.update("""
        UPDATE "MunicipalTariffItem" SET "categoryId" = :categoryId, "nom" = :nom, "tarif" = :montant, "unite" = :unite, "isActive" = :actif,
          "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = :id
        """, Db.params("id", id, "categoryId", categoryId, "nom", truthy(input.nom()) ? input.nom().strip() : existing.get("nom"), "montant", montant,
        "unite", truthy(input.unite()) ? input.unite().strip() : existing.get("unite"), "actif", input.actif() == null ? existing.get("actif") : input.actif()));
    Map<String, Object> row = findTariff(id);
    auditTrail.record(actor, "Mise a jour tarif", "Parametres", "Tarif " + row.get("nom") + " mis a jour");
    return tariffView(row);
  }

  @Transactional
  public void deleteTariff(Actor actor, String id) {
    Map<String, Object> existing = findTariff(id);
    if (existing == null) throw AppException.notFound("Tarif introuvable.");
    db.update("DELETE FROM \"MunicipalTariffItem\" WHERE \"id\" = :id", Db.params("id", id));
    auditTrail.record(actor, "Suppression tarif", "Parametres", "Tarif " + existing.get("nom") + " supprime", "warning");
  }

  // --- Pénalités ---------------------------------------------------------------------------------

  public List<Map<String, Object>> listPenalties() {
    List<Map<String, Object>> result = new ArrayList<>();
    for (Map<String, Object> row : db.list("SELECT * FROM \"AppSettingPenalty\" ORDER BY \"type\" ASC")) result.add(penaltyView(row));
    return result;
  }

  private Map<String, Object> findPenalty(String id) {
    return db.one("SELECT * FROM \"AppSettingPenalty\" WHERE \"id\" = :id LIMIT 1", Db.params("id", id));
  }

  public record PenaltyInput(String type, String description, boolean descriptionProvided, Double montant, String delai, Boolean actif) {}

  @Transactional
  public Map<String, Object> createPenalty(Actor actor, PenaltyInput input) {
    String type = input.type() == null ? "" : input.type().strip();
    double montant = input.montant() == null ? 0 : input.montant();
    String delai = input.delai() == null ? "" : input.delai().strip();
    if (type.isEmpty() || delai.isEmpty()) throw AppException.validation("Le type et le délai sont requis.");
    if (montant < 0) throw AppException.validation("Le montant doit être positif.");
    Map<String, Object> row = db.one("""
        INSERT INTO "AppSettingPenalty" ("id", "type", "description", "montant", "delai", "actif", "createdAt", "updatedAt")
        VALUES (:id, :type, :description, :montant, :delai, :actif, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *
        """, Db.params("id", Db.uuid(), "type", type, "description", truthy(input.description()) ? input.description().strip() : null, "montant", montant,
        "delai", delai, "actif", input.actif() == null || input.actif()));
    auditTrail.record(actor, "Création pénalité", "Paramètres", "Pénalité " + row.get("type") + " créée");
    return penaltyView(row);
  }

  @Transactional
  public Map<String, Object> updatePenalty(Actor actor, String id, PenaltyInput input) {
    Map<String, Object> existing = findPenalty(id);
    if (existing == null) throw AppException.notFound("Pénalité introuvable.");
    double montant = input.montant() == null ? Db.num(existing, "montant") : input.montant();
    if (montant < 0) throw AppException.validation("Le montant doit être positif.");
    Object description;
    if (!input.descriptionProvided()) {
      description = existing.get("description");
    } else {
      String trimmed = input.description() == null ? "" : input.description().strip();
      description = trimmed.isEmpty() ? null : trimmed;
    }
    Map<String, Object> row = db.one("""
        UPDATE "AppSettingPenalty" SET "type" = :type, "description" = :description, "montant" = :montant, "delai" = :delai, "actif" = :actif,
          "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = :id RETURNING *
        """, Db.params("id", id, "type", truthy(input.type()) ? input.type().strip() : existing.get("type"), "description", description, "montant", montant,
        "delai", truthy(input.delai()) ? input.delai().strip() : existing.get("delai"), "actif", input.actif() == null ? existing.get("actif") : input.actif()));
    auditTrail.record(actor, "Mise à jour pénalité", "Paramètres", "Pénalité " + row.get("type") + " mise à jour");
    return penaltyView(row);
  }

  @Transactional
  public void deletePenalty(Actor actor, String id) {
    Map<String, Object> existing = findPenalty(id);
    if (existing == null) throw AppException.notFound("Pénalité introuvable.");
    db.update("DELETE FROM \"AppSettingPenalty\" WHERE \"id\" = :id", Db.params("id", id));
    auditTrail.record(actor, "Suppression pénalité", "Paramètres", "Pénalité " + existing.get("type") + " supprimée", "warning");
  }

  // --- Permissions -------------------------------------------------------------------------------

  public List<Map<String, Object>> listPermissions() {
    Map<String, Map<String, Object>> grouped = new LinkedHashMap<>();
    for (Map<String, Object> row : db.list("SELECT * FROM \"AppSettingPermission\" ORDER BY \"module\" ASC, \"role\" ASC")) {
      String module = Db.str(row, "module");
      Map<String, Object> current = grouped.computeIfAbsent(module, m -> Api.map("module", m, "agent", false, "superviseur", false, "comptable", false, "admin", false));
      switch (Db.str(row, "role")) {
        case "AGENT" -> current.put("agent", row.get("enabled"));
        case "SUPERVISEUR" -> current.put("superviseur", row.get("enabled"));
        case "COMPTABLE" -> current.put("comptable", row.get("enabled"));
        case "ADMIN" -> current.put("admin", row.get("enabled"));
        default -> { }
      }
    }
    Collator collator = Collator.getInstance(Locale.FRENCH);
    List<Map<String, Object>> result = new ArrayList<>(grouped.values());
    result.sort((a, b) -> collator.compare((String) a.get("module"), (String) b.get("module")));
    return result;
  }

  @Transactional
  public void updatePermission(Actor actor, String module, String role, boolean enabled) {
    String normalizedRole = role == null ? "" : role.strip().toUpperCase(Locale.ROOT);
    String moduleName = module == null ? "" : module.strip();
    if (moduleName.isEmpty() || !ASSIGNABLE_ROLES.contains(normalizedRole)) throw AppException.validation("Le module et le rôle sont requis.");
    Map<String, Object> existing = db.one("SELECT * FROM \"AppSettingPermission\" WHERE \"module\" = :module AND \"role\" = :role LIMIT 1",
        Db.params("module", moduleName, "role", normalizedRole));
    if (existing != null) {
      db.update("UPDATE \"AppSettingPermission\" SET \"enabled\" = :enabled, \"updatedAt\" = CURRENT_TIMESTAMP WHERE \"module\" = :module AND \"role\" = :role",
          Db.params("enabled", enabled, "module", moduleName, "role", normalizedRole));
    } else {
      db.update("INSERT INTO \"AppSettingPermission\" (\"id\", \"module\", \"role\", \"enabled\", \"createdAt\", \"updatedAt\")"
          + " VALUES (:id, :module, :role, :enabled, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", Db.params("id", Db.uuid(), "module", moduleName, "role", normalizedRole, "enabled", enabled));
    }
    auditTrail.record(actor, "Mise à jour permission", "Paramètres",
        "Permission " + normalizedRole + " / " + moduleName + " définie à " + (enabled ? "activée" : "désactivée"));
  }

  // --- Sauvegardes -------------------------------------------------------------------------------

  /** Valeurs par défaut des anciennes tables de paramètres, créées avant la première sauvegarde. */
  private void ensureDefaults() {
    if (db.count("SELECT COUNT(*)::bigint AS count FROM \"AppSettingTariff\"", Db.params()) == 0) {
      String[][] tariffs = {
          {"État Civil", "Extrait de naissance", "1000", "FCFA", "Délivrance standard d’un extrait"},
          {"Urbanisme", "Permis de construire", "600000", "FCFA", "Instruction complète du permis"},
          {"Marché", "Occupation place mensuelle", "5000", "FCFA/mois", "Place standard marché central"},
          {"Transport", "Licence moto-taxi", "1000", "FCFA/mois", "Paiement mensuel moto-taxi"}};
      insertDefaults("AppSettingTariff", "\"categorie\", \"nom\", \"montant\", \"unite\", \"description\"", tariffs);
    }
    if (db.count("SELECT COUNT(*)::bigint AS count FROM \"AppSettingPenalty\"", Db.params()) == 0) {
      String[][] penalties = {
          {"Retard paiement marché", "Majoration appliquée après échéance mensuelle", "1500", "5 jours après échéance"},
          {"Retard dossier urbanisme", "Frais complémentaires en cas de dossier incomplet prolongé", "5000", "10 jours après notification"},
          {"Retard moto-taxi", "Pénalité standard de régularisation", "250", "Immédiatement après échéance"}};
      insertDefaults("AppSettingPenalty", "\"type\", \"description\", \"montant\", \"delai\"", penalties);
    }
    if (db.count("SELECT COUNT(*)::bigint AS count FROM \"AppSettingPermission\"", Db.params()) == 0) {
      for (String module : PERMISSION_MODULES) {
        for (var entry : ROLE_MODULES.entrySet()) {
          boolean enabled = entry.getValue() == null || entry.getValue().contains(module);
          db.update("INSERT INTO \"AppSettingPermission\" (\"id\", \"module\", \"role\", \"enabled\", \"createdAt\", \"updatedAt\")"
              + " VALUES (:id, :module, :role, :enabled, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", Db.params("id", Db.uuid(), "module", module, "role", entry.getKey(), "enabled", enabled));
        }
      }
    }
  }

  /** Les montants (3e valeur) sont numériques ; la colonne « actif » vaut true. */
  private void insertDefaults(String table, String columns, String[][] rows) {
    StringBuilder sql = new StringBuilder("INSERT INTO \"" + table + "\" (\"id\", " + columns + ", \"actif\", \"createdAt\", \"updatedAt\") VALUES ");
    org.springframework.jdbc.core.namedparam.MapSqlParameterSource params = new org.springframework.jdbc.core.namedparam.MapSqlParameterSource();
    for (int r = 0; r < rows.length; r++) {
      if (r > 0) sql.append(", ");
      sql.append("(:id").append(r);
      params.addValue("id" + r, Db.uuid());
      for (int c = 0; c < rows[r].length; c++) {
        String name = "v" + r + "_" + c;
        sql.append(", :").append(name);
        boolean amount = table.equals("AppSettingTariff") ? c == 2 : c == 2;
        params.addValue(name, amount ? (Object) Integer.parseInt(rows[r][c]) : rows[r][c]);
      }
      sql.append(", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");
    }
    db.update(sql.toString(), params);
  }

  public List<Map<String, Object>> listBackups() {
    List<Map<String, Object>> result = new ArrayList<>();
    for (Map<String, Object> row : backups.list()) result.add(backupView(row));
    return result;
  }

  public Map<String, Object> createBackup(Actor actor) {
    ensureDefaults();
    String iso = JacksonConfig.iso(Instant.now());
    String filename = "backup-" + iso.replaceAll("[:.]", "-").replaceFirst("T", "_").replaceFirst("Z", "") + ".json";
    Map<String, Object> row = backups.create(filename);
    auditTrail.record(actor, "Création sauvegarde", "Backups", "Sauvegarde " + filename + " créée");
    return backupView(row);
  }

  public void restoreBackup(Actor actor, String filename) {
    if (filename == null || filename.isEmpty()) throw AppException.validation("Le nom du fichier de sauvegarde est requis.");
    Map<String, Object> backup = backups.findByFilename(filename);
    if (backup == null) throw AppException.notFound("Sauvegarde introuvable.");
    backups.restore(backup);
    auditTrail.record(actor, "Restauration sauvegarde", "Backups", "Restauration effectuée depuis " + filename, "warning");
  }

  public Map<String, Object> getBackup(String filename) {
    Map<String, Object> backup = backups.findByFilename(filename);
    if (backup == null) throw AppException.notFound("Sauvegarde introuvable.");
    return backup;
  }

  // --- Vues --------------------------------------------------------------------------------------

  private static Map<String, Object> tariffView(Map<String, Object> row) {
    Map<String, Object> view = new LinkedHashMap<>();
    view.put("id", row.get("id"));
    view.put("categorie", row.get("categorie"));
    view.put("nom", row.get("nom"));
    view.put("montant", Db.num(row, "montant"));
    view.put("unite", row.get("unite"));
    if (truthy(Db.str(row, "description"))) view.put("description", row.get("description"));
    view.put("actif", row.get("actif"));
    return view;
  }

  private static Map<String, Object> penaltyView(Map<String, Object> row) {
    Map<String, Object> view = new LinkedHashMap<>();
    view.put("id", row.get("id"));
    view.put("type", row.get("type"));
    if (truthy(Db.str(row, "description"))) view.put("description", row.get("description"));
    view.put("montant", Db.num(row, "montant"));
    view.put("delai", row.get("delai"));
    view.put("actif", row.get("actif"));
    return view;
  }

  private static Map<String, Object> backupView(Map<String, Object> row) {
    Instant restored = Db.date(row, "restoredAt");
    return Api.map("filename", row.get("filename"), "size", row.get("size"), "createdAt", JacksonConfig.iso(Db.date(row, "createdAt")),
        "restoredAt", restored == null ? null : JacksonConfig.iso(restored));
  }
}
