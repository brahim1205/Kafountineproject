package sn.kafountine.gestionmunicipale.shared.http;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import org.springframework.http.ResponseCookie;
import sn.kafountine.gestionmunicipale.shared.config.Env;

/** Cookies de session identiques à shared/http/cookies.ts (mêmes noms, mêmes attributs). */
public final class Cookies {
  public static final String AUTH_TOKEN = "auth_token";
  public static final String REFRESH_TOKEN = "refresh_token";
  public static final String PORTAL_TOKEN = "portal_token";

  private Cookies() {}

  private static String sameSite() {
    return switch (Env.COOKIE_SAME_SITE) {
      case "strict" -> "Strict";
      case "none" -> "None";
      default -> "Lax";
    };
  }

  private static ResponseCookie build(String name, String value, long maxAgeSeconds) {
    ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(name, value)
        .httpOnly(true)
        .secure(Env.IS_PRODUCTION)
        .sameSite(sameSite())
        .path("/")
        .maxAge(maxAgeSeconds);
    if (!Env.COOKIE_DOMAIN.isBlank()) builder.domain(Env.COOKIE_DOMAIN);
    return builder.build();
  }

  private static void add(HttpServletResponse response, ResponseCookie cookie) {
    String header = cookie.toString();
    if (Env.IS_PRODUCTION) header += "; Priority=High";
    response.addHeader("Set-Cookie", header);
  }

  public static void setAuthCookies(HttpServletResponse response, String accessToken, String refreshToken) {
    add(response, build(AUTH_TOKEN, accessToken, Env.durationSeconds(Env.JWT_EXPIRES_IN, 900)));
    add(response, build(REFRESH_TOKEN, refreshToken, Env.durationSeconds(Env.JWT_REFRESH_EXPIRES_IN, 7L * 24 * 3600)));
  }

  public static void clearAuthCookies(HttpServletResponse response) {
    add(response, build(AUTH_TOKEN, "", 0));
    add(response, build(REFRESH_TOKEN, "", 0));
  }

  public static void setPortalCookie(HttpServletResponse response, String token) {
    add(response, build(PORTAL_TOKEN, token, 7L * 24 * 3600));
  }

  public static void clearPortalCookie(HttpServletResponse response) {
    add(response, build(PORTAL_TOKEN, "", 0));
  }

  public static String read(HttpServletRequest request, String name) {
    Cookie[] cookies = request.getCookies();
    if (cookies == null) return null;
    for (Cookie cookie : cookies) {
      if (cookie.getName().equals(name) && cookie.getValue() != null && !cookie.getValue().isEmpty()) {
        return URLDecoder.decode(cookie.getValue(), StandardCharsets.UTF_8);
      }
    }
    return null;
  }

  /** Jeton d'accès : en-tête Authorization « Bearer … », sinon cookie auth_token (comme authenticate.ts). */
  public static String accessToken(HttpServletRequest request) {
    String authorization = request.getHeader("authorization");
    if (authorization != null && authorization.startsWith("Bearer ")) return authorization.substring(7);
    return read(request, AUTH_TOKEN);
  }
}
