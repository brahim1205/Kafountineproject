import { test, expect } from '@playwright/test';
import { loginAsSuperAdmin } from './helpers/auth';

// BUG-01 : les fenêtres se ferment par leur bouton de fermeture.
test.describe('Fermeture des fenêtres', () => {
  test('la fenêtre de tarif des paramètres se ferme', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/parametres');
    await page.getByRole('button', { name: /Nouveau tarif/ }).click();
    const dialog = page.getByRole('heading', { name: /tarif/i }).last();
    await expect(dialog).toBeVisible();
    await page.getByRole('button', { name: 'Fermer' }).click();
    await expect(page.locator('.fixed.inset-0')).toHaveCount(0);
  });

  test('la fenêtre de création de compte se ferme', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/utilisateurs');
    await page.getByRole('button', { name: /Nouvel utilisateur|Ajouter/ }).first().click();
    await expect(page.locator('.fixed.inset-0')).toHaveCount(1);
    await page.getByRole('button', { name: 'Fermer' }).click();
    await expect(page.locator('.fixed.inset-0')).toHaveCount(0);
  });
});
