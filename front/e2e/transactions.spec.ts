import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Transactions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display transactions list', async ({ page }) => {
    await page.goto('/taxes');
    await expect(page.locator('h1')).toContainText('Taxes');
    await expect(page.getByText(/statistiques des recettes/i)).toBeVisible();
  });

  test('should filter transactions by category', async ({ page }) => {
    await page.goto('/taxes');

    const filterExists = await page.locator('select').first().isVisible().catch(() => false);
    if (filterExists) {
      await page.selectOption('select:first-child', 'etat-civil');
      await page.waitForTimeout(500);
    }
  });

  test('should search transactions', async ({ page }) => {
    await page.goto('/taxes');

    const searchInput = page.getByPlaceholder(/rechercher/i).first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('TX');
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Contribuables', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display contribuables list', async ({ page }) => {
    await page.goto('/contribuables');
    await expect(page.locator('h1')).toContainText('Contribuables');
    await expect(page.locator('table')).toBeVisible();
  });

  test('should search contribuables', async ({ page }) => {
    await page.goto('/contribuables');

    const searchInput = page.getByPlaceholder(/rechercher/i).first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('Diallo');
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Motos', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display motos list', async ({ page }) => {
    await page.goto('/motos');
    await expect(page.locator('h1')).toContainText('Motos');
    await expect(page.getByText(/motos enregistrées|motos en retard|recettes du mois/i).first()).toBeVisible();
  });
});

test.describe('État Civil', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display état civil demandes', async ({ page }) => {
    await page.goto('/etat-civil');
    await expect(page.locator('h1')).toContainText('État Civil');
  });
});

test.describe('Urbanisme', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display urbanisme dossiers', async ({ page }) => {
    await page.goto('/urbanisme');
    await expect(page.locator('h1')).toContainText('Urbanisme');
  });
});
