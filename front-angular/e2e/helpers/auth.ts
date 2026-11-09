import { expect, type Page, type BrowserContext } from '@playwright/test';

let adminCookies: Awaited<ReturnType<BrowserContext['cookies']>> | undefined;

// Business-page tests reuse a real session instead of exhausting login rate limits.
export async function restoreAdminSession(page: Page) {
  if (!adminCookies) {
    await loginAsAdmin(page);
    adminCookies = await page.context().cookies();
    return;
  }
  await page.context().addCookies(adminCookies);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/dashboard/);
}

export async function loginAsAdmin(page: Page) {
  await loginAs(page, 'admin@kafountine.gouv.sn');
}

export async function loginAsSuperAdmin(page: Page) {
  await loginAs(page, 'superadmin@kafountine.gouv.sn');
}

async function loginAs(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  const password = process.env.SEED_DEFAULT_PASSWORD;
  if (!password) throw new Error('SEED_DEFAULT_PASSWORD must match the test database seed');
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: /se connecter/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 10_000 });
}

export async function expectProtectedRouteRedirect(page: Page, route: string) {
  await page.goto(route);
  await expect(page).toHaveURL(/login/);
}
