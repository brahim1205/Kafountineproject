import { expect, type Page } from '@playwright/test';

/** Mot de passe des comptes seedés (SEED_DEFAULT_PASSWORD en CI). */
const E2E_PASSWORD = process.env.E2E_PASSWORD || process.env.SEED_DEFAULT_PASSWORD || 'password123';

export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill('admin@kafountine.gouv.sn');
  await page.getByLabel('Mot de passe').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: /se connecter/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 10_000 });
}

export async function expectProtectedRouteRedirect(page: Page, route: string) {
  await page.goto(route);
  await expect(page).toHaveURL(/login/);
}
