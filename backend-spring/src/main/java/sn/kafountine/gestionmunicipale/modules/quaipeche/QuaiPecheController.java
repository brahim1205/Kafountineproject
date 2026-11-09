package sn.kafountine.gestionmunicipale.modules.quaipeche;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import sn.kafountine.gestionmunicipale.shared.web.Body;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.modules.quaipeche.QuaiPecheService.Collection;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.security.Roles;
import sn.kafountine.gestionmunicipale.shared.validation.Common;
import sn.kafountine.gestionmunicipale.shared.validation.Input;
import sn.kafountine.gestionmunicipale.shared.web.RequestContext;

/** Routes /api/v1/quai-peche (quai-peche.routes.ts côté Node). */
@RestController
@RequestMapping("/api/v1/quai-peche")
public class QuaiPecheController {
  private static final String COLLECTIONS = "{collection:pecheurs|embarcations|commissions|camions|expeditions}";
  private final QuaiPecheService service;

  public QuaiPecheController(QuaiPecheService service) {
    this.service = service;
  }

  @GetMapping("/statistiques")
  @Roles({"ADMIN", "SUPER_ADMIN", "QUAI_PECHE", "SERVICE_FINANCES", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> stats(HttpServletRequest request) {
    return Api.ok(service.stats(Common.yearQuery(request.getParameterMap())));
  }

  @GetMapping("/" + COLLECTIONS)
  @Roles({"ADMIN", "SUPER_ADMIN", "QUAI_PECHE", "AGENT", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> list(@PathVariable String collection, HttpServletRequest request) {
    Input query = Input.query(request.getParameterMap());
    Integer year = Common.year(query);
    Integer limit = query.num("limit").integer().min(1).max(500).optionalInt();
    Integer page = query.num("page").integer().min(1).optionalInt();
    String search = query.str("search").max(120).optional();
    String statut = query.str("statut").max(40).optional();
    query.check();
    int resolved = Common.yearOrCurrent(year == null || year == 0 ? null : year);
    Common.Paging paging = Common.paging(page, limit);
    if (paging == null) return Api.ok(service.list(Collection.valueOf(collection), resolved));
    Map<String, Object> result = service.page(Collection.valueOf(collection), resolved, search == null ? "" : search.strip(), statut, paging);
    @SuppressWarnings("unchecked") Map<String, Object> meta = (Map<String, Object>) result.get("meta");
    return Api.okWithMeta(result.get("data"), meta);
  }

  @GetMapping("/" + COLLECTIONS + "/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN", "QUAI_PECHE", "AGENT", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> get(@PathVariable String collection, @PathVariable String id) {
    return Api.ok(service.get(Collection.valueOf(collection), Common.id(id)));
  }

  @PostMapping("/" + COLLECTIONS)
  @Roles({"ADMIN", "SUPER_ADMIN", "QUAI_PECHE", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> create(@PathVariable String collection, @Body JsonNode body) {
    Collection c = Collection.valueOf(collection);
    return Api.created(service.create(RequestContext.actor(), c, fields(c, Input.body(body), true)));
  }

  @PutMapping("/" + COLLECTIONS + "/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN", "QUAI_PECHE", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> update(@PathVariable String collection, @PathVariable String id, @Body JsonNode body) {
    Collection c = Collection.valueOf(collection);
    String resourceId = Common.id(id);
    return Api.ok(service.update(RequestContext.actor(), c, resourceId, fields(c, Input.body(body), false)));
  }

  @DeleteMapping("/" + COLLECTIONS + "/{id}")
  @Roles({"ADMIN", "SUPER_ADMIN", "REGISSEUR"})
  public ResponseEntity<Map<String, Object>> delete(@PathVariable String collection, @PathVariable String id) {
    service.delete(RequestContext.actor(), Collection.valueOf(collection), Common.id(id));
    return Api.message("Suppression effectuée");
  }

  /** Champs reçus (seules les clés présentes figurent dans le résultat, comme req.body validé). */
  private static final class Fields {
    final Input input;
    final boolean create;
    final Map<String, Object> values = new LinkedHashMap<>();

    Fields(Input input, boolean create) {
      this.input = input;
      this.create = create;
    }

    private void put(String key, Object value) {
      if (input.has(key) && value != null) values.put(key, value);
    }

    /** trimmedString requis à la création, optionnel (.partial()) en mise à jour. */
    Fields required(String key, int min, int max, String message, boolean partialAllowed) {
      Input.Str str = input.str(key).trimmed(min, max, message);
      put(key, create || !partialAllowed ? str.required() : str.optionalPlain());
      return this;
    }

    /** trimmedString absent de la mise à jour (champ non modifiable). */
    Fields optional(String key, int max) {
      put(key, input.str(key).max(max).optional());
      return this;
    }

    Fields uuid(String key, boolean required) {
      Input.Str str = input.str(key).noTrim().uuid("Identifiant invalide");
      put(key, required ? str.required() : str.optionalPlain());
      return this;
    }

    Fields number(String key, Input.Num num, boolean required) {
      put(key, required ? num.required() : num.optional());
      return this;
    }

    Fields year() {
      put("year", Common.year(input));
      return this;
    }

    Map<String, Object> done() {
      input.check();
      return values;
    }
  }

  private static Map<String, Object> fields(Collection collection, Input input, boolean create) {
    Fields f = new Fields(input, create);
    switch (collection) {
      case pecheurs -> f.required("nom", 1, 100, "Nom requis", true).required("prenom", 1, 100, "Prénom requis", true)
          .optional("telephone", 20).optional("nin", 30).optional("adresse", 255).optional("statut", 40).year();
      case embarcations -> f.required("nom", 1, 120, "Nom requis", true).required("immatriculation", 1, 60, "Immatriculation requise", true)
          .required("type", 1, 80, "Type requis", true).number("taille", input.num("taille").min(0, "Valeur positive ou nulle requise"), false)
          .optional("moteur", 120).optional("statut", 40).uuid("pecheurId", false).year();
      case commissions -> {
        if (create) f.uuid("pecheurId", true);
        f.number("poids", input.num("poids").positive("Valeur positive requise"), create);
        if (create) {
          f.required("typePoisson", 1, 120, "Type de poisson requis", false);
        } else {
          f.optional("typePoisson", 120);
        }
        f.number("temperatura", input.num("temperatura"), false).optional("observations", 500).optional("statut", 40);
        if (create) f.year();
      }
      case camions -> f.required("immatriculation", 1, 60, "Immatriculation requise", true).required("marque", 1, 80, "Marque requise", true)
          .optional("modele", 80).number("capacite", input.num("capacite").min(0, "Valeur positive ou nulle requise"), false)
          .optional("chauffeur", 120).optional("telephone", 20).optional("statut", 40).year();
      case expeditions -> {
        if (create) f.uuid("camionId", true);
        f.number("poids", input.num("poids").positive("Valeur positive requise"), create).optional("destination", 120)
            .number("montant", input.num("montant").min(0, "Valeur positive ou nulle requise"), false).optional("statut", 40).optional("observations", 500);
        if (create) f.year();
      }
    }
    return f.done();
  }
}
