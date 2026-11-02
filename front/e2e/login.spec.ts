import { test, expect } from '@playwright/test';
import { expectProtectedRouteRedirect, loginAsAdmin } from './helpers/auth';

test.describe('Login Page', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login');
    
    // Check for login form elements
    await expect(page.getByLabel('Adresse email')).toBeVisible();
    await expect(page.getByLabel('Mot de passe')).toBeVisible();
    await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByLabel('Adresse email').fill('invalid@test.com');
    await page.getByLabel('Mot de passe').fill('wrongpassword');
    await page.getByRole('button', { name: /se connecter/i }).click();
    
    // Should show error message
    await expect(page.getByText(/identifiants invalides/i)).toBeVisible();
  });

  test('should redirect authenticated user to dashboard', async ({ page }) => {
    await loginAsAdmin(page);
  });
});

test.describe('Authentication Flow', () => {
  test('should protect dashboard route', async ({ page }) => {
    await expectProtectedRouteRedirect(page, '/dashboard');
  });

  test('should protect all protected routes', async ({ page }) => {
    const protectedRoutes = [
      '/contribuables',
      '/taxes',
      '/motos',
      '/marche',
      '/etat-civil',
      '/urbanisme',
      '/formations',
      '/utilisateurs',
    ];

    for (const route of protectedRoutes) {
      await expectProtectedRouteRedirect(page, route);
    }
  });
});

test.describe('Error Handling', () => {
  test('should handle network error gracefully', async ({ page }) => {
    await page.goto('/login');
    
    // Fill valid credentials
    await page.getByLabel('Adresse email').fill('test@test.com');
    await page.getByLabel('Mot de passe').fill('password');
    
    // Intercept and block API call to simulate network error
    await page.route('**/api/v1/auth/login', (route) => {
      route.abort('failed');
    });
    
    await page.getByRole('button', { name: /se connecter/i }).click();
    
    await expect(page.getByText(/impossible de contacter le serveur de connexion|une erreur est survenue/i)).toBeVisible();
  });
});
