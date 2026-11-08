package sn.kafountine.gestionmunicipale.modules.contribuables;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.List;
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
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.security.Authenticated;
import sn.kafountine.gestionmunicipale.shared.security.Roles;
import sn.kafountine.gestionmunicipale.shared.validation.Common;
import sn.kafountine.gestionmunicipale.shared.validation.Input;
import sn.kafountine.gestionmunicipale.shared.web.RequestContext;

/** Routes /api/v1/contribuables (contribuables.routes.ts côté Node). */
@RestController
@RequestMapping("/api/v1/contribuables")
public class ContribuablesController {
  private static final String[] TYPES = {"PARTICULIER", "ENTREPRISE", "ASSOCIATION"};
  private final ContribuableService service;

  public ContribuablesController(ContribuableService service) {
    this.service = service;
  }

  @GetMapping("/check-telephone")
  @Authenticated
  public ResponseEntity<Map<String, Object>> checkTelephone(HttpServletRequest request) {
    Input query = Input.query(request.getParameterMap());
    String telephone = query.str("telephone").trimmed(1, 20, "Téléphone requis").required();
    query.check();
    return Api.ok(service.checkTelephone(telephone));
  }

  @GetMapping
  @Authenticated
  @SuppressWarnings("unchecked")
  public ResponseEntity<Map<String, Object>> list(HttpServletRequest request) {
    Input query = Input.query(request.getParameterMap());
    String search = query.str("search").max(100).optional();
    String statut = query.str("statut").oneOf("actif", "inactif").optional();
    int page = query.num("page").integer().min(1).optionalInt(1);
    int limit = query.num("limit").integer().min(1).max(100).optionalInt(20);
    Common.year(query);
    query.check();
    Boolean isActive = "actif".equals(statut) ? Boolean.TRUE : "inactif".equals(statut) ? Boolean.FALSE : null;
    String trimmed = search == null || search.isBlank() ? null : search.trim();
    Map<String, Object> result = service.list(trimmed, isActive, page, limit);
    return Api.okWithMeta(result.get("data"), (Map<String, Object>) result.get("meta"));
  }

  /** Email : « » vaut absent ; sinon 5 à 254 caractères et format valide. */
  private static String email(Input input) {
    return input.str("email").trimmed(5, 254, "Email invalide").email("Email invalide").optionalOrEmpty();
  }

  private static String type(Input input) {
    return input.str("typeContribuable").oneOf(TYPES).optional();
  }

  @PostMapping
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "COMPTABLE"})
  public ResponseEntity<Map<String, Object>> create(@Body JsonNode body) {
    Input input = Input.body(body);
    Map<String, Object> data = new LinkedHashMap<>();
    data.put("nin", input.str("nin").trimmed(1, 30, "NIN requis").required());
    data.put("nom", input.str("nom").trimmed(1, 100, "Nom requis").required());
    data.put("prenom", input.str("prenom").trimmed(1, 100, "Prénom requis").required());
    data.put("dateNaiss", input.str("dateNaiss").trimmed(1, 50, "Date de naissance requise").required());
    data.put("lieuNaiss", input.str("lieuNaiss").trimmed(1, 100, "Lieu de naissance requis").required());
    data.put("adresse", input.str("adresse").trimmed(1, 255, "Adresse requise").required());
    data.put("telephone", input.str("telephone").trimmed(1, 20, "Téléphone requis").required());
    data.put("email", email(input));
    data.put("profession", input.str("profession").max(100).optional());
    data.put("typeContribuable", type(input));
    data.put("zone", input.str("zone").max(100).optional());
    Double montant = input.num("montantImpot").min(0).optional();
    // Le contrôleur Node ignore un montant nul (0 → valeur par défaut, soit 0).
    data.put("montantImpot", montant == null || montant == 0 ? null : montant);
    data.put("isActive", input.bool("isActive").optional());
    input.check();
    return Api.created(service.create(data));
  }

  @PutMapping("/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "COMPTABLE"})
  public ResponseEntity<Map<String, Object>> update(@PathVariable String id, @Body JsonNode body) {
    Input input = Input.body(body);
    Map<String, Object> data = new LinkedHashMap<>();
    for (Map.Entry<String, Integer> field : List.of(Map.entry("nin", 30), Map.entry("nom", 100), Map.entry("prenom", 100),
        Map.entry("dateNaiss", 50), Map.entry("lieuNaiss", 100), Map.entry("adresse", 255), Map.entry("telephone", 20),
        Map.entry("profession", 100), Map.entry("zone", 100))) {
      data.put(field.getKey(), input.str(field.getKey()).max(field.getValue()).optional());
    }
    data.put("email", email(input));
    data.put("typeContribuable", type(input));
    data.put("montantImpot", input.num("montantImpot").min(0).optional());
    data.put("isActive", input.bool("isActive").optional());
    input.check();
    return Api.ok(service.update(id, data));
  }

  @DeleteMapping("/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> delete(@PathVariable String id) {
    service.delete(RequestContext.actor(), id);
    return Api.message("Contribuable supprimé avec succès");
  }
}
