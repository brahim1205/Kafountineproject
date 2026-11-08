package sn.kafountine.gestionmunicipale.modules.urbanisme;

import java.time.Year;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
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

/** Dossiers d'urbanisme (UrbanismeService et PrismaUrbanismeRepository côté Node). */
@Service
public class UrbanismeService {
  private static final String SELECT_WITH_RELATIONS = """
      SELECT u.*, c."nom" AS "contribuableNom", c."prenom" AS "contribuablePrenom", c."nin" AS "contribuableNin",
             c."telephone" AS "contribuableTelephone", c."adresse" AS "contribuableAdresse", a."nom" AS "agentNom", a."prenom" AS "agentPrenom"
      FROM "UrbanismeCase" u
      INNER JOIN "Contribuable" c ON c."id" = u."contribuableId"
      LEFT JOIN "User" a ON a."id" = u."agentId"
      """;
  private static final String FILTER = " WHERE u.\"year\" = :year AND (CAST(:statut AS text) IS NULL OR u.\"statut\" = :statut)"
      + " AND (CAST(:type AS text) IS NULL OR u.\"type\" = :type)";
  private static final List<String> DISPLAY = List.of("contribuableNom", "contribuablePrenom", "contribuableNin", "contribuableTelephone",
      "contribuableAdresse", "agentNom", "agentPrenom");

  /** Type du catalogue : id, nom, tarif, unité. */
  record Type(String id, String nom, double tarif, String unite) {}

  private static final Map<String, Type> TYPE_CATALOG = new LinkedHashMap<>();

  static {
    Type permis = new Type("permis-construire", "Permis de construire", 5000, "m²");
    Type travaux = new Type("autorisation-travaux", "Autorisation de travaux", 2500, "dossier");
    Type conformite = new Type("certificat-conformite", "Certificat de conformité", 2000, "dossier");
    Type titre = new Type("titre-foncier", "Titre foncier", 10000, "dossier");
    TYPE_CATALOG.put("permis-construire", permis);
    TYPE_CATALOG.put("permis de construire", permis);
    TYPE_CATALOG.put("autorisation-travaux", travaux);
    TYPE_CATALOG.put("autorisation de travaux", travaux);
    TYPE_CATALOG.put("certificat-conformite", conformite);
    TYPE_CATALOG.put("certificat de conformité", conformite);
    TYPE_CATALOG.put("titre-foncier", titre);
    TYPE_CATALOG.put("titre foncier", titre);
  }

  private final Db db;
  private final ContribuableLookup contribuables;
  private final AuditTrail auditTrail;
  private final NumeroSequence numeros;

  public UrbanismeService(Db db, ContribuableLookup contribuables, AuditTrail auditTrail, NumeroSequence numeros) {
    this.db = db;
    this.contribuables = contribuables;
    this.auditTrail = auditTrail;
    this.numeros = numeros;
  }

  static Type resolveType(String type) {
    String normalized = type.strip().toLowerCase(Locale.ROOT);
    Type known = TYPE_CATALOG.get(normalized);
    return known != null ? known : new Type(normalized.isEmpty() ? "dossier-urbanisme" : normalized, type.strip(), 2500, "dossier");
  }

  static String normalizeStatus(String status) {
    String normalized = status.strip().toUpperCase(Locale.ROOT);
    return normalized.equals("VALIDE") || normalized.equals("REJETE") || normalized.equals("EN_ATTENTE") ? normalized : "EN_ATTENTE";
  }

  public Map<String, Object> list(int page, int limit, int year, String statut) {
    MapSqlParameterSource params = Db.params("year", year, "statut", statut == null || statut.isEmpty() ? null : statut, "type", null);
    params.addValue("offset", (long) (page - 1) * limit).addValue("limit", limit);
    List<Map<String, Object>> data = new ArrayList<>();
    for (Map<String, Object> row : db.list(SELECT_WITH_RELATIONS + FILTER + " ORDER BY u.\"createdAt\" DESC, u.\"id\" DESC OFFSET :offset LIMIT :limit", params)) {
      data.add(view(row));
    }
    long total = db.count("SELECT COUNT(*)::int AS \"total\" FROM \"UrbanismeCase\" u" + FILTER, params);
    return Api.map("data", data, "total", total);
  }

  private Map<String, Object> findById(String id) {
    return db.one(SELECT_WITH_RELATIONS + " WHERE u.\"id\" = :id LIMIT 1", Db.params("id", id));
  }

  public Map<String, Object> show(String id) {
    Map<String, Object> row = findById(id);
    if (row == null) throw AppException.notFound("Dossier d'urbanisme introuvable.");
    return view(row);
  }

  public record Input(String contribuableId, String type, String description, Double surface, String localisation, String nature, Double montant,
      String statut, boolean descriptionProvided, boolean localisationProvided, boolean natureProvided) {}

  private static String trimmedOrNull(String value) {
    return value != null && !value.isEmpty() ? value.strip() : null;
  }

  @Transactional
  public Map<String, Object> create(Actor actor, Input input) {
    String contribuableId = input.contribuableId() == null ? "" : input.contribuableId().strip();
    String type = input.type() == null ? "" : input.type().strip();
    if (contribuableId.isEmpty() || type.isEmpty()) throw AppException.validation("Le contribuable et le type de dossier d'urbanisme sont requis.");
    Map<String, Object> contribuable = contribuables.findById(contribuableId);
    if (contribuable == null) throw AppException.notFound("Contribuable introuvable.");
    Type urbanismeType = resolveType(type);
    Double surface = input.surface();
    if (surface != null && surface < 0) throw AppException.validation("La surface du dossier d'urbanisme est invalide.");
    double montant = input.montant() == null
        ? (urbanismeType.unite().equals("m²") ? urbanismeType.tarif() * Math.max(1, surface == null || surface == 0 ? 1 : surface) : urbanismeType.tarif())
        : input.montant();
    if (montant < 0) throw AppException.validation("Le montant du dossier d'urbanisme est invalide.");
    int year = Year.now().getValue();
    String role = actor.role() == null ? "" : actor.role().strip().toUpperCase(Locale.ROOT);
    String defaultStatus = role.equals("ADMIN") || role.equals("SUPER_ADMIN") ? "VALIDE" : "EN_ATTENTE";
    String numero = numeros.next(NumeroSequence.Series.URBANISME, year);
    Map<String, Object> row = db.one("""
        INSERT INTO "UrbanismeCase" ("id", "numero", "contribuableId", "agentId", "type", "description", "surface", "localisation", "nature", "montant", "statut", "year", "createdAt", "updatedAt")
        VALUES (:id, :numero, :contribuableId, :agentId, :type, :description, :surface, :localisation, :nature, :montant, :statut, :year, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
        """, Db.params("id", Db.uuid(), "numero", numero, "contribuableId", contribuable.get("id"), "agentId", actor.userId(), "type", urbanismeType.id(),
        "description", trimmedOrNull(input.description()), "surface", surface, "localisation", trimmedOrNull(input.localisation()),
        "nature", trimmedOrNull(input.nature()), "montant", montant,
        "statut", input.statut() != null && !input.statut().isEmpty() ? normalizeStatus(input.statut()) : defaultStatus, "year", year));
    row.put("contribuableNom", contribuable.get("nom"));
    row.put("contribuablePrenom", contribuable.get("prenom"));
    row.put("contribuableNin", contribuable.get("nin"));
    row.put("contribuableTelephone", contribuable.get("telephone"));
    row.put("contribuableAdresse", contribuable.get("adresse"));
    row.put("agentNom", null);
    row.put("agentPrenom", null);
    auditTrail.record(actor, "Création dossier urbanisme", "Urbanisme", "Dossier " + row.get("numero") + " créé (" + urbanismeType.nom() + ")");
    return view(row);
  }

  private static Object keepOrClear(boolean provided, String value, Object existing) {
    if (!provided) return existing;
    String trimmed = value == null ? "" : value.strip();
    return trimmed.isEmpty() ? null : trimmed;
  }

  @Transactional
  public Map<String, Object> update(Actor actor, String id, Input input) {
    Map<String, Object> existing = findById(id);
    if (existing == null) throw AppException.notFound("Dossier d'urbanisme introuvable.");
    Object surface = input.surface() != null ? input.surface() : existing.get("surface");
    if (input.surface() != null && input.surface() < 0) throw AppException.validation("La surface du dossier d'urbanisme est invalide.");
    Object montant = input.montant() != null ? input.montant() : existing.get("montant");
    if (input.montant() != null && input.montant() < 0) throw AppException.validation("Le montant du dossier d'urbanisme est invalide.");
    Map<String, Object> row = db.one("""
        UPDATE "UrbanismeCase" SET "numero" = :numero, "type" = :type, "description" = :description, "surface" = :surface,
          "localisation" = :localisation, "nature" = :nature, "montant" = :montant, "statut" = :statut, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = :id RETURNING *
        """, Db.params("id", id, "numero", existing.get("numero"),
        "type", input.type() != null && !input.type().isEmpty() ? resolveType(input.type()).id() : existing.get("type"),
        "description", keepOrClear(input.descriptionProvided(), input.description(), existing.get("description")), "surface", surface,
        "localisation", keepOrClear(input.localisationProvided(), input.localisation(), existing.get("localisation")),
        "nature", keepOrClear(input.natureProvided(), input.nature(), existing.get("nature")), "montant", montant,
        "statut", input.statut() != null && !input.statut().isEmpty() ? normalizeStatus(input.statut()) : existing.get("statut")));
    for (String key : DISPLAY) row.put(key, existing.get(key));
    auditTrail.record(actor, "Mise à jour dossier urbanisme", "Urbanisme", "Dossier " + row.get("numero") + " mis à jour (" + row.get("statut") + ")",
        "REJETE".equals(row.get("statut")) ? "warning" : "success");
    return view(row);
  }

  @Transactional
  public void delete(Actor actor, String id) {
    Map<String, Object> existing = findById(id);
    if (existing == null) throw AppException.notFound("Dossier d'urbanisme introuvable.");
    db.update("DELETE FROM \"UrbanismeCase\" WHERE \"id\" = :id", Db.params("id", id));
    auditTrail.record(actor, "Suppression dossier urbanisme", "Urbanisme",
        "Suppression du dossier " + existing.get("numero") + " (" + existing.get("type") + ")", "warning");
  }

  public Map<String, Object> stats(int year) {
    List<Map<String, Object>> rows = db.list("SELECT \"montant\", \"statut\" FROM \"UrbanismeCase\" WHERE \"year\" = :year", Db.params("year", year));
    long enAttente = rows.stream().filter(r -> "EN_ATTENTE".equals(r.get("statut"))).count();
    long valide = rows.stream().filter(r -> "VALIDE".equals(r.get("statut"))).count();
    long rejete = rows.stream().filter(r -> "REJETE".equals(r.get("statut"))).count();
    double total = 0;
    for (Map<String, Object> row : rows) total += Db.num(row, "montant");
    return Api.map("total", rows.size(), "enAttente", enAttente, "valide", valide, "rejete", rejete, "montantTotal", total,
        "totalDossiers", rows.size(), "dossiersEnAttente", enAttente, "dossiersValides", valide, "dossiersRejetes", rejete, "recettes", total);
  }

  private static void putIfPresent(Map<String, Object> target, String key, Object value) {
    if (value != null && !value.toString().isEmpty()) target.put(key, value);
  }

  private static Map<String, Object> view(Map<String, Object> row) {
    Map<String, Object> view = new LinkedHashMap<>();
    view.put("id", row.get("id"));
    view.put("numero", row.get("numero"));
    view.put("contribuableId", row.get("contribuableId"));
    view.put("type", row.get("type"));
    putIfPresent(view, "description", row.get("description"));
    if (row.get("surface") != null) view.put("surface", Db.num(row, "surface"));
    putIfPresent(view, "localisation", row.get("localisation"));
    putIfPresent(view, "nature", row.get("nature"));
    view.put("montant", Db.num(row, "montant"));
    String agentPrenom = Db.str(row, "agentPrenom");
    String agentNom = Db.str(row, "agentNom");
    view.put("agent", agentPrenom != null && !agentPrenom.isEmpty() && agentNom != null && !agentNom.isEmpty() ? (agentPrenom + " " + agentNom).strip() : "Agent Urbanisme");
    view.put("statut", row.get("statut"));
    String created = JacksonConfig.iso(Db.date(row, "createdAt"));
    view.put("date", created);
    view.put("createdAt", created);
    view.put("updatedAt", JacksonConfig.iso(Db.date(row, "updatedAt")));
    view.put("contribuable", Api.map("id", row.get("contribuableId"), "nom", row.get("contribuableNom"), "prenom", row.get("contribuablePrenom"),
        "nin", row.get("contribuableNin"), "telephone", row.get("contribuableTelephone"), "adresse", row.get("contribuableAdresse")));
    return view;
  }
}
