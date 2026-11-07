package sn.kafountine.gestionmunicipale.controller;

import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.dto.ApiResponse;
import sn.kafountine.gestionmunicipale.dto.UserDtos.Response;
import sn.kafountine.gestionmunicipale.dto.UserDtos.UpsertRequest;
import sn.kafountine.gestionmunicipale.service.UserService;

@RestController
@RequestMapping("/api/v1/users")
public class UsersController {
  private final UserService service;

  public UsersController(UserService service) {
    this.service = service;
  }

  @GetMapping
  ApiResponse<?> list(@RequestParam(required = false) String search, @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "50") int limit) {
    int safePage = Math.max(1, page);
    int safeLimit = Math.min(200, Math.max(1, limit));
    Page<Response> result = service.list(search, safePage, safeLimit);
    return ApiResponse.ok(result.getContent(), Map.of("page", safePage, "limit", safeLimit, "total", result.getTotalElements()));
  }

  @GetMapping("/statistiques")
  ApiResponse<?> stats() {
    return ApiResponse.ok(service.stats());
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  ApiResponse<?> create(@RequestBody UpsertRequest request) {
    return ApiResponse.ok(service.create(request));
  }

  @PutMapping("/{id}")
  ApiResponse<?> update(@PathVariable String id, @RequestBody UpsertRequest request) {
    return ApiResponse.ok(service.update(id, request));
  }

  @DeleteMapping("/{id}")
  ApiResponse<Void> delete(@PathVariable String id) {
    service.delete(id);
    return ApiResponse.message("Utilisateur supprimé avec succès");
  }
}
