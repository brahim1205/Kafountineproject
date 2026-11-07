package sn.kafountine.gestionmunicipale.service;

import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import sn.kafountine.gestionmunicipale.dto.ContribuableDtos.Response;
import sn.kafountine.gestionmunicipale.dto.ContribuableDtos.UpsertRequest;
import sn.kafountine.gestionmunicipale.entity.Contribuable;
import sn.kafountine.gestionmunicipale.repository.ContribuableRepository;

@Service
public class ContribuableService {
  private final ContribuableRepository contribuables;

  public ContribuableService(ContribuableRepository contribuables) {
    this.contribuables = contribuables;
  }

  public Page<Response> list(String search, int page, int limit) {
    String normalized = search == null || search.isBlank() ? null : search.trim();
    return contribuables.search(normalized, PageRequest.of(page - 1, limit)).map(this::toResponse);
  }

  public Map<String, Boolean> checkTelephone(String telephone) {
    return Map.of("exists", telephone != null && contribuables.existsByTelephone(telephone));
  }

  public Response create(UpsertRequest request) {
    Contribuable c = new Contribuable();
    apply(c, request);
    return toResponse(contribuables.save(c));
  }

  public Response update(String id, UpsertRequest request) {
    Contribuable c = contribuables.findById(id).orElseThrow(() -> new IllegalArgumentException("Contribuable introuvable"));
    apply(c, request);
    return toResponse(contribuables.save(c));
  }

  public void delete(String id) {
    contribuables.deleteById(id);
  }

  private void apply(Contribuable c, UpsertRequest r) {
    if (r.nin() != null) c.setNin(r.nin());
    if (r.nom() != null) c.setNom(r.nom());
    if (r.prenom() != null) c.setPrenom(r.prenom());
    if (r.dateNaiss() != null && !r.dateNaiss().isBlank()) c.setDateNaiss(DateParser.parse(r.dateNaiss()));
    if (r.lieuNaiss() != null) c.setLieuNaiss(r.lieuNaiss());
    if (r.adresse() != null) c.setAdresse(r.adresse());
    if (r.telephone() != null) c.setTelephone(r.telephone());
    if (r.email() != null) c.setEmail(r.email());
    if (r.profession() != null) c.setProfession(r.profession());
    if (r.typeContribuable() != null) c.setTypeContribuable(r.typeContribuable());
    if (r.zone() != null) c.setZone(r.zone());
    if (r.montantImpot() != null) c.setMontantImpot(r.montantImpot());
    if (r.isActive() != null) c.setActive(r.isActive());
  }

  public Response toResponse(Contribuable c) {
    return new Response(c.getId(), c.getNin(), c.getNom(), c.getPrenom(), c.getDateNaiss(), c.getLieuNaiss(), c.getAdresse(), c.getTelephone(), c.getEmail(), c.getProfession(), c.getTypeContribuable(), c.getZone(), c.getMontantImpot(), c.getActive());
  }
}
