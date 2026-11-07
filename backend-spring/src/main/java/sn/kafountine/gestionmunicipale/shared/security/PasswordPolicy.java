package sn.kafountine.gestionmunicipale.shared.security;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;

/** Politique de mot de passe fort et hachage bcrypt, identiques au backend Node (passwordPolicy.ts, bcryptjs). */
public final class PasswordPolicy {
  /** Même coût que bcryptjs.hash(password, 10) côté Node. */
  private static final BCryptPasswordEncoder ENCODER = new BCryptPasswordEncoder(10);

  private PasswordPolicy() {}

  public static void validateStrong(String password) {
    String value = password == null ? "" : password.trim();
    boolean ok = value.length() >= 12
        && value.matches(".*[A-Z].*")
        && value.matches(".*[a-z].*")
        && value.matches(".*\\d.*")
        && value.matches(".*[^A-Za-z0-9].*");
    if (!ok) {
      throw AppException.validation("Le mot de passe doit contenir au moins 12 caractères, avec majuscule, minuscule, chiffre et caractère spécial.");
    }
  }

  public static String hash(String password) {
    return ENCODER.encode(password);
  }

  public static boolean matches(String password, String hash) {
    if (password == null || hash == null || hash.isBlank()) return false;
    try {
      return ENCODER.matches(password, hash);
    } catch (IllegalArgumentException e) {
      return false;
    }
  }
}
