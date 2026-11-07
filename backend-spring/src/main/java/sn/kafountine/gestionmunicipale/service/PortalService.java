package sn.kafountine.gestionmunicipale.service;

import io.jsonwebtoken.Claims;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import sn.kafountine.gestionmunicipale.dto.PortalDtos.LoginRequest;
import sn.kafountine.gestionmunicipale.dto.PortalDtos.RegisterRequest;
import sn.kafountine.gestionmunicipale.entity.Contribuable;
import sn.kafountine.gestionmunicipale.entity.MunicipalTransaction;
import sn.kafountine.gestionmunicipale.repository.ContribuableRepository;
import sn.kafountine.gestionmunicipale.repository.TransactionRepository;
import sn.kafountine.gestionmunicipale.security.JwtService;

@Service
public class PortalService {
  private final ContribuableRepository contribuables;
  private final TransactionRepository transactions;
  private final PortalPaymentStore paymentStore;
  private final JwtService jwtService;
  private final String portalUrl;

  public PortalService(
    ContribuableRepository contribuables,
    TransactionRepository transactions,
    PortalPaymentStore paymentStore,
    JwtService jwtService,
    @Value("${app.portal-url:http://127.0.0.1:5173}") String portalUrl
  ) {
    this.contribuables = contribuables;
    this.transactions = transactions;
    this.paymentStore = paymentStore;
    this.jwtService = jwtService;
    this.portalUrl = portalUrl;
  }

  public Map<String, Object> login(LoginRequest request) {
    String nin = trim(request.nin());
    String telephone = trim(request.telephone());
    Contribuable contribuable = nin != null
      ? contribuables.findByNin(nin).orElse(null)
      : telephone != null ? contribuables.findByTelephone(telephone).orElse(null) : null;
    if (contribuable == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Contribuable non trouvé");
    }
    String token = jwtService.signPortal(contribuable.getId());
    return Map.of("token", token, "contribuable", portalContribuable(contribuable));
  }

  @Transactional
  public Map<String, Object> register(RegisterRequest request) {
    String nin = required(request.nin(), "NIN requis");
    if (contribuables.findByNin(nin).isPresent()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce numéro de carte d'identité (NIN) est déjà utilisé par un autre contribuable");
    }
    String telephone = trim(request.telephone());
    if (telephone != null && contribuables.findByTelephone(telephone).isPresent()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce numéro de téléphone est déjà utilisé par un autre contribuable");
    }
    Contribuable contribuable = new Contribuable();
    contribuable.setNin(nin);
    contribuable.setNom(required(request.nom(), "Nom requis"));
    contribuable.setPrenom(required(request.prenom(), "Prénom requis"));
    contribuable.setTelephone(telephone == null ? "" : telephone);
    contribuable.setAdresse(valueOrDefault(request.adresse(), "Non renseignée"));
    contribuable.setLieuNaiss(valueOrDefault(request.lieuNaiss(), "Kafountine"));
    contribuable.setDateNaiss(request.dateNaiss() == null || request.dateNaiss().isBlank() ? DateParser.parse("1990-01-01") : DateParser.parse(request.dateNaiss()));
    contribuable.setTypeContribuable("PARTICULIER");
    contribuable.setMontantImpot(0d);
    contribuable.setActive(true);
    Contribuable saved = contribuables.save(contribuable);
    return Map.of("token", jwtService.signPortal(saved.getId()), "contribuable", portalContribuable(saved));
  }

  public Map<String, Object> profile(String contribuableId) {
    Contribuable contribuable = getContribuable(contribuableId);
    Map<String, Object> data = new LinkedHashMap<>(portalContribuable(contribuable));
    data.put("email", contribuable.getEmail());
    return data;
  }

  public List<Map<String, Object>> taxes(String contribuableId) {
    return transactions.findByContribuableIdOrderByDateDesc(contribuableId).stream().map(tx -> {
      Map<String, Object> tax = new LinkedHashMap<>();
      tax.put("id", tx.getId());
      tax.put("type", tx.getCategorie());
      tax.put("annee", tx.getYear());
      tax.put("montant", tx.getMontant());
      tax.put("statut", "PAYE".equals(tx.getStatut()) ? "PAID" : "PENDING");
      tax.put("dateEcheance", tx.getDate() == null ? null : tx.getDate().toLocalDate().toString());
      return tax;
    }).toList();
  }

  public List<Map<String, Object>> portalTransactions(String contribuableId) {
    return transactions.findByContribuableIdOrderByDateDesc(contribuableId).stream().map(tx -> {
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("id", tx.getId());
      item.put("numero", tx.getNumero());
      item.put("montant", tx.getMontant());
      item.put("statut", tx.getStatut());
      item.put("createdAt", tx.getDate() == null ? "" : tx.getDate().toString());
      item.put("service", tx.getService());
      return item;
    }).toList();
  }

  public Map<String, Object> initiatePayment(Map<String, Object> input, String contribuableId) {
    List<String> taxIds = listOfStrings(input.get("taxes"));
    if (taxIds.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Veuillez sélectionner au moins une taxe à payer");
    }
    List<MunicipalTransaction> selected = transactions.findByContribuableIdAndIdIn(contribuableId, taxIds);
    if (selected.size() != taxIds.size()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Certaines taxes sélectionnées sont introuvables");
    }
    if (selected.stream().allMatch(tx -> "PAYE".equals(tx.getStatut()))) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Les taxes sélectionnées sont déjà payées");
    }
    double amount = selected.stream().mapToDouble(tx -> tx.getMontant() == null ? 0d : tx.getMontant()).sum();
    String phone = valueOrDefault(String.valueOf(input.getOrDefault("phone", input.getOrDefault("telephone", ""))), "");
    String method = valueOrDefault(String.valueOf(input.getOrDefault("method", "wave")), "wave");
    String paymentId = "PAY-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8);
    paymentStore.save(new PortalPaymentStore.PendingPayment(paymentId, contribuableId, taxIds, amount, phone, method, Instant.now()));
    return Map.of(
      "success", true,
      "paymentId", paymentId,
      "transactionId", paymentId,
      "paymentUrl", portalUrl + "/portal/payer?status=success&tx_id=" + paymentId,
      "amount", amount,
      "phone", phone,
      "method", method,
      "taxes", taxIds,
      "categorie", String.valueOf(input.getOrDefault("categorie", "Taxe")),
      "message", "Paiement initialisé"
    );
  }

  @Transactional
  public Map<String, Object> confirmPayment(String paymentId, String reference, String contribuableId) {
    PortalPaymentStore.PendingPayment pending = paymentStore.find(trim(paymentId));
    if (pending == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Paiement portail introuvable ou expiré");
    }
    if (!pending.contribuableId().equals(contribuableId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ce paiement ne vous appartient pas");
    }
    String mode = normalizePaymentMode(pending.method());
    List<MunicipalTransaction> paid = transactions.findByContribuableIdAndIdIn(contribuableId, pending.taxIds());
    for (MunicipalTransaction tx : paid) {
      tx.setStatut("PAYE");
      tx.setModePaiement(mode);
      tx.setDate(OffsetDateTime.now());
      tx.setYear(OffsetDateTime.now().getYear());
    }
    transactions.saveAll(paid);
    paymentStore.delete(pending.paymentId());
    return Map.of(
      "success", true,
      "paymentId", pending.paymentId(),
      "transactionId", paid.isEmpty() ? "" : paid.get(0).getId(),
      "transactionIds", paid.stream().map(MunicipalTransaction::getId).toList(),
      "reference", reference == null ? "" : reference,
      "message", "Paiement confirmé",
      "transaction", Map.of("statut", "PAYE"),
      "transactions", paid
    );
  }

  public Map<String, Object> receipt(String transactionId, String contribuableId) {
    MunicipalTransaction tx = transactions.findById(transactionId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction introuvable"));
    if (!contribuableId.equals(tx.getContribuableId())) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction introuvable");
    }
    Contribuable contribuable = getContribuable(contribuableId);
    Map<String, Object> receipt = new LinkedHashMap<>();
    receipt.put("id", tx.getId());
    receipt.put("numero", tx.getNumero());
    receipt.put("date", tx.getDate() == null ? "" : tx.getDate().toString());
    receipt.put("montant", tx.getMontant());
    receipt.put("statut", tx.getStatut());
    receipt.put("service", tx.getService());
    receipt.put("categorie", tx.getCategorie());
    receipt.put("modePaiement", tx.getModePaiement());
    receipt.put("contribuable", portalContribuable(contribuable));
    return receipt;
  }

  public String portalUserId(HttpServletRequest request) {
    String token = bearerToken(request);
    if (token == null) token = cookie(request, "portal_token");
    if (token == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification portail requise");
    }
    try {
      Claims claims = jwtService.verifyPortal(token);
      if (!"portal".equals(claims.get("type", String.class))) {
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token portail invalide");
      }
      String id = claims.get("id", String.class);
      return id == null ? claims.get("userId", String.class) : id;
    } catch (ResponseStatusException ex) {
      throw ex;
    } catch (Exception ex) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token portail invalide");
    }
  }

  public void ensureOwner(String requestedId, String authenticatedId, String subject) {
    if (!requestedId.equals(authenticatedId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès interdit à ces " + subject);
    }
  }

  private Contribuable getContribuable(String id) {
    return contribuables.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contribuable introuvable"));
  }

  private Map<String, Object> portalContribuable(Contribuable c) {
    Map<String, Object> data = new LinkedHashMap<>();
    data.put("id", c.getId());
    data.put("nom", c.getNom());
    data.put("prenom", c.getPrenom());
    data.put("nin", c.getNin());
    data.put("telephone", c.getTelephone());
    return data;
  }

  private String normalizePaymentMode(String method) {
    String value = method == null ? "" : method.trim().toUpperCase();
    if (value.equals("WAVE") || value.equals("ORANGE") || value.equals("FREE")) return "MOBILE_MONEY";
    return value.isBlank() ? "MOBILE_MONEY" : value;
  }

  @SuppressWarnings("unchecked")
  private List<String> listOfStrings(Object value) {
    if (!(value instanceof List<?> list)) return List.of();
    return list.stream().map(String::valueOf).filter(s -> !s.isBlank()).toList();
  }

  private String bearerToken(HttpServletRequest request) {
    String authorization = request.getHeader("Authorization");
    if (authorization != null && authorization.startsWith("Bearer ")) return authorization.substring(7);
    return null;
  }

  private String cookie(HttpServletRequest request, String name) {
    Cookie[] cookies = request.getCookies();
    if (cookies == null) return null;
    for (Cookie cookie : cookies) {
      if (name.equals(cookie.getName())) return cookie.getValue();
    }
    return null;
  }

  private String required(String value, String message) {
    String normalized = trim(value);
    if (normalized == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    return normalized;
  }

  private String valueOrDefault(String value, String fallback) {
    String normalized = trim(value);
    return normalized == null ? fallback : normalized;
  }

  private String trim(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }
}
