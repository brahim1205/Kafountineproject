package sn.kafountine.gestionmunicipale.shared.domain;

import java.util.Map;
import org.springframework.stereotype.Component;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;

/** Fiche résumée d'un contribuable, partagée par les modules (PrismaContribuableLookup côté Node). */
@Component
public class ContribuableLookup {
  private final Db db;

  public ContribuableLookup(Db db) {
    this.db = db;
  }

  public Map<String, Object> findById(String id) {
    if (id == null || id.isBlank()) return null;
    return db.one("SELECT \"id\", \"nom\", \"prenom\", \"nin\", \"telephone\", \"adresse\" FROM \"Contribuable\" WHERE \"id\" = :id",
        Db.params("id", id));
  }
}
