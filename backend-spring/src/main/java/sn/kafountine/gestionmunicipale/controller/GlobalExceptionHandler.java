package sn.kafountine.gestionmunicipale.controller;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler({IllegalArgumentException.class, MethodArgumentNotValidException.class})
  ResponseEntity<?> badRequest(Exception ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("success", false, "message", ex.getMessage()));
  }

  @ExceptionHandler(AccessDeniedException.class)
  ResponseEntity<?> forbidden(Exception ex) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("success", false, "message", "Accès interdit"));
  }

  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<?> responseStatus(ResponseStatusException ex) {
    return ResponseEntity.status(ex.getStatusCode()).body(Map.of("success", false, "message", ex.getReason() == null ? ex.getMessage() : ex.getReason()));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<?> error(Exception ex) {
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("success", false, "message", ex.getMessage()));
  }
}
