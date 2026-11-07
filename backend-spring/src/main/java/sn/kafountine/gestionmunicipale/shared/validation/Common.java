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
    return yearOrCurrent(year);
  }
}
