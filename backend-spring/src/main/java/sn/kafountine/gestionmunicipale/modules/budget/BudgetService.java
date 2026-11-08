package sn.kafountine.gestionmunicipale.modules.budget;

import java.time.Year;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.kafountine.gestionmunicipale.shared.audit.Actor;
import sn.kafountine.gestionmunicipale.shared.audit.AuditTrail;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;
import sn.kafountine.gestionmunicipale.shared.text.Js;

/** Lignes et demandes budgétaires (BudgetService et PrismaBudgetRepository côté Node). */
@Service
public class BudgetService {
  private static final String LINE_COLUMNS = "\"id\", \"code\", \"libelle\", \"description\", \"prevu\"::float8 AS \"prevu\", \"depense\"::float8 AS \"depense\", \"year\", \"createdAt\", \"updatedAt\"";
  private static final String REQUEST_COLUMNS = "\"id\", \"service\", \"description\", \"montant\"::float8 AS \"montant\", \"statut\", \"motif\", \"year\", \"requestedById\", \"approvedById\", \"createdAt\", \"updatedAt\"";
  /** Séparation des tâches : seul le super administrateur approuve ou rejette (l'administrateur est en consultation). */
  private static final Set<String> DECISION_ROLES = Set.of("SUPER_ADMIN");
  private static final Set<String> DECISION_STATUSES = Set.of("APPROUVE", "REJETE");

  private final Db db;
  private final AuditTrail auditTrail;

  public BudgetService(Db db, AuditTrail auditTrail) {
    this.db = db;
    this.auditTrail = auditTrail;
  }

  private static boolean truthy(String value) {
    return value != null && !value.isEmpty();
  }

  public List<Map<String, Object>> listLines(int year) {
    return db.list("SELECT " + LINE_COLUMNS + " FROM \"BudgetLine\" WHERE \"year\" = :year ORDER BY \"code\" ASC, \"libelle\" ASC", Db.params("year", year));
  }

  private Map<String, Object> findLine(String id) {
    return db.one("SELECT " + LINE_COLUMNS + " FROM \"BudgetLine\" WHERE \"id\" = :id LIMIT 1", Db.params("id", id));
  }

  private Map<String, Object> findLineByCode(String code, int year) {
    return db.one("SELECT " + LINE_COLUMNS + " FROM \"BudgetLine\" WHERE \"code\" = :code AND \"year\" = :year LIMIT 1", Db.params("code", code, "year", year));
  }

  public record LineInput(String code, String libelle, String description, boolean descriptionProvided, Double prevu, Double depense, Integer year) {}

  @Transactional
  public Map<String, Object> createLine(Actor actor, LineInput input) {
    String code = input.code() == null ? "" : input.code().strip().toUpperCase(Locale.ROOT);
    String libelle = input.libelle() == null ? "" : input.libelle().strip();
    String description = truthy(input.description()) ? input.description().strip() : null;
    double prevu = input.prevu() == null ? 0 : input.prevu();
    double depense = input.depense() == null ? 0 : input.depense();
    int year = input.year() != null && input.year() != 0 ? input.year() : Year.now().getValue();
    if (code.isEmpty() || libelle.isEmpty()) throw AppException.validation("Le code et le libellé sont requis.");
    if (prevu < 0 || depense < 0) throw AppException.validation("Les montants budgétaires doivent être positifs.");
    if (findLineByCode(code, year) != null) throw AppException.conflict("Une ligne budgétaire avec ce code existe déjà pour cette année.");
    Map<String, Object> line = db.one("INSERT INTO \"BudgetLine\" (\"id\", \"code\", \"libelle\", \"description\", \"prevu\", \"depense\", \"year\", \"createdAt\", \"updatedAt\")"
        + " VALUES (:id, :code, :libelle, :description, :prevu, :depense, :year, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING " + LINE_COLUMNS,
        Db.params("id", Db.uuid(), "code", code, "libelle", libelle, "description", description, "prevu", prevu, "depense", depense, "year", year));
    auditTrail.record(actor, "Création ligne budgétaire", "Budget", "Création de la ligne " + line.get("code") + " - " + line.get("libelle") + " (" + line.get("year") + ")");
    return line;
  }

  @Transactional
  public Map<String, Object> updateLine(Actor actor, String id, LineInput input) {
    Map<String, Object> existing = findLine(id);
    if (existing == null) throw AppException.notFound("Ligne budgétaire introuvable.");
    String nextCode = truthy(input.code()) ? input.code().strip().toUpperCase(Locale.ROOT) : Db.str(existing, "code");
    int existingYear = (int) Db.num(existing, "year");
    int nextYear = input.year() != null && input.year() != 0 ? input.year() : existingYear;
    if (!nextCode.equals(Db.str(existing, "code")) || nextYear != existingYear) {
      Map<String, Object> duplicate = findLineByCode(nextCode, nextYear);
      if (duplicate != null && !Db.str(duplicate, "id").equals(Db.str(existing, "id"))) {
        throw AppException.conflict("Une ligne budgétaire avec ce code existe déjà pour cette année.");
      }
    }
    double prevu = input.prevu() == null ? Db.num(existing, "prevu") : input.prevu();
    double depense = input.depense() == null ? Db.num(existing, "depense") : input.depense();
    if (prevu < 0 || depense < 0) throw AppException.validation("Les montants budgétaires doivent être positifs.");
    Object description;
    if (!input.descriptionProvided()) {
      description = existing.get("description");
    } else {
      String trimmed = input.description() == null ? "" : input.description().strip();
      description = trimmed.isEmpty() ? null : trimmed;
    }
    Map<String, Object> line = db.one("UPDATE \"BudgetLine\" SET \"code\" = :code, \"libelle\" = :libelle, \"description\" = :description, \"prevu\" = :prevu,"
        + " \"depense\" = :depense, \"year\" = :year, \"updatedAt\" = CURRENT_TIMESTAMP WHERE \"id\" = :id RETURNING " + LINE_COLUMNS,
        Db.params("id", id, "code", nextCode, "libelle", truthy(input.libelle()) ? input.libelle().strip() : existing.get("libelle"),
            "description", description, "prevu", prevu, "depense", depense, "year", nextYear));
    auditTrail.record(actor, "Mise à jour ligne budgétaire", "Budget", "Mise à jour de la ligne " + line.get("code") + " - " + line.get("libelle") + " (" + line.get("year") + ")");
    return line;
  }

  @Transactional
  public void deleteLine(Actor actor, String id) {
    Map<String, Object> existing = findLine(id);
    if (existing == null) throw AppException.notFound("Ligne budgétaire introuvable.");
    db.update("DELETE FROM \"BudgetLine\" WHERE \"id\" = :id", Db.params("id", id));
    auditTrail.record(actor, "Suppression ligne budgétaire", "Budget",
        "Suppression de la ligne " + existing.get("code") + " - " + existing.get("libelle") + " (" + existing.get("year") + ")");
  }

  public Map<String, Object> stats(int year) {
    List<Map<String, Object>> lines = listLines(year);
    List<Map<String, Object>> requests = listRequests(year);
    double prevu = 0;
    double depense = 0;
    for (Map<String, Object> line : lines) {
      prevu += Db.num(line, "prevu");
      depense += Db.num(line, "depense");
    }
    long attente = requests.stream().filter(r -> "EN_ATTENTE".equals(r.get("statut"))).count();
    long approuvees = requests.stream().filter(r -> "APPROUVE".equals(r.get("statut"))).count();
    long rejetees = requests.stream().filter(r -> "REJETE".equals(r.get("statut"))).count();
    return Api.map("totalPrevu", prevu, "totalDepense", depense, "totalReste", prevu - depense,
        "tauxExecution", prevu > 0 ? Math.round(depense / prevu * 100) : 0, "nombreLignes", lines.size(),
        "demandesEnAttente", attente, "demandesApprouvees", approuvees, "demandesRejetees", rejetees);
  }

  public List<Map<String, Object>> listRequests(int year) {
    return db.list("SELECT " + REQUEST_COLUMNS + " FROM \"BudgetRequest\" WHERE \"year\" = :year ORDER BY \"createdAt\" DESC", Db.params("year", year));
  }

  public record RequestInput(String service, String description, Double montant, String statut, String motif, boolean motifProvided, Integer year) {}

  @Transactional
  public Map<String, Object> createRequest(Actor actor, RequestInput input) {
    String service = input.service() == null ? "" : input.service().strip();
    String description = input.description() == null ? "" : input.description().strip();
    double montant = input.montant() == null ? 0 : input.montant();
    int year = input.year() != null && input.year() != 0 ? input.year() : Year.now().getValue();
    if (service.isEmpty() || description.isEmpty()) throw AppException.validation("Le service et la description sont requis.");
    if (montant <= 0) throw AppException.validation("Le montant demandé doit être supérieur à zéro.");
    Map<String, Object> request = db.one("INSERT INTO \"BudgetRequest\" (\"id\", \"service\", \"description\", \"montant\", \"statut\", \"motif\", \"year\", \"requestedById\","
        + " \"approvedById\", \"createdAt\", \"updatedAt\") VALUES (:id, :service, :description, :montant, 'EN_ATTENTE', NULL, :year, :requestedById, NULL,"
        + " CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING " + REQUEST_COLUMNS,
        Db.params("id", Db.uuid(), "service", service, "description", description, "montant", montant, "year", year, "requestedById", actor.userId()));
    auditTrail.record(actor, "Création demande budgétaire", "Budget", "Demande " + request.get("id") + " créée pour " + service + " (" + Js.num(montant) + " FCFA)");
    return request;
  }

  @Transactional
  public Map<String, Object> updateRequest(Actor actor, String id, RequestInput input) {
    Map<String, Object> existing = db.one("SELECT " + REQUEST_COLUMNS + " FROM \"BudgetRequest\" WHERE \"id\" = :id LIMIT 1", Db.params("id", id));
    if (existing == null) throw AppException.notFound("Demande budgétaire introuvable.");
    double existingMontant = Db.num(existing, "montant");
    double montant = input.montant() == null ? existingMontant : input.montant();
    if (montant <= 0) throw AppException.validation("Le montant demandé doit être supérieur à zéro.");
    String existingStatut = Db.str(existing, "statut");
    String nextStatut = truthy(input.statut()) ? input.statut().strip().toUpperCase(Locale.ROOT) : existingStatut;
    if (!nextStatut.equals(existingStatut)) {
      if (!nextStatut.equals("EN_ATTENTE") && !DECISION_STATUSES.contains(nextStatut)) throw AppException.validation("Statut de demande inconnu.");
      if (!DECISION_ROLES.contains(actor.role() == null ? "" : actor.role().toUpperCase(Locale.ROOT))) {
        throw AppException.forbidden("Seul le super administrateur peut approuver ou rejeter une demande de dépense.");
      }
    }
    if (DECISION_STATUSES.contains(existingStatut) && input.montant() != null && montant != existingMontant) {
      throw AppException.validation("Le montant d'une demande déjà décidée ne peut plus être modifié.");
    }
    // L'auteur de la décision n'est enregistré qu'au moment où la demande est approuvée ou rejetée.
    Object approvedById = !nextStatut.equals(existingStatut) && DECISION_STATUSES.contains(nextStatut)
        ? (actor.userId() != null && !actor.userId().isEmpty() ? actor.userId() : existing.get("approvedById"))
        : existing.get("approvedById");
    Object motif;
    if (!input.motifProvided()) {
      motif = existing.get("motif");
    } else {
      String trimmed = input.motif() == null ? "" : input.motif().strip();
      motif = trimmed.isEmpty() ? null : trimmed;
    }
    Map<String, Object> request = db.one("UPDATE \"BudgetRequest\" SET \"service\" = :service, \"description\" = :description, \"montant\" = :montant,"
        + " \"statut\" = :statut, \"motif\" = :motif, \"approvedById\" = :approvedById, \"updatedAt\" = CURRENT_TIMESTAMP WHERE \"id\" = :id RETURNING " + REQUEST_COLUMNS,
        Db.params("id", id, "service", truthy(input.service()) ? input.service().strip() : existing.get("service"),
            "description", truthy(input.description()) ? input.description().strip() : existing.get("description"), "montant", montant,
            "statut", nextStatut, "motif", motif, "approvedById", approvedById));
    auditTrail.record(actor, "Mise à jour demande budgétaire", "Budget", "Demande " + request.get("id") + " mise à jour (" + request.get("statut") + ")");
    return request;
  }
}
