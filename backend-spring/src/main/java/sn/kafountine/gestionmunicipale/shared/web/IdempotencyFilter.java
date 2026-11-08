package sn.kafountine.gestionmunicipale.shared.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;

/**
 * Anti-doublon des écritures : un POST rejoué avec le même en-tête idempotency-key
 * (coupure réseau, nouvel essai du navigateur) renvoie le résultat du premier au lieu de recréer l'opération.
 */
@Configuration
public class IdempotencyFilter {
  private static final String HEADER = "idempotency-key";
  private final Db db;

  public IdempotencyFilter(Db db) {
    this.db = db;
  }

  @Bean
  public FilterRegistrationBean<OncePerRequestFilter> idempotencyFilterRegistration() {
    OncePerRequestFilter filter = new OncePerRequestFilter() {
      @Override
      protected boolean shouldNotFilter(HttpServletRequest request) {
        String key = request.getHeader(HEADER);
        return !"POST".equals(request.getMethod()) || !request.getRequestURI().startsWith("/api/v1/")
            || key == null || key.isBlank() || key.length() > 128;
      }

      @Override
      protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
          throws ServletException, IOException {
        String key = request.getRequestURI() + "|" + request.getHeader(HEADER);
        boolean first = db.update("""
            INSERT INTO "IdempotencyKey" ("key") VALUES (:key) ON CONFLICT ("key") DO NOTHING
            """, Db.params("key", key)) == 1;
        if (!first) {
          replay(key, response);
          return;
        }
        db.update("DELETE FROM \"IdempotencyKey\" WHERE \"createdAt\" < CURRENT_TIMESTAMP - INTERVAL '2 days'", Db.params());
        ContentCachingResponseWrapper wrapper = new ContentCachingResponseWrapper(response);
        boolean stored = false;
        try {
          chain.doFilter(request, wrapper);
          if (wrapper.getStatus() >= 200 && wrapper.getStatus() < 300) {
            db.update("""
                UPDATE "IdempotencyKey" SET "status" = :status, "contentType" = :contentType, "body" = :body WHERE "key" = :key
                """, Db.params("key", key, "status", wrapper.getStatus(), "contentType", wrapper.getContentType(),
                "body", new String(wrapper.getContentAsByteArray(), StandardCharsets.UTF_8)));
            stored = true;
          }
        } finally {
          // Un échec ne consomme pas la clé : l'opération peut être retentée.
          if (!stored) db.update("DELETE FROM \"IdempotencyKey\" WHERE \"key\" = :key", Db.params("key", key));
          wrapper.copyBodyToResponse();
        }
      }

      private void replay(String key, HttpServletResponse response) throws IOException {
        Map<String, Object> row = db.one("SELECT * FROM \"IdempotencyKey\" WHERE \"key\" = :key", Db.params("key", key));
        int status = row == null ? 0 : ((Number) row.get("status")).intValue();
        response.setCharacterEncoding("UTF-8");
        if (status == 0) {
          response.setStatus(409);
          response.setContentType("application/json");
          response.getWriter().write("{\"success\":false,\"message\":\"Cette opération est déjà en cours.\"}");
          return;
        }
        response.setStatus(status);
        response.setContentType(Db.str(row, "contentType"));
        response.getWriter().write(Db.str(row, "body"));
      }
    };
    FilterRegistrationBean<OncePerRequestFilter> registration = new FilterRegistrationBean<>(filter);
    registration.setOrder(6);
    registration.addUrlPatterns("/api/v1/*");
    return registration;
  }
}
