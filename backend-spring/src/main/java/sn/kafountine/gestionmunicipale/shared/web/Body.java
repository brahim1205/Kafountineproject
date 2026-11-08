package sn.kafountine.gestionmunicipale.shared.web;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Corps de la requête déjà décodé par {@link BodyParsing} (req.body côté Express), {} par défaut. */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface Body {}
