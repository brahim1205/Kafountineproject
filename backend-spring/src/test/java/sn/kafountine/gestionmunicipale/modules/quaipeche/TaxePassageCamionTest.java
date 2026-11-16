package sn.kafountine.gestionmunicipale.modules.quaipeche;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;

/** Tranches de l'arrêté du 8 mai 2024, section VI : camion frigo vide ou chargé, selon sa capacité. */
class TaxePassageCamionTest {
  @Test
  void unCamionSansChargementPaieLeTarifVide() {
    assertEquals("Camions frigorifiques vide - 1-10 tonnes", QuaiPecheService.tarifPassage(5000.0, 0));
  }

  @Test
  void unCamionChargePaieLeTarifCharge() {
    assertEquals("Camions frigorifiques charge - 1-10 tonnes", QuaiPecheService.tarifPassage(5000.0, 3200));
  }

  @Test
  void lesBornesDesTranchesSuiventLArrete() {
    assertEquals("Camions frigorifiques charge - 0-1 tonne", QuaiPecheService.tarifPassage(1000.0, 500));
    assertEquals("Camions frigorifiques charge - 1-10 tonnes", QuaiPecheService.tarifPassage(1001.0, 500));
    assertEquals("Camions frigorifiques charge - 1-10 tonnes", QuaiPecheService.tarifPassage(10000.0, 500));
    assertEquals("Camions frigorifiques charge - 10-20 tonnes", QuaiPecheService.tarifPassage(20000.0, 500));
    assertEquals("Camions frigorifiques charge - +20 tonnes", QuaiPecheService.tarifPassage(20001.0, 500));
  }

  @Test
  void sansCapaciteLePoidsChargeSertDeReference() {
    assertEquals("Camions frigorifiques charge - 10-20 tonnes", QuaiPecheService.tarifPassage(null, 12000));
  }

  @Test
  void sansCapaciteNiPoidsLaTaxeNePeutPasEtreCalculee() {
    assertThrows(AppException.class, () -> QuaiPecheService.tarifPassage(null, 0));
  }
}
