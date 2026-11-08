package sn.kafountine.gestionmunicipale;

import java.util.TimeZone;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import sn.kafountine.gestionmunicipale.shared.config.Env;

/**
 * Backend Spring Boot de Kafountine Gestion municipale : même API (routes, contrats JSON, règles métier)
 * que le backend Node/Express, sur la même base PostgreSQL et le même Redis.
 */
@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class, RedisAutoConfiguration.class, RedisRepositoriesAutoConfiguration.class})
public class KafountineSpringApplication {
  public static void main(String[] args) {
    // Les colonnes « timestamp » (sans fuseau) de Prisma sont en UTC : JDBC doit les lire en UTC.
    TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    Env.validate();
    // Documentation et compression pilotées par les mêmes variables que Node.
    System.setProperty("springdoc.api-docs.enabled", String.valueOf(Env.ENABLE_API_DOCS));
    System.setProperty("springdoc.swagger-ui.enabled", String.valueOf(Env.ENABLE_API_DOCS));
    System.setProperty("server.compression.enabled", String.valueOf(!"false".equals(System.getenv("COMPRESSION_ENABLED"))));
    System.setProperty("server.compression.mime-types", "application/json,text/csv,text/plain,text/html,text/css,application/javascript");
    SpringApplication.run(KafountineSpringApplication.class, args);
  }
}
