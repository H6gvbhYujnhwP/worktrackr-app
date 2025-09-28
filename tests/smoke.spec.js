// @ts-check
const { test, expect } = require('@playwright/test');

// Smoke tests - basic functionality that should always work
// These tests run against production and don't require authentication or external services

test('@smoke homepage loads', async ({ page }) => {
  await page.goto('/');
  
  // Should have WorkTrackr in the title
  await expect(page).toHaveTitle(/WorkTrackr/i);
  
  // Page should load without errors (no 404, 500, etc.)
  const response = await page.goto('/');
  expect(response?.status()).toBeLessThan(400);
  
  // Should have some basic content - at least a heading or main content
  const hasHeading = await page.locator('h1, h2, .hero, .main, main').first().isVisible();
  const hasContent = await page.locator('body').textContent();
  
  expect(hasHeading || (hasContent && hasContent.length > 100)).toBeTruthy();
});

test('@smoke login page renders', async ({ page }) => {
  await page.goto('/login');
  
  // Should have welcome message or login heading
  const hasWelcome = await page.getByRole('heading', { name: /welcome back|sign in|login/i }).isVisible();
  const hasLoginForm = await page.locator('form').isVisible();
  
  expect(hasWelcome || hasLoginForm).toBeTruthy();
  
  // Should have email and password fields
  const emailField = page.getByLabel(/Email/i).or(page.locator('input[name="email"], input[type="email"]'));
  const passwordField = page.getByLabel(/Password/i).or(page.locator('input[name="password"], input[type="password"]'));
  const submitButton = page.getByRole('button', { name: /sign in|login|submit/i }).or(page.locator('button[type="submit"]'));
  
  await expect(emailField).toBeVisible();
  await expect(passwordField).toBeVisible();
  await expect(submitButton).toBeVisible();
});

test('@smoke protected route redirects to login', async ({ page }) => {
  // Unauthenticated users should NOT see the app dashboard
  await page.goto('/app/dashboard');
  
  // Should redirect to login page
  await expect(page).toHaveURL(/\/login/i);
});

test('@smoke pricing page loads', async ({ page }) => {
  await page.goto('/pricing');
  
  // Should have pricing information
  const hasPricingTitle = await page.getByRole('heading', { name: /pricing|plans|choose/i }).isVisible();
  const hasPriceAmount = await page.locator('text=/£\d+|$\d+/').isVisible();
  const hasChooseButton = await page.getByRole('button', { name: /choose|select|get started/i }).first().isVisible();
  
  expect(hasPricingTitle || hasPriceAmount || hasChooseButton).toBeTruthy();
});

test('@smoke signup page enforces plan selection', async ({ page }) => {
  // Try to go directly to signup without selecting a plan
  await page.goto('/signup');
  
  // Should either redirect to pricing or show plan selection warning
  const currentUrl = page.url();
  const hasWarning = await page.locator('text=/no plan selected|choose a plan|select a plan/i').isVisible();
  const redirectedToPricing = currentUrl.includes('/pricing');
  
  expect(hasWarning || redirectedToPricing).toBeTruthy();
});

test('@smoke site navigation works', async ({ page }) => {
  await page.goto('/');
  
  // Test basic navigation links
  const navLinks = [
    { text: /pricing|plans/i, expectedUrl: /pricing/ },
    { text: /login|sign in/i, expectedUrl: /login/ },
    { text: /about|features/i, expectedUrl: /about|features/ }
  ];
  
  for (const link of navLinks) {
    const linkElement = page.getByRole('link', { name: link.text }).first();
    
    if (await linkElement.isVisible()) {
      await linkElement.click();
      await expect(page).toHaveURL(link.expectedUrl);
      
      // Go back to home for next test
      await page.goto('/');
    }
  }
});

test('@smoke responsive design basics', async ({ page }) => {
  // Test that the page doesn't have horizontal scroll on mobile
  await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
  
  await page.goto('/');
  
  // Check for horizontal scroll
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // Allow small margin
  
  // Test login page on mobile too
  await page.goto('/login');
  
  const bodyWidthLogin = await page.evaluate(() => document.body.scrollWidth);
  const viewportWidthLogin = await page.evaluate(() => window.innerWidth);
  
  expect(bodyWidthLogin).toBeLessThanOrEqual(viewportWidthLogin + 10);
});
