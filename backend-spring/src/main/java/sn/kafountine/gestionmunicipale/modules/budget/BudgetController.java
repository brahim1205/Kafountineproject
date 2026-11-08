package sn.kafountine.gestionmunicipale.modules.budget;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.security.Roles;
import sn.kafountine.gestionmunicipale.shared.validation.Common;
import sn.kafountine.gestionmunicipale.shared.validation.Input;
import sn.kafountine.gestionmunicipale.shared.web.RequestContext;

/** Routes /api/v1/budget (budget.routes.ts côté Node). */
@RestController
@RequestMapping("/api/v1/budget")
public class BudgetController {
  private final BudgetService service;

  public BudgetController(BudgetService service) {
    this.service = service;
  }

  @GetMapping("/lignes")
  @Roles({"ADMIN", "SUPER_ADMIN", "COMPTABLE", "SERVICE_FINANCES"})
  public ResponseEntity<Map<String, Object>> listLines(HttpServletRequest request) {
    return Api.ok(service.listLines(Common.yearQuery(request.getParameterMap())));
  }

  /** description : optionalTrimmedString(255).nullable(). */
  private static BudgetService.LineInput line(Input input, boolean create) {
    String code = create ? input.str("code").trimmed(1, 40, "Code requis").required() : input.str("code").max(40).optional();
    String libelle = create ? input.str("libelle").trimmed(1, 160, "Libellé requis").required() : input.str("libelle").max(160).optional();
    boolean descriptionProvided = input.has("description");
    String description = input.str("description").max(255).nullable().optional();
    Input.Num prevuField = input.num("prevu").min(0, "Valeur positive ou nulle requise");
    Double prevu = create ? prevuField.required() : prevuField.optional();
    Double depense = input.num("depense").min(0, "Valeur positive ou nulle requise").optional();
    Integer year = Common.year(input);
    input.check();
    return new BudgetService.LineInput(code, libelle, description, descriptionProvided, prevu, depense, year);
  }

  @PostMapping("/lignes")
  @Roles({"ADMIN", "SUPER_ADMIN", "COMPTABLE", "SERVICE_FINANCES"})
  public ResponseEntity<Map<String, Object>> createLine(@RequestBody(required = false) JsonNode body) {
    return Api.created(service.createLine(RequestContext.actor(), line(Input.body(body), true)));
  }

  @PutMapping("/lignes/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN", "COMPTABLE", "SERVICE_FINANCES"})
  public ResponseEntity<Map<String, Object>> updateLine(@PathVariable String id, @RequestBody(required = false) JsonNode body) {
    String lineId = Common.id(id);
    return Api.ok(service.updateLine(RequestContext.actor(), lineId, line(Input.body(body), false)));
  }

  @DeleteMapping("/lignes/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> deleteLine(@PathVariable String id) {
    service.deleteLine(RequestContext.actor(), Common.id(id));
    return Api.message("Ligne budgétaire supprimée");
  }

  @GetMapping("/stats")
  @Roles({"ADMIN", "SUPER_ADMIN", "COMPTABLE", "SERVICE_FINANCES"})
  public ResponseEntity<Map<String, Object>> stats(HttpServletRequest request) {
    return Api.ok(service.stats(Common.yearQuery(request.getParameterMap())));
  }

  @GetMapping("/demandes")
  @Roles({"ADMIN", "SUPER_ADMIN", "COMPTABLE", "SERVICE_FINANCES"})
  public ResponseEntity<Map<String, Object>> listRequests(HttpServletRequest request) {
    return Api.ok(service.listRequests(Common.yearQuery(request.getParameterMap())));
  }

  @PostMapping("/demandes")
  @Roles({"ADMIN", "SUPER_ADMIN", "COMPTABLE", "SERVICE_FINANCES", "AGENT"})
  public ResponseEntity<Map<String, Object>> createRequest(@RequestBody(required = false) JsonNode body) {
    Input input = Input.body(body);
    String serviceName = input.str("service").trimmed(1, 120, "Service requis").required();
    String description = input.str("description").trimmed(1, 255, "Description requise").required();
    Double montant = input.num("montant").positive("Valeur positive requise").required();
    Integer year = Common.year(input);
    input.check();
    return Api.created(service.createRequest(RequestContext.actor(), new BudgetService.RequestInput(serviceName, description, montant, null, null, false, year)));
  }

  @PutMapping("/demandes/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN", "COMPTABLE", "SERVICE_FINANCES"})
  public ResponseEntity<Map<String, Object>> updateRequest(@PathVariable String id, @RequestBody(required = false) JsonNode body) {
    String requestId = Common.id(id);
    Input input = Input.body(body);
    String serviceName = input.str("service").max(120).optional();
    String description = input.str("description").max(255).optional();
    Double montant = input.num("montant").positive("Valeur positive requise").optional();
    String statut = input.str("statut").oneOf("EN_ATTENTE", "APPROUVE", "REJETE").optional();
    String motif = input.str("motif").max(255).optional();
    input.check();
    return Api.ok(service.updateRequest(RequestContext.actor(), requestId,
        new BudgetService.RequestInput(serviceName, description, montant, statut, motif, motif != null, null)));
  }
}
