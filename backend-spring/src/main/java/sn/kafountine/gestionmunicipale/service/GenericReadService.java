package sn.kafountine.gestionmunicipale.service;

import java.sql.ResultSetMetaData;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.Year;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class GenericReadService {
  private final JdbcTemplate jdbc;

  public GenericReadService(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Map<String, Object>> list(String table, Integer year, Integer limit) {
    return list(table, year, limit, null);
  }

  public List<Map<String, Object>> list(String table, Integer year, Integer limit, String search) {
    if (!tableExists(table)) return List.of();
    boolean hasYear = columnExists(table, "year");
    boolean hasCreatedAt = columnExists(table, "createdAt");
    Map<String, String> columns = columnTypes(table);
    int safeLimit = limit == null ? 100 : Math.max(1, Math.min(500, limit));
    String sql = "select * from \"" + table + "\"";
    List<String> conditions = new ArrayList<>();
    List<Object> args = new ArrayList<>();
    if (hasYear && year != null) {
      conditions.add("\"year\" = ?");
      args.add(year);
    }
    List<String> searchableColumns = columns.entrySet().stream()
      .filter(entry -> List.of("text", "character varying", "character").contains(entry.getValue()))
      .map(Map.Entry::getKey)
      .filter(name -> !List.of("id", "password").contains(name))
      .toList();
    if (search != null && !search.isBlank() && !searchableColumns.isEmpty()) {
      conditions.add("(" + String.join(" or ", searchableColumns.stream().map(name -> "lower(\"" + name + "\") like lower(?)").toList()) + ")");
      for (int i = 0; i < searchableColumns.size(); i++) {
        args.add("%" + search.trim() + "%");
      }
    }
    if (!conditions.isEmpty()) {
      sql += " where " + String.join(" and ", conditions);
    }
    if (hasCreatedAt) {
      sql += " order by \"createdAt\" desc";
    }
    sql += " limit ?";
    args.add(safeLimit);
    return jdbc.query(sql, (rs, rowNum) -> row(rs), args.toArray());
  }

  public Map<String, Object> show(String table, String id) {
    if (!tableExists(table)) return Map.of("id", id);
    List<Map<String, Object>> rows = jdbc.query("select * from \"" + table + "\" where \"id\" = ? limit 1", (rs, rowNum) -> row(rs), id);
    return rows.isEmpty() ? Map.of("id", id) : rows.get(0);
  }

  public Map<String, Object> create(String table, Map<String, Object> input) {
    if (!tableExists(table)) return input == null ? Map.of() : input;
    Map<String, String> columns = columnTypes(table);
    Map<String, Object> values = new LinkedHashMap<>();
    if (columns.containsKey("id")) values.put("id", UUID.randomUUID().toString());
    if (columns.containsKey("year") && (input == null || !input.containsKey("year"))) values.put("year", Year.now().getValue());
    if (columns.containsKey("createdAt")) values.put("createdAt", OffsetDateTime.now());
    if (columns.containsKey("updatedAt")) values.put("updatedAt", OffsetDateTime.now());
    if (input != null) {
      input.forEach((key, value) -> {
        if (columns.containsKey(key) && !"id".equals(key) && !"createdAt".equals(key) && !"updatedAt".equals(key)) {
          values.put(key, coerce(value, columns.get(key)));
        }
      });
    }
    if (values.isEmpty()) return Map.of();
    String columnSql = String.join(", ", values.keySet().stream().map(name -> "\"" + name + "\"").toList());
    String placeholders = String.join(", ", values.keySet().stream().map(name -> "?").toList());
    jdbc.update("insert into \"" + table + "\" (" + columnSql + ") values (" + placeholders + ")", values.values().toArray());
    return values.containsKey("id") ? show(table, String.valueOf(values.get("id"))) : values;
  }

  public Map<String, Object> update(String table, String id, Map<String, Object> input) {
    if (!tableExists(table)) return Map.of("id", id, "data", input == null ? Map.of() : input);
    Map<String, String> columns = columnTypes(table);
    List<String> assignments = new ArrayList<>();
    List<Object> values = new ArrayList<>();
    if (input != null) {
      input.forEach((key, value) -> {
        if (columns.containsKey(key) && !"id".equals(key) && !"createdAt".equals(key)) {
          assignments.add("\"" + key + "\" = ?");
          values.add(coerce(value, columns.get(key)));
        }
      });
    }
    if (columns.containsKey("updatedAt")) {
      assignments.add("\"updatedAt\" = ?");
      values.add(OffsetDateTime.now());
    }
    if (assignments.isEmpty()) return show(table, id);
    values.add(id);
    jdbc.update("update \"" + table + "\" set " + String.join(", ", assignments) + " where \"id\" = ?", values.toArray());
    return show(table, id);
  }

  public void delete(String table, String id) {
    if (tableExists(table)) {
      jdbc.update("delete from \"" + table + "\" where \"id\" = ?", id);
    }
  }

  public Map<String, Object> stats(String table, Integer year) {
    if (!tableExists(table)) return Map.of("year", selectedYear(year), "total", 0);
    boolean hasYear = columnExists(table, "year");
    boolean hasStatus = columnExists(table, "statut");
    Map<String, Object> stats = new LinkedHashMap<>();
    stats.put("year", selectedYear(year));
    if (hasYear) {
      Long total = jdbc.queryForObject("select count(*) from \"" + table + "\" where \"year\" = ?", Long.class, selectedYear(year));
      stats.put("total", total == null ? 0 : total);
      if (hasStatus) {
        stats.put("parStatut", statusCounts(table, selectedYear(year)));
      }
      return stats;
    }
    Long total = jdbc.queryForObject("select count(*) from \"" + table + "\"", Long.class);
    stats.put("total", total == null ? 0 : total);
    if (hasStatus) {
      stats.put("parStatut", statusCounts(table, null));
    }
    return stats;
  }

  public List<Integer> years() {
    return jdbc.queryForList("""
      select distinct "year" from (
        select "year" from "Transaction"
        union select "year" from "BudgetLine"
        union select "year" from "EtatCivilRequest"
        union select "year" from "UrbanismeCase"
      ) years order by "year" desc
      """, Integer.class);
  }

  private boolean tableExists(String table) {
    Boolean exists = jdbc.queryForObject("""
      select exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = ?
      )
      """, Boolean.class, table);
    return Boolean.TRUE.equals(exists);
  }

  private boolean columnExists(String table, String column) {
    Boolean exists = jdbc.queryForObject("""
      select exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = ? and column_name = ?
      )
      """, Boolean.class, table, column);
    return Boolean.TRUE.equals(exists);
  }

  private Map<String, String> columnTypes(String table) {
    return jdbc.query("""
      select column_name, data_type
      from information_schema.columns
      where table_schema = 'public' and table_name = ?
      """, rs -> {
      Map<String, String> columns = new LinkedHashMap<>();
      while (rs.next()) {
        columns.put(rs.getString("column_name"), rs.getString("data_type"));
      }
      return columns;
    }, table);
  }

  private Map<String, Long> statusCounts(String table, Integer year) {
    String sql = "select \"statut\", count(*) as total from \"" + table + "\"";
    Object[] args = new Object[] {};
    if (year != null && columnExists(table, "year")) {
      sql += " where \"year\" = ?";
      args = new Object[] { year };
    }
    sql += " group by \"statut\"";
    return jdbc.query(sql, rs -> {
      Map<String, Long> counts = new LinkedHashMap<>();
      while (rs.next()) {
        counts.put(rs.getString("statut"), rs.getLong("total"));
      }
      return counts;
    }, args);
  }

  private int selectedYear(Integer year) {
    return year == null ? Year.now().getValue() : year;
  }

  private Map<String, Object> row(java.sql.ResultSet rs) throws java.sql.SQLException {
    ResultSetMetaData meta = rs.getMetaData();
    Map<String, Object> row = new LinkedHashMap<>();
    for (int i = 1; i <= meta.getColumnCount(); i++) {
      row.put(meta.getColumnLabel(i), normalize(rs.getObject(i)));
    }
    return row;
  }

  private Object normalize(Object value) {
    if (value instanceof java.sql.Timestamp timestamp) {
      return timestamp.toInstant().toString();
    }
    if (value instanceof java.sql.Date date) {
      return date.toLocalDate().toString();
    }
    if (value instanceof java.sql.Time time) {
      return time.toLocalTime().toString();
    }
    return value;
  }

  private Object coerce(Object value, String dataType) {
    if (value == null) return null;
    if (value instanceof Number || value instanceof Boolean) return value;
    String text = String.valueOf(value);
    if (text.isBlank()) return null;
    return switch (dataType) {
      case "integer" -> Integer.parseInt(text);
      case "bigint" -> Long.parseLong(text);
      case "double precision", "real", "numeric" -> Double.parseDouble(text);
      case "boolean" -> Boolean.parseBoolean(text);
      case "timestamp without time zone", "timestamp with time zone" -> parseDateTime(text);
      case "date" -> LocalDate.parse(text);
      default -> text;
    };
  }

  private OffsetDateTime parseDateTime(String value) {
    if (value.length() == 10) {
      return LocalDate.parse(value).atStartOfDay().atOffset(java.time.ZoneOffset.UTC);
    }
    return OffsetDateTime.parse(value);
  }
}
