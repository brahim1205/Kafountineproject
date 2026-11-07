package sn.kafountine.gestionmunicipale.shared.web;

import jakarta.servlet.http.HttpServletRequest;
import java.lang.management.ManagementFactory;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.shared.config.Env;
import sn.kafountine.gestionmunicipale.shared.config.JacksonConfig;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;
import sn.kafountine.gestionmunicipale.shared.persistence.Kv;

/** Santé, disponibilité et métriques, identiques à app.ts côté Node. */
@RestController
public class SystemController {
  private final Db db;
  private final Kv kv;

  public SystemController(Db db, Kv kv) {
    this.db = db;
    this.kv = kv;
  }

  @GetMapping("/health")
  public Map<String, Object> health() {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("status", "OK");
    body.put("timestamp", JacksonConfig.iso(Instant.now()));
    body.put("service", "kafountine-backend");
    return body;
  }

  @GetMapping("/ready")
  public ResponseEntity<Map<String, Object>> ready() {
    boolean database;
    try {
      db.list("SELECT 1");
      database = true;
    } catch (RuntimeException e) {
      database = false;
    }
    boolean redis = kv.ping();
    Map<String, Object> checks = new LinkedHashMap<>();
    checks.put("database", database);
    checks.put("redis", redis);
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("status", database && redis ? "ready" : "not ready");
    body.put("checks", checks);
    return ResponseEntity.status(database && redis ? 200 : 503).body(body);
  }

  @GetMapping("/metrics")
  public ResponseEntity<?> metrics(HttpServletRequest request) {
    if (!Env.ENABLE_METRICS) {
      Map<String, Object> body = new LinkedHashMap<>();
      body.put("success", false);
      body.put("message", "Route non trouvée");
      return ResponseEntity.status(404).body(body);
    }
    if (Env.IS_PRODUCTION && !Env.METRICS_BEARER_TOKEN.isBlank()) {
      String header = request.getHeader("authorization");
      String provided = header != null && header.startsWith("Bearer ") ? header.substring(7) : "";
      if (!MessageDigest.isEqual(provided.getBytes(StandardCharsets.UTF_8), Env.METRICS_BEARER_TOKEN.getBytes(StandardCharsets.UTF_8))) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", false);
        body.put("message", "Token métriques requis");
        return ResponseEntity.status(401).body(body);
      }
    }
    Runtime runtime = Runtime.getRuntime();
    double uptime = ManagementFactory.getRuntimeMXBean().getUptime() / 1000.0;
    long used = runtime.totalMemory() - runtime.freeMemory();
    String payload = String.join("\n",
        "# HELP kafontine_backend_up Backend process health status.",
        "# TYPE kafontine_backend_up gauge",
        "kafontine_backend_up 1",
        "# HELP kafontine_backend_uptime_seconds Backend uptime in seconds.",
        "# TYPE kafontine_backend_uptime_seconds counter",
        "kafontine_backend_uptime_seconds " + String.format(java.util.Locale.ROOT, "%.3f", uptime),
        "# HELP kafontine_backend_memory_rss_bytes Resident memory usage in bytes.",
        "# TYPE kafontine_backend_memory_rss_bytes gauge",
        "kafontine_backend_memory_rss_bytes " + runtime.totalMemory(),
        "# HELP kafontine_backend_heap_used_bytes Heap used in bytes.",
        "# TYPE kafontine_backend_heap_used_bytes gauge",
        "kafontine_backend_heap_used_bytes " + used) + "\n";
    return ResponseEntity.ok().contentType(MediaType.TEXT_PLAIN).body(payload);
  }
}
