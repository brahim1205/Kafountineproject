package sn.kafountine.gestionmunicipale.repository;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sn.kafountine.gestionmunicipale.entity.User;

public interface UserRepository extends JpaRepository<User, String> {
  Optional<User> findByEmail(String email);

  @Query("""
    select u from User u
    where :search is null
      or lower(u.email) like lower(concat('%', :search, '%'))
      or lower(u.nom) like lower(concat('%', :search, '%'))
      or lower(u.prenom) like lower(concat('%', :search, '%'))
      or lower(u.role) like lower(concat('%', :search, '%'))
    order by u.nom asc, u.prenom asc
  """)
  Page<User> search(@Param("search") String search, Pageable pageable);
}
