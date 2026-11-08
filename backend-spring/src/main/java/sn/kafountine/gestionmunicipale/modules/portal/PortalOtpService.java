package sn.kafountine.gestionmunicipale.modules.portal;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;
import sn.kafountine.gestionmunicipale.shared.config.Env;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.persistence.Kv;

/** Codes à usage unique du portail (PortalOtpService côté Node, mêmes clés Redis et même format). */
@Component
public class PortalOtpService {
  private static final int MAX_ATTEMPTS = 5;
  private final Kv kv;
  private final ObjectMapper mapper;
  private final SecureRandom random = new SecureRandom();
  private final HttpClient http = HttpClient.newHttpClient();

  public PortalOtpService(Kv kv, ObjectMapper mapper) {
    this.kv = kv;
    this.mapper = mapper;
  }

  private static String key(String requestId) {
    return "portal:otp:" + requestId;
  }

  private static String hash(String requestId, String code) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(Env.JWT_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      return HexFormat.of().formatHex(mac.doFinal((requestId + ":" + code).getBytes(StandardCharsets.UTF_8)));
    } catch (GeneralSecurityException e) {
      throw new IllegalStateException(e);
    }
  }

  private void save(String requestId, Map<String, Object> record, long ttlSeconds) {
    try {
      kv.set(key(requestId), mapper.writeValueAsString(record), ttlSeconds);
    } catch (JsonProcessingException e) {
      throw new IllegalStateException(e);
    }
  }

  public Map<String, Object> createChallenge(String contribuableId, String telephone) {
    String requestId = UUID.randomUUID().toString();
    String code = String.format("%06d", random.nextInt(1_000_000));
    long ttl = Env.PORTAL_OTP_TTL_SECONDS;
    Map<String, Object> record = new LinkedHashMap<>();
    record.put("contribuableId", contribuableId);
    record.put("codeHash", hash(requestId, code));
    record.put("attempts", 0);
    record.put("expiresAt", System.currentTimeMillis() + ttl * 1000);
    save(requestId, record, ttl);
    deliver(requestId, telephone, code, ttl);
    Map<String, Object> challenge = new LinkedHashMap<>();
    challenge.put("requestId", requestId);
    challenge.put("expiresInSeconds", ttl);
    if (!Env.IS_PRODUCTION) challenge.put("devCode", code);
    return challenge;
  }

  private void deliver(String requestId, String telephone, String code, long ttl) {
    if (Env.PORTAL_OTP_DELIVERY_MODE.equals("dev")) {
      if (Env.IS_PRODUCTION) throw new IllegalStateException("Le mode de livraison OTP dev est interdit en production.");
      System.out.println("Portal OTP dev code for " + telephone + ": " + code);
      return;
    }
    if (!Env.PORTAL_OTP_DELIVERY_MODE.equals("webhook")) throw new IllegalStateException("Mode de livraison OTP non supporté: " + Env.PORTAL_OTP_DELIVERY_MODE);
    ObjectNode body = mapper.createObjectNode().put("channel", "sms").put("to", telephone).put("code", code).put("requestId", requestId).put("expiresInSeconds", ttl);
    HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(Env.PORTAL_OTP_WEBHOOK_URL)).header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(body.toString()));
    if (!Env.PORTAL_OTP_WEBHOOK_TOKEN.isEmpty()) request.header("Authorization", "Bearer " + Env.PORTAL_OTP_WEBHOOK_TOKEN);
    try {
      HttpResponse<Void> response = http.send(request.build(), HttpResponse.BodyHandlers.discarding());
      if (response.statusCode() < 200 || response.statusCode() >= 300) throw new IllegalStateException("Échec livraison OTP portail (" + response.statusCode() + ")");
    } catch (IOException e) {
      throw new IllegalStateException(e);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException(e);
    }
  }

  @SuppressWarnings("unchecked")
  public String verify(String requestId, String code) {
    String raw = kv.get(key(requestId));
    Map<String, Object> record;
    try {
      record = raw == null ? null : mapper.readValue(raw, LinkedHashMap.class);
    } catch (JsonProcessingException e) {
      throw new IllegalStateException(e);
    }
    long now = System.currentTimeMillis();
    if (record == null || ((Number) record.get("expiresAt")).longValue() <= now) {
      kv.delete(key(requestId));
      throw AppException.unauthorized("Code de vérification invalide ou expiré");
    }
    int attempts = ((Number) record.get("attempts")).intValue();
    if (attempts >= MAX_ATTEMPTS) {
      kv.delete(key(requestId));
      throw AppException.unauthorized("Trop de tentatives de vérification");
    }
    boolean match = MessageDigest.isEqual(HexFormat.of().parseHex((String) record.get("codeHash")), HexFormat.of().parseHex(hash(requestId, code)));
    if (!match) {
      record.put("attempts", attempts + 1);
      long remainingMs = ((Number) record.get("expiresAt")).longValue() - now;
      save(requestId, record, Math.max(1, (long) Math.ceil(remainingMs / 1000.0)));
      throw AppException.unauthorized("Code de vérification invalide ou expiré");
    }
    kv.delete(key(requestId));
    return (String) record.get("contribuableId");
  }
}
