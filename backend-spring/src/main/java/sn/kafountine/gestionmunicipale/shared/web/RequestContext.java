package sn.kafountine.gestionmunicipale.shared.web;

import jakarta.servlet.http.HttpServletRequest;
import java.net.InetAddress;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import sn.kafountine.gestionmunicipale.shared.audit.Actor;
import sn.kafountine.gestionmunicipale.shared.config.Env;
import sn.kafountine.gestionmunicipale.shared.security.AuthUser;

/** Informations de la requête en cours (identifiant, utilisateur, adresse du client), comme AuthRequest côté Node. */
public final class RequestContext {
  public static final String REQUEST_ID = "kafountine.requestId";
  public static final String USER = "kafountine.user";

  private RequestContext() {}

  public static HttpServletRequest current() {
    ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
    return attributes == null ? null : attributes.getRequest();
  }

  public static String requestId(HttpServletRequest request) {
    Object id = request == null ? null : request.getAttribute(REQUEST_ID);
    if (id != null) return id.toString();
    String header = request == null ? null : request.getHeader("x-request-id");
    return header == null || header.isBlank() ? "unknown" : header;
  }

  public static AuthUser user(HttpServletRequest request) {
    return request == null ? null : (AuthUser) request.getAttribute(USER);
  }

  public static AuthUser user() {
    return user(current());
  }

  /** Acteur des écritures (journal d'audit), comme actorFrom côté Node. */
  public static Actor actor() {
    HttpServletRequest request = current();
    AuthUser user = user(request);
    return new Actor(user == null ? null : user.userId(), user == null ? null : user.role(), request == null ? null : clientIp(request));
  }

  /**
   * Adresse du client, même règle que req.ip d'Express avec « trust proxy » : sans confiance, l'adresse de
   * la connexion ; sinon, en remontant X-Forwarded-For depuis la droite, la première adresse non fiable.
   */
  public static String clientIp(HttpServletRequest request) {
    String remote = normalize(request.getRemoteAddr());
    String trust = Env.TRUST_PROXY.toLowerCase(Locale.ROOT);
    if (trust.isBlank() || trust.equals("false")) return remote;
    String forwarded = request.getHeader("x-forwarded-for");
    if (forwarded == null || forwarded.isBlank()) return remote;
    List<String> chain = new ArrayList<>();
    for (String part : forwarded.split(",")) {
      if (!part.isBlank()) chain.add(normalize(part.trim()));
    }
    chain.add(remote);
    if (trust.equals("true")) return chain.get(0);
    for (int i = chain.size() - 1; i > 0; i--) {
      if (!isTrusted(chain.get(i), trust)) return chain.get(i);
    }
    return chain.get(0);
  }

  private static String normalize(String address) {
    if (address == null) return "unknown";
    return address.startsWith("::ffff:") ? address.substring(7) : address;
  }

  private static boolean isTrusted(String address, String trust) {
    try {
      InetAddress inet = InetAddress.getByName(address);
      if (trust.contains("loopback") && inet.isLoopbackAddress()) return true;
      if (trust.contains("linklocal") && inet.isLinkLocalAddress()) return true;
      if (trust.contains("uniquelocal")) {
        if (inet.isSiteLocalAddress()) return true;
        byte[] bytes = inet.getAddress();
        if (bytes.length == 16 && (bytes[0] & 0xfe) == 0xfc) return true;
      }
      return false;
    } catch (Exception e) {
      return false;
    }
  }
}
