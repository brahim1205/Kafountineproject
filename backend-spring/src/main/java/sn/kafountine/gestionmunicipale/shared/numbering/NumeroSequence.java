package sn.kafountine.gestionmunicipale.shared.numbering;

import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;

/**
 * Numéros officiels consécutifs par série et par année (PrismaNumeroSequence côté Node), sur la même
 * table « NumeroCounter » : les deux backends peuvent numéroter en alternance sans doublon.
 */
@Component
public class NumeroSequence {
  public enum Series {
    TRANSACTION("transaction", "TX", 3, "Transaction", "numero"),
    ETAT_CIVIL("etatCivil", "EC", 5, "EtatCivilRequest", "numero"),
    URBANISME("urbanisme", "URB", 5, "UrbanismeCase", "numero"),
    COMMISSION("commission", "CF", 5, "FishCommission", "numero"),
    EXPEDITION("expedition", "EXP", 5, "ShippingExpedition", "numero"),
    RECU_MOTO("recuMoto", "MOTO", 5, "MotoPayment", "numeroRecu");

    final String key;
    final String prefix;
    final int width;
    final String table;
    final String column;

    Series(String key, String prefix, int width, String table, String column) {
      this.key = key;
      this.prefix = prefix;
      this.width = width;
      this.table = table;
      this.column = column;
    }
  }

  private static final String INCREMENT_SQL = """
      UPDATE "NumeroCounter" SET "dernier" = "dernier" + 1
      WHERE "serie" = :serie AND "annee" = :annee RETURNING "dernier"
      """;

  private final Db db;

  public NumeroSequence(Db db) {
    this.db = db;
  }

  /**
   * Numéro suivant. Rejoint la transaction de l'écriture : la ligne du compteur reste verrouillée jusqu'au
   * commit, et l'incrément est annulé si l'écriture échoue (pas de trou).
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public String next(Series series, int year) {
    String stem = series.prefix + "-" + year + "-";
    var params = Db.params("serie", series.key, "annee", year, "stem", stem + "%");
    Map<String, Object> row = db.one(INCREMENT_SQL, params);
    if (row == null) {
      row = db.one("""
          INSERT INTO "NumeroCounter" ("serie", "annee", "dernier")
          SELECT :serie::text, :annee::int, COALESCE(MAX(CAST(substring("%2$s" from '([0-9]+)$') AS bigint)), 0)::int + 1
          FROM "%1$s" WHERE "%2$s" LIKE :stem
          ON CONFLICT ("serie", "annee") DO UPDATE SET "dernier" = "NumeroCounter"."dernier" + 1
          RETURNING "dernier"
          """.formatted(series.table, series.column), params);
    }
    long last = (long) Db.num(row, "dernier");
    String numero = format(stem, last, series.width);
    Map<String, Object> taken = db.one("SELECT 1 AS pris FROM \"%s\" WHERE \"%s\" = :numero LIMIT 1".formatted(series.table, series.column),
        Db.params("numero", numero));
    if (taken != null) {
      // Compteur en retard sur la base (sauvegarde restaurée, numéro saisi à la main) : recalage.
      row = db.one("""
          UPDATE "NumeroCounter" SET "dernier" = GREATEST("dernier", (
            SELECT COALESCE(MAX(CAST(substring("%2$s" from '([0-9]+)$') AS bigint)), 0)::int
            FROM "%1$s" WHERE "%2$s" LIKE :stem
          )) + 1
          WHERE "serie" = :serie AND "annee" = :annee RETURNING "dernier"
          """.formatted(series.table, series.column), params);
      numero = format(stem, (long) Db.num(row, "dernier"), series.width);
    }
    return numero;
  }

  private static String format(String stem, long value, int width) {
    String digits = Long.toString(value);
    return stem + "0".repeat(Math.max(0, width - digits.length())) + digits;
  }
}
