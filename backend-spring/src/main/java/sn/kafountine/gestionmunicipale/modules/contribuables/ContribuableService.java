package sn.kafountine.gestionmunicipale.modules.contribuables;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.kafountine.gestionmunicipale.shared.audit.Actor;
import sn.kafountine.gestionmunicipale.shared.audit.AuditTrail;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;
import sn.kafountine.gestionmunicipale.shared.validation.Input;

/** Contribuables (cas d'usage et PrismaContribuableRepository côté Node). */
@Service
public class ContribuableService {
  private final Db db;
  private final AuditTrail auditTrail;

  public ContribuableService(Db db, AuditTrail auditTrail) {
    this.db = db;
    this.auditTrail = auditTrail;
  }

  public Map<String, Object> findById(String id) {
    return db.one("SELECT * FROM \"Contribuable\" WHERE \"id\" = :id", Db.params("id", id));
  }

  public Map<String, Object> findByNin(String nin) {
    return db.one("SELECT * FROM \"Contribuable\" WHERE \"nin\" = :nin", Db.params("nin", nin));
  }

  public Map<String, Object> findByTelephone(String telephone) {
    return db.one("SELECT * FROM \"Contribuable\" WHERE \"telephone\" = :telephone LIMIT 1", Db.params("telephone", telephone));
  }

  public Map<String, Object> checkTelephone(String telephone) {
    Map<String, Object> contribuable = findByTelephone(telephone);
    return Api.map("exists", contribuable != null, "contribuable", contribuable);
  }

  /** Chaque mot saisi doit apparaître dans le NIN, le nom, le prénom ou le téléphone. */
  private String where(String search, Boolean isActive, MapSqlParameterSource params) {
    List<String> clauses = new ArrayList<>();
    if (isActive != null) {
      clauses.add("\"isActive\" = :isActive");
      params.addValue("isActive", isActive);
    }
    String[] words = search == null ? new String[0] : search.trim().split("\\s+");
    int i = 0;
    for (String word : words) {
      if (word.isEmpty()) continue;
      String name = "w" + i++;
      clauses.add("(\"nin\" ILIKE :" + name + " OR \"nom\" ILIKE :" + name + " OR \"prenom\" ILIKE :" + name + " OR \"telephone\" ILIKE :" + name + ")");
      // Prisma « contains » n'échappe pas % et _ : même comportement.
      params.addValue(name, "%" + word + "%");
    }
    return clauses.isEmpty() ? "" : " WHERE " + String.join(" AND ", clauses);
  }

  public Map<String, Object> list(String search, Boolean isActive, int page, int limit) {
    MapSqlParameterSource params = new MapSqlParameterSource();
    String where = where(search, isActive, params);
    params.addValue("limit", limit).addValue("offset", (long) (page - 1) * limit);
    List<Map<String, Object>> data = db.list("SELECT * FROM \"Contribuable\"" + where + " ORDER BY \"createdAt\" DESC LIMIT :limit OFFSET :offset", params);
    long total = db.count("SELECT COUNT(*) FROM \"Contribuable\"" + where, params);
    return Api.map("data", data, "meta", Api.map("page", page, "limit", limit, "total", total));
  }

  @Transactional
  public Map<String, Object> create(Map<String, Object> input) {
    String nin = input.get("nin") == null || input.get("nin").toString().isBlank() ? null : input.get("nin").toString().strip();
    String telephone = (String) input.get("telephone");
    if (nin != null && findByNin(nin) != null) {
      throw AppException.conflict("Ce numéro de carte d'identité (NIN) est déjà utilisé par un autre contribuable");
    }
    if (findByTelephone(telephone) != null) {
      throw AppException.conflict("Ce numéro de téléphone est déjà utilisé par un autre contribuable");
    }
    String id = Db.uuid();
    Instant now = Instant.now();
    db.update("""
        INSERT INTO "Contribuable" ("id", "nin", "nom", "prenom", "dateNaiss", "lieuNaiss", "adresse", "telephone", "email", "profession",
          "typeContribuable", "zone", "montantImpot", "isActive", "createdAt", "updatedAt")
        VALUES (:id, :nin, :nom, :prenom, :dateNaiss, :lieuNaiss, :adresse, :telephone, :email, :profession,
          :typeContribuable, :zone, :montantImpot, :isActive, :now, :now)
        """, Db.params("id", id, "nin", nin, "nom", input.get("nom"), "prenom", input.get("prenom"),
        "dateNaiss", date((String) input.get("dateNaiss")), "lieuNaiss", input.get("lieuNaiss"), "adresse", input.get("adresse"),
        "telephone", telephone, "email", blankToNull(input.get("email")), "profession", blankToNull(input.get("profession")),
        "typeContribuable", input.get("typeContribuable") == null || input.get("typeContribuable").toString().isEmpty() ? "PARTICULIER" : input.get("typeContribuable"),
        "zone", blankToNull(input.get("zone")), "montantImpot", input.get("montantImpot") == null ? 0.0 : input.get("montantImpot"),
        "isActive", !Boolean.FALSE.equals(input.get("isActive")), "now", now));
    return findById(id);
  }

  private static Object blankToNull(Object value) {
    return value == null || value.toString().isEmpty() ? null : value;
  }

  /** new Date(chaîne) côté Node : une date invalide fait échouer l'écriture. */
  private static Instant date(String value) {
    Instant instant = Input.parseDate(value);
    if (instant == null) throw new IllegalArgumentException("Date invalide : " + value);
    return instant;
  }

  private static final List<String> UPDATABLE = List.of("nin", "nom", "prenom", "lieuNaiss", "adresse", "telephone", "email", "profession",
      "typeContribuable", "zone", "montantImpot", "isActive");

  @Transactional
  public Map<String, Object> update(String id, Map<String, Object> input) {
    Map<String, Object> existing = findById(id);
    if (existing == null) throw AppException.notFound("Contribuable introuvable");
    Object nin = input.get("nin");
    if (nin != null && !nin.toString().isEmpty() && !nin.equals(existing.get("nin")) && findByNin(nin.toString()) != null) {
      throw AppException.conflict("Ce numéro de carte d'identité (NIN) est déjà utilisé par un autre contribuable");
    }
    Object telephone = input.get("telephone");
    if (telephone != null && !telephone.toString().isEmpty() && !telephone.equals(existing.get("telephone")) && findByTelephone(telephone.toString()) != null) {
      throw AppException.conflict("Ce numéro de téléphone est déjà utilisé par un autre contribuable");
    }
    Map<String, Object> changes = new LinkedHashMap<>();
    for (String key : UPDATABLE) {
      if (input.containsKey(key) && input.get(key) != null) changes.put(key, input.get(key));
    }
    // Un NIN effacé devient NULL : plusieurs fiches sans CNI ne se heurtent pas à l'unicité.
    if ("".equals(changes.get("nin"))) changes.put("nin", null);
    Object dateNaiss = input.get("dateNaiss");
    if (dateNaiss != null && !dateNaiss.toString().isEmpty()) changes.put("dateNaiss", date(dateNaiss.toString()));
    MapSqlParameterSource params = new MapSqlParameterSource("id", id).addValue("updatedAt", java.sql.Timestamp.from(Instant.now()));
    StringBuilder set = new StringBuilder("\"updatedAt\" = :updatedAt");
    changes.forEach((key, value) -> {
      set.append(", \"").append(key).append("\" = :").append(key);
      params.addValue(key, value instanceof Instant instant ? java.sql.Timestamp.from(instant) : value);
    });
    db.update("UPDATE \"Contribuable\" SET " + set + " WHERE \"id\" = :id", params);
    return findById(id);
  }

  private static String plural(long count, String singular, String pluralForm) {
    return count + " " + (count > 1 ? pluralForm : singular);
  }

  /** Refusée si des tickets, actes, dossiers ou motos sont rattachés (la cascade effacerait des recettes). */
  @Transactional
  public void delete(Actor actor, String id) {
    Map<String, Object> existing = findById(id);
    if (existing == null) throw AppException.notFound("Contribuable introuvable");
    Map<String, Object> counts = db.one("""
        SELECT (SELECT COUNT(*) FROM "Transaction" WHERE "contribuableId" = :id) AS tickets,
               (SELECT COUNT(*) FROM "EtatCivilRequest" WHERE "contribuableId" = :id) AS "etatCivil",
               (SELECT COUNT(*) FROM "UrbanismeCase" WHERE "contribuableId" = :id) AS urbanisme,
               (SELECT COUNT(*) FROM "MotoRegistration" WHERE "proprietaireId" = :id) AS motos
        """, Db.params("id", id));
    List<String> parts = new ArrayList<>();
    long tickets = (long) Db.num(counts, "tickets");
    long etatCivil = (long) Db.num(counts, "etatCivil");
    long urbanisme = (long) Db.num(counts, "urbanisme");
    long motos = (long) Db.num(counts, "motos");
    if (tickets > 0) parts.add(plural(tickets, "ticket", "tickets"));
    if (etatCivil > 0) parts.add(plural(etatCivil, "demande d'état civil", "demandes d'état civil"));
    if (urbanisme > 0) parts.add(plural(urbanisme, "dossier d'urbanisme", "dossiers d'urbanisme"));
    if (motos > 0) parts.add(plural(motos, "moto", "motos"));
    if (!parts.isEmpty()) {
      throw AppException.conflict("Suppression impossible : ce contribuable a " + String.join(", ", parts)
          + ". Désactivez plutôt sa fiche pour conserver l'historique.");
    }
    db.update("DELETE FROM \"Contribuable\" WHERE \"id\" = :id", Db.params("id", id));
    String name = ("Suppression de la fiche " + nz(existing.get("prenom")) + " " + nz(existing.get("nom")) + (existing.get("nin") == null ? "" : " (" + existing.get("nin") + ")")).replaceAll("\\s+", " ");
    auditTrail.record(actor, "Suppression contribuable", "Contribuables", name, "warning");
  }

  private static String nz(Object value) {
    return value == null ? "" : value.toString();
  }
}
