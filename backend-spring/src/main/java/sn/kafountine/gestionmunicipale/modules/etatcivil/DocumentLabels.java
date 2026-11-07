package sn.kafountine.gestionmunicipale.modules.etatcivil;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import sn.kafountine.gestionmunicipale.shared.text.Js;

/**
 * Libellés des documents d'état civil (documentLabels.ts) : l'identifiant du catalogue
 * (« etat-civil-deces-extrait-de-deces ») ou le nom brut (« Deces - Extrait de deces ») donnent « Extrait de décès ».
 */
public final class DocumentLabels {
  private DocumentLabels() {}

  private static final List<String[]> LABELS = List.of(
      new String[] {"Naissance - Bulletin de naissance", "Bulletin de naissance"},
      new String[] {"Naissance - Extrait de naissance", "Extrait de naissance"},
      new String[] {"Naissance - Copie litterale de naissance", "Copie littérale de naissance"},
      new String[] {"Deces - Extrait de deces", "Extrait de décès"},
      new String[] {"Deces - Copie litterale de deces", "Copie littérale de décès"},
      new String[] {"Deces - Permis d'inhumation", "Permis d'inhumation"},
      new String[] {"Mariage - Extrait de mariage", "Extrait de mariage"},
      new String[] {"Mariage - Celebration de mariage (general)", "Célébration de mariage"},
      new String[] {"Mariage - Celebration mariage couple senegalais", "Célébration de mariage (couple sénégalais)"},
      new String[] {"Mariage - Celebration mariage couple etranger", "Célébration de mariage (couple étranger)"},
      new String[] {"Mariage - Copie litterale de mariage", "Copie littérale de mariage"},
      new String[] {"Mariage - Certificat de non divorce", "Certificat de non-divorce"},
      new String[] {"Mariage - Certificat de divorce", "Certificat de divorce"},
      new String[] {"Divers - Certificat de vie comparant", "Certificat de vie (comparant)"},
      new String[] {"Divers - Certificat de vie collectif", "Certificat de vie collectif"},
      new String[] {"Divers - Certificat de vie et d'entretien", "Certificat de vie et d'entretien"},
      new String[] {"Divers - Certificat d'individualite", "Certificat d'individualité"},
      new String[] {"Divers - Certificat de celibat", "Certificat de célibat"},
      new String[] {"Divers - Certificat de residence", "Certificat de résidence"},
      new String[] {"Divers - Legalisation", "Légalisation"},
      new String[] {"Divers - Certificat de non inscription", "Certificat de non-inscription"},
      // Anciennes saisies libres.
      new String[] {"Legalisation de signature", "Légalisation de signature"},
      new String[] {"Certificat de vie", "Certificat de vie"},
      new String[] {"Acte de mariage", "Acte de mariage"});

  private static final Map<String, String> BY_KEY = new HashMap<>();
  private static final Pattern ID_PREFIX = Pattern.compile("^etat-civil-(naissance|deces|mariage|divers)-", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
  private static final Pattern NAME_PREFIX = Pattern.compile("^(naissance|deces|décès|mariage|divers)\\s*-\\s*",
      Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE | Pattern.UNICODE_CHARACTER_CLASS);

  static {
    for (String[] entry : LABELS) {
      for (String key : List.of(Js.slugify(entry[0]), "etat-civil-" + Js.slugify(entry[0]), Js.slugify(entry[1]))) BY_KEY.put(key, entry[1]);
    }
  }

  public static String label(String raw) {
    String value = raw == null ? "" : raw.strip();
    if (value.isEmpty()) return value;
    String label = BY_KEY.get(Js.slugify(value));
    if (label != null) return label;
    String withoutPrefix = NAME_PREFIX.matcher(ID_PREFIX.matcher(value).replaceFirst("")).replaceFirst("");
    String text = withoutPrefix.matches("^[a-z0-9-]+$") ? withoutPrefix.replace("-", " ") : withoutPrefix;
    return text.isEmpty() ? text : text.substring(0, 1).toUpperCase(java.util.Locale.ROOT) + text.substring(1);
  }
}
