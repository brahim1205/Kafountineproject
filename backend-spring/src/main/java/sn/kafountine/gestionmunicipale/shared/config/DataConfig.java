package sn.kafountine.gestionmunicipale.shared.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import javax.sql.DataSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;

/** Connexion PostgreSQL à partir de DATABASE_URL (format Prisma : postgresql://user:pass@host:port/db?schema=public). */
@Configuration
@EnableTransactionManagement
public class DataConfig {

  @Bean
  public DataSource dataSource() {
    URI uri = URI.create(Env.DATABASE_URL.replaceFirst("^postgres(ql)?://", "http://"));
    String[] userInfo = uri.getRawUserInfo() == null ? new String[0] : uri.getRawUserInfo().split(":", 2);
    String database = uri.getPath() == null ? "" : uri.getPath().replaceFirst("^/", "");
    String schema = "public";
    StringBuilder extra = new StringBuilder();
    int poolSize = Math.max(2, Env.DB_POOL_SIZE);
    long poolTimeoutMs = 10_000;
    if (uri.getRawQuery() != null) {
      for (String pair : uri.getRawQuery().split("&")) {
        String[] kv = pair.split("=", 2);
        String key = decode(kv[0]);
        String value = kv.length > 1 ? decode(kv[1]) : "";
        if (key.equals("schema")) schema = value;
        else if (key.equals("connection_limit")) poolSize = Math.max(2, Integer.parseInt(value));
        else if (key.equals("pool_timeout")) poolTimeoutMs = Math.max(250, Long.parseLong(value) * 1000);
        else if (key.equals("sslmode")) extra.append("&sslmode=").append(value);
      }
    }
    HikariConfig config = new HikariConfig();
    config.setJdbcUrl("jdbc:postgresql://" + uri.getHost() + ":" + (uri.getPort() > 0 ? uri.getPort() : 5432) + "/" + database
        + "?currentSchema=" + schema + "&stringtype=unspecified" + extra);
    if (userInfo.length > 0) config.setUsername(decode(userInfo[0]));
    if (userInfo.length > 1) config.setPassword(decode(userInfo[1]));
    config.setMaximumPoolSize(poolSize);
    config.setConnectionTimeout(poolTimeoutMs);
    config.setPoolName("kafountine");
    return new HikariDataSource(config);
  }

  private static String decode(String value) {
    return URLDecoder.decode(value, StandardCharsets.UTF_8);
  }

  @Bean
  public NamedParameterJdbcTemplate jdbc(DataSource dataSource) {
    return new NamedParameterJdbcTemplate(dataSource);
  }

  @Bean
  public PlatformTransactionManager transactionManager(DataSource dataSource) {
    return new DataSourceTransactionManager(dataSource);
  }

  /**
   * Limites des transactions : 20 s d'exécution (comme Node : aux heures d'affluence, les tickets d'une même
   * série attendent le verrou de leur compteur).
   */
  @Bean
  public TransactionTemplate transactionTemplate(PlatformTransactionManager transactionManager) {
    TransactionTemplate template = new TransactionTemplate(transactionManager);
    template.setTimeout(20);
    return template;
  }
}
