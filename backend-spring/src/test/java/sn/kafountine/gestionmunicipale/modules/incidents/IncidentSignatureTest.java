package sn.kafountine.gestionmunicipale.modules.incidents;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import org.junit.jupiter.api.Test;

class IncidentSignatureTest {
  @Test
  void regroupeLesErreursQuiNeDifferentQueParLesIdentifiants() {
    String a = IncidentService.signature("serveur", "GET /api/v1/marche/places/3f2a1c4e-1111-4222-8333-944445555666", "Place 12 introuvable");
    String b = IncidentService.signature("serveur", "GET /api/v1/marche/places/91b0aa00-aaaa-4bbb-8ccc-dddddddddddd", "Place 47 introuvable");
    assertEquals(a, b);
  }

  @Test
  void separeLesOriginesLesLieuxEtLesMessages() {
    String base = IncidentService.signature("serveur", "/marche", "TypeError: x");
    assertNotEquals(base, IncidentService.signature("navigateur", "/marche", "TypeError: x"));
    assertNotEquals(base, IncidentService.signature("serveur", "/motos", "TypeError: x"));
    assertNotEquals(base, IncidentService.signature("serveur", "/marche", "TypeError: y"));
  }
}
