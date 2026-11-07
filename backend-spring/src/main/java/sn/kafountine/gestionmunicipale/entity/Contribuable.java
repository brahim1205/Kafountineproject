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
@Table(name = "\"Contribuable\"")
public class Contribuable {
  @Id
  private String id;
  private String nin;
  private String nom;
  private String prenom;
  @Column(name = "\"dateNaiss\"")
  private OffsetDateTime dateNaiss;
  @Column(name = "\"lieuNaiss\"")
  private String lieuNaiss;
  private String adresse;
  private String telephone;
  private String email;
  private String profession;
  @Column(name = "\"typeContribuable\"")
  private String typeContribuable;
  private String zone;
  @Column(name = "\"montantImpot\"")
  private Double montantImpot;
  @Column(name = "\"isActive\"")
  private Boolean active;
  @Column(name = "\"createdAt\"")
  private OffsetDateTime createdAt;
  @Column(name = "\"updatedAt\"")
  private OffsetDateTime updatedAt;

  @PrePersist
  void onCreate() {
    if (id == null) id = UUID.randomUUID().toString();
    if (typeContribuable == null) typeContribuable = "PARTICULIER";
    if (montantImpot == null) montantImpot = 0d;
    if (active == null) active = true;
    createdAt = OffsetDateTime.now();
    updatedAt = createdAt;
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = OffsetDateTime.now();
  }

  public String getId() { return id; }
  public String getNin() { return nin; }
  public void setNin(String nin) { this.nin = nin; }
  public String getNom() { return nom; }
  public void setNom(String nom) { this.nom = nom; }
  public String getPrenom() { return prenom; }
  public void setPrenom(String prenom) { this.prenom = prenom; }
  public OffsetDateTime getDateNaiss() { return dateNaiss; }
  public void setDateNaiss(OffsetDateTime dateNaiss) { this.dateNaiss = dateNaiss; }
  public String getLieuNaiss() { return lieuNaiss; }
  public void setLieuNaiss(String lieuNaiss) { this.lieuNaiss = lieuNaiss; }
  public String getAdresse() { return adresse; }
  public void setAdresse(String adresse) { this.adresse = adresse; }
  public String getTelephone() { return telephone; }
  public void setTelephone(String telephone) { this.telephone = telephone; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
  public String getProfession() { return profession; }
  public void setProfession(String profession) { this.profession = profession; }
  public String getTypeContribuable() { return typeContribuable; }
  public void setTypeContribuable(String typeContribuable) { this.typeContribuable = typeContribuable; }
  public String getZone() { return zone; }
  public void setZone(String zone) { this.zone = zone; }
  public Double getMontantImpot() { return montantImpot; }
  public void setMontantImpot(Double montantImpot) { this.montantImpot = montantImpot; }
  public Boolean getActive() { return active; }
  public void setActive(Boolean active) { this.active = active; }
}
