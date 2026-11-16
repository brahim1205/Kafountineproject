package sn.kafountine.gestionmunicipale.modules.caisse;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class PeriodeActiviteTest {
  private static LocalDate d(String iso) {
    return LocalDate.parse(iso);
  }

  @Test
  void leJourVaDeMinuitAMinuit() {
    assertArrayEquals(new LocalDate[] {d("2026-11-18"), d("2026-11-19")}, CaisseService.bornes(CaisseService.Periode.JOUR, d("2026-11-18")));
  }

  @Test
  void laSemaineVaDuLundiAuDimanche() {
    // Mercredi 18 novembre 2026 → du lundi 16 au lundi 23 exclu.
    assertArrayEquals(new LocalDate[] {d("2026-11-16"), d("2026-11-23")}, CaisseService.bornes(CaisseService.Periode.SEMAINE, d("2026-11-18")));
    // Un lundi et un dimanche restent dans leur propre semaine.
    assertArrayEquals(new LocalDate[] {d("2026-11-16"), d("2026-11-23")}, CaisseService.bornes(CaisseService.Periode.SEMAINE, d("2026-11-16")));
    assertArrayEquals(new LocalDate[] {d("2026-11-16"), d("2026-11-23")}, CaisseService.bornes(CaisseService.Periode.SEMAINE, d("2026-11-22")));
  }

  @Test
  void laSemainePeutChevaucherDeuxMois() {
    assertArrayEquals(new LocalDate[] {d("2026-11-30"), d("2026-12-07")}, CaisseService.bornes(CaisseService.Periode.SEMAINE, d("2026-12-02")));
  }

  @Test
  void leMoisEstLeMoisCivil() {
    assertArrayEquals(new LocalDate[] {d("2026-02-01"), d("2026-03-01")}, CaisseService.bornes(CaisseService.Periode.MOIS, d("2026-02-14")));
    assertArrayEquals(new LocalDate[] {d("2026-12-01"), d("2027-01-01")}, CaisseService.bornes(CaisseService.Periode.MOIS, d("2026-12-31")));
  }
}
