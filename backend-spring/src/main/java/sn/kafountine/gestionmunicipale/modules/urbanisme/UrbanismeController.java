package sn.kafountine.gestionmunicipale.modules.urbanisme;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import sn.kafountine.gestionmunicipale.shared.web.Body;
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

/** Routes /api/v1/urbanisme (municipal.routes.ts côté Node). */
@RestController
@RequestMapping("/api/v1/urbanisme")
public class UrbanismeController {
  private static final String[] STATUTS = {"EN_ATTENTE", "VALIDE", "REJETE"};
  private final UrbanismeService service;
  private final AuditTrail auditTrail;

  public UrbanismeController(UrbanismeService service, AuditTrail auditTrail) {
    this.service = service;
    this.auditTrail = auditTrail;
  }

  @GetMapping
  @Authenticated
  public ResponseEntity<Map<String, Object>> list(HttpServletRequest request) {
    Input query = Input.query(request.getParameterMap());
    int page = query.num("page").integer().min(1).optionalInt(1);
    int limit = query.num("limit").integer().min(1).max(300).optionalInt(20);
    Integer year = Common.year(query);
    String statut = query.str("statut").max(40).optional();
    query.check();
    int p = Math.max(1, page);
    int l = Math.max(1, limit);
    Map<String, Object> result = service.list(p, l, Common.yearOrCurrent(year == null || year == 0 ? null : year),
        statut == null || statut.isEmpty() ? "" : statut.strip().toUpperCase(Locale.ROOT));
    return Api.okWithMeta(result.get("data"), Api.map("page", p, "limit", l, "total", result.get("total")));
  }

  @GetMapping("/statistiques")
  @Authenticated
  public ResponseEntity<Map<String, Object>> stats(HttpServletRequest request) {
    return Api.ok(service.stats(Common.yearQuery(request.getParameterMap())));
  }

  @GetMapping("/{id}")
  @Authenticated
  public ResponseEntity<Map<String, Object>> show(@PathVariable String id) {
    return Api.ok(service.show(Common.id(id)));
  }

  private static UrbanismeService.Input body(Input input, boolean create) {
    String contribuableId = create ? input.str("contribuableId").noTrim().uuid("Identifiant invalide").required() : null;
    String type = create ? input.str("type").trimmed(1, 120, "Type requis").required() : input.str("type").max(120).optional();
    Input.Str description = input.str("description").max(500);
    String descriptionValue = description.optional();
    Double surface = input.num("surface").min(0, "Valeur positive ou nulle requise").optional();
    Input.Str localisation = input.str("localisation").max(255);
    String localisationValue = localisation.optional();
    Input.Str nature = input.str("nature").max(120);
    String natureValue = nature.optional();
    Double montant = input.num("montant").min(0, "Valeur positive ou nulle requise").optional();
    String statut = input.str("statut").oneOf(STATUTS).optional();
    Common.year(input);
    input.check();
    return new UrbanismeService.Input(contribuableId, type, descriptionValue, surface, localisationValue, natureValue, montant, statut,
        descriptionValue != null, localisationValue != null, natureValue != null);
  }

  @PostMapping
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT"})
  public ResponseEntity<Map<String, Object>> create(@Body JsonNode json) {
    Actor actor = RequestContext.actor();
    Map<String, Object> created = new LinkedHashMap<>(service.create(actor, body(Input.body(json), true)));
    created.put("agent", auditTrail.displayName(actor.userId()));
    return Api.created(created);
  }

  @PutMapping("/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT"})
  public ResponseEntity<Map<String, Object>> update(@PathVariable String id, @Body JsonNode json) {
    String dossierId = Common.id(id);
    return Api.ok(service.update(RequestContext.actor(), dossierId, body(Input.body(json), false)));
  }

  @DeleteMapping("/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> delete(@PathVariable String id) {
    service.delete(RequestContext.actor(), Common.id(id));
    return Api.message("Suppression effectuée");
  }
}
