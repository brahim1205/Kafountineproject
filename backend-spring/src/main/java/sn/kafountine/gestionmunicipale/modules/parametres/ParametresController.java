package sn.kafountine.gestionmunicipale.modules.parametres;

import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import sn.kafountine.gestionmunicipale.shared.web.Body;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;
import sn.kafountine.gestionmunicipale.shared.security.Roles;
import sn.kafountine.gestionmunicipale.shared.validation.Common;
import sn.kafountine.gestionmunicipale.shared.validation.Input;
import sn.kafountine.gestionmunicipale.shared.web.RequestContext;

/** Routes /api/v1/settings et /api/v1/public/penalites (parametres.routes.ts côté Node). */
@RestController
public class ParametresController {
  private static final String BACKUP_FILENAME = "^backup-\\d{4}-\\d{2}-\\d{2}_\\d{2}-\\d{2}-\\d{2}-\\d{3}\\.json$";
  private final ParametresService service;

  public ParametresController(ParametresService service) {
    this.service = service;
  }

  // --- Tarifs ------------------------------------------------------------------------------------

  @GetMapping("/api/v1/settings/tarifs")
  @Roles({"ADMIN", "SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> listTariffs() {
    return Api.ok(service.listTariffs());
  }

  private static ParametresService.TariffInput tariff(Input input, boolean create) {
    String categorie = create ? input.str("categorie").trimmed(1, 100, "Catégorie requise").required() : input.str("categorie").max(100).optional();
    String nom = create ? input.str("nom").trimmed(1, 120, "Nom requis").required() : input.str("nom").max(120).optional();
    Input.Num montantField = input.num("montant").min(0, "Valeur positive ou nulle requise");
    Double montant = create ? montantField.required() : montantField.optional();
    String unite = create ? input.str("unite").trimmed(1, 80, "Unité requise").required() : input.str("unite").max(80).optional();
    String description = input.str("description").max(255).optional();
    Boolean actif = input.bool("actif").optional();
    input.check();
    return new ParametresService.TariffInput(categorie, nom, montant, unite, description, description != null, actif);
  }

  @PostMapping("/api/v1/settings/tarifs")
  @Roles({"ADMIN", "SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> createTariff(@Body JsonNode body) {
    return Api.created(service.createTariff(RequestContext.actor(), tariff(Input.body(body), true)));
  }

  @PutMapping("/api/v1/settings/tarifs/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> updateTariff(@PathVariable String id, @Body JsonNode body) {
    String tariffId = Common.id(id);
    return Api.ok(service.updateTariff(RequestContext.actor(), tariffId, tariff(Input.body(body), false)));
  }

  @DeleteMapping("/api/v1/settings/tarifs/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> deleteTariff(@PathVariable String id) {
    service.deleteTariff(RequestContext.actor(), Common.id(id));
    return Api.message("Tarif supprimé");
  }

  // --- Pénalités ---------------------------------------------------------------------------------

  @GetMapping("/api/v1/settings/penalites")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> listPenalties() {
    return Api.ok(service.listPenalties());
  }

  /** Lecture publique (portail) des pénalités, sans authentification. */
  @GetMapping("/api/v1/public/penalites")
  public ResponseEntity<Map<String, Object>> publicPenalties() {
    return Api.ok(service.listPenalties());
  }

  private static ParametresService.PenaltyInput penalty(Input input, boolean create) {
    String type = create ? input.str("type").trimmed(1, 120, "Type requis").required() : input.str("type").max(120).optional();
    String description = input.str("description").max(255).optional();
    Input.Num montantField = input.num("montant").min(0, "Valeur positive ou nulle requise");
    Double montant = create ? montantField.required() : montantField.optional();
    String delai = create ? input.str("delai").trimmed(1, 120, "Délai requis").required() : input.str("delai").max(120).optional();
    Boolean actif = input.bool("actif").optional();
    input.check();
    return new ParametresService.PenaltyInput(type, description, description != null, montant, delai, actif);
  }

  @PostMapping("/api/v1/settings/penalites")
  @Roles({"ADMIN", "SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> createPenalty(@Body JsonNode body) {
    return Api.created(service.createPenalty(RequestContext.actor(), penalty(Input.body(body), true)));
  }

  @PutMapping("/api/v1/settings/penalites/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> updatePenalty(@PathVariable String id, @Body JsonNode body) {
    String penaltyId = Common.id(id);
    return Api.ok(service.updatePenalty(RequestContext.actor(), penaltyId, penalty(Input.body(body), false)));
  }

  @DeleteMapping("/api/v1/settings/penalites/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> deletePenalty(@PathVariable String id) {
    service.deletePenalty(RequestContext.actor(), Common.id(id));
    return Api.message("Pénalité supprimée");
  }

  // --- Permissions -------------------------------------------------------------------------------

  @GetMapping("/api/v1/settings/permissions")
  @Roles({"ADMIN", "SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> listPermissions() {
    return Api.ok(service.listPermissions());
  }

  @PostMapping("/api/v1/settings/permissions")
  @Roles({"ADMIN", "SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> updatePermission(@Body JsonNode body) {
    Input input = Input.body(body);
    String module = input.str("module").trimmed(1, 120, "Module requis").required();
    String role = input.str("role").oneOf("AGENT", "SUPERVISEUR", "ADMIN", "SUPER_ADMIN").required();
    Boolean enabled = input.bool("enabled").required();
    input.check();
    service.updatePermission(RequestContext.actor(), module, role, Boolean.TRUE.equals(enabled));
    return Api.message("Permission mise à jour");
  }

  // --- Sauvegardes -------------------------------------------------------------------------------

  @GetMapping("/api/v1/settings/backups")
  @Roles({"ADMIN", "SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> listBackups() {
    return Api.ok(service.listBackups());
  }

  @PostMapping("/api/v1/settings/backups")
  @Roles({"ADMIN", "SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> createBackup(@Body JsonNode body) {
    Input.body(body).check();
    return Api.created(service.createBackup(RequestContext.actor()));
  }

  @PostMapping("/api/v1/settings/backups/restore")
  @Roles({"ADMIN", "SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> restoreBackup(@Body JsonNode body) {
    Input input = Input.body(body);
    String filename = input.str("filename").noTrim().pattern(BACKUP_FILENAME, "Nom de fichier de sauvegarde invalide").required();
    input.check();
    service.restoreBackup(RequestContext.actor(), filename == null ? "" : filename.strip());
    return Api.message("Restauration terminée");
  }

  @GetMapping("/api/v1/settings/backups/{filename}/download")
  @Roles({"ADMIN", "SUPER_ADMIN"})
  public ResponseEntity<byte[]> downloadBackup(@PathVariable String filename) {
    Input params = Input.params(Map.of("filename", filename));
    String name = params.str("filename").noTrim().pattern(BACKUP_FILENAME, "Nom de fichier de sauvegarde invalide").required();
    params.check();
    Map<String, Object> backup = service.getBackup(name.strip());
    return ResponseEntity.ok()
        .header("Content-Type", "application/json; charset=utf-8")
        .header("Content-Disposition", "attachment; filename=\"" + backup.get("filename") + "\"")
        .body(Db.str(backup, "snapshot").getBytes(StandardCharsets.UTF_8));
  }
}
