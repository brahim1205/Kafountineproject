package sn.kafountine.gestionmunicipale.modules.utilisateurs;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.kafountine.gestionmunicipale.modules.auth.SessionStore;
import sn.kafountine.gestionmunicipale.shared.audit.Actor;
import sn.kafountine.gestionmunicipale.shared.audit.AuditTrail;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;
import sn.kafountine.gestionmunicipale.shared.persistence.Sql;
import sn.kafountine.gestionmunicipale.shared.security.PasswordPolicy;

/** Gestion des comptes agents (UtilisateurService + PrismaUtilisateurRepository côté Node). */
@Service
public class UtilisateurService {
  public record UserInput(String email, String nom, String prenom, String role, String telephone, boolean telephoneProvided,
                          String password, Boolean isActive) {}

  private static final Set<String> ASSIGNABLE_ROLES = Set.of("ADMIN", "SUPER_ADMIN", "AGENT", "SERVICE_FINANCES", "QUAI_PECHE", "ETAT_CIVIL", "REGISSEUR");

  private final Db db;
  private final AuditTrail auditTrail;
  private final SessionStore sessions;

  public UtilisateurService(Db db, AuditTrail auditTrail, SessionStore sessions) {
    this.sessions = sessions;
    this.db = db;
    this.auditTrail = auditTrail;
  }

  /** Le régisseur ne gère que les comptes de terrain, jamais l'encadrement ni l'état civil. */
  private static final Set<String> ROLES_GERES_PAR_REGISSEUR = Set.of("AGENT", "QUAI_PECHE", "SERVICE_FINANCES");

  private static void assertPeutGerer(Actor actor, Map<String, Object> cible) {
    if ("REGISSEUR".equals(actor.role()) && !ROLES_GERES_PAR_REGISSEUR.contains(Db.str(cible, "role"))) {
      throw AppException.forbidden("Permissions insuffisantes pour cette action");
    }
  }

  /** Le régisseur consulte les comptes et attribue les rôles ; le reste du compte appartient au super administrateur. */
  private static boolean touchesAutreQueLeRole(UserInput input) {
    return input.email() != null || input.nom() != null || input.prenom() != null || input.telephoneProvided()
        || input.password() != null || input.isActive() != null;
  }

  static String normalizeAssignableRole(String input, String actorRole) {
    String role = (input == null || input.isBlank() ? "AGENT" : input).trim().toUpperCase(Locale.ROOT);
    if (!ASSIGNABLE_ROLES.contains(role)) throw AppException.validation("Rôle utilisateur invalide.");
    if ("REGISSEUR".equals(actorRole) && !ROLES_GERES_PAR_REGISSEUR.contains(role)) {
      throw AppException.validation("Le régisseur ne peut attribuer que les rôles agent, quai de pêche et finances.");
    }
    if (role.equals("SUPER_ADMIN") && !"SUPER_ADMIN".equals(actorRole)) {
      throw AppException.validation("Seul un SUPER_ADMIN peut attribuer le rôle SUPER_ADMIN.");
    }
    return role;
  }

  private static Map<String, Object> view(Map<String, Object> user) {
    return Api.map("id", user.get("id"), "email", user.get("email"), "nom", user.get("nom"), "prenom", user.get("prenom"),
        "role", user.get("role"), "telephone", user.get("telephone"), "isActive", user.get("isActive"), "lastLogin", null,
        "createdAt", user.get("createdAt"));
  }

  private Map<String, Object> findById(String id) {
    return db.one("SELECT * FROM \"User\" WHERE \"id\" = :id", Db.params("id", id));
  }

  private Map<String, Object> findByEmail(String email) {
    return db.one("SELECT * FROM \"User\" WHERE \"email\" = :email", Db.params("email", email));
  }

  public List<Map<String, Object>> list(String search, String actorRole) {
    String term = search == null ? "" : search.trim();
    String where = term.isEmpty() ? "" : """
        WHERE "email" ILIKE :like OR "nom" ILIKE :like OR "prenom" ILIKE :like OR "telephone" ILIKE :like
        """;
    return db.list("SELECT * FROM \"User\" " + where + " ORDER BY \"role\" ASC, \"nom\" ASC, \"prenom\" ASC",
        Db.params("like", "%" + Sql.escapeLike(term) + "%")).stream()
        .filter(user -> !"REGISSEUR".equals(actorRole) || ROLES_GERES_PAR_REGISSEUR.contains(Db.str(user, "role")))
        .map(UtilisateurService::view).toList();
  }

  @Transactional
  public Map<String, Object> create(Actor actor, UserInput input) {
    String email = input.email() == null ? "" : input.email().trim().toLowerCase(Locale.ROOT);
    String nom = input.nom() == null ? "" : input.nom().trim();
    String prenom = input.prenom() == null ? "" : input.prenom().trim();
    String role = normalizeAssignableRole(input.role() == null ? "AGENT" : input.role(), actor.role());
    String telephone = input.telephone() == null || input.telephone().isBlank() ? null : input.telephone().trim();
    String password = input.password() == null ? "" : input.password().trim();
    if (email.isEmpty() || nom.isEmpty() || prenom.isEmpty()) throw AppException.validation("Email, nom et prénom sont requis.");
    if (password.isEmpty()) throw AppException.validation("Le mot de passe est requis.");
    PasswordPolicy.validateStrong(password);
    if (findByEmail(email) != null) throw AppException.conflict("Un utilisateur avec cet email existe déjà.");
    String id = Db.uuid();
    Instant now = Instant.now();
    db.update("""
        INSERT INTO "User" ("id", "email", "password", "nom", "prenom", "role", "telephone", "isActive", "createdAt", "updatedAt")
        VALUES (:id, :email, :password, :nom, :prenom, :role, :telephone, true, :now, :now)
        """, Db.params("id", id, "email", email, "password", PasswordPolicy.hash(password), "nom", nom, "prenom", prenom,
        "role", role, "telephone", telephone, "now", now));
    Map<String, Object> user = findById(id);
    auditTrail.record(actor, "Création utilisateur", "Utilisateurs", "Création du compte " + email + " (" + role + ")");
    return view(user);
  }

  @Transactional
  public Map<String, Object> update(Actor actor, String userId, UserInput input) {
    Map<String, Object> existing = findById(userId);
    if (existing == null) throw AppException.notFound("Utilisateur introuvable.");
    assertPeutGerer(actor, existing);
    if ("REGISSEUR".equals(actor.role()) && touchesAutreQueLeRole(input)) {
      throw AppException.forbidden("Le régisseur peut seulement attribuer un rôle.");
    }
    String nextEmail = input.email() != null && !input.email().isEmpty() ? input.email().trim().toLowerCase(Locale.ROOT) : Db.str(existing, "email");
    if (!nextEmail.equals(Db.str(existing, "email"))) {
      Map<String, Object> duplicate = findByEmail(nextEmail);
      if (duplicate != null && !Db.str(duplicate, "id").equals(userId)) throw AppException.conflict("Un utilisateur avec cet email existe déjà.");
    }
    String nom = input.nom() != null && !input.nom().isEmpty() ? input.nom().trim() : Db.str(existing, "nom");
    String prenom = input.prenom() != null && !input.prenom().isEmpty() ? input.prenom().trim() : Db.str(existing, "prenom");
    String role = input.role() != null && !input.role().isEmpty() ? normalizeAssignableRole(input.role(), actor.role()) : Db.str(existing, "role");
    String telephone = !input.telephoneProvided() ? Db.str(existing, "telephone")
        : input.telephone() == null || input.telephone().trim().isEmpty() ? null : input.telephone().trim();
    boolean isActive = input.isActive() == null ? Boolean.TRUE.equals(existing.get("isActive")) : input.isActive();
    String passwordHash = null;
    if (input.password() != null && !input.password().isEmpty()) {
      String password = input.password().trim();
      PasswordPolicy.validateStrong(password);
      passwordHash = PasswordPolicy.hash(password);
    }
    db.update("""
        UPDATE "User" SET "email" = :email, "nom" = :nom, "prenom" = :prenom, "role" = :role, "telephone" = :telephone,
          "isActive" = :isActive, "password" = COALESCE(:password, "password"), "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = :id
        """, Db.params("id", userId, "email", nextEmail, "nom", nom, "prenom", prenom, "role", role, "telephone", telephone,
        "isActive", isActive, "password", passwordHash));
    if (passwordHash != null || !isActive || !role.equals(Db.str(existing, "role"))) sessions.revokeAll(userId);
    auditTrail.record(actor, "Mise à jour utilisateur", "Utilisateurs", "Mise à jour du compte " + nextEmail);
    return view(findById(userId));
  }

  @Transactional
  public String delete(Actor actor, String userId) {
    if (userId.equals(actor.userId())) throw AppException.validation("Vous ne pouvez pas supprimer votre propre compte.");
    Map<String, Object> existing = findById(userId);
    if (existing == null) throw AppException.notFound("Utilisateur introuvable.");
    assertPeutGerer(actor, existing);
    long transactions = db.count("SELECT COUNT(*) FROM \"Transaction\" WHERE \"agentId\" = :id", Db.params("id", userId));
    if (transactions > 0) {
      db.update("UPDATE \"User\" SET \"isActive\" = false, \"updatedAt\" = CURRENT_TIMESTAMP WHERE \"id\" = :id", Db.params("id", userId));
      sessions.revokeAll(userId);
      auditTrail.record(actor, "Désactivation utilisateur", "Utilisateurs", "Compte " + Db.str(existing, "email") + " désactivé car lié à des transactions");
      return "Utilisateur désactivé car il possède déjà des transactions.";
    }
    db.update("DELETE FROM \"User\" WHERE \"id\" = :id", Db.params("id", userId));
    sessions.revokeAll(userId);
    auditTrail.record(actor, "Suppression utilisateur", "Utilisateurs", "Suppression du compte " + Db.str(existing, "email"));
    return "Suppression effectuée";
  }
}
