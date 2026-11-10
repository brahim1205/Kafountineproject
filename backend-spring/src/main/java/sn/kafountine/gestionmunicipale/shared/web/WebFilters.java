package sn.kafountine.gestionmunicipale.shared.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.OncePerRequestFilter;
import sn.kafountine.gestionmunicipale.shared.config.Env;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.errors.ErrorHandling;
import sn.kafountine.gestionmunicipale.shared.http.Cookies;
import sn.kafountine.gestionmunicipale.shared.security.AuthUser;

/**
 * Filtres transverses, dans l'ordre d'app.ts côté Node : en-têtes de sécurité (helmet), CORS, journal
 * d'accès et identifiant de requête, protection CSRF par origine, limitation de débit globale sur /api.
 */
@Configuration
public class WebFilters {
  private static final ObjectMapper JSON = new ObjectMapper();
  private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS");
  private static final Pattern REQUEST_ID_FORMAT = Pattern.compile("^[A-Za-z0-9._-]{1,128}$");

  private static String normalizeOrigin(String value) {
    try {
      URI uri = URI.create(value);
      if (uri.getScheme() == null || uri.getHost() == null) return value.replaceAll("/+$", "");
      return uri.getScheme() + "://" + uri.getHost() + (uri.getPort() > 0 ? ":" + uri.getPort() : "");
    } catch (IllegalArgumentException e) {
      return value.replaceAll("/+$", "");
    }
  }

  private static final Set<String> ALLOWED_ORIGINS = Env.CORS_ORIGIN.stream()
      .filter(value -> value != null && !value.isBlank())
      .map(WebFilters::normalizeOrigin)
      .collect(Collectors.toSet());

  /** En-têtes de sécurité (équivalent de helmet) et CORS avec cookies pour les origines autorisées. */
  @Bean
  public FilterRegistrationBean<OncePerRequestFilter> securityHeadersFilter() {
    OncePerRequestFilter filter = new OncePerRequestFilter() {
      @Override
      protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "SAMEORIGIN");
        response.setHeader("X-DNS-Prefetch-Control", "off");
        response.setHeader("X-Download-Options", "noopen");
        response.setHeader("X-Permitted-Cross-Domain-Policies", "none");
        response.setHeader("X-XSS-Protection", "0");
        response.setHeader("Referrer-Policy", "no-referrer");
        response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        response.setHeader("Cross-Origin-Resource-Policy", "same-site");
        response.setHeader("Origin-Agent-Cluster", "?1");
        response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        response.setHeader("Content-Security-Policy",
            "default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests");
        String origin = request.getHeader("origin");
        if (origin != null && Env.CORS_ORIGIN.contains(origin)) {
          response.setHeader("Access-Control-Allow-Origin", origin);
          response.setHeader("Access-Control-Allow-Credentials", "true");
          response.setHeader("Vary", "Origin");
          if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            response.setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
            String requested = request.getHeader("access-control-request-headers");
            if (requested != null) response.setHeader("Access-Control-Allow-Headers", requested);
            response.setStatus(204);
            response.setHeader("Content-Length", "0");
            return;
          }
        }
        chain.doFilter(request, response);
      }
    };
    FilterRegistrationBean<OncePerRequestFilter> registration = new FilterRegistrationBean<>(filter);
    registration.setOrder(1);
    return registration;
  }

  /** Identifiant de requête (x-request-id) et journal d'accès JSON, comme requestLogger.ts. */
  @Bean
  public FilterRegistrationBean<OncePerRequestFilter> requestLogFilter() {
    OncePerRequestFilter filter = new OncePerRequestFilter() {
      @Override
      protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        long startedAt = System.currentTimeMillis();
        String header = request.getHeader("x-request-id");
        String requestId = header != null && REQUEST_ID_FORMAT.matcher(header).matches() ? header : UUID.randomUUID().toString();
        request.setAttribute(RequestContext.REQUEST_ID, requestId);
        response.setHeader("x-request-id", requestId);
        try {
          chain.doFilter(request, response);
        } finally {
          AuthUser user = RequestContext.user(request);
          Map<String, Object> log = new LinkedHashMap<>();
          log.put("type", "access");
          log.put("requestId", requestId);
          log.put("method", request.getMethod());
          log.put("path", request.getRequestURI() + (request.getQueryString() == null ? "" : "?" + redactQuery(request.getQueryString())));
          log.put("statusCode", response.getStatus());
          log.put("durationMs", System.currentTimeMillis() - startedAt);
          log.put("ip", RequestContext.clientIp(request));
          log.put("userId", user == null ? null : user.userId());
          log.put("role", user == null ? null : user.role());
          log.put("referer", request.getHeader("referer"));
          log.put("userAgent", request.getHeader("user-agent"));
          System.out.println(JSON.writeValueAsString(log));
        }
      }
    };
    FilterRegistrationBean<OncePerRequestFilter> registration = new FilterRegistrationBean<>(filter);
    registration.setOrder(2);
    return registration;
  }

  /** Masque les valeurs sensibles des paramètres (jetons, codes, mots de passe), comme logging/redaction.ts. */
  static String redactQuery(String query) {
    return query.replaceAll("(?i)((?:token|code|otp|password|secret|refreshToken)=)[^&]*", "$1[REDACTED]");
  }

  /** Protection CSRF par origine, identique à csrfProtection.ts. */
  @Bean
  public FilterRegistrationBean<OncePerRequestFilter> csrfFilter() {
    OncePerRequestFilter filter = new OncePerRequestFilter() {
      @Override
      protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        if (!SAFE_METHODS.contains(request.getMethod().toUpperCase())) {
          String authorization = request.getHeader("authorization");
          boolean bearer = authorization != null && authorization.startsWith("Bearer ");
          boolean hasSessionCookie = Cookies.read(request, Cookies.AUTH_TOKEN) != null
              || Cookies.read(request, Cookies.REFRESH_TOKEN) != null;
          if (!bearer && hasSessionCookie) {
            String origin = request.getHeader("origin");
            String referer = request.getHeader("referer");
            String requestOrigin = origin != null ? normalizeOrigin(origin) : referer != null ? normalizeOrigin(referer) : null;
            if (requestOrigin == null || !ALLOWED_ORIGINS.contains(requestOrigin)) {
              ErrorHandling.write(response, request, AppException.forbidden("Origine de requête non autorisée"));
              return;
            }
          }
        }
        chain.doFilter(request, response);
      }
    };
    FilterRegistrationBean<OncePerRequestFilter> registration = new FilterRegistrationBean<>(filter);
    registration.setOrder(4);
    return registration;
  }

  /** Limitation globale de /api, par utilisateur connecté sinon par IP (app.ts). */
  @Bean
  public FilterRegistrationBean<OncePerRequestFilter> apiRateLimitFilter(RateLimiter rateLimiter) {
    OncePerRequestFilter filter = new OncePerRequestFilter() {
      @Override
      protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        try {
          rateLimiter.check(request, response, "api-global", Env.API_RATE_LIMIT_WINDOW_MS, Env.API_RATE_LIMIT_MAX, RateLimiter.KeyKind.USER_OR_IP, null);
        } catch (AppException error) {
          ErrorHandling.write(response, request, error);
          return;
        }
        chain.doFilter(request, response);
      }
    };
    FilterRegistrationBean<OncePerRequestFilter> registration = new FilterRegistrationBean<>(filter);
    registration.addUrlPatterns("/api/*");
    registration.setOrder(5);
    return registration;
  }
}
