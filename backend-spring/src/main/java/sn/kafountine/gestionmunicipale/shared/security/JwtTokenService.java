package sn.kafountine.gestionmunicipale.shared.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;
import sn.kafountine.gestionmunicipale.shared.config.Env;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;

/**
 * Jetons JWT HS256 identiques à ceux de jsonwebtoken côté Node (mêmes secrets, mêmes champs userId, sessionId,
 * role, type, iat, exp) : un jeton émis par l'un des deux backends est accepté par l'autre.
 */
@Component
public class JwtTokenService {
  private static final ObjectMapper JSON = new ObjectMapper();
  private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
  private static final Base64.Decoder DECODER = Base64.getUrlDecoder();
  private static final String HEADER = ENCODER.encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));

  public String signAccessToken(String userId, String sessionId, String role) {
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("userId", userId);
    payload.put("sessionId", sessionId);
    payload.put("role", role);
    payload.put("type", "access");
    return sign(payload, Env.JWT_SECRET, Env.durationSeconds(Env.JWT_EXPIRES_IN, 900));
  }

  public String signRefreshToken(String userId, String sessionId) {
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("userId", userId);
    payload.put("sessionId", sessionId);
    payload.put("type", "refresh");
    return sign(payload, Env.JWT_REFRESH_SECRET, refreshTtlSeconds());
  }

  public long refreshTtlSeconds() {
    return Env.durationSeconds(Env.JWT_REFRESH_EXPIRES_IN, 7L * 24 * 3600);
  }

  public Map<String, Object> verifyAccessToken(String token) {
    return verify(token, Env.JWT_SECRET, "Token invalide");
  }

  public Map<String, Object> verifyRefreshToken(String token) {
    return verify(token, Env.JWT_REFRESH_SECRET, "Refresh token invalide");
  }

  private String sign(Map<String, Object> payload, String secret, long ttlSeconds) {
    long now = System.currentTimeMillis() / 1000;
    payload.put("iat", now);
    payload.put("exp", now + ttlSeconds);
    try {
      String body = ENCODER.encodeToString(JSON.writeValueAsBytes(payload));
      String signingInput = HEADER + "." + body;
      return signingInput + "." + ENCODER.encodeToString(hmac(signingInput, secret));
    } catch (Exception e) {
      throw new IllegalStateException("Signature du jeton impossible", e);
    }
  }

  private Map<String, Object> verify(String token, String secret, String errorMessage) {
    try {
      String[] parts = token.split("\\.");
      if (parts.length != 3) throw AppException.unauthorized(errorMessage);
      Map<String, Object> header = JSON.readValue(DECODER.decode(parts[0]), new TypeReference<>() {});
      if (!"HS256".equals(header.get("alg"))) throw AppException.unauthorized(errorMessage);
      byte[] expected = hmac(parts[0] + "." + parts[1], secret);
      if (!MessageDigest.isEqual(expected, DECODER.decode(parts[2]))) throw AppException.unauthorized(errorMessage);
      Map<String, Object> payload = JSON.readValue(DECODER.decode(parts[1]), new TypeReference<>() {});
      Object exp = payload.get("exp");
      if (exp instanceof Number number && number.longValue() <= System.currentTimeMillis() / 1000) {
        throw AppException.unauthorized(errorMessage);
      }
      return payload;
    } catch (AppException e) {
      throw e;
    } catch (Exception e) {
      throw AppException.unauthorized(errorMessage);
    }
  }

  private static byte[] hmac(String input, String secret) throws Exception {
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    return mac.doFinal(input.getBytes(StandardCharsets.UTF_8));
  }
}
