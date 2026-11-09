package sn.kafountine.gestionmunicipale.modules.marche;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import sn.kafountine.gestionmunicipale.shared.web.Body;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.security.Authenticated;
import sn.kafountine.gestionmunicipale.shared.security.Roles;
import sn.kafountine.gestionmunicipale.shared.text.Js;
import sn.kafountine.gestionmunicipale.shared.validation.Common;
import sn.kafountine.gestionmunicipale.shared.validation.Input;
import sn.kafountine.gestionmunicipale.shared.web.RequestContext;

/** Routes /api/v1/marche (municipal.routes.ts côté Node). */
@RestController
@RequestMapping("/api/v1/marche")
public class MarcheController {
  private static final String[] PLACE_STATUTS = {"LIBRE", "OCCUPEE", "DISPONIBLE"};
  private static final String[] PAYMENT_STATUTS = {"PAYE", "EN_ATTENTE", "ANNULE"};
  private final MarcheService service;

  public MarcheController(MarcheService service) {
    this.service = service;
  }

  @GetMapping("/places")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "SERVICE_FINANCES", "QUAI_PECHE", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> listPlaces(HttpServletRequest request) {
    return Api.ok(service.listPlaces(Common.yearQuery(request.getParameterMap())));
  }

  private static boolean nonEmptyText(JsonNode node) {
    return node != null && node.isTextual() && !node.asText().strip().isEmpty();
  }

  @PostMapping("/places")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> createPlace(@Body JsonNode body) {
    Input input = Input.body(body);
    String numeroPlace = input.str("numeroPlace").trimmed(1, 50, "Numéro requis").optionalPlain();
    String numero = input.str("numero").trimmed(1, 50, "Numéro requis").optionalPlain();
    String type = input.str("type").trimmed(1, 80, "Type requis").required();
    String zone = input.str("zone").trimmed(1, 80, "Zone requise").required();
    String occupantId = input.str("occupantId").noTrim().uuid("Identifiant invalide").optionalPlain();
    String activite = input.str("activite").max(120).optional();
    input.str("telephone").max(20).optional();
    Double tarif = input.num("tarif").min(0, "Valeur positive ou nulle requise").required();
    String periode = input.str("periode").max(40).optional();
    String statut = input.str("statut").oneOf(PLACE_STATUTS).optional();
    Integer year = Common.year(input);
    input.refine(() -> nonEmptyText(input.node("numeroPlace")) || nonEmptyText(input.node("numero")), "numeroPlace", "Le numéro de place est requis");
    input.check();
    return Api.created(service.createPlace(RequestContext.actor(), new MarcheService.PlaceInput(numeroPlace, numero, type, zone, occupantId,
        occupantId != null, activite, activite != null, tarif, periode, statut, year)));
  }

  @PutMapping("/places/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> updatePlace(@PathVariable String id, @Body JsonNode body) {
    String placeId = Common.id(id);
    Input input = Input.body(body);
    String numeroPlace = input.str("numeroPlace").max(50).optional();
    String type = input.str("type").max(80).optional();
    String zone = input.str("zone").max(80).optional();
    // uuid.nullable().optional().or(z.literal('')) : null libère la place, « » laisse l'occupant inchangé.
    Input.Str occupant = input.str("occupantId").noTrim().uuid("Identifiant invalide").nullable();
    boolean occupantProvided;
    String occupantId = null;
    JsonNode rawOccupant = input.node("occupantId");
    if (rawOccupant == null || (rawOccupant.isTextual() && rawOccupant.asText().isEmpty())) {
      occupantProvided = false;
    } else if (rawOccupant.isNull()) {
      occupantProvided = true;
    } else if (!rawOccupant.isTextual()) {
      occupant.optional();
      occupantProvided = false;
    } else {
      occupantId = occupant.optionalPlain();
      occupantProvided = true;
    }
    String activite = input.str("activite").max(120).optional();
    input.str("telephone").max(20).optional();
    Double tarif = input.num("tarif").min(0, "Valeur positive ou nulle requise").optional();
    String periode = input.str("periode").max(40).optional();
    String statut = input.str("statut").oneOf(PLACE_STATUTS).optional();
    Integer year = Common.year(input);
    input.check();
    return Api.ok(service.updatePlace(RequestContext.actor(), placeId, new MarcheService.PlaceInput(numeroPlace, null, type, zone, occupantId,
        occupantProvided, activite, activite != null, tarif, periode, statut, year)));
  }

  @GetMapping("/paiements")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "SERVICE_FINANCES", "QUAI_PECHE", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> listPayments(HttpServletRequest request) {
    Input query = Input.query(request.getParameterMap());
    Integer year = Common.year(query);
    Integer page = query.num("page").integer().min(1).optionalInt();
    Integer limit = query.num("limit").integer().min(1).max(500).optionalInt();
    String search = query.str("search").max(120).optional();
    String statut = query.str("statut").oneOf("PAYE", "EN_ATTENTE", "RETARD").optional();
    query.check();
    int resolved = Common.yearOrCurrent(year == null || year == 0 ? null : year);
    Common.Paging paging = Common.paging(page, limit);
    if (paging == null) return Api.ok(service.listPayments(resolved));
    Map<String, Object> result = service.pagePayments(resolved, search == null ? "" : search.strip(), statut, paging);
    @SuppressWarnings("unchecked") Map<String, Object> meta = (Map<String, Object>) result.get("meta");
    return Api.okWithMeta(result.get("data"), meta);
  }

  @PostMapping("/paiements")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> createPayment(@Body JsonNode body) {
    Input input = Input.body(body);
    String placeId = input.str("placeId").noTrim().uuid("Identifiant invalide").required();
    Double montant = input.num("montant").positive("Valeur positive requise").required();
    String reference = input.str("reference").max(120).optional();
    String periode = input.str("periode").trimmed(1, 80, "Période requise").required();
    String statut = input.str("statut").oneOf(PAYMENT_STATUTS).optional();
    String datePaiement = input.str("datePaiement").max(50).refine(v -> Js.parseDate(v) != null, "Date invalide").optional();
    String mode = input.str("modePaiement").oneOf(Common.MODES_PAIEMENT).optional();
    Integer year = Common.year(input);
    input.check();
    Common.assertOpenYear(year);
    return Api.created(service.createPayment(RequestContext.actor(), new MarcheService.PaymentInput(placeId, montant, reference, periode, statut, datePaiement, year, mode)));
  }

  @PostMapping("/paiements/{id}/annuler")
  @Roles({"ADMIN", "SUPER_ADMIN", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> cancelPayment(@PathVariable String id, @Body JsonNode body) {
    Input input = Input.body(body);
    String motif = input.str("motif").trimmed(3, 300, "Motif requis").required();
    input.check();
    service.cancelPayment(RequestContext.actor(), Common.id(id), motif);
    return Api.ok(Api.map("success", true));
  }

  @GetMapping("/statistiques/details")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "SERVICE_FINANCES", "QUAI_PECHE", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> statsDetails(HttpServletRequest request) {
    return Api.ok(service.statsDetails(Common.yearQuery(request.getParameterMap())));
  }

  @GetMapping("/statistiques")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "SERVICE_FINANCES", "QUAI_PECHE", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> stats(HttpServletRequest request) {
    return Api.ok(service.stats(Common.yearQuery(request.getParameterMap())));
  }
}
