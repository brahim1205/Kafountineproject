package sn.kafountine.gestionmunicipale.modules.rapports;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Year;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import sn.kafountine.gestionmunicipale.shared.web.Body;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.security.Roles;
import sn.kafountine.gestionmunicipale.shared.validation.Input;
import sn.kafountine.gestionmunicipale.shared.web.RequestContext;

/** Routes /api/v1/exports (rapports.routes.ts côté Node). */
@RestController
@RequestMapping("/api/v1/exports")
public class RapportsController {
  private static final String[][] OPTIONAL_RECEIPT = {{"agent", "120"}, {"telephone", "20"}, {"nin", "40"}, {"adresse", "255"}, {"reference", "120"},
      {"categorie", "160"}, {"service", "160"}, {"quantite", "40"}, {"unite", "80"}, {"tarifUnitaire", "80"}, {"modePaiement", "80"}, {"statut", "80"},
      {"localisation", "255"}, {"nature", "160"}, {"description", "500"}};
  private final RapportService service;

  public RapportsController(RapportService service) {
    this.service = service;
  }

  private static ResponseEntity<byte[]> pdf(RapportService.Pdf pdf) {
    return ResponseEntity.ok()
        .header("Content-Type", "application/pdf")
        .header("Content-Disposition", "attachment; filename=\"" + pdf.filename() + "\"")
        .body(pdf.content());
  }

  @PostMapping("/receipt.pdf")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT", "SERVICE_FINANCES", "QUAI_PECHE", "REGISSEUR"})
  public ResponseEntity<byte[]> receipt(@Body JsonNode body) {
    Input input = Input.body(body);
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("ticketNumber", input.str("ticketNumber").trimmed(1, 120, "Numéro requis").required());
    values.put("date", input.str("date").trimmed(1, 80, "Date requise").required());
    values.put("time", input.str("time").trimmed(1, 20, "Heure requise").required());
    values.put("contributor", input.str("contributor").trimmed(1, 160, "Contribuable requis").required());
    values.put("type", input.str("type").trimmed(1, 160, "Type requis").required());
    values.put("amount", input.num("amount").positive("Valeur positive requise").required());
    for (String[] field : OPTIONAL_RECEIPT) values.put(field[0], input.str(field[0]).max(Integer.parseInt(field[1])).optional());
    input.check();
    return pdf(service.receipt(RequestContext.actor(), values));
  }

  @PostMapping("/report.pdf")
  @Roles({"ADMIN", "SUPER_ADMIN", "SERVICE_FINANCES", "REGISSEUR"})
  public ResponseEntity<byte[]> report(@Body JsonNode body) {
    Input input = Input.body(body);
    Double year = input.num("year").integer().min(2000).max(2100).required();
    Double total = input.num("total").min(0, "Valeur positive ou nulle requise").required();
    Double taux = input.num("tauxRecouvrement").min(0, "Valeur positive ou nulle requise").required();
    Double transactions = input.num("totalTransactions").integer().min(0).required();
    Double contribuables = input.num("totalContribuables").integer().min(0).required();
    List<Map<String, Object>> modules = input.array("modules", 50, item -> {
      Map<String, Object> module = new LinkedHashMap<>();
      module.put("name", item.str("name").trimmed(1, 120, "Module invalide").required());
      module.put("amount", item.num("amount").min(0, "Valeur positive ou nulle requise").required());
      module.put("evolution", item.num("evolution").optional());
      return module;
    });
    List<Map<String, Object>> top = input.array("topContribuables", 100, item -> {
      Map<String, Object> entry = new LinkedHashMap<>();
      entry.put("name", item.str("name").trimmed(1, 160, "Contribuable invalide").required());
      entry.put("amount", item.num("amount").min(0, "Valeur positive ou nulle requise").required());
      return entry;
    });
    input.check();
    return pdf(service.report(RequestContext.actor(), new RapportService.ReportInput(year.intValue(), total, taux, transactions, contribuables, modules, top)));
  }

  /** Sans schéma côté Node : Number(year) || année en cours. */
  @GetMapping("/report-data")
  @Roles({"ADMIN", "SUPER_ADMIN", "SERVICE_FINANCES", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> reportData(HttpServletRequest request) {
    String[] values = request.getParameterMap().get("year");
    double parsed = values == null || values.length == 0 ? Double.NaN : Input.jsNumber(JsonNodeFactory.instance.textNode(values[values.length - 1]));
    int year = Double.isNaN(parsed) || parsed == 0 ? Year.now().getValue() : (int) parsed;
    return Api.ok(service.reportData(year));
  }
}
