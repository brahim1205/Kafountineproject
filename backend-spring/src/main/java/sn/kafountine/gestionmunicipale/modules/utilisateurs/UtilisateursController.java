package sn.kafountine.gestionmunicipale.modules.utilisateurs;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
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
import sn.kafountine.gestionmunicipale.shared.security.Roles;
import sn.kafountine.gestionmunicipale.shared.validation.Common;
import sn.kafountine.gestionmunicipale.shared.validation.Input;
import sn.kafountine.gestionmunicipale.shared.web.RequestContext;

/** Routes /api/v1/users (utilisateurs.routes.ts côté Node). */
@RestController
@RequestMapping("/api/v1/users")
public class UtilisateursController {
  private static final String[] ROLES = {"ADMIN", "SUPER_ADMIN", "AGENT", "SERVICE_FINANCES", "QUAI_PECHE", "ETAT_CIVIL", "REGISSEUR"};
  private final UtilisateurService service;

  public UtilisateursController(UtilisateurService service) {
    this.service = service;
  }

  @GetMapping
  @Roles({"ADMIN", "SUPER_ADMIN", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> list(HttpServletRequest request) {
    String search = request.getParameter("search");
    return Api.ok(service.list(search == null ? "" : search, RequestContext.actor().role()));
  }

  /** Seul le super administrateur crée des comptes. */
  @PostMapping
  @Roles({"SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> create(@Body JsonNode body) {
    Input input = Input.body(body);
    String email = input.str("email").trimmed(5, 254, "Email invalide").email("Email invalide").lower().required();
    String nom = input.str("nom").trimmed(1, 100, "Nom requis").required();
    String prenom = input.str("prenom").trimmed(1, 100, "Prénom requis").required();
    String role = input.str("role").oneOf(ROLES).optional();
    String telephone = input.str("telephone").max(20).optional();
    String password = input.str("password").trimmed(12, 128, "Mot de passe invalide").required();
    input.check();
    return Api.created(service.create(RequestContext.actor(),
        new UtilisateurService.UserInput(email, nom, prenom, role, telephone, telephone != null, password, null)));
  }

  @PutMapping("/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> update(@PathVariable String id, @Body JsonNode body) {
    String userId = Common.id(id);
    Input input = Input.body(body);
    String email = input.str("email").trimmed(5, 254, "Email invalide").email("Email invalide").lower().optionalPlain();
    String nom = input.str("nom").max(100).optional();
    String prenom = input.str("prenom").max(100).optional();
    String role = input.str("role").oneOf(ROLES).optional();
    String telephone = input.str("telephone").max(20).optional();
    String password = input.str("password").trimmed(12, 128, "Mot de passe invalide").optionalPlain();
    Boolean isActive = input.bool("isActive").optional();
    input.check();
    return Api.ok(service.update(RequestContext.actor(), userId,
        new UtilisateurService.UserInput(email, nom, prenom, role, telephone, telephone != null, password, isActive)));
  }

  @DeleteMapping("/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> delete(@PathVariable String id) {
    return Api.message(service.delete(RequestContext.actor(), Common.id(id)));
  }
}
