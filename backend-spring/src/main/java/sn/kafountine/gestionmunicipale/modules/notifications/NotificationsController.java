package sn.kafountine.gestionmunicipale.modules.notifications;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Year;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.security.Authenticated;
import sn.kafountine.gestionmunicipale.shared.security.Roles;
import sn.kafountine.gestionmunicipale.shared.validation.Common;
import sn.kafountine.gestionmunicipale.shared.validation.Input;
import sn.kafountine.gestionmunicipale.shared.web.RequestContext;

/** Routes /api/v1/notifications et /api/v1/years (municipal.routes.ts côté Node). */
@RestController
public class NotificationsController {
  private final NotificationService service;

  public NotificationsController(NotificationService service) {
    this.service = service;
  }

  /** Number(valeur) de JavaScript, entier rendu en Integer/Long, sinon Double (NaN compris). */
  private static Object jsNumber(String value) {
    double number = Input.jsNumber(JsonNodeFactory.instance.textNode(value));
    if (!Double.isNaN(number) && number == Math.rint(number) && Math.abs(number) < Integer.MAX_VALUE) return (int) number;
    return number;
  }

  /** Route sans schéma côté Node : year et limit sont lus tels quels (yearFrom, Number). */
  @GetMapping("/api/v1/notifications")
  @Authenticated
  public ResponseEntity<Map<String, Object>> list(HttpServletRequest request) {
    String[] years = request.getParameterMap().get("year");
    String[] limits = request.getParameterMap().get("limit");
    String yearText = years == null || years.length == 0 ? null : years[years.length - 1];
    String limitText = limits == null || limits.length == 0 ? null : limits[limits.length - 1];
    Object year = yearText == null || yearText.isEmpty() ? (Object) Year.now().getValue() : jsNumber(yearText);
    Object limit = limitText == null || limitText.isEmpty() ? (Object) 50 : jsNumber(limitText);
    // Prisma transmet NaN comme null : « LIMIT NULL » ne limite rien.
    if (limit instanceof Double d && d.isNaN()) limit = null;
    return Api.ok(service.list(year, limit));
  }

  @PatchMapping("/api/v1/notifications/{id}/read")
  @Authenticated
  public ResponseEntity<Map<String, Object>> markRead(@PathVariable String id) {
    service.markRead(Common.id(id));
    return Api.message("Mise à jour effectuée");
  }

  @PatchMapping("/api/v1/notifications/read-all")
  @Authenticated
  public ResponseEntity<Map<String, Object>> markAllRead(HttpServletRequest request) {
    service.markAllRead(Common.yearQuery(request.getParameterMap()));
    return Api.message("Mise à jour effectuée");
  }

  @GetMapping("/api/v1/years")
  @Authenticated
  public ResponseEntity<Map<String, Object>> years(HttpServletRequest request) {
    Common.yearQuery(request.getParameterMap());
    return Api.ok(service.listYears());
  }

  @GetMapping("/api/v1/years/current")
  @Authenticated
  public ResponseEntity<Map<String, Object>> currentYear() {
    return Api.ok(service.currentYear());
  }

  @PostMapping("/api/v1/years/auto-create")
  @Roles({"ADMIN", "SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> openCurrentYear() {
    return Api.created(service.openCurrentYear(RequestContext.actor()));
  }
}
