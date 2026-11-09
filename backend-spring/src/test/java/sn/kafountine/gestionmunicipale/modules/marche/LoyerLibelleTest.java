package sn.kafountine.gestionmunicipale.modules.marche;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class LoyerLibelleTest {
  private static final LocalDate AOUT = LocalDate.of(2026, 8, 15);

  @Test
  void leMoisEstLeRythmeParDefaut() {
    assertEquals("Août 2026", LoyerService.libelle("mois", AOUT));
    assertEquals("Août 2026", LoyerService.libelle("mensuel", AOUT));
    assertEquals("Août 2026", LoyerService.libelle("Avril 2026", AOUT));
    assertEquals("Août 2026", LoyerService.libelle(null, AOUT));
  }

  @Test
  void lesAutresRythmesOntUneSeuleEcheance() {
    assertEquals("3e trimestre 2026", LoyerService.libelle("trimestre", AOUT));
    assertEquals("1er trimestre 2026", LoyerService.libelle("trimestre", LocalDate.of(2026, 3, 31)));
    assertEquals("2e semestre 2026", LoyerService.libelle("semestre", AOUT));
    assertEquals("Année 2026", LoyerService.libelle("annee", AOUT));
  }

  @Test
  void leMoisSeulReconnaitLesAnciennesSaisies() {
    assertEquals("Août", LoyerService.moisSeul("Août 2026"));
    assertEquals("Année 2026", LoyerService.moisSeul("Année 2026"));
    assertEquals("3e trimestre 2026", LoyerService.moisSeul("3e trimestre 2026"));
  }
}
