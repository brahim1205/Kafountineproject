# Rapport d'audit : Kafountine Gestion Municipale

Audit réalisé le 9 novembre 2026 sur la branche `audit/securite`, uniquement sur un environnement local avec des données fictives. Aucun test n'a visé la production.

Ce rapport ne déclare pas le projet « sécurisé » ni « sans bug ». Il indique ce qui a été vérifié, ce qui ne l'a pas été et le risque restant.

## 1. Résumé

| | Avant | Après |
|---|---|---|
| Score de risque (estimation de l'auditeur) | **7/10, élevé** | **4/10, modéré** |

**Avant :** un administrateur en consultation pouvait télécharger toute la base, empreintes de mots de passe et état civil compris. Un compte pouvait lire et modifier les notifications d'un autre. Une session restait valable après un changement de mot de passe, et le socle Spring Boot était obsolète, avec des failles critiques publiées sur Tomcat.

**Après :** ces points sont corrigés et couverts par des tests. Le score reste modéré car le backend n'a aucun test unitaire Java, plusieurs rôles lisent encore largement les données, deux alertes élevées subsistent sur `spring-webmvc`, et la recette réelle n'a pas eu lieu.

**Stack :** Angular 22, Spring Boot 3.5 (Java 17) avec JDBC, PostgreSQL, Redis, migrations Prisma, Docker, Nginx, Traefik, GitHub Actions. 7 rôles, 107 routes. Données sensibles : identité (NIN, téléphone), état civil, encaissements, comptes.

## 2. Constats corrigés

Chaque test de régression a été exécuté en échec sur l'ancien code, puis en réussite après le correctif, sauf DET-01, DET-02 et les mises à jour de dépendances, vérifiés par la suite complète.

| ID | Sévérité | Emplacement | Problème et preuve | Correctif | Test | Commit |
|---|---|---|---|---|---|---|
| SEC-09 | Élevée | `ParametresController` | L'admin téléchargeait la sauvegarde complète : colonne `password` présente, 10 demandes d'état civil | Sauvegardes réservées au super administrateur | `sec-09` | `8fe8174` |
| SEC-08 | Élevée | `AuthService`, `AccessInterceptor` | Refresh accepté après changement de mot de passe (200), jeton valable après désactivation et déconnexion (200) | Révocation par génération de jetons, liste de sessions déconnectées | `sec-08` | `4dd4e68` |
| SEC-01 | Élevée | `NotificationService` | PATCH sur la notification d'un autre : 200 ; liste non filtrée par destinataire | Filtre sur le destinataire | `sec-01` | `692b8a7` |
| SEC-02 | Élevée | `IdempotencyFilter` | Connexion rejouée avec un mauvais mot de passe : 200, avec les données du compte. Le filtre s'exécute avant le contrôle d'accès | Clé liée au compte, routes d'authentification exclues | `sec-02` | `dea10a5` |
| SEC-06, 07, 10 | Élevée | `pom.xml` | OSV : Tomcat 10.1.34 avec failles notées jusqu'à 9.8, Netty, PostgreSQL, Jackson | Spring Boot 3.5.16 et bibliothèques corrigées | Suite API | `2f75994`, `4edfa55`, `e616a9d` |
| SEC-09 | Moyenne | `TransactionService` | Le régisseur listait les tickets d'état civil, contrairement à la règle métier | Cloisonnement par rôle | `sec-09` | `8fe8174` |
| SEC-09 | Moyenne | `MotosController`, `MarcheController` | Paiement moto accepté sur 2019 : 201, contrôle uniquement dans l'interface | Refus côté serveur des années closes | `sec-09` | `8fe8174` |
| SEC-03 | Moyenne | `AuthService.login` | 127 ms pour un compte existant, 8 ms pour un inconnu | Vérification bcrypt dans les deux cas | `sec-03` | `d9470eb` |
| BUG-01 | Moyenne | Fenêtres paramètres et utilisateurs | Bouton Fermer inopérant après un renommage | Sortie renommée | `modal-close.spec` | `25de920` |
| UX-01 | Moyenne | Templates Angular | axe : boutons, listes et champs sans nom accessible | 27 boutons et 82 champs nommés | `a11y-names.spec` | `1fff681` |
| UX-02 | Moyenne | `tailwind.config.js` | axe : 437 défauts de contraste sur 10 pages, 11 après | Teintes assombries, changement visuel léger | axe, contrôle ponctuel | `998d649` |
| SEC-04 | Faible | `WebFilters` | `x-request-id` de 4 000 caractères renvoyé tel quel | Format borné | `sec-04` | `eb924ba` |
| SEC-05 | Faible | `MediasController` | Image trop grande : erreur 500 | Réponse 413 | `sec-05` | `9443b1f` |
| SEC-09 | Faible | `AuditController`, `ParametresController` | Route `/audit/seed` créant de fausses entrées, route publique sans usage | Routes retirées | `sec-09` | `8fe8174` |
| DET-01 | Faible | `front-angular` | Pas de lint, code mort, bibliothèque de couverture absente | ESLint, couverture, code mort retiré | `npm run lint` | `0a49849` |
| DET-02 | Faible | CI, hooks | Lint, couverture et audit absents de la CI Angular | CI complétée, hook `make hooks` | CI | `6e6ac6e` |

## 3. Constats restants

| ID | Sévérité | Emplacement | Problème et preuve | Risque | Correctif proposé | Effort |
|---|---|---|---|---|---|---|
| RES-01 | Moyenne | `/transactions`, `/contribuables`, `/motos`, `/urbanisme`, `/marche/paiements` | Tout compte connecté lit ces listes, par exemple `quai_peche` (200) | Exposition interne de données personnelles | Matrice de droits à décider avec le client | M |
| RES-02 | Moyenne | Dépendances | OSV : 2 alertes élevées sur `spring-webmvc` 6.2.19, dernière version 6.2 publiée | À évaluer selon les usages | Suivre les correctifs, viser Spring 7 à terme | M |
| RES-03 | Moyenne | `backend-spring/src/test` | Aucun test unitaire Java ; seuls 71 tests d'API couvrent le backend | Régressions sur les cas non couverts | Tests unitaires des services critiques | L |
| RES-04 | Moyenne | Paiements motos | 6 paiements simultanés sans clé d'idempotence : 6 acceptés, sur des mois successifs. L'interface envoie une clé | Doublon par un client hors interface | Verrou par moto si le client le souhaite | S |
| RES-05 | Moyenne | Comptes de production | Comptes de démonstration et mots de passe à remplacer | Accès non autorisé | Avant livraison | S |
| RES-06 | Faible | Révocation | Si Redis est indisponible, la révocation est suspendue | Fenêtre d'accès limitée | Alerte Redis | S |
| RES-07 | Faible | Images | Fichier PNG contenant du texte accepté, servi en `image/png` avec `nosniff` ; tout agent peut supprimer une image | Limité | Réencoder les images, lier l'image à son auteur | M |
| RES-08 | Faible | Workflows | Actions GitHub référencées par tag ; `secrets: inherit` | Chaîne d'approvisionnement | Épingler par SHA | S |
| RES-09 | Faible | `infra/k8s`, Helm | Trivy : système de fichiers inscriptible, contexte de sécurité par défaut. Non utilisé par le déploiement Docker actuel | Si Kubernetes est adopté | Durcir les manifestes | M |
| RES-10 | Faible | Accessibilité | 11 défauts de contraste restants, rapport débordant de 5 px à 360 px, cibles tactiles denses dans Paramètres | Confort | Passe dédiée | S |
| RES-11 | À vérifier | Historique Git | Gitleaks : 2 alertes sur un fichier de test supprimé (`backend/test`), valeur de test fictive d'après son contexte | Faible | Confirmer, révoquer si elle a servi ailleurs | S |

## 4. Résultats des commandes

Exécution finale sur une base locale vide, migrée et chargée avec les données de démonstration.

| Commande | Résultat |
|---|---|
| Build Angular (`ng build`) | Réussi, 489,61 kB (106,37 kB compressés), aucun avertissement |
| Lint (`eslint src`) | 0 erreur |
| Types (`ngc`, templates stricts) | 0 erreur |
| Tests unitaires Angular | 2/2 |
| Couverture Angular | 100 % des lignes, mais **sur le seul fichier chargé par les tests** : ce chiffre n'est pas représentatif |
| Tests API (Jest) | 71/71, 8 suites |
| Tests e2e Playwright | 24/24 |
| Build backend (`mvn package`) | Réussi |
| Tests unitaires Java | Aucun |
| `npm audit` (Angular, base) | 0 vulnérabilité |
| OSV-Scanner (backend) | Après correctifs : 4 groupes d'alertes, dont 2 élevés sur `spring-webmvc` |
| Gitleaks (historique) | 2 alertes, voir RES-11 |
| Semgrep | 51 résultats, surtout des tags d'actions GitHub ; 8 règles en erreur d'analyse |
| Trivy config | Alertes sur Kubernetes et les Dockerfile de développement, voir RES-09 |
| Scan interne du dépôt | Réussi |
| Comparaison avec l'interface React | 65/66 pages (écart : heure affichée), 89/89 fenêtres, 107/107 actions, avant les dernières corrections de droits et de teintes |

## 5. Zones non testées et limites

- **Production :** aucun test n'y a été fait. Sa configuration réelle (limites de débit, CORS, secrets) n'a pas été examinée.
- **OWASP ZAP** n'a pas été exécuté : les tests d'attaque sont manuels et ciblés.
- **Image Docker Angular :** non construite localement, Docker étant arrêté. Sa construction a lieu dans la CI.
- **Limite de connexion :** le banc local utilise une limite élevée, le blocage à 5 tentatives a été vérifié à la lecture du code seulement.
- **Non couverts :** navigateurs autres que Chromium, restauration d'une sauvegarde depuis l'interface, déchiffrement des sauvegardes, charge après ces correctifs, fuseaux horaires, longs parcours en coupure réseau.
- **Module Formations :** désactivé dans le menu, peu testé.
- **Application mobile et IA :** absentes du projet.

## 6. Prévention

**En place :** CI Angular (lint, build, tests, couverture, audit), suite API dans la CI Spring, scan de secrets, hook pre-commit (`make hooks`), journaux JSON avec identifiant de requête, sauvegarde avant chaque déploiement, workflow de retour arrière.

**Checklist de revue :** route protégée par `@Roles` ou `@Authenticated` ; requêtes paramétrées ; accès filtré par propriétaire si la ressource est personnelle ; test de non-régression ; aucun `any` ; aucun secret ; migration réversible ou sauvegardée.

**Checklist de mise en production :** CI verte ; `prod-preflight` ; sauvegarde vérifiée ; contrôle de `/ready` et du parcours de connexion après déploiement ; retour arrière connu.

**Bugs probables à venir :**

| Bug | Cause possible | Prévention |
|---|---|---|
| Fenêtre vide ou action sans effet | État typé trop largement, sortie mal branchée | Pas de `any`, test e2e par parcours |
| Droit oublié sur une nouvelle route | Contrôle opt-in par annotation | Test listant les routes sans annotation |
| Montants différents selon l'écran | Calcul dupliqué entre interface et serveur | Montants calculés côté serveur |
| Numéros de reçu en double après restauration | Compteurs désynchronisés | Test existant, à exécuter à chaque restauration |
| Lenteur des listes | Pagination oubliée | Limite obligatoire côté serveur |

**Dette technique par priorité :** tests unitaires Java (élevé, long) ; matrice de droits en lecture (élevé, moyen) ; couverture Angular réelle (moyen, long) ; retrait des `$any` des templates (faible, moyen) ; épinglage des actions (faible, court).

## 7. Plan d'action

**30 jours :** remplacer les comptes de démonstration ; recette client ; décider la matrice de droits (RES-01) ; tester le déchiffrement d'une sauvegarde ; surveiller les alertes de `spring-webmvc`.

**60 jours :** tests unitaires des services de paiement, d'authentification et d'utilisateurs ; couverture Angular sur le code critique avec seuil en CI ; alertes sur les erreurs et Redis ; épingler les actions GitHub.

**90 jours :** scan ZAP sur un environnement de préproduction ; test de charge ; exercice de restauration complet ; passe d'accessibilité restante ; planifier la montée vers Spring Boot 4.
