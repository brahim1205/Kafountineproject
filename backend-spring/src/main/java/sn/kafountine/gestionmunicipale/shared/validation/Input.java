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

  private Input(ObjectNode node, boolean query) {
    this.node = node;
    this.query = query;
  }

  /** Corps JSON d'une requête (absent ou non-objet : objet vide, comme express.json). */
  public static Input body(JsonNode body) {
    if (body == null || body.isNull() || body.isMissingNode()) return new Input(JsonNodeFactory.instance.objectNode(), false);
    if (!body.isObject()) {
      Input input = new Input(JsonNodeFactory.instance.objectNode(), false);
      input.issue("", "Entrée invalide : objet attendu");
      return input;
    }
    return new Input((ObjectNode) body, false);
  }

  /** Paramètres de requête (chaînes) : les nombres et booléens sont convertis comme z.coerce. */
  public static Input query(Map<String, String[]> parameters) {
    ObjectNode node = JsonNodeFactory.instance.objectNode();
    parameters.forEach((key, values) -> {
      if (values != null && values.length > 0) node.put(key, values[values.length - 1]);
    });
    return new Input(node, true);
  }

  public static Input params(Map<String, String> pathVariables) {
    ObjectNode node = JsonNodeFactory.instance.objectNode();
    pathVariables.forEach(node::put);
    return new Input(node, true);
  }

  void issue(String field, String message) {
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
      issue("", (unknown.size() > 1 ? "Clés non reconnues : " : "Clé non reconnue : ") + String.join(", ", unknown.stream().map(k -> "« " + k + " »").toList()));
    }
    if (!issues.isEmpty()) throw AppException.validation("Données invalides", issues);
  }

  // --- Champs -----------------------------------------------------------------------------------

  /** Chaîne (z.string().trim()…), « » transformé en absent pour les champs optionnels. */
  public static final class Str {
    private final Input input;
    private final String key;
    private String value;
    private boolean present;
    private boolean failed;
    private boolean emptyAsAbsent = true;

    Str(Input input, String key) {
      this.input = input;
      this.key = key;
      JsonNode raw = input.raw(key);
      if (raw == null || raw.isNull()) return;
      present = true;
      if (raw.isTextual()) {
        value = raw.asText().trim();
      } else if (input.query && (raw.isNumber() || raw.isBoolean())) {
        value = raw.asText();
      } else {
        fail("Entrée invalide : chaîne attendue");
      }
    }

    private void fail(String message) {
      if (!failed) input.issue(key, message);
      failed = true;
    }

    private boolean active() {
      return present && !failed && value != null && !(emptyAsAbsent && value.isEmpty() && optionalEmpty);
    }

    private boolean optionalEmpty = false;

    /** Longueur minimale (une chaîne vide n'est permise que pour les champs optionnels). */
    public Str min(int min, String message) {
      if (present && !failed && value != null && value.length() < min) fail(message);
      return this;
    }

    public Str max(int max, String message) {
      if (present && !failed && value != null && value.length() > max) fail(message + " (max " + max + ")");
      return this;
    }

    public Str max(int max) {
      if (present && !failed && value != null && value.length() > max) fail("Trop grand : " + max + " caractère(s) au plus");
      return this;
    }

    public Str email(String message) {
      if (present && !failed && value != null && !EMAIL.matcher(value).matches()) fail(message);
      return this;
    }

    public Str uuid(String message) {
      if (present && !failed && value != null && !UUID.matcher(value).matches()) fail(message);
      return this;
    }

    public Str pattern(String regex, String message) {
      if (present && !failed && value != null && !Pattern.compile(regex).matcher(value).matches()) fail(message);
      return this;
    }

    public Str oneOf(String... allowed) {
      if (present && !failed && value != null && !Arrays.asList(allowed).contains(value)) {
        fail("Option invalide : une valeur parmi " + String.join("|", Arrays.stream(allowed).map(a -> "\"" + a + "\"").toList()) + " attendue");
      }
      return this;
    }

    public Str lower() {
      if (value != null) value = value.toLowerCase(Locale.ROOT);
      return this;
    }

    public Str upper() {
      if (value != null) value = value.toUpperCase(Locale.ROOT);
      return this;
    }

    /** Champ obligatoire ; null si invalide (l'erreur est déjà enregistrée). */
    public String required(String message) {
      if (!present) {
        fail(message == null ? "Entrée invalide : chaîne attendue, reçu undefined" : message);
        return null;
      }
      return failed ? null : value;
    }

    /** Champ optionnel (optionalTrimmedString) : absent, null ou « » donnent null. */
    public String optional() {
      if (!present || failed || value == null || value.isEmpty()) return null;
      return value;
    }

    /** Champ optionnel où « » reste une chaîne vide (z.string().optional()). */
    public String optionalKeepEmpty() {
      if (!present || failed) return null;
      return value;
    }
  }

  /** Nombre (z.coerce.number()), avec contrôles entier/min/max. */
  public static final class Num {
    private final Input input;
    private final String key;
    private Double value;
    private boolean present;
    private boolean failed;

    Num(Input input, String key) {
      this.input = input;
      this.key = key;
      JsonNode raw = input.raw(key);
      if (raw == null || raw.isNull()) return;
      if (raw.isTextual() && raw.asText().trim().isEmpty() && input.query) return;
      present = true;
      if (raw.isNumber()) {
        value = raw.asDouble();
      } else if (raw.isTextual()) {
        try {
          value = raw.asText().trim().isEmpty() ? 0.0 : Double.parseDouble(raw.asText().trim());
        } catch (NumberFormatException e) {
          fail("Entrée invalide : nombre attendu, reçu NaN");
        }
      } else if (raw.isBoolean()) {
        value = raw.asBoolean() ? 1.0 : 0.0;
      } else {
        fail("Entrée invalide : nombre attendu");
      }
      if (value != null && (value.isNaN() || value.isInfinite())) fail("Entrée invalide : nombre attendu, reçu NaN");
    }

    private void fail(String message) {
      if (!failed) input.issue(key, message);
      failed = true;
    }

    public Num integer() {
      if (present && !failed && value != null && value != Math.rint(value)) fail("Entrée invalide : entier attendu, reçu nombre");
      return this;
    }

    public Num min(double min, String message) {
      if (present && !failed && value != null && value < min) fail(message == null ? "Trop petit : >=" + fmt(min) + " attendu" : message);
      return this;
    }

    public Num positive(String message) {
      if (present && !failed && value != null && value <= 0) fail(message == null ? "Trop petit : >0 attendu" : message);
      return this;
    }

    public Num max(double max, String message) {
      if (present && !failed && value != null && value > max) fail(message == null ? "Trop grand : <=" + fmt(max) + " attendu" : message);
      return this;
    }

    private static String fmt(double v) {
      return v == Math.rint(v) ? Long.toString((long) v) : Double.toString(v);
    }

    public Double required(String message) {
      if (!present) {
        fail(message == null ? "Entrée invalide : nombre attendu, reçu NaN" : message);
        return null;
      }
      return failed ? null : value;
    }

    public Double optional() {
      return present && !failed ? value : null;
    }

    public Double optional(double fallback) {
      return present && !failed ? value : (failed ? null : fallback);
    }

    public Integer optionalInt() {
      Double v = optional();
      return v == null ? null : v.intValue();
    }

    public Integer optionalInt(int fallback) {
      Double v = optional(fallback);
      return v == null ? null : v.intValue();
    }
  }

  /** Booléen (z.boolean(), ou chaîne « true/false » en paramètre de requête). */
  public static final class Bool {
    private final Input input;
    private final String key;
    private Boolean value;
    private boolean failed;

    Bool(Input input, String key) {
      this.input = input;
      this.key = key;
      JsonNode raw = input.raw(key);
      if (raw == null || raw.isNull()) return;
      if (raw.isBoolean()) {
        value = raw.asBoolean();
      } else if (input.query && raw.isTextual() && (raw.asText().equals("true") || raw.asText().equals("false"))) {
        value = Boolean.parseBoolean(raw.asText());
      } else {
        input.issue(key, "Entrée invalide : booléen attendu");
        failed = true;
      }
    }

    public Boolean optional() {
      return failed ? null : value;
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
