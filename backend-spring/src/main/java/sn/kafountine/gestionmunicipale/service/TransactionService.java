package sn.kafountine.gestionmunicipale.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import sn.kafountine.gestionmunicipale.entity.MunicipalTransaction;
import sn.kafountine.gestionmunicipale.repository.TransactionRepository;

@Service
public class TransactionService {
  private final TransactionRepository transactions;

  public TransactionService(TransactionRepository transactions) {
    this.transactions = transactions;
  }

  public List<Map<String, Object>> categories() {
    return List.of(
      Map.of("id", "etat-civil", "nom", "État Civil", "icon", "ri-file-text-line", "color", "emerald", "description", "Documents administratifs"),
      Map.of("id", "urbanisme", "nom", "Urbanisme", "icon", "ri-building-line", "color", "sky", "description", "Dossiers urbanisme"),
      Map.of("id", "marche", "nom", "Marché", "icon", "ri-store-line", "color", "amber", "description", "Taxes de marché"),
      Map.of("id", "transport", "nom", "Transport", "icon", "ri-car-line", "color", "orange", "description", "Stationnement et transport")
    );
  }

  public List<Map<String, Object>> services(String categoryId) {
    return switch (categoryId) {
      case "etat-civil" -> List.of(Map.of("id", "extrait-naissance", "nom", "Extrait de naissance", "tarif", 500, "unite", "document"));
      case "urbanisme" -> List.of(Map.of("id", "permis-construire", "nom", "Permis de construire", "tarif", 5000, "unite", "m²", "calcul", "surface"));
      case "marche" -> List.of(Map.of("id", "place-marche", "nom", "Location place marché", "tarif", 500, "unite", "jour"));
      case "transport" -> List.of(Map.of("id", "stationnement-moto", "nom", "Stationnement moto", "tarif", 1000, "unite", "an"));
      default -> List.of();
    };
  }

  public Page<MunicipalTransaction> list(String search, String categorie, String statut, Integer year, int page, int limit) {
    return transactions.search(blankToNull(search), blankToNull(categorie), blankToNull(statut), year, PageRequest.of(page - 1, limit));
  }

  public MunicipalTransaction create(Map<String, Object> input, String agentId) {
    MunicipalTransaction tx = new MunicipalTransaction();
    tx.setAgentId(agentId);
    tx.setContribuableId(String.valueOf(input.get("contribuableId")));
    tx.setCategorie(String.valueOf(input.getOrDefault("categorie", input.getOrDefault("type", "taxe"))));
    tx.setService(String.valueOf(input.getOrDefault("service", tx.getCategorie())));
    tx.setQuantite(number(input.get("quantite"), 1).intValue());
    double montant = number(input.get("montant"), 0).doubleValue();
    tx.setMontant(montant);
    tx.setTarifUnitaire(number(input.get("tarifUnitaire"), montant).doubleValue());
    tx.setModePaiement(String.valueOf(input.getOrDefault("modePaiement", "ESPECE")));
    tx.setStatut(String.valueOf(input.getOrDefault("statut", "PAYE")));
    if (input.get("date") instanceof String value && !value.isBlank()) {
      tx.setDate(DateParser.parse(value));
      tx.setYear(tx.getDate().getYear());
    }
    return transactions.save(tx);
  }

  public Map<String, Object> statistiques(int year) {
    return Map.of(
      "year", year,
      "totalTransactions", transactions.countByYear(year),
      "montantTotal", transactions.totalByYear(year)
    );
  }

  public String exportCsv() {
    StringBuilder csv = new StringBuilder("numero,categorie,service,montant,statut,date\n");
    for (MunicipalTransaction tx : transactions.findAll()) {
      csv.append(tx.getNumero()).append(',').append(tx.getCategorie()).append(',').append(tx.getService()).append(',')
        .append(tx.getMontant()).append(',').append(tx.getStatut()).append(',').append(tx.getDate()).append('\n');
    }
    return csv.toString();
  }

  private String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value;
  }

  private Number number(Object value, Number fallback) {
    if (value instanceof Number number) return number;
    if (value instanceof String text && !text.isBlank()) return Double.parseDouble(text);
    return fallback;
  }
}
