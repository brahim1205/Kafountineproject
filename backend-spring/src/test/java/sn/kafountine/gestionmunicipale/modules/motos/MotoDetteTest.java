package sn.kafountine.gestionmunicipale.modules.motos;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class MotoDetteTest {
  private static final Instant ECHEANCE = Instant.parse("2026-03-10T23:59:59.999Z");

  @Test
  void aucuneDetteAvantEcheance() {
    assertEquals(0, MotoService.moisDus(ECHEANCE, false, Instant.parse("2026-03-10T12:00:00Z")));
  }

  @Test
  void unMoisDuJusteApresEcheance() {
    assertEquals(1, MotoService.moisDus(ECHEANCE, false, Instant.parse("2026-03-11T00:00:00Z")));
  }

  @Test
  void chaqueEcheanceDepasseeAjouteUnMois() {
    assertEquals(3, MotoService.moisDus(ECHEANCE, false, Instant.parse("2026-05-11T00:00:00Z")));
  }

  @Test
  void leDrapeauRetardCompteAuMoinsUnMois() {
    assertEquals(1, MotoService.moisDus(ECHEANCE, true, Instant.parse("2026-03-01T00:00:00Z")));
    assertEquals(1, MotoService.moisDus(null, true, Instant.parse("2026-03-01T00:00:00Z")));
  }

  @Test
  void sansEcheanceNiRetardRienNestDu() {
    assertEquals(0, MotoService.moisDus(null, false, Instant.parse("2026-03-01T00:00:00Z")));
  }

  @Test
  void leMontantDuCumuleTarifEtPenalite() {
    assertEquals(0, MotoService.montantDu(0));
    assertEquals(3 * (MotoService.TARIF_MENSUEL + MotoService.PENALITE_RETARD), MotoService.montantDu(3));
  }

  @Test
  void laLimiteSuivanteTombeLeDixDuMoisSuivant() {
    assertEquals(Instant.parse("2026-04-10T23:59:59.999Z"), MotoService.limiteApres(ECHEANCE));
    assertEquals(Instant.parse("2027-01-10T23:59:59.999Z"), MotoService.limiteApres(Instant.parse("2026-12-31T10:00:00Z")));
  }

  private static Map<String, Object> moto(boolean drapeau, Instant echeance) {
    Map<String, Object> row = new HashMap<>();
    row.put("enRetard", drapeau);
    row.put("prochainPaiement", echeance);
    return row;
  }

  @Test
  void enRetardSiEcheanceDepasseeMemeSansDrapeau() {
    assertTrue(MotoService.estEnRetard(moto(false, ECHEANCE), Instant.parse("2026-03-11T00:00:00Z")));
  }

  @Test
  void enRetardSiDrapeauMemeAvantEcheance() {
    assertTrue(MotoService.estEnRetard(moto(true, ECHEANCE), Instant.parse("2026-03-01T00:00:00Z")));
  }

  @Test
  void aJourAvantEcheanceSansDrapeau() {
    assertFalse(MotoService.estEnRetard(moto(false, ECHEANCE), Instant.parse("2026-03-10T12:00:00Z")));
    assertFalse(MotoService.estEnRetard(moto(false, null), Instant.parse("2026-03-10T12:00:00Z")));
  }
}
