package sn.kafountine.gestionmunicipale.modules.verification;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.security.RateLimit;
import sn.kafountine.gestionmunicipale.shared.validation.Input;

/** Route publique, sans connexion, limitée en nombre d'appels pour décourager l'énumération des numéros. */
@RestController
public class VerificationController {
  private final VerificationService service;

  public VerificationController(VerificationService service) {
    this.service = service;
  }

  @GetMapping("/api/v1/public/recus/{numero}")
  @RateLimit(prefix = "public-recu", windowMs = 60 * 1000, max = 20)
  public ResponseEntity<Map<String, Object>> verifier(@PathVariable String numero) {
    Input params = Input.params(Map.of("numero", numero));
    String valeur = params.str("numero").trimmed(3, 40, "Numéro de reçu invalide").required();
    params.check();
    return Api.ok(service.verifier(valeur));
  }
}
