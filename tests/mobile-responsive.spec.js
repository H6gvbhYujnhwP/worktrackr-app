// @ts-check
const { test, expect, devices } = require('@playwright/test');

// Helper function to login
async function login(page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@test.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/app\/dashboard/);
}

test.describe('Mobile Responsive Design', () => {
  test('should display login page correctly on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12']
    });
    const page = await context.newPage();
    
    await page.goto('/login');
    
    // Verify page loads without horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // Allow small margin
    
    // Verify form elements are visible and usable
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Verify form elements are properly sized
    const emailInput = page.locator('input[name="email"]');
    const inputBox = await emailInput.boundingBox();
    expect(inputBox?.width).toBeGreaterThan(200); // Reasonable minimum width
    
    await context.close();
  });

  test('should display dashboard correctly on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12']
    });
    const page = await context.newPage();
    
    await login(page);
    
    // Verify no horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
    
    // Verify main navigation elements are accessible
    const navElements = [
      'button:has-text("Manage Users")',
      'button:has-text("Billing")',
      'button:has-text("Tickets")'
    ];
    
    for (const selector of navElements) {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
        
        // Verify element is properly sized for touch
        const box = await element.boundingBox();
        expect(box?.height).toBeGreaterThan(40); // Minimum touch target size
      }
    }
    
    await context.close();
  });

  test('should display pricing page correctly on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12']
    });
    const page = await context.newPage();
    
    await page.goto('/pricing');
    
    // Verify no horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
    
    // Verify plan cards are stacked vertically on mobile
    const planCards = page.locator('[data-testid="plan-card"], .plan-card, .card');
    const cardCount = await planCards.count();
    
    if (cardCount > 0) {
      // Check if cards are stacked (each card should be roughly full width)
      const firstCard = planCards.first();
      const cardBox = await firstCard.boundingBox();
      const expectedMinWidth = viewportWidth * 0.8; // At least 80% of viewport
      
      expect(cardBox?.width).toBeGreaterThan(expectedMinWidth);
    }
    
    // Verify buttons are touch-friendly
    const buttons = page.locator('button:has-text("Choose")');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();
      expect(box?.height).toBeGreaterThan(40);
    }
    
    await context.close();
  });

  test('should display signup form correctly on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12']
    });
    const page = await context.newPage();
    
    // Go through pricing to signup flow
    await page.goto('/pricing');
    const chooseButton = page.locator('button:has-text("Choose")').first();
    if (await chooseButton.isVisible()) {
      await chooseButton.click();
    } else {
      await page.goto('/signup');
    }
    
    // Verify no horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
    
    // Verify form inputs are properly sized
    const inputs = [
      'input[name="full_name"]',
      'input[name="email"]', 
      'input[name="password"]',
      'input[name="org_slug"]'
    ];
    
    for (const selector of inputs) {
      const input = page.locator(selector);
      if (await input.isVisible()) {
        const box = await input.boundingBox();
        expect(box?.width).toBeGreaterThan(200);
        expect(box?.height).toBeGreaterThan(40);
      }
    }
    
    // Verify submit button is touch-friendly
    const submitButton = page.locator('button[type="submit"]');
    const buttonBox = await submitButton.boundingBox();
    expect(buttonBox?.height).toBeGreaterThan(40);
    expect(buttonBox?.width).toBeGreaterThan(100);
    
    await context.close();
  });

  test('should handle mobile navigation menu', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12']
    });
    const page = await context.newPage();
    
    await login(page);
    
    // Look for mobile menu button (hamburger menu)
    const menuButton = page.locator('button[aria-label="menu"], button:has-text("☰"), .hamburger-menu, [data-testid="mobile-menu"]');
    
    if (await menuButton.isVisible()) {
      await menuButton.click();
      
      // Verify menu opens
      await expect(page.locator('.mobile-menu, .nav-menu, [data-testid="navigation-menu"]')).toBeVisible();
      
      // Verify menu items are accessible
      const menuItems = page.locator('.mobile-menu a, .nav-menu a, [data-testid="navigation-menu"] a');
      const itemCount = await menuItems.count();
      
      for (let i = 0; i < Math.min(itemCount, 5); i++) {
        const item = menuItems.nth(i);
        await expect(item).toBeVisible();
        
        // Verify touch target size
        const box = await item.boundingBox();
        expect(box?.height).toBeGreaterThan(40);
      }
    } else {
      // If no mobile menu, verify regular navigation works on mobile
      const navItems = page.locator('nav a, .navigation a');
      const itemCount = await navItems.count();
      
      if (itemCount > 0) {
        const firstItem = navItems.first();
        const box = await firstItem.boundingBox();
        expect(box?.height).toBeGreaterThan(30);
      }
    }
    
    await context.close();
  });

  test('should display billing management correctly on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12']
    });
    const page = await context.newPage();
    
    await login(page);
    await page.click('button:has-text("Manage Users")');
    
    // Verify no horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
    
    // Verify plan cards stack properly on mobile
    const planElements = page.locator('.plan-card, [data-testid="plan-card"]');
    const planCount = await planElements.count();
    
    if (planCount > 1) {
      // Check that plans are stacked vertically
      const firstPlan = planElements.first();
      const secondPlan = planElements.nth(1);
      
      const firstBox = await firstPlan.boundingBox();
      const secondBox = await secondPlan.boundingBox();
      
      if (firstBox && secondBox) {
        // Second plan should be below first plan (higher Y coordinate)
        expect(secondBox.y).toBeGreaterThan(firstBox.y + firstBox.height - 50);
      }
    }
    
    // Verify manage seats button is touch-friendly
    const manageSeatsButton = page.locator('button:has-text("Manage Seats")');
    if (await manageSeatsButton.isVisible()) {
      const box = await manageSeatsButton.boundingBox();
      expect(box?.height).toBeGreaterThan(40);
    }
    
    await context.close();
  });

  test('should handle seat management dialog on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12']
    });
    const page = await context.newPage();
    
    await login(page);
    await page.click('button:has-text("Manage Users")');
    
    const manageSeatsButton = page.locator('button:has-text("Manage Seats")');
    
    if (await manageSeatsButton.isVisible()) {
      await manageSeatsButton.click();
      
      // Verify dialog fits on mobile screen
      const dialog = page.locator('[role="dialog"], .modal, .dialog');
      if (await dialog.isVisible()) {
        const dialogBox = await dialog.boundingBox();
        const viewportWidth = await page.evaluate(() => window.innerWidth);
        
        expect(dialogBox?.width).toBeLessThanOrEqual(viewportWidth);
      }
      
      // Verify seat control buttons are touch-friendly
      const controlButtons = page.locator('button:has-text("+"), button:has-text("-")');
      const buttonCount = await controlButtons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const button = controlButtons.nth(i);
        const box = await button.boundingBox();
        expect(box?.height).toBeGreaterThan(40);
        expect(box?.width).toBeGreaterThan(40);
      }
      
      // Verify action buttons are properly sized
      const actionButtons = page.locator('button:has-text("Confirm"), button:has-text("Cancel")');
      const actionCount = await actionButtons.count();
      
      for (let i = 0; i < actionCount; i++) {
        const button = actionButtons.nth(i);
        const box = await button.boundingBox();
        expect(box?.height).toBeGreaterThan(40);
      }
    } else {
      test.skip(true, 'Seat management not available for mobile testing');
    }
    
    await context.close();
  });

  test('should display text at readable sizes on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12']
    });
    const page = await context.newPage();
    
    await page.goto('/');
    
    // Check main heading font size
    const mainHeading = page.locator('h1').first();
    if (await mainHeading.isVisible()) {
      const fontSize = await mainHeading.evaluate(el => {
        return window.getComputedStyle(el).fontSize;
      });
      
      const fontSizeNum = parseInt(fontSize);
      expect(fontSizeNum).toBeGreaterThan(20); // Minimum readable size on mobile
    }
    
    // Check body text font size
    const bodyText = page.locator('p, div').first();
    if (await bodyText.isVisible()) {
      const fontSize = await bodyText.evaluate(el => {
        return window.getComputedStyle(el).fontSize;
      });
      
      const fontSizeNum = parseInt(fontSize);
      expect(fontSizeNum).toBeGreaterThan(14); // Minimum readable body text
    }
    
    await context.close();
  });
});
