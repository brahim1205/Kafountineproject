package sn.kafountine.gestionmunicipale.shared.persistence;

import java.net.URI;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import sn.kafountine.gestionmunicipale.shared.config.Env;

/**
 * Stockage clé-valeur partagé avec le backend Node : Redis (REDIS_URL), même clés (sessions, compteurs de
 * limitation, codes OTP…). Sans Redis, repli en mémoire, comme le backend Node.
 */
@Component
public class Kv {
  private record Entry(String value, long expiresAt) {
    boolean expired() {
      return expiresAt > 0 && expiresAt <= System.currentTimeMillis();
    }
  }

  private final StringRedisTemplate redis;
  private final Map<String, Entry> memory = new ConcurrentHashMap<>();

  public Kv() {
    this.redis = Env.REDIS_URL.isBlank() ? null : createTemplate(Env.REDIS_URL);
  }

  private static StringRedisTemplate createTemplate(String url) {
    URI uri = URI.create(url);
    RedisStandaloneConfiguration config = new RedisStandaloneConfiguration(uri.getHost(), uri.getPort() > 0 ? uri.getPort() : 6379);
    if (uri.getUserInfo() != null) {
      String[] parts = uri.getUserInfo().split(":", 2);
      if (parts.length == 2) {
        if (!parts[0].isEmpty()) config.setUsername(parts[0]);
        config.setPassword(parts[1]);
      } else {
        config.setPassword(parts[0]);
      }
    }
    String path = uri.getPath();
    if (path != null && path.length() > 1) config.setDatabase(Integer.parseInt(path.substring(1)));
    LettuceClientConfiguration client = LettuceClientConfiguration.builder()
        .commandTimeout(Duration.ofSeconds(5))
        .useSsl()
        .disablePeerVerification()
        .build();
    LettuceConnectionFactory factory = "rediss".equals(uri.getScheme())
        ? new LettuceConnectionFactory(config, client)
        : new LettuceConnectionFactory(config, LettuceClientConfiguration.builder().commandTimeout(Duration.ofSeconds(5)).build());
    factory.afterPropertiesSet();
    StringRedisTemplate template = new StringRedisTemplate(factory);
    template.afterPropertiesSet();
    return template;
  }

  public boolean usesRedis() {
    return redis != null;
  }

  public boolean ping() {
    if (redis == null) return false;
    try {
      String pong = redis.execute((org.springframework.data.redis.core.RedisCallback<String>) connection -> connection.ping());
      return "PONG".equalsIgnoreCase(pong);
    } catch (RuntimeException e) {
      return false;
    }
  }

  public String get(String key) {
    if (redis != null) return redis.opsForValue().get(key);
    Entry entry = memory.get(key);
    if (entry == null) return null;
    if (entry.expired()) {
      memory.remove(key);
      return null;
    }
    return entry.value();
  }

  public void set(String key, String value, long ttlSeconds) {
    if (redis != null) {
      redis.opsForValue().set(key, value, Duration.ofSeconds(Math.max(1, ttlSeconds)));
      return;
    }
    memory.put(key, new Entry(value, System.currentTimeMillis() + ttlSeconds * 1000));
  }

  public void delete(String key) {
    if (redis != null) {
      redis.delete(key);
      return;
    }
    memory.remove(key);
  }

  /** INCR + expiration posée au premier incrément (fenêtre fixe), comme rateLimit côté Node. */
  public long incrementInWindow(String key, long windowMs) {
    if (redis != null) {
      Long count = redis.opsForValue().increment(key);
      if (count != null && count == 1) redis.expire(key, windowMs, TimeUnit.MILLISECONDS);
      return count == null ? 1 : count;
    }
    synchronized (memory) {
      Entry entry = memory.get(key);
      if (entry == null || entry.expired()) {
        memory.put(key, new Entry("1", System.currentTimeMillis() + windowMs));
        return 1;
      }
      long count = Long.parseLong(entry.value()) + 1;
      memory.put(key, new Entry(Long.toString(count), entry.expiresAt()));
      return count;
    }
  }

  /** Temps restant en millisecondes (≤ 0 si la clé n'expire pas ou n'existe pas). */
  public long ttlMs(String key) {
    if (redis != null) {
      Long ttl = redis.getExpire(key, TimeUnit.MILLISECONDS);
      return ttl == null ? 0 : ttl;
    }
    Entry entry = memory.get(key);
    return entry == null ? 0 : entry.expiresAt() - System.currentTimeMillis();
  }
}
