import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

// UX-01 : chaque contrôle doit être annoncé par les lecteurs d'écran (WCAG 4.1.2).
test.describe('Noms accessibles', () => {
  for (const route of ['/utilisateurs', '/audit', '/motos', '/marche']) {
    test(`tous les contrôles de ${route} sont nommés`, async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const unnamed = await page.locator('main button, main select, main input, main textarea').evaluateAll((elements) =>
        elements
          .filter((element) => {
            const field = element as HTMLInputElement;
            if (field.type === 'hidden') return false;
            const named = element.getAttribute('aria-label') || element.getAttribute('title') || field.labels?.length;
            return !named && !(element.tagName === 'BUTTON' && element.textContent?.trim()) && !field.placeholder;
          })
          .map((element) => element.outerHTML.slice(0, 80)),
      );
      expect(unnamed).toEqual([]);
    });
  }
});
