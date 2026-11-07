package sn.kafountine.gestionmunicipale.shared.audit;

/** Auteur d'une écriture, pour le journal d'audit (équivalent d'Actor côté Node). */
public record Actor(String userId, String role, String ipAddress) {}
