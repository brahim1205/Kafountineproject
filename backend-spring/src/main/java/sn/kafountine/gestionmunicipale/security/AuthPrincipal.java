package sn.kafountine.gestionmunicipale.security;

public record AuthPrincipal(String userId, String sessionId, String role, String tokenType) {}
