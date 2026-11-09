package sn.kafountine.gestionmunicipale.modules.notifications;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.Year;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.kafountine.gestionmunicipale.shared.audit.Actor;
import sn.kafountine.gestionmunicipale.shared.audit.AuditTrail;
import sn.kafountine.gestionmunicipale.shared.config.JacksonConfig;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;

/** Notifications et années (NotificationService et PrismaNotificationRepository côté Node). */
@Service
public class NotificationService {
  private final Db db;
  private final AuditTrail auditTrail;

  public NotificationService(Db db, AuditTrail auditTrail) {
    this.db = db;
    this.auditTrail = auditTrail;
  }

  /** Trois notifications de départ pour une année qui n'en a aucune. */
  void ensureSeed(int year) {
    long count = db.count("SELECT COUNT(*)::bigint AS count FROM \"AppNotification\" WHERE \"year\" = :year", Db.params("year", year));
    if (count > 0) return;
    Timestamp now = Timestamp.from(Instant.now());
    String sql = "INSERT INTO \"AppNotification\" (\"id\",\"userId\",\"type\",\"titre\",\"message\",\"montant\",\"contribuable\",\"agent\",\"lu\",\"readAt\",\"year\",\"createdAt\",\"updatedAt\")"
        + " VALUES (:id1, NULL, 'alerte', 'Suivi recouvrement', 'Vérifier les transactions en attente du mois courant.', NULL, NULL, NULL, false, NULL, :year, :now, :now),"
        + " (:id2, NULL, 'info', 'Sauvegarde recommandée', 'Planifier une sauvegarde applicative avant le prochain déploiement.', NULL, NULL, NULL, false, NULL, :year, :now, :now),"
        + " (:id3, NULL, 'succes', 'Année active', :message, NULL, NULL, NULL, false, NULL, :year, :now, :now)";
    db.update(sql, Db.params("id1", Db.uuid(), "id2", Db.uuid(), "id3", Db.uuid(), "year", year, "now", now,
        "message", "L’année " + year + " est disponible pour la saisie et la consultation."));
  }

  public List<Map<String, Object>> list(Object year, Object limit, String userId) {
    // Paramètres non validés côté Node : une valeur non numérique échoue en base.
    ensureSeedLoose(year);
    List<Map<String, Object>> result = new ArrayList<>();
    for (Map<String, Object> row : db.list("SELECT * FROM \"AppNotification\" WHERE \"year\" = :year AND (\"userId\" IS NULL OR \"userId\" = :userId) ORDER BY \"createdAt\" DESC LIMIT :limit",
        Db.params("year", year, "limit", limit, "userId", userId))) {
      result.add(view(row));
    }
    return result;
  }

  private void ensureSeedLoose(Object year) {
    if (year instanceof Integer y) {
      ensureSeed(y);
    } else {
      throw new IllegalArgumentException("Année invalide : " + year);
    }
  }

  @Transactional
  public void markRead(String id, String userId) {
    int count = db.update("UPDATE \"AppNotification\" SET \"lu\" = true, \"readAt\" = CURRENT_TIMESTAMP, \"updatedAt\" = CURRENT_TIMESTAMP WHERE \"id\" = :id AND (\"userId\" IS NULL OR \"userId\" = :userId)",
        Db.params("id", id, "userId", userId));
    if (count == 0) throw AppException.notFound("Notification introuvable.");
  }

  public void markAllRead(int year, String userId) {
    db.update("UPDATE \"AppNotification\" SET \"lu\" = true, \"readAt\" = CURRENT_TIMESTAMP, \"updatedAt\" = CURRENT_TIMESTAMP WHERE \"year\" = :year AND \"lu\" = false AND (\"userId\" IS NULL OR \"userId\" = :userId)",
        Db.params("year", year, "userId", userId));
  }

  public List<Map<String, Object>> listYears() {
    List<Integer> years = new ArrayList<>();
    for (Map<String, Object> row : db.list("""
        SELECT DISTINCT "year"::int AS "year" FROM "Transaction"
        UNION SELECT DISTINCT "year"::int AS "year" FROM "BudgetLine"
        UNION SELECT DISTINCT "year"::int AS "year" FROM "BudgetRequest"
        UNION SELECT DISTINCT "year"::int AS "year" FROM "AuditLog"
        UNION SELECT DISTINCT "year"::int AS "year" FROM "EtatCivilRequest"
        UNION SELECT DISTINCT "year"::int AS "year" FROM "UrbanismeCase"
        UNION SELECT DISTINCT "year"::int AS "year" FROM "MarketPlace"
        UNION SELECT DISTINCT "year"::int AS "year" FROM "MotoRegistration"
        UNION SELECT DISTINCT "year"::int AS "year" FROM "TrainingProgram"
        UNION SELECT DISTINCT "year"::int AS "year" FROM "Fisherman"
        UNION SELECT DISTINCT "year"::int AS "year" FROM "AppNotification"
        ORDER BY "year" DESC
        """)) {
      years.add((int) Db.num(row, "year"));
    }
    int current = Year.now().getValue();
    if (years.isEmpty()) years.add(current);
    List<Map<String, Object>> result = new ArrayList<>();
    for (int year : years) result.add(Api.map("annee", year, "estActive", year == current));
    return result;
  }

  public Map<String, Object> currentYear() {
    return Api.map("annee", Year.now().getValue(), "estActive", true);
  }

  @Transactional
  public Map<String, Object> openCurrentYear(Actor actor) {
    int current = Year.now().getValue();
    ensureSeed(current);
    auditTrail.record(actor, "Disponibilisation année", "Paramètres", "Année " + current + " rendue disponible dans l’application");
    return Api.map("annee", current, "estActive", true);
  }

  private static Map<String, Object> view(Map<String, Object> row) {
    Map<String, Object> view = new LinkedHashMap<>();
    view.put("id", row.get("id"));
    view.put("userId", row.get("userId") == null || row.get("userId").toString().isEmpty() ? "system" : row.get("userId"));
    view.put("type", row.get("type"));
    view.put("titre", row.get("titre"));
    view.put("message", row.get("message"));
    view.put("montant", row.get("montant") == null ? null : Db.num(row, "montant"));
    view.put("contribuable", row.get("contribuable"));
    view.put("agent", row.get("agent"));
    view.put("lu", row.get("lu"));
    view.put("timestamp", JacksonConfig.iso(Db.date(row, "createdAt")));
    return view;
  }
}
