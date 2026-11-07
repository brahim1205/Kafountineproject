package sn.kafountine.gestionmunicipale.shared.config;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.module.SimpleModule;
import java.io.IOException;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Sérialisation JSON identique au backend Node : dates en ISO 8601 UTC avec millisecondes
 * (« 2026-11-04T10:00:00.000Z », comme Date.toJSON) et nombres sans « .0 » superflu (comme JavaScript).
 */
@Configuration
public class JacksonConfig {
  public static final DateTimeFormatter ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC);

  public static String iso(Instant instant) {
    return instant == null ? null : ISO.format(instant);
  }

  @Bean
  public Jackson2ObjectMapperBuilderCustomizer kafountineJackson() {
    SimpleModule module = new SimpleModule();
    module.addSerializer(Instant.class, new JsonSerializer<>() {
      @Override
      public void serialize(Instant value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        gen.writeString(ISO.format(value));
      }
    });
    module.addSerializer(Timestamp.class, new JsonSerializer<>() {
      @Override
      public void serialize(Timestamp value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        gen.writeString(ISO.format(value.toInstant()));
      }
    });
    module.addSerializer(Date.class, new JsonSerializer<>() {
      @Override
      public void serialize(Date value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        gen.writeString(ISO.format(value.toInstant()));
      }
    });
    module.addSerializer(Double.class, new JsonSerializer<>() {
      @Override
      public void serialize(Double value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        writeNumber(gen, value);
      }
    });
    module.addSerializer(BigDecimal.class, new JsonSerializer<>() {
      @Override
      public void serialize(BigDecimal value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        writeNumber(gen, value.doubleValue());
      }
    });
    return builder -> builder.modulesToInstall(module);
  }

  private static void writeNumber(JsonGenerator gen, double value) throws IOException {
    if (Double.isNaN(value) || Double.isInfinite(value)) {
      gen.writeNull();
    } else if (value == Math.rint(value) && Math.abs(value) < 1e15) {
      gen.writeNumber((long) value);
    } else {
      gen.writeNumber(value);
    }
  }
}
