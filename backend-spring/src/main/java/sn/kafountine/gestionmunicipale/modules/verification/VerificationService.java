package sn.kafountine.gestionmunicipale.modules.verification;

import java.util.Map;
import org.springframework.stereotype.Service;
import sn.kafountine.gestionmunicipale.shared.config.JacksonConfig;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;

/**
 * Vérification publique d'un reçu (interface contribuable du cahier des charges) : n'importe qui peut
 * contrôler qu'un numéro de reçu existe, son objet, son montant et s'il est toujours valide.
 * Aucune donnée personnelle n'est renvoyée (ni nom, ni NIN, ni téléphone, ni agent).
 */
@Service
public class VerificationService {
  private static final String RECUS = """
      SELECT * FROM (
        SELECT "numero" AS numero, 'Ticket' AS source, "service" AS objet, "montant", "createdAt" AS d,
               CASE WHEN "statut" = 'PAYE' THEN 'VALIDE' WHEN "statut" = 'ANNULE' THEN 'ANNULE' ELSE 'EN_ATTENTE' END AS etat
          FROM "Transaction"
        UNION ALL
        SELECT "numeroRecu", 'Motos', "type" || ' ' || COALESCE("mois", ''), "montant", COALESCE("datePaiement", "createdAt"),
               CASE WHEN "statut" = 'PAYE' THEN 'VALIDE' WHEN "statut" = 'ANNULE' THEN 'ANNULE' ELSE 'EN_ATTENTE' END
          FROM "MotoPayment" WHERE "numeroRecu" IS NOT NULL
        UNION ALL
        SELECT "numeroRecu", 'Marché', 'Loyer ' || COALESCE("periode", ''), "montant", COALESCE("datePaiement", "createdAt"),
               CASE WHEN "statut" = 'PAYE' THEN 'VALIDE' WHEN "statut" = 'ANNULE' THEN 'ANNULE' ELSE 'EN_ATTENTE' END
          FROM "MarketPayment" WHERE "numeroRecu" IS NOT NULL
        UNION ALL
        SELECT "numero", 'État civil', "typeDocument", "montant", COALESCE("encaisseLe", "createdAt"),
               CASE WHEN "statut" IN ('DELIVREE', 'VALIDE') THEN 'VALIDE' WHEN "statut" IN ('REJETEE', 'REJETE', 'ANNULEE') THEN 'ANNULE' ELSE 'EN_ATTENTE' END
          FROM "EtatCivilRequest"
        UNION ALL
        SELECT "numero", 'Urbanisme', "type", "montant", COALESCE("encaisseLe", "createdAt"),
               CASE WHEN "statut" = 'VALIDE' THEN 'VALIDE' WHEN "statut" IN ('REJETE', 'REJETEE', 'ANNULE') THEN 'ANNULE' ELSE 'EN_ATTENTE' END
          FROM "UrbanismeCase"
      ) r WHERE UPPER(r.numero) = UPPER(:numero) LIMIT 1
      """;

  private final Db db;

  public VerificationService(Db db) {
    this.db = db;
  }

  public Map<String, Object> verifier(String numero) {
    Map<String, Object> row = db.one(RECUS, Db.params("numero", numero.strip()));
    if (row == null) throw AppException.notFound("Aucun reçu de la commune ne porte ce numéro.");
    return Api.map("numero", row.get("numero"), "service", row.get("source"), "objet", Db.str(row, "objet").strip(),
        "montant", Db.num(row, "montant"), "date", JacksonConfig.iso(Db.date(row, "d")), "etat", row.get("etat"));
  }
}
