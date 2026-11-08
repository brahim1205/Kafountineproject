package sn.kafountine.gestionmunicipale.modules.auth;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import sn.kafountine.gestionmunicipale.shared.web.Body;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.shared.config.Env;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.http.Cookies;
import sn.kafountine.gestionmunicipale.shared.security.AuthUser;
import sn.kafountine.gestionmunicipale.shared.security.Authenticated;
import sn.kafountine.gestionmunicipale.shared.security.RateLimit;
import sn.kafountine.gestionmunicipale.shared.validation.Input;
import sn.kafountine.gestionmunicipale.shared.web.RateLimiter;
import sn.kafountine.gestionmunicipale.shared.web.RequestContext;

/** Routes /api/v1/auth (auth.routes.ts côté Node). */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
  private final AuthService auth;
  private final RateLimiter rateLimiter;

  public AuthController(AuthService auth, RateLimiter rateLimiter) {
    this.auth = auth;
    this.rateLimiter = rateLimiter;
  }

  /** Limite par IP (plafond large), puis par compte visé et IP ; ensuite la validation (même ordre que Node). */
  @PostMapping("/login")
  public ResponseEntity<Map<String, Object>> login(@Body JsonNode body, HttpServletRequest request, HttpServletResponse response) {
    rateLimiter.check(request, response, "auth-login-ip", Env.LOGIN_RATE_LIMIT_WINDOW_MS, Env.LOGIN_RATE_LIMIT_MAX * 10, RateLimiter.KeyKind.IP, null);
    String rawEmail = body != null && body.has("email") && body.get("email").isTextual() ? body.get("email").asText() : "";
    rateLimiter.check(request, response, "auth-login", Env.LOGIN_RATE_LIMIT_WINDOW_MS, Env.LOGIN_RATE_LIMIT_MAX, RateLimiter.KeyKind.LOGIN_ATTEMPT, rawEmail);
    Input input = Input.body(body);
    String email = input.str("email").trimmed(5, 254, "Email invalide").email("Email invalide").lower().required();
    String password = input.str("password").trimmed(8, 128, "Mot de passe invalide").required();
    input.check();
    AuthService.Tokens tokens = auth.login(email, password);
    Cookies.setAuthCookies(response, tokens.accessToken(), tokens.refreshToken());
    return Api.ok(Api.map("user", tokens.user()));
  }

  @PostMapping("/change-password")
  @Authenticated
  @RateLimit(prefix = "auth-change-password", windowMs = 15 * 60 * 1000, max = 5, key = RateLimiter.KeyKind.USER_OR_IP)
  public ResponseEntity<Map<String, Object>> changePassword(@Body JsonNode body, HttpServletRequest request) {
    Input input = Input.body(body);
    String current = input.str("currentPassword").trimmed(1, 128, "Mot de passe actuel requis").required();
    String next = input.str("newPassword").trimmed(12, 128, "Le nouveau mot de passe doit contenir au moins 12 caractères").required();
    input.check();
    AuthUser user = RequestContext.user(request);
    auth.changePassword(user.userId(), user.role(), RequestContext.clientIp(request), current, next);
    return Api.message("Mot de passe modifié");
  }

  @PostMapping("/logout")
  @Authenticated
  public ResponseEntity<Map<String, Object>> logout(HttpServletRequest request, HttpServletResponse response) {
    AuthUser user = RequestContext.user(request);
    auth.logout(user.userId(), user.sessionId());
    Cookies.clearAuthCookies(response);
    return Api.message("Déconnexion réussie");
  }

  @GetMapping("/me")
  @Authenticated
  public ResponseEntity<Map<String, Object>> me(HttpServletRequest request) {
    return Api.ok(auth.me(RequestContext.user(request).userId()));
  }

  @PostMapping("/refresh")
  @RateLimit(prefix = "auth-refresh", windowMs = 5 * 60 * 1000, max = 20)
  public ResponseEntity<Map<String, Object>> refresh(@Body JsonNode body, HttpServletRequest request, HttpServletResponse response) {
    Input input = Input.body(body);
    String fromBody = input.str("refreshToken").max(2048).optional();
    input.check();
    String refreshToken = fromBody != null ? fromBody : Cookies.read(request, Cookies.REFRESH_TOKEN);
    if (refreshToken == null) throw AppException.unauthorized("Refresh token requis");
    AuthService.Tokens tokens = auth.refresh(refreshToken);
    Cookies.setAuthCookies(response, tokens.accessToken(), tokens.refreshToken());
    return Api.ok(Map.of());
  }

  @PostMapping("/forgot-password")
  @RateLimit(prefix = "auth-forgot-password", windowMs = 15 * 60 * 1000, max = 5)
  public ResponseEntity<Map<String, Object>> forgotPassword(@Body JsonNode body) {
    Input input = Input.body(body);
    String email = input.str("email").trimmed(5, 254, "Email invalide").email("Email invalide").lower().required();
    input.check();
    return Api.message(auth.requestPasswordReset(email));
  }
}
