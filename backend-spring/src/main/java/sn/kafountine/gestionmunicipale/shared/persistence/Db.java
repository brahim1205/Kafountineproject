package sn.kafountine.gestionmunicipale.shared.persistence;

import java.math.BigDecimal;
import java.sql.Array;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Accès SQL au schéma PostgreSQL créé par Prisma (colonnes en camelCase entre guillemets).
 * Les lignes sont rendues comme Prisma : dates en Instant (UTC), Decimal et numériques en nombre.
 * Dans une méthode @Transactional, les requêtes rejoignent la transaction en cours (comme db() côté Node).
 */
@Component
public class Db {
  private final NamedParameterJdbcTemplate jdbc;

  public Db(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public static final RowMapper<Map<String, Object>> ROW = Db::row;

  private static Map<String, Object> row(ResultSet rs, int rowNum) throws SQLException {
    ResultSetMetaData meta = rs.getMetaData();
    Map<String, Object> row = new LinkedHashMap<>();
    for (int i = 1; i <= meta.getColumnCount(); i++) {
      row.put(meta.getColumnLabel(i), normalize(rs.getObject(i)));
    }
    return row;
  }

  static Object normalize(Object value) throws SQLException {
    if (value instanceof Timestamp timestamp) return timestamp.toInstant();
    if (value instanceof java.sql.Date date) return date.toLocalDate().atStartOfDay(java.time.ZoneOffset.UTC).toInstant();
    if (value instanceof BigDecimal decimal) return decimal.doubleValue();
    if (value instanceof Float f) return f.doubleValue();
    if (value instanceof Array array) return List.of((Object[]) array.getArray());
    if (value != null && value.getClass().getName().equals("org.postgresql.util.PGobject")) return value.toString();
    return value;
  }

  public static MapSqlParameterSource params(Object... keyValues) {
    MapSqlParameterSource source = new MapSqlParameterSource();
    for (int i = 0; i + 1 < keyValues.length; i += 2) {
      Object value = keyValues[i + 1];
      if (value instanceof Instant instant) value = Timestamp.from(instant);
      source.addValue((String) keyValues[i], value);
    }
    return source;
  }

  public List<Map<String, Object>> list(String sql, MapSqlParameterSource params) {
    return jdbc.query(sql, params, ROW);
  }

  public List<Map<String, Object>> list(String sql) {
    return jdbc.query(sql, new MapSqlParameterSource(), ROW);
  }

  public Map<String, Object> one(String sql, MapSqlParameterSource params) {
    List<Map<String, Object>> rows = list(sql, params);
    return rows.isEmpty() ? null : rows.get(0);
  }

  public int update(String sql, MapSqlParameterSource params) {
    return jdbc.update(sql, params);
  }

  public long count(String sql, MapSqlParameterSource params) {
    Number value = jdbc.queryForObject(sql, params, Number.class);
    return value == null ? 0 : value.longValue();
  }

  public double sum(String sql, MapSqlParameterSource params) {
    Number value = jdbc.queryForObject(sql, params, Number.class);
    return value == null ? 0 : value.doubleValue();
  }

  public NamedParameterJdbcTemplate jdbc() {
    return jdbc;
  }

  public static String uuid() {
    return UUID.randomUUID().toString();
  }

  /** Valeur d'une ligne lue en chaîne (null conservé). */
  public static String str(Map<String, Object> row, String key) {
    Object value = row == null ? null : row.get(key);
    return value == null ? null : value.toString();
  }

  public static double num(Map<String, Object> row, String key) {
    Object value = row == null ? null : row.get(key);
    if (value instanceof Number number) return number.doubleValue();
    if (value == null) return 0;
    try {
      return Double.parseDouble(value.toString());
    } catch (NumberFormatException e) {
      return 0;
    }
  }

  public static Instant date(Map<String, Object> row, String key) {
    Object value = row == null ? null : row.get(key);
    return value instanceof Instant instant ? instant : null;
  }
}
