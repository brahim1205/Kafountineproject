package sn.kafountine.gestionmunicipale.shared.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.MethodParameter;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.errors.ErrorHandling;

/**
 * express.json({ limit: '10mb' }) puis express.urlencoded({ extended: true }) : le corps est décodé
 * avant l'authentification et la protection CSRF, comme côté Node. Un JSON invalide (ou une valeur
 * JSON qui n'est ni objet ni tableau) échoue en 500, sans gestion particulière dans errorHandler.
 */
@Configuration
public class BodyParsing implements WebMvcConfigurer {
  public static final String ATTRIBUTE = "kafountine.body";
  private static final long LIMIT = 10L * 1024 * 1024;
  private final ObjectMapper mapper;

  public BodyParsing(ObjectMapper mapper) {
    this.mapper = mapper;
  }

  private static String mediaType(HttpServletRequest request) {
    String contentType = request.getContentType();
    if (contentType == null) return "";
    int semicolon = contentType.indexOf(';');
    return (semicolon < 0 ? contentType : contentType.substring(0, semicolon)).strip().toLowerCase(Locale.ROOT);
  }

  /** type-is hasBody : en-tête Transfer-Encoding, ou Content-Length numérique. */
  private static boolean hasBody(HttpServletRequest request) {
    if (request.getHeader("transfer-encoding") != null) return true;
    String length = request.getHeader("content-length");
    if (length == null) return false;
    try {
      Long.parseLong(length.strip());
      return true;
    } catch (NumberFormatException e) {
      return false;
    }
  }

  private static String read(HttpServletRequest request) throws IOException {
    try (InputStream in = request.getInputStream()) {
      byte[] bytes = in.readNBytes((int) LIMIT + 1);
      if (bytes.length > LIMIT) throw new IllegalStateException("request entity too large");
      return new String(bytes, StandardCharsets.UTF_8);
    }
  }

  private JsonNode parseJson(String text) throws IOException {
    String trimmed = text.strip();
    if (trimmed.isEmpty()) return JsonNodeFactory.instance.objectNode();
    // Mode strict de body-parser : seuls un objet ou un tableau sont acceptés.
    if (trimmed.charAt(0) != '{' && trimmed.charAt(0) != '[') throw new IllegalArgumentException("Unexpected token in JSON");
    return mapper.readTree(trimmed);
  }

  /** qs (extended) pour les cas courants : a=1, a=1&a=2 (tableau), a[b]=1 (objet), a[]=1 (tableau). */
  static ObjectNode parseForm(String text) {
    ObjectNode root = JsonNodeFactory.instance.objectNode();
    if (text.isEmpty()) return root;
    for (String pair : text.split("&")) {
      if (pair.isEmpty()) continue;
      int eq = pair.indexOf('=');
      String key = URLDecoder.decode(eq < 0 ? pair : pair.substring(0, eq), StandardCharsets.UTF_8);
      String value = eq < 0 ? "" : URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8);
      int bracket = key.indexOf('[');
      if (bracket > 0 && key.endsWith("]")) {
        String base = key.substring(0, bracket);
        String inner = key.substring(bracket + 1, key.length() - 1);
        if (inner.isEmpty()) {
          JsonNode existing = root.get(base);
          ArrayNode array = existing instanceof ArrayNode a ? a : root.putArray(base);
          array.add(value);
        } else {
          JsonNode existing = root.get(base);
          ObjectNode object = existing instanceof ObjectNode o ? o : root.putObject(base);
          object.put(inner, value);
        }
        continue;
      }
      JsonNode existing = root.get(key);
      if (existing == null) {
        root.put(key, value);
      } else if (existing instanceof ArrayNode array) {
        array.add(value);
      } else {
        ArrayNode array = root.putArray(key);
        array.add(existing);
        array.add(value);
      }
    }
    return root;
  }

  @Bean
  public FilterRegistrationBean<OncePerRequestFilter> bodyParsingFilter() {
    OncePerRequestFilter filter = new OncePerRequestFilter() {
      @Override
      protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        String type = mediaType(request);
        JsonNode body = JsonNodeFactory.instance.objectNode();
        if (hasBody(request) && (type.equals("application/json") || type.equals("application/x-www-form-urlencoded"))) {
          try {
            String text = read(request);
            body = type.equals("application/json") ? parseJson(text) : parseForm(text);
          } catch (IOException | RuntimeException e) {
            ErrorHandling.write(response, request, new AppException(500, "Erreur interne du serveur"));
            return;
          }
        }
        request.setAttribute(ATTRIBUTE, body);
        chain.doFilter(request, response);
      }
    };
    FilterRegistrationBean<OncePerRequestFilter> registration = new FilterRegistrationBean<>(filter);
    registration.setOrder(3);
    return registration;
  }

  @Override
  public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
    resolvers.add(new HandlerMethodArgumentResolver() {
      @Override
      public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(Body.class);
      }

      @Override
      public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer container, NativeWebRequest webRequest, WebDataBinderFactory binder) {
        Object body = webRequest.getAttribute(ATTRIBUTE, NativeWebRequest.SCOPE_REQUEST);
        return body != null ? body : JsonNodeFactory.instance.objectNode();
      }
    });
  }
}
