// @ts-check

const { test, expect } = require('@playwright/test');

const CI = process.env.CI === 'true';

test.describe('Authentication Flow', () => {
  (CI ? test.skip : test)('should login with valid credentials and redirect to dashboard', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Verify login page loads
    await expect(page).toHaveTitle(/WorkTrackr Cloud/);
    await expect(page.locator('h1')).toContainText('Welcome back');
    
    // Fill in credentials
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'password123');
    
    // Submit login form
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/app\/dashboard/);
    
    // Verify dashboard elements are present
    await expect(page.locator('text=Welcome back')).toBeVisible();
    await expect(page.locator('button:has-text("Manage Users")')).toBeVisible();
    await expect(page.locator('button:has-text("Billing")')).toBeVisible();
  });

  (CI ? test.skip : test)('should fail login with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in invalid credentials
    await page.fill('input[name="email"]', 'invalid@test.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    // Submit login form
    await page.click('button[type="submit"]');
    
    // Should stay on login page and show error
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  (CI ? test.skip : test)('should logout and redirect to login page', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/app\/dashboard/);
    
    // Find and click logout button (may be in a dropdown or menu)
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout"), a:has-text("Sign Out")').first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    } else {
      // Try clicking on user menu first
      const userMenu = page.locator('[data-testid="user-menu"], .user-menu, button:has-text("Test Admin")').first();
      if (await userMenu.isVisible()) {
        await userMenu.click();
        await page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout"), a:has-text("Sign Out")').first().click();
      }
    }
    
    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
  });

  (CI ? test.skip : test)('should require authentication for protected routes', async ({ page }) => {
    // Try to access dashboard without logging in
    await page.goto('/app/dashboard');
    
    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
  });
});
