# Guide Deploiement Entreprise

## Objectif

Ce document explique comment deployer un projet web/backend proprement sur un serveur VPS, avec HTTPS, reverse proxy, bonnes pratiques de securite et procedures de validation.

Il est ecrit pour:

- ce projet Kafountine
- un VPS Linux classique
- un deploiement Docker Compose
- un domaine public

Il sert aussi de modele pour d'autres projets.

## 1. Architecture recommandee

### Architecture cible

Pour une PME, une startup ou un projet entreprise de taille petite a moyenne, une architecture propre et pragmatique est:

1. un VPS Linux dedie
2. Docker et Docker Compose
3. un reverse proxy unique
4. une application front
5. une API backend
6. une base PostgreSQL
7. Redis si necessaire
8. monitoring, logs, backup et rollback

### Architecture recommandee pour ce projet

Pour ce projet, sur un serveur ou `nginx` est deja actif pour un autre site, la bonne architecture est:

1. garder `nginx` comme reverse proxy principal du serveur
2. lancer Kafountine sur des ports internes non publics
3. publier uniquement via `nginx`
4. ne pas lancer `Traefik` sur `80/443`

Exemple:

- front Kafountine: `127.0.0.1:8081`
- backend Kafountine: `127.0.0.1:3010`
- Grafana: `127.0.0.1:3001`

Puis `nginx` route:

- `/` vers le front
- `/api/` vers le backend
- `/health`, `/ready`, `/metrics` vers le backend

## 2. Quels ports ne pas toucher

Certains ports sont souvent deja utilises ou critiques.

### Ports a reserver ou manipuler avec prudence

- `22`: SSH. Ne pas toucher.
- `80`: HTTP public. Souvent deja pris par Nginx, Apache, Traefik ou Caddy.
- `443`: HTTPS public. Meme logique que `80`.
- `25`, `465`, `587`: mail.
- `3306`: MySQL.
- `5432`: PostgreSQL.
- `6379`: Redis.
- `27017`: MongoDB.

### Bonne pratique

Pour un projet Docker expose derriere un reverse proxy deja existant:

- ne pas binder le front sur `80`
- ne pas binder le proxy applicatif sur `80/443`
- utiliser des ports internes du type:
  - `8081`
  - `3010`
  - `3001`
- binder de preference sur `127.0.0.1`, pas sur `0.0.0.0`

Exemple propre:

```yaml
ports:
  - "127.0.0.1:8081:80"
```

Cela evite d'exposer directement le service sur Internet.

## 3. Nginx, Apache ou Traefik

### Nginx

`nginx` est un excellent choix si:

- le serveur sert deja un autre projet
- tu veux un reverse proxy stable et classique
- tu veux Certbot facilement
- tu veux une configuration explicite et simple a auditer

### Apache

`Apache` est utile si:

- ton entreprise utilise deja Apache
- tu as besoin de compatibilite legacy
- tu deployes des applications historiques

Pour un projet moderne Docker + API + SPA, il est souvent moins simple que `nginx`.

### Traefik

`Traefik` est tres bon si:

- le serveur est dedie a Docker
- tu veux du routage dynamique par labels
- tu veux gerer plusieurs stacks Docker proprement
- tu n'as pas deja un Nginx systeme sur `80/443`

### Recommandation pragmatique

- serveur avec Nginx deja en place: garder `nginx`
- serveur Docker dedie sans reverse proxy existant: `Traefik` est tres bien
- serveur legacy ou contexte entreprise deja normalise sur Apache: conserver `Apache`

### Recommandation pour ce projet

Pour ce projet sur ton VPS:

- `nginx` est le meilleur choix
- `Traefik` ne doit pas etre utilise sur ce serveur si `nginx` sert deja d'autres sites

## 4. Strategie de deploiement recommandee

### Option recommandee pour ce projet

Utiliser:

- [docker-compose.prod.yml](./docker-compose.prod.yml)
- [docker-compose.backend.prod.yml](./docker-compose.backend.prod.yml) si deploiement backend seul

Ne pas utiliser sur ce VPS:

- [docker-compose.yml](./docker-compose.yml)

Raison:

- il demarre `Traefik`
- il tente de reserver `80/443`
- il entre en conflit avec le `nginx` systeme

## 5. Preparation du serveur

### Systeme

Serveur recommande:

- Ubuntu 22.04 LTS ou 24.04 LTS
- utilisateur non root pour les operations courantes
- `sudo` reserve aux actions systeme

### Paquets utiles

```bash
sudo apt update
sudo apt install -y nginx git curl unzip ca-certificates gnupg
```

### Docker

Installer Docker et Docker Compose plugin.

Verifier:

```bash
docker --version
docker compose version
```

### Firewall

Ouvrir uniquement ce qui est necessaire:

- `22/tcp`
- `80/tcp`
- `443/tcp`

Ne pas ouvrir inutilement:

- `3010`
- `8081`
- `3001`

Ces ports doivent rester prives si `nginx` fait le proxy.

## 6. Preparation du projet

### Cloner le projet

```bash
sudo mkdir -p /opt/kafountine
sudo chown -R $USER:$USER /opt/kafountine
cd /opt/kafountine
git clone <repo> Kafountineproject
cd Kafountineproject
```

### Variables d'environnement

Ne jamais deployer avec les secrets versionnes.

Copier le template:

```bash
cp .env.prod.example .env.prod
```

Puis completer:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `REDIS_PASSWORD`
- `GRAFANA_ADMIN_PASSWORD`
- `CORS_ORIGIN`
- `PORTAL_URL`
- `DATABASE_URL`

### Valeurs alignees pour ce projet

Pour un deploiement `nginx` + Docker local-only:

- `BACKEND_PORT=3010`
- `FRONT_PORT=8081`
- `GRAFANA_PORT=3001`

Et pour le domaine:

- `PORTAL_URL=https://www.orbyteconsulting.tech`
- `CORS_ORIGIN=https://www.orbyteconsulting.tech`

Si tu n'utilises pas Traefik sur ce VPS:

- les variables `TRAEFIK_*` peuvent rester inutilisees dans ce contexte
- mais il vaut mieux eviter de baser le deploiement serveur dessus

## 7. Deploiement Docker

### Verification prealable

```bash
bash ./scripts/validate-prod-env.sh .env.prod
bash ./scripts/prod-preflight.sh .env.prod
```

### Lancer la stack

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml pull
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d postgres redis otel-collector
docker compose --env-file .env.prod -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

### Verification locale

```bash
curl http://127.0.0.1:3010/health
curl http://127.0.0.1:3010/ready
curl http://127.0.0.1:3010/metrics
curl -I http://127.0.0.1:8081
```

## 8. Configuration Nginx

### Principe

`nginx` ecoute en public sur:

- `80`
- `443`

Et reverse-proxy ensuite vers:

- front: `127.0.0.1:8081`
- backend: `127.0.0.1:3010`

### Configuration HTTP temporaire pour Certbot

Fichier:

`/etc/nginx/sites-available/orbyteconsulting.tech`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name orbyteconsulting.tech www.orbyteconsulting.tech;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
        default_type "text/plain";
        try_files $uri =404;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3010/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto http;
    }

    location /health {
        proxy_pass http://127.0.0.1:3010/health;
        proxy_set_header Host $host;
    }

    location /ready {
        proxy_pass http://127.0.0.1:3010/ready;
        proxy_set_header Host $host;
    }

    location /metrics {
        proxy_pass http://127.0.0.1:3010/metrics;
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto http;
    }
}
```

Activer:

```bash
sudo ln -s /etc/nginx/sites-available/orbyteconsulting.tech /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Si le lien existe deja, ne pas le recreer.

## 9. SSL et HTTPS

### Prerequis

Avant Certbot:

1. DNS correct
2. HTTP public fonctionnel
3. `/.well-known/acme-challenge/*` servi correctement
4. aucune couche CDN/proxy qui casse le challenge

### DNS correct

Exemple:

- `A @ -> IP_DU_VPS`
- `CNAME www -> orbyteconsulting.tech`

### Test challenge

```bash
sudo mkdir -p /var/www/certbot/.well-known/acme-challenge
sudo chown -R www-data:www-data /var/www/certbot
echo test | sudo tee /var/www/certbot/.well-known/acme-challenge/test
curl -i -H "Host: orbyteconsulting.tech" http://127.0.0.1/.well-known/acme-challenge/test
curl -i -H "Host: www.orbyteconsulting.tech" http://127.0.0.1/.well-known/acme-challenge/test
```

Ensuite depuis l'exterieur:

```bash
curl -i http://orbyteconsulting.tech/.well-known/acme-challenge/test
curl -i http://www.orbyteconsulting.tech/.well-known/acme-challenge/test
```

Si la reponse externe ne vient pas de ton Nginx, il faut corriger le DNS ou desactiver le proxy/CDN amont.

### Emission du certificat

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d orbyteconsulting.tech -d www.orbyteconsulting.tech
```

### Configuration HTTPS finale

Une fois le certificat emis:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name orbyteconsulting.tech www.orbyteconsulting.tech;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
        default_type "text/plain";
        try_files $uri =404;
    }

    location / {
        return 301 https://www.orbyteconsulting.tech$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name orbyteconsulting.tech;

    ssl_certificate /etc/letsencrypt/live/www.orbyteconsulting.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.orbyteconsulting.tech/privkey.pem;

    return 301 https://www.orbyteconsulting.tech$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.orbyteconsulting.tech;

    ssl_certificate /etc/letsencrypt/live/www.orbyteconsulting.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.orbyteconsulting.tech/privkey.pem;

    client_max_body_size 10m;

    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    location /api/ {
        proxy_pass http://127.0.0.1:3010/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /health {
        proxy_pass http://127.0.0.1:3010/health;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /ready {
        proxy_pass http://127.0.0.1:3010/ready;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /metrics {
        proxy_pass http://127.0.0.1:3010/metrics;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
    }

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

Puis:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 10. Verification apres deploiement

### Verifications HTTP

```bash
curl -I http://127.0.0.1:8081
curl http://127.0.0.1:3010/health
curl http://127.0.0.1:3010/ready
curl http://127.0.0.1:3010/metrics
```

### Verifications publiques

```bash
curl -I https://www.orbyteconsulting.tech
curl -I https://www.orbyteconsulting.tech/api/v1/health
curl -I https://www.orbyteconsulting.tech/api/v1/ready
```

### Tests applicatifs

1. ouvrir le front
2. tester le login
3. tester un appel API
4. verifier les logs Docker
5. verifier Nginx

## 11. Logs, monitoring et exploitation

### Logs a verifier

- `docker compose logs -f backend`
- `docker compose logs -f front`
- `docker compose logs -f postgres`
- `docker compose logs -f redis`
- `/var/log/nginx/access.log`
- `/var/log/nginx/error.log`

### Monitoring

En entreprise, il faut au minimum:

1. healthchecks applicatifs
2. logs d'acces
3. logs d'erreurs
4. supervision CPU/RAM/disque
5. supervision base de donnees
6. alertes

Ce projet a deja une base:

- Prometheus
- Grafana
- OpenTelemetry

Mais sur un VPS avec Nginx systeme, il faut valider que cette couche tourne sans entrer en conflit avec les ports publics.

Si le backend et la supervision tournent dans des `docker compose` differents, Prometheus ne doit pas scraper `host.docker.internal:3010`.

- `127.0.0.1:3010` reste reserve au `nginx` de l'hote
- Prometheus doit joindre le backend sur le reseau Docker partage `kafontine-observability`
- la cible attendue est `kafontine-backend:3000`

## 12. Sauvegardes et restauration

### Minimum entreprise

Une production n'est pas serieuse sans:

1. sauvegarde de la base
2. retention
3. test de restauration
4. procedure ecrite

### Principe

- backup quotidien PostgreSQL
- sauvegarde hors machine si possible
- test de restauration regulier

Ce repo contient deja:

- [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)
- [RUNBOOK_PRODUCTION.md](./RUNBOOK_PRODUCTION.md)
- [scripts/prod-preflight.sh](./scripts/prod-preflight.sh)
- [scripts/smoke-prod.sh](./scripts/smoke-prod.sh)

## 13. Bonnes pratiques entreprise

### Securite

- ne jamais committer les vrais secrets
- utiliser des mots de passe forts
- encoder les mots de passe reserves dans les URLs de connexion
- limiter les ports exposes
- binder les services internes sur `127.0.0.1`
- activer HTTPS partout
- verifier les headers proxy
- utiliser un utilisateur non root pour l'exploitation courante

### Maintainability

- versionner les migrations
- versionner les fichiers d'infra
- documenter les commandes de deploiement
- documenter les procedures d'incident
- garder un seul reverse proxy public par serveur

### Resilience

- healthchecks
- rollback
- backup
- restore testee
- monitoring
- alerting

### Qualite de deploiement

- environnement `dev`, `staging`, `prod` separes
- aucune configuration manuelle non documentee
- validation `nginx -t` avant reload
- validation `docker compose config` avant deploiement si besoin
- smoke tests apres deploiement

## 14. Erreurs frequentes a eviter

### Erreur 1

Utiliser deux reverse proxy en meme temps sur `80/443`.

Exemple:

- `nginx` systeme
- `Traefik` Docker

Resultat:

- conflit de ports
- deploiement casse

### Erreur 2

Exposer les services internes sur toutes les interfaces.

Mauvais:

```yaml
ports:
  - "8081:80"
```

Meilleur:

```yaml
ports:
  - "127.0.0.1:8081:80"
```

### Erreur 3

Configurer HTTPS dans Nginx avant d'avoir le certificat.

Toujours:

1. HTTP temporaire
2. Certbot
3. HTTPS final

### Erreur 4

Oublier que des caracteres reserves dans un mot de passe cassent `DATABASE_URL`.

Si un mot de passe contient `/`, `@`, `:`, il faut l'encoder dans l'URL.

### Erreur 5

Croire que le DNS seul suffit.

Un CDN, un edge cache ou un proxy externe peut casser le challenge ACME meme si les enregistrements DNS semblent corrects.

## 15. Check-list finale de mise en production

Avant mise en production:

1. repo propre
2. `.env.prod` complete
3. ports locaux choisis et non conflictuels
4. services Docker OK
5. healthchecks OK
6. DNS correct
7. challenge ACME OK
8. certificat emis
9. Nginx HTTPS OK
10. smoke test OK
11. sauvegarde OK
12. restauration documentee

## 16. Recommandation finale pour ce projet

Pour ce projet, sur ton serveur actuel:

1. utiliser [docker-compose.prod.yml](./docker-compose.prod.yml)
2. ne pas utiliser [docker-compose.yml](./docker-compose.yml) sur ce VPS
3. garder `nginx` comme reverse proxy principal
4. publier le front sur `127.0.0.1:8081`
5. publier le backend sur `127.0.0.1:3010`
6. obtenir le certificat HTTPS via `certbot --webroot`
7. verifier qu'aucun CDN/proxy externe ne repond a la place du VPS

## 17. Commandes utiles

### Docker

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f backend
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f front
```

### Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status nginx
```

### Certbot

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d orbyteconsulting.tech -d www.orbyteconsulting.tech
sudo certbot renew --dry-run
```

### Tests

```bash
curl http://127.0.0.1:3010/health
curl http://127.0.0.1:3010/ready
curl http://127.0.0.1:3010/metrics
curl -I http://127.0.0.1:8081
curl -I https://www.orbyteconsulting.tech
```
