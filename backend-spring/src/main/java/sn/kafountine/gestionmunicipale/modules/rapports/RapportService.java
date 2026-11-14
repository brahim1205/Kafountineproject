package sn.kafountine.gestionmunicipale.modules.rapports;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import org.springframework.stereotype.Service;
import sn.kafountine.gestionmunicipale.shared.audit.Actor;
import sn.kafountine.gestionmunicipale.shared.audit.AuditTrail;
import sn.kafountine.gestionmunicipale.shared.config.JacksonConfig;
import sn.kafountine.gestionmunicipale.shared.errors.AppException;
import sn.kafountine.gestionmunicipale.shared.http.Api;
import sn.kafountine.gestionmunicipale.shared.pdf.SimplePdf;
import sn.kafountine.gestionmunicipale.shared.persistence.Db;
import sn.kafountine.gestionmunicipale.shared.text.Js;

/** Reçus et rapport annuel en PDF, journal consolidé (RapportService et PrismaLedgerSource côté Node). */
@Service
public class RapportService {
  public record Entry(String id, Instant date, String person, String type, double amount, String description, String module) {}

  public record Pdf(String filename, byte[] content) {}

  private static final String[][] RECEIPT_FIELDS = {{"Agent collecteur", "agent"}, {"Telephone", "telephone"}, {"NIN", "nin"}, {"Adresse", "adresse"},
      {"Reference", "reference"}, {"Categorie", "categorie"}, {"Service", "service"}, {"Quantite", "quantite"}, {"Unite", "unite"},
      {"Tarif unitaire", "tarifUnitaire"}, {"Mode de paiement", "modePaiement"}, {"Statut", "statut"}, {"Localisation", "localisation"},
      {"Nature", "nature"}, {"Description", "description"}};
  private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.FRENCH).withZone(ZoneId.systemDefault());
  private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd/MM/yyyy").withZone(ZoneId.systemDefault());

  private final Db db;
  private final AuditTrail auditTrail;

  public RapportService(Db db, AuditTrail auditTrail) {
    this.db = db;
    this.auditTrail = auditTrail;
  }

  // --- Journal consolidé -------------------------------------------------------------------------

  private static String fullName(Map<String, Object> person) {
    if (person == null) return "";
    return (nz(person.get("prenom")) + " " + nz(person.get("nom"))).strip();
  }

  private static String nz(Object value) {
    return value == null ? "" : value.toString();
  }

  private static String orElse(Object value, String fallback) {
    return value == null || value.toString().isEmpty() ? fallback : value.toString();
  }

  /** -Number(montant) : une dépense nulle reste 0 (JSON.stringify(-0) vaut « 0 »). */
  private static double negative(double value) {
    return value == 0 ? 0 : -value;
  }

  private Map<String, Map<String, Object>> byId(String table, List<Map<String, Object>> rows, String key) {
    List<String> ids = rows.stream().map(r -> Db.str(r, key)).filter(id -> id != null).distinct().toList();
    Map<String, Map<String, Object>> result = new LinkedHashMap<>();
    if (ids.isEmpty()) return result;
    for (Map<String, Object> row : db.list("SELECT * FROM \"" + table + "\" WHERE \"id\" IN (:ids)", Db.params("ids", ids))) result.put(Db.str(row, "id"), row);
    return result;
  }

  private List<Map<String, Object>> rows(String table, int year) {
    return db.list("SELECT * FROM \"" + table + "\" WHERE \"year\" = :year ORDER BY \"createdAt\" ASC", Db.params("year", year));
  }

  public List<Entry> entriesForYear(int year) {
    List<Entry> entries = new ArrayList<>();
    List<Map<String, Object>> transactions = rows("Transaction", year);
    Map<String, Map<String, Object>> contribuables = byId("Contribuable", transactions, "contribuableId");
    for (Map<String, Object> t : transactions) {
      entries.add(new Entry(Db.str(t, "id"), Db.date(t, "date") != null ? Db.date(t, "date") : Db.date(t, "createdAt"),
          orElse(fullName(contribuables.get(Db.str(t, "contribuableId"))), "Inconnu"), "Recette (" + t.get("categorie") + ")", Db.num(t, "montant"),
          orElse(t.get("service"), "Paiement taxe"), "recettes"));
    }
    List<Map<String, Object>> etatCivil = rows("EtatCivilRequest", year);
    contribuables = byId("Contribuable", etatCivil, "contribuableId");
    for (Map<String, Object> e : etatCivil) {
      entries.add(new Entry(Db.str(e, "id"), Db.date(e, "createdAt"), orElse(fullName(contribuables.get(Db.str(e, "contribuableId"))), "Inconnu"),
          "Etat Civil", Db.num(e, "montant"), orElse(e.get("typeDocument"), "Document civil"), "etat-civil"));
    }
    List<Map<String, Object>> urbanisme = rows("UrbanismeCase", year);
    contribuables = byId("Contribuable", urbanisme, "contribuableId");
    for (Map<String, Object> u : urbanisme) {
      entries.add(new Entry(Db.str(u, "id"), Db.date(u, "createdAt"), orElse(fullName(contribuables.get(Db.str(u, "contribuableId"))), "Inconnu"),
          "Urbanisme", Db.num(u, "montant"), orElse(u.get("type"), "Permis"), "urbanisme"));
    }
    List<Map<String, Object>> market = rows("MarketPayment", year);
    Map<String, Map<String, Object>> places = byId("MarketPlace", market, "placeId");
    Map<String, Map<String, Object>> occupants = byId("Contribuable", new ArrayList<>(places.values()), "occupantId");
    for (Map<String, Object> m : market) {
      Map<String, Object> place = places.get(Db.str(m, "placeId"));
      Map<String, Object> occupant = place == null ? null : occupants.get(Db.str(place, "occupantId"));
      entries.add(new Entry(Db.str(m, "id"), Db.date(m, "datePaiement") != null ? Db.date(m, "datePaiement") : Db.date(m, "createdAt"),
          occupant != null ? fullName(occupant) : "Occupant inconnu", "Marché", Db.num(m, "montant"),
          "Place " + orElse(place == null ? null : place.get("numeroPlace"), "-"), "marche"));
    }
    List<Map<String, Object>> motos = rows("MotoPayment", year);
    Map<String, Map<String, Object>> registrations = byId("MotoRegistration", motos, "motoId");
    Map<String, Map<String, Object>> owners = byId("Contribuable", new ArrayList<>(registrations.values()), "proprietaireId");
    for (Map<String, Object> m : motos) {
      Map<String, Object> moto = registrations.get(Db.str(m, "motoId"));
      Map<String, Object> owner = moto == null ? null : owners.get(Db.str(moto, "proprietaireId"));
      entries.add(new Entry(Db.str(m, "id"), Db.date(m, "datePaiement") != null ? Db.date(m, "datePaiement") : Db.date(m, "createdAt"),
          owner != null ? fullName(owner) : "Propriétaire inconnu", "Motos", Db.num(m, "montant"),
          "Imm. " + orElse(moto == null ? null : moto.get("matricule"), "-"), "motos"));
    }
    for (Map<String, Object> b : rows("BudgetRequest", year)) {
      entries.add(new Entry(Db.str(b, "id"), Db.date(b, "createdAt"), orElse(b.get("service"), "Mairie"), "Dépense", negative(Db.num(b, "montant")),
          orElse(b.get("motif"), orElse(b.get("description"), "Dépense budget")), "budget"));
    }
    for (Map<String, Object> f : rows("TrainingProgram", year)) {
      entries.add(new Entry(Db.str(f, "id"), Db.date(f, "createdAt"), orElse(f.get("responsable"), "Mairie"), "Formation", negative(Db.num(f, "budget")),
          orElse(f.get("domaine"), "Prog. Formation"), "formations"));
    }
    for (Map<String, Object> j : rows("YouthProfile", year)) {
      entries.add(new Entry(Db.str(j, "id"), Db.date(j, "createdAt"), fullName(j), "Activité (Jeunesse)", 0, "Inscription jeune", "jeunesse"));
    }
    return entries;
  }

  public List<Map<String, Object>> reportData(int year) {
    List<Entry> entries = new ArrayList<>(entriesForYear(year));
    entries.sort(Comparator.comparing(Entry::date).reversed());
    List<Map<String, Object>> result = new ArrayList<>();
    for (Entry e : entries) {
      result.add(Api.map("id", e.id(), "date", JacksonConfig.iso(e.date()), "person", e.person(), "type", e.type(), "amount", e.amount(),
          "description", e.description(), "module", e.module()));
    }
    return result;
  }

  // --- PDF ---------------------------------------------------------------------------------------

  private static String display(Object value) {
    String text = value == null ? "" : value.toString().strip();
    return text.isEmpty() ? "-" : text;
  }

  /** ascii() de RapportService.ts : décomposition puis suppression de tout caractère hors ASCII imprimable. */
  private static String ascii(String value) {
    return java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD).replaceAll("[^\\x20-\\x7E]", "");
  }

  private static String pad(String value, int length) {
    String cut = value.length() > length ? value.substring(0, length) : value;
    return cut + " ".repeat(length - cut.length());
  }

  private static List<SimplePdf.Section> ledgerTable(List<Entry> entries) {
    if (entries.isEmpty()) {
      return List.of(new SimplePdf.Section("--- JOURNAL DETAILLE DES OPERATIONS ---", List.of("Aucune operation enregistree pour cette annee.")));
    }
    Map<String, List<Entry>> byMonth = new LinkedHashMap<>();
    for (Entry entry : entries) {
      String month = MONTH.format(entry.date());
      month = month.isEmpty() ? month : month.substring(0, 1).toUpperCase(Locale.ROOT) + month.substring(1);
      byMonth.computeIfAbsent(month, k -> new ArrayList<>()).add(entry);
    }
    String header = "DATE       | OPERATION            | ACTEUR          | MONTANT       | DESCRIPTION";
    String separator = "------------------------------------------------------------------------------------------";
    List<SimplePdf.Section> sections = new ArrayList<>();
    sections.add(new SimplePdf.Section("--- JOURNAL DETAILLE DES OPERATIONS ---", List.of()));
    for (var entry : byMonth.entrySet()) {
      List<String> lines = new ArrayList<>(List.of(header, separator));
      for (Entry item : entry.getValue()) {
        String amount = item.amount() == 0 ? "-" : (item.amount() > 0 ? "+" : "") + Js.localeFr(item.amount());
        lines.add(DAY.format(item.date()) + " | " + pad(ascii(nz(item.type())), 20) + " | " + pad(ascii(nz(item.person())), 15) + " | "
            + pad(amount, 13) + " | " + pad(ascii(nz(item.description())), 20));
      }
      sections.add(new SimplePdf.Section(entry.getKey(), lines));
    }
    return sections;
  }

  public Pdf receipt(Actor actor, Map<String, Object> input) {
    String ticketNumber = nz(input.get("ticketNumber")).strip();
    String contributor = nz(input.get("contributor")).strip();
    String type = nz(input.get("type")).strip();
    double amount = input.get("amount") instanceof Number n ? n.doubleValue() : 0;
    if (ticketNumber.isEmpty() || contributor.isEmpty() || type.isEmpty() || !Double.isFinite(amount) || amount <= 0) {
      throw AppException.validation("Les informations du reçu sont incomplètes.");
    }
    List<String> lines = new ArrayList<>(List.of("Commune de Kafountine", "Region de Ziguinchor - Departement de Bignona", "",
        "Numero de recu: " + ticketNumber, "Date: " + display(input.get("date")), "Heure: " + display(input.get("time")),
        "Contribuable: " + contributor, "Type de paiement: " + type, "Montant: " + Js.localeFr(amount) + " FCFA"));
    for (String[] field : RECEIPT_FIELDS) lines.add(field[0] + ": " + display(input.get(field[1])));
    byte[] pdf = SimplePdf.build("Recu " + ticketNumber, List.of(new SimplePdf.Section(null, lines)));
    auditTrail.record(actor, "Export PDF reçu", "recettes", "Export du reçu " + ticketNumber);
    return new Pdf("recu-" + ticketNumber + ".pdf", pdf);
  }

  public record ReportInput(int year, double total, double tauxRecouvrement, double totalTransactions, double totalContribuables,
      List<Map<String, Object>> modules, List<Map<String, Object>> topContribuables) {}

  private static double number(Object value) {
    return value instanceof Number n ? n.doubleValue() : 0;
  }

  public Pdf report(Actor actor, ReportInput input) {
    int year = input.year();
    if (year < 2000 || year > 2100) throw AppException.validation("Année de rapport invalide.");
    List<Entry> entries = new ArrayList<>(entriesForYear(year));
    entries.sort(Comparator.comparing(Entry::date));
    Function<Map<String, Object>, String> module = item -> orElse(item.get("name"), "Module") + ": " + Js.localeFr(number(item.get("amount")))
        + " FCFA | Evolution: " + Js.num(number(item.get("evolution"))) + "%";
    List<String> modules = input.modules().isEmpty() ? List.of("Aucune donnée module disponible.") : input.modules().stream().map(module).toList();
    List<String> top = new ArrayList<>();
    for (int i = 0; i < input.topContribuables().size(); i++) {
      Map<String, Object> item = input.topContribuables().get(i);
      top.add("#" + (i + 1) + " " + orElse(item.get("name"), "-") + ": " + Js.localeFr(number(item.get("amount"))) + " FCFA");
    }
    if (top.isEmpty()) top.add("Aucun contribuable à afficher.");
    List<SimplePdf.Section> sections = new ArrayList<>();
    sections.add(new SimplePdf.Section("Synthese", List.of("Total annuel: " + Js.localeFr(input.total()) + " FCFA",
        "Taux de recouvrement: " + Js.num(input.tauxRecouvrement()) + "%", "Transactions: " + Js.localeFr(input.totalTransactions()),
        "Contribuables: " + Js.localeFr(input.totalContribuables()))));
    sections.add(new SimplePdf.Section("Repartition par module", modules));
    sections.add(new SimplePdf.Section("Top contribuables", top));
    sections.addAll(ledgerTable(entries));
    byte[] pdf = SimplePdf.build("Rapport annuel " + year, sections);
    auditTrail.record(actor, "Export PDF rapport", "rapports", "Export du rapport annuel " + year + " avec journal detaille");
    return new Pdf("rapport-annuel-" + year + ".pdf", pdf);
  }
}
