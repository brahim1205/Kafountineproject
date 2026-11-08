package sn.kafountine.gestionmunicipale.shared.pdf;

import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** PDF texte minimal (Courier 9 pt, A4), octet pour octet comme shared/pdf/simplePdf.ts. */
public final class SimplePdf {
  private SimplePdf() {}

  public record Section(String title, List<String> lines) {}

  static String normalize(String value) {
    if (value == null || value.isEmpty()) return "";
    String text = value.replaceAll("[\\u202F\\u00A0]", " ");
    text = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("[\\u0300-\\u036f]", "");
    return text.replaceAll("[^\\x20-\\x7E]", " ").strip();
  }

  private static String hex(String value) {
    StringBuilder out = new StringBuilder();
    for (byte b : normalize(value).getBytes(StandardCharsets.US_ASCII)) out.append(String.format(Locale.ROOT, "%02X", b));
    return out.toString();
  }

  static List<String> wrap(String value) {
    int maxChars = 94;
    String sanitized = normalize(value).strip();
    if (sanitized.isEmpty()) return List.of("");
    List<String> lines = new ArrayList<>();
    String current = "";
    for (String word : sanitized.split("\\s+")) {
      String next = current.isEmpty() ? word : current + " " + word;
      if (next.length() <= maxChars) {
        current = next;
        continue;
      }
      if (!current.isEmpty()) lines.add(current);
      if (word.length() <= maxChars) {
        current = word;
        continue;
      }
      for (int index = 0; index < word.length(); index += maxChars) lines.add(word.substring(index, Math.min(word.length(), index + maxChars)));
      current = "";
    }
    if (!current.isEmpty()) lines.add(current);
    return lines;
  }

  public static byte[] build(String title, List<Section> sections) {
    List<String> documentLines = new ArrayList<>(List.of(title.toUpperCase(Locale.ROOT), ""));
    for (Section section : sections) {
      if (section.title() != null && !section.title().isEmpty()) documentLines.add(section.title().toUpperCase(Locale.ROOT));
      for (String line : section.lines()) documentLines.addAll(wrap(line));
      documentLines.add("");
    }
    List<List<String>> pages = new ArrayList<>();
    for (int index = 0; index < documentLines.size(); index += 48) pages.add(documentLines.subList(index, Math.min(documentLines.size(), index + 48)));
    if (pages.isEmpty()) pages.add(List.of(""));

    Map<Integer, String> objects = new LinkedHashMap<>();
    List<Integer> pageIds = new ArrayList<>();
    List<Integer> contentIds = new ArrayList<>();
    int nextId = 4;
    for (List<String> pageLines : pages) {
      int contentId = nextId++;
      int pageId = nextId++;
      List<String> commands = new ArrayList<>(List.of("BT", "/F1 9 Tf", "11 TL", "50 792 Td"));
      for (int index = 0; index < pageLines.size(); index++) {
        if (index > 0) commands.add("T*");
        commands.add("<" + hex(pageLines.get(index)) + "> Tj");
      }
      commands.add("ET");
      String stream = String.join("\n", commands);
      objects.put(contentId, "<< /Length " + stream.getBytes(StandardCharsets.UTF_8).length + " >>\nstream\n" + stream + "\nendstream");
      contentIds.add(contentId);
      pageIds.add(pageId);
    }
    objects.put(1, "<< /Type /Catalog /Pages 2 0 R >>");
    objects.put(2, "<< /Type /Pages /Count " + pageIds.size() + " /Kids [" + String.join(" ", pageIds.stream().map(id -> id + " 0 R").toList()) + "] >>");
    objects.put(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");
    for (int index = 0; index < pageIds.size(); index++) {
      objects.put(pageIds.get(index), "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents "
          + contentIds.get(index) + " 0 R >>");
    }
    int maxObjectId = objects.keySet().stream().mapToInt(Integer::intValue).max().orElse(3);
    StringBuilder pdf = new StringBuilder("%PDF-1.4\n");
    long[] offsets = new long[maxObjectId + 1];
    for (int id = 1; id <= maxObjectId; id++) {
      offsets[id] = pdf.toString().getBytes(StandardCharsets.UTF_8).length;
      pdf.append(id).append(" 0 obj\n").append(objects.get(id)).append("\nendobj\n");
    }
    long xrefOffset = pdf.toString().getBytes(StandardCharsets.UTF_8).length;
    pdf.append("xref\n0 ").append(maxObjectId + 1).append('\n');
    pdf.append("0000000000 65535 f \n");
    for (int id = 1; id <= maxObjectId; id++) pdf.append(String.format(Locale.ROOT, "%010d", offsets[id])).append(" 00000 n \n");
    pdf.append("trailer\n<< /Size ").append(maxObjectId + 1).append(" /Root 1 0 R >>\nstartxref\n").append(xrefOffset).append("\n%%EOF");
    return pdf.toString().getBytes(StandardCharsets.UTF_8);
  }
}
