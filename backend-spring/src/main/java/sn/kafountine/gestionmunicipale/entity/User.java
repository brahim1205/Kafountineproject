package sn.kafountine.gestionmunicipale.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "\"User\"")
public class User {
  @Id
  private String id;
  private String email;
  private String password;
  private String nom;
  private String prenom;
  private String role;
  private String telephone;
  @Column(name = "\"isActive\"")
  private Boolean active;
  @Column(name = "\"lastLogin\"")
  private OffsetDateTime lastLogin;
  @Column(name = "\"createdAt\"")
  private OffsetDateTime createdAt;
  @Column(name = "\"updatedAt\"")
  private OffsetDateTime updatedAt;

  public String getId() { return id; }
  public void setId(String id) { this.id = id; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
  public String getPassword() { return password; }
  public void setPassword(String password) { this.password = password; }
  public String getNom() { return nom; }
  public void setNom(String nom) { this.nom = nom; }
  public String getPrenom() { return prenom; }
  public void setPrenom(String prenom) { this.prenom = prenom; }
  public String getRole() { return role; }
  public void setRole(String role) { this.role = role; }
  public String getTelephone() { return telephone; }
  public void setTelephone(String telephone) { this.telephone = telephone; }
  public Boolean getActive() { return active; }
  public void setActive(Boolean active) { this.active = active; }
  public OffsetDateTime getLastLogin() { return lastLogin; }
  public OffsetDateTime getCreatedAt() { return createdAt; }
  public OffsetDateTime getUpdatedAt() { return updatedAt; }
  public void setLastLogin(OffsetDateTime lastLogin) { this.lastLogin = lastLogin; }
  public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
  public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
