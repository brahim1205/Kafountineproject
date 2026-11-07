package sn.kafountine.gestionmunicipale.controller;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.dto.ApiResponse;
import sn.kafountine.gestionmunicipale.dto.AuthDtos.ForgotPasswordRequest;
import sn.kafountine.gestionmunicipale.dto.AuthDtos.LoginRequest;
import sn.kafountine.gestionmunicipale.dto.AuthDtos.RefreshRequest;
import sn.kafountine.gestionmunicipale.security.AuthPrincipal;
import sn.kafountine.gestionmunicipale.service.AuthService;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
  private final AuthService authService;
  private final boolean secureCookies;

  public AuthController(AuthService authService, @Value("${app.cookie-secure}") boolean secureCookies) {
    this.authService = authService;
    this.secureCookies = secureCookies;
  }

  @PostMapping("/login")
  ApiResponse<?> login(@RequestBody LoginRequest request, HttpServletResponse response) {
    var data = authService.login(request.email(), request.password());
    addCookie(response, "auth_token", data.accessToken(), 24 * 60 * 60);
    addCookie(response, "refresh_token", data.refreshToken(), 7 * 24 * 60 * 60);
    return ApiResponse.ok(data);
  }

  @PostMapping("/logout")
  ApiResponse<Void> logout(@AuthenticationPrincipal AuthPrincipal principal, HttpServletResponse response) {
    if (principal != null) {
      authService.logout(principal.userId(), principal.sessionId());
    }
    clearCookie(response, "auth_token");
    clearCookie(response, "refresh_token");
    clearCookie(response, "portal_token");
    return ApiResponse.message("Déconnexion réussie");
  }

  @GetMapping("/me")
  ApiResponse<?> me(@AuthenticationPrincipal AuthPrincipal principal) {
    return ApiResponse.ok(authService.me(principal.userId()));
  }

  @PostMapping("/refresh")
  ApiResponse<?> refresh(@RequestBody(required = false) RefreshRequest request, HttpServletRequest servletRequest, HttpServletResponse response) {
    String refreshToken = request != null ? request.refreshToken() : null;
    if (refreshToken == null || refreshToken.isBlank()) {
      refreshToken = cookie(servletRequest, "refresh_token");
    }
    var data = authService.refresh(refreshToken);
    addCookie(response, "auth_token", data.accessToken(), 24 * 60 * 60);
    addCookie(response, "refresh_token", data.refreshToken(), 7 * 24 * 60 * 60);
    return ApiResponse.ok(data);
  }

  @PostMapping("/forgot-password")
  ApiResponse<Void> forgotPassword(@RequestBody ForgotPasswordRequest request) {
    return ApiResponse.message("Si ce compte existe, un lien de réinitialisation sera envoyé.");
  }

  private void addCookie(HttpServletResponse response, String name, String value, int maxAge) {
    Cookie cookie = new Cookie(name, value);
    cookie.setHttpOnly(true);
    cookie.setSecure(secureCookies);
    cookie.setPath("/");
    cookie.setMaxAge(maxAge);
    response.addCookie(cookie);
  }

  private void clearCookie(HttpServletResponse response, String name) {
    Cookie cookie = new Cookie(name, "");
    cookie.setHttpOnly(true);
    cookie.setSecure(secureCookies);
    cookie.setPath("/");
    cookie.setMaxAge(0);
    response.addCookie(cookie);
  }

  private String cookie(HttpServletRequest request, String name) {
    if (request.getCookies() == null) return null;
    return Arrays.stream(request.getCookies()).filter(c -> name.equals(c.getName())).findFirst().map(Cookie::getValue).orElse(null);
  }
}
