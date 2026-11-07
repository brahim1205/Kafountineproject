package sn.kafountine.gestionmunicipale.modules.dashboard;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.security.Roles;
import sn.kafountine.gestionmunicipale.shared.validation.Common;
import sn.kafountine.gestionmunicipale.shared.validation.Input;

/** Routes /api/v1/dashboard (dashboard.routes.ts côté Node). */
@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {
  private final DashboardService service;

  public DashboardController(DashboardService service) {
    this.service = service;
  }

  /** dashboardStatisticsQuerySchema : year et limit (1 à 100). */
  private record Query(int year, Integer limit) {}

  private static Query query(HttpServletRequest request) {
    Input query = Input.query(request.getParameterMap());
    Integer year = Common.year(query);
    Integer limit = query.num("limit").integer().min(1).max(100).optionalInt();
    query.check();
    return new Query(Common.yearOrCurrent(year == null || year == 0 ? null : year), limit);
  }

  @GetMapping("/statistiques")
  @Roles({"ADMIN", "SUPER_ADMIN", "COMPTABLE", "SERVICE_FINANCES", "AGENT"})
  public ResponseEntity<Map<String, Object>> statistics(HttpServletRequest request) {
    return Api.ok(service.statistics(query(request).year()));
  }

  @GetMapping("/top-contribuables")
  @Roles({"ADMIN", "SUPER_ADMIN", "COMPTABLE", "SERVICE_FINANCES", "AGENT"})
  public ResponseEntity<Map<String, Object>> topContribuables(HttpServletRequest request) {
    Query query = query(request);
    return Api.ok(service.topContribuables(query.year(), query.limit() == null || query.limit() == 0 ? 10 : query.limit()));
  }
}
