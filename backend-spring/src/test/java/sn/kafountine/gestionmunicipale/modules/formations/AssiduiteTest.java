package sn.kafountine.gestionmunicipale.modules.formations;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class AssiduiteTest {
  @Test
  void leTauxEstLaPartDesSeancesPresentes() {
    assertEquals(75, FormationService.tauxAssiduite(3, 1));
    assertEquals(67, FormationService.tauxAssiduite(2, 1));
    assertEquals(0, FormationService.tauxAssiduite(0, 0));
  }

  @Test
  void leSeuilDeCertificationEstInclus() {
    assertEquals("Certifié", FormationService.statutFinal(3, 1));
    assertEquals("Non certifié", FormationService.statutFinal(2, 1));
  }

  @Test
  void sansSeancePointeeLeJeuneNestPasCertifie() {
    assertEquals("Non certifié", FormationService.statutFinal(0, 0));
  }
}
