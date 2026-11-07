package sn.kafountine.gestionmunicipale.controller;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.dto.PortalDtos.LoginRequest;
import sn.kafountine.gestionmunicipale.dto.PortalDtos.PaymentConfirmRequest;
import sn.kafountine.gestionmunicipale.dto.PortalDtos.RegisterRequest;
import sn.kafountine.gestionmunicipale.service.PortalService;

@RestController
@RequestMapping("/api/v1/portal")
public class PortalController {
  private final PortalService portalService;
  private final boolean secureCookies;

  public PortalController(PortalService portalService, @Value("${app.cookie-secure}") boolean secureCookies) {
    this.portalService = portalService;
    this.secureCookies = secureCookies;
  }

  @PostMapping("/auth/contribuable")
  Map<String, Object> loginContribuable(@RequestBody LoginRequest request, HttpServletResponse response) {
    Map<String, Object> result = portalService.login(request);
    addPortalCookie(response, String.valueOf(result.get("token")));
    return result;
  }

  @PostMapping("/auth/register")
  @ResponseStatus(HttpStatus.CREATED)
  Map<String, Object> register(@RequestBody RegisterRequest request, HttpServletResponse response) {
    Map<String, Object> result = portalService.register(request);
    addPortalCookie(response, String.valueOf(result.get("token")));
    return result;
  }

  @GetMapping("/auth/me")
  Map<String, Object> me(HttpServletRequest request) {
    return portalService.profile(portalService.portalUserId(request));
  }

  @PostMapping("/auth/logout")
  Map<String, Object> logout(HttpServletResponse response) {
    Cookie cookie = new Cookie("portal_token", "");
    cookie.setHttpOnly(true);
    cookie.setSecure(secureCookies);
    cookie.setPath("/");
    cookie.setMaxAge(0);
    response.addCookie(cookie);
    return Map.of("success", true, "message", "Déconnexion portail réussie");
  }

  @GetMapping("/contribuable/{id}/taxes")
  Object taxes(@PathVariable String id, HttpServletRequest request) {
    String authenticatedId = portalService.portalUserId(request);
    portalService.ensureOwner(id, authenticatedId, "taxes");
    return portalService.taxes(id);
  }

  @GetMapping("/contribuable/{id}/transactions")
  Object transactions(@PathVariable String id, HttpServletRequest request) {
    String authenticatedId = portalService.portalUserId(request);
    portalService.ensureOwner(id, authenticatedId, "transactions");
    return portalService.portalTransactions(id);
  }

  @PostMapping("/payment/initiate")
  Map<String, Object> initiatePayment(@RequestBody Map<String, Object> input, HttpServletRequest request) {
    return portalService.initiatePayment(input == null ? Map.of() : input, portalService.portalUserId(request));
  }

  @PostMapping("/payment/confirm")
  Map<String, Object> confirmPayment(@RequestBody PaymentConfirmRequest request, HttpServletRequest httpRequest) {
    return portalService.confirmPayment(request.transactionId(), request.reference(), portalService.portalUserId(httpRequest));
  }

  @GetMapping("/recu/{id}")
  Map<String, Object> receipt(@PathVariable String id, HttpServletRequest request) {
    return portalService.receipt(id, portalService.portalUserId(request));
  }

  private void addPortalCookie(HttpServletResponse response, String token) {
    Cookie cookie = new Cookie("portal_token", token);
    cookie.setHttpOnly(true);
    cookie.setSecure(secureCookies);
    cookie.setPath("/");
    cookie.setMaxAge(7 * 24 * 60 * 60);
    response.addCookie(cookie);
  }
}
