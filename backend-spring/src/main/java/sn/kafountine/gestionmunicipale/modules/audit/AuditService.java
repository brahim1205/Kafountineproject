package sn.kafountine.gestionmunicipale.modules.audit;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.stereotype.Service;
import sn.kafountine.gestionmunicipale.shared.audit.Actor;
import sn.kafountine.gestionmunicipale.shared.audit.AuditTrail;
import sn.kafountine.gestionmunicipale.shared.config.JacksonConfig;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;

/** Journal d'audit (AuditService et PrismaAuditLogRepository côté Node). */
@Service
public class AuditService {
  private static final String FILTER = """
       WHERE "year" = :year
        AND (CAST(:module AS text) IS NULL OR "module" = :module)
        AND (CAST(:status AS text) IS NULL OR "status" = :status)
        AND (CAST(:search AS text) IS NULL OR ("userName" || ' ' || "action" || ' ' || "details") ILIKE :search ESCAPE '\\')
      """;
  /** toLocaleDateString / toLocaleTimeString('fr-FR') sur l'heure du serveur. */
  static final DateTimeFormatter DATE_FR = DateTimeFormatter.ofPattern("dd/MM/yyyy").withZone(ZoneId.systemDefault());
  static final DateTimeFormatter TIME_FR = DateTimeFormatter.ofPattern("HH:mm").withZone(ZoneId.systemDefault());

  private final Db db;
  private final AuditTrail auditTrail;

  public AuditService(Db db, AuditTrail auditTrail) {
    this.db = db;
    this.auditTrail = auditTrail;
  }

  /** Motif ILIKE « contient », en neutralisant les jokers saisis. */
  private static String contains(String text) {
    return "%" + text.replaceAll("([\\\\%_])", "\\\\$1") + "%";
  }

  public Map<String, Object> list(int page, int limit, int year, String search, String module, String status) {
    MapSqlParameterSource params = Db.params("year", year, "module", module.isEmpty() || module.equals("all") ? null : module,
        "status", status.isEmpty() || status.equals("all") ? null : status, "search", search.isEmpty() ? null : contains(search));
    params.addValue("offset", (long) (page - 1) * limit).addValue("limit", limit);
    List<Map<String, Object>> logs = new ArrayList<>();
    for (Map<String, Object> row : db.list("SELECT * FROM \"AuditLog\"" + FILTER + " ORDER BY \"timestamp\" DESC, \"id\" DESC OFFSET :offset LIMIT :limit", params)) {
      logs.add(view(row));
    }
    Map<String, Object> counts = db.one("""
        SELECT COUNT(*)::int AS "total", COUNT(*) FILTER (WHERE "status" = 'success')::int AS "success",
               COUNT(*) FILTER (WHERE "status" = 'warning')::int AS "warning", COUNT(*) FILTER (WHERE "status" = 'error')::int AS "error"
        FROM "AuditLog"
        """ + FILTER, params);
    long total = (long) Db.num(counts, "total");
    return Api.map("logs", logs,
        "stats", Api.map("total", total, "success", (long) Db.num(counts, "success"), "warning", (long) Db.num(counts, "warning"), "error", (long) Db.num(counts, "error")),
        "pagination", Api.map("page", page, "limit", limit, "total", total, "totalPages", Math.max(1, (long) Math.ceil((double) total / limit))));
  }

  public void seed(Actor actor) {
    auditTrail.record(actor, "Initialisation audit", "Audit", "Création d’une entrée de démonstration audit");
  }

  public String exportCsv(int year) {
    StringBuilder body = new StringBuilder("date,heure,utilisateur,role,action,module,details,statut,ip\n");
    List<String> lines = new ArrayList<>();
    for (Map<String, Object> log : db.list("SELECT * FROM \"AuditLog\" WHERE \"year\" = :year ORDER BY \"timestamp\" DESC, \"id\" DESC", Db.params("year", year))) {
      Instant at = Db.date(log, "timestamp");
      List<Object> fields = List.of(DATE_FR.format(at), TIME_FR.format(at), str(log.get("userName")), str(log.get("role")), str(log.get("action")),
          str(log.get("module")), str(log.get("details")), str(log.get("status")), log.get("ipAddress") == null ? "" : log.get("ipAddress"));
      List<String> cells = new ArrayList<>();
      for (Object field : fields) cells.add("\"" + field.toString().replace("\"", "\"\"") + "\"");
      lines.add(String.join(",", cells));
    }
    return body.append(String.join("\n", lines)).append('\n').toString();
  }

  /** String(valeur) en JavaScript : null devient « null ». */
  private static String str(Object value) {
    return value == null ? "null" : value.toString();
  }

  private static Map<String, Object> view(Map<String, Object> row) {
    Instant at = Db.date(row, "timestamp");
    Map<String, Object> view = new LinkedHashMap<>();
    view.put("id", row.get("id"));
    view.put("date", DATE_FR.format(at));
    view.put("time", TIME_FR.format(at));
    view.put("timestamp", JacksonConfig.iso(at));
    view.put("user", row.get("userName"));
    view.put("role", row.get("role"));
    view.put("action", row.get("action"));
    view.put("module", row.get("module"));
    view.put("details", row.get("details"));
    view.put("ipAddress", row.get("ipAddress"));
    view.put("status", row.get("status"));
    return view;
  }
}
