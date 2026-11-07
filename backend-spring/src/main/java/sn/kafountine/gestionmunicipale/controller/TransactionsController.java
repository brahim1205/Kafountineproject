package sn.kafountine.gestionmunicipale.controller;

import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.dto.ApiResponse;
import sn.kafountine.gestionmunicipale.entity.MunicipalTransaction;
import sn.kafountine.gestionmunicipale.security.AuthPrincipal;
import sn.kafountine.gestionmunicipale.service.TransactionService;

@RestController
@RequestMapping("/api/v1/transactions")
public class TransactionsController {
  private final TransactionService service;

  public TransactionsController(TransactionService service) {
    this.service = service;
  }

  @GetMapping("/categories")
  ApiResponse<?> categories() {
    return ApiResponse.ok(service.categories());
  }

  @GetMapping("/categories/{id}/services")
  ApiResponse<?> services(@PathVariable String id) {
    return ApiResponse.ok(service.services(id));
  }

  @GetMapping
  ApiResponse<?> list(@RequestParam(required = false) String search, @RequestParam(required = false) String categorie, @RequestParam(required = false) String statut, @RequestParam(required = false) Integer year, @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int limit) {
    int safePage = Math.max(1, page);
    int safeLimit = Math.min(300, Math.max(1, limit));
    Page<MunicipalTransaction> result = service.list(search, categorie, statut, year, safePage, safeLimit);
    return ApiResponse.ok(result.getContent(), Map.of("page", safePage, "limit", safeLimit, "total", result.getTotalElements()));
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  ApiResponse<?> create(@RequestBody Map<String, Object> input, @AuthenticationPrincipal AuthPrincipal principal) {
    return ApiResponse.ok(service.create(input, principal.userId()));
  }

  @GetMapping("/statistiques")
  ApiResponse<?> statistiques(@RequestParam(required = false) Integer year) {
    return ApiResponse.ok(service.statistiques(year == null ? java.time.Year.now().getValue() : year));
  }

  @GetMapping("/export")
  ResponseEntity<String> export() {
    return ResponseEntity.ok()
      .header(HttpHeaders.CONTENT_TYPE, MediaType.TEXT_PLAIN_VALUE + "; charset=utf-8")
      .body(service.exportCsv());
  }
}
