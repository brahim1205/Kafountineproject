package sn.kafountine.gestionmunicipale.repository;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sn.kafountine.gestionmunicipale.entity.Contribuable;

public interface ContribuableRepository extends JpaRepository<Contribuable, String> {
  Optional<Contribuable> findByNin(String nin);
  Optional<Contribuable> findByTelephone(String telephone);
  boolean existsByTelephone(String telephone);

  @Query("""
    select c from Contribuable c
    where :search is null
      or lower(c.nom) like lower(concat('%', :search, '%'))
      or lower(c.prenom) like lower(concat('%', :search, '%'))
      or lower(c.nin) like lower(concat('%', :search, '%'))
      or lower(c.telephone) like lower(concat('%', :search, '%'))
    order by c.nom asc, c.prenom asc
  """)
  Page<Contribuable> search(@Param("search") String search, Pageable pageable);
}
