package sn.kafountine.gestionmunicipale.dto;

public final class PortalDtos {
  private PortalDtos() {}

  public record LoginRequest(String nin, String telephone) {}
  public record RegisterRequest(String nin, String nom, String prenom, String telephone, String adresse, String lieuNaiss, String dateNaiss) {}
  public record PaymentConfirmRequest(String transactionId, String reference) {}
}
