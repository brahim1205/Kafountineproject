package sn.kafountine.gestionmunicipale.modules.auth;

import java.time.Instant;
import java.time.Year;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import sn.kafountine.gestionmunicipale.shared.audit.Actor;
import sn.kafountine.gestionmunicipale.shared.audit.AuditTrail;
import sn.kafountine.gestionmunicipale.shared.config.Env;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;
import sn.kafountine.gestionmunicipale.shared.security.JwtTokenService;
import sn.kafountine.gestionmunicipale.shared.security.PasswordPolicy;

/** Cas d'usage d'authentification (Login, Refresh, Logout, Me, ForgotPassword, ChangePassword côté Node). */
@Service
public class AuthService {
  public record Tokens(Map<String, Object> user, String accessToken, String refreshToken) {}

  private final UserAccounts users;
  private final SessionStore sessions;
  private final JwtTokenService tokens;
  private final AuditTrail auditTrail;
  private final Db db;

  public AuthService(UserAccounts users, SessionStore sessions, JwtTokenService tokens, AuditTrail auditTrail, Db db) {
    this.users = users;
    this.sessions = sessions;
    this.tokens = tokens;
    this.auditTrail = auditTrail;
    this.db = db;
  }

  /** Empreinte vérifiée pour un compte inconnu, afin que le temps de réponse ne révèle pas son existence. */
  private static final String UNKNOWN_ACCOUNT_HASH = PasswordPolicy.hash(UUID.randomUUID().toString());

  private static boolean active(Map<String, Object> user) {
    return user != null && Boolean.TRUE.equals(user.get("isActive"));
  }

  private static Map<String, Object> view(Map<String, Object> user) {
    return Api.map("id", user.get("id"), "email", user.get("email"), "nom", user.get("nom"), "prenom", user.get("prenom"), "role", user.get("role"));
  }

  public Tokens login(String email, String password) {
    Map<String, Object> user = users.findByEmail(email);
    boolean passwordMatches = PasswordPolicy.matches(password, user == null ? UNKNOWN_ACCOUNT_HASH : Db.str(user, "password"));
    if (!active(user) || !passwordMatches) {
      throw AppException.unauthorized("Identifiants invalides");
    }
    String sessionId = UUID.randomUUID().toString();
    String userId = Db.str(user, "id");
    return issue(user, userId, sessionId, sessions.generation(userId), view(user));
  }

  private Tokens issue(Map<String, Object> user, String userId, String sessionId, long generation, Map<String, Object> view) {
    String access = tokens.signAccessToken(userId, sessionId, Db.str(user, "role"), generation);
    String refresh = tokens.signRefreshToken(userId, sessionId, generation);
    sessions.save(userId, sessionId, refresh, tokens.refreshTtlSeconds());
    return new Tokens(view, access, refresh);
  }

  /** Génération portée par le jeton ; 0 pour les jetons émis avant son introduction. */
  public static long tokenGeneration(Map<String, Object> payload) {
    return payload.get("gen") instanceof Number number ? number.longValue() : 0;
  }

  public Tokens refresh(String refreshToken) {
    Map<String, Object> payload = tokens.verifyRefreshToken(refreshToken);
    String userId = String.valueOf(payload.get("userId"));
    long generation = sessions.generation(userId);
    if (tokenGeneration(payload) < generation) throw AppException.unauthorized("Refresh token invalide");
    String sessionId = String.valueOf(payload.get("sessionId"));
    String stored = sessions.find(userId, sessionId);
    if (stored == null || !stored.equals(refreshToken)) throw AppException.unauthorized("Refresh token invalide");
    Map<String, Object> user = users.findById(userId);
    if (!active(user)) throw AppException.unauthorized("Utilisateur introuvable");
    return issue(user, userId, sessionId, generation, null);
  }

  public void logout(String userId, String sessionId) {
    if (sessionId == null) return;
    sessions.delete(userId, sessionId);
    sessions.markLoggedOut(sessionId, Env.durationSeconds(Env.JWT_EXPIRES_IN, 900));
  }

  public Map<String, Object> me(String userId) {
    Map<String, Object> user = users.findById(userId);
    if (user == null) throw AppException.notFound("Utilisateur introuvable");
    return view(user);
  }

  /** Demande de réinitialisation : les administrateurs actifs sont notifiés (aucun e-mail n'est envoyé). */
  public String requestPasswordReset(String email) {
    String normalized = email == null ? "" : email.trim().toLowerCase();
    String reply = "Si un compte existe avec cet email, une demande a été transmise à l’administrateur.";
    if (normalized.isEmpty()) return reply;
    Map<String, Object> user = users.findByEmail(normalized);
    if (user != null) {
      List<Map<String, Object>> admins = db.list("SELECT \"id\" FROM \"User\" WHERE \"role\" IN ('ADMIN', 'SUPER_ADMIN') AND \"isActive\" = true",
          Db.params());
      Instant now = Instant.now();
      for (Map<String, Object> admin : admins) {
        db.update("""
            INSERT INTO "AppNotification" ("id","userId","type","titre","message","montant","contribuable","agent","lu","readAt","year","createdAt","updatedAt")
            VALUES (:id, :userId, 'alerte', 'Réinitialisation mot de passe', :message, NULL, NULL, :agent, false, NULL, :year, :now, :now)
            """, Db.params("id", Db.uuid(), "userId", admin.get("id"),
            "message", "Demande de réinitialisation reçue pour " + normalized + ". Un administrateur doit définir un nouveau mot de passe.",
            "agent", (Db.str(user, "prenom") + " " + Db.str(user, "nom")).trim(), "year", Year.now().getValue(), "now", now));
      }
    }
    return reply;
  }

  /** Les autres sessions sont coupées ; la session courante reçoit de nouveaux jetons. */
  public Tokens changePassword(String userId, String sessionId, String role, String ip, String currentPassword, String newPassword) {
    Map<String, Object> user = users.findById(userId);
    if (!active(user) || !PasswordPolicy.matches(currentPassword, Db.str(user, "password"))) {
      throw AppException.unauthorized("Mot de passe actuel incorrect.");
    }
    if (newPassword.equals(currentPassword)) {
      throw AppException.validation("Le nouveau mot de passe doit être différent de l'actuel.");
    }
    PasswordPolicy.validateStrong(newPassword);
    users.updatePassword(userId, PasswordPolicy.hash(newPassword));
    auditTrail.record(new Actor(userId, role, ip), "Changement de mot de passe", "Utilisateurs", "Mot de passe modifié par " + Db.str(user, "email"));
    return issue(user, userId, sessionId, sessions.revokeAll(userId), null);
  }
}
