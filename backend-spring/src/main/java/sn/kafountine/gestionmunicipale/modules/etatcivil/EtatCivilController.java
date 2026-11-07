package sn.kafountine.gestionmunicipale.modules.etatcivil;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
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
import sn.kafountine.gestionmunicipale.shared.audit.Actor;
import sn.kafountine.gestionmunicipale.shared.audit.AuditTrail;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.security.Authenticated;
import sn.kafountine.gestionmunicipale.shared.security.Roles;
import sn.kafountine.gestionmunicipale.shared.validation.Common;
import sn.kafountine.gestionmunicipale.shared.validation.Input;
import sn.kafountine.gestionmunicipale.shared.web.RequestContext;

/** Routes /api/v1/etat-civil (municipal.routes.ts côté Node). */
@RestController
@RequestMapping("/api/v1/etat-civil")
public class EtatCivilController {
  private static final String[] STATUTS = {"DELIVREE", "REJETEE", "EN_ATTENTE", "VALIDE", "REJETE"};
  private final EtatCivilService service;
  private final AuditTrail auditTrail;

  public EtatCivilController(EtatCivilService service, AuditTrail auditTrail) {
    this.service = service;
    this.auditTrail = auditTrail;
  }

  @GetMapping
  @Authenticated
  public ResponseEntity<Map<String, Object>> list(HttpServletRequest request) {
    return Api.ok(service.list(Common.yearLimitQuery(request.getParameterMap())));
  }

  @GetMapping("/types-documents")
  @Authenticated
  public ResponseEntity<Map<String, Object>> documentTypes() {
    return Api.ok(service.documentTypes());
  }

  @GetMapping("/statistiques")
  @Authenticated
  public ResponseEntity<Map<String, Object>> stats(HttpServletRequest request) {
    return Api.ok(service.stats(Common.yearQuery(request.getParameterMap())));
  }

  @PostMapping
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT"})
  public ResponseEntity<Map<String, Object>> create(@RequestBody(required = false) JsonNode body) {
    Input input = Input.body(body);
    String contribuableId = input.str("contribuableId").noTrim().uuid("Identifiant invalide").required();
    String typeDocument = input.str("typeDocument").trimmed(1, 120, "Type de document requis").required();
    Double exemplaires = input.num("exemplaires").integer().min(1, "Nombre d’exemplaires invalide").required();
    Double montant = input.num("montant").min(0, "Valeur positive ou nulle requise").required();
    String statut = input.str("statut").oneOf(STATUTS).optional();
    String observations = input.str("observations").max(500).optional();
    Common.year(input);
    input.check();
    Actor actor = RequestContext.actor();
    Map<String, Object> created = service.create(actor, new EtatCivilService.Input(contribuableId, typeDocument,
        exemplaires == null ? null : exemplaires.intValue(), montant, statut, observations, observations != null));
    Map<String, Object> body2 = new LinkedHashMap<>(created);
    body2.put("agent", auditTrail.displayName(actor.userId()));
    return Api.created(body2);
  }

  @PutMapping("/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT"})
  public ResponseEntity<Map<String, Object>> update(@PathVariable String id, @RequestBody(required = false) JsonNode body) {
    String requestId = Common.id(id);
    Input input = Input.body(body);
    String contribuableId = input.str("contribuableId").noTrim().uuid("Identifiant invalide").optionalPlain();
    String typeDocument = input.str("typeDocument").max(120).optional();
    Integer exemplaires = input.num("exemplaires").integer().min(1, "Nombre d’exemplaires invalide").optionalInt();
    Double montant = input.num("montant").min(0, "Valeur positive ou nulle requise").optional();
    String statut = input.str("statut").oneOf(STATUTS).optional();
    String observations = input.str("observations").max(500).optional();
    input.check();
    return Api.ok(service.update(RequestContext.actor(), requestId,
        new EtatCivilService.Input(contribuableId, typeDocument, exemplaires, montant, statut, observations, observations != null)));
  }

  @DeleteMapping("/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> delete(@PathVariable String id) {
    service.delete(RequestContext.actor(), Common.id(id));
    return Api.message("Suppression effectuée");
  }
}
