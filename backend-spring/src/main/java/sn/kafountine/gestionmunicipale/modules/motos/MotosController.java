package sn.kafountine.gestionmunicipale.modules.motos;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Locale;
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

/** Routes /api/v1/motos (municipal.routes.ts côté Node). */
@RestController
@RequestMapping("/api/v1/motos")
public class MotosController {
  private final MotoService service;

  public MotosController(MotoService service) {
    this.service = service;
  }

  @GetMapping
  @Authenticated
  public ResponseEntity<Map<String, Object>> list(HttpServletRequest request) {
    Input query = Input.query(request.getParameterMap());
    Integer year = Common.year(query);
    String search = query.str("search").max(120).optional();
    Integer limit = query.num("limit").integer().min(1).max(500).optionalInt();
    query.check();
    return Api.ok(service.list(Common.yearOrCurrent(year == null || year == 0 ? null : year),
        search == null ? "" : search.strip().toLowerCase(Locale.ROOT), limit));
  }

  private static String date(Input input, String key) {
    return input.str(key).max(50).refine(v -> Js.parseDate(v) != null, "Date invalide").optional();
  }

  /** createMotoSchema / updateMotoSchema (mêmes champs, obligatoires à la création). */
  private static MotoService.MotoInput moto(Input input, boolean create) {
    String matricule = create ? input.str("matricule").trimmed(1, 50, "Matricule requis").required() : input.str("matricule").max(50).optional();
    String marque = create ? input.str("marque").trimmed(1, 80, "Marque requise").required() : input.str("marque").max(80).optional();
    String modele = create ? input.str("modele").trimmed(1, 80, "Modèle requis").required() : input.str("modele").max(80).optional();
    Input.Num anneeField = input.num("annee").integer().min(1900).max(2100);
    Double annee = create ? anneeField.required() : anneeField.optional();
    String couleur = input.str("couleur").max(40).optional();
    Input.Str proprietaire = input.str("proprietaireId").noTrim().uuid("Identifiant invalide");
    String proprietaireId = create ? proprietaire.required() : proprietaire.optionalPlain();
    String conducteurId = input.str("conducteurId").noTrim().uuid("Identifiant invalide").optionalPlain();
    String permis = input.str("permis").max(80).optional();
    String statut = input.str("statut").max(40).optional();
    String photo = input.str("photo").max(255).optional();
    Boolean enRetard = input.bool("enRetard").optional();
    Double penalite = input.num("montantPenalite").min(0, "Valeur positive ou nulle requise").optional();
    String prochain = date(input, "prochainPaiement");
    String dernier = date(input, "dernierPaiement");
    Integer year = Common.year(input);
    input.check();
    return new MotoService.MotoInput(matricule, marque, modele, annee == null ? null : annee.intValue(), couleur, couleur != null, proprietaireId,
        conducteurId, conducteurId != null, permis, permis != null, statut, photo, photo != null, enRetard, penalite, prochain, dernier, year);
  }

  @PostMapping
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> create(@Body JsonNode body) {
    return Api.created(service.create(RequestContext.actor(), moto(Input.body(body), true)));
  }

  @PutMapping("/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> update(@PathVariable String id, @Body JsonNode body) {
    String motoId = Common.id(id);
    return Api.ok(service.update(RequestContext.actor(), motoId, moto(Input.body(body), false)));
  }

  @PostMapping("/{id}/changement-conducteur")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> changeDriver(@PathVariable String id, @Body JsonNode body) {
    String motoId = Common.id(id);
    Input input = Input.body(body);
    String conducteurId = input.str("conducteurId").noTrim().uuid("Identifiant invalide").required();
    input.check();
    return Api.ok(service.update(RequestContext.actor(), motoId, new MotoService.MotoInput(null, null, null, null, null, false, null, conducteurId, true,
        null, false, null, null, false, null, null, null, null, null)));
  }

  @GetMapping("/statistiques")
  @Authenticated
  public ResponseEntity<Map<String, Object>> stats(HttpServletRequest request) {
    return Api.ok(service.stats(Common.yearQuery(request.getParameterMap())));
  }

  @GetMapping("/configuration")
  @Authenticated
  public ResponseEntity<Map<String, Object>> configuration(HttpServletRequest request) {
    Common.yearQuery(request.getParameterMap());
    return Api.ok(service.configuration());
  }

  @GetMapping("/paiements")
  @Authenticated
  public ResponseEntity<Map<String, Object>> listPayments(HttpServletRequest request) {
    return Api.ok(service.listPayments(Common.yearQuery(request.getParameterMap())));
  }

  @PostMapping("/paiements")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "REGISSEUR", "SERVICE_FINANCES"})
  public ResponseEntity<Map<String, Object>> createPayment(@Body JsonNode body) {
    Input input = Input.body(body);
    String motoId = input.str("motoId").noTrim().uuid("Identifiant invalide").required();
    String type = input.str("type").oneOf("COTISATION", "AMENDE_POLICE").optional();
    String reference = input.str("reference").max(120).optional();
    String mois = input.str("mois").max(80).optional();
    Integer year = Common.year(input);
    input.check();
    return Api.created(service.createPayment(RequestContext.actor(), new MotoService.PaymentInput(motoId, type, reference, mois, year)));
  }
}
