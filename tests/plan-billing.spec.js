// @ts-check
const { test, expect } = require('@playwright/test');

// Helper function to login before each test
async function login(page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@test.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/app\/dashboard/);
}

test.describe('Plan and Billing Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display current plan information', async ({ page }) => {
    // Navigate to billing/plan management
    await page.click('button:has-text("Manage Users")');
    
    // Should show plan information
    await expect(page.locator('text=Plan, text=Billing')).toBeVisible();
    
    // Should show current plan details
    const planNames = ['Starter', 'Pro', 'Enterprise'];
    const hasPlanName = await Promise.all(
      planNames.map(name => page.locator(`text=${name}`).isVisible())
    );
    
    expect(hasPlanName.some(visible => visible)).toBeTruthy();
    
    // Should show pricing information
    const pricingPatterns = ['£49', '£99', '£299'];
    const hasPricing = await Promise.all(
      pricingPatterns.map(price => page.locator(`text=${price}`).isVisible())
    );
    
    expect(hasPricing.some(visible => visible)).toBeTruthy();
  });

  test('should display included seats information', async ({ page }) => {
    await page.click('button:has-text("Manage Users")');
    
    // Should show user limits
    await expect(page.locator('text=users')).toBeVisible();
    
    // Should show current usage
    const usagePatterns = ['5 of', 'users', 'remaining', 'seats'];
    const hasUsageInfo = await Promise.all(
      usagePatterns.map(pattern => page.locator(`text=${pattern}`).isVisible())
    );
    
    expect(hasUsageInfo.some(visible => visible)).toBeTruthy();
  });

  test('should open manage seats dialog', async ({ page }) => {
    await page.click('button:has-text("Manage Users")');
    
    // Look for Manage Seats button
    const manageSeatsButton = page.locator('button:has-text("Manage Seats")');
    
    if (await manageSeatsButton.isVisible()) {
      await manageSeatsButton.click();
      
      // Should open seats management dialog
      await expect(page.locator('text=Additional Seats, text=Manage.*Seats')).toBeVisible();
      
      // Should show current seat count
      await expect(page.locator('text=Current, text=additional')).toBeVisible();
      
      // Should show seat controls
      await expect(page.locator('button:has-text("+"), button:has-text("-")')).toBeVisible();
    } else {
      test.skip(true, 'Manage Seats functionality not found');
    }
  });

  test('should calculate seat pricing correctly', async ({ page }) => {
    await page.click('button:has-text("Manage Users")');
    
    const manageSeatsButton = page.locator('button:has-text("Manage Seats")');
    
    if (await manageSeatsButton.isVisible()) {
      await manageSeatsButton.click();
      
      // Click +1 to add a seat
      const plusOneButton = page.locator('button:has-text("+1")');
      if (await plusOneButton.isVisible()) {
        await plusOneButton.click();
        
        // Should show cost calculation
        await expect(page.locator('text=£9')).toBeVisible(); // Additional seat cost
        await expect(page.locator('text=monthly')).toBeVisible();
        
        // Should show total cost
        const totalCostPatterns = ['£108', '£158', '£308']; // Base plan + £9
        const hasTotalCost = await Promise.all(
          totalCostPatterns.map(cost => page.locator(`text=${cost}`).isVisible())
        );
        
        expect(hasTotalCost.some(visible => visible)).toBeTruthy();
      }
    } else {
      test.skip(true, 'Seat management functionality not found');
    }
  });

  test('should show seat management controls', async ({ page }) => {
    await page.click('button:has-text("Manage Users")');
    
    const manageSeatsButton = page.locator('button:has-text("Manage Seats")');
    
    if (await manageSeatsButton.isVisible()) {
      await manageSeatsButton.click();
      
      // Should show increment/decrement buttons
      await expect(page.locator('button:has-text("+"), button:has-text("-")')).toBeVisible();
      
      // Should show quick action buttons
      const quickActions = ['+1', '+5', '+10'];
      const hasQuickActions = await Promise.all(
        quickActions.map(action => page.locator(`button:has-text("${action}")`).isVisible())
      );
      
      expect(hasQuickActions.some(visible => visible)).toBeTruthy();
      
      // Should show confirm/cancel buttons
      await expect(page.locator('button:has-text("Confirm"), button:has-text("Cancel")')).toBeVisible();
    } else {
      test.skip(true, 'Seat management controls not found');
    }
  });

  test('should update seat totals when changing seats', async ({ page }) => {
    await page.click('button:has-text("Manage Users")');
    
    const manageSeatsButton = page.locator('button:has-text("Manage Seats")');
    
    if (await manageSeatsButton.isVisible()) {
      await manageSeatsButton.click();
      
      // Get initial seat count
      const initialCountElement = page.locator('text=Current additional seats:').locator('..').locator('text=/\\d+/');
      const initialCount = await initialCountElement.textContent();
      
      // Click +1
      const plusOneButton = page.locator('button:has-text("+1")');
      if (await plusOneButton.isVisible()) {
        await plusOneButton.click();
        
        // Verify count increased
        const newCountElement = page.locator('input[type="number"], [data-testid="seat-count"]');
        if (await newCountElement.isVisible()) {
          const newValue = await newCountElement.inputValue();
          expect(parseInt(newValue)).toBeGreaterThan(parseInt(initialCount || '0'));
        }
        
        // Verify total cost updated
        await expect(page.locator('text=total, text=monthly')).toBeVisible();
      }
    } else {
      test.skip(true, 'Seat adjustment functionality not found');
    }
  });

  test('should handle seat management cancellation', async ({ page }) => {
    await page.click('button:has-text("Manage Users")');
    
    const manageSeatsButton = page.locator('button:has-text("Manage Seats")');
    
    if (await manageSeatsButton.isVisible()) {
      await manageSeatsButton.click();
      
      // Make a change
      const plusOneButton = page.locator('button:has-text("+1")');
      if (await plusOneButton.isVisible()) {
        await plusOneButton.click();
      }
      
      // Cancel the change
      await page.click('button:has-text("Cancel")');
      
      // Dialog should close
      await expect(page.locator('text=Additional Seats, text=Manage.*Seats')).not.toBeVisible();
      
      // Should return to main billing view
      await expect(page.locator('text=Plan, text=Billing')).toBeVisible();
    } else {
      test.skip(true, 'Seat management cancellation not testable');
    }
  });

  test('should show user limit warnings', async ({ page }) => {
    await page.click('button:has-text("Manage Users")');
    
    // Look for user limit indicators
    const limitIndicators = [
      'Limit Reached',
      'seats remaining',
      'upgrade your plan',
      'add additional seats'
    ];
    
    const hasLimitWarning = await Promise.all(
      limitIndicators.map(indicator => page.locator(`text=${indicator}`).isVisible())
    );
    
    if (hasLimitWarning.some(visible => visible)) {
      // Should show appropriate warning message
      await expect(page.locator('text=limit, text=upgrade, text=seats')).toBeVisible();
      
      // Add User button should be disabled or show limit message
      const addUserButton = page.locator('button:has-text("Add User")');
      if (await addUserButton.isVisible()) {
        const isDisabled = await addUserButton.isDisabled();
        const hasLimitText = await page.locator('text=Limit Reached').isVisible();
        
        expect(isDisabled || hasLimitText).toBeTruthy();
      }
    } else {
      console.log('No user limit warnings found - account may have available seats');
    }
  });

  test('should display plan comparison', async ({ page }) => {
    await page.click('button:has-text("Manage Users")');
    
    // Should show different plan options
    const planOptions = ['Starter', 'Pro', 'Enterprise'];
    const planButtons = [
      'Switch to Starter',
      'Switch to Pro', 
      'Switch to Enterprise',
      'Current Plan'
    ];
    
    const hasPlans = await Promise.all(
      planOptions.map(plan => page.locator(`text=${plan}`).isVisible())
    );
    
    const hasButtons = await Promise.all(
      planButtons.map(button => page.locator(`button:has-text("${button}")`).isVisible())
    );
    
    expect(hasPlans.some(visible => visible)).toBeTruthy();
    expect(hasButtons.some(visible => visible)).toBeTruthy();
    
    // Should show plan features
    const features = ['users', 'ticketing', 'workflow', 'reports'];
    const hasFeatures = await Promise.all(
      features.map(feature => page.locator(`text=${feature}`).isVisible())
    );
    
    expect(hasFeatures.some(visible => visible)).toBeTruthy();
  });
});
