package sn.kafountine.gestionmunicipale.modules.audit;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.security.Roles;
import sn.kafountine.gestionmunicipale.shared.validation.Common;
import sn.kafountine.gestionmunicipale.shared.validation.Input;
import sn.kafountine.gestionmunicipale.shared.web.RequestContext;

/** Routes /api/v1/audit (municipal.routes.ts côté Node). */
@RestController
@RequestMapping("/api/v1/audit")
public class AuditController {
  private final AuditService service;

  public AuditController(AuditService service) {
    this.service = service;
  }

  @GetMapping
  @Roles({"ADMIN", "SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> list(HttpServletRequest request) {
    Input query = Input.query(request.getParameterMap());
    int page = query.num("page").integer().min(1).optionalInt(1);
    int limit = query.num("limit").integer().min(1).max(300).optionalInt(20);
    Integer year = Common.year(query);
    String search = query.str("search").max(160).optional();
    String module = query.str("module").max(120).optional();
    String statut = query.str("statut").max(40).optional();
    query.check();
    return Api.ok(service.list(Math.max(1, page), Math.max(1, limit), Common.yearOrCurrent(year == null || year == 0 ? null : year),
        search == null ? "" : search.strip(), module == null ? "" : module.strip(), statut == null ? "" : statut.strip().toLowerCase(Locale.ROOT)));
  }

  @PostMapping("/seed")
  @Roles({"ADMIN", "SUPER_ADMIN"})
  public ResponseEntity<Map<String, Object>> seed() {
    service.seed(RequestContext.actor());
    return Api.message("Log de démonstration généré");
  }

  @PostMapping("/export")
  @Roles({"ADMIN", "SUPER_ADMIN"})
  public ResponseEntity<byte[]> export(@RequestBody(required = false) JsonNode body) {
    Input input = Input.body(body);
    Integer year = Common.year(input);
    input.check();
    int resolved = Common.yearOrCurrent(year == null || year == 0 ? null : year);
    return ResponseEntity.ok()
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", "attachment; filename=\"audit-" + resolved + ".csv\"")
        .body(service.exportCsv(resolved).getBytes(StandardCharsets.UTF_8));
  }
}
