package sn.kafountine.gestionmunicipale.controller;

import java.sql.Connection;
import java.util.Map;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
  private final DataSource dataSource;
  private final StringRedisTemplate redis;
  private final String serviceName;

  public HealthController(DataSource dataSource, StringRedisTemplate redis, @Value("${app.service-name}") String serviceName) {
    this.dataSource = dataSource;
    this.redis = redis;
    this.serviceName = serviceName;
  }

  @GetMapping("/health")
  Map<String, Object> health() {
    return Map.of("status", "OK", "timestamp", java.time.Instant.now().toString(), "service", serviceName);
  }

  @GetMapping("/ready")
  ResponseEntity<Map<String, Object>> ready() {
    boolean database = false;
    boolean redisReady = false;
    try (Connection ignored = dataSource.getConnection()) {
      database = true;
    } catch (Exception ignored) {
      database = false;
    }
    try {
      redisReady = Boolean.TRUE.equals(redis.getConnectionFactory().getConnection().ping() != null);
    } catch (Exception ignored) {
      redisReady = false;
    }
    boolean ready = database && redisReady;
    return ResponseEntity.status(ready ? 200 : 503).body(Map.of("status", ready ? "ready" : "not ready", "checks", Map.of("database", database, "redis", redisReady)));
  }
}
