package sn.kafountine.gestionmunicipale.modules.quaipeche;

import java.time.Year;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sn.kafountine.gestionmunicipale.modules.transactions.TaxCatalog;
import sn.kafountine.gestionmunicipale.modules.transactions.TransactionService;
import sn.kafountine.gestionmunicipale.shared.audit.Actor;
import sn.kafountine.gestionmunicipale.shared.audit.AuditTrail;
import sn.kafountine.gestionmunicipale.shared.config.JacksonConfig;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.numbering.NumeroSequence;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;
import sn.kafountine.gestionmunicipale.shared.persistence.Sql;
import sn.kafountine.gestionmunicipale.shared.text.Js;
import sn.kafountine.gestionmunicipale.shared.validation.Common;

/** Quai de pêche : pêcheurs, embarcations, commissions, camions, expéditions (QuaiPecheService côté Node). */
@Service
public class QuaiPecheService {
  public enum Collection { pecheurs, embarcations, commissions, camions, expeditions }

  private static final Map<Collection, String> NOT_FOUND = Map.of(
      Collection.pecheurs, "Pêcheur introuvable.", Collection.embarcations, "Embarcation introuvable.",
      Collection.commissions, "Commission introuvable.", Collection.camions, "Camion introuvable.", Collection.expeditions, "Expédition introuvable.");
  private static final Map<Collection, String> TABLE = Map.of(
      Collection.pecheurs, "Fisherman", Collection.embarcations, "FishingBoat", Collection.commissions, "FishCommission",
      Collection.camions, "RefrigeratedTruck", Collection.expeditions, "ShippingExpedition");

  private static final String SELECT_FISHERMAN = """
      SELECT f.*, COALESCE((SELECT COUNT(*) FROM "FishingBoat" b WHERE b."pecheurId" = f."id"), 0)::int AS "embarcationsCount",
             COALESCE((SELECT COUNT(*) FROM "FishCommission" c WHERE c."pecheurId" = f."id"), 0)::int AS "commissionsCount"
      FROM "Fisherman" f""";
  private static final String SELECT_BOAT = """
      SELECT b.*, f."nom" AS "pecheurNom", f."prenom" AS "pecheurPrenom", f."telephone" AS "pecheurTelephone", f."nin" AS "pecheurNin"
      FROM "FishingBoat" b LEFT JOIN "Fisherman" f ON f."id" = b."pecheurId\"""";
  private static final String SELECT_COMMISSION = """
      SELECT c.*, f."nom" AS "pecheurNom", f."prenom" AS "pecheurPrenom", f."telephone" AS "pecheurTelephone", f."nin" AS "pecheurNin"
      FROM "FishCommission" c INNER JOIN "Fisherman" f ON f."id" = c."pecheurId\"""";
  private static final String SELECT_TRUCK = """
      SELECT t.*, COALESCE((SELECT COUNT(*) FROM "ShippingExpedition" e WHERE e."camionId" = t."id"), 0)::int AS "expeditionsCount"
      FROM "RefrigeratedTruck" t""";
  private static final String SELECT_EXPEDITION = """
      SELECT e.*, t."immatriculation" AS "camionImmatriculation", t."marque" AS "camionMarque", t."modele" AS "camionModele",
             t."capacite" AS "camionCapacite", t."chauffeur" AS "camionChauffeur", t."telephone" AS "camionTelephone", t."statut" AS "camionStatut",
             x."numero" AS "ticketNumero", x."statut" AS "ticketStatut", x."montant" AS "ticketMontant", x."modePaiement" AS "ticketMode",
             x."service" AS "ticketService", x."createdAt" AS "ticketDate",
             TRIM(COALESCE(k."prenom", '') || ' ' || COALESCE(k."nom", '')) AS "ticketPayeur",
             TRIM(COALESCE(u."prenom", '') || ' ' || COALESCE(u."nom", '')) AS "ticketAgent"
      FROM "ShippingExpedition" e INNER JOIN "RefrigeratedTruck" t ON t."id" = e."camionId"
      LEFT JOIN "Transaction" x ON x."id" = e."transactionId"
      LEFT JOIN "Contribuable" k ON k."id" = x."contribuableId"
      LEFT JOIN "User" u ON u."id" = x."agentId\"""";

  /** Catégorie du catalogue qui porte la taxe des camions frigorifiques (arrêté du 8 mai 2024, section VI). */
  static final String CATEGORIE_CAMIONS = "stationnement-transport";

  private final Db db;
  private final AuditTrail auditTrail;
  private final NumeroSequence numeros;
  private final TaxCatalog catalog;
  private final TransactionService transactions;

  public QuaiPecheService(Db db, AuditTrail auditTrail, NumeroSequence numeros, TaxCatalog catalog, TransactionService transactions) {
    this.db = db;
    this.auditTrail = auditTrail;
    this.numeros = numeros;
    this.catalog = catalog;
    this.transactions = transactions;
  }

  // --- Conversions de QuaiPecheService.ts ---------------------------------------------------------

  private static boolean truthy(Object value) {
    if (value == null) return false;
    if (value instanceof String s) return !s.isEmpty();
    if (value instanceof Number n) return n.doubleValue() != 0 && !Double.isNaN(n.doubleValue());
    if (value instanceof Boolean b) return b;
    return true;
  }

  private static String text(Object value) {
    return truthy(value) ? value.toString().strip() : "";
  }

  private static String optionalText(Object value) {
    return truthy(value) ? value.toString().strip() : null;
  }

  private static Object optionalNumber(Object value) {
    return value == null ? null : value;
  }

  private static String status(Object value, Object fallback) {
    return (truthy(value) ? value.toString() : String.valueOf(fallback)).strip().toUpperCase(Locale.ROOT);
  }

  /** Mise à jour partielle : un champ absent garde sa valeur. */
  private static Object pick(Map<String, Object> input, String key, Object current, Function<Object, Object> parse) {
    return input.containsKey(key) ? parse.apply(input.get(key)) : current;
  }

  private static Map<String, Object> required(Collection collection, Map<String, Object> row) {
    if (row == null) throw AppException.notFound(NOT_FOUND.get(collection));
    return row;
  }

  private void audit(Actor actor, String action, String details) {
    auditTrail.record(actor, action, "Quai de pêche", details, "success");
  }

  // --- Lecture -----------------------------------------------------------------------------------

  private Map<String, Object> findFisherman(String id) {
    return db.one(SELECT_FISHERMAN + " WHERE f.\"id\" = :id LIMIT 1", Db.params("id", id));
  }

  private Map<String, Object> findTruck(String id) {
    return db.one(SELECT_TRUCK + " WHERE t.\"id\" = :id LIMIT 1", Db.params("id", id));
  }

  private Map<String, Object> find(Collection collection, String id) {
    return switch (collection) {
      case pecheurs -> findFisherman(id);
      case embarcations -> db.one(SELECT_BOAT + " WHERE b.\"id\" = :id LIMIT 1", Db.params("id", id));
      case commissions -> db.one(SELECT_COMMISSION + " WHERE c.\"id\" = :id LIMIT 1", Db.params("id", id));
      case camions -> findTruck(id);
      case expeditions -> db.one(SELECT_EXPEDITION + " WHERE e.\"id\" = :id LIMIT 1", Db.params("id", id));
    };
  }

  private Map<String, Object> view(Collection collection, Map<String, Object> row) {
    return switch (collection) {
      case pecheurs -> fishermanView(row);
      case embarcations -> boatView(row);
      case commissions -> commissionView(row);
      case camions -> truckView(row);
      case expeditions -> expeditionView(row);
    };
  }

  private static final Map<Collection, String> SEARCH = Map.of(
      Collection.pecheurs, "f.\"nom\" ILIKE :like OR f.\"prenom\" ILIKE :like OR f.\"telephone\" ILIKE :like",
      Collection.embarcations, "b.\"nom\" ILIKE :like OR b.\"immatriculation\" ILIKE :like",
      Collection.commissions, "c.\"numero\" ILIKE :like OR f.\"nom\" ILIKE :like OR f.\"prenom\" ILIKE :like",
      Collection.camions, "t.\"immatriculation\" ILIKE :like OR t.\"marque\" ILIKE :like OR t.\"chauffeur\" ILIKE :like",
      Collection.expeditions, "e.\"numero\" ILIKE :like OR e.\"destination\" ILIKE :like OR t.\"immatriculation\" ILIKE :like");
  private static final Map<Collection, String> ALIAS = Map.of(Collection.pecheurs, "f", Collection.embarcations, "b",
      Collection.commissions, "c", Collection.camions, "t", Collection.expeditions, "e");
  private static final Map<Collection, String> FROM = Map.of(
      Collection.pecheurs, "\"Fisherman\" f",
      Collection.embarcations, "\"FishingBoat\" b",
      Collection.commissions, "\"FishCommission\" c INNER JOIN \"Fisherman\" f ON f.\"id\" = c.\"pecheurId\"",
      Collection.camions, "\"RefrigeratedTruck\" t",
      Collection.expeditions, "\"ShippingExpedition\" e INNER JOIN \"RefrigeratedTruck\" t ON t.\"id\" = e.\"camionId\"");

  /** Liste paginée avec recherche, compteurs par statut et totaux de toute l'année. */
  public Map<String, Object> page(Collection collection, int year, String search, String statut, Common.Paging paging) {
    String alias = ALIAS.get(collection);
    String select = switch (collection) {
      case pecheurs -> SELECT_FISHERMAN;
      case embarcations -> SELECT_BOAT;
      case commissions -> SELECT_COMMISSION;
      case camions -> SELECT_TRUCK;
      case expeditions -> SELECT_EXPEDITION;
    };
    String order = collection == Collection.commissions || collection == Collection.expeditions ? "date" : "createdAt";
    MapSqlParameterSource params = Db.params("year", year, "limit", paging.limit(), "offset", paging.offset());
    StringBuilder where = new StringBuilder(" WHERE " + alias + ".\"year\" = :year");
    if (!search.isEmpty()) {
      where.append(" AND (").append(SEARCH.get(collection)).append(")");
      params.addValue("like", "%" + Sql.escapeLike(search) + "%");
    }
    if (statut != null && !statut.isEmpty()) {
      where.append(" AND ").append(alias).append(".\"statut\" = :statut");
      params.addValue("statut", statut);
    }
    List<Map<String, Object>> data = new ArrayList<>();
    for (Map<String, Object> row : db.list(select + where + " ORDER BY " + alias + ".\"" + order + "\" DESC, " + alias + ".\"id\" DESC LIMIT :limit OFFSET :offset", params)) {
      data.add(view(collection, row));
    }
    long total = db.count("SELECT COUNT(*) FROM " + FROM.get(collection) + where, params);
    Map<String, Object> counts = new LinkedHashMap<>();
    String table = TABLE.get(collection);
    for (Map<String, Object> row : db.list("SELECT \"statut\", COUNT(*)::bigint AS \"n\" FROM \"" + table + "\" WHERE \"year\" = :year GROUP BY \"statut\"", Db.params("year", year))) {
      counts.put(String.valueOf(row.get("statut")), ((Number) row.get("n")).longValue());
    }
    Map<String, Object> meta = paging.meta(total);
    meta.put("counts", counts);
    if (collection == Collection.commissions) {
      meta.put("somme", db.sum("SELECT COALESCE(SUM(\"poids\"), 0) AS \"total\" FROM \"FishCommission\" WHERE \"year\" = :year", Db.params("year", year)));
    } else if (collection == Collection.expeditions) {
      // Recettes réelles : les taxes de passage payées (tickets), pas les anciens montants saisis à la main.
      meta.put("somme", db.sum("""
          SELECT COALESCE(SUM(x."montant"), 0) AS "total" FROM "ShippingExpedition" e
          INNER JOIN "Transaction" x ON x."id" = e."transactionId" WHERE e."year" = :year AND x."statut" = 'PAYE'
          """, Db.params("year", year)));
    }
    return Api.map("data", data, "meta", meta);
  }

  public List<Map<String, Object>> list(Collection collection, int year) {
    String sql = switch (collection) {
      case pecheurs -> SELECT_FISHERMAN + " WHERE f.\"year\" = :year ORDER BY f.\"createdAt\" DESC";
      case embarcations -> SELECT_BOAT + " WHERE b.\"year\" = :year ORDER BY b.\"createdAt\" DESC";
      case commissions -> SELECT_COMMISSION + " WHERE c.\"year\" = :year ORDER BY c.\"date\" DESC";
      case camions -> SELECT_TRUCK + " WHERE t.\"year\" = :year ORDER BY t.\"createdAt\" DESC";
      case expeditions -> SELECT_EXPEDITION + " WHERE e.\"year\" = :year ORDER BY e.\"date\" DESC";
    };
    List<Map<String, Object>> result = new ArrayList<>();
    for (Map<String, Object> row : db.list(sql, Db.params("year", year))) result.add(view(collection, row));
    return result;
  }

  public Map<String, Object> get(Collection collection, String id) {
    return view(collection, required(collection, find(collection, id)));
  }

  public Map<String, Object> stats(int year) {
    List<Map<String, Object>> commissions = db.list("SELECT \"poids\",\"statut\" FROM \"FishCommission\" WHERE \"year\" = :year", Db.params("year", year));
    long pecheurs = db.list("SELECT \"id\" FROM \"Fisherman\" WHERE \"year\" = :year AND \"statut\" = 'ACTIF'", Db.params("year", year)).size();
    long embarcations = db.list("SELECT \"id\" FROM \"FishingBoat\" WHERE \"year\" = :year", Db.params("year", year)).size();
    double poids = 0;
    for (Map<String, Object> c : commissions) poids += Db.num(c, "poids");
    return Api.map("totalCommissions", commissions.size(), "totalPoids", poids,
        "commissionsEnAttente", commissions.stream().filter(c -> "ENREGISTREE".equals(c.get("statut"))).count(),
        "totalPecheurs", pecheurs, "totalEmbarcations", embarcations);
  }

  // --- Taxe de passage des camions frigorifiques -----------------------------------------------

  /**
   * Libellé du catalogue pour un passage de camion (arrêté du 8 mai 2024, section VI) : vide ou chargé,
   * puis la tranche de tonnage de la capacité du camion (0 à 1 t, 1 à 10 t, 10 à 20 t, plus de 20 t).
   * Sans capacité connue, le poids chargé sert de référence.
   */
  static String tarifPassage(Double capaciteKg, double poidsKg) {
    boolean charge = poidsKg > 0;
    double reference = capaciteKg != null && capaciteKg > 0 ? capaciteKg : poidsKg;
    if (reference <= 0) {
      throw AppException.validation("Indiquez la capacité du camion (ou le poids chargé) pour calculer la taxe de passage.");
    }
    double tonnes = reference / 1000;
    String tranche = tonnes <= 1 ? "0-1 tonne" : tonnes <= 10 ? "1-10 tonnes" : tonnes <= 20 ? "10-20 tonnes" : "+20 tonnes";
    return "Camions frigorifiques " + (charge ? "charge" : "vide") + " - " + tranche;
  }

  /**
   * Enregistre la taxe de passage d'un camion : un ticket numéroté (reçu, mode de paiement, agent) au tarif
   * officiel, relié à l'expédition. Il compte ensuite dans les recettes, la caisse et les rapports comme
   * tout autre ticket, et ne s'annule qu'avec un motif. Une expédition ne paie qu'une fois.
   */
  @Transactional
  public Map<String, Object> enregistrerPaiement(Actor actor, String expeditionId, String contribuableId, String modePaiement) {
    db.one("SELECT \"id\" FROM \"ShippingExpedition\" WHERE \"id\" = :id FOR UPDATE", Db.params("id", expeditionId));
    Map<String, Object> expedition = required(Collection.expeditions, find(Collection.expeditions, expeditionId));
    if ("PAYE".equals(expedition.get("ticketStatut"))) {
      throw AppException.conflict("La taxe de passage de cette expédition est déjà enregistrée (ticket " + expedition.get("ticketNumero") + ").");
    }
    if ("ANNULEE".equals(expedition.get("statut"))) {
      throw AppException.validation("Une expédition annulée ne donne pas lieu à une taxe de passage.");
    }
    if (db.one("SELECT \"id\" FROM \"Contribuable\" WHERE \"id\" = :id", Db.params("id", contribuableId)) == null) {
      throw AppException.notFound("Contribuable introuvable.");
    }
    Object capacite = expedition.get("camionCapacite");
    String service = tarifPassage(capacite == null ? null : Db.num(expedition, "camionCapacite"), Db.num(expedition, "poids"));
    double tarif = catalog.listServices(CATEGORIE_CAMIONS).stream()
        .filter(item -> service.equals(item.get("nom")))
        .mapToDouble(item -> ((Number) item.get("tarif")).doubleValue())
        .findFirst()
        .orElseThrow(() -> AppException.validation("Tarif introuvable dans le catalogue : « " + service + " ». Vérifiez les tarifs dans les paramètres."));
    Map<String, Object> ticket = transactions.create(actor, new TransactionService.CreateInput(contribuableId, actor.userId(), CATEGORIE_CAMIONS,
        CATEGORIE_CAMIONS, service, 1, tarif, modePaiement, "PAYE", null));
    db.update("UPDATE \"ShippingExpedition\" SET \"transactionId\" = :ticket, \"updatedAt\" = CURRENT_TIMESTAMP WHERE \"id\" = :id",
        Db.params("ticket", ticket.get("id"), "id", expeditionId));
    audit(actor, "Taxe de passage camion", "Expédition " + expedition.get("numero") + " : ticket " + ticket.get("numero")
        + " (" + service + ", " + Js.num(tarif) + " FCFA)");
    return expeditionView(required(Collection.expeditions, find(Collection.expeditions, expeditionId)));
  }

  // --- Écritures ---------------------------------------------------------------------------------

  private static void putOwner(Map<String, Object> row, Map<String, Object> owner) {
    row.put("pecheurNom", owner == null ? null : optionalText(owner.get("nom")));
    row.put("pecheurPrenom", owner == null ? null : optionalText(owner.get("prenom")));
    row.put("pecheurTelephone", owner == null ? null : optionalText(owner.get("telephone")));
    row.put("pecheurNin", owner == null ? null : optionalText(owner.get("nin")));
  }

  private static void putTruck(Map<String, Object> row, Map<String, Object> truck, boolean fromCurrentExpedition) {
    String p = fromCurrentExpedition ? "camion" : "";
    row.put("camionImmatriculation", truck.get(fromCurrentExpedition ? "camionImmatriculation" : "immatriculation"));
    row.put("camionMarque", truck.get(fromCurrentExpedition ? "camionMarque" : "marque"));
    row.put("camionModele", truck.get(fromCurrentExpedition ? "camionModele" : "modele"));
    row.put("camionCapacite", truck.get(fromCurrentExpedition ? "camionCapacite" : "capacite"));
    row.put("camionChauffeur", truck.get(fromCurrentExpedition ? "camionChauffeur" : "chauffeur"));
    row.put("camionTelephone", truck.get(fromCurrentExpedition ? "camionTelephone" : "telephone"));
    row.put("camionStatut", truck.get(fromCurrentExpedition ? "camionStatut" : "statut"));
    if (p.isEmpty()) return;
  }

  @Transactional
  public Map<String, Object> create(Actor actor, Collection collection, Map<String, Object> input) {
    int year = truthy(input.get("year")) ? ((Number) input.get("year")).intValue() : Year.now().getValue();
    switch (collection) {
      case pecheurs -> {
        Map<String, Object> row = db.one("""
            INSERT INTO "Fisherman" ("id","nom","prenom","telephone","nin","adresse","statut","year","createdAt","updatedAt")
            VALUES (:id, :nom, :prenom, :telephone, :nin, :adresse, :statut, :year, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *, 0::int AS "embarcationsCount", 0::int AS "commissionsCount"
            """, Db.params("id", Db.uuid(), "nom", text(input.get("nom")), "prenom", text(input.get("prenom")), "telephone", optionalText(input.get("telephone")),
            "nin", optionalText(input.get("nin")), "adresse", optionalText(input.get("adresse")), "statut", status(input.get("statut"), "ACTIF"), "year", year));
        audit(actor, "Création pêcheur", "Pêcheur " + row.get("prenom") + " " + row.get("nom") + " créé");
        return fishermanView(row);
      }
      case embarcations -> {
        Object pecheurId = truthy(input.get("pecheurId")) ? input.get("pecheurId").toString() : null;
        Map<String, Object> owner = pecheurId != null ? findFisherman(pecheurId.toString()) : null;
        Map<String, Object> row = db.one("""
            INSERT INTO "FishingBoat" ("id","nom","immatriculation","type","taille","moteur","statut","pecheurId","year","createdAt","updatedAt")
            VALUES (:id, :nom, :immatriculation, :type, :taille, :moteur, :statut, :pecheurId, :year, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *
            """, Db.params("id", Db.uuid(), "nom", text(input.get("nom")), "immatriculation", text(input.get("immatriculation")).toUpperCase(Locale.ROOT),
            "type", text(input.get("type")), "taille", optionalNumber(input.get("taille")), "moteur", optionalText(input.get("moteur")),
            "statut", status(input.get("statut"), "ACTIF"), "pecheurId", pecheurId, "year", year));
        putOwner(row, owner);
        audit(actor, "Création embarcation", "Embarcation " + row.get("immatriculation") + " créée");
        return boatView(row);
      }
      case commissions -> {
        Map<String, Object> fisherman = required(Collection.pecheurs, findFisherman(text(input.get("pecheurId"))));
        String numero = numeros.next(NumeroSequence.Series.COMMISSION, year);
        Map<String, Object> row = db.one("""
            INSERT INTO "FishCommission" ("id","numero","poids","typePoisson","temperatura","observations","statut","date","pecheurId","year","createdAt","updatedAt")
            VALUES (:id, :numero, :poids, :typePoisson, :temperatura, :observations, 'ENREGISTREE', CURRENT_TIMESTAMP, :pecheurId, :year, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *
            """, Db.params("id", Db.uuid(), "numero", numero, "poids", input.get("poids") == null ? 0.0 : input.get("poids"),
            "typePoisson", text(input.get("typePoisson")), "temperatura", optionalNumber(input.get("temperatura")),
            "observations", optionalText(input.get("observations")), "pecheurId", fisherman.get("id"), "year", year));
        row.put("pecheurNom", fisherman.get("nom"));
        row.put("pecheurPrenom", fisherman.get("prenom"));
        row.put("pecheurTelephone", fisherman.get("telephone"));
        row.put("pecheurNin", fisherman.get("nin"));
        audit(actor, "Création commission", "Commission " + row.get("numero") + " créée");
        return commissionView(row);
      }
      case camions -> {
        Map<String, Object> row = db.one("""
            INSERT INTO "RefrigeratedTruck" ("id","immatriculation","marque","modele","capacite","chauffeur","telephone","statut","year","createdAt","updatedAt")
            VALUES (:id, :immatriculation, :marque, :modele, :capacite, :chauffeur, :telephone, :statut, :year, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *, 0::int AS "expeditionsCount"
            """, Db.params("id", Db.uuid(), "immatriculation", text(input.get("immatriculation")).toUpperCase(Locale.ROOT), "marque", text(input.get("marque")),
            "modele", optionalText(input.get("modele")), "capacite", optionalNumber(input.get("capacite")), "chauffeur", optionalText(input.get("chauffeur")),
            "telephone", optionalText(input.get("telephone")), "statut", status(input.get("statut"), "ACTIF"), "year", year));
        audit(actor, "Création camion frigorifique", "Camion " + row.get("immatriculation") + " créé");
        return truckView(row);
      }
      default -> {
        Map<String, Object> truck = required(Collection.camions, findTruck(text(input.get("camionId"))));
        String numero = numeros.next(NumeroSequence.Series.EXPEDITION, year);
        Map<String, Object> row = db.one("""
            INSERT INTO "ShippingExpedition" ("id","numero","date","poids","destination","montant","statut","observations","camionId","year","createdAt","updatedAt")
            VALUES (:id, :numero, CURRENT_TIMESTAMP, :poids, :destination, :montant, :statut, :observations, :camionId, :year, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *
            """, Db.params("id", Db.uuid(), "numero", numero, "poids", input.get("poids") == null ? 0.0 : input.get("poids"),
            // Plus de montant saisi à la main : la taxe passe par un ticket (enregistrerPaiement).
            "destination", optionalText(input.get("destination")), "montant", null,
            "statut", status(input.get("statut"), "PLANIFIEE"), "observations", optionalText(input.get("observations")), "camionId", truck.get("id"), "year", year));
        putTruck(row, truck, false);
        audit(actor, "Création expédition", "Expédition " + row.get("numero") + " créée");
        return expeditionView(row);
      }
    }
  }

  @Transactional
  public Map<String, Object> update(Actor actor, Collection collection, String id, Map<String, Object> input) {
    Map<String, Object> current = required(collection, find(collection, id));
    switch (collection) {
      case pecheurs -> {
        Map<String, Object> row = db.one("""
            UPDATE "Fisherman" SET "nom"=:nom,"prenom"=:prenom,"telephone"=:telephone,"nin"=:nin,"adresse"=:adresse,"statut"=:statut,"updatedAt"=CURRENT_TIMESTAMP
            WHERE "id"=:id RETURNING *, 0::int AS "embarcationsCount", 0::int AS "commissionsCount"
            """, Db.params("id", id, "nom", pick(input, "nom", current.get("nom"), QuaiPecheService::text),
            "prenom", pick(input, "prenom", current.get("prenom"), QuaiPecheService::text),
            "telephone", pick(input, "telephone", current.get("telephone"), QuaiPecheService::optionalText),
            "nin", pick(input, "nin", current.get("nin"), QuaiPecheService::optionalText),
            "adresse", pick(input, "adresse", current.get("adresse"), QuaiPecheService::optionalText),
            "statut", pick(input, "statut", current.get("statut"), v -> status(v, "ACTIF"))));
        audit(actor, "Mise à jour pêcheur", "Pêcheur " + row.get("prenom") + " " + row.get("nom") + " mis à jour");
        return fishermanView(row);
      }
      case embarcations -> {
        Object pecheurId = pick(input, "pecheurId", current.get("pecheurId"), v -> truthy(v) ? v.toString() : null);
        Map<String, Object> owner = truthy(pecheurId) ? required(Collection.pecheurs, findFisherman(pecheurId.toString())) : null;
        Map<String, Object> row = db.one("""
            UPDATE "FishingBoat" SET "nom"=:nom,"immatriculation"=:immatriculation,"type"=:type,"taille"=:taille,"moteur"=:moteur,"statut"=:statut,
              "pecheurId"=:pecheurId,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=:id RETURNING *
            """, Db.params("id", id, "nom", pick(input, "nom", current.get("nom"), QuaiPecheService::text),
            "immatriculation", pick(input, "immatriculation", current.get("immatriculation"), v -> text(v).toUpperCase(Locale.ROOT)),
            "type", pick(input, "type", current.get("type"), QuaiPecheService::text),
            "taille", pick(input, "taille", current.get("taille"), QuaiPecheService::optionalNumber),
            "moteur", pick(input, "moteur", current.get("moteur"), QuaiPecheService::optionalText),
            "statut", pick(input, "statut", current.get("statut"), v -> status(v, "ACTIF")), "pecheurId", pecheurId));
        putOwner(row, owner);
        audit(actor, "Mise à jour embarcation", "Embarcation " + row.get("immatriculation") + " mise à jour");
        return boatView(row);
      }
      case commissions -> {
        Map<String, Object> row = db.one("""
            UPDATE "FishCommission" SET "poids"=:poids,"typePoisson"=:typePoisson,"temperatura"=:temperatura,"observations"=:observations,"statut"=:statut,
              "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=:id RETURNING *
            """, Db.params("id", id, "poids", pick(input, "poids", current.get("poids"), v -> v),
            "typePoisson", pick(input, "typePoisson", current.get("typePoisson"), QuaiPecheService::text),
            "temperatura", pick(input, "temperatura", current.get("temperatura"), v -> v),
            "observations", pick(input, "observations", current.get("observations"), v -> text(v).isEmpty() ? null : text(v)),
            "statut", pick(input, "statut", current.get("statut"), v -> status(v, current.get("statut")))));
        for (String key : List.of("pecheurNom", "pecheurPrenom", "pecheurTelephone", "pecheurNin")) row.put(key, current.get(key));
        audit(actor, "Mise à jour commission", "Commission " + row.get("numero") + " mise à jour");
        return commissionView(row);
      }
      case camions -> {
        Map<String, Object> row = db.one("""
            UPDATE "RefrigeratedTruck" SET "immatriculation"=:immatriculation,"marque"=:marque,"modele"=:modele,"capacite"=:capacite,"chauffeur"=:chauffeur,
              "telephone"=:telephone,"statut"=:statut,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=:id RETURNING *, 0::int AS "expeditionsCount"
            """, Db.params("id", id, "immatriculation", pick(input, "immatriculation", current.get("immatriculation"), v -> text(v).toUpperCase(Locale.ROOT)),
            "marque", pick(input, "marque", current.get("marque"), QuaiPecheService::text),
            "modele", pick(input, "modele", current.get("modele"), QuaiPecheService::optionalText),
            "capacite", pick(input, "capacite", current.get("capacite"), QuaiPecheService::optionalNumber),
            "chauffeur", pick(input, "chauffeur", current.get("chauffeur"), QuaiPecheService::optionalText),
            "telephone", pick(input, "telephone", current.get("telephone"), QuaiPecheService::optionalText),
            "statut", pick(input, "statut", current.get("statut"), v -> status(v, "ACTIF"))));
        audit(actor, "Mise à jour camion", "Camion " + row.get("immatriculation") + " mis à jour");
        return truckView(row);
      }
      default -> {
        Map<String, Object> row = db.one("""
            UPDATE "ShippingExpedition" SET "poids"=:poids,"destination"=:destination,"montant"=:montant,"statut"=:statut,"observations"=:observations,
              "updatedAt"=CURRENT_TIMESTAMP WHERE "id"=:id RETURNING *
            """, Db.params("id", id, "poids", pick(input, "poids", current.get("poids"), v -> v),
            "destination", pick(input, "destination", current.get("destination"), v -> text(v).isEmpty() ? null : text(v)),
            // L'ancien montant saisi reste en historique ; il n'est plus modifiable.
            "montant", current.get("montant"),
            "statut", pick(input, "statut", current.get("statut"), v -> status(v, current.get("statut"))),
            "observations", pick(input, "observations", current.get("observations"), v -> text(v).isEmpty() ? null : text(v))));
        audit(actor, "Mise à jour expédition", "Expédition " + row.get("numero") + " mise à jour");
        return expeditionView(required(Collection.expeditions, find(Collection.expeditions, id)));
      }
    }
  }

  @Transactional
  public void delete(Actor actor, Collection collection, String id) {
    // Une taxe de passage enregistrée est une recette : l'expédition (ou le camion) qui la porte reste.
    String paye = switch (collection) {
      case expeditions -> "SELECT COUNT(*) FROM \"ShippingExpedition\" WHERE \"id\" = :id AND \"transactionId\" IS NOT NULL";
      case camions -> "SELECT COUNT(*) FROM \"ShippingExpedition\" WHERE \"camionId\" = :id AND \"transactionId\" IS NOT NULL";
      default -> null;
    };
    if (paye != null && db.count(paye, Db.params("id", id)) > 0) {
      throw AppException.conflict("Impossible de supprimer : une taxe de passage est enregistrée. Annulez le ticket si nécessaire ; la trace reste.");
    }
    if (db.update("DELETE FROM \"" + TABLE.get(collection) + "\" WHERE \"id\" = :id", Db.params("id", id)) == 0) {
      throw AppException.notFound(NOT_FOUND.get(collection));
    }
    auditTrail.record(actor, "Suppression ressource quai", "Quai de pêche", collection.name() + " " + id + " supprimé", "warning");
  }

  // --- Vues --------------------------------------------------------------------------------------

  private static void putIfTruthy(Map<String, Object> view, String key, Object value) {
    if (truthy(value)) view.put(key, value);
  }

  private static String iso(Map<String, Object> row, String key) {
    return JacksonConfig.iso(Db.date(row, key));
  }

  private static Map<String, Object> fishermanView(Map<String, Object> row) {
    Map<String, Object> view = new LinkedHashMap<>();
    view.put("id", row.get("id"));
    view.put("nom", row.get("nom"));
    view.put("prenom", row.get("prenom"));
    putIfTruthy(view, "telephone", row.get("telephone"));
    putIfTruthy(view, "nin", row.get("nin"));
    putIfTruthy(view, "adresse", row.get("adresse"));
    view.put("statut", row.get("statut"));
    view.put("createdAt", iso(row, "createdAt"));
    view.put("updatedAt", iso(row, "updatedAt"));
    List<Map<String, Object>> boats = new ArrayList<>();
    for (int i = 0; i < (int) Db.num(row, "embarcationsCount"); i++) boats.add(Api.map("id", row.get("id") + "-boat-" + i));
    view.put("embarcations", boats);
    view.put("_count", Api.map("commissions", (long) Db.num(row, "commissionsCount")));
    return view;
  }

  private static Map<String, Object> person(Map<String, Object> row, boolean defaultEmpty) {
    Map<String, Object> pecheur = new LinkedHashMap<>();
    pecheur.put("id", row.get("pecheurId"));
    pecheur.put("nom", defaultEmpty && !truthy(row.get("pecheurNom")) ? "" : row.get("pecheurNom"));
    pecheur.put("prenom", defaultEmpty && !truthy(row.get("pecheurPrenom")) ? "" : row.get("pecheurPrenom"));
    putIfTruthy(pecheur, "telephone", row.get("pecheurTelephone"));
    putIfTruthy(pecheur, "nin", row.get("pecheurNin"));
    pecheur.put("statut", "ACTIF");
    pecheur.put("createdAt", iso(row, "createdAt"));
    pecheur.put("updatedAt", iso(row, "updatedAt"));
    return pecheur;
  }

  private static Map<String, Object> boatView(Map<String, Object> row) {
    Map<String, Object> view = new LinkedHashMap<>();
    view.put("id", row.get("id"));
    view.put("nom", row.get("nom"));
    view.put("immatriculation", row.get("immatriculation"));
    view.put("type", row.get("type"));
    if (row.get("taille") != null) view.put("taille", Db.num(row, "taille"));
    putIfTruthy(view, "moteur", row.get("moteur"));
    view.put("statut", row.get("statut"));
    putIfTruthy(view, "pecheurId", row.get("pecheurId"));
    if (truthy(row.get("pecheurId"))) view.put("pecheur", person(row, true));
    view.put("createdAt", iso(row, "createdAt"));
    view.put("updatedAt", iso(row, "updatedAt"));
    return view;
  }

  private static Map<String, Object> commissionView(Map<String, Object> row) {
    Map<String, Object> view = new LinkedHashMap<>();
    view.put("id", row.get("id"));
    view.put("numero", row.get("numero"));
    view.put("poids", Db.num(row, "poids"));
    view.put("typePoisson", row.get("typePoisson"));
    if (row.get("temperatura") != null) view.put("temperatura", Db.num(row, "temperatura"));
    putIfTruthy(view, "observations", row.get("observations"));
    view.put("statut", row.get("statut"));
    view.put("date", iso(row, "date"));
    view.put("createdAt", iso(row, "createdAt"));
    view.put("updatedAt", iso(row, "updatedAt"));
    view.put("pecheurId", row.get("pecheurId"));
    view.put("pecheur", person(row, false));
    return view;
  }

  private static Map<String, Object> truckView(Map<String, Object> row) {
    Map<String, Object> view = new LinkedHashMap<>();
    view.put("id", row.get("id"));
    view.put("immatriculation", row.get("immatriculation"));
    view.put("marque", row.get("marque"));
    putIfTruthy(view, "modele", row.get("modele"));
    if (row.get("capacite") != null) view.put("capacite", Db.num(row, "capacite"));
    putIfTruthy(view, "chauffeur", row.get("chauffeur"));
    putIfTruthy(view, "telephone", row.get("telephone"));
    view.put("statut", row.get("statut"));
    view.put("createdAt", iso(row, "createdAt"));
    view.put("updatedAt", iso(row, "updatedAt"));
    view.put("_count", Api.map("expeditions", (long) Db.num(row, "expeditionsCount")));
    return view;
  }

  private static Map<String, Object> expeditionView(Map<String, Object> row) {
    Map<String, Object> view = new LinkedHashMap<>();
    view.put("id", row.get("id"));
    view.put("numero", row.get("numero"));
    view.put("date", iso(row, "date"));
    view.put("poids", Db.num(row, "poids"));
    putIfTruthy(view, "destination", row.get("destination"));
    // Montant saisi avant le paiement par ticket : conservé, mais sans valeur de recette.
    if (row.get("montant") != null) view.put("montantSaisi", Db.num(row, "montant"));
    if (row.get("ticketNumero") != null) {
      view.put("paiement", Api.map("transactionId", row.get("transactionId"), "numero", row.get("ticketNumero"), "statut", row.get("ticketStatut"),
          "montant", Db.num(row, "ticketMontant"), "modePaiement", row.get("ticketMode"), "service", row.get("ticketService"),
          "date", iso(row, "ticketDate"), "payeur", row.get("ticketPayeur"), "agent", row.get("ticketAgent")));
    }
    view.put("statut", row.get("statut"));
    putIfTruthy(view, "observations", row.get("observations"));
    view.put("camionId", row.get("camionId"));
    Map<String, Object> camion = new LinkedHashMap<>();
    camion.put("id", row.get("camionId"));
    camion.put("immatriculation", row.get("camionImmatriculation"));
    camion.put("marque", row.get("camionMarque"));
    putIfTruthy(camion, "modele", row.get("camionModele"));
    if (row.get("camionCapacite") != null) camion.put("capacite", Db.num(row, "camionCapacite"));
    putIfTruthy(camion, "chauffeur", row.get("camionChauffeur"));
    putIfTruthy(camion, "telephone", row.get("camionTelephone"));
    camion.put("statut", row.get("camionStatut"));
    camion.put("createdAt", iso(row, "createdAt"));
    camion.put("updatedAt", iso(row, "updatedAt"));
    view.put("camion", camion);
    view.put("createdAt", iso(row, "createdAt"));
    view.put("updatedAt", iso(row, "updatedAt"));
    return view;
  }
}
