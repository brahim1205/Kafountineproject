package sn.kafountine.gestionmunicipale.repository;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sn.kafountine.gestionmunicipale.entity.MunicipalTransaction;

public interface TransactionRepository extends JpaRepository<MunicipalTransaction, String> {
  List<MunicipalTransaction> findByContribuableIdOrderByDateDesc(String contribuableId);
  List<MunicipalTransaction> findByContribuableIdAndIdIn(String contribuableId, List<String> ids);

  @Query("""
    select t from MunicipalTransaction t
    where (:year is null or t.year = :year)
      and (:categorie is null or t.categorie = :categorie)
      and (:statut is null or t.statut = :statut)
      and (:search is null or lower(t.numero) like lower(concat('%', :search, '%'))
        or lower(t.categorie) like lower(concat('%', :search, '%'))
        or lower(t.service) like lower(concat('%', :search, '%')))
    order by t.date desc
  """)
  Page<MunicipalTransaction> search(
    @Param("search") String search,
    @Param("categorie") String categorie,
    @Param("statut") String statut,
    @Param("year") Integer year,
    Pageable pageable
  );

  @Query("select coalesce(sum(t.montant), 0) from MunicipalTransaction t where t.year = :year")
  Double totalByYear(@Param("year") int year);

  @Query("select count(t) from MunicipalTransaction t where t.year = :year")
  long countByYear(@Param("year") int year);
}
