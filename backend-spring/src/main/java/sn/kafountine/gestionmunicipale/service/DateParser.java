package sn.kafountine.gestionmunicipale.service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public final class DateParser {
  private DateParser() {}

  public static OffsetDateTime parse(String value) {
    if (value == null || value.isBlank()) return null;
    if (value.length() == 10) {
      return LocalDate.parse(value).atStartOfDay().atOffset(ZoneOffset.UTC);
    }
    return OffsetDateTime.parse(value);
  }
}
