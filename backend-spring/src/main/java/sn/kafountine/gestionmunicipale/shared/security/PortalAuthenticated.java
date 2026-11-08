package sn.kafountine.gestionmunicipale.shared.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Route réservée aux contribuables connectés au portail (authenticatePortal côté Node). */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface PortalAuthenticated {}
