import { test, expect } from '@playwright/test';
import { restoreAdminSession as loginAsAdmin } from './helpers/auth';

test.describe('Transactions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display transactions list', async ({ page }) => {
    await page.goto('/taxes');
    await expect(page.getByRole('heading', { name: /Taxes Municipales/ })).toBeVisible();
    await expect(page.getByText(/statistiques des recettes/i)).toBeVisible();
  });

  test('should filter transactions by category', async ({ page }) => {
    await page.goto('/taxes');

    await page.getByRole('button', { name: /Etat civil/ }).click();
    await expect(page).toHaveURL(/taxes\/etat-civil/);
    await expect(page.getByRole('heading', { name: 'Etat civil', exact: true })).toBeVisible();
  });

  test('should search transactions', async ({ page }) => {
    await page.goto('/taxes/etat-civil');
    // Recherche faite par le serveur (numéro, contribuable, NIN), après une courte pause de frappe.
    const searchInput = page.getByPlaceholder('N° de ticket, contribuable, NIN...', { exact: true });
    await searchInput.fill('E2E-NO-SUCH-TRANSACTION');
    await expect(searchInput).toHaveValue('E2E-NO-SUCH-TRANSACTION');
    await expect(page.locator('tbody')).toContainText('Aucune transaction trouvée');
  });
});

test.describe('Contribuables', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display contribuables list', async ({ page }) => {
    await page.goto('/contribuables');
    await expect(page.getByRole('heading', { name: /contribuables/i })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('should search contribuables', async ({ page }) => {
    await page.goto('/contribuables');

    const searchInput = page.getByPlaceholder('Rechercher par nom, téléphone, NIN...');
    await searchInput.fill('Diallo');
    await expect(searchInput).toHaveValue('Diallo');
    await expect(page.locator('tbody')).toContainText('Diallo');
  });
});

test.describe('Motos', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display motos list', async ({ page }) => {
    await page.goto('/motos');
    await expect(page.getByRole('heading', { name: /Motos/ })).toBeVisible();
    await expect(page.getByText(/motos enregistrées|motos en retard|recettes du mois/i).first()).toBeVisible();
  });
});

test.describe('État Civil', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display état civil demandes', async ({ page }) => {
    await page.goto('/etat-civil');
    await expect(page.getByRole('heading', { name: /État Civil/ })).toBeVisible();
  });
});

test.describe('Urbanisme', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display urbanisme dossiers', async ({ page }) => {
    await page.goto('/urbanisme');
    await expect(page.getByRole('heading', { name: /Urbanisme/ })).toBeVisible();
  });
});
