package sn.kafountine.gestionmunicipale.modules.transactions;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class MontantServiceTest {
  @Test
  void unTarifUnitaireSeMultipliePasLaQuantite() {
    assertEquals(1500, TransactionService.montantDuService(500, 3, null));
  }

  @Test
  void unDroitEnPourcentageSePrendSurLesRecettesDeclarees() {
    // 15 % de 240 000 F de recettes déclarées.
    assertEquals(36000, TransactionService.montantDuService(15, 240_000, "pourcentage"));
  }

  @Test
  void unPourcentageEstArrondiAuFranc() {
    assertEquals(150, TransactionService.montantDuService(15, 1003, "pourcentage"));
  }
}
