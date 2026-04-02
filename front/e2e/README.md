# Frontend E2E Tests

This directory contains end-to-end tests using Playwright.

## Installation

```bash
npx playwright install chromium
```

## Running Tests

```bash
# Run all tests
npm run e2e

# Run with UI
npm run e2e:ui

# Run specific test
npm run e2e -- login.spec.ts
```

Playwright uses [playwright.config.ts](/home/cherif/Bureau/E221/Soutenance/Kafontine-Gestion-municipale/front/playwright.config.ts), including `baseURL` and a local Vite `webServer`. Tests should therefore use relative paths like `page.goto('/login')` instead of hardcoded `localhost` URLs.

## Writing Tests

See `playwright.config.ts` for configuration and `e2e/` for the current test suite.

Shared helpers live in `e2e/helpers/`. Reuse them for login flows and protected-route checks instead of duplicating credentials or navigation logic in each spec.
