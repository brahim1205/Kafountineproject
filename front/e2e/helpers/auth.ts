import { expect, type Page } from '@playwright/test';

export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill('admin@kafountine.gouv.sn');
  await page.getByLabel('Mot de passe').fill('password123');
  await page.getByRole('button', { name: /se connecter/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 10_000 });
}

export async function expectProtectedRouteRedirect(page: Page, route: string) {
  await page.goto(route);
  await expect(page).toHaveURL(/login/);
}
