package sn.kafountine.gestionmunicipale.modules.caisse;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.security.Authenticated;
import sn.kafountine.gestionmunicipale.shared.security.Roles;
import sn.kafountine.gestionmunicipale.shared.validation.Common;
import sn.kafountine.gestionmunicipale.shared.validation.Input;
import sn.kafountine.gestionmunicipale.shared.web.Body;
import sn.kafountine.gestionmunicipale.shared.web.RequestContext;

/** Routes /api/v1/caisse. */
@RestController
@RequestMapping("/api/v1/caisse")
public class CaisseController {
  private final CaisseService service;

  public CaisseController(CaisseService service) {
    this.service = service;
  }

  private static LocalDate date(String value) {
    if (value == null) return null;
    try {
      return LocalDate.parse(value);
    } catch (DateTimeParseException invalid) {
      throw AppException.validation("Date invalide (format attendu : AAAA-MM-JJ).");
    }
  }

  @GetMapping("/journal")
  @Authenticated
  public ResponseEntity<Map<String, Object>> journal(HttpServletRequest request) {
    Input query = Input.query(request.getParameterMap());
    String date = query.str("date").max(10).optional();
    String agentId = query.str("agentId").noTrim().uuid("Identifiant invalide").optional();
    query.check();
    return Api.ok(service.journal(RequestContext.actor(), date(date), agentId));
  }

  @GetMapping("/synthese")
  @Roles({"ADMIN", "SUPER_ADMIN", "REGISSEUR", "SERVICE_FINANCES"})
  public ResponseEntity<Map<String, Object>> synthese(HttpServletRequest request) {
    Input query = Input.query(request.getParameterMap());
    String date = query.str("date").max(10).optional();
    query.check();
    return Api.ok(service.synthese(date(date)));
  }

  @GetMapping("/clotures")
  @Authenticated
  public ResponseEntity<Map<String, Object>> clotures(HttpServletRequest request) {
    Input query = Input.query(request.getParameterMap());
    String statut = query.str("statut").oneOf("CLOTUREE", "VALIDEE").optional();
    int limit = query.num("limit").integer().min(1).max(200).optionalInt(50);
    query.check();
    return Api.ok(service.clotures(RequestContext.actor(), statut, limit));
  }

  @PostMapping("/clotures")
  @Authenticated
  public ResponseEntity<Map<String, Object>> cloturer(@Body JsonNode body) {
    Input input = Input.body(body);
    String date = input.str("date").max(10).optional();
    String agentId = input.str("agentId").noTrim().uuid("Identifiant invalide").optional();
    Double compte = input.num("montantCompte").min(0, "Le montant compté doit être positif").required();
    String observations = input.str("observations").max(500).optional();
    input.check();
    return Api.created(service.cloturer(RequestContext.actor(), date(date), agentId, compte, observations));
  }

  @PostMapping("/clotures/{id}/valider")
  @Roles({"ADMIN", "SUPER_ADMIN", "REGISSEUR", "SERVICE_FINANCES"})
  public ResponseEntity<Map<String, Object>> valider(@PathVariable String id) {
    return Api.ok(service.valider(RequestContext.actor(), Common.id(id)));
  }

  @PostMapping("/clotures/{id}/rouvrir")
  @Roles({"ADMIN", "SUPER_ADMIN", "REGISSEUR", "SERVICE_FINANCES"})
  public ResponseEntity<Map<String, Object>> rouvrir(@PathVariable String id, @Body JsonNode body) {
    Input input = Input.body(body);
    String motif = input.str("motif").trimmed(3, 300, "Motif requis").required();
    input.check();
    service.rouvrir(RequestContext.actor(), Common.id(id), motif);
    return Api.ok(Api.map("success", true));
  }
}
