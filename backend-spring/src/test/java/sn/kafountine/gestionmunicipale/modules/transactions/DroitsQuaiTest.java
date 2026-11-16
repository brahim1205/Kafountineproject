package sn.kafountine.gestionmunicipale.modules.transactions;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class DroitsQuaiTest {
  @Test
  void leQuaiEnregistreSesDroits() {
    assertTrue(TransactionsController.droitQuai("stationnement-transport", "Transport maritime - Pecheurs saisonniers"));
    assertTrue(TransactionsController.droitQuai("stationnement-transport", "Transport poisson - Moto chargeant poisson"));
    assertTrue(TransactionsController.droitQuai("marche", "Etals - Poissonnerie (etalage)"));
  }

  @Test
  void leQuaiNeTouchePasAuxAutresTaxesNiAuxCamions() {
    assertFalse(TransactionsController.droitQuai("stationnement-transport", "Camions frigorifiques charge - 1-10 tonnes"));
    assertFalse(TransactionsController.droitQuai("marche", "Etals - Petit etalage"));
    assertFalse(TransactionsController.droitQuai("urbanisme", "Permis - Permis construire habitation"));
    assertFalse(TransactionsController.droitQuai(null, null));
  }
}
