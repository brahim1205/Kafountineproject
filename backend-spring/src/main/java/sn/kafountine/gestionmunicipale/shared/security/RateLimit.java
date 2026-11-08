package sn.kafountine.gestionmunicipale.shared.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import sn.kafountine.gestionmunicipale.shared.web.RateLimiter;

/** Limitation propre à une route, appliquée après l'authentification (comme dans les routes Node). */
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface RateLimit {
  String prefix();

  long windowMs();

  long max();

  RateLimiter.KeyKind key() default RateLimiter.KeyKind.IP;
}
