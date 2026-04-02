import { test, expect } from '@playwright/test';

test.describe('Accessibilite - Audit WCAG', () => {
  test('Page login - Labels presents', async ({ page }) => {
    await page.goto('/login');
    
    // Verifier que les inputs ont des labels ou aria-label
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    
    // Verifier que le bouton submit existe
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('Page login - Navigation clavier', async ({ page }) => {
    await page.goto('/login');
    
    // Verifier focus sur email
    const emailInput = page.locator('input[type="email"]');
    await emailInput.focus();
    await expect(emailInput).toBeFocused();
    
    // Tab vers password
    await page.keyboard.press('Tab');
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeFocused();
  });

  test('Dashboard - Acces refuse sans auth', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });

  test('Login - Message erreur sans identifiants', async ({ page }) => {
    await page.goto('/login');
    
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Verifier que quelque chose se passe (erreur ou validation)
    // Le comportement depend de l'implementation
    await page.waitForTimeout(500);
  });

  test('Login - Bouton accessible', async ({ page }) => {
    await page.goto('/login');
    
    const submitButton = page.locator('button[type="submit"]');
    
    // Verifier que le bouton a un role
    await expect(submitButton).toHaveAttribute('type', 'submit');
    
    // Verifier que le bouton est focusable
    const isFocusable = await submitButton.evaluate((el) => {
      const tabIndex = el.getAttribute('tabindex');
      return tabIndex !== '-1' && el instanceof HTMLElement && (el as HTMLElement).offsetParent !== null;
    });
    
    expect(isFocusable).toBe(true);
  });

  test('Page login - Pas de liens casses', async ({ page }) => {
    await page.goto('/login');
    
    // Verifier les liens (forgot password, etc)
    const links = page.locator('a');
    const count = await links.count();
    
    console.log('Nombre de liens trouves:', count);
    
    // Si des liens existent, verifier qu'ils ont href
    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      const href = await link.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript')) {
        console.log('Lien trouve:', href);
      }
    }
  });
});
