# Manuel utilisateur — Plateforme de gestion municipale de Kafountine

Version de novembre 2026. Ce manuel explique, rôle par rôle, comment utiliser l'application au quotidien.

## Sommaire

1. [Ce qu'il faut savoir avant de commencer](#1-ce-quil-faut-savoir-avant-de-commencer)
2. [Se connecter](#2-se-connecter)
3. [Agent municipal](#3-agent-municipal)
4. [Régisseur](#4-régisseur)
5. [Agent de l'état civil](#5-agent-de-létat-civil)
6. [Agent du quai de pêche](#6-agent-du-quai-de-pêche)
7. [Service des finances](#7-service-des-finances)
8. [Maire (administrateur)](#8-maire-administrateur)
9. [Super administrateur](#9-super-administrateur)
10. [Vérifier un reçu (pour tous, sans compte)](#10-vérifier-un-reçu-pour-tous-sans-compte)
11. [Problèmes fréquents](#11-problèmes-fréquents)

---

## 1. Ce qu'il faut savoir avant de commencer

**L'application enregistre les recettes ; elle ne garde pas l'argent.** L'argent suit le circuit habituel jusqu'au Trésor. L'application en garde la trace : qui a payé, combien, pour quoi, à quel agent, quand, et comment (espèces, Mobile Money, chèque, virement).

Quatre règles valent partout :

| Règle | Ce que cela veut dire pour vous |
|---|---|
| **Rien ne s'efface** | Une recette enregistrée par erreur ne se supprime pas : un régisseur l'**annule** en donnant un motif, et l'annulation reste visible. |
| **Un reçu pour chaque recette** | Chaque recette reçoit un numéro unique (par exemple `TX-2026-0042`) et un reçu à imprimer ou à remettre. |
| **La caisse se clôture chaque jour** | En fin de journée, vous comptez l'argent et vous clôturez votre caisse. Une fois clôturée, la journée ne se modifie plus. |
| **Une année close est figée** | Quand l'exercice est clos, ses recettes ne se modifient plus ; on peut seulement les consulter. |

Le sélecteur d'année, en haut de l'écran, change l'exercice affiché. Sur une année passée, l'application est en **consultation seule**.

---

## 2. Se connecter

1. Ouvrez l'adresse de la plateforme dans votre navigateur (ordinateur ou tablette).
2. Saisissez votre **adresse email** et votre **mot de passe**, puis cliquez sur **Se connecter**.

**Mot de passe oublié ?** Cliquez sur « Mot de passe oublié ? », saisissez votre email puis **Prévenir l'administrateur**. L'administrateur est averti et vous donne un nouveau mot de passe. Aucun email n'est envoyé.

**Changer votre mot de passe :** menu en haut à droite → **Mon profil**.

> Après 5 essais de connexion ratés, le compte est bloqué quelques minutes (message « Trop de tentatives »). Attendez un quart d'heure avant de réessayer.

---

## 3. Agent municipal

Votre menu : Tableau de bord, Recettes, Taxes, Pénalités, Urbanisme, Marché, Motos, Formations, Caisse, Impayés, Contribuables.

### Enregistrer une taxe (ticket)

1. Menu **Taxes** → choisissez la catégorie (Marché, Stationnement et transport, Urbanisme…).
2. Choisissez le **service** : le tarif de l'arrêté du 8 mai 2024 s'affiche.
3. Indiquez la **quantité** (jours, mois, chargements…). Pour un droit de 15 % sur une manifestation à entrée payante, saisissez **le montant des recettes déclarées** : l'application calcule les 15 %.
4. Identifiez le contribuable (CNI, nom, téléphone) : s'il n'existe pas, il est créé.
5. Choisissez le **mode de paiement**, validez, puis **imprimez le reçu**.

Le montant est toujours celui de l'arrêté : il ne se saisit pas à la main.

### Motos Jakarta : cotisations et retards

1. Menu **Motos** → onglet **Liste des motos** ou **Retards**.
2. Sur la moto, cliquez **Paiement**. Le montant (cotisation, et pénalité s'il y a retard) est calculé automatiquement.
3. Choisissez le mode de paiement, validez, imprimez le reçu.

L'**adhésion** d'une nouvelle moto et les **changements** (propriétaire, conducteur) sont faits par le régisseur.

### Marché : loyers

Menu **Marché** → **Suivi paiements**. Les loyers de chaque place occupée sont créés automatiquement pour la période (mois, trimestre…). Cliquez sur le loyer dû, choisissez le mode de paiement et enregistrez.

### Formations professionnelles

Menu **Formations** :
- **Nouvelle formation** : nom, domaine, durée, responsable, budget, dates.
- **Inscrire un jeune** : ouvrez la formation → **Ajouter un participant**.
- **Pointer les présences** à chaque séance : boutons **Présent** / **Absent** devant chaque participant. Le taux d'assiduité se calcule tout seul.
- **Clôturer la session** à la fin : chaque jeune devient **Certifié** si son assiduité atteint 75 %, sinon **Non certifié**.
- **Attestation** : pour un jeune certifié, bouton **Attestation** → **Imprimer**.

### Fin de journée : clôturer ma caisse

1. Menu **Caisse** : vous voyez le total enregistré dans la journée, par mode de paiement et par service, et la liste de vos recettes.
2. Comptez l'argent et saisissez le **montant compté**.
3. S'il y a un **écart**, expliquez-le dans **Observations** (obligatoire).
4. Cliquez **Clôturer la caisse**. Le régisseur ou le service des finances la valide ensuite.

---

## 4. Régisseur

Vous faites tout ce que fait l'agent (sauf l'état civil), et en plus :

| Tâche | Où |
|---|---|
| Créer les comptes des agents, du quai de pêche et des finances | **Équipes et rôles** |
| Enregistrer une **nouvelle moto** (adhésion, avec son droit d'adhésion et son reçu) et déclarer un **changement** | **Motos** → **Nouvelle moto** / bouton de changement sur la moto |
| **Valider** la caisse clôturée d'un agent, ou la **rouvrir** (avec un motif) | **Caisse** → **Détail** sur la ligne de l'agent |
| **Annuler** une recette erronée (motif obligatoire) | Liste des paiements du module concerné (Recettes, Motos, Marché) |
| Voir ce que chaque agent a enregistré **sur la journée, la semaine ou le mois, par module** | **Activité des agents** |
| Suivre le quai de pêche | Commissions, Pêcheurs, Embarcations, Camions |

**Caisse :** la page montre le tableau de **tous les agents** de la journée. **Détail** ouvre la caisse d'un agent sur sa propre page ; **Retour à tous les agents** ramène à la liste. **Ma caisse** ouvre la vôtre.

---

## 5. Agent de l'état civil

Votre menu : Nouvelle demande, À traiter, Historique, Anciens tickets, Statistiques, Caisse, Contribuables.

1. **Nouvelle demande** : identifiez le demandeur, choisissez l'acte (bulletin de naissance, extrait, certificat…), le nombre d'exemplaires. Le montant suit l'arrêté.
2. **À traiter** : les demandes en attente. Ouvrez-en une pour la **délivrer** (la recette est alors enregistrée) ou la **rejeter**.
3. **Historique** : toutes les demandes, avec **Imprimer le reçu**.
4. **Statistiques** : demandes reçues, en attente, délivrées, recettes, et le détail par type d'acte.

Un acte d'état civil s'enregistre **toujours par une demande**, jamais comme un simple ticket.

En fin de journée, clôturez votre **Caisse** comme l'agent (section 3).

---

## 6. Agent du quai de pêche

Votre menu : Commissions frigorifiques, Pêcheurs, Embarcations, Camions frigorifiques, Droits du quai, Motos Jakarta, Marché, Caisse, Impayés.

### Taxe de passage d'un camion frigorifique

1. **Camions frigorifiques** → onglet **Camions** : chaque camion doit avoir sa **capacité** (en kg).
2. Onglet **Expéditions** → **Nouvelle expédition** : camion, **poids chargé** (mettez **0** si le camion repart vide), destination.
3. Sur la ligne de l'expédition, cliquez **Enregistrer la taxe**. L'application annonce le tarif de l'arrêté (camion vide ou chargé, selon sa capacité : 0 à 1 t, 1 à 10 t, 10 à 20 t, plus de 20 t).
4. Choisissez le **payeur** (ou **Nouveau payeur** : CNI, nom, téléphone) et le mode de paiement, puis **Enregistrer et imprimer le reçu**.

Une expédition ne se paie qu'une fois. Une fois payée, elle ne se supprime plus.

### Droits du quai

Menu **Droits du quai** : **pêcheur saisonnier** (par mois), **moto chargeant du poisson** (par jour), **poissonnerie (étalage)** (par jour). Choisissez le droit, le payeur, le nombre de jours ou de mois, le mode de paiement, puis **Enregistrer et imprimer le reçu**.

### Commissions frigorifiques

Enregistrez les dépôts de poisson (pêcheur, espèce, poids, température) et **validez**-les. Ce registre ne donne pas lieu à une taxe.

En fin de journée, clôturez votre **Caisse**.

---

## 7. Service des finances

- **Tableau de bord** : votre espace de travail budget : lignes budgétaires (prévu, dépensé, reste) et **demandes de dépense**.
- **Suivi budgétaire** et **Gestion budget** : le détail de l'exécution.
- **Caisse** : validez les caisses clôturées des agents.
- **Impayés** : motos en retard et loyers du marché non payés.
- **Recettes** : toutes les recettes, avec export.

---

## 8. Maire (administrateur)

Vous **consultez tout, sans rien modifier**.

- **Tableau de bord** : recettes du jour, du mois, de l'année, taux de recouvrement, ce qui attend une décision.
- **Activité des agents** : ce que chaque agent a enregistré sur le jour, la semaine ou le mois, module par module.
- **Recettes** : toutes les recettes, la **répartition par catégorie**, l'export ; **Grille des tarifs** affiche les tarifs de l'arrêté.
- **État civil**, **Budget & dépenses**, **Caisse**, **Impayés**, **Rapports** (menu en haut à droite).
- **Rôles et permissions** : qui peut faire quoi.

---

## 9. Super administrateur

En plus de tout le reste :

| Tâche | Où |
|---|---|
| Créer, modifier, désactiver un compte ; changer son rôle ; redéfinir son mot de passe | **Utilisateurs** |
| Modifier un **tarif** ou une **pénalité** | **Paramètres** (menu en haut à droite) |
| Créer et restaurer une **sauvegarde** | **Paramètres** → Sauvegardes |
| Consulter le **journal d'audit** (qui a fait quoi, quand) | **Journal Audit** |
| Annuler une recette (motif obligatoire) | Liste des paiements du module |

> Restaurer une sauvegarde remplace les données actuelles par celles de la sauvegarde. Faites-le seulement en cas de nécessité.

---

## 10. Vérifier un reçu (pour tous, sans compte)

Chaque reçu porte un **QR code**. En le scannant avec un téléphone, on ouvre la page de vérification de la commune. On peut aussi aller sur la page de connexion → **Vérifier un reçu de la commune**, et saisir le numéro du reçu.

La page indique si le reçu est **valide**, **annulé** ou **en cours**, avec son objet, son montant et sa date. Elle n'affiche aucune donnée personnelle. **Un numéro introuvable n'est pas un reçu officiel.**

---

## 11. Problèmes fréquents

| Problème | Que faire |
|---|---|
| « Trop de tentatives, veuillez réessayer plus tard » | Attendez un quart d'heure, puis reconnectez-vous en tapant l'email à la main. |
| L'écran affiche une ancienne version après une mise à jour | Rechargez la page avec **Ctrl + Maj + R**. |
| « La caisse de cet agent est clôturée » | La journée est clôturée : demandez au régisseur de la rouvrir (avec un motif). |
| Un bouton manque | Votre rôle ne donne pas ce droit : voyez **Rôles et permissions** avec votre administrateur. |
| Une recette a été enregistrée par erreur | Ne recommencez pas : demandez au régisseur de l'annuler avec un motif, puis enregistrez la bonne. |
| Année passée : rien n'est modifiable | C'est normal : l'exercice est en consultation seule. Revenez à l'année en cours avec le sélecteur en haut. |
