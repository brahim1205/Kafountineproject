package sn.kafountine.gestionmunicipale.shared.text;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Conversions qui reproduisent celles de JavaScript côté Node (affichage des nombres, Decimal Prisma, dates). */
public final class Js {
  private Js() {}

  private static final Pattern DAY = Pattern.compile("^(\\d{4})-(\\d{2})-(\\d{2})$");

  /** String(nombre) en JavaScript : 100, 100.5, 12345678.5. */
  public static String num(double value) {
    if (Double.isNaN(value)) return "NaN";
    if (value == Math.rint(value) && Math.abs(value) < 1e21) return Long.toString((long) value);
    return BigDecimal.valueOf(value).stripTrailingZeros().toPlainString();
  }

  /** Decimal Prisma sérialisé en JSON (chaîne « 8000 », « 1500.5 »). */
  public static Object decimal(Object value) {
    if (value == null) return null;
    if (value instanceof Number number) return num(number.doubleValue());
    return value.toString();
  }

  /** slugify de municipalTariffs.ts : minuscules, sans accents, tirets. */
  public static String slugify(String value) {
    String text = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD).replaceAll("[\\u0300-\\u036f]", "");
    return text.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
  }

  /**
   * new Date(`${jour}T00:00:00.000Z`) : V8 accepte un jour jusqu'à 31 quel que soit le mois
   * (« 2026-02-30 » donne le 2 mars) ; null si la date est invalide.
   */
  public static Instant utcDay(String value) {
    if (value == null) return null;
    Matcher m = DAY.matcher(value);
    if (!m.matches()) return null;
    int year = Integer.parseInt(m.group(1));
    int month = Integer.parseInt(m.group(2));
    int day = Integer.parseInt(m.group(3));
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return LocalDate.of(year, month, 1).plusDays(day - 1L).atStartOfDay(ZoneOffset.UTC).toInstant();
  }

  private static final Pattern ISO = Pattern.compile(
      "^([+-]\\d{6}|\\d{4})(?:-(\\d{2})(?:-(\\d{2}))?)?(?:[T ](\\d{2}):(\\d{2})(?::(\\d{2})(?:\\.(\\d{1,9}))?)?\\s*(Z|[+-]\\d{2}:?\\d{2})?)?$",
      Pattern.CASE_INSENSITIVE);
  private static final Pattern SLASH_US = Pattern.compile("^(\\d{1,2})/(\\d{1,2})/(\\d{4})(?:\\s+(\\d{1,2}):(\\d{2})(?::(\\d{2}))?)?$");
  private static final Pattern SLASH_YMD = Pattern.compile("^(\\d{4})/(\\d{1,2})/(\\d{1,2})(?:\\s+(\\d{1,2}):(\\d{2})(?::(\\d{2}))?)?$");
  private static final Pattern MONTH_FIRST = Pattern.compile("^([A-Za-z]{3,})\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})$");
  private static final Pattern DAY_FIRST = Pattern.compile("^(\\d{1,2})\\s+([A-Za-z]{3,})\\.?,?\\s+(\\d{4})$");
  private static final String[] MONTHS = {"jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"};

  private static int month(String name) {
    String prefix = name.toLowerCase(Locale.ROOT).substring(0, 3);
    for (int i = 0; i < MONTHS.length; i++) {
      if (MONTHS[i].equals(prefix)) return i + 1;
    }
    return -1;
  }

  /** Date tolérante comme V8 (jour 1 à 31 quel que soit le mois) ; sans fuseau, l'heure locale du serveur (UTC). */
  private static Instant at(int year, int month, int day, int hour, int minute, int second, long nanos, ZoneOffset offset) {
    if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 24 || minute > 59 || second > 59) return null;
    if (hour == 24 && (minute > 0 || second > 0 || nanos > 0)) return null;
    java.time.LocalDateTime local = LocalDate.of(year, month, 1).plusDays(day - 1L).atStartOfDay()
        .plusHours(hour).plusMinutes(minute).plusSeconds(second).plusNanos(nanos);
    return local.toInstant(offset == null ? ZoneOffset.UTC : offset).truncatedTo(java.time.temporal.ChronoUnit.MILLIS);
  }

  private static int intOr(String value, int fallback) {
    return value == null ? fallback : Integer.parseInt(value);
  }

  /**
   * new Date(chaîne) / Date.parse de JavaScript pour les formats rencontrés : ISO (date seule en UTC,
   * date et heure sans fuseau en heure locale), « MM/JJ/AAAA », « AAAA/MM/JJ », « March 4, 2026 », « 4 March 2026 ».
   * null quand JavaScript donnerait une date invalide.
   */
  public static Instant parseDate(String value) {
    if (value == null) return null;
    String v = value.strip();
    if (v.isEmpty()) return null;
    try {
      Matcher m = ISO.matcher(v);
      if (m.matches()) {
        int year = Integer.parseInt(m.group(1));
        long nanos = m.group(7) == null ? 0 : Long.parseLong((m.group(7) + "000000000").substring(0, 9));
        ZoneOffset offset = null;
        if (m.group(8) != null) {
          String z = m.group(8).toUpperCase(Locale.ROOT);
          offset = z.equals("Z") ? ZoneOffset.UTC : ZoneOffset.of(z.length() == 5 ? z.substring(0, 3) + ":" + z.substring(3) : z);
        }
        // Date seule (AAAA, AAAA-MM, AAAA-MM-JJ) : minuit UTC.
        if (m.group(4) == null) offset = ZoneOffset.UTC;
        return at(year, intOr(m.group(2), 1), intOr(m.group(3), 1), intOr(m.group(4), 0), intOr(m.group(5), 0), intOr(m.group(6), 0), nanos, offset);
      }
      m = SLASH_US.matcher(v);
      if (m.matches()) {
        return at(Integer.parseInt(m.group(3)), Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), intOr(m.group(4), 0), intOr(m.group(5), 0), intOr(m.group(6), 0), 0, null);
      }
      m = SLASH_YMD.matcher(v);
      if (m.matches()) {
        return at(Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(3)), intOr(m.group(4), 0), intOr(m.group(5), 0), intOr(m.group(6), 0), 0, null);
      }
      m = MONTH_FIRST.matcher(v);
      if (m.matches() && month(m.group(1)) > 0) return at(Integer.parseInt(m.group(3)), month(m.group(1)), Integer.parseInt(m.group(2)), 0, 0, 0, 0, null);
      m = DAY_FIRST.matcher(v);
      if (m.matches() && month(m.group(2)) > 0) return at(Integer.parseInt(m.group(3)), month(m.group(2)), Integer.parseInt(m.group(1)), 0, 0, 0, 0, null);
    } catch (RuntimeException e) {
      return null;
    }
    return null;
  }

  /**
   * nombre.toLocaleString('fr-FR') : groupes de trois chiffres séparés par une espace fine
   * insécable (U+202F), virgule décimale, trois décimales au plus (arrondi au plus proche, demi vers l'extérieur).
   */
  public static String localeFr(double value) {
    if (Double.isNaN(value)) return "NaN";
    if (Double.isInfinite(value)) return value > 0 ? "∞" : "-∞";
    BigDecimal decimal = new BigDecimal(Double.toString(Math.abs(value))).setScale(3, java.math.RoundingMode.HALF_UP).stripTrailingZeros();
    String plain = decimal.toPlainString();
    int dot = plain.indexOf('.');
    String integer = dot < 0 ? plain : plain.substring(0, dot);
    String fraction = dot < 0 ? "" : plain.substring(dot + 1);
    StringBuilder grouped = new StringBuilder();
    for (int i = 0; i < integer.length(); i++) {
      if (i > 0 && (integer.length() - i) % 3 == 0) grouped.append(' ');
      grouped.append(integer.charAt(i));
    }
    boolean negative = value < 0 && decimal.signum() != 0;
    return (negative ? "-" : "") + grouped + (fraction.isEmpty() ? "" : "," + fraction);
  }

  /** encodeURIComponent de JavaScript. */
  public static String encodeURIComponent(String value) {
    StringBuilder out = new StringBuilder();
    for (byte b : value.getBytes(java.nio.charset.StandardCharsets.UTF_8)) {
      int c = b & 0xFF;
      if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || "-_.!~*'()".indexOf(c) >= 0) {
        out.append((char) c);
      } else {
        out.append('%').append(String.format(Locale.ROOT, "%02X", c));
      }
    }
    return out.toString();
  }
}
