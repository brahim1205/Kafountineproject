package sn.kafountine.gestionmunicipale.dto;

import java.time.OffsetDateTime;

public final class UserDtos {
  private UserDtos() {}

  public record UpsertRequest(
    String email,
    String password,
    String nom,
    String prenom,
    String role,
    String telephone,
    Boolean isActive
  ) {}

  public record Response(
    String id,
    String email,
    String nom,
    String prenom,
    String role,
    String telephone,
    Boolean isActive,
    OffsetDateTime lastLogin,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
  ) {}
}
