package sn.kafountine.gestionmunicipale.modules.incidents;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import sn.kafountine.gestionmunicipale.shared.audit.Actor;
import sn.kafountine.gestionmunicipale.shared.audit.AuditTrail;
import sn.kafountine.gestionmunicipale.shared.config.JacksonConfig;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;

/**
 * Incidents techniques : chaque erreur serveur ou navigateur est enregistrée, regroupée avec ses
 * semblables (même origine, même lieu, même message aux identifiants près), puis suivie par le
 * super admin (nouveau, en cours, traité). Un incident traité qui se reproduit redevient nouveau.
 */
@Service
public class IncidentService {
  private static final Logger LOG = LoggerFactory.getLogger(IncidentService.class);
  public static final Set<String> SOURCES = Set.of("serveur", "navigateur");
  public static final Set<String> STATUTS = Set.of("nouveau", "en_cours", "traite");
  static final int CONSERVATION_JOURS = 90;

  private final Db db;
  private final AuditTrail auditTrail;

  public IncidentService(Db db, AuditTrail auditTrail) {
    this.db = db;
    this.auditTrail = auditTrail;
  }

  /** Identifiants et nombres remplacés : « /places/3f2a… » et « /places/91b0… » forment un seul incident. */
  static String normaliser(String texte) {
    return texte
        .replaceAll("(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", ":id")
        .replaceAll("\\d+", ":n");
  }

  static String signature(String source, String lieu, String message) {
    String cle = source + "|" + normaliser(lieu) + "|" + normaliser(message.length() > 300 ? message.substring(0, 300) : message);
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(cle.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException impossible) {
      throw new IllegalStateException("SHA-256 indisponible", impossible);
    }
  }

  private static String borne(String texte, int max) {
    if (texte == null) return null;
    return texte.length() > max ? texte.substring(0, max) : texte;
  }

  /**
   * Enregistre une occurrence. Ne lève jamais d'exception : un incident non enregistré (base
   * indisponible, par exemple) ne doit pas masquer l'erreur d'origine, qui reste dans les logs.
   */
  public void enregistrer(String source, String lieu, String message, String requestId, String userId, String role) {
    try {
      String lieuBorne = borne(lieu == null || lieu.isBlank() ? "?" : lieu, 500);
      String messageBorne = borne(message == null || message.isBlank() ? "Erreur sans message" : message, 1000);
      Map<String, Object> user = userId == null ? null
          : db.one("SELECT \"nom\", \"prenom\" FROM \"User\" WHERE \"id\" = :id", Db.params("id", userId));
      String userName = user == null ? null : (Db.str(user, "prenom") + " " + Db.str(user, "nom")).trim();
      db.update("""
          INSERT INTO "Incident" ("id", "signature", "source", "lieu", "message", "requestId", "userId", "userName", "role")
          VALUES (:id, :signature, :source, :lieu, :message, :requestId, :userId, :userName, :role)
          ON CONFLICT ("signature") DO UPDATE SET
            "occurrences" = "Incident"."occurrences" + 1,
            "derniereFois" = CURRENT_TIMESTAMP,
            "lieu" = EXCLUDED."lieu",
            "message" = EXCLUDED."message",
            "requestId" = EXCLUDED."requestId",
            "userId" = EXCLUDED."userId",
            "userName" = EXCLUDED."userName",
            "role" = EXCLUDED."role",
            "statut" = CASE WHEN "Incident"."statut" = 'traite' THEN 'nouveau' ELSE "Incident"."statut" END
          """, Db.params("id", Db.uuid(), "signature", signature(source, lieuBorne, messageBorne), "source", source,
          "lieu", lieuBorne, "message", messageBorne, "requestId", requestId, "userId", userId, "userName", userName, "role", role));
    } catch (RuntimeException failure) {
      LOG.warn("Incident non enregistré en base : {}", failure.getMessage());
    }
  }

  private static final String FILTRE = """
       WHERE (CAST(:statut AS text) IS NULL OR "statut" = :statut)
        AND (CAST(:source AS text) IS NULL OR "source" = :source)
        AND (CAST(:search AS text) IS NULL OR ("lieu" || ' ' || "message" || ' ' || COALESCE("userName", '')) ILIKE :search ESCAPE '\\')
      """;

  public Map<String, Object> list(int page, int limit, String statut, String source, String search) {
    MapSqlParameterSource params = Db.params("statut", statut, "source", source,
        "search", search == null ? null : "%" + search.replaceAll("([\\\\%_])", "\\\\$1") + "%");
    params.addValue("offset", (long) (page - 1) * limit).addValue("limit", limit);
    List<Map<String, Object>> incidents = new ArrayList<>();
    for (Map<String, Object> row : db.list("SELECT * FROM \"Incident\"" + FILTRE
        + " ORDER BY CASE \"statut\" WHEN 'nouveau' THEN 0 WHEN 'en_cours' THEN 1 ELSE 2 END, \"derniereFois\" DESC, \"id\" OFFSET :offset LIMIT :limit", params)) {
      incidents.add(view(row));
    }
    long total = db.count("SELECT COUNT(*) FROM \"Incident\"" + FILTRE, params);
    return Api.map("incidents", incidents, "stats", stats(),
        "pagination", Api.map("page", page, "limit", limit, "total", total, "totalPages", Math.max(1, (long) Math.ceil((double) total / limit))));
  }

  public Map<String, Object> stats() {
    Map<String, Object> counts = db.one("""
        SELECT COUNT(*) FILTER (WHERE "statut" = 'nouveau')::int AS "nouveau",
               COUNT(*) FILTER (WHERE "statut" = 'en_cours')::int AS "enCours",
               COUNT(*) FILTER (WHERE "statut" = 'traite')::int AS "traite",
               COALESCE(SUM("occurrences") FILTER (WHERE "derniereFois" >= CURRENT_TIMESTAMP - INTERVAL '24 hours'), 0)::int AS "occurrences24h"
        FROM "Incident"
        """, Db.params());
    return Api.map("nouveau", (long) Db.num(counts, "nouveau"), "enCours", (long) Db.num(counts, "enCours"),
        "traite", (long) Db.num(counts, "traite"), "occurrences24h", (long) Db.num(counts, "occurrences24h"));
  }

  public Map<String, Object> mettreAJour(String id, String statut, String note, Actor actor) {
    Map<String, Object> row = db.one("SELECT * FROM \"Incident\" WHERE \"id\" = :id", Db.params("id", id));
    if (row == null) throw AppException.notFound("Incident introuvable");
    String nom = auditTrail.displayName(actor.userId());
    boolean traite = "traite".equals(statut);
    db.update("""
        UPDATE "Incident" SET "statut" = :statut, "note" = :note,
          "traitePar" = CASE WHEN :traite THEN :nom ELSE NULL END,
          "traiteLe" = CASE WHEN :traite THEN CURRENT_TIMESTAMP ELSE NULL END
        WHERE "id" = :id
        """, Db.params("id", id, "statut", statut, "note", note, "traite", traite, "nom", nom));
    auditTrail.record(actor, "Incident mis à jour", "Incidents",
        "Incident « " + borne(Db.str(row, "message"), 120) + " » : " + Db.str(row, "statut") + " → " + statut);
    return view(db.one("SELECT * FROM \"Incident\" WHERE \"id\" = :id", Db.params("id", id)));
  }

  /** Les incidents sans nouvelle occurrence depuis 90 jours sont supprimés, chaque nuit. */
  @Scheduled(cron = "0 30 1 * * *", zone = "UTC")
  public void purger() {
    try {
      int supprimes = db.update("DELETE FROM \"Incident\" WHERE \"derniereFois\" < CURRENT_TIMESTAMP - make_interval(days => :jours)",
          Db.params("jours", CONSERVATION_JOURS));
      if (supprimes > 0) LOG.info("{} incident(s) de plus de {} jours supprimé(s)", supprimes, CONSERVATION_JOURS);
    } catch (RuntimeException failure) {
      LOG.error("Purge des incidents impossible", failure);
    }
  }

  private static Map<String, Object> view(Map<String, Object> row) {
    Map<String, Object> view = new LinkedHashMap<>();
    for (String key : List.of("id", "source", "lieu", "message", "requestId", "userName", "role", "statut", "note", "traitePar")) {
      view.put(key, row.get(key));
    }
    view.put("occurrences", (long) Db.num(row, "occurrences"));
    view.put("premiereFois", JacksonConfig.iso(Db.date(row, "premiereFois")));
    view.put("derniereFois", JacksonConfig.iso(Db.date(row, "derniereFois")));
    Instant traiteLe = row.get("traiteLe") == null ? null : Db.date(row, "traiteLe");
    view.put("traiteLe", traiteLe == null ? null : JacksonConfig.iso(traiteLe));
    return view;
  }
}
