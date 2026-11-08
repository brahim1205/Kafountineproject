package sn.kafountine.gestionmunicipale.shared.http;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;

/** Enveloppes de réponse identiques à shared/http/response.ts côté Node. */
public final class Api {
  private Api() {}

  public static ResponseEntity<Map<String, Object>> ok(Object data) {
    return ok(data, 200);
  }

  public static ResponseEntity<Map<String, Object>> ok(Object data, int status) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("success", true);
    body.put("data", data);
    return ResponseEntity.status(status).body(body);
  }

  public static ResponseEntity<Map<String, Object>> created(Object data) {
    return ok(data, 201);
  }

  public static ResponseEntity<Map<String, Object>> okWithMeta(Object data, Map<String, Object> meta) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("success", true);
    body.put("data", data);
    body.put("meta", meta);
    return ResponseEntity.ok(body);
  }

  public static ResponseEntity<Map<String, Object>> message(String text) {
    return message(text, 200);
  }

  public static ResponseEntity<Map<String, Object>> message(String text, int status) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("success", true);
    body.put("message", text);
    return ResponseEntity.status(status).body(body);
  }

  /** Petite aide pour construire les objets de réponse dans l'ordre des champs du backend Node. */
  public static Map<String, Object> map(Object... keyValues) {
    Map<String, Object> map = new LinkedHashMap<>();
    for (int i = 0; i + 1 < keyValues.length; i += 2) {
      map.put((String) keyValues[i], keyValues[i + 1]);
    }
    return map;
  }
}
