package sn.kafountine.gestionmunicipale.shared.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;

/**
 * Validation des entrées, équivalente aux schémas Zod « .strict() » du backend Node : clés inconnues
 * refusées, chaînes nettoyées, nombres convertis (z.coerce), erreurs regroupées dans « details »
 * ({ field, message }) sous le message « Données invalides ».
 */
public final class Input {
  private static final Pattern EMAIL = Pattern.compile("^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-\\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$");
  private static final Pattern UUID = Pattern.compile("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");

  private final ObjectNode node;
  private final boolean query;
  private final Set<String> declared = new LinkedHashSet<>();
  private final List<Map<String, String>> issues = new ArrayList<>();
  /** Corps non-objet : Zod s'arrête à l'erreur racine. */
  private boolean rootFailed;

  private Input(ObjectNode node, boolean query) {
    this.node = node;
    this.query = query;
  }

  /** Corps JSON d'une requête (absent ou non-objet : objet vide, comme express.json). */
  public static Input body(JsonNode body) {
    if (body == null || body.isNull() || body.isMissingNode()) return new Input(JsonNodeFactory.instance.objectNode(), false);
    if (!body.isObject()) {
      Input input = new Input(JsonNodeFactory.instance.objectNode(), false);
      input.issue("", "Entrée invalide : objet attendu, " + received(body) + " reçu");
      input.rootFailed = true;
      return input;
    }
    return new Input((ObjectNode) body, false);
  }

  /** Paramètres de requête (chaînes) : les nombres et booléens sont convertis comme z.coerce. */
  public static Input query(Map<String, String[]> parameters) {
    ObjectNode node = JsonNodeFactory.instance.objectNode();
    parameters.forEach((key, values) -> {
      if (values == null || values.length == 0) return;
      if (values.length == 1) {
        node.put(key, values[0]);
      } else {
        // ?a=1&a=2 donne un tableau côté Express (qs).
        com.fasterxml.jackson.databind.node.ArrayNode array = node.putArray(key);
        for (String value : values) array.add(value);
      }
    });
    return new Input(node, true);
  }

  public static Input params(Map<String, String> pathVariables) {
    ObjectNode node = JsonNodeFactory.instance.objectNode();
    pathVariables.forEach(node::put);
    return new Input(node, true);
  }

  void issue(String field, String message) {
    if (rootFailed) return;
    Map<String, String> issue = new LinkedHashMap<>();
    issue.put("field", field);
    issue.put("message", message);
    issues.add(issue);
  }

  /** Clé présente dans l'entrée (même à null), comme « key in body ». */
  public boolean has(String key) {
    return node.has(key);
  }

  public boolean isNull(String key) {
    return node.has(key) && node.get(key).isNull();
  }

  JsonNode raw(String key) {
    declared.add(key);
    JsonNode value = node.get(key);
    return value == null || value.isMissingNode() ? null : value;
  }

  /** Déclare des clés acceptées sans contrôle de type (lues ensuite librement). */
  public Input allow(String... keys) {
    declared.addAll(Arrays.asList(keys));
    return this;
  }

  public JsonNode node(String key) {
    return raw(key);
  }

  public Str str(String key) {
    return new Str(this, key);
  }

  public Num num(String key) {
    return new Num(this, key);
  }

  public Bool bool(String key) {
    return new Bool(this, key);
  }

  /** Termine la validation : clés inconnues refusées (strict) puis erreurs regroupées. */
  public void check() {
    List<String> unknown = new ArrayList<>();
    node.fieldNames().forEachRemaining(name -> {
      if (!declared.contains(name)) unknown.add(name);
    });
    if (!unknown.isEmpty()) {
      issue("", (unknown.size() > 1 ? "Clés non reconnues : " : "Clé non reconnue : ") + String.join(", ", unknown.stream().map(k -> "\"" + k + "\"").toList()));
    }
    if (!issues.isEmpty()) throw AppException.validation("Données invalides", issues);
  }

  // --- Champs -----------------------------------------------------------------------------------

  /** Nom du type reçu, comme util.parsedType + TypeDictionary du locale fr de Zod. */
  static String received(JsonNode raw) {
    if (raw == null || raw.isMissingNode()) return "indéfini";
    if (raw.isNull()) return "null";
    if (raw.isTextual()) return "chaîne de caractères";
    if (raw.isNumber()) return "nombre";
    if (raw.isBoolean()) return "booléen";
    if (raw.isArray()) return "tableau";
    return "objet";
  }

  /** Nombre affiché comme en JavaScript (100, 0.5). */
  static String js(double v) {
    return v == Math.rint(v) && !Double.isInfinite(v) ? Long.toString((long) v) : Double.toString(v);
  }

  private interface Rule {
    String test(String value);
  }

  /**
   * Chaîne Zod (z.string().trim() puis contrôles). Les contrôles sont évalués à la fin, tous ensemble
   * comme Zod v4 (un « x » donne à la fois l'erreur de longueur et celle de format) ; une erreur de
   * type arrête l'évaluation. Terminaisons :
   * <ul>
   *   <li>{@link #required()} : champ obligatoire (z.string()…) ;</li>
   *   <li>{@link #optional()} : optionalTrimmedString (union, « » conservé, null refusé « Entrée invalide ») ;</li>
   *   <li>{@link #optionalPlain()} : trimmedString(…).optional() (erreur de type détaillée) ;</li>
   *   <li>{@link #optionalOrEmpty()} : union avec z.literal('') transformé en absent.</li>
   * </ul>
   */
  public static final class Str {
    private final Input input;
    private final String key;
    private final JsonNode raw;
    private final List<Rule> rules = new ArrayList<>();
    /** Contrôles de longueur, que Zod applique aussi à un tableau reçu à la place d'une chaîne. */
    private final List<java.util.function.IntFunction<String>> lengthRules = new ArrayList<>();
    private boolean nullable;
    private boolean lower;
    private boolean upper;
    private boolean trim = true;
    private String[] allowed;
    private boolean nullValue;
    private boolean present;

    Str(Input input, String key) {
      this.input = input;
      this.key = key;
      this.raw = input.raw(key);
      present = raw != null;
      nullValue = raw != null && raw.isNull();
    }

    /** Accepte null (z.string().nullable()). */
    public Str nullable() {
      nullable = true;
      return this;
    }

    /** null explicitement reçu. */
    public boolean isNull() {
      return nullValue;
    }

    /** Pas de .trim() dans le schéma. */
    public Str noTrim() {
      trim = false;
      return this;
    }

    public Str min(int min, String message) {
      java.util.function.IntFunction<String> rule = n -> n < min ? (message != null ? message : "Trop petit : chaîne de caractères doit avoir >=" + min + " caractères") : null;
      lengthRules.add(rule);
      rules.add(v -> rule.apply(v.length()));
      return this;
    }

    public Str min(int min) {
      return min(min, null);
    }

    public Str max(int max, String message) {
      java.util.function.IntFunction<String> rule = n -> n > max ? (message != null ? message : "Trop grand : chaîne de caractères doit avoir <=" + max + " caractères") : null;
      lengthRules.add(rule);
      rules.add(v -> rule.apply(v.length()));
      return this;
    }

    public Str max(int max) {
      return max(max, null);
    }

    /** trimmedString(min, max, message) de sanitizers.ts. */
    public Str trimmed(int min, int max, String message) {
      return min(min, message).max(max, message + " (max " + max + ")");
    }

    public Str email(String message) {
      rules.add(v -> EMAIL.matcher(v).matches() ? null : (message != null ? message : "adresse e-mail invalide"));
      return this;
    }

    public Str uuid(String message) {
      rules.add(v -> UUID.matcher(v).matches() ? null : (message != null ? message : "UUID invalide"));
      return this;
    }

    public Str pattern(String regex, String message) {
      Pattern compiled = Pattern.compile(regex);
      rules.add(v -> compiled.matcher(v).find() ? null : (message != null ? message : "Chaîne de caractères invalide : doit correspondre au motif /" + regex + "/"));
      return this;
    }

    /** .refine(prédicat, message) : évalué après les autres contrôles, comme Zod. */
    public Str refine(java.util.function.Predicate<String> ok, String message) {
      rules.add(v -> ok.test(v) ? null : message);
      return this;
    }

    /** z.enum([...]) : toute autre valeur, même absente ou d'un autre type, donne « Option invalide ». */
    public Str oneOf(String... values) {
      allowed = values;
      return this;
    }

    public Str lower() {
      lower = true;
      return this;
    }

    public Str upper() {
      upper = true;
      return this;
    }

    private String enumMessage() {
      return "Option invalide : une valeur parmi " + String.join("|", Arrays.stream(allowed).map(a -> "\"" + a + "\"").toList()) + " attendue";
    }

    private String transform(String value) {
      if (lower) value = value.toLowerCase(Locale.ROOT);
      if (upper) value = value.toUpperCase(Locale.ROOT);
      return value;
    }

    /** Évalue la valeur présente ; null si une erreur a été enregistrée. */
    private String evaluate(boolean union) {
      if (allowed != null) {
        if (raw != null && raw.isTextual() && Arrays.asList(allowed).contains(raw.asText())) return raw.asText();
        input.issue(key, enumMessage());
        return null;
      }
      if (!raw.isTextual()) {
        input.issue(key, union ? "Entrée invalide" : "Entrée invalide : chaîne de caractères attendu, " + received(raw) + " reçu");
        if (!union && raw.isArray()) {
          for (var rule : lengthRules) {
            String message = rule.apply(raw.size());
            if (message != null) input.issue(key, message);
          }
        }
        return null;
      }
      String value = trim ? raw.asText().strip() : raw.asText();
      boolean ok = true;
      for (Rule rule : rules) {
        String message = rule.test(value);
        if (message != null) {
          input.issue(key, message);
          ok = false;
        }
      }
      return ok ? transform(value) : null;
    }

    public String required() {
      if (nullValue && nullable) return null;
      if (!present && allowed == null) {
        input.issue(key, "Entrée invalide : chaîne de caractères attendu, indéfini reçu");
        return null;
      }
      if (!present) {
        input.issue(key, enumMessage());
        return null;
      }
      return evaluate(false);
    }

    /** optionalTrimmedString (ou z.enum(...).optional()) : absent donne null, « » reste « ». */
    public String optional() {
      if (!present) return null;
      if (nullValue && nullable) return null;
      return evaluate(allowed == null);
    }

    /** trimmedString(...).optional() / z.string().optional() : erreurs de type détaillées. */
    public String optionalPlain() {
      if (!present) return null;
      if (nullValue && nullable) return null;
      return evaluate(false);
    }

    /** z.union([chaîne contrôlée, z.literal('').transform(() => undefined)]).optional(). */
    public String optionalOrEmpty() {
      if (!present) return null;
      if (raw.isTextual() && raw.asText().isEmpty()) return null;
      if (!raw.isTextual()) {
        input.issue(key, "Entrée invalide");
        return null;
      }
      return evaluate(false);
    }

    /** Champ présent (même vide ou invalide). */
    public boolean present() {
      return present;
    }

    /** Champ présent, chaîne non vide. */
    public boolean provided() {
      return present && raw.isTextual() && !raw.asText().strip().isEmpty();
    }
  }

  /** Nombre z.coerce.number() : conversion Number(…) de JavaScript, puis entier/min/max. */
  public static final class Num {
    private static final Pattern DECIMAL = Pattern.compile("^[+-]?(\\d+\\.?\\d*|\\.\\d+)([eE][+-]?\\d+)?$");
    private final Input input;
    private final String key;
    private final JsonNode raw;
    private boolean integer;
    private final List<java.util.function.DoubleFunction<String>> rules = new ArrayList<>();

    Num(Input input, String key) {
      this.input = input;
      this.key = key;
      this.raw = input.raw(key);
    }

    /** Number(x) en JavaScript. */
    static double coerce(JsonNode raw) {
      if (raw == null || raw.isMissingNode()) return Double.NaN;
      if (raw.isNull()) return 0;
      if (raw.isNumber()) return raw.asDouble();
      if (raw.isBoolean()) return raw.asBoolean() ? 1 : 0;
      if (raw.isArray()) {
        if (raw.size() == 0) return 0;
        if (raw.size() == 1) return coerce(raw.get(0).isArray() || raw.get(0).isObject() ? raw.get(0) : JsonNodeFactory.instance.textNode(raw.get(0).asText()));
        return Double.NaN;
      }
      if (!raw.isTextual()) return Double.NaN;
      String s = raw.asText().strip();
      if (s.isEmpty()) return 0;
      if (DECIMAL.matcher(s).matches()) return Double.parseDouble(s);
      if (s.matches("^[+-]?Infinity$")) return s.startsWith("-") ? Double.NEGATIVE_INFINITY : Double.POSITIVE_INFINITY;
      try {
        if (s.matches("^0[xX][0-9a-fA-F]+$")) return Long.parseLong(s.substring(2), 16);
        if (s.matches("^0[oO][0-7]+$")) return Long.parseLong(s.substring(2), 8);
        if (s.matches("^0[bB][01]+$")) return Long.parseLong(s.substring(2), 2);
      } catch (NumberFormatException e) {
        return Double.NaN;
      }
      return Double.NaN;
    }

    public Num integer() {
      integer = true;
      return this;
    }

    public Num min(double min, String message) {
      rules.add(v -> v < min ? (message != null ? message : "Trop petit : nombre doit être >=" + js(min)) : null);
      return this;
    }

    public Num min(double min) {
      return min(min, null);
    }

    public Num positive(String message) {
      rules.add(v -> v <= 0 ? (message != null ? message : "Trop petit : nombre doit être >0") : null);
      return this;
    }

    public Num max(double max, String message) {
      rules.add(v -> v > max ? (message != null ? message : "Trop grand : nombre doit être <=" + js(max)) : null);
      return this;
    }

    public Num max(double max) {
      return max(max, null);
    }

    private Double evaluate() {
      double v = coerce(raw);
      if (Double.isNaN(v)) {
        input.issue(key, "Entrée invalide : nombre attendu, NaN reçu");
        return null;
      }
      if (Double.isInfinite(v)) {
        input.issue(key, "Entrée invalide : nombre attendu, nombre reçu");
        return null;
      }
      if (integer && v != Math.rint(v)) {
        input.issue(key, "Entrée invalide : entier attendu, nombre reçu");
        return null;
      }
      boolean ok = true;
      for (var rule : rules) {
        String message = rule.apply(v);
        if (message != null) {
          input.issue(key, message);
          ok = false;
        }
      }
      return ok ? v : null;
    }

    public boolean present() {
      return raw != null;
    }

    public Double required() {
      return evaluate();
    }

    public Double optional() {
      return raw == null ? null : evaluate();
    }

    /** .optional().default(fallback) ; en cas d'erreur, la valeur de repli (check() lèvera ensuite). */
    public double optional(double fallback) {
      if (raw == null) return fallback;
      Double v = evaluate();
      return v == null ? fallback : v;
    }

    public Integer optionalInt() {
      Double v = optional();
      return v == null ? null : (int) Math.round(v);
    }

    public int optionalInt(int fallback) {
      return (int) Math.round(optional((double) fallback));
    }

    public int requiredInt() {
      Double v = required();
      return v == null ? 0 : (int) Math.round(v);
    }
  }

  /** Booléen z.boolean(). */
  public static final class Bool {
    private final Input input;
    private final String key;
    private final JsonNode raw;

    Bool(Input input, String key) {
      this.input = input;
      this.key = key;
      this.raw = input.raw(key);
    }

    private Boolean evaluate() {
      if (raw != null && raw.isBoolean()) return raw.asBoolean();
      input.issue(key, "Entrée invalide : booléen attendu, " + received(raw) + " reçu");
      return null;
    }

    public Boolean required() {
      return evaluate();
    }

    public Boolean optional() {
      return raw == null ? null : evaluate();
    }
  }

  // --- Aides de conversion ----------------------------------------------------------------------

  /** Date d'une chaîne ISO ou AAAA-MM-JJ (comme new Date(...)) ; null si invalide. */
  public static Instant parseDate(String value) {
    if (value == null || value.isBlank()) return null;
    String v = value.trim();
    try {
      if (v.matches("^\\d{4}-\\d{2}-\\d{2}$")) return LocalDate.parse(v).atStartOfDay(ZoneOffset.UTC).toInstant();
      if (v.matches("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}(:\\d{2}(\\.\\d+)?)?$")) return java.time.LocalDateTime.parse(v).toInstant(ZoneOffset.UTC);
      return OffsetDateTime.parse(v).toInstant();
    } catch (DateTimeParseException e) {
      try {
        return Instant.parse(v);
      } catch (DateTimeParseException ignored) {
        return null;
      }
    }
  }
}
