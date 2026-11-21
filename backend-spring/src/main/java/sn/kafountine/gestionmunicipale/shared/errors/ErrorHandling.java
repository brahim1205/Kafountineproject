package sn.kafountine.gestionmunicipale.shared.errors;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import sn.kafountine.gestionmunicipale.modules.incidents.IncidentService;
import sn.kafountine.gestionmunicipale.shared.config.Env;
import sn.kafountine.gestionmunicipale.shared.security.AuthUser;
import sn.kafountine.gestionmunicipale.shared.web.RequestContext;

/** Réponses d'erreur identiques à errorHandler.ts côté Node. */
@RestControllerAdvice
public class ErrorHandling {
  private static final ObjectMapper JSON = new ObjectMapper();
  private final IncidentService incidents;

  public ErrorHandling(IncidentService incidents) {
    this.incidents = incidents;
  }

  public static Map<String, Object> body(AppException error, HttpServletRequest request) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("success", false);
    body.put("message", error.getMessage());
    if (error.details() != null) body.put("details", error.details());
    body.put("requestId", RequestContext.requestId(request));
    return body;
  }

  /** Écrit l'erreur directement (filtres, qui s'exécutent avant les contrôleurs). */
  public static void write(HttpServletResponse response, HttpServletRequest request, AppException error) throws IOException {
    response.setStatus(error.status());
    response.setContentType("application/json; charset=utf-8");
    response.getWriter().write(JSON.writeValueAsString(body(error, request)));
  }

  @ExceptionHandler(AppException.class)
  public ResponseEntity<Map<String, Object>> app(AppException error, HttpServletRequest request) {
    return ResponseEntity.status(error.status()).body(body(error, request));
  }

  @ExceptionHandler({NoHandlerFoundException.class, NoResourceFoundException.class, HttpRequestMethodNotSupportedException.class})
  public ResponseEntity<Map<String, Object>> notFound() {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("success", false);
    body.put("message", "Route non trouvée");
    return ResponseEntity.status(404).body(body);
  }

  @ExceptionHandler(EmptyResultDataAccessException.class)
  public ResponseEntity<Map<String, Object>> missing(HttpServletRequest request) {
    return app(AppException.notFound("Ressource introuvable"), request);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<Map<String, Object>> internal(Exception error, HttpServletRequest request) {
    AuthUser user = RequestContext.user(request);
    Map<String, Object> log = new LinkedHashMap<>();
    log.put("type", "error");
    log.put("requestId", RequestContext.requestId(request));
    log.put("method", request.getMethod());
    log.put("path", request.getRequestURI());
    log.put("userId", user == null ? null : user.userId());
    log.put("role", user == null ? null : user.role());
    log.put("name", error.getClass().getSimpleName());
    log.put("message", error.getMessage());
    if (!Env.IS_PRODUCTION) {
      java.io.StringWriter trace = new java.io.StringWriter();
      error.printStackTrace(new java.io.PrintWriter(trace));
      log.put("stack", trace.toString());
    }
    try {
      System.err.println(JSON.writeValueAsString(log));
    } catch (IOException ignored) {
      // journalisation impossible : la réponse d'erreur part quand même
    }
    String message = error.getMessage() == null ? error.getClass().getSimpleName() : error.getClass().getSimpleName() + ": " + error.getMessage();
    incidents.enregistrer("serveur", request.getMethod() + " " + request.getRequestURI(), message, RequestContext.requestId(request),
        user == null ? null : user.userId(), user == null ? null : user.role());
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("success", false);
    body.put("message", "Erreur interne du serveur");
    body.put("requestId", RequestContext.requestId(request));
    return ResponseEntity.status(500).body(body);
  }
}
