# Kafontine Gestion Municipale - Frontend

## Stack Technologique

- **Framework**: React 19
- **Build**: Vite 7
- **Langage**: TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM 7
- **i18n**: i18next
- **Icons**: Lucide React
- **Charts**: Recharts

## Installation

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos paramètres
```

## Scripts Disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Démarrer le serveur de développement |
| `npm run build` | Compiler pour production |
| `npm run preview` | Prévisualiser la version production |
| `npm run lint` | Linter le code |
| `npm run type-check` | Vérifier les types TypeScript |
| `npm run test` | Exécuter les tests |
| `npm run test:ui` | Exécuter les tests avec UI |
| `npm run test:coverage` | Exécuter les tests avec couverture |

## Structure des Pages

```
src/pages/
├── login/              # Page de connexion
├── home/               # Page d'accueil
├── dashboard/          # Tableau de bord
├── contribuables/      # Gestion des contribuables
├── taxes/              # Gestion des taxes
├── recettes/           # Suivi des recettes
├── etat-civil/         # État civil
├── urbanisme/          # Urbanisme et permis
├── formations/         # Formations professionnelles
├── marche/             # Gestion du marché
├── motos/              # Gestion des motorcycles
├── utilisateurs/       # Administration utilisateurs
├── parametres/         # Paramètres
├── profil/             # Profil utilisateur
├── rapports/           # Rapports
├── statistiques/       # Statistiques
└── audit/              # Journal d'audit
```

## Tests

Le projet utilise **Vitest** pour les tests unitaires et **Playwright** pour les tests E2E.

### Tests Unitaires

```bash
# Exécuter les tests
npm run test

# Exécuter avec UI interactive
npm run test:ui

# Couverture de code
npm run test:coverage
```

### Tests E2E (Playwright)

```bash
# Installer Playwright
npx playwright install chromium

# Exécuter les tests E2E
npm run e2e

# Exécuter avec UI
npm run e2e:ui
```

Les tests E2E utilisent `baseURL` et le `webServer` déclarés dans [playwright.config.ts](../front/playwright.config.ts). Les scénarios doivent donc utiliser des chemins relatifs comme `/login` plutôt que des URLs `http://localhost:5173` codées en dur.

### Écrire un test

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Variables d'Environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `VITE_API_URL` | URL de l'API backend | `/api/v1` |
| `VITE_DEV_API_TARGET` | Cible du proxy Vite en développement | `http://127.0.0.1:3000` |

## Linting

Le projet utilise ESLint avec la configuration React.

```bash
npm run lint
```

## Démarrage

```bash
# Développement
npm run dev

# Production (après build)
npm run preview
```
