package sn.kafountine.gestionmunicipale.modules.transactions;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.stereotype.Component;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;
import sn.kafountine.gestionmunicipale.shared.text.Js;

/**
 * Catalogue des taxes (PrismaTaxCatalog côté Node) : les tarifs actifs en base, sinon la nomenclature
 * municipale embarquée (municipal-tariffs.json, générée depuis municipalTariffs.ts).
 */
@Component
public class TaxCatalog {
  private static final String SQL = """
      SELECT c."id" AS "categoryId", c."nom" AS "categoryNom", c."icon" AS "categoryIcon", c."color" AS "categoryColor",
             c."description" AS "categoryDescription", i."nom" AS "serviceNom", i."tarif" AS "tarif", i."unite" AS "unite",
             i."calcul" AS "calcul", i."sortOrder" AS "sortOrder"
      FROM "MunicipalTariffCategory" c
      INNER JOIN "MunicipalTariffItem" i ON i."categoryId" = c."id"
      WHERE c."isActive" = true AND i."isActive" = true %s
      ORDER BY c."sortOrder" ASC, i."sortOrder" ASC, i."nom" ASC
      """;

  private final Db db;
  private final List<Map<String, Object>> fallbackCategories = new ArrayList<>();
  private final Map<String, List<Map<String, Object>>> fallbackServices = new LinkedHashMap<>();

  public TaxCatalog(Db db, ObjectMapper mapper) throws IOException {
    this.db = db;
    try (InputStream in = getClass().getResourceAsStream("/catalog/municipal-tariffs.json")) {
      List<Map<String, Object>> seeds = mapper.readValue(in, new TypeReference<>() {});
      for (Map<String, Object> seed : seeds) {
        @SuppressWarnings("unchecked") Map<String, Object> category = (Map<String, Object>) seed.get("category");
        @SuppressWarnings("unchecked") List<Map<String, Object>> services = (List<Map<String, Object>>) seed.get("services");
        fallbackCategories.add(category);
        String id = (String) category.get("id");
        List<Map<String, Object>> list = new ArrayList<>();
        for (Map<String, Object> service : services) {
          list.add(service(id, (String) service.get("nom"), ((Number) service.get("tarif")).doubleValue(), (String) service.get("unite"), (String) service.get("calcul")));
        }
        fallbackServices.put(id, list);
      }
    }
  }

  /** Nomenclature embarquée (utilisée aussi pour initialiser les tarifs en base). */
  public List<Map<String, Object>> fallbackCategories() {
    return fallbackCategories;
  }

  public Map<String, List<Map<String, Object>>> fallbackServices() {
    return fallbackServices;
  }

  private static Map<String, Object> service(String categoryId, String nom, double tarif, String unite, String calcul) {
    Map<String, Object> service = new LinkedHashMap<>();
    service.put("id", categoryId + "-" + Js.slugify(nom));
    service.put("nom", nom);
    service.put("tarif", tarif);
    service.put("unite", unite);
    if (calcul != null && !calcul.isEmpty()) service.put("calcul", calcul);
    return service;
  }

  private List<Map<String, Object>> rows(String categoryId) {
    try {
      if (categoryId != null) return db.list(SQL.formatted("AND c.\"id\" = :id"), Db.params("id", categoryId));
      return db.list(SQL.formatted(""), new MapSqlParameterSource());
    } catch (RuntimeException e) {
      return List.of();
    }
  }

  public List<Map<String, Object>> listCategories() {
    List<Map<String, Object>> rows = rows(null);
    if (rows.isEmpty()) return fallbackCategories;
    Set<String> seen = new LinkedHashSet<>();
    List<Map<String, Object>> categories = new ArrayList<>();
    for (Map<String, Object> row : rows) {
      String id = Db.str(row, "categoryId");
      if (!seen.add(id)) continue;
      Map<String, Object> category = new LinkedHashMap<>();
      category.put("id", id);
      category.put("nom", row.get("categoryNom"));
      putIfPresent(category, "icon", row.get("categoryIcon"));
      putIfPresent(category, "color", row.get("categoryColor"));
      putIfPresent(category, "description", row.get("categoryDescription"));
      categories.add(category);
    }
    return categories;
  }

  /** `valeur || undefined` : une chaîne vide ou null disparaît du JSON. */
  private static void putIfPresent(Map<String, Object> target, String key, Object value) {
    if (value != null && !value.toString().isEmpty()) target.put(key, value);
  }

  public List<Map<String, Object>> listServices(String categoryId) {
    List<Map<String, Object>> rows = rows(categoryId);
    if (rows.isEmpty()) return fallbackServices.getOrDefault(categoryId, List.of());
    List<Map<String, Object>> services = new ArrayList<>();
    for (Map<String, Object> row : rows) {
      services.add(service(Db.str(row, "categoryId"), Db.str(row, "serviceNom"), Db.num(row, "tarif"), Db.str(row, "unite"), Db.str(row, "calcul")));
    }
    return services;
  }
}
