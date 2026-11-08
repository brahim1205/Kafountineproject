package sn.kafountine.gestionmunicipale.modules.auth;

import java.util.Map;
import org.springframework.stereotype.Component;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;

/** Comptes agents (PrismaUserRepository côté Node). */
@Component
public class UserAccounts {
  private final Db db;

  public UserAccounts(Db db) {
    this.db = db;
  }

  public Map<String, Object> findByEmail(String email) {
    return db.one("SELECT * FROM \"User\" WHERE \"email\" = :email", Db.params("email", email));
  }

  public Map<String, Object> findById(String id) {
    return db.one("SELECT * FROM \"User\" WHERE \"id\" = :id", Db.params("id", id));
  }

  public void updatePassword(String id, String hash) {
    db.update("UPDATE \"User\" SET \"password\" = :hash, \"updatedAt\" = CURRENT_TIMESTAMP WHERE \"id\" = :id", Db.params("id", id, "hash", hash));
  }
}
