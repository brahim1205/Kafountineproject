package sn.kafountine.gestionmunicipale.modules.etatcivil;

import java.time.Year;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import sn.kafountine.gestionmunicipale.modules.caisse.CaisseService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.kafountine.gestionmunicipale.modules.transactions.TaxCatalog;
import sn.kafountine.gestionmunicipale.shared.audit.Actor;
import sn.kafountine.gestionmunicipale.shared.audit.AuditTrail;
import sn.kafountine.gestionmunicipale.shared.config.JacksonConfig;
import sn.kafountine.gestionmunicipale.shared.domain.ContribuableLookup;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.numbering.NumeroSequence;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;
import sn.kafountine.gestionmunicipale.shared.persistence.Sql;
import sn.kafountine.gestionmunicipale.shared.validation.Common;

/** Demandes d'état civil (EtatCivilService et PrismaEtatCivilRepository côté Node). */
@Service
public class EtatCivilService {
  private static final String SELECT_WITH_RELATIONS = """
      SELECT e.*, c."nom" AS "contribuableNom", c."prenom" AS "contribuablePrenom", c."nin" AS "contribuableNin",
             c."telephone" AS "contribuableTelephone", u."nom" AS "agentNom", u."prenom" AS "agentPrenom"
      FROM "EtatCivilRequest" e
      INNER JOIN "Contribuable" c ON c."id" = e."contribuableId"
      LEFT JOIN "User" u ON u."id" = e."agentId"
      """;
  private static final Map<String, String[]> DOCUMENT_CATALOG = new LinkedHashMap<>();

  static {
    String[][] entries = {
        {"extrait-naissance", "extrait-naissance", "Extrait de naissance", "500"},
        {"extrait de naissance", "extrait-naissance", "Extrait de naissance", "500"},
        {"certificat-residence", "certificat-residence", "Certificat de résidence", "1000"},
        {"certificat de résidence", "certificat-residence", "Certificat de résidence", "1000"},
        {"legalisation-signature", "legalisation-signature", "Légalisation de signature", "1000"},
        {"légalisation de signature", "legalisation-signature", "Légalisation de signature", "1000"},
        {"certificat-vie", "certificat-vie", "Certificat de vie", "500"},
        {"certificat de vie", "certificat-vie", "Certificat de vie", "500"},
        {"certificat-celibat", "certificat-celibat", "Certificat de célibat", "1000"},
        {"certificat de célibat", "certificat-celibat", "Certificat de célibat", "1000"}};
    for (String[] entry : entries) DOCUMENT_CATALOG.put(entry[0], new String[] {entry[1], entry[2], entry[3]});
  }

  private final Db db;
  private final ContribuableLookup contribuables;
  private final AuditTrail auditTrail;
  private final NumeroSequence numeros;
  private final TaxCatalog catalog;

  private final CaisseService caisse;

  public EtatCivilService(Db db, ContribuableLookup contribuables, AuditTrail auditTrail, NumeroSequence numeros, TaxCatalog catalog, CaisseService caisse) {
    this.caisse = caisse;
    this.db = db;
    this.contribuables = contribuables;
    this.auditTrail = auditTrail;
    this.numeros = numeros;
    this.catalog = catalog;
  }

  /** resolveEtatCivilDocument : { id, nom, tarif }. */
  /** Tarif du catalogue (paramétrable) pour ce type de document, ou null s'il n'y figure pas. */
  private Double tarifOfficiel(String typeDocument) {
    String cle = typeDocument == null ? "" : typeDocument.strip();
    for (Map<String, Object> service : catalog.listServices("etat-civil")) {
      String nom = String.valueOf(service.get("nom"));
      if (cle.equals(String.valueOf(service.get("id"))) || cle.equalsIgnoreCase(nom) || cle.equalsIgnoreCase(DocumentLabels.label(nom))) {
        return service.get("tarif") instanceof Number n ? n.doubleValue() : null;
      }
    }
    return null;
  }

  private static boolean superAdmin(Actor actor) {
    return actor != null && "SUPER_ADMIN".equalsIgnoreCase(actor.role());
  }

  static String[] resolveDocument(String typeDocument) {
    String normalized = typeDocument.strip().toLowerCase(Locale.ROOT);
    String[] known = DOCUMENT_CATALOG.get(normalized);
    return known != null ? known : new String[] {normalized.isEmpty() ? "document" : normalized, typeDocument.strip(), "1000"};
  }

  private static boolean recette(String statut) {
    return "DELIVREE".equals(statut) || "VALIDE".equals(statut);
  }

  static String normalizeStatus(String status) {
    String normalized = status.strip().toUpperCase(Locale.ROOT);
    if (normalized.equals("VALIDE")) return "DELIVREE";
    if (normalized.equals("REJETE")) return "REJETEE";
    if (normalized.equals("DELIVREE") || normalized.equals("REJETEE") || normalized.equals("EN_ATTENTE")) return normalized;
    return "EN_ATTENTE";
  }

  public List<Map<String, Object>> documentTypes() {
    List<Map<String, Object>> result = new ArrayList<>();
    for (Map<String, Object> service : catalog.listServices("etat-civil")) {
      result.add(Api.map("id", service.get("id"), "nom", DocumentLabels.label((String) service.get("nom")), "tarif", service.get("tarif"), "unite", service.get("unite")));
    }
    return result;
  }

  public Map<String, Object> page(int year, String search, String type, String statut, Common.Paging paging) {
    MapSqlParameterSource params = Db.params("year", year, "limit", paging.limit(), "offset", paging.offset());
    StringBuilder where = new StringBuilder(" WHERE e.\"year\" = :year");
    if (!search.isEmpty()) {
      where.append(" AND (e.\"numero\" ILIKE :like OR c.\"nom\" ILIKE :like OR c.\"prenom\" ILIKE :like OR c.\"nin\" ILIKE :like)");
      params.addValue("like", "%" + Sql.escapeLike(search) + "%");
    }
    if (type != null && !type.isEmpty()) {
      where.append(" AND e.\"typeDocument\" = :type");
      params.addValue("type", type);
    }
    if (statut != null && !statut.isEmpty()) {
      where.append(" AND e.\"statut\" = :statut");
      params.addValue("statut", statut);
    }
    List<Map<String, Object>> data = new ArrayList<>();
    for (Map<String, Object> row : db.list(SELECT_WITH_RELATIONS + where + " ORDER BY e.\"createdAt\" DESC, e.\"id\" DESC LIMIT :limit OFFSET :offset", params)) data.add(view(row));
    long total = db.count("SELECT COUNT(*) FROM \"EtatCivilRequest\" e INNER JOIN \"Contribuable\" c ON c.\"id\" = e.\"contribuableId\"" + where, params);
    return Api.map("data", data, "meta", paging.meta(total));
  }

  public List<Map<String, Object>> list(int year) {
    List<Map<String, Object>> result = new ArrayList<>();
    for (Map<String, Object> row : db.list(SELECT_WITH_RELATIONS + " WHERE e.\"year\" = :year ORDER BY e.\"createdAt\" DESC", Db.params("year", year))) {
      result.add(view(row));
    }
    return result;
  }

  private Map<String, Object> findById(String id) {
    return db.one(SELECT_WITH_RELATIONS + " WHERE e.\"id\" = :id LIMIT 1", Db.params("id", id));
  }

  public record Input(String contribuableId, String typeDocument, Integer exemplaires, Double montant, String statut, String observations,
      boolean observationsProvided, String modePaiement) {}

  @Transactional
  public Map<String, Object> create(Actor actor, Input input) {
    String contribuableId = input.contribuableId() == null ? "" : input.contribuableId().strip();
    String typeDocument = input.typeDocument() == null ? "" : input.typeDocument().strip();
    int exemplaires = Math.max(1, input.exemplaires() == null || input.exemplaires() == 0 ? 1 : input.exemplaires());
    String statut = normalizeStatus(input.statut() != null && !input.statut().isEmpty() ? input.statut() : "DELIVREE");
    String observations = input.observations() != null && !input.observations().isEmpty() ? input.observations().strip() : null;
    if (contribuableId.isEmpty() || typeDocument.isEmpty()) throw AppException.validation("Le contribuable et le type de document sont requis.");
    Map<String, Object> contribuable = contribuables.findById(contribuableId);
    if (contribuable == null) throw AppException.notFound("Contribuable introuvable.");
    String[] documentType = resolveDocument(typeDocument);
    int year = Year.now().getValue();
    Double tarif = tarifOfficiel(typeDocument);
    // Le montant suit le tarif officiel : seul le super administrateur peut saisir un autre montant (reprise, correction).
    double montant = superAdmin(actor) && input.montant() != null
        ? input.montant()
        : (tarif != null ? tarif : Double.parseDouble(documentType[2])) * exemplaires;
    if (montant < 0) throw AppException.validation("Le montant de la demande d'état civil est invalide.");
    if (recette(statut)) caisse.assertOuverte(actor.userId(), Instant.now());
    String numero = numeros.next(NumeroSequence.Series.ETAT_CIVIL, year);
    Map<String, Object> row = db.one("""
        INSERT INTO "EtatCivilRequest" ("id", "numero", "contribuableId", "agentId", "typeDocument", "exemplaires", "montant", "statut", "observations", "year", "modePaiement", "encaisseLe", "encaissePar", "createdAt", "updatedAt")
        VALUES (:id, :numero, :contribuableId, :agentId, :typeDocument, :exemplaires, :montant, :statut, :observations, :year, :mode, :encaisseLe, :encaissePar, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
        """, Db.params("id", Db.uuid(), "numero", numero, "contribuableId", contribuable.get("id"), "agentId", actor.userId(),
        "typeDocument", DocumentLabels.label(documentType[1]), "exemplaires", exemplaires, "montant", montant, "statut", statut,
        "observations", observations, "year", year, "mode", input.modePaiement() == null ? "ESPECE" : input.modePaiement(),
        "encaisseLe", recette(statut) ? Timestamp.from(Instant.now()) : null, "encaissePar", recette(statut) ? actor.userId() : null));
    row.put("contribuableNom", contribuable.get("nom"));
    row.put("contribuablePrenom", contribuable.get("prenom"));
    row.put("contribuableNin", contribuable.get("nin"));
    row.put("contribuableTelephone", contribuable.get("telephone"));
    row.put("agentNom", null);
    row.put("agentPrenom", null);
    auditTrail.record(actor, "Création demande état civil", "État civil", "Demande " + row.get("numero") + " créée pour " + documentType[1]);
    return view(row);
  }

  @Transactional
  public Map<String, Object> update(Actor actor, String id, Input input) {
    Map<String, Object> existing = findById(id);
    if (existing == null) throw AppException.notFound("Demande d'état civil introuvable.");
    Common.assertRecordYearOpen((int) Db.num(existing, "year"));
    String nextContribuableId = input.contribuableId() != null && !input.contribuableId().isEmpty() ? input.contribuableId().strip() : Db.str(existing, "contribuableId");
    Map<String, Object> display = new LinkedHashMap<>(existing);
    if (!nextContribuableId.equals(Db.str(existing, "contribuableId"))) {
      Map<String, Object> contribuable = contribuables.findById(nextContribuableId);
      if (contribuable == null) throw AppException.notFound("Contribuable introuvable.");
      display.put("contribuableNom", contribuable.get("nom"));
      display.put("contribuablePrenom", contribuable.get("prenom"));
      display.put("contribuableNin", contribuable.get("nin"));
      display.put("contribuableTelephone", contribuable.get("telephone"));
    }
    String typeDocument = input.typeDocument() != null && !input.typeDocument().isEmpty() ? DocumentLabels.label(input.typeDocument()) : Db.str(existing, "typeDocument");
    Object exemplaires = input.exemplaires() != null ? Math.max(1, input.exemplaires()) : existing.get("exemplaires");
    Object montant = input.montant() != null ? input.montant() : existing.get("montant");
    if (!superAdmin(actor)) {
      // Hors super administrateur, le montant est recalculé au tarif officiel du type et du nombre d'exemplaires.
      Double tarif = tarifOfficiel(input.typeDocument() != null && !input.typeDocument().isEmpty() ? input.typeDocument() : typeDocument);
      if (tarif != null) montant = tarif * ((Number) exemplaires).doubleValue();
      else if (input.montant() != null) montant = existing.get("montant");
    }
    String statut = input.statut() != null && !input.statut().isEmpty() ? normalizeStatus(input.statut()) : Db.str(existing, "statut");
    boolean etaitRecette = recette(Db.str(existing, "statut"));
    Object encaisseLe = existing.get("encaisseLe");
    Object encaissePar = existing.get("encaissePar");
    if (recette(statut) != etaitRecette) {
      // La recette entre ou sort de la caisse de la personne qui l'a encaissée.
      caisse.assertOuverte(etaitRecette ? Db.str(existing, "encaissePar") : actor.userId(), etaitRecette ? Db.date(existing, "encaisseLe") : Instant.now());
      encaisseLe = etaitRecette ? null : Timestamp.from(Instant.now());
      encaissePar = etaitRecette ? null : actor.userId();
    } else if (etaitRecette && input.montant() != null && input.montant() != Db.num(existing, "montant")) {
      caisse.assertOuverte(Db.str(existing, "encaissePar"), Db.date(existing, "encaisseLe"));
    }
    String observations;
    if (!input.observationsProvided()) {
      observations = Db.str(existing, "observations");
    } else {
      String trimmed = input.observations() == null ? "" : input.observations().strip();
      observations = trimmed.isEmpty() ? null : trimmed;
    }
    Map<String, Object> row = db.one("""
        UPDATE "EtatCivilRequest" SET "contribuableId" = :contribuableId, "typeDocument" = :typeDocument, "exemplaires" = :exemplaires,
          "montant" = :montant, "statut" = :statut, "observations" = :observations, "encaisseLe" = :encaisseLe, "encaissePar" = :encaissePar,
          "modePaiement" = COALESCE(:mode, "modePaiement"), "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = :id RETURNING *
        """, Db.params("id", id, "contribuableId", nextContribuableId, "typeDocument", typeDocument, "exemplaires", exemplaires, "montant", montant,
        "statut", statut, "observations", observations, "encaisseLe", encaisseLe, "encaissePar", encaissePar, "mode", input.modePaiement()));
    for (String key : List.of("contribuableNom", "contribuablePrenom", "contribuableNin", "contribuableTelephone", "agentNom", "agentPrenom")) {
      row.put(key, display.get(key));
    }
    auditTrail.record(actor, "Mise à jour demande état civil", "État civil", "Demande " + row.get("numero") + " mise à jour",
        "REJETEE".equals(row.get("statut")) ? "warning" : "success");
    return view(row);
  }

  @Transactional
  public void delete(Actor actor, String id) {
    Map<String, Object> existing = findById(id);
    if (existing == null) throw AppException.notFound("Demande d'état civil introuvable.");
    Common.assertRecordYearOpen((int) Db.num(existing, "year"));
    // Un acte délivré est une recette : on la rejette (trace conservée), on ne l'efface jamais.
    if (recette(Db.str(existing, "statut"))) throw AppException.conflict("Cet acte est délivré et compte dans les recettes : rejetez la demande au lieu de la supprimer.");
    db.update("DELETE FROM \"EtatCivilRequest\" WHERE \"id\" = :id", Db.params("id", id));
    auditTrail.record(actor, "Suppression demande état civil", "État civil", "Suppression de la demande " + existing.get("numero"), "warning");
  }

  public Map<String, Object> stats(int year) {
    List<Map<String, Object>> rows = db.list("SELECT \"montant\", \"statut\", \"typeDocument\" FROM \"EtatCivilRequest\" WHERE \"year\" = :year", Db.params("year", year));
    long enAttente = rows.stream().filter(r -> "EN_ATTENTE".equals(r.get("statut"))).count();
    long delivrees = rows.stream().filter(r -> "DELIVREE".equals(r.get("statut")) || "VALIDE".equals(r.get("statut"))).count();
    long rejetees = rows.stream().filter(r -> "REJETEE".equals(r.get("statut")) || "REJETE".equals(r.get("statut"))).count();
    double recettes = 0;
    // Par type d'acte : demandes, actes délivrés et recettes, du plus demandé au moins demandé.
    Map<String, Map<String, Object>> parType = new LinkedHashMap<>();
    for (Map<String, Object> row : rows) {
      boolean encaissee = recette(Db.str(row, "statut"));
      if (encaissee) recettes += Db.num(row, "montant");
      String type = DocumentLabels.label(Db.str(row, "typeDocument"));
      Map<String, Object> ligne = parType.computeIfAbsent(type, t -> Api.map("type", t, "demandes", 0L, "delivrees", 0L, "recettes", 0d));
      ligne.put("demandes", (long) ligne.get("demandes") + 1);
      if (encaissee) {
        ligne.put("delivrees", (long) ligne.get("delivrees") + 1);
        ligne.put("recettes", (double) ligne.get("recettes") + Db.num(row, "montant"));
      }
    }
    List<Map<String, Object>> types = new ArrayList<>(parType.values());
    types.sort((x, y) -> Long.compare((long) y.get("demandes"), (long) x.get("demandes")));
    return Api.map("totalDemandes", rows.size(), "demandesEnAttente", enAttente, "demandesDelivrees", delivrees, "demandesRejetees", rejetees,
        "enAttente", enAttente, "validees", delivrees, "recettes", recettes, "parType", types);
  }

  private static Map<String, Object> view(Map<String, Object> row) {
    Map<String, Object> view = new LinkedHashMap<>();
    view.put("id", row.get("id"));
    view.put("numero", row.get("numero"));
    view.put("contribuableId", row.get("contribuableId"));
    view.put("typeDocument", DocumentLabels.label(Db.str(row, "typeDocument")));
    view.put("exemplaires", (long) Db.num(row, "exemplaires"));
    view.put("montant", Db.num(row, "montant"));
    view.put("statut", row.get("statut"));
    String observations = Db.str(row, "observations");
    if (observations != null && !observations.isEmpty()) view.put("observations", observations);
    String created = JacksonConfig.iso(Db.date(row, "createdAt"));
    view.put("date", created);
    view.put("createdAt", created);
    view.put("updatedAt", JacksonConfig.iso(Db.date(row, "updatedAt")));
    String agentPrenom = Db.str(row, "agentPrenom");
    String agentNom = Db.str(row, "agentNom");
    view.put("agent", agentPrenom != null && !agentPrenom.isEmpty() && agentNom != null && !agentNom.isEmpty() ? (agentPrenom + " " + agentNom).strip() : "Agent État Civil");
    view.put("contribuable", Api.map("id", row.get("contribuableId"), "nom", row.get("contribuableNom"), "prenom", row.get("contribuablePrenom"),
        "nin", row.get("contribuableNin"), "telephone", row.get("contribuableTelephone")));
    return view;
  }
}
