package sn.kafountine.gestionmunicipale.shared.security;

/** Utilisateur authentifié de la requête (équivalent d'AuthenticatedUser côté Node). */
public record AuthUser(String userId, String sessionId, String role, String tokenType) {}
