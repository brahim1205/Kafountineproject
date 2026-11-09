package sn.kafountine.gestionmunicipale.shared.validation;

import java.time.Year;
import java.util.Map;

/** Schémas communs (commonSchemas.ts côté Node). */
public final class Common {
  private Common() {}

  /** resourceIdParamsSchema : identifiant UUID dans le chemin. */
  public static String id(String value) {
    Input input = Input.params(Map.of("id", value == null ? "" : value));
    String id = input.str("id").noTrim().uuid("Identifiant invalide").required();
    input.check();
    return id;
  }

  /** yearSchema optionnel d'une requête (entier entre 2000 et 2100). */
  public static Integer year(Input query) {
    return query.num("year").integer().min(2000, null).max(2100, null).optionalInt();
  }

  /** yearFrom côté Node : année demandée, sinon l'année en cours. */
  public static int yearOrCurrent(Integer year) {
    return year == null ? Year.now().getValue() : year;
  }

  /** yearQuerySchema : seule clé acceptée « year ». */
  public static int yearQuery(Map<String, String[]> parameters) {
    Input query = Input.query(parameters);
    Integer year = year(query);
    query.check();
    return yearOrCurrent(year == null || year == 0 ? null : year);
  }

  /** Page demandée d'une liste : le paramètre « page » active la pagination côté serveur. */
  public record Paging(int page, int limit) {
    public long offset() {
      return (long) (page - 1) * limit;
    }

    public java.util.Map<String, Object> meta(long total) {
      java.util.Map<String, Object> meta = new java.util.LinkedHashMap<>();
      meta.put("page", page);
      meta.put("limit", limit);
      meta.put("total", total);
      meta.put("totalPages", Math.max(1, (long) Math.ceil((double) total / limit)));
      return meta;
    }
  }

  public static final int DEFAULT_PAGE_SIZE = 50;

  /** Null si la liste n'est pas demandée page par page. */
  public static Paging paging(Integer page, Integer limit) {
    if (page == null) return null;
    return new Paging(Math.max(1, page), limit == null ? DEFAULT_PAGE_SIZE : Math.max(1, limit));
  }

  /** yearLimitQuerySchema : year et limit (1 à 500, non utilisé par les listes). */
  public static int yearLimitQuery(Map<String, String[]> parameters) {
    Input query = Input.query(parameters);
    Integer year = year(query);
    query.num("limit").integer().min(1).max(500).optionalInt();
    query.check();
    return yearOrCurrent(year == null || year == 0 ? null : year);
  }
}
