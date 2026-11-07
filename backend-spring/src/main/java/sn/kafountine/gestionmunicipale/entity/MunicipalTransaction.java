package sn.kafountine.gestionmunicipale.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "\"Transaction\"")
public class MunicipalTransaction {
  @Id
  private String id;
  private String numero;
  @Column(name = "\"contribuableId\"")
  private String contribuableId;
  @Column(name = "\"agentId\"")
  private String agentId;
  private String categorie;
  private String service;
  private Integer quantite;
  @Column(name = "\"tarifUnitaire\"")
  private Double tarifUnitaire;
  private Double montant;
  @Column(name = "\"modePaiement\"")
  private String modePaiement;
  private String statut;
  private OffsetDateTime date;
  private Integer year;
  @Column(name = "\"createdAt\"")
  private OffsetDateTime createdAt;
  @Column(name = "\"updatedAt\"")
  private OffsetDateTime updatedAt;

  @PrePersist
  void onCreate() {
    if (id == null) id = UUID.randomUUID().toString();
    if (numero == null) numero = "TX-" + System.currentTimeMillis();
    if (quantite == null) quantite = 1;
    if (modePaiement == null) modePaiement = "ESPECE";
    if (statut == null) statut = "PAYE";
    if (date == null) date = OffsetDateTime.now();
    if (year == null) year = date.getYear();
    createdAt = OffsetDateTime.now();
    updatedAt = createdAt;
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = OffsetDateTime.now();
  }

  public String getId() { return id; }
  public String getNumero() { return numero; }
  public String getContribuableId() { return contribuableId; }
  public void setContribuableId(String contribuableId) { this.contribuableId = contribuableId; }
  public String getAgentId() { return agentId; }
  public void setAgentId(String agentId) { this.agentId = agentId; }
  public String getCategorie() { return categorie; }
  public void setCategorie(String categorie) { this.categorie = categorie; }
  public String getService() { return service; }
  public void setService(String service) { this.service = service; }
  public Integer getQuantite() { return quantite; }
  public void setQuantite(Integer quantite) { this.quantite = quantite; }
  public Double getTarifUnitaire() { return tarifUnitaire; }
  public void setTarifUnitaire(Double tarifUnitaire) { this.tarifUnitaire = tarifUnitaire; }
  public Double getMontant() { return montant; }
  public void setMontant(Double montant) { this.montant = montant; }
  public String getModePaiement() { return modePaiement; }
  public void setModePaiement(String modePaiement) { this.modePaiement = modePaiement; }
  public String getStatut() { return statut; }
  public void setStatut(String statut) { this.statut = statut; }
  public OffsetDateTime getDate() { return date; }
  public void setDate(OffsetDateTime date) { this.date = date; }
  public Integer getYear() { return year; }
  public void setYear(Integer year) { this.year = year; }
}
