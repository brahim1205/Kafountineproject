# Proxy frontal partagé (`/opt/edge`)

Le serveur `72.62.234.215` héberge deux projets indépendants : **c2p.sn** et **Kafountine**
(`orbyteconsulting.tech`). Un seul programme peut écouter sur les ports 80 et 443 : ce proxy
frontal, installé dans `/opt/edge`, que **ni le déploiement de c2p ni celui de Kafountine ne modifient**.

```
Internet ──80/443──► edge-proxy (/opt/edge)
                      ├─ c2p.sn, www, sonar ─► c2p-reverse-proxy (réseau edge, alias c2p-proxy)
                      │    TLS de bout en bout chez c2p, adresse client en PROXY protocol (port 8444)
                      └─ orbyteconsulting.tech ─► TLS terminé ici ─► kafontine-front (172.17.0.1:8081)
```

## Pourquoi

Jusqu'au 06/11/2026, les ports 80/443 appartenaient au reverse proxy de c2p, et la route de
Kafountine était un fichier ajouté à la main dans `/opt/c2p/ops/nginx/conf.d`. Chaque déploiement
de c2p met de côté les fichiers inconnus de son dépôt (`git stash --include-untracked`) : la route
disparaissait et orbyteconsulting.tech recevait le certificat de c2p.sn.

## Fichiers

| Fichier | Rôle |
|---|---|
| `nginx.conf` | Répartition par nom de domaine (SNI) sur 443, et par `Host` sur 80. |
| `sites/kafontine.conf` | Site Kafountine : certificat, redirections, défis ACME, proxy vers l'application. |
| `docker-compose.yml` | Projet Compose `edge`, conteneur `edge-proxy`. |
| `install.sh` | Mise en place (sauvegarde, bascule, vérifications, renouvellement du certificat ; retour arrière automatique en cas d'échec). |
| `rollback.sh` | Retour à l'état précédent. |

## Mise en place

1. Déployer la PR c2p « proxy frontal partagé » (c2p écoute aussi sur 8444 et rejoint le réseau `edge` ;
   tant que `install.sh` n'a pas tourné, c2p garde les ports 80/443 et rien ne change pour lui).
2. Copier ce dossier sur le serveur et lancer l'installation :

   ```bash
   scp -r infra/edge root@72.62.234.215:/opt/
   ssh root@72.62.234.215 'chmod +x /opt/edge/*.sh && /opt/edge/install.sh'
   ```

Coupure : quelques secondes, le temps que c2p libère les ports et que le proxy frontal les prenne.

## Ajouter un site

Ajouter un fichier `sites/<site>.conf`, l'entrée correspondante dans la `map` du bloc `stream`
de `nginx.conf`, puis `docker exec edge-proxy nginx -t && docker exec edge-proxy nginx -s reload`.
