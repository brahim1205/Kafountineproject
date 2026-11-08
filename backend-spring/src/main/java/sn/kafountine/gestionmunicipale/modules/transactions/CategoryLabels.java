package sn.kafountine.gestionmunicipale.modules.transactions;

import java.text.Normalizer;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.UnaryOperator;
import org.springframework.stereotype.Component;

/**
 * Libellés des catégories de recettes (categoryLabels.ts) : « etat-civil », « ETAT_CIVIL »,
 * « Etat civil » ou « État civil » sont ramenés au même libellé.
 */
@Component
public class CategoryLabels {
  private static final List<Map.Entry<String, List<String>>> CANONICAL = List.of(
      Map.entry("État civil", List.of("etat-civil")),
      Map.entry("Urbanisme", List.of("urbanisme", "urbanisme-habitat")),
      Map.entry("Marché", List.of("marche")),
      Map.entry("Motos", List.of("motos", "moto")),
      Map.entry("Stationnement et transport", List.of("stationnement-transport", "transport")),
      Map.entry("Occupation et réglementation", List.of("occupation-reglementation")),
      Map.entry("Ressources naturelles", List.of("ressources-naturelles")),
      Map.entry("Pénalités", List.of("penalites", "penalite")),
      Map.entry("Taxes", List.of("taxe", "taxes")),
      Map.entry("Autres", List.of("autre", "autres")));

  private final TaxCatalog catalog;

  public CategoryLabels(TaxCatalog catalog) {
    this.catalog = catalog;
  }

  /** Clé de comparaison : sans accents, sans casse, séparateurs unifiés. */
  public static String key(String value) {
    String text = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD).replaceAll("[\\u0300-\\u036f]", "");
    return text.toLowerCase(Locale.ROOT).replace("&", " ").replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
  }

  private static String prettify(String raw) {
    if (raw.matches("^[A-Z0-9_]+$") && raw.matches(".*[A-Z].*")) {
      String words = String.join(" ", java.util.Arrays.stream(raw.toLowerCase(Locale.ROOT).split("_")).filter(w -> !w.isEmpty()).toList());
      return words.isEmpty() ? "" : Character.toUpperCase(words.charAt(0)) + words.substring(1);
    }
    return raw;
  }

  public UnaryOperator<String> labeler() {
    Map<String, String> labels = new HashMap<>();
    for (var entry : CANONICAL) {
      for (String k : entry.getValue()) labels.put(k, entry.getKey());
    }
    try {
      for (Map<String, Object> category : catalog.listCategories()) {
        String id = String.valueOf(category.get("id"));
        String nom = String.valueOf(category.get("nom"));
        String label = labels.getOrDefault(key(id), labels.getOrDefault(key(nom), nom));
        labels.putIfAbsent(key(id), label);
        labels.putIfAbsent(key(nom), label);
      }
    } catch (RuntimeException ignored) {
      // Catalogue indisponible : la nomenclature fixe suffit.
    }
    return categorie -> {
      String raw = categorie == null ? "" : categorie.strip();
      if (raw.isEmpty()) return "Autres";
      String label = labels.get(key(raw));
      return label != null ? label : prettify(raw);
    };
  }
}
