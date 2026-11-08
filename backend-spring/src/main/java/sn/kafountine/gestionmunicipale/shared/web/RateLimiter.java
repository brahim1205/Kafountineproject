package sn.kafountine.gestionmunicipale.shared.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import org.springframework.stereotype.Component;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Cookies;
import sn.kafountine.gestionmunicipale.shared.persistence.Kv;
import sn.kafountine.gestionmunicipale.shared.security.JwtTokenService;

/** Limitation de débit identique à rateLimit.ts / rateLimitKeys.ts (mêmes clés Redis, même fenêtre fixe). */
@Component
public class RateLimiter {
  public enum KeyKind { IP, USER_OR_IP, LOGIN_ATTEMPT }

  private final Kv kv;
  private final JwtTokenService tokens;

  public RateLimiter(Kv kv, JwtTokenService tokens) {
    this.kv = kv;
    this.tokens = tokens;
  }

  public void check(HttpServletRequest request, HttpServletResponse response, String prefix, long windowMs, long max, KeyKind kind, String loginEmail) {
    String key = prefix + ":" + key(request, kind, loginEmail);
    long count = kv.incrementInWindow(key, windowMs);
    if (count > max) {
      long ttl = kv.ttlMs(key);
      response.setHeader("Retry-After", Long.toString(Math.max(1, (long) Math.ceil(ttl / 1000.0))));
      throw new AppException(429, "Trop de tentatives, veuillez réessayer plus tard");
    }
  }

  private String key(HttpServletRequest request, KeyKind kind, String loginEmail) {
    String ip = RequestContext.clientIp(request);
    return switch (kind) {
      case IP -> ip;
      case LOGIN_ATTEMPT -> ip + ":" + (loginEmail == null ? "" : loginEmail.trim().toLowerCase());
      case USER_OR_IP -> userOrIp(request, ip);
    };
  }

  /** Compteur par utilisateur connecté (jeton vérifié), sinon par IP. */
  private String userOrIp(HttpServletRequest request, String ip) {
    String token = Cookies.accessToken(request);
    if (token != null) {
      try {
        Map<String, Object> payload = tokens.verifyAccessToken(token);
        return "user:" + payload.get("userId");
      } catch (AppException ignored) {
        // jeton invalide : compteur par IP
      }
    }
    return "ip:" + ip;
  }
}
