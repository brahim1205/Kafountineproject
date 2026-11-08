package sn.kafountine.gestionmunicipale.shared.errors;

/** Erreur métier avec son statut HTTP (équivalent d'AppError côté Node). */
public class AppException extends RuntimeException {
  private final int status;
  private final transient Object details;

  public AppException(int status, String message) {
    this(status, message, null);
  }

  public AppException(int status, String message, Object details) {
    super(message);
    this.status = status;
    this.details = details;
  }

  public int status() {
    return status;
  }

  public Object details() {
    return details;
  }

  public static AppException unauthorized(String message) {
    return new AppException(401, message == null ? "Accès non autorisé" : message);
  }

  public static AppException forbidden(String message) {
    return new AppException(403, message == null ? "Accès interdit" : message);
  }

  public static AppException notFound(String message) {
    return new AppException(404, message == null ? "Ressource introuvable" : message);
  }

  public static AppException conflict(String message) {
    return new AppException(409, message == null ? "Conflit de données" : message);
  }

  public static AppException validation(String message) {
    return new AppException(400, message == null ? "Données invalides" : message);
  }

  public static AppException validation(String message, Object details) {
    return new AppException(400, message == null ? "Données invalides" : message, details);
  }
}
