# Interface Angular

Interface de la plateforme de gestion municipale de Kafountine. Elle nécessite Node.js 22.22.3 ou plus récent.

## Commandes

```bash
npm ci
npm start                     # http://localhost:4200, avec /api transmis au port 3000
npm run build                 # dist/front-angular/browser
npm test -- --watch=false     # tests unitaires (Vitest)
npm run e2e                   # tests Playwright, SEED_DEFAULT_PASSWORD requis
```

## Organisation de `src/app`

| Dossier | Rôle |
|---|---|
| `core/` | API, authentification, intercepteurs, gardes, année active |
| `layout/` | Menu, en-tête, notifications |
| `pages/` | Écrans, chargés à la demande depuis `app.routes.ts` |
| `components/feature/` | Composants métiers partagés (reçus, rapports, champs) |
| `services/` | Accès à l'API par module |
| `shared/`, `utils/` | Interface et fonctions réutilisables |

## Conventions

- Composants autonomes, `ChangeDetectionStrategy.OnPush` et signaux pour l'état.
- `input()` et `output()` ; ne pas donner à un `output` le nom d'un événement natif (`submit`, `close`…).
- Chaque composant définit le `display` de son élément hôte (`block` ou `contents`) pour ne pas perturber la mise en page du parent.
- Pas de `any` : la compilation stricte des templates doit pouvoir détecter les erreurs.

## Production

`Dockerfile.prod` construit l'application et la sert avec Nginx sans privilèges. `nginx.conf` transmet `/api` à l'URL définie par `NGINX_BACKEND_URL` et applique les en-têtes de sécurité.
