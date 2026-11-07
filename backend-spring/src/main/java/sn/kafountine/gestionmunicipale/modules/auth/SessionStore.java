package sn.kafountine.gestionmunicipale.modules.auth;

import org.springframework.stereotype.Component;
import sn.kafountine.gestionmunicipale.shared.persistence.Kv;

/** Sessions de connexion dans Redis, mêmes clés que RedisAuthSessionStore côté Node. */
@Component
public class SessionStore {
  private final Kv kv;

  public SessionStore(Kv kv) {
    this.kv = kv;
  }

  private static String key(String userId, String sessionId) {
    return "auth:session:" + userId + ":" + sessionId;
  }

  public void save(String userId, String sessionId, String refreshToken, long ttlSeconds) {
    kv.set(key(userId, sessionId), refreshToken, ttlSeconds);
  }

  public String find(String userId, String sessionId) {
    return kv.get(key(userId, sessionId));
  }

  public void delete(String userId, String sessionId) {
    kv.delete(key(userId, sessionId));
  }
}
