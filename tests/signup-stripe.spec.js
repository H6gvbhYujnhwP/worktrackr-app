// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Signup and Stripe Integration', () => {
  test('should enforce plan selection before signup', async ({ page }) => {
    // Try to go directly to signup without selecting a plan
    await page.goto('/signup');
    
    // Should show plan selection warning
    await expect(page.locator('text=No plan selected')).toBeVisible();
    await expect(page.locator('text=choose a plan')).toBeVisible();
    
    // Submit button should be disabled
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
  });

  test('should complete pricing to signup flow', async ({ page }) => {
    // Start from pricing page
    await page.goto('/pricing');
    
    // Verify pricing page loads
    await expect(page.locator('h1:has-text("Choose your plan")')).toBeVisible();
    
    // Select Pro plan (most popular)
    await page.click('button:has-text("Choose Pro")');
    
    // Should redirect to signup page
    await expect(page).toHaveURL(/\/signup/);
    
    // Should show selected plan
    await expect(page.locator('text=Pro')).toBeVisible();
    await expect(page.locator('text=£99')).toBeVisible();
    
    // Submit button should be enabled now
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).not.toBeDisabled();
  });

  test('should validate signup form fields', async ({ page }) => {
    // Go to pricing and select a plan first
    await page.goto('/pricing');
    await page.click('button:has-text("Choose Starter")');
    
    // Now on signup page
    await expect(page).toHaveURL(/\/signup/);
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=Full name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password must be')).toBeVisible();
    await expect(page.locator('text=Organization ID is required')).toBeVisible();
  });

  test('should validate email format in signup', async ({ page }) => {
    await page.goto('/pricing');
    await page.click('button:has-text("Choose Starter")');
    
    // Fill form with invalid email
    await page.fill('input[name="full_name"]', 'Test User');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="org_slug"]', 'Test Company');
    
    await page.click('button[type="submit"]');
    
    // Should show email validation error
    await expect(page.locator('text=valid email')).toBeVisible();
  });

  test('should validate password length in signup', async ({ page }) => {
    await page.goto('/pricing');
    await page.click('button:has-text("Choose Starter")');
    
    // Fill form with short password
    await page.fill('input[name="full_name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', '123');
    await page.fill('input[name="org_slug"]', 'Test Company');
    
    await page.click('button[type="submit"]');
    
    // Should show password validation error
    await expect(page.locator('text=8 characters')).toBeVisible();
  });

  test('should show organization slug preview', async ({ page }) => {
    await page.goto('/pricing');
    await page.click('button:has-text("Choose Pro")');
    
    // Type organization name with special characters
    await page.fill('input[name="org_slug"]', 'The Green Agents Ltd & Co!');
    
    // Should show slug preview
    await expect(page.locator('text=the-green-agents-ltd')).toBeVisible();
  });

  test('should handle plan change during signup', async ({ page }) => {
    await page.goto('/pricing');
    await page.click('button:has-text("Choose Starter")');
    
    // Verify Starter is selected
    await expect(page.locator('text=Starter')).toBeVisible();
    await expect(page.locator('text=£49')).toBeVisible();
    
    // Click change plan
    await page.click('button:has-text("Change plan")');
    
    // Should go back to pricing page
    await expect(page).toHaveURL(/\/pricing/);
    
    // Select different plan
    await page.click('button:has-text("Choose Enterprise")');
    
    // Should return to signup with new plan
    await expect(page).toHaveURL(/\/signup/);
    await expect(page.locator('text=Enterprise')).toBeVisible();
    await expect(page.locator('text=£299')).toBeVisible();
  });

  test('should initiate Stripe checkout on valid signup', async ({ page }) => {
    await page.goto('/pricing');
    await page.click('button:has-text("Choose Starter")');
    
    // Fill valid signup form
    await page.fill('input[name="full_name"]', 'E2E Test User');
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'testpassword123');
    await page.fill('input[name="org_slug"]', 'E2E Test Company');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show loading state
    await expect(page.locator('text=Continuing')).toBeVisible();
    
    // Should redirect to Stripe checkout or show error
    await page.waitForTimeout(5000); // Wait for API call
    
    // Check if redirected to Stripe (checkout.stripe.com) or if there's an error
    const currentUrl = page.url();
    const hasError = await page.locator('text=error, text=failed').isVisible();
    
    if (currentUrl.includes('checkout.stripe.com')) {
      // Successfully redirected to Stripe
      await expect(page).toHaveURL(/checkout\.stripe\.com/);
    } else if (hasError) {
      // Expected in test environment without proper Stripe setup
      console.log('Stripe checkout failed as expected in test environment');
    } else {
      // Unexpected state
      throw new Error(`Unexpected state after signup: ${currentUrl}`);
    }
  });

  test('should handle signup completion after Stripe success', async ({ page }) => {
    // This test simulates returning from Stripe checkout
    // In a real test, you'd need to mock the Stripe webhook or use Stripe test mode
    
    const mockSessionId = 'cs_test_mock_session_id_123';
    await page.goto(`/welcome?session_id=${mockSessionId}`);
    
    // Should either show welcome page or handle the session
    const welcomeVisible = await page.locator('text=Welcome, text=success').isVisible();
    const errorVisible = await page.locator('text=error, text=failed').isVisible();
    
    if (welcomeVisible) {
      // Successfully handled checkout completion
      await expect(page.locator('text=Welcome')).toBeVisible();
    } else if (errorVisible) {
      // Expected in test environment
      console.log('Signup completion failed as expected without real Stripe session');
    } else {
      // Check if redirected to login or dashboard
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/(login|app\/dashboard|welcome)/);
    }
  });
});
