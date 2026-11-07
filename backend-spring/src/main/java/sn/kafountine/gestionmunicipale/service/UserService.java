package sn.kafountine.gestionmunicipale.service;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import sn.kafountine.gestionmunicipale.dto.UserDtos.Response;
import sn.kafountine.gestionmunicipale.dto.UserDtos.UpsertRequest;
import sn.kafountine.gestionmunicipale.entity.User;
import sn.kafountine.gestionmunicipale.repository.UserRepository;

@Service
public class UserService {
  private final UserRepository users;
  private final PasswordEncoder passwordEncoder;

  public UserService(UserRepository users, PasswordEncoder passwordEncoder) {
    this.users = users;
    this.passwordEncoder = passwordEncoder;
  }

  public Page<Response> list(String search, int page, int limit) {
    String normalized = search == null || search.isBlank() ? null : search.trim();
    return users.search(normalized, PageRequest.of(page - 1, limit)).map(this::toResponse);
  }

  public Response create(UpsertRequest request) {
    if (request.email() == null || request.password() == null) {
      throw new IllegalArgumentException("Email et mot de passe requis");
    }
    User user = new User();
    user.setId(UUID.randomUUID().toString());
    user.setEmail(request.email());
    user.setPassword(passwordEncoder.encode(request.password()));
    user.setNom(valueOrDefault(request.nom(), ""));
    user.setPrenom(valueOrDefault(request.prenom(), ""));
    user.setRole(valueOrDefault(request.role(), "AGENT"));
    user.setTelephone(request.telephone());
    user.setActive(request.isActive() == null ? true : request.isActive());
    user.setCreatedAt(OffsetDateTime.now());
    user.setUpdatedAt(OffsetDateTime.now());
    return toResponse(users.save(user));
  }

  public Response update(String id, UpsertRequest request) {
    User user = users.findById(id).orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));
    if (request.email() != null) user.setEmail(request.email());
    if (request.password() != null && !request.password().isBlank()) user.setPassword(passwordEncoder.encode(request.password()));
    if (request.nom() != null) user.setNom(request.nom());
    if (request.prenom() != null) user.setPrenom(request.prenom());
    if (request.role() != null) user.setRole(request.role());
    if (request.telephone() != null) user.setTelephone(request.telephone());
    if (request.isActive() != null) user.setActive(request.isActive());
    user.setUpdatedAt(OffsetDateTime.now());
    return toResponse(users.save(user));
  }

  public void delete(String id) {
    users.deleteById(id);
  }

  public Map<String, Object> stats() {
    return Map.of("total", users.count());
  }

  private Response toResponse(User user) {
    return new Response(
      user.getId(),
      user.getEmail(),
      user.getNom(),
      user.getPrenom(),
      user.getRole(),
      user.getTelephone(),
      user.getActive(),
      user.getLastLogin(),
      user.getCreatedAt(),
      user.getUpdatedAt()
    );
  }

  private String valueOrDefault(String value, String fallback) {
    return value == null || value.isBlank() ? fallback : value;
  }
}
