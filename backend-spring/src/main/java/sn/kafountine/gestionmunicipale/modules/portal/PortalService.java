package sn.kafountine.gestionmunicipale.modules.portal;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import sn.kafountine.gestionmunicipale.shared.config.Env;
import sn.kafountine.gestionmunicipale.shared.config.JacksonConfig;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;
import sn.kafountine.gestionmunicipale.shared.persistence.Kv;
import sn.kafountine.gestionmunicipale.shared.security.JwtTokenService;
import sn.kafountine.gestionmunicipale.shared.text.Js;

/** Portail du contribuable (cas d'usage du module portal côté Node). */
@Service
public class PortalService {
  static final String PAYMENTS_UNAVAILABLE = "Le paiement en ligne n'est pas encore disponible. Réglez vos taxes au guichet de la mairie, muni de votre NIN.";
  private static final long PAYMENT_TTL_SECONDS = 15 * 60;

  public record Verified(String token, Map<String, Object> contribuable) {}

  private final Db db;
  private final Kv kv;
  private final ObjectMapper mapper;
  private final PortalOtpService otp;
  private final JwtTokenService tokens;

  public PortalService(Db db, Kv kv, ObjectMapper mapper, PortalOtpService otp, JwtTokenService tokens) {
    this.db = db;
    this.kv = kv;
    this.mapper = mapper;
    this.otp = otp;
    this.tokens = tokens;
  }

  private Map<String, Object> byNin(String nin) {
    return db.one("SELECT * FROM \"Contribuable\" WHERE \"nin\" = :nin", Db.params("nin", nin));
  }

  private Map<String, Object> byId(String id) {
    return db.one("SELECT * FROM \"Contribuable\" WHERE \"id\" = :id", Db.params("id", id));
  }

  private static Map<String, Object> publicView(Map<String, Object> c) {
    return Api.map("id", c.get("id"), "nom", c.get("nom"), "prenom", c.get("prenom"), "nin", c.get("nin"), "telephone", c.get("telephone"));
  }

  public Map<String, Object> requestOtp(String nin, String telephone) {
    Map<String, Object> contribuable = nin == null || nin.isEmpty() ? null : byNin(nin.strip());
    if (contribuable == null || !Db.str(contribuable, "telephone").strip().equals(telephone == null ? null : telephone.strip())) {
      throw AppException.unauthorized("Identifiants invalides");
    }
    Map<String, Object> result = new LinkedHashMap<>(otp.createChallenge(Db.str(contribuable, "id"), Db.str(contribuable, "telephone")));
    result.put("contribuable", publicView(contribuable));
    return result;
  }

  public Verified verifyOtp(String requestId, String code) {
    String contribuableId = otp.verify(requestId, code.strip());
    Map<String, Object> contribuable = byId(contribuableId);
    if (contribuable == null) throw AppException.unauthorized("Identifiants invalides");
    return new Verified(tokens.signPortalToken(Db.str(contribuable, "id")), publicView(contribuable));
  }

  public Map<String, Object> register(String nin, String nom, String prenom, String telephone, String adresse, String lieuNaiss, String dateNaiss) {
    String normalizedNin = nin.strip();
    String phone = telephone == null ? null : telephone.strip();
    if (byNin(normalizedNin) != null) throw AppException.conflict("Ce numéro de carte d'identité (NIN) est déjà utilisé par un autre contribuable");
    if (phone != null && !phone.isEmpty()
        && db.one("SELECT \"id\" FROM \"Contribuable\" WHERE \"telephone\" = :t LIMIT 1", Db.params("t", phone)) != null) {
      throw AppException.conflict("Ce numéro de téléphone est déjà utilisé par un autre contribuable");
    }
    Instant birth = dateNaiss == null ? Instant.parse("1990-01-01T00:00:00.000Z") : Js.parseDate(dateNaiss);
    if (birth == null) throw new IllegalArgumentException("Invalid Date");
    String id = Db.uuid();
    Instant now = Instant.now();
    db.update("""
        INSERT INTO "Contribuable" ("id","nin","nom","prenom","dateNaiss","lieuNaiss","adresse","telephone","email","profession","typeContribuable","zone","montantImpot","isActive","createdAt","updatedAt")
        VALUES (:id,:nin,:nom,:prenom,:dateNaiss,:lieuNaiss,:adresse,:telephone,NULL,NULL,'PARTICULIER',NULL,0,true,:now,:now)
        """, Db.params("id", id, "nin", normalizedNin, "nom", nom.strip(), "prenom", prenom.strip(), "dateNaiss", birth,
        "lieuNaiss", lieuNaiss == null || lieuNaiss.strip().isEmpty() ? "Kafountine" : lieuNaiss.strip(),
        "adresse", adresse == null || adresse.strip().isEmpty() ? "Non renseignée" : adresse.strip(), "telephone", phone == null ? "" : phone, "now", now));
    return Api.map("contribuable", publicView(byId(id)));
  }

  public Map<String, Object> profile(String id) {
    // Jeton sans identifiant de contribuable (jeton d'agent) : Prisma échoue côté Node, sans divulguer de données.
    if (id == null) throw new IllegalArgumentException("Identifiant manquant");
    Map<String, Object> c = byId(id);
    if (c == null) throw AppException.notFound("Contribuable introuvable");
    return Api.map("id", c.get("id"), "nom", c.get("nom"), "prenom", c.get("prenom"), "nin", c.get("nin"), "telephone", c.get("telephone"), "email", c.get("email"));
  }

  private List<Map<String, Object>> transactionsOf(String id) {
    return db.list("SELECT \"id\",\"numero\",\"categorie\",\"service\",\"year\",\"montant\",\"statut\",\"date\" FROM \"Transaction\" WHERE \"contribuableId\" = :id ORDER BY \"createdAt\" DESC", Db.params("id", id));
  }

  public List<Map<String, Object>> taxes(String id) {
    List<Map<String, Object>> result = new ArrayList<>();
    for (Map<String, Object> t : transactionsOf(id)) {
      result.add(Api.map("id", t.get("id"), "type", t.get("categorie"), "annee", t.get("year"), "montant", Db.num(t, "montant"),
          "statut", "PAYE".equals(t.get("statut")) ? "PAID" : "PENDING", "dateEcheance", JacksonConfig.iso(Db.date(t, "date")).substring(0, 10)));
    }
    return result;
  }

  public List<Map<String, Object>> transactions(String id) {
    List<Map<String, Object>> result = new ArrayList<>();
    for (Map<String, Object> t : transactionsOf(id)) {
      result.add(Api.map("id", t.get("id"), "numero", t.get("numero"), "montant", Db.num(t, "montant"), "statut", t.get("statut"),
          "createdAt", JacksonConfig.iso(Db.date(t, "date")), "service", t.get("service")));
    }
    return result;
  }

  public Map<String, Object> availability() {
    return Api.map("enabled", Env.PORTAL_ONLINE_PAYMENTS, "message", Env.PORTAL_ONLINE_PAYMENTS ? null : PAYMENTS_UNAVAILABLE);
  }

  private static void assertEnabled() {
    if (!Env.PORTAL_ONLINE_PAYMENTS) throw new AppException(503, PAYMENTS_UNAVAILABLE);
  }

  public Map<String, Object> initiate(String contribuableId, List<String> taxes, String phone, String telephone, String method, String categorie) {
    assertEnabled();
    List<String> taxIds = taxes == null ? List.of() : taxes.stream().filter(t -> !t.isEmpty()).toList();
    if (taxIds.isEmpty()) throw AppException.validation("Veuillez sélectionner au moins une taxe à payer");
    List<Map<String, Object>> selected = db.list("SELECT \"id\",\"numero\",\"montant\",\"statut\" FROM \"Transaction\" WHERE \"contribuableId\" = :c AND \"id\" IN (:ids)",
        Db.params("c", contribuableId, "ids", taxIds));
    if (selected.size() != taxIds.size()) throw AppException.notFound("Certaines taxes sélectionnées sont introuvables");
    if (selected.stream().allMatch(t -> "PAYE".equals(t.get("statut")))) throw AppException.conflict("Les taxes sélectionnées sont déjà payées");
    double amount = 0;
    for (Map<String, Object> t : selected) amount += Db.num(t, "montant");
    String resolvedPhone = (phone != null && !phone.isEmpty() ? phone : telephone != null ? telephone : "").strip();
    String resolvedMethod = (method != null && !method.isEmpty() ? method : "wave").strip();
    String paymentId = "PAY-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8);
    Map<String, Object> pending = new LinkedHashMap<>();
    pending.put("paymentId", paymentId);
    pending.put("contribuableId", contribuableId);
    pending.put("taxIds", taxIds);
    pending.put("amount", amount);
    pending.put("phone", resolvedPhone);
    pending.put("method", resolvedMethod);
    pending.put("createdAt", JacksonConfig.iso(Instant.now()));
    if (!kv.usesRedis()) throw new IllegalStateException("Redis indisponible pour stocker le paiement portail");
    try {
      kv.set("portal:payment:" + paymentId, mapper.writeValueAsString(pending), PAYMENT_TTL_SECONDS);
    } catch (JsonProcessingException e) {
      throw new IllegalStateException(e);
    }
    return Api.map("success", true, "paymentId", paymentId, "transactionId", paymentId,
        "paymentUrl", Env.PORTAL_URL + "/portal/payer?status=success&tx_id=" + Js.encodeURIComponent(paymentId), "amount", amount, "phone", resolvedPhone,
        "method", resolvedMethod, "taxes", taxIds, "categorie", categorie != null && !categorie.isEmpty() ? categorie : "Taxe", "message", "Paiement initialisé");
  }

  @SuppressWarnings("unchecked")
  public Map<String, Object> confirm(String contribuableId, String transactionId, String reference) {
    assertEnabled();
    String paymentId = transactionId == null ? "" : transactionId.strip();
    String raw = kv.usesRedis() ? kv.get("portal:payment:" + paymentId) : null;
    if (raw == null || raw.isEmpty()) throw AppException.notFound("Paiement portail introuvable ou expiré");
    Map<String, Object> pending;
    try {
      pending = mapper.readValue(raw, LinkedHashMap.class);
    } catch (JsonProcessingException e) {
      throw new IllegalStateException(e);
    }
    if (!java.util.Objects.equals(contribuableId, pending.get("contribuableId"))) throw AppException.forbidden("Ce paiement ne vous appartient pas");
    List<String> ids = (List<String>) pending.get("taxIds");
    String method = String.valueOf(pending.get("method")).toUpperCase(Locale.ROOT);
    String mode = method.equals("WAVE") || method.equals("ORANGE") || method.equals("FREE") ? "MOBILE_MONEY" : method;
    Timestamp now = Timestamp.from(Instant.now());
    db.update("UPDATE \"Transaction\" SET \"statut\" = 'PAYE', \"modePaiement\" = :mode, \"date\" = :now, \"updatedAt\" = :now WHERE \"contribuableId\" = :c AND \"id\" IN (:ids) AND \"statut\" <> 'PAYE'",
        Db.params("mode", mode, "now", now, "c", contribuableId, "ids", ids));
    List<Map<String, Object>> transactions = new ArrayList<>();
    for (Map<String, Object> t : db.list("SELECT \"id\",\"numero\",\"montant\",\"statut\",\"service\",\"date\" FROM \"Transaction\" WHERE \"contribuableId\" = :c AND \"id\" IN (:ids) ORDER BY \"createdAt\" DESC", Db.params("c", contribuableId, "ids", ids))) {
      Map<String, Object> item = new LinkedHashMap<>(t);
      item.put("montant", Db.num(t, "montant"));
      transactions.add(item);
    }
    kv.delete("portal:payment:" + paymentId);
    return Api.map("success", true, "paymentId", paymentId, "transactionId", transactions.isEmpty() ? null : transactions.get(0).get("id"),
        "transactionIds", transactions.stream().map(t -> t.get("id")).toList(), "reference", reference != null && !reference.isEmpty() ? reference : null,
        "message", "Paiement confirmé", "transaction", Api.map("statut", "PAYE"), "transactions", transactions);
  }

  public Map<String, Object> receipt(String id, String contribuableId) {
    Map<String, Object> t = db.one("SELECT * FROM \"Transaction\" WHERE \"id\" = :id", Db.params("id", id));
    if (t == null || !java.util.Objects.equals(contribuableId, t.get("contribuableId"))) throw AppException.notFound("Transaction introuvable");
    return Api.map("id", t.get("id"), "numero", t.get("numero"), "date", JacksonConfig.iso(Db.date(t, "date")), "montant", Db.num(t, "montant"), "statut", t.get("statut"),
        "service", t.get("service"), "categorie", t.get("categorie"), "modePaiement", t.get("modePaiement"), "contribuable", publicView(byId(contribuableId)));
  }
}
