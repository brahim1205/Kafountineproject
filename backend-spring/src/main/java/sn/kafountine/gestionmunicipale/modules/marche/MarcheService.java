package sn.kafountine.gestionmunicipale.modules.marche;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.Year;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.kafountine.gestionmunicipale.shared.audit.Actor;
import sn.kafountine.gestionmunicipale.shared.audit.AuditTrail;
import sn.kafountine.gestionmunicipale.shared.config.JacksonConfig;
import sn.kafountine.gestionmunicipale.shared.domain.ContribuableLookup;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;
import sn.kafountine.gestionmunicipale.shared.persistence.Sql;
import sn.kafountine.gestionmunicipale.shared.validation.Common;
import sn.kafountine.gestionmunicipale.shared.text.Js;

/** Places et paiements du marché (MarcheService et PrismaMarcheRepository côté Node). */
@Service
public class MarcheService {
  private static final String SELECT_PLACE = """
      SELECT p.*, c."nom" AS "occupantNom", c."prenom" AS "occupantPrenom", c."nin" AS "occupantNin", c."telephone" AS "occupantTelephone"
      FROM "MarketPlace" p
      LEFT JOIN "Contribuable" c ON c."id" = p."occupantId"
      """;
  private static final List<String> OCCUPANT = List.of("occupantNom", "occupantPrenom", "occupantNin", "occupantTelephone");

  private final Db db;
  private final ContribuableLookup contribuables;
  private final AuditTrail auditTrail;

  public MarcheService(Db db, ContribuableLookup contribuables, AuditTrail auditTrail) {
    this.db = db;
    this.contribuables = contribuables;
    this.auditTrail = auditTrail;
  }

  static String normalizePlaceStatus(String status) {
    String normalized = status.strip().toUpperCase(Locale.ROOT);
    if (normalized.equals("OCCUPEE") || normalized.equals("LIBRE") || normalized.equals("DISPONIBLE")) {
      return normalized.equals("DISPONIBLE") ? "LIBRE" : normalized;
    }
    return "LIBRE";
  }

  private static boolean truthy(String value) {
    return value != null && !value.isEmpty();
  }

  private static String emptyToNull(Object value) {
    return value == null || value.toString().isEmpty() ? null : value.toString();
  }

  /** occupantDisplay : champs du contribuable occupant (null si absent ou vide). */
  private static void putOccupant(Map<String, Object> row, Map<String, Object> occupant) {
    row.put("occupantNom", occupant == null ? null : emptyToNull(occupant.get("nom")));
    row.put("occupantPrenom", occupant == null ? null : emptyToNull(occupant.get("prenom")));
    row.put("occupantNin", occupant == null ? null : emptyToNull(occupant.get("nin")));
    row.put("occupantTelephone", occupant == null ? null : emptyToNull(occupant.get("telephone")));
  }

  public List<Map<String, Object>> listPlaces(int year) {
    List<Map<String, Object>> result = new ArrayList<>();
    for (Map<String, Object> row : db.list(SELECT_PLACE + " WHERE p.\"year\" = :year ORDER BY p.\"numeroPlace\" ASC", Db.params("year", year))) {
      result.add(placeView(row));
    }
    return result;
  }

  private Map<String, Object> findPlace(String id) {
    return db.one(SELECT_PLACE + " WHERE p.\"id\" = :id LIMIT 1", Db.params("id", id));
  }

  private String findPlaceIdByNumero(String numeroPlace, int year) {
    Map<String, Object> row = db.one("SELECT \"id\" FROM \"MarketPlace\" WHERE \"numeroPlace\" = :numero AND \"year\" = :year LIMIT 1",
        Db.params("numero", numeroPlace, "year", year));
    return row == null ? null : Db.str(row, "id");
  }

  private Map<String, Object> findOccupant(String occupantId) {
    if (occupantId == null || occupantId.isEmpty()) return null;
    Map<String, Object> occupant = contribuables.findById(occupantId);
    if (occupant == null) throw AppException.notFound("Occupant introuvable.");
    return occupant;
  }

  public record PlaceInput(String numeroPlace, String numero, String type, String zone, String occupantId, boolean occupantProvided, String activite,
      boolean activiteProvided, Double tarif, String periode, String statut, Integer year) {}

  @Transactional
  public Map<String, Object> createPlace(Actor actor, PlaceInput input) {
    String numeroPlace = (truthy(input.numeroPlace()) ? input.numeroPlace() : truthy(input.numero()) ? input.numero() : "").strip();
    String type = input.type() == null ? "" : input.type().strip();
    String zone = input.zone() == null ? "" : input.zone().strip();
    double tarif = input.tarif() == null ? 0 : input.tarif();
    String periode = (truthy(input.periode()) ? input.periode() : "mensuel").strip();
    String statut = normalizePlaceStatus(truthy(input.statut()) ? input.statut() : "LIBRE");
    String occupantId = truthy(input.occupantId()) ? input.occupantId().strip() : null;
    if (numeroPlace.isEmpty() || type.isEmpty() || zone.isEmpty()) throw AppException.validation("Le numéro, le type et la zone de la place sont requis.");
    if (tarif < 0) throw AppException.validation("Le tarif de la place est invalide.");
    int year = input.year() != null && input.year() != 0 ? input.year() : Year.now().getValue();
    if (findPlaceIdByNumero(numeroPlace, year) != null) throw AppException.conflict("Une place avec ce numéro existe déjà pour cette année.");
    Map<String, Object> occupant = findOccupant(occupantId);
    Map<String, Object> row = db.one("""
        INSERT INTO "MarketPlace" ("id", "numeroPlace", "type", "zone", "occupantId", "activite", "telephone", "dateAttribution", "tarif", "periode", "statut", "year", "createdAt", "updatedAt")
        VALUES (:id, :numeroPlace, :type, :zone, :occupantId, :activite, :telephone, :dateAttribution, :tarif, :periode, :statut, :year, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
        """, Db.params("id", Db.uuid(), "numeroPlace", numeroPlace, "type", type, "zone", zone, "occupantId", occupantId,
        "activite", truthy(input.activite()) ? input.activite().strip() : null,
        "telephone", occupant == null ? null : emptyToNull(occupant.get("telephone")),
        "dateAttribution", occupantId != null ? Timestamp.from(Instant.now()) : null, "tarif", tarif, "periode", periode, "statut", statut, "year", year));
    putOccupant(row, occupant);
    auditTrail.record(actor, "Création place marché", "Marché", "Place " + row.get("numeroPlace") + " créée (" + row.get("type") + ")");
    return placeView(row);
  }

  @Transactional
  public Map<String, Object> updatePlace(Actor actor, String placeId, PlaceInput input) {
    Map<String, Object> existing = findPlace(placeId);
    if (existing == null) throw AppException.notFound("Place de marché introuvable.");
    String nextNumero = truthy(input.numeroPlace()) ? input.numeroPlace().strip() : Db.str(existing, "numeroPlace");
    int existingYear = (int) Db.num(existing, "year");
    int nextYear = input.year() != null && input.year() != 0 ? input.year() : existingYear;
    if (!nextNumero.equals(Db.str(existing, "numeroPlace")) || nextYear != existingYear) {
      String duplicateId = findPlaceIdByNumero(nextNumero, nextYear);
      if (duplicateId != null && !duplicateId.equals(Db.str(existing, "id"))) throw AppException.conflict("Une place avec ce numéro existe déjà pour cette année.");
    }
    String occupantId = !input.occupantProvided() ? Db.str(existing, "occupantId")
        : (input.occupantId() == null || input.occupantId().strip().isEmpty() ? null : input.occupantId().strip());
    Map<String, Object> occupant = findOccupant(occupantId);
    boolean liberee = existing.get("occupantId") != null && occupantId == null;
    Object activite = liberee ? null : !input.activiteProvided() ? existing.get("activite")
        : (input.activite() == null || input.activite().strip().isEmpty() ? null : input.activite().strip());
    Object telephone = liberee ? null : occupant != null && emptyToNull(occupant.get("telephone")) != null ? occupant.get("telephone") : existing.get("telephone");
    Object dateAttribution = occupantId != null ? (existing.get("dateAttribution") != null ? existing.get("dateAttribution") : Instant.now()) : null;
    Map<String, Object> row = db.one("""
        UPDATE "MarketPlace" SET "numeroPlace" = :numeroPlace, "type" = :type, "zone" = :zone, "occupantId" = :occupantId, "activite" = :activite,
          "telephone" = :telephone, "dateAttribution" = :dateAttribution, "tarif" = :tarif, "periode" = :periode, "statut" = :statut, "year" = :year,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = :id RETURNING *
        """, Db.params("id", placeId, "numeroPlace", nextNumero, "type", truthy(input.type()) ? input.type().strip() : existing.get("type"),
        "zone", truthy(input.zone()) ? input.zone().strip() : existing.get("zone"), "occupantId", occupantId, "activite", activite, "telephone", telephone,
        "dateAttribution", dateAttribution, "tarif", input.tarif() == null ? existing.get("tarif") : input.tarif(),
        "periode", truthy(input.periode()) ? input.periode().strip() : existing.get("periode"),
        "statut", truthy(input.statut()) ? normalizePlaceStatus(input.statut()) : existing.get("statut"), "year", nextYear));
    putOccupant(row, occupant);
    auditTrail.record(actor, "Mise à jour place marché", "Marché", "Place " + row.get("numeroPlace") + " mise à jour");
    return placeView(row);
  }

  private static final String SELECT_PAYMENT = """
      SELECT mp.*, p."numeroPlace", p."type" AS "placeType", p."zone" AS "placeZone", p."occupantId", p."activite", p."tarif",
             p."periode" AS "placePeriode", p."statut" AS "placeStatut", p."telephone" AS "placeTelephone", p."dateAttribution" AS "placeDateAttribution",
             c."nom" AS "occupantNom", c."prenom" AS "occupantPrenom", c."nin" AS "occupantNin", c."telephone" AS "occupantTelephone"
      """;
  private static final String FROM_PAYMENT = """
      FROM "MarketPayment" mp
      INNER JOIN "MarketPlace" p ON p."id" = mp."placeId"
      LEFT JOIN "Contribuable" c ON c."id" = p."occupantId"
      """;
  private static final String ORDER_PAYMENT = " ORDER BY COALESCE(mp.\"datePaiement\", mp.\"createdAt\") DESC, mp.\"id\" DESC";

  public List<Map<String, Object>> listPayments(int year) {
    List<Map<String, Object>> result = new ArrayList<>();
    for (Map<String, Object> row : db.list(SELECT_PAYMENT + FROM_PAYMENT + " WHERE mp.\"year\" = :year" + ORDER_PAYMENT, Db.params("year", year))) result.add(paymentView(row));
    return result;
  }

  /** Paiements paginés, avec les compteurs par statut de toute l'année. */
  public Map<String, Object> pagePayments(int year, String search, String statut, Common.Paging paging) {
    MapSqlParameterSource params = Db.params("year", year, "limit", paging.limit(), "offset", paging.offset());
    StringBuilder where = new StringBuilder(" WHERE mp.\"year\" = :year");
    if (!search.isEmpty()) {
      where.append(" AND (p.\"numeroPlace\" ILIKE :like OR c.\"nom\" ILIKE :like OR c.\"prenom\" ILIKE :like)");
      params.addValue("like", "%" + Sql.escapeLike(search) + "%");
    }
    if ("RETARD".equals(statut)) where.append(" AND mp.\"statut\" NOT IN ('PAYE', 'EN_ATTENTE')");
    else if (statut != null) {
      where.append(" AND mp.\"statut\" = :statut");
      params.addValue("statut", statut);
    }
    List<Map<String, Object>> data = new ArrayList<>();
    for (Map<String, Object> row : db.list(SELECT_PAYMENT + FROM_PAYMENT + where + ORDER_PAYMENT + " LIMIT :limit OFFSET :offset", params)) data.add(paymentView(row));
    long total = db.count("SELECT COUNT(*) " + FROM_PAYMENT + where, params);
    Map<String, Object> counts = new LinkedHashMap<>();
    long paye = 0;
    long attente = 0;
    long retard = 0;
    for (Map<String, Object> row : db.list("SELECT \"statut\", COUNT(*)::bigint AS \"n\" FROM \"MarketPayment\" WHERE \"year\" = :year GROUP BY \"statut\"", Db.params("year", year))) {
      long n = ((Number) row.get("n")).longValue();
      if ("PAYE".equals(row.get("statut"))) paye += n;
      else if ("EN_ATTENTE".equals(row.get("statut"))) attente += n;
      else retard += n;
    }
    counts.put("PAYE", paye);
    counts.put("EN_ATTENTE", attente);
    counts.put("RETARD", retard);
    Map<String, Object> meta = paging.meta(total);
    meta.put("counts", counts);
    return Api.map("data", data, "meta", meta);
  }

  /** Agrégats de la page Statistiques, calculés en base. */
  public Map<String, Object> statsDetails(int year) {
    MapSqlParameterSource params = Db.params("year", year);
    List<Map<String, Object>> top = new ArrayList<>();
    for (Map<String, Object> row : db.list("""
        SELECT MAX(c."prenom") AS "prenom", MAX(c."nom") AS "nom", MIN(p."activite") AS "activite", MIN(p."numeroPlace") AS "place",
               COUNT(*)::bigint AS "paiements", SUM(mp."montant") AS "montant"
        FROM "MarketPayment" mp
        INNER JOIN "MarketPlace" p ON p."id" = mp."placeId"
        LEFT JOIN "Contribuable" c ON c."id" = p."occupantId"
        WHERE mp."year" = :year AND p."occupantId" IS NOT NULL
        GROUP BY p."occupantId" ORDER BY "montant" DESC LIMIT 5
        """, params)) {
      String nom = (nz(row.get("prenom")) + " " + nz(row.get("nom"))).strip();
      top.add(Api.map("nom", nom.isEmpty() ? "Inconnu" : nom, "activite", row.get("activite") == null ? "-" : row.get("activite"),
          "place", row.get("place"), "paiements", ((Number) row.get("paiements")).longValue(), "montant", Db.num(row, "montant")));
    }
    List<Map<String, Object>> mois = new ArrayList<>();
    for (Map<String, Object> row : db.list("""
        SELECT to_char(date_trunc('month', "datePaiement"), 'YYYY-MM') AS "mois", COUNT(DISTINCT "placeId")::bigint AS "places", SUM("montant") AS "montant"
        FROM "MarketPayment"
        WHERE "year" = :year AND "datePaiement" IS NOT NULL
        GROUP BY 1
        """, params)) {
      mois.add(Api.map("mois", row.get("mois"), "places", ((Number) row.get("places")).longValue(), "montant", Db.num(row, "montant")));
    }
    return Api.map("topCommercants", top, "evolutionMensuelle", mois);
  }

  private static String nz(Object value) {
    return value == null ? "" : value.toString();
  }

  public record PaymentInput(String placeId, Double montant, String reference, String periode, String statut, String datePaiement, Integer year) {}

  /** Ligne de paiement complétée par la place (placeParams côté Node). */
  private static Map<String, Object> withPlace(Map<String, Object> payment, Map<String, Object> place) {
    payment.put("numeroPlace", place.get("numeroPlace"));
    payment.put("placeType", place.get("type"));
    payment.put("placeZone", place.get("zone"));
    payment.put("occupantId", place.get("occupantId"));
    payment.put("activite", place.get("activite"));
    payment.put("tarif", place.get("tarif"));
    payment.put("placePeriode", place.get("periode"));
    payment.put("placeStatut", place.get("statut"));
    payment.put("placeTelephone", place.get("telephone"));
    payment.put("placeDateAttribution", place.get("dateAttribution"));
    for (String key : OCCUPANT) payment.put(key, place.get(key));
    return payment;
  }

  @Transactional
  public Map<String, Object> createPayment(Actor actor, PaymentInput input) {
    String placeId = input.placeId() == null ? "" : input.placeId().strip();
    String periode = input.periode() == null ? "" : input.periode().strip();
    double montant = input.montant() == null ? 0 : input.montant();
    String reference = truthy(input.reference()) ? input.reference().strip() : null;
    if (placeId.isEmpty() || periode.isEmpty()) throw AppException.validation("La place et la période de paiement sont requises.");
    if (montant <= 0) throw AppException.validation("Le montant du paiement marché est invalide.");
    Map<String, Object> place = findPlace(placeId);
    if (place == null) throw AppException.notFound("Place de marché introuvable.");
    int year = input.year() != null && input.year() != 0 ? input.year() : Year.now().getValue();
    String statut = truthy(input.statut()) ? input.statut() : "PAYE";
    Instant datePaiement;
    if (truthy(input.datePaiement())) {
      datePaiement = Js.parseDate(input.datePaiement());
      if (datePaiement == null) throw new IllegalArgumentException("Invalid Date");
    } else {
      datePaiement = Instant.now();
    }
    List<Map<String, Object>> existing = db.list("""
        SELECT "id", "statut" FROM "MarketPayment" WHERE "placeId" = :placeId AND "periode" = :periode AND "year" = :year ORDER BY "createdAt" ASC
        """, Db.params("placeId", placeId, "periode", periode, "year", year)).stream().filter(item -> !"ANNULE".equals(item.get("statut"))).toList();
    if (statut.equals("PAYE") && existing.stream().anyMatch(item -> "PAYE".equals(item.get("statut")))) {
      throw AppException.conflict("La période " + periode + " de la place " + place.get("numeroPlace") + " est déjà payée.");
    }
    // Un paiement en attente ou en retard pour la même période est encaissé, pas dupliqué.
    Map<String, Object> due = statut.equals("PAYE") ? existing.stream().filter(item -> !"PAYE".equals(item.get("statut"))).findFirst().orElse(null) : null;
    Map<String, Object> created;
    if (due != null) {
      created = db.one("""
          UPDATE "MarketPayment" SET "montant" = :montant, "reference" = :reference, "statut" = 'PAYE', "datePaiement" = :datePaiement, "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = :id RETURNING *
          """, Db.params("id", due.get("id"), "montant", montant, "reference", reference, "datePaiement", datePaiement));
    } else {
      created = db.one("""
          INSERT INTO "MarketPayment" ("id", "placeId", "montant", "reference", "periode", "statut", "datePaiement", "year", "createdAt", "updatedAt")
          VALUES (:id, :placeId, :montant, :reference, :periode, :statut, :datePaiement, :year, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *
          """, Db.params("id", Db.uuid(), "placeId", placeId, "montant", montant, "reference", reference, "periode", periode, "statut", statut,
          "datePaiement", datePaiement, "year", year));
    }
    withPlace(created, place);
    auditTrail.record(actor, "Paiement marché", "Marché", "Paiement enregistré pour la place " + place.get("numeroPlace") + " (" + Js.num(montant) + " FCFA)");
    return paymentView(created);
  }

  public Map<String, Object> stats(int year) {
    List<Map<String, Object>> places = db.list("SELECT \"statut\", \"occupantId\" FROM \"MarketPlace\" WHERE \"year\" = :year", Db.params("year", year));
    List<Map<String, Object>> paiements = db.list("SELECT \"montant\", \"statut\" FROM \"MarketPayment\" WHERE \"year\" = :year", Db.params("year", year));
    long totales = places.size();
    long occupees = places.stream().filter(p -> "OCCUPEE".equals(p.get("statut"))).count();
    double payes = 0;
    double retard = 0;
    for (Map<String, Object> p : paiements) {
      if ("PAYE".equals(p.get("statut"))) payes += Db.num(p, "montant");
      else if (!"ANNULE".equals(p.get("statut"))) retard += Db.num(p, "montant");
    }
    return Api.map("placesTotales", totales, "placesOccupees", occupees, "placesDisponibles", Math.max(totales - occupees, 0),
        "recettesMois", payes, "tauxOccupation", totales > 0 ? Math.round((double) occupees / totales * 100) : 0,
        "nouveauxCommercants", places.stream().filter(p -> p.get("occupantId") != null && !p.get("occupantId").toString().isEmpty()).count(),
        "recettesEnRetard", retard);
  }

  private static Map<String, Object> placeView(Map<String, Object> row) {
    String prenom = Db.str(row, "occupantPrenom");
    String nom = Db.str(row, "occupantNom");
    Map<String, Object> view = new LinkedHashMap<>();
    view.put("id", row.get("id"));
    view.put("numeroPlace", row.get("numeroPlace"));
    view.put("numero", row.get("numeroPlace"));
    view.put("type", row.get("type"));
    view.put("zone", row.get("zone"));
    view.put("occupantId", row.get("occupantId"));
    view.put("occupant", truthy(prenom) && truthy(nom) ? (prenom + " " + nom).strip() : null);
    view.put("telephone", truthy(Db.str(row, "telephone")) ? row.get("telephone") : row.get("occupantTelephone"));
    Instant attribution = Db.date(row, "dateAttribution");
    view.put("dateAttribution", attribution == null ? null : JacksonConfig.iso(attribution));
    view.put("activite", truthy(Db.str(row, "activite")) ? row.get("activite") : null);
    view.put("tarif", Db.num(row, "tarif"));
    view.put("periode", row.get("periode"));
    view.put("statut", row.get("statut"));
    return view;
  }

  private static Map<String, Object> paymentView(Map<String, Object> row) {
    Map<String, Object> view = new LinkedHashMap<>();
    view.put("id", row.get("id"));
    view.put("placeId", row.get("placeId"));
    view.put("montant", Db.num(row, "montant"));
    if (truthy(Db.str(row, "reference"))) view.put("reference", row.get("reference"));
    view.put("periode", row.get("periode"));
    view.put("statut", row.get("statut"));
    Instant date = Db.date(row, "datePaiement");
    view.put("datePaiement", date == null ? null : JacksonConfig.iso(date));
    Map<String, Object> place = new LinkedHashMap<>();
    place.put("id", row.get("placeId"));
    place.put("numeroPlace", row.get("numeroPlace"));
    place.put("type", row.get("placeType"));
    place.put("zone", row.get("placeZone"));
    place.put("occupantId", row.get("occupantId"));
    place.put("activite", row.get("activite"));
    place.put("telephone", row.get("placeTelephone"));
    place.put("dateAttribution", row.get("placeDateAttribution"));
    place.put("tarif", row.get("tarif"));
    place.put("periode", row.get("placePeriode"));
    place.put("statut", row.get("placeStatut"));
    for (String key : OCCUPANT) place.put(key, row.get(key));
    view.put("place", placeView(place));
    return view;
  }
}
