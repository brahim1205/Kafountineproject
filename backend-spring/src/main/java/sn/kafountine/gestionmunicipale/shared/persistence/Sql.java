package sn.kafountine.gestionmunicipale.shared.persistence;

/** Aides SQL. */
public final class Sql {
  private Sql() {}

  /**
   * Prisma « contains » échappe les jokers de LIKE : « % » et « _ » saisis sont cherchés comme du texte
   * (le caractère d'échappement par défaut de PostgreSQL est « \ »).
   */
  public static String escapeLike(String value) {
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
  }
}
