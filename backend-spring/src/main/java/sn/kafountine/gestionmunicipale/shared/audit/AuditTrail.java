package sn.kafountine.gestionmunicipale.shared.audit;

import java.time.Year;
import java.util.Map;
import org.springframework.stereotype.Component;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;

/**
 * Journal d'audit (PrismaAuditTrail / PrismaActorDirectory côté Node). Écrit dans la transaction en cours :
 * si l'écriture métier échoue, l'entrée d'audit est annulée avec elle, et inversement.
 */
@Component
public class AuditTrail {
  private final Db db;

  public AuditTrail(Db db) {
    this.db = db;
  }

  public void record(Actor actor, String action, String module, String details) {
    record(actor, action, module, details, "success");
  }

  public void record(Actor actor, String action, String module, String details, String status) {
    Map<String, Object> user = actor.userId() == null ? null
        : db.one("SELECT \"id\", \"nom\", \"prenom\", \"role\" FROM \"User\" WHERE \"id\" = :id", Db.params("id", actor.userId()));
    String userName = user == null ? "Système" : (Db.str(user, "prenom") + " " + Db.str(user, "nom")).trim();
    String role = user != null ? Db.str(user, "role") : actor.role() != null ? actor.role() : "SYSTEME";
    db.update("""
        INSERT INTO "AuditLog" ("id", "userId", "userName", "role", "action", "module", "details", "status", "ipAddress", "year", "timestamp")
        VALUES (:id, :userId, :userName, :role, :action, :module, :details, :status, :ip, :year, CURRENT_TIMESTAMP)
        """, Db.params("id", Db.uuid(), "userId", user == null ? null : Db.str(user, "id"), "userName", userName, "role", role,
        "action", action, "module", module, "details", details, "status", status == null ? "success" : status,
        "ip", actor.ipAddress(), "year", Year.now().getValue()));
  }

  /** Nom affiché d'un agent (PrismaActorDirectory). */
  public String displayName(String userId) {
    if (userId == null) return "Agent municipal";
    Map<String, Object> user = db.one("SELECT \"nom\", \"prenom\" FROM \"User\" WHERE \"id\" = :id", Db.params("id", userId));
    return user == null ? "Agent municipal" : (Db.str(user, "prenom") + " " + Db.str(user, "nom")).trim();
  }
}
