package sn.kafountine.gestionmunicipale.modules.recouvrement;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.security.Roles;
import sn.kafountine.gestionmunicipale.shared.validation.Common;
import sn.kafountine.gestionmunicipale.shared.validation.Input;
import sn.kafountine.gestionmunicipale.shared.web.RequestContext;

/** Impayés et situation d'un contribuable. */
@RestController
public class RecouvrementController {
  private final RecouvrementService service;

  public RecouvrementController(RecouvrementService service) {
    this.service = service;
  }

  @GetMapping("/api/v1/impayes")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "SERVICE_FINANCES", "REGISSEUR", "QUAI_PECHE"})
  public ResponseEntity<Map<String, Object>> impayes(HttpServletRequest request) {
    Input query = Input.query(request.getParameterMap());
    int limit = query.num("limit").integer().min(1).max(1000).optionalInt(500);
    query.check();
    return Api.ok(service.impayes(limit));
  }

  @GetMapping("/api/v1/contribuables/{id}/situation")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "SERVICE_FINANCES", "ETAT_CIVIL", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> situation(@PathVariable String id, HttpServletRequest request) {
    return Api.ok(service.situation(RequestContext.actor(), Common.id(id), Common.yearQuery(request.getParameterMap())));
  }
}
