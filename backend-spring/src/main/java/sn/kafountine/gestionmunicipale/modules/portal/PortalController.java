package sn.kafountine.gestionmunicipale.modules.portal;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.http.Cookies;
import sn.kafountine.gestionmunicipale.shared.security.PortalAuthenticated;
import sn.kafountine.gestionmunicipale.shared.security.RateLimit;
import sn.kafountine.gestionmunicipale.shared.validation.Input;
import sn.kafountine.gestionmunicipale.shared.web.Body;
import sn.kafountine.gestionmunicipale.shared.web.RequestContext;

/** Routes /api/v1/portal (portal.routes.ts côté Node). */
@RestController
@RequestMapping("/api/v1/portal")
public class PortalController {
  private static final long LOGIN_WINDOW = 15 * 60 * 1000;
  private static final long PAYMENT_WINDOW = 5 * 60 * 1000;
  private final PortalService service;

  public PortalController(PortalService service) {
    this.service = service;
  }

  private static String userId(HttpServletRequest request) {
    return RequestContext.user(request).userId();
  }

  private ResponseEntity<Map<String, Object>> otp(JsonNode body) {
    Input input = Input.body(body);
    String nin = input.str("nin").trimmed(3, 30, "NIN requis").required();
    String telephone = input.str("telephone").trimmed(3, 20, "Téléphone requis").required();
    input.check();
    return Api.ok(service.requestOtp(nin, telephone));
  }

  @PostMapping("/auth/contribuable")
  @RateLimit(prefix = "portal-login", windowMs = LOGIN_WINDOW, max = 10)
  public ResponseEntity<Map<String, Object>> contribuable(@Body JsonNode body) {
    return otp(body);
  }

  @PostMapping("/auth/request-otp")
  @RateLimit(prefix = "portal-login", windowMs = LOGIN_WINDOW, max = 10)
  public ResponseEntity<Map<String, Object>> requestOtp(@Body JsonNode body) {
    return otp(body);
  }

  @PostMapping("/auth/verify-otp")
  @RateLimit(prefix = "portal-otp-verify", windowMs = LOGIN_WINDOW, max = 10)
  public ResponseEntity<Map<String, Object>> verifyOtp(@Body JsonNode body, HttpServletResponse response) {
    Input input = Input.body(body);
    String requestId = input.str("requestId").noTrim().uuid("Demande OTP invalide").required();
    String code = input.str("code").pattern("^\\d{6}$", "Code OTP invalide").required();
    input.check();
    PortalService.Verified verified = service.verifyOtp(requestId, code);
    Cookies.setPortalCookie(response, verified.token());
    return Api.ok(Api.map("contribuable", verified.contribuable()));
  }

  @PostMapping("/auth/register")
  @RateLimit(prefix = "portal-login", windowMs = LOGIN_WINDOW, max = 10)
  public ResponseEntity<Map<String, Object>> register(@Body JsonNode body) {
    Input input = Input.body(body);
    String nin = input.str("nin").trimmed(3, 30, "NIN requis").required();
    String nom = input.str("nom").trimmed(1, 100, "Nom requis").required();
    String prenom = input.str("prenom").trimmed(1, 100, "Prénom requis").required();
    String telephone = input.str("telephone").max(20).optional();
    String adresse = input.str("adresse").max(255).optional();
    String lieuNaiss = input.str("lieuNaiss").max(100).optional();
    String dateNaiss = input.str("dateNaiss").max(50).optional();
    input.check();
    return Api.created(service.register(nin, nom, prenom, blank(telephone), blank(adresse), blank(lieuNaiss), blank(dateNaiss)));
  }

  private static String blank(String value) {
    return value == null || value.isEmpty() ? null : value;
  }

  @GetMapping("/auth/me")
  @PortalAuthenticated
  public Map<String, Object> me(HttpServletRequest request) {
    return service.profile(userId(request));
  }

  @PostMapping("/auth/logout")
  @PortalAuthenticated
  public Map<String, Object> logout(HttpServletResponse response) {
    Cookies.clearPortalCookie(response);
    return Api.map("success", true, "message", "Déconnexion portail réussie");
  }

  @GetMapping("/contribuable/{id}/taxes")
  @PortalAuthenticated
  public List<Map<String, Object>> taxes(@PathVariable String id, HttpServletRequest request) {
    if (!id.equals(userId(request))) throw AppException.forbidden("Accès interdit à ces taxes");
    return service.taxes(id);
  }

  @GetMapping("/contribuable/{id}/transactions")
  @PortalAuthenticated
  public List<Map<String, Object>> transactions(@PathVariable String id, HttpServletRequest request) {
    if (!id.equals(userId(request))) throw AppException.forbidden("Accès interdit à ces transactions");
    return service.transactions(id);
  }

  @GetMapping("/payment/availability")
  @PortalAuthenticated
  public ResponseEntity<Map<String, Object>> availability() {
    return Api.ok(service.availability());
  }

  @PostMapping("/payment/initiate")
  @PortalAuthenticated
  @RateLimit(prefix = "portal-payment", windowMs = PAYMENT_WINDOW, max = 20)
  public Map<String, Object> initiate(@Body JsonNode body, HttpServletRequest request) {
    Input input = Input.body(body);
    input.num("amount").min(0, "Montant invalide").optional();
    input.num("montant").min(0, "Montant invalide").optional();
    String phone = input.str("phone").max(20).optional();
    String telephone = input.str("telephone").max(20).optional();
    String method = input.str("method").max(20).optional();
    List<String> taxes = input.optionalStrings("taxes", 50, 1, 128, "Taxe invalide");
    input.str("contribuableId").noTrim().uuid("ID contribuable invalide").optionalPlain();
    String categorie = input.str("categorie").max(100).optional();
    input.refine(() -> input.has("amount") || input.has("montant"), "", "Montant requis");
    input.check();
    return service.initiate(userId(request), taxes, phone, telephone, method, categorie);
  }

  @PostMapping("/payment/confirm")
  @PortalAuthenticated
  @RateLimit(prefix = "portal-payment", windowMs = PAYMENT_WINDOW, max = 20)
  public Map<String, Object> confirm(@Body JsonNode body, HttpServletRequest request) {
    Input input = Input.body(body);
    String transactionId = input.str("transactionId").trimmed(1, 128, "ID transaction invalide").required();
    String reference = input.str("reference").max(128).optional();
    input.check();
    return service.confirm(userId(request), transactionId, reference);
  }

  @GetMapping("/recu/{id}")
  @PortalAuthenticated
  public Map<String, Object> receipt(@PathVariable String id, HttpServletRequest request) {
    return service.receipt(id, userId(request));
  }
}
