package sn.kafountine.gestionmunicipale.modules.diagnostic;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.modules.incidents.IncidentService;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.security.AuthUser;
import sn.kafountine.gestionmunicipale.shared.security.Authenticated;
import sn.kafountine.gestionmunicipale.shared.security.RateLimit;
import sn.kafountine.gestionmunicipale.shared.validation.Input;
import sn.kafountine.gestionmunicipale.shared.web.Body;
import sn.kafountine.gestionmunicipale.shared.web.RateLimiter;
import sn.kafountine.gestionmunicipale.shared.web.RequestContext;

/**
 * Erreurs survenues dans le navigateur : écrites dans les logs du backend (type « client-error »),
 * à côté des erreurs serveur, pour qu'un plantage d'écran chez un agent laisse une trace.
 */
@RestController
public class ClientErrorController {
  private static final ObjectMapper JSON = new ObjectMapper();
  private final IncidentService incidents;

  public ClientErrorController(IncidentService incidents) {
    this.incidents = incidents;
  }

  @PostMapping("/api/v1/client-errors")
  @Authenticated
  @RateLimit(prefix = "client-errors", windowMs = 60 * 1000, max = 20, key = RateLimiter.KeyKind.USER_OR_IP)
  public ResponseEntity<Map<String, Object>> report(@Body JsonNode body, HttpServletRequest request) {
    Input input = Input.body(body);
    String message = input.str("message").trimmed(1, 1000, "Message invalide").required();
    String stack = input.str("stack").max(8000).optional();
    String page = input.str("page").max(500).optional();
    input.check();
    AuthUser user = RequestContext.user(request);
    Map<String, Object> log = new LinkedHashMap<>();
    log.put("type", "client-error");
    log.put("requestId", RequestContext.requestId(request));
    log.put("userId", user == null ? null : user.userId());
    log.put("role", user == null ? null : user.role());
    log.put("page", page);
    log.put("message", message);
    log.put("stack", stack);
    log.put("userAgent", request.getHeader("user-agent"));
    try {
      System.err.println(JSON.writeValueAsString(log));
    } catch (JsonProcessingException error) {
      System.err.println("{\"type\":\"client-error\",\"message\":\"rapport illisible\"}");
    }
    incidents.enregistrer("navigateur", page, message, RequestContext.requestId(request),
        user == null ? null : user.userId(), user == null ? null : user.role());
    return Api.message("Erreur enregistrée");
  }
}
