import { expect, test } from '@playwright/test';
import { loginAsSuperAdmin } from './helpers/auth';

test.describe('Écrans de suivi financier', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  test('affiche la caisse du jour et demande un motif pour un écart', async ({ page }) => {
    await page.goto('/caisse');
    await expect(page.getByRole('heading', { name: 'Caisse', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tous les agents' })).toBeVisible();
    // Le détail d'une caisse s'ouvre sur sa propre page, avec un retour vers la liste.
    await page.getByRole('link', { name: 'Ma caisse' }).click();
    await expect(page).toHaveURL(/\/caisse\/agent\/[0-9a-f-]+\?date=/);
    await expect(page.getByRole('link', { name: /Retour à tous les agents/ })).toBeVisible();
    const cloturer = page.getByRole('button', { name: 'Clôturer la caisse' });
    await expect(cloturer).toBeDisabled();
    await page.getByLabel('Montant compté (FCFA)').fill('123456');
    await expect(cloturer).toBeDisabled();
    await page.getByLabel(/Observations/).fill('Écart de test, non enregistré');
    await expect(cloturer).toBeEnabled();
    await page.getByRole('link', { name: /Retour à tous les agents/ }).click();
    await expect(page.getByRole('heading', { name: 'Tous les agents' })).toBeVisible();
  });

  test('liste les impayés', async ({ page }) => {
    await page.goto('/impayes');
    await expect(page.getByRole('heading', { name: 'Impayés' })).toBeVisible();
    await expect(page.getByText('Total dû')).toBeVisible();
  });

  test('ouvre la situation d’un contribuable', async ({ page }) => {
    await page.goto('/contribuables');
    await page.getByRole('button', { name: 'Voir' }).first().click();
    await expect(page.getByText('Reste dû')).toBeVisible();
    await page.getByRole('button', { name: /Retour à la liste/ }).click();
    await expect(page.getByLabel('Rechercher un contribuable')).toBeVisible();
  });
});
