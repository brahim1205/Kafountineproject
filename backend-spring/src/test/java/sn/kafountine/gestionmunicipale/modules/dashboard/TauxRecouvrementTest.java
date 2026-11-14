package sn.kafountine.gestionmunicipale.modules.dashboard;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class TauxRecouvrementTest {
  @Test
  void partDuDuQuiAEteEnregistree() {
    assertEquals(75, DashboardService.tauxRecouvrement(750_000, 250_000));
  }

  @Test
  void neDepassePasCentPourCent() {
    assertEquals(100, DashboardService.tauxRecouvrement(11_769_950, 0));
  }

  @Test
  void zeroQuandRienNEstDu() {
    assertEquals(0, DashboardService.tauxRecouvrement(0, 0));
    assertEquals(0, DashboardService.tauxRecouvrement(0, 40_000));
  }
}
