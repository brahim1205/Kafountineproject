package sn.kafountine.gestionmunicipale.modules.auth;

import org.springframework.stereotype.Component;
import sn.kafountine.gestionmunicipale.shared.persistence.Kv;

/** Sessions de connexion dans Redis, mêmes clés que RedisAuthSessionStore côté Node. */
@Component
public class SessionStore {
  private static final String GENERATION = "auth:generation:";
  private static final String LOGGED_OUT = "auth:logged-out:";
  /** Plus longue que la durée de vie d'un jeton de renouvellement. */
  private static final long GENERATION_TTL_SECONDS = 90L * 24 * 3600;

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

  /** Génération courante des jetons du compte : un jeton d'une génération antérieure est refusé. */
  public long generation(String userId) {
    String value = kv.get(GENERATION + userId);
    return value == null ? 0 : Long.parseLong(value);
  }

  /** Invalide d'un coup toutes les sessions du compte. */
  public long revokeAll(String userId) {
    long next = generation(userId) + 1;
    kv.set(GENERATION + userId, Long.toString(next), GENERATION_TTL_SECONDS);
    return next;
  }

  /** Coupe immédiatement le jeton d'accès d'une session déconnectée, jusqu'à son expiration. */
  public void markLoggedOut(String sessionId, long accessTtlSeconds) {
    kv.set(LOGGED_OUT + sessionId, "1", accessTtlSeconds);
  }

  public boolean isLoggedOut(String sessionId) {
    return sessionId != null && kv.get(LOGGED_OUT + sessionId) != null;
  }
}
