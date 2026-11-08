package sn.kafountine.gestionmunicipale.shared.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Rôles autorisés (middleware authorize côté Node) ; implique l'authentification. */
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface Roles {
  String[] value();
}
