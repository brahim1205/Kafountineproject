package sn.kafountine.gestionmunicipale.modules.formations;

import java.time.Instant;
import java.time.Year;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.kafountine.gestionmunicipale.shared.audit.Actor;
import sn.kafountine.gestionmunicipale.shared.audit.AuditTrail;
import sn.kafountine.gestionmunicipale.shared.config.JacksonConfig;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;
import sn.kafountine.gestionmunicipale.shared.text.Js;

/** Formations et jeunes (FormationService et PrismaFormationRepository côté Node). */
@Service
public class FormationService {
  private static final String ZERO_COUNTS = "0::int AS \"nombreInscrits\", 0::int AS \"nombreCertifies\"";
  private final Db db;
  private final AuditTrail auditTrail;

  public FormationService(Db db, AuditTrail auditTrail) {
    this.db = db;
    this.auditTrail = auditTrail;
  }

  private static boolean truthy(String value) {
    return value != null && !value.isEmpty();
  }

  private static String nz(String value) {
    return value == null ? "" : value.strip();
  }

  static String normalizeStatus(String status) {
    String normalized = status.strip().toUpperCase(Locale.ROOT);
    return List.of("PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE").contains(normalized) ? normalized : "PLANIFIEE";
  }

  public List<Map<String, Object>> listFormations(int year) {
    List<Map<String, Object>> result = new ArrayList<>();
    for (Map<String, Object> row : db.list("""
        SELECT f.*, COALESCE(COUNT(e."id"), 0)::int AS "nombreInscrits",
               COALESCE(SUM(CASE WHEN e."statutFinal" = 'Certifié' THEN 1 ELSE 0 END), 0)::int AS "nombreCertifies"
        FROM "TrainingProgram" f
        LEFT JOIN "YouthEnrollment" e ON e."formationId" = f."id"
        WHERE f."year" = :year
        GROUP BY f."id"
        ORDER BY f."dateDebut" DESC, f."createdAt" DESC, f."id"
        """, Db.params("year", year))) {
      result.add(formationView(row));
    }
    return result;
  }

  private Map<String, Object> findProgram(String id) {
    return db.one("SELECT f.*, " + ZERO_COUNTS + " FROM \"TrainingProgram\" f WHERE f.\"id\" = :id LIMIT 1", Db.params("id", id));
  }

  public record FormationInput(String nom, String domaine, String duree, String responsable, Double budget, String dateDebut, String dateFin, String statut, Integer year) {}

  @Transactional
  public Map<String, Object> createFormation(Actor actor, FormationInput input) {
    String nom = nz(input.nom());
    String domaine = nz(input.domaine());
    String duree = nz(input.duree());
    String responsable = nz(input.responsable());
    double budget = input.budget() == null ? 0 : input.budget();
    Instant dateDebut = Js.parseDate(input.dateDebut());
    Instant dateFin = Js.parseDate(input.dateFin());
    String statut = normalizeStatus(truthy(input.statut()) ? input.statut() : "PLANIFIEE");
    if (nom.isEmpty() || domaine.isEmpty() || duree.isEmpty() || responsable.isEmpty() || dateDebut == null || dateFin == null) {
      throw AppException.validation("Les informations de formation sont incomplètes.");
    }
    int year = input.year() != null && input.year() != 0 ? input.year() : dateDebut.atZone(ZoneId.systemDefault()).getYear();
    Map<String, Object> created = db.one("""
        INSERT INTO "TrainingProgram" ("id","nom","domaine","duree","responsable","budget","dateDebut","dateFin","statut","year","createdAt","updatedAt")
        VALUES (:id,:nom,:domaine,:duree,:responsable,:budget,:dateDebut,:dateFin,:statut,:year,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
        RETURNING *,
        """ + ZERO_COUNTS, Db.params("id", Db.uuid(), "nom", nom, "domaine", domaine, "duree", duree, "responsable", responsable, "budget", budget,
        "dateDebut", dateDebut, "dateFin", dateFin, "statut", statut, "year", year));
    auditTrail.record(actor, "Création formation", "Formations", "Formation " + created.get("nom") + " créée");
    return formationView(created);
  }

  private static Instant date(String value) {
    Instant instant = Js.parseDate(value);
    if (instant == null) throw new IllegalArgumentException("Invalid Date");
    return instant;
  }

  @Transactional
  public Map<String, Object> updateFormation(Actor actor, String id, FormationInput input) {
    Map<String, Object> existing = findProgram(id);
    if (existing == null) throw AppException.notFound("Formation introuvable.");
    Map<String, Object> updated = db.one("""
        UPDATE "TrainingProgram" SET "nom" = :nom, "domaine" = :domaine, "duree" = :duree, "responsable" = :responsable, "budget" = :budget,
          "dateDebut" = :dateDebut, "dateFin" = :dateFin, "statut" = :statut, "year" = :year, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = :id RETURNING *,
        """ + ZERO_COUNTS, Db.params("id", id, "nom", truthy(input.nom()) ? input.nom().strip() : existing.get("nom"),
        "domaine", truthy(input.domaine()) ? input.domaine().strip() : existing.get("domaine"),
        "duree", truthy(input.duree()) ? input.duree().strip() : existing.get("duree"),
        "responsable", truthy(input.responsable()) ? input.responsable().strip() : existing.get("responsable"),
        "budget", input.budget() == null ? existing.get("budget") : input.budget(),
        "dateDebut", truthy(input.dateDebut()) ? date(input.dateDebut()) : existing.get("dateDebut"),
        "dateFin", truthy(input.dateFin()) ? date(input.dateFin()) : existing.get("dateFin"),
        "statut", truthy(input.statut()) ? normalizeStatus(input.statut()) : existing.get("statut"),
        "year", input.year() != null && input.year() != 0 ? input.year() : existing.get("year")));
    auditTrail.record(actor, "Mise à jour formation", "Formations", "Formation " + updated.get("nom") + " mise à jour");
    return formationView(updated);
  }

  @Transactional
  public void deleteFormation(Actor actor, String id) {
    Map<String, Object> existing = findProgram(id);
    if (existing == null) throw AppException.notFound("Formation introuvable.");
    db.update("DELETE FROM \"TrainingProgram\" WHERE \"id\" = :id", Db.params("id", id));
    auditTrail.record(actor, "Suppression formation", "Formations", "Formation " + existing.get("nom") + " supprimée", "warning");
  }

  private static List<Map<String, Object>> distribution(List<Map<String, Object>> items, String key) {
    Map<String, Long> counts = new LinkedHashMap<>();
    for (Map<String, Object> item : items) counts.merge(Db.str(item, key), 1L, Long::sum);
    List<Map<String, Object>> result = new ArrayList<>();
    counts.forEach((value, nombre) -> result.add(Api.map(key, value, "nombre", nombre, "pourcentage", items.isEmpty() ? 0 : Math.round((double) nombre / items.size() * 100))));
    return result;
  }

  public Map<String, Object> stats(int year) {
    List<Map<String, Object>> formations = db.list("SELECT \"domaine\",\"statut\",\"budget\" FROM \"TrainingProgram\" WHERE \"year\" = :year", Db.params("year", year));
    List<Map<String, Object>> jeunes = db.list("SELECT \"sexe\" FROM \"YouthProfile\" WHERE \"year\" = :year", Db.params("year", year));
    List<Map<String, Object>> enrollments = db.list("""
        SELECT e."statutFinal" FROM "YouthEnrollment" e INNER JOIN "TrainingProgram" f ON f."id" = e."formationId" WHERE f."year" = :year
        """, Db.params("year", year));
    long certifies = enrollments.stream().filter(e -> "Certifié".equals(e.get("statutFinal"))).count();
    double budget = 0;
    for (Map<String, Object> f : formations) budget += Db.num(f, "budget");
    return Api.map("totalFormations", formations.size(),
        "formationsEnCours", formations.stream().filter(f -> "EN_COURS".equals(f.get("statut"))).count(),
        "formationsTerminees", formations.stream().filter(f -> "TERMINEE".equals(f.get("statut"))).count(),
        "totalJeunes", jeunes.size(), "totalJeunesFormes", jeunes.size(), "certifies", certifies, "totalCertifies", certifies,
        "tauxReussiteGlobal", enrollments.isEmpty() ? 0 : Math.round((double) certifies / enrollments.size() * 100), "budgetTotal", budget,
        "repartitionDomaines", distribution(formations, "domaine"), "repartitionSexe", distribution(jeunes, "sexe"),
        "evolutionAnnuelle", List.of(Api.map("annee", year, "nombre", formations.size())));
  }

  @SuppressWarnings("unchecked")
  public List<Map<String, Object>> listJeunes(int year, String search, Integer limit) {
    Map<String, Map<String, Object>> grouped = new LinkedHashMap<>();
    for (Map<String, Object> row : db.list("""
        SELECT j.*, e."formationId", e."dateInscription", e."tauxAssiduite", e."statutFinal", e."presences", e."absences"
        FROM "YouthProfile" j LEFT JOIN "YouthEnrollment" e ON e."jeuneId" = j."id"
        WHERE j."year" = :year ORDER BY j."createdAt" DESC
        """, Db.params("year", year))) {
      Map<String, Object> view = youthView(row);
      String id = Db.str(row, "id");
      if (!grouped.containsKey(id)) {
        grouped.put(id, view);
      } else if (truthy(Db.str(row, "formationId"))) {
        ((List<Object>) grouped.get(id).get("formations")).addAll((List<Object>) view.get("formations"));
      }
    }
    List<Map<String, Object>> values = new ArrayList<>();
    for (Map<String, Object> item : grouped.values()) {
      if (search.isEmpty() || (item.get("nom") + " " + item.get("prenom") + " " + item.get("cni") + " " + item.get("telephone")).toLowerCase(Locale.ROOT).contains(search)) values.add(item);
    }
    return limit != null && limit != 0 ? values.subList(0, Math.min(limit, values.size())) : values;
  }

  public record YouthInput(String nom, String prenom, String cni, String telephone, String adresse, String niveauEtude, String sexe, String dateNaiss, String photo, Integer year) {}

  @Transactional
  public Map<String, Object> createJeune(Actor actor, YouthInput input) {
    String cni = nz(input.cni());
    String telephone = nz(input.telephone());
    if (!truthy(input.nom()) || !truthy(input.prenom()) || cni.isEmpty() || telephone.isEmpty()) throw AppException.validation("Les informations du jeune sont incomplètes.");
    if (db.one("SELECT \"id\" FROM \"YouthProfile\" WHERE \"cni\" = :cni OR \"telephone\" = :telephone LIMIT 1", Db.params("cni", cni, "telephone", telephone)) != null) {
      throw AppException.conflict("Un jeune avec ce CNI ou ce téléphone existe déjà.");
    }
    Map<String, Object> created = db.one("""
        INSERT INTO "YouthProfile" ("id","nom","prenom","cni","telephone","adresse","niveauEtude","sexe","dateNaiss","photo","year","createdAt","updatedAt")
        VALUES (:id,:nom,:prenom,:cni,:telephone,:adresse,:niveauEtude,:sexe,:dateNaiss,:photo,:year,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING *
        """, Db.params("id", Db.uuid(), "nom", input.nom().strip(), "prenom", input.prenom().strip(), "cni", cni, "telephone", telephone,
        "adresse", nz(input.adresse()), "niveauEtude", nz(input.niveauEtude()), "sexe", nz(input.sexe()), "dateNaiss", date(input.dateNaiss()),
        "photo", truthy(input.photo()) ? input.photo() : null, "year", input.year() != null && input.year() != 0 ? input.year() : Year.now().getValue()));
    auditTrail.record(actor, "Création profil jeune", "Formations", "Jeune " + created.get("prenom") + " " + created.get("nom") + " créé");
    return youthView(created);
  }

  @Transactional
  public void deleteJeune(Actor actor, String id) {
    Map<String, Object> existing = db.one("SELECT \"id\",\"nom\",\"prenom\" FROM \"YouthProfile\" WHERE \"id\" = :id LIMIT 1", Db.params("id", id));
    if (existing == null) throw AppException.notFound("Jeune introuvable.");
    db.update("DELETE FROM \"YouthProfile\" WHERE \"id\" = :id", Db.params("id", id));
    auditTrail.record(actor, "Suppression profil jeune", "Formations", "Jeune " + existing.get("prenom") + " " + existing.get("nom") + " supprimé", "warning");
  }

  @Transactional
  public void inscrire(Actor actor, String jeuneId, String formationId) {
    if (db.one("SELECT \"id\" FROM \"YouthEnrollment\" WHERE \"jeuneId\" = :j AND \"formationId\" = :f LIMIT 1", Db.params("j", jeuneId, "f", formationId)) != null) {
      throw AppException.conflict("Ce jeune est déjà inscrit à cette formation.");
    }
    db.update("""
        INSERT INTO "YouthEnrollment" ("id","jeuneId","formationId","dateInscription","tauxAssiduite","statutFinal","presences","absences","createdAt","updatedAt")
        VALUES (:id, :j, :f, CURRENT_TIMESTAMP, 0, 'En cours', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """, Db.params("id", Db.uuid(), "j", jeuneId, "f", formationId));
    auditTrail.record(actor, "Inscription jeune", "Formations", "Jeune " + jeuneId + " inscrit à la formation " + formationId);
  }

  /** Assiduité minimale pour être certifié à la clôture de la session (en %). */
  public static final int SEUIL_CERTIFICATION = 75;

  /** Taux d'assiduité arrondi : présences ÷ séances pointées ; 0 tant qu'aucune séance n'est pointée. */
  public static long tauxAssiduite(long presences, long absences) {
    long seances = presences + absences;
    return seances == 0 ? 0 : Math.round(presences * 100.0 / seances);
  }

  /** Statut final à la clôture : certifié au-delà du seuil d'assiduité, non certifié sinon. */
  public static String statutFinal(long presences, long absences) {
    return presences + absences > 0 && tauxAssiduite(presences, absences) >= SEUIL_CERTIFICATION ? "Certifié" : "Non certifié";
  }

  private Map<String, Object> inscription(String jeuneId, String formationId) {
    Map<String, Object> row = db.one("""
        SELECT e.*, f."statut" AS "formationStatut" FROM "YouthEnrollment" e INNER JOIN "TrainingProgram" f ON f."id" = e."formationId"
        WHERE e."jeuneId" = :j AND e."formationId" = :f FOR UPDATE OF e
        """, Db.params("j", jeuneId, "f", formationId));
    if (row == null) throw AppException.notFound("Ce jeune n'est pas inscrit à cette formation.");
    return row;
  }

  /** Retire un jeune d'une formation (sa fiche est conservée) ; impossible une fois la session clôturée. */
  @Transactional
  public void desinscrire(Actor actor, String jeuneId, String formationId) {
    Map<String, Object> row = inscription(jeuneId, formationId);
    if ("TERMINEE".equals(row.get("formationStatut"))) throw AppException.conflict("La session est clôturée : son résultat est conservé.");
    db.update("DELETE FROM \"YouthEnrollment\" WHERE \"id\" = :id", Db.params("id", row.get("id")));
    auditTrail.record(actor, "Désinscription jeune", "Formations", "Jeune " + jeuneId + " retiré de la formation " + formationId);
  }

  /** Pointe une séance : présent ou absent ; l'assiduité est recalculée. Seulement pendant la session. */
  @Transactional
  public Map<String, Object> pointer(Actor actor, String jeuneId, String formationId, boolean present) {
    Map<String, Object> row = inscription(jeuneId, formationId);
    if (!"EN_COURS".equals(row.get("formationStatut"))) throw AppException.conflict("Les présences se pointent pendant la session (formation « en cours »).");
    long presences = (long) Db.num(row, "presences") + (present ? 1 : 0);
    long absences = (long) Db.num(row, "absences") + (present ? 0 : 1);
    long taux = tauxAssiduite(presences, absences);
    db.update("""
        UPDATE "YouthEnrollment" SET "presences" = :p, "absences" = :a, "tauxAssiduite" = :t, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = :id
        """, Db.params("p", presences, "a", absences, "t", taux, "id", row.get("id")));
    auditTrail.record(actor, "Présence formation", "Formations", "Jeune " + jeuneId + (present ? " présent" : " absent") + " (formation " + formationId + ")");
    return Api.map("presences", presences, "absences", absences, "tauxAssiduite", taux);
  }

  /** Clôture la session : formation terminée et statut final de chaque inscrit selon son assiduité. */
  @Transactional
  public Map<String, Object> cloturer(Actor actor, String formationId) {
    Map<String, Object> formation = db.one("SELECT * FROM \"TrainingProgram\" WHERE \"id\" = :id FOR UPDATE", Db.params("id", formationId));
    if (formation == null) throw AppException.notFound("Formation introuvable.");
    if ("TERMINEE".equals(formation.get("statut"))) throw AppException.conflict("Cette session est déjà clôturée.");
    long certifies = 0;
    List<Map<String, Object>> inscrits = db.list("SELECT * FROM \"YouthEnrollment\" WHERE \"formationId\" = :f", Db.params("f", formationId));
    for (Map<String, Object> e : inscrits) {
      String statut = statutFinal((long) Db.num(e, "presences"), (long) Db.num(e, "absences"));
      if ("Certifié".equals(statut)) certifies++;
      db.update("UPDATE \"YouthEnrollment\" SET \"statutFinal\" = :s, \"updatedAt\" = CURRENT_TIMESTAMP WHERE \"id\" = :id", Db.params("s", statut, "id", e.get("id")));
    }
    db.update("UPDATE \"TrainingProgram\" SET \"statut\" = 'TERMINEE', \"updatedAt\" = CURRENT_TIMESTAMP WHERE \"id\" = :id", Db.params("id", formationId));
    auditTrail.record(actor, "Clôture formation", "Formations", "Formation " + formation.get("nom") + " clôturée : " + certifies + " certifié(s) sur " + inscrits.size());
    return Api.map("inscrits", inscrits.size(), "certifies", certifies, "seuil", SEUIL_CERTIFICATION);
  }

  /** Données de l'attestation d'un jeune certifié (numéro stable dérivé de son inscription). */
  public Map<String, Object> attestation(String jeuneId, String formationId) {
    Map<String, Object> row = db.one("""
        SELECT e."id" AS "inscriptionId", e."statutFinal", e."tauxAssiduite", e."presences", e."absences",
               j."nom", j."prenom", j."cni", j."sexe", j."dateNaiss",
               f."nom" AS "formation", f."domaine", f."duree", f."responsable", f."dateDebut", f."dateFin", f."year", f."statut"
        FROM "YouthEnrollment" e INNER JOIN "YouthProfile" j ON j."id" = e."jeuneId" INNER JOIN "TrainingProgram" f ON f."id" = e."formationId"
        WHERE e."jeuneId" = :j AND e."formationId" = :f
        """, Db.params("j", jeuneId, "f", formationId));
    if (row == null) throw AppException.notFound("Ce jeune n'est pas inscrit à cette formation.");
    if (!"Certifié".equals(row.get("statutFinal"))) throw AppException.conflict("L'attestation est délivrée aux jeunes certifiés, après la clôture de la session.");
    String numero = "ATT-" + row.get("year") + "-" + Db.str(row, "inscriptionId").replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
    return Api.map("numero", numero, "nom", row.get("nom"), "prenom", row.get("prenom"), "cni", row.get("cni"), "sexe", row.get("sexe"),
        "dateNaissance", JacksonConfig.iso(Db.date(row, "dateNaiss")), "formation", row.get("formation"), "domaine", row.get("domaine"),
        "duree", row.get("duree"), "responsable", row.get("responsable"), "dateDebut", JacksonConfig.iso(Db.date(row, "dateDebut")),
        "dateFin", JacksonConfig.iso(Db.date(row, "dateFin")), "tauxAssiduite", Db.num(row, "tauxAssiduite"));
  }

  private static Map<String, Object> formationView(Map<String, Object> row) {
    long inscrits = (long) Db.num(row, "nombreInscrits");
    long certifies = (long) Db.num(row, "nombreCertifies");
    return Api.map("id", row.get("id"), "nom", row.get("nom"), "domaine", row.get("domaine"), "duree", row.get("duree"), "responsable", row.get("responsable"),
        "budget", Db.num(row, "budget"), "dateDebut", JacksonConfig.iso(Db.date(row, "dateDebut")), "dateFin", JacksonConfig.iso(Db.date(row, "dateFin")),
        "statut", row.get("statut"), "nombreInscrits", inscrits, "nombreCertifies", certifies,
        "tauxReussite", inscrits > 0 ? Math.round((double) certifies / inscrits * 100) : 0, "year", row.get("year"));
  }

  private static Map<String, Object> youthView(Map<String, Object> row) {
    List<Object> formations = new ArrayList<>();
    if (truthy(Db.str(row, "formationId"))) {
      Instant inscription = Db.date(row, "dateInscription");
      Map<String, Object> f = new LinkedHashMap<>();
      f.put("formationId", row.get("formationId"));
      if (inscription != null) f.put("dateInscription", JacksonConfig.iso(inscription));
      f.put("tauxAssiduite", Db.num(row, "tauxAssiduite"));
      f.put("statutFinal", truthy(Db.str(row, "statutFinal")) ? row.get("statutFinal") : "En cours");
      f.put("presences", (long) Db.num(row, "presences"));
      f.put("absences", (long) Db.num(row, "absences"));
      formations.add(f);
    }
    return Api.map("id", row.get("id"), "nom", row.get("nom"), "prenom", row.get("prenom"), "cni", row.get("cni"), "telephone", row.get("telephone"),
        "adresse", row.get("adresse"), "niveauEtude", row.get("niveauEtude"), "sexe", row.get("sexe"), "dateNaiss", JacksonConfig.iso(Db.date(row, "dateNaiss")),
        "photo", truthy(Db.str(row, "photo")) ? row.get("photo") : null, "createdAt", JacksonConfig.iso(Db.date(row, "createdAt")), "year", row.get("year"), "formations", formations);
  }
}
