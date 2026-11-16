package sn.kafountine.gestionmunicipale.modules.formations;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.security.Authenticated;
import sn.kafountine.gestionmunicipale.shared.security.Roles;
import sn.kafountine.gestionmunicipale.shared.text.Js;
import sn.kafountine.gestionmunicipale.shared.validation.Common;
import sn.kafountine.gestionmunicipale.shared.validation.Input;
import sn.kafountine.gestionmunicipale.shared.web.Body;
import sn.kafountine.gestionmunicipale.shared.web.RequestContext;

/** Routes /api/v1/formations et /api/v1/jeunes (formations.routes.ts côté Node). */
@RestController
public class FormationsController {
  private static final String[] STATUTS = {"PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE"};
  private final FormationService service;

  public FormationsController(FormationService service) {
    this.service = service;
  }

  private static boolean validDate(String value) {
    return Js.parseDate(value) != null;
  }

  private static String requiredDate(Input input, String key) {
    return input.str(key).trimmed(1, 50, "Date invalide").refine(FormationsController::validDate, "Date invalide").required();
  }

  private static String optionalDate(Input input, String key) {
    return input.str(key).max(50).refine(FormationsController::validDate, "Date invalide").optional();
  }

  @GetMapping("/api/v1/formations")
  @Authenticated
  public ResponseEntity<Map<String, Object>> list(HttpServletRequest request) {
    return Api.ok(service.listFormations(Common.yearLimitQuery(request.getParameterMap())));
  }

  @GetMapping("/api/v1/formations/statistiques")
  @Authenticated
  public ResponseEntity<Map<String, Object>> stats(HttpServletRequest request) {
    return Api.ok(service.stats(Common.yearQuery(request.getParameterMap())));
  }

  @PostMapping("/api/v1/formations")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> create(@Body JsonNode body) {
    Input input = Input.body(body);
    String nom = input.str("nom").trimmed(1, 120, "Nom requis").required();
    String domaine = input.str("domaine").trimmed(1, 120, "Domaine requis").required();
    String duree = input.str("duree").trimmed(1, 60, "Durée requise").required();
    String responsable = input.str("responsable").trimmed(1, 120, "Responsable requis").required();
    Double budget = input.num("budget").min(0, "Valeur positive ou nulle requise").required();
    String debut = requiredDate(input, "dateDebut");
    String fin = requiredDate(input, "dateFin");
    String statut = input.str("statut").oneOf(STATUTS).optional();
    Integer year = Common.year(input);
    input.check();
    return Api.created(service.createFormation(RequestContext.actor(), new FormationService.FormationInput(nom, domaine, duree, responsable, budget, debut, fin, statut, year)));
  }

  @PutMapping("/api/v1/formations/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> update(@PathVariable String id, @Body JsonNode body) {
    String formationId = Common.id(id);
    Input input = Input.body(body);
    String nom = input.str("nom").max(120).optional();
    String domaine = input.str("domaine").max(120).optional();
    String duree = input.str("duree").max(60).optional();
    String responsable = input.str("responsable").max(120).optional();
    Double budget = input.num("budget").min(0, "Valeur positive ou nulle requise").optional();
    String debut = optionalDate(input, "dateDebut");
    String fin = optionalDate(input, "dateFin");
    String statut = input.str("statut").oneOf(STATUTS).optional();
    Integer year = Common.year(input);
    input.check();
    return Api.ok(service.updateFormation(RequestContext.actor(), formationId, new FormationService.FormationInput(nom, domaine, duree, responsable, budget, debut, fin, statut, year)));
  }

  @DeleteMapping("/api/v1/formations/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> delete(@PathVariable String id) {
    service.deleteFormation(RequestContext.actor(), Common.id(id));
    return Api.message("Suppression effectuée");
  }

  @GetMapping("/api/v1/jeunes")
  @Authenticated
  public ResponseEntity<Map<String, Object>> jeunes(HttpServletRequest request) {
    Input query = Input.query(request.getParameterMap());
    Integer year = Common.year(query);
    String search = query.str("search").max(120).optional();
    Integer limit = query.num("limit").integer().min(1).max(500).optionalInt();
    query.check();
    return Api.ok(service.listJeunes(Common.yearOrCurrent(year == null || year == 0 ? null : year), search == null ? "" : search.strip().toLowerCase(Locale.ROOT), limit));
  }

  @PostMapping("/api/v1/jeunes")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> createJeune(@Body JsonNode body) {
    Input input = Input.body(body);
    String nom = input.str("nom").trimmed(1, 100, "Nom requis").required();
    String prenom = input.str("prenom").trimmed(1, 100, "Prénom requis").required();
    String cni = input.str("cni").trimmed(1, 50, "CNI requis").required();
    String telephone = input.str("telephone").trimmed(1, 20, "Téléphone requis").required();
    String adresse = input.str("adresse").max(255).optional();
    String niveau = input.str("niveauEtude").max(120).optional();
    String sexe = input.str("sexe").oneOf("M", "F", "AUTRE").required();
    String dateNaiss = requiredDate(input, "dateNaiss");
    String photo = input.str("photo").max(255).optional();
    Integer year = Common.year(input);
    input.check();
    return Api.created(service.createJeune(RequestContext.actor(), new FormationService.YouthInput(nom, prenom, cni, telephone, adresse, niveau, sexe, dateNaiss, photo, year)));
  }

  @DeleteMapping("/api/v1/jeunes/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> deleteJeune(@PathVariable String id) {
    service.deleteJeune(RequestContext.actor(), Common.id(id));
    return Api.message("Suppression effectuée");
  }

  @PostMapping("/api/v1/jeunes/{id}/formations/{formationId}")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> inscrire(@PathVariable String id, @PathVariable String formationId) {
    Input params = Input.params(Map.of("id", id, "formationId", formationId));
    String jeune = params.str("id").noTrim().uuid("Identifiant invalide").required();
    String formation = params.str("formationId").noTrim().uuid("Identifiant invalide").required();
    params.check();
    service.inscrire(RequestContext.actor(), jeune, formation);
    return Api.created(Api.map("success", true));
  }

  private static String[] ids(String id, String formationId) {
    Input params = Input.params(Map.of("id", id, "formationId", formationId));
    String jeune = params.str("id").noTrim().uuid("Identifiant invalide").required();
    String formation = params.str("formationId").noTrim().uuid("Identifiant invalide").required();
    params.check();
    return new String[] {jeune, formation};
  }

  /** Retire le jeune de la formation, sans supprimer sa fiche. */
  @DeleteMapping("/api/v1/jeunes/{id}/formations/{formationId}")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> desinscrire(@PathVariable String id, @PathVariable String formationId) {
    String[] ref = ids(id, formationId);
    service.desinscrire(RequestContext.actor(), ref[0], ref[1]);
    return Api.ok(Api.map("success", true));
  }

  /** Pointe une séance : { "present": true | false }. */
  @PostMapping("/api/v1/jeunes/{id}/formations/{formationId}/presences")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> pointer(@PathVariable String id, @PathVariable String formationId, @Body JsonNode body) {
    String[] ref = ids(id, formationId);
    Input input = Input.body(body);
    Boolean present = input.bool("present").required();
    input.check();
    return Api.ok(service.pointer(RequestContext.actor(), ref[0], ref[1], present));
  }

  @PostMapping("/api/v1/formations/{id}/cloture")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> cloturer(@PathVariable String id) {
    return Api.ok(service.cloturer(RequestContext.actor(), Common.id(id)));
  }

  @GetMapping("/api/v1/jeunes/{id}/formations/{formationId}/attestation")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> attestation(@PathVariable String id, @PathVariable String formationId) {
    String[] ref = ids(id, formationId);
    return Api.ok(service.attestation(ref[0], ref[1]));
  }
}
