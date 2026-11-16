package sn.kafountine.gestionmunicipale.modules.transactions;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import sn.kafountine.gestionmunicipale.shared.web.Body;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.security.Authenticated;
import sn.kafountine.gestionmunicipale.shared.security.Roles;
import sn.kafountine.gestionmunicipale.shared.validation.Common;
import sn.kafountine.gestionmunicipale.shared.validation.Input;
import sn.kafountine.gestionmunicipale.shared.web.RequestContext;

/** Routes /api/v1/transactions (transactions.routes.ts côté Node). */
@RestController
@RequestMapping("/api/v1/transactions")
public class TransactionsController {
  private static final String[] MODES = Common.MODES_PAIEMENT;
  private static final String[] STATUTS = {"PAYE", "EN_ATTENTE", "ANNULE"};
  private static final String DAY = "^\\d{4}-\\d{2}-\\d{2}$";
  private final TransactionService service;

  public TransactionsController(TransactionService service) {
    this.service = service;
  }

  @GetMapping("/categories")
  @Authenticated
  public ResponseEntity<Map<String, Object>> categories() {
    return Api.ok(service.categories());
  }

  @GetMapping("/categories/{id}/services")
  @Authenticated
  public ResponseEntity<Map<String, Object>> categoryServices(@PathVariable String id) {
    Input params = Input.params(Map.of("id", id));
    String categoryId = params.str("id").trimmed(1, 100, "ID catégorie requis").required();
    params.check();
    return Api.ok(service.categoryServices(categoryId));
  }

  @GetMapping("/categories-utilisees")
  @Authenticated
  public ResponseEntity<Map<String, Object>> usedCategories(HttpServletRequest request) {
    return Api.ok(service.usedCategories(Common.yearQuery(request.getParameterMap())));
  }

  /** transactionCriteria : critères communs à la liste et à l'export. */
  private static TransactionService.Criteria criteria(Input query) {
    String search = query.str("search").max(100).optional();
    String startDate = query.str("startDate").pattern(DAY, "Date attendue au format AAAA-MM-JJ").optionalPlain();
    String endDate = query.str("endDate").pattern(DAY, "Date attendue au format AAAA-MM-JJ").optionalPlain();
    String categorie = query.str("categorie").max(100).optional();
    String statut = query.str("statut").max(20).optional();
    String agentId = query.str("agentId").uuid("ID agent invalide").optionalPlain();
    Integer year = Common.year(query);
    // criteriaFrom : une valeur vide vaut absente.
    return new TransactionService.Criteria(blank(search), blank(categorie), blank(statut), blank(agentId), blank(startDate), blank(endDate),
        year == null || year == 0 ? null : year, null);
  }

  private static String blank(String value) {
    return value == null || value.isEmpty() ? null : value;
  }

  @GetMapping
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "SERVICE_FINANCES", "ETAT_CIVIL", "REGISSEUR"})
  @SuppressWarnings("unchecked")
  public ResponseEntity<Map<String, Object>> list(HttpServletRequest request) {
    Input query = Input.query(request.getParameterMap());
    int page = query.num("page").integer().min(1).optionalInt(1);
    int limit = query.num("limit").integer().min(1).max(300).optionalInt(20);
    TransactionService.Criteria criteria = criteria(query).scopedTo(RequestContext.user().role());
    query.check();
    Map<String, Object> result = service.list(criteria, Math.max(1, page), Math.min(300, Math.max(1, limit)));
    return Api.okWithMeta(result.get("data"), (Map<String, Object>) result.get("meta"));
  }

  /**
   * Droits que le compte Quai de pêche peut enregistrer lui-même (arrêté du 8 mai 2024). La taxe des camions
   * frigorifiques passe par l'expédition, pour rester reliée au passage du camion.
   */
  static final Map<String, java.util.Set<String>> DROITS_QUAI = Map.of(
      "stationnement-transport", java.util.Set.of("Transport maritime - Pecheurs saisonniers", "Transport poisson - Moto chargeant poisson"),
      "marche", java.util.Set.of("Etals - Poissonnerie (etalage)"));

  static boolean droitQuai(String categorie, String service) {
    return categorie != null && service != null && DROITS_QUAI.getOrDefault(categorie, java.util.Set.of()).contains(service);
  }

  @PostMapping
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "SERVICE_FINANCES", "REGISSEUR", "QUAI_PECHE"})
  public ResponseEntity<Map<String, Object>> create(@Body JsonNode body) {
    Input input = Input.body(body);
    String contribuableId = input.str("contribuableId").noTrim().uuid("ID contribuable invalide").required();
    String categorie = input.str("categorie").max(100).optional();
    String type = input.str("type").trimmed(1, 100, "Type de transaction requis").required();
    String serviceName = input.str("service").max(120).optional();
    int quantite = input.num("quantite").integer().min(1).optionalInt(1);
    Double montant = input.num("montant").min(0, "Le montant doit être positif").required();
    String mode = input.str("modePaiement").oneOf(MODES).optional();
    String statut = input.str("statut").oneOf(STATUTS).optional();
    String date = input.str("date").max(50).optional();
    input.str("reference").max(120).optional();
    input.check();
    if ("QUAI_PECHE".equalsIgnoreCase(RequestContext.user().role()) && !droitQuai(categorie, serviceName)) {
      throw AppException.forbidden("Le quai de pêche n'enregistre que ses droits : pêcheurs saisonniers, moto chargeant du poisson, poissonnerie.");
    }
    return Api.created(service.create(RequestContext.actor(), new TransactionService.CreateInput(contribuableId, RequestContext.user().userId(),
        categorie, type, serviceName, quantite, montant, mode == null ? "ESPECE" : mode, statut == null ? "PAYE" : statut, date)));
  }

  @GetMapping("/statistiques")
  @Roles({"ADMIN", "SUPER_ADMIN", "SERVICE_FINANCES", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> statistics(HttpServletRequest request) {
    return Api.ok(service.statistics(Common.yearQuery(request.getParameterMap())));
  }

  @GetMapping("/export")
  @Roles({"ADMIN", "SUPER_ADMIN", "SERVICE_FINANCES", "REGISSEUR"})
  public void export(HttpServletRequest request, HttpServletResponse response) throws IOException {
    Input query = Input.query(request.getParameterMap());
    TransactionService.Criteria parsed = criteria(query);
    query.check();
    int year = Common.yearOrCurrent(parsed.year());
    TransactionService.Criteria criteria = new TransactionService.Criteria(parsed.search(), parsed.categorie(), parsed.statut(), parsed.agentId(),
        parsed.startDate(), parsed.endDate(), year, null).scopedTo(RequestContext.user().role());
    response.setStatus(200);
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", "attachment; filename=\"tickets_" + year + ".csv\"");
    Writer out = new OutputStreamWriter(response.getOutputStream(), StandardCharsets.UTF_8);
    service.export(criteria, out);
    out.flush();
  }

  @PutMapping("/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> update(@PathVariable String id, @Body JsonNode body) {
    String transactionId = uuid(id);
    Input input = Input.body(body);
    String contribuableId = input.str("contribuableId").noTrim().uuid("ID contribuable invalide").optionalPlain();
    String type = input.str("type").max(100).optional();
    String serviceName = input.str("service").max(120).optional();
    Integer quantite = input.num("quantite").integer().min(1).optionalInt();
    Double montant = input.num("montant").min(0, "Le montant doit être positif").optional();
    String mode = input.str("modePaiement").oneOf(MODES).optional();
    String statut = input.str("statut").oneOf(STATUTS).optional();
    input.check();
    return Api.ok(service.update(RequestContext.actor(), transactionId,
        new TransactionService.UpdateInput(contribuableId, type, serviceName, quantite, montant, mode, statut)));
  }

  @DeleteMapping("/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> delete(@PathVariable String id) {
    service.delete(RequestContext.actor(), uuid(id));
    return Api.ok(Api.map("success", true));
  }

  /** transactionIdParamSchema. */
  private static String uuid(String id) {
    Input params = Input.params(Map.of("id", id));
    String value = params.str("id").noTrim().uuid("ID invalide").required();
    params.check();
    return value;
  }
}
