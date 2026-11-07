package sn.kafountine.gestionmunicipale.controller;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Year;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.dto.ApiResponse;
import sn.kafountine.gestionmunicipale.service.GenericReadService;

@RestController
@RequestMapping("/api/v1")
public class PlaceholderController {
  private final GenericReadService genericReadService;

  public PlaceholderController(GenericReadService genericReadService) {
    this.genericReadService = genericReadService;
  }

  @GetMapping({
    "/formations", "/formations/statistiques", "/jeunes", "/etat-civil", "/etat-civil/statistiques",
    "/urbanisme", "/urbanisme/statistiques", "/marche/places", "/marche/paiements", "/motos",
    "/motos/paiements", "/marche/statistiques", "/motos/statistiques", "/motos/configuration",
    "/quai-peche/pecheurs", "/quai-peche/embarcations", "/quai-peche/commissions",
    "/quai-peche/camions", "/quai-peche/expeditions", "/budget/lignes", "/budget/demandes",
    "/budget/statistiques", "/budget/stats", "/quai-peche/statistiques", "/audit", "/notifications",
    "/settings/tarifs", "/settings/penalites", "/settings/permissions", "/settings/backups",
    "/reports", "/documents"
  })
  ApiResponse<?> list(HttpServletRequest request) {
    String path = path(request);
    Integer year = intParam(request, "year", Year.now().getValue());
    Integer limit = intParam(request, "limit", 100);
    String search = request.getParameter("search");
    String table = tableFor(path);
    if (path.endsWith("/statistiques") || path.endsWith("/stats") || path.endsWith("/configuration")) {
      return ApiResponse.ok(genericReadService.stats(table, year));
    }
    List<Map<String, Object>> data = table == null ? List.of() : genericReadService.list(table, year, limit, search);
    return ApiResponse.ok(data, Map.of("page", intParam(request, "page", 1), "limit", limit, "total", data.size(), "year", year));
  }

  @GetMapping({
    "/urbanisme/{id}", "/quai-peche/pecheurs/{id}", "/quai-peche/embarcations/{id}", "/quai-peche/commissions/{id}",
    "/quai-peche/camions/{id}", "/quai-peche/expeditions/{id}", "/documents/{id}"
  })
  ApiResponse<?> show(@PathVariable String id, HttpServletRequest request) {
    String table = tableFor(path(request).replace("/" + id, ""));
    return ApiResponse.ok(table == null ? Map.of("id", id) : genericReadService.show(table, id));
  }

  @PostMapping({
    "/formations", "/jeunes", "/etat-civil", "/urbanisme", "/marche/places", "/marche/paiements",
    "/motos", "/motos/paiements", "/quai-peche/pecheurs", "/quai-peche/embarcations", "/quai-peche/commissions",
    "/quai-peche/camions", "/quai-peche/expeditions", "/budget/lignes", "/budget/demandes",
    "/settings/tarifs", "/settings/penalites", "/settings/permissions", "/notifications"
  })
  @ResponseStatus(HttpStatus.CREATED)
  ApiResponse<?> create(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
    String table = tableFor(path(request));
    if (table == null || "User".equals(table)) {
      return ApiResponse.ok(body == null ? Map.of() : body);
    }
    return ApiResponse.ok(genericReadService.create(table, body == null ? Map.of() : body));
  }

  @PutMapping({
    "/formations/{id}", "/etat-civil/{id}", "/urbanisme/{id}", "/marche/places/{id}", "/motos/{id}",
    "/quai-peche/pecheurs/{id}", "/quai-peche/embarcations/{id}", "/quai-peche/commissions/{id}",
    "/quai-peche/camions/{id}", "/quai-peche/expeditions/{id}", "/budget/lignes/{id}",
    "/budget/demandes/{id}", "/settings/tarifs/{id}", "/settings/penalites/{id}", "/settings/permissions/{id}"
  })
  ApiResponse<?> update(@PathVariable String id, @RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
    String table = tableFor(path(request).replace("/" + id, ""));
    if (table == null || "User".equals(table)) {
      return ApiResponse.ok(Map.of("id", id, "data", body == null ? Map.of() : body));
    }
    return ApiResponse.ok(genericReadService.update(table, id, body == null ? Map.of() : body));
  }

  @DeleteMapping({
    "/formations/{id}", "/jeunes/{id}", "/urbanisme/{id}", "/marche/places/{id}", "/motos/{id}",
    "/quai-peche/pecheurs/{id}", "/quai-peche/embarcations/{id}", "/quai-peche/commissions/{id}",
    "/quai-peche/camions/{id}", "/quai-peche/expeditions/{id}", "/budget/lignes/{id}",
    "/settings/tarifs/{id}", "/settings/penalites/{id}", "/settings/permissions/{id}"
  })
  ApiResponse<Void> delete(@PathVariable String id, HttpServletRequest request) {
    String table = tableFor(path(request).replace("/" + id, ""));
    if (table != null && !"User".equals(table)) {
      genericReadService.delete(table, id);
    }
    return ApiResponse.message("Suppression effectuée");
  }

  @PostMapping("/jeunes/{id}/formations/{formationId}")
  ApiResponse<?> inscrire(@PathVariable String id, @PathVariable String formationId) {
    return ApiResponse.ok(Map.of("jeuneId", id, "formationId", formationId));
  }

  @PostMapping("/motos/{id}/changement-conducteur")
  ApiResponse<?> changeMotoDriver(@PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
    return ApiResponse.ok(Map.of("id", id, "data", body == null ? Map.of() : body));
  }

  @PostMapping({"/audit/seed", "/settings/seed", "/years/auto-create"})
  ApiResponse<?> seed() {
    return ApiResponse.ok(Map.of("created", true, "year", Year.now().getValue()));
  }

  @PostMapping({"/audit/export", "/exports/receipt.pdf", "/exports/report.pdf"})
  ApiResponse<?> export(@RequestBody(required = false) Map<String, Object> body) {
    return ApiResponse.ok(Map.of("payload", body == null ? Map.of() : body, "format", "pdf"));
  }

  @PatchMapping({"/notifications/{id}/read", "/notifications/read-all"})
  ApiResponse<?> patchNotifications(@PathVariable(required = false) String id) {
    return ApiResponse.ok(Map.of("id", id == null ? "all" : id, "lu", true));
  }

  @GetMapping("/years")
  ApiResponse<?> years() {
    return ApiResponse.ok(genericReadService.years());
  }

  @GetMapping("/years/current")
  ApiResponse<?> currentYear() {
    return ApiResponse.ok(Map.of("year", Year.now().getValue()));
  }

  @PostMapping("/upload/image")
  ApiResponse<?> uploadImage() {
    return ApiResponse.ok(Map.of("url", "", "publicId", ""));
  }

  @DeleteMapping("/upload/image/{publicId}")
  ApiResponse<Void> deleteImage(@PathVariable String publicId) {
    return ApiResponse.message("Image supprimée");
  }

  @PostMapping({"/settings/backups", "/settings/backups/restore"})
  ApiResponse<?> backup(@RequestBody(required = false) Map<String, Object> body) {
    return ApiResponse.ok(Map.of("payload", body == null ? Map.of() : body, "completed", true));
  }

  @GetMapping("/settings/backups/{filename}/download")
  ApiResponse<?> downloadBackup(@PathVariable String filename) {
    return ApiResponse.ok(Map.of("filename", filename));
  }

  private String path(HttpServletRequest request) {
    return request.getRequestURI().replaceFirst("^/api/v1", "");
  }

  private Integer intParam(HttpServletRequest request, String name, Integer fallback) {
    try {
      String value = request.getParameter(name);
      return value == null || value.isBlank() ? fallback : Integer.parseInt(value);
    } catch (NumberFormatException ignored) {
      return fallback;
    }
  }

  private String tableFor(String path) {
    return switch (path) {
      case "/formations", "/formations/statistiques" -> "TrainingProgram";
      case "/jeunes" -> "YouthProfile";
      case "/etat-civil", "/etat-civil/statistiques" -> "EtatCivilRequest";
      case "/urbanisme", "/urbanisme/statistiques" -> "UrbanismeCase";
      case "/marche/places", "/marche/statistiques" -> "MarketPlace";
      case "/marche/paiements" -> "MarketPayment";
      case "/motos", "/motos/statistiques", "/motos/configuration" -> "MotoRegistration";
      case "/motos/paiements" -> "MotoPayment";
      case "/quai-peche/pecheurs" -> "Fisherman";
      case "/quai-peche/embarcations" -> "FishingBoat";
      case "/quai-peche/commissions" -> "FishCommission";
      case "/quai-peche/camions" -> "RefrigeratedTruck";
      case "/quai-peche/expeditions" -> "ShippingExpedition";
      case "/quai-peche/statistiques" -> "FishCommission";
      case "/budget/lignes", "/budget/statistiques", "/budget/stats" -> "BudgetLine";
      case "/budget/demandes" -> "BudgetRequest";
      case "/audit" -> "AuditLog";
      case "/notifications" -> "AppNotification";
      case "/settings/tarifs" -> "AppSettingTariff";
      case "/settings/penalites" -> "AppSettingPenalty";
      case "/settings/permissions" -> "AppSettingPermission";
      case "/settings/backups" -> "BackupRecord";
      case "/users" -> "User";
      default -> null;
    };
  }
}
