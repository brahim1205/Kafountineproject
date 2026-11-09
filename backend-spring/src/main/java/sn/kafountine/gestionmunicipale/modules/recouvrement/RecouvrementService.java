package sn.kafountine.gestionmunicipale.modules.recouvrement;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import sn.kafountine.gestionmunicipale.modules.motos.MotoService;
import sn.kafountine.gestionmunicipale.shared.audit.Actor;
import sn.kafountine.gestionmunicipale.shared.config.JacksonConfig;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;

/** Ce que doivent les contribuables, et la situation complète de chacun. */
@Service
public class RecouvrementService {
  private static final Set<String> VOIT_ETAT_CIVIL = Set.of("SUPER_ADMIN", "ETAT_CIVIL");
  private static final String MOTOS_DUES = """
      SELECT m."id", m."matricule", m."prochainPaiement", m."enRetard", m."proprietaireId", c."nom", c."prenom", c."telephone"
      FROM "MotoRegistration" m INNER JOIN "Contribuable" c ON c."id" = m."proprietaireId"
      WHERE m."statut" = 'ACTIVE' AND (m."enRetard" = true OR m."prochainPaiement" < CURRENT_TIMESTAMP)
      """;
  private static final String MARCHE_DU = """
      SELECT mp."id", mp."montant", mp."periode", p."numeroPlace", p."occupantId", c."nom", c."prenom", COALESCE(c."telephone", p."telephone") AS "telephone"
      FROM "MarketPayment" mp INNER JOIN "MarketPlace" p ON p."id" = mp."placeId" LEFT JOIN "Contribuable" c ON c."id" = p."occupantId"
      WHERE mp."statut" NOT IN ('PAYE', 'ANNULE')
      """;

  private final Db db;

  public RecouvrementService(Db db) {
    this.db = db;
  }

  private static String nom(Map<String, Object> row) {
    String complet = ((row.get("prenom") == null ? "" : row.get("prenom")) + " " + (row.get("nom") == null ? "" : row.get("nom"))).strip();
    return complet.isEmpty() ? "Non attribuée" : complet;
  }

  private List<Map<String, Object>> lignes(String contribuableId, int limit) {
    List<Map<String, Object>> lignes = new ArrayList<>();
    Instant now = Instant.now();
    var params = Db.params("id", contribuableId, "limit", limit);
    String motosFiltre = contribuableId == null ? "" : " AND m.\"proprietaireId\" = :id";
    for (Map<String, Object> row : db.list(MOTOS_DUES + motosFiltre + " ORDER BY m.\"prochainPaiement\" ASC NULLS LAST LIMIT :limit", params)) {
      Instant echeance = Db.date(row, "prochainPaiement");
      int mois = MotoService.moisDus(echeance, Boolean.TRUE.equals(row.get("enRetard")), now);
      lignes.add(Api.map("type", "MOTO", "id", row.get("id"), "reference", row.get("matricule"), "libelle", mois + " mois de cotisation avec pénalité",
          "contribuableId", row.get("proprietaireId"), "contribuable", nom(row), "telephone", row.get("telephone"),
          "montant", MotoService.montantDu(mois), "echeance", echeance == null ? null : JacksonConfig.iso(echeance)));
    }
    String marcheFiltre = contribuableId == null ? "" : " AND p.\"occupantId\" = :id";
    for (Map<String, Object> row : db.list(MARCHE_DU + marcheFiltre + " ORDER BY mp.\"createdAt\" ASC LIMIT :limit", params)) {
      lignes.add(Api.map("type", "MARCHE", "id", row.get("id"), "reference", "Place " + row.get("numeroPlace"), "libelle", "Loyer " + row.get("periode"),
          "contribuableId", row.get("occupantId"), "contribuable", nom(row), "telephone", row.get("telephone"), "montant", Db.num(row, "montant"), "echeance", null));
    }
    return lignes;
  }

  public Map<String, Object> impayes(int limit) {
    List<Map<String, Object>> lignes = lignes(null, limit);
    double motos = 0;
    double marche = 0;
    for (Map<String, Object> ligne : lignes) {
      if ("MOTO".equals(ligne.get("type"))) motos += ((Number) ligne.get("montant")).doubleValue();
      else marche += ((Number) ligne.get("montant")).doubleValue();
    }
    return Api.map("total", motos + marche, "montantMotos", motos, "montantMarche", marche, "nombre", lignes.size(), "lignes", lignes);
  }

  public Map<String, Object> situation(Actor actor, String id, int year) {
    Map<String, Object> contribuable = db.one("SELECT \"id\", \"nin\", \"nom\", \"prenom\", \"telephone\", \"adresse\", \"typeContribuable\" FROM \"Contribuable\" WHERE \"id\" = :id", Db.params("id", id));
    if (contribuable == null) throw AppException.notFound("Contribuable introuvable");
    // Les actes d'état civil restent cloisonnés, comme leurs listes.
    boolean etatCivil = actor.role() != null && VOIT_ETAT_CIVIL.contains(actor.role().toUpperCase(Locale.ROOT));
    String tickets = "SELECT 'Tickets' AS source, t.\"numero\" AS numero, t.\"service\" AS libelle, t.\"montant\", t.\"createdAt\" AS d FROM \"Transaction\" t"
        + " WHERE t.\"contribuableId\" = :id AND t.\"year\" = :year AND t.\"statut\" = 'PAYE'"
        + (etatCivil ? "" : " AND t.\"categorie\" !~* '^[eé]tat[ _-]?civil'");
    String motos = " UNION ALL SELECT 'Motos', COALESCE(mp.\"numeroRecu\", mp.\"id\"), mp.\"type\" || ' ' || m.\"matricule\", mp.\"montant\", COALESCE(mp.\"datePaiement\", mp.\"createdAt\")"
        + " FROM \"MotoPayment\" mp INNER JOIN \"MotoRegistration\" m ON m.\"id\" = mp.\"motoId\" WHERE m.\"proprietaireId\" = :id AND mp.\"year\" = :year AND mp.\"statut\" = 'PAYE'";
    String marche = " UNION ALL SELECT 'Marché', COALESCE(mp.\"numeroRecu\", mp.\"reference\", mp.\"id\"), 'Place ' || p.\"numeroPlace\" || ' - ' || mp.\"periode\", mp.\"montant\", COALESCE(mp.\"datePaiement\", mp.\"createdAt\")"
        + " FROM \"MarketPayment\" mp INNER JOIN \"MarketPlace\" p ON p.\"id\" = mp.\"placeId\" WHERE p.\"occupantId\" = :id AND mp.\"year\" = :year AND mp.\"statut\" = 'PAYE'";
    String urbanisme = " UNION ALL SELECT 'Urbanisme', \"numero\", \"type\", \"montant\", COALESCE(\"encaisseLe\", \"createdAt\") FROM \"UrbanismeCase\" WHERE \"contribuableId\" = :id AND \"year\" = :year AND \"statut\" = 'VALIDE'";
    String civil = !etatCivil ? "" : " UNION ALL SELECT 'État civil', \"numero\", \"typeDocument\", \"montant\", COALESCE(\"encaisseLe\", \"createdAt\") FROM \"EtatCivilRequest\" WHERE \"contribuableId\" = :id AND \"year\" = :year AND \"statut\" IN ('DELIVREE', 'VALIDE')";
    List<Map<String, Object>> operations = new ArrayList<>();
    Map<String, Double> parSource = new LinkedHashMap<>();
    double totalPaye = 0;
    for (Map<String, Object> row : db.list(tickets + motos + marche + urbanisme + civil + " ORDER BY 5 DESC", Db.params("id", id, "year", year))) {
      double montant = Db.num(row, "montant");
      totalPaye += montant;
      parSource.merge(Db.str(row, "source"), montant, Double::sum);
      operations.add(Api.map("source", row.get("source"), "numero", row.get("numero"), "libelle", row.get("libelle"), "montant", montant,
          "date", JacksonConfig.iso(Db.date(row, "d"))));
    }
    List<Map<String, Object>> impayes = lignes(id, 200);
    double totalDu = impayes.stream().mapToDouble(l -> ((Number) l.get("montant")).doubleValue()).sum();
    return Api.map("contribuable", contribuable, "year", year, "totalPaye", totalPaye, "totalDu", totalDu, "parSource", parSource, "operations", operations, "impayes", impayes);
  }
}
