package sn.kafountine.gestionmunicipale.service;

import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import sn.kafountine.gestionmunicipale.dto.AuthDtos.LoginResponse;
import sn.kafountine.gestionmunicipale.dto.AuthDtos.UserSummary;
import sn.kafountine.gestionmunicipale.entity.User;
import sn.kafountine.gestionmunicipale.repository.UserRepository;
import sn.kafountine.gestionmunicipale.security.JwtService;

@Service
public class AuthService {
  private final UserRepository users;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final StringRedisTemplate redis;

  public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService, StringRedisTemplate redis) {
    this.users = users;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
    this.redis = redis;
  }

  public LoginResponse login(String email, String password) {
    User user = users.findByEmail(email).filter(u -> Boolean.TRUE.equals(u.getActive())).orElseThrow(() -> new IllegalArgumentException("Identifiants invalides"));
    if (!passwordEncoder.matches(password, user.getPassword())) {
      throw new IllegalArgumentException("Identifiants invalides");
    }
    user.setLastLogin(OffsetDateTime.now());
    String sessionId = UUID.randomUUID().toString();
    String accessToken = jwtService.signAccess(user.getId(), sessionId, user.getRole());
    String refreshToken = jwtService.signRefresh(user.getId(), sessionId);
    redis.opsForValue().set(sessionKey(user.getId(), sessionId), refreshToken, jwtService.refreshExpiresInSeconds(), TimeUnit.SECONDS);
    return new LoginResponse(summary(user), accessToken, accessToken, refreshToken);
  }

  public LoginResponse refresh(String refreshToken) {
    var claims = jwtService.verifyRefresh(refreshToken);
    String userId = claims.get("userId", String.class);
    String sessionId = claims.get("sessionId", String.class);
    String stored = redis.opsForValue().get(sessionKey(userId, sessionId));
    if (!refreshToken.equals(stored)) {
      throw new IllegalArgumentException("Refresh token invalide");
    }
    User user = users.findById(userId).filter(u -> Boolean.TRUE.equals(u.getActive())).orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));
    String accessToken = jwtService.signAccess(user.getId(), sessionId, user.getRole());
    String newRefresh = jwtService.signRefresh(user.getId(), sessionId);
    redis.opsForValue().set(sessionKey(user.getId(), sessionId), newRefresh, jwtService.refreshExpiresInSeconds(), TimeUnit.SECONDS);
    return new LoginResponse(null, accessToken, accessToken, newRefresh);
  }

  public UserSummary me(String userId) {
    return users.findById(userId).map(this::summary).orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));
  }

  public void logout(String userId, String sessionId) {
    if (userId != null && sessionId != null) {
      redis.delete(sessionKey(userId, sessionId));
    }
  }

  private UserSummary summary(User user) {
    return new UserSummary(user.getId(), user.getEmail(), user.getNom(), user.getPrenom(), user.getRole());
  }

  private String sessionKey(String userId, String sessionId) {
    return "auth:session:" + userId + ":" + sessionId;
  }
}
