package sn.kafountine.gestionmunicipale.dto;

public final class AuthDtos {
  private AuthDtos() {}

  public record LoginRequest(String email, String password) {}
  public record RefreshRequest(String refreshToken) {}
  public record ForgotPasswordRequest(String email) {}
  public record UserSummary(String id, String email, String nom, String prenom, String role) {}
  public record LoginResponse(UserSummary user, String token, String accessToken, String refreshToken) {}
}
