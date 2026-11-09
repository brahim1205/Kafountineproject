package sn.kafountine.gestionmunicipale.shared.validation;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Year;
import org.junit.jupiter.api.Test;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;

class AnneesClosesTest {
  private final int annee = Year.now().getValue();

  @Test
  void lAnneeEnCoursResteOuverte() {
    assertDoesNotThrow(() -> Common.assertOpenYear(annee));
    assertDoesNotThrow(() -> Common.assertRecordYearOpen(annee));
  }

  @Test
  void uneAnneeAbsenteVautAnneeEnCours() {
    assertDoesNotThrow(() -> Common.assertOpenYear(null));
    assertDoesNotThrow(() -> Common.assertOpenYear(0));
  }

  @Test
  void uneAnneePasseeEstClose() {
    assertThrows(AppException.class, () -> Common.assertOpenYear(annee - 1));
    assertThrows(AppException.class, () -> Common.assertRecordYearOpen(annee - 1));
  }
}
