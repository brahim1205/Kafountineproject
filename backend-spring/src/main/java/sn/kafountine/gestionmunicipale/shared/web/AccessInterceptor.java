package sn.kafountine.gestionmunicipale.shared.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Cookies;
import sn.kafountine.gestionmunicipale.shared.security.AuthUser;
import sn.kafountine.gestionmunicipale.shared.security.Authenticated;
import sn.kafountine.gestionmunicipale.shared.security.JwtTokenService;
import sn.kafountine.gestionmunicipale.shared.security.PortalAuthenticated;
import sn.kafountine.gestionmunicipale.shared.security.RateLimit;
import sn.kafountine.gestionmunicipale.shared.security.Roles;

/**
 * Contrôles d'accès par route, dans l'ordre des routes Node : authenticate (dont la règle de consultation
 * seule de l'administrateur), authorize (rôles), puis limitation propre à la route.
 */
@Configuration
public class AccessInterceptor implements HandlerInterceptor, WebMvcConfigurer {
  /** Rôles en consultation seule : aucune écriture (readOnlyRoles.ts). */
  public static final Set<String> READ_ONLY_ROLES = Set.of("ADMIN");
  private static final Set<String> READ_METHODS = Set.of("GET", "HEAD", "OPTIONS");
  /** Écritures permises en consultation seule : elles ne modifient aucune donnée de la commune. */
  private static final List<Pattern> ALLOWED_WRITES = List.of(
      Pattern.compile("^/auth/(logout|change-password)$"),
      Pattern.compile("^/notifications/(read-all|[^/]+/read)$"),
      Pattern.compile("^/exports/(report|receipt)\\.pdf$"),
      Pattern.compile("^/audit/export$"));

  private final JwtTokenService tokens;
  private final RateLimiter rateLimiter;

  public AccessInterceptor(JwtTokenService tokens, RateLimiter rateLimiter) {
    this.tokens = tokens;
    this.rateLimiter = rateLimiter;
  }

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(this);
  }

  @Override
  public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
    if (!(handler instanceof HandlerMethod method)) return true;
    Roles roles = method.getMethodAnnotation(Roles.class);
    boolean authenticated = roles != null || method.hasMethodAnnotation(Authenticated.class)
        || method.getBeanType().isAnnotationPresent(Authenticated.class);
    if (authenticated) authenticate(request);
    if (method.hasMethodAnnotation(PortalAuthenticated.class)) authenticatePortal(request);
    if (roles != null) authorize(request, roles.value());
    RateLimit limit = method.getMethodAnnotation(RateLimit.class);
    if (limit != null) rateLimiter.check(request, response, limit.prefix(), limit.windowMs(), limit.max(), limit.key(), null);
    return true;
  }

  /** authenticatePortal.ts : jeton portail en Bearer, sinon dans son cookie. */
  private void authenticatePortal(HttpServletRequest request) {
    String header = request.getHeader("authorization");
    String bearer = header != null && header.startsWith("Bearer ") && header.length() > 7 ? header.substring(7) : null;
    String token = bearer != null ? bearer : Cookies.read(request, Cookies.PORTAL_TOKEN);
    if (token == null || token.isEmpty()) throw AppException.unauthorized("Token requis");
    Map<String, Object> payload = tokens.verifyPortalToken(token);
    request.setAttribute(RequestContext.USER, new AuthUser(payload.get("id") == null ? null : payload.get("id").toString(), null, String.valueOf(payload.get("role")), "portal"));
  }

  /** authenticate.ts : jeton d'accès (Bearer ou cookie) vérifié, puis règle de consultation seule. */
  public void authenticate(HttpServletRequest request) {
    String token = Cookies.accessToken(request);
    if (token == null) throw AppException.unauthorized("Token requis");
    Map<String, Object> payload = tokens.verifyAccessToken(token);
    String role = payload.get("role") == null ? null : payload.get("role").toString();
    AuthUser user = new AuthUser(String.valueOf(payload.get("userId")),
        payload.get("sessionId") == null ? null : payload.get("sessionId").toString(), role, "access");
    request.setAttribute(RequestContext.USER, user);
    if (isWriteForbiddenForRole(role, request)) {
      throw AppException.forbidden("Compte en consultation seule : cette action est réservée au super administrateur ou aux services concernés.");
    }
  }

  private static void authorize(HttpServletRequest request, String[] allowed) {
    AuthUser user = RequestContext.user(request);
    if (user == null) throw AppException.unauthorized("Authentification requise");
    if (!Arrays.asList(allowed).contains(user.role())) {
      throw AppException.forbidden("Permissions insuffisantes pour cette action");
    }
  }

  static boolean isWriteForbiddenForRole(String role, HttpServletRequest request) {
    if (role == null || !READ_ONLY_ROLES.contains(role.toUpperCase(Locale.ROOT))) return false;
    if (READ_METHODS.contains(request.getMethod().toUpperCase(Locale.ROOT))) return false;
    String path = request.getRequestURI().replaceFirst("^/api/v\\d+", "");
    if (path.isEmpty()) path = "/";
    String apiPath = path;
    return ALLOWED_WRITES.stream().noneMatch(pattern -> pattern.matcher(apiPath).matches());
  }
}
