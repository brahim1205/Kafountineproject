package sn.kafountine.gestionmunicipale.modules.medias;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;
import sn.kafountine.gestionmunicipale.shared.config.Env;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.security.Authenticated;
import sn.kafountine.gestionmunicipale.shared.security.Roles;
import sn.kafountine.gestionmunicipale.shared.validation.Input;

/** Images : envoi, suppression et lecture de /uploads (medias.routes.ts, ImageService et express.static côté Node). */
@RestController
public class MediasController {
  private static final List<String> ALLOWED = List.of("image/jpeg", "image/png", "image/webp");
  private final Path directory = Paths.get("uploads").toAbsolutePath().normalize();

  private static AppException internal() {
    return new AppException(500, "Erreur interne du serveur");
  }

  private static boolean validSignature(byte[] b, String mimetype) {
    return switch (mimetype) {
      case "image/jpeg" -> b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF;
      case "image/png" -> b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47 && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A;
      case "image/webp" -> b.length >= 12 && new String(b, 0, 4, StandardCharsets.US_ASCII).equals("RIFF") && new String(b, 8, 4, StandardCharsets.US_ASCII).equals("WEBP");
      default -> false;
    };
  }

  /** multer.single('image') : un autre champ, un second fichier ou un fichier trop gros échouent en 500 ; un type refusé en 400. */
  private static MultipartFile singleImage(HttpServletRequest request) {
    if (!(request instanceof MultipartHttpServletRequest multipart)) return null;
    MultipartFile found = null;
    for (var entry : multipart.getMultiFileMap().entrySet()) {
      for (MultipartFile file : entry.getValue()) {
        if (!entry.getKey().equals("image") || found != null) throw internal();
        if (!ALLOWED.contains(String.valueOf(file.getContentType()))) throw AppException.validation("Type de fichier non autorisé. Utilisez JPG, PNG ou WEBP.");
        if (file.getSize() > Env.MAX_UPLOAD_FILE_SIZE_BYTES) throw internal();
        found = file;
      }
    }
    return found;
  }

  @PostMapping("/api/v1/upload/image")
  @Authenticated
  public ResponseEntity<Map<String, Object>> upload(HttpServletRequest request) throws IOException {
    MultipartFile file = singleImage(request);
    if (file == null) throw AppException.validation("Aucun fichier image fourni.");
    byte[] content = file.getBytes();
    String mimetype = file.getContentType();
    if (!validSignature(content, mimetype)) throw AppException.validation("Le contenu du fichier ne correspond pas à une image autorisée.");
    String extension = mimetype.equals("image/png") ? "png" : mimetype.equals("image/webp") ? "webp" : "jpg";
    String publicId = "upload-" + UUID.randomUUID();
    String filename = publicId + "." + extension;
    Files.createDirectories(directory);
    Files.write(directory.resolve(filename), content);
    return Api.created(Api.map("publicId", publicId, "url", "/uploads/" + filename, "format", extension, "width", 0, "height", 0));
  }

  @DeleteMapping("/api/v1/upload/image/{publicId}")
  @Roles({"ADMIN", "SUPER_ADMIN", "AGENT"})
  public ResponseEntity<Map<String, Object>> delete(@PathVariable String publicId) throws IOException {
    Input params = Input.params(Map.of("publicId", publicId));
    String id = params.str("publicId").trimmed(1, 120, "Identifiant image invalide").required();
    params.check();
    List<Path> entries = new ArrayList<>();
    if (Files.isDirectory(directory)) {
      try (Stream<Path> stream = Files.list(directory)) {
        stream.forEach(entries::add);
      }
    }
    Path match = entries.stream().filter(p -> p.getFileName().toString().startsWith(id + ".")).findFirst()
        .orElseThrow(() -> AppException.notFound("Image introuvable."));
    Files.delete(match);
    return Api.message("Image supprimée");
  }

  /** express.static(fallthrough: false) : toute erreur (absent, méthode, chemin refusé) finit en 500 dans errorHandler. */
  @RequestMapping("/uploads/**")
  public ResponseEntity<Resource> serve(HttpServletRequest request) throws IOException {
    if (!request.getMethod().equals("GET") && !request.getMethod().equals("HEAD")) throw internal();
    String relative = java.net.URLDecoder.decode(request.getRequestURI().substring("/uploads/".length()).replace("+", "%2B"), StandardCharsets.UTF_8);
    Path file = directory.resolve(relative).normalize();
    if (!file.startsWith(directory) || !Files.isRegularFile(file)) throw internal();
    String name = file.getFileName().toString().toLowerCase(java.util.Locale.ROOT);
    String type = name.endsWith(".png") ? "image/png" : name.endsWith(".webp") ? "image/webp" : name.endsWith(".jpg") || name.endsWith(".jpeg") ? "image/jpeg"
        : Files.probeContentType(file) != null ? Files.probeContentType(file) : "application/octet-stream";
    long modified = Files.getLastModifiedTime(file).toMillis();
    return ResponseEntity.ok()
        .header("Content-Type", type)
        .header("Cache-Control", "private, max-age=86400, immutable")
        .eTag("W/\"" + Long.toHexString(Files.size(file)) + "-" + Long.toHexString(modified) + "\"")
        .lastModified(modified)
        .body(new FileSystemResource(file));
  }
}
