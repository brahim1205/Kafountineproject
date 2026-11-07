package sn.kafountine.gestionmunicipale.shared.config;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * Configuration de l'application, lue à partir des mêmes variables d'environnement que le backend Node
 * (backend/src/shared/config/env.ts), avec les mêmes valeurs par défaut.
 */
public final class Env {
  private Env() {}

  private static String get(String name, String fallback) {
    String value = System.getenv(name);
    return value == null || value.isBlank() ? fallback : value;
  }

  private static String require(String name) {
    String value = System.getenv(name);
    if (value == null || value.isBlank()) {
      throw new IllegalStateException("Variable d'environnement manquante: " + name);
    }
    return value;
  }

  private static long number(String name, long fallback) {
    String value = System.getenv(name);
    if (value == null || value.isBlank()) return fallback;
    try {
      return Long.parseLong(value.trim());
    } catch (NumberFormatException e) {
      return fallback;
    }
  }

  public static final String NODE_ENV = get("NODE_ENV", "development");
  public static final boolean IS_PRODUCTION = "production".equals(NODE_ENV);
  public static final String DATABASE_URL = require("DATABASE_URL");
  public static final int DB_POOL_SIZE = (int) number("DB_POOL_SIZE", 10);
  public static final String JWT_SECRET = require("JWT_SECRET");
  public static final String JWT_REFRESH_SECRET = require("JWT_REFRESH_SECRET");
  public static final String JWT_EXPIRES_IN = get("JWT_EXPIRES_IN", "15m");
  public static final String JWT_REFRESH_EXPIRES_IN = get("JWT_REFRESH_EXPIRES_IN", "7d");
  public static final long API_RATE_LIMIT_WINDOW_MS = number("API_RATE_LIMIT_WINDOW_MS", 60_000);
  public static final long API_RATE_LIMIT_MAX = number("API_RATE_LIMIT_MAX", 300);
  public static final long LOGIN_RATE_LIMIT_WINDOW_MS = number("LOGIN_RATE_LIMIT_WINDOW_MS", 900_000);
  public static final long LOGIN_RATE_LIMIT_MAX = number("LOGIN_RATE_LIMIT_MAX", 5);
  public static final long MAX_UPLOAD_FILE_SIZE_BYTES = number("MAX_UPLOAD_FILE_SIZE_BYTES", 5L * 1024 * 1024);
  public static final String TRUST_PROXY = get("TRUST_PROXY", IS_PRODUCTION ? "loopback, linklocal, uniquelocal" : "false").trim();
  public static final String COOKIE_DOMAIN = get("COOKIE_DOMAIN", "").trim();
  public static final String COOKIE_SAME_SITE = get("COOKIE_SAME_SITE", "lax").trim().toLowerCase(Locale.ROOT);
  public static final List<String> CORS_ORIGIN = Arrays.stream(get("CORS_ORIGIN", "http://localhost:5173").split(","))
      .map(String::trim)
      .filter(value -> !value.isEmpty())
      .toList();
  public static final String REDIS_URL = get("REDIS_URL", "");
  public static final String PORTAL_URL = get("PORTAL_URL", "http://localhost:5173");
  public static final long PORTAL_OTP_TTL_SECONDS = number("PORTAL_OTP_TTL_SECONDS", 600);
  public static final String PORTAL_OTP_DELIVERY_MODE = get("PORTAL_OTP_DELIVERY_MODE", "dev").trim().toLowerCase(Locale.ROOT);
  public static final String PORTAL_OTP_WEBHOOK_URL = get("PORTAL_OTP_WEBHOOK_URL", "").trim();
  public static final String PORTAL_OTP_WEBHOOK_TOKEN = get("PORTAL_OTP_WEBHOOK_TOKEN", "").trim();
  /** Paiement en ligne du portail : simulé, jamais activé en production (même règle que Node). */
  public static final boolean PORTAL_ONLINE_PAYMENTS = !IS_PRODUCTION && !"false".equals(System.getenv("PORTAL_ONLINE_PAYMENTS"));
  public static final String METRICS_BEARER_TOKEN = get("METRICS_BEARER_TOKEN", "").trim();
  public static final boolean ENABLE_API_DOCS = "true".equals(System.getenv("ENABLE_API_DOCS")) || !IS_PRODUCTION;
  public static final boolean ENABLE_METRICS = "true".equals(System.getenv("ENABLE_METRICS")) || !IS_PRODUCTION;
  public static final long CACHE_TTL_SECONDS = number("CACHE_TTL_SECONDS", 300);
  public static final boolean CACHE_ENABLED = !"false".equals(System.getenv("CACHE_ENABLED"));
  public static final String CLOUDINARY_URL = get("CLOUDINARY_URL", "");

  /** Mêmes garde-fous de production que le backend Node. */
  public static void validate() {
    if (!IS_PRODUCTION) return;
    if (JWT_SECRET.length() < 32 || JWT_REFRESH_SECRET.length() < 32) {
      throw new IllegalStateException("JWT_SECRET et JWT_REFRESH_SECRET doivent contenir au moins 32 caractères en production.");
    }
    if (JWT_SECRET.equals(JWT_REFRESH_SECRET)) {
      throw new IllegalStateException("JWT_SECRET et JWT_REFRESH_SECRET doivent être différents en production.");
    }
    if (!List.of("lax", "strict", "none").contains(COOKIE_SAME_SITE)) {
      throw new IllegalStateException("COOKIE_SAME_SITE doit valoir lax, strict ou none.");
    }
    if (CORS_ORIGIN.isEmpty() || CORS_ORIGIN.contains("*")) {
      throw new IllegalStateException("CORS_ORIGIN doit lister des origines explicites en production.");
    }
    if (PORTAL_OTP_DELIVERY_MODE.equals("webhook") && !PORTAL_OTP_WEBHOOK_URL.startsWith("https://")) {
      throw new IllegalStateException("PORTAL_OTP_DELIVERY_MODE=webhook et PORTAL_OTP_WEBHOOK_URL HTTPS sont requis en production.");
    }
  }

  /** « 15m », « 7d »… en secondes (même règle que parseExpiresIn côté Node). */
  public static long durationSeconds(String value, long fallbackSeconds) {
    java.util.regex.Matcher m = java.util.regex.Pattern.compile("^(\\d+)([smhd])$", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(value.trim());
    if (!m.matches()) return fallbackSeconds;
    long amount = Long.parseLong(m.group(1));
    return switch (m.group(2).toLowerCase(Locale.ROOT)) {
      case "s" -> amount;
      case "m" -> amount * 60;
      case "h" -> amount * 3600;
      default -> amount * 86400;
    };
  }
}
