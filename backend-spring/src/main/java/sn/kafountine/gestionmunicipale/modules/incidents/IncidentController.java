package sn.kafountine.gestionmunicipale.modules.incidents;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.security.Roles;
import sn.kafountine.gestionmunicipale.shared.validation.Common;
import sn.kafountine.gestionmunicipale.shared.validation.Input;
import sn.kafountine.gestionmunicipale.shared.web.Body;
import sn.kafountine.gestionmunicipale.shared.web.RequestContext;

/** Incidents techniques : consultation et suivi, réservés au super admin. */
@RestController
@RequestMapping("/api/v1/incidents")
public class IncidentController {
  private final IncidentService service;

  public IncidentController(IncidentService service) {
    this.service = service;
  }

  @GetMapping
  @Roles({"SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> list(HttpServletRequest request) {
    Input query = Input.query(request.getParameterMap());
    int page = query.num("page").integer().min(1).optionalInt(1);
    int limit = query.num("limit").integer().min(1).max(100).optionalInt(25);
    String statut = query.str("statut").max(20).optional();
    String source = query.str("source").max(20).optional();
    String search = query.str("search").max(160).optional();
    query.check();
    return Api.ok(service.list(page, limit, filtre(statut, IncidentService.STATUTS), filtre(source, IncidentService.SOURCES),
        search == null || search.isBlank() ? null : search.strip()));
  }

  @GetMapping("/stats")
  @Roles({"SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> stats() {
    return Api.ok(service.stats());
  }

  @PatchMapping("/{id}")
  @Roles({"SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> update(@PathVariable String id, @Body JsonNode body) {
    Input input = Input.body(body);
    String statut = input.str("statut").oneOf("nouveau", "en_cours", "traite").required();
    String note = input.str("note").max(1000).optional();
    input.check();
    return Api.ok(service.mettreAJour(Common.id(id), statut, note == null || note.isBlank() ? null : note.strip(), RequestContext.actor()));
  }

  /** « all » ou une valeur inconnue : pas de filtre. */
  private static String filtre(String valeur, java.util.Set<String> permis) {
    return valeur != null && permis.contains(valeur) ? valeur : null;
  }
}
