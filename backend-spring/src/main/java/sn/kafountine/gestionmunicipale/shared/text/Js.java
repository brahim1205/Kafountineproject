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
}
