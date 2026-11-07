package sn.kafountine.gestionmunicipale.dto;

import java.time.OffsetDateTime;

public final class ContribuableDtos {
  private ContribuableDtos() {}

  public record UpsertRequest(
    String nin,
    String nom,
    String prenom,
    String dateNaiss,
    String lieuNaiss,
    String adresse,
    String telephone,
    String email,
    String profession,
    String typeContribuable,
    String zone,
    Double montantImpot,
    Boolean isActive
  ) {}

  public record Response(
    String id,
    String nin,
    String nom,
    String prenom,
    OffsetDateTime dateNaiss,
    String lieuNaiss,
    String adresse,
    String telephone,
    String email,
    String profession,
    String typeContribuable,
    String zone,
    Double montantImpot,
    Boolean isActive
  ) {}
}
