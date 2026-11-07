package sn.kafountine.gestionmunicipale.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private final String secret;
  private final String refreshSecret;
  private final long expiresInSeconds;
  private final long refreshExpiresInSeconds;

  public JwtService(
    @Value("${app.jwt.secret}") String secret,
    @Value("${app.jwt.refresh-secret}") String refreshSecret,
    @Value("${app.jwt.expires-in-seconds}") long expiresInSeconds,
    @Value("${app.jwt.refresh-expires-in-seconds}") long refreshExpiresInSeconds
  ) {
    this.secret = secret;
    this.refreshSecret = refreshSecret;
    this.expiresInSeconds = expiresInSeconds;
    this.refreshExpiresInSeconds = refreshExpiresInSeconds;
  }

  public String signAccess(String userId, String sessionId, String role) {
    return sign(secret, expiresInSeconds, Map.of("userId", userId, "sessionId", sessionId, "role", role, "type", "access"));
  }

  public String signRefresh(String userId, String sessionId) {
    return sign(refreshSecret, refreshExpiresInSeconds, Map.of("userId", userId, "sessionId", sessionId, "type", "refresh"));
  }

  public String signPortal(String contribuableId) {
    return sign(secret, refreshExpiresInSeconds, Map.of("id", contribuableId, "role", "CONTRIBUABLE", "type", "portal"));
  }

  public Claims verifyAccess(String token) {
    return verify(token, secret);
  }

  public Claims verifyRefresh(String token) {
    return verify(token, refreshSecret);
  }

  public Claims verifyPortal(String token) {
    return verify(token, secret);
  }

  public long refreshExpiresInSeconds() {
    return refreshExpiresInSeconds;
  }

  private String sign(String signingSecret, long ttlSeconds, Map<String, Object> claims) {
    Instant now = Instant.now();
    return Jwts.builder()
      .claims(claims)
      .issuedAt(Date.from(now))
      .expiration(Date.from(now.plusSeconds(ttlSeconds)))
      .signWith(key(signingSecret))
      .compact();
  }

  private Claims verify(String token, String signingSecret) {
    return Jwts.parser().verifyWith(key(signingSecret)).build().parseSignedClaims(token).getPayload();
  }

  private SecretKey key(String value) {
    byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
    if (bytes.length < 32) {
      byte[] padded = new byte[32];
      System.arraycopy(bytes, 0, padded, 0, bytes.length);
      bytes = padded;
    }
    return Keys.hmacShaKeyFor(bytes);
  }
}
