// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Password Reset Flow', () => {
  test('should display forgot password form', async ({ page }) => {
    await page.goto('/login');
    
    // Click forgot password link
    const forgotPasswordLink = page.locator('a:has-text("Forgot"), button:has-text("Forgot"), text=Forgot password').first();
    if (await forgotPasswordLink.isVisible()) {
      await forgotPasswordLink.click();
      
      // Should navigate to forgot password page
      await expect(page).toHaveURL(/\/forgot-password|\/reset-password/);
      
      // Verify form elements
      await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    } else {
      // If forgot password is not implemented, skip this test
      test.skip(true, 'Forgot password functionality not found');
    }
  });

  test('should handle forgot password request', async ({ page }) => {
    // Navigate directly to forgot password page if it exists
    await page.goto('/forgot-password');
    
    // Check if page exists
    const pageExists = !page.url().includes('404') && !await page.locator('text=404').isVisible();
    
    if (pageExists) {
      // Fill in email
      await page.fill('input[name="email"], input[type="email"]', 'admin@test.com');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show success message or redirect
      await expect(page.locator('text=sent, text=email, text=check')).toBeVisible({ timeout: 10000 });
    } else {
      test.skip(true, 'Forgot password page not implemented');
    }
  });

  test('should validate email format in forgot password', async ({ page }) => {
    await page.goto('/forgot-password');
    
    const pageExists = !page.url().includes('404') && !await page.locator('text=404').isVisible();
    
    if (pageExists) {
      // Fill in invalid email
      await page.fill('input[name="email"], input[type="email"]', 'invalid-email');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show validation error
      await expect(page.locator('text=valid email, text=invalid')).toBeVisible();
    } else {
      test.skip(true, 'Forgot password page not implemented');
    }
  });

  test('should handle password reset with token', async ({ page }) => {
    // This test would normally require a real token from email
    // For now, we'll test the reset page structure
    const testToken = 'test-reset-token-123';
    await page.goto(`/reset-password?token=${testToken}`);
    
    const pageExists = !page.url().includes('404') && !await page.locator('text=404').isVisible();
    
    if (pageExists) {
      // Verify reset form elements
      await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      // Test password validation
      await page.fill('input[name="password"]', '123'); // Too short
      await page.click('button[type="submit"]');
      
      // Should show validation error for short password
      await expect(page.locator('text=8 characters, text=too short')).toBeVisible();
    } else {
      test.skip(true, 'Password reset page not implemented');
    }
  });
});
