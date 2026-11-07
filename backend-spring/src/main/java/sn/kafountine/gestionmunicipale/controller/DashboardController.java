package sn.kafountine.gestionmunicipale.controller;

import java.time.Year;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import sn.kafountine.gestionmunicipale.dto.ApiResponse;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {
  private final JdbcTemplate jdbc;

  public DashboardController(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @GetMapping("/statistiques")
  ApiResponse<?> statistiques(@RequestParam(required = false) Integer year) {
    int selectedYear = year == null ? Year.now().getValue() : year;
    long contribuables = count("Contribuable", null, null);
    long transactions = count("Transaction", "year", selectedYear);
    double recettes = sum("Transaction", "montant", "year", selectedYear);
    return ApiResponse.ok(Map.of(
      "year", selectedYear,
      "contribuables", contribuables,
      "transactions", transactions,
      "recettes", recettes,
      "montantTotal", recettes
    ));
  }

  private long count(String table, String column, Object value) {
    if (column == null) return jdbc.queryForObject("select count(*) from \"" + table + "\"", Long.class);
    return jdbc.queryForObject("select count(*) from \"" + table + "\" where \"" + column + "\" = ?", Long.class, value);
  }

  private double sum(String table, String sumColumn, String whereColumn, Object value) {
    Double total = jdbc.queryForObject("select coalesce(sum(\"" + sumColumn + "\"), 0) from \"" + table + "\" where \"" + whereColumn + "\" = ?", Double.class, value);
    return total == null ? 0 : total;
  }
}
