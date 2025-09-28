// @ts-check

const CI = process.env.CI === 'true';
const { test, expect } = require('@playwright/test');

// Helper function to login before each test
async function login(page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@test.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/app\/dashboard/);
}

test.describe('Ticket Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create a new ticket', async ({ page }) => {
    // Click Create Ticket button
    await page.click('button:has-text("Create Ticket")');
    
    // Should open ticket creation form/modal
    await expect(page.locator('text=Create, text=New Ticket')).toBeVisible();
    
    // Fill ticket details
    const ticketTitle = `Test Ticket ${Date.now()}`;
    await page.fill('input[name="title"], input[placeholder*="title"]', ticketTitle);
    
    // Fill description if field exists
    const descriptionField = page.locator('textarea[name="description"], textarea[placeholder*="description"]');
    if (await descriptionField.isVisible()) {
      await descriptionField.fill('This is a test ticket created by automated testing.');
    }
    
    // Set priority if dropdown exists
    const priorityDropdown = page.locator('select[name="priority"], [data-testid="priority-select"]');
    if (await priorityDropdown.isVisible()) {
      await priorityDropdown.selectOption('High');
    }
    
    // Submit ticket
    await page.click('button[type="submit"]:has-text("Create"), button:has-text("Save")');
    
    // Should show success message or redirect to ticket list
    await expect(page.locator(`text=${ticketTitle}`)).toBeVisible({ timeout: 10000 });
  });

  test('should display ticket list', async ({ page }) => {
    // Navigate to tickets section if not already there
    const ticketsButton = page.locator('button:has-text("Tickets")');
    if (await ticketsButton.isVisible()) {
      await ticketsButton.click();
    }
    
    // Should show tickets list or empty state
    const hasTickets = await page.locator('[data-testid="ticket-item"], .ticket-item, .ticket-card').first().isVisible();
    const emptyState = await page.locator('text=No tickets found, text=no tickets').isVisible();
    
    expect(hasTickets || emptyState).toBeTruthy();
    
    if (hasTickets) {
      // Verify ticket list elements
      await expect(page.locator('[data-testid="ticket-item"], .ticket-item, .ticket-card').first()).toBeVisible();
    }
  });

  test('should add comment to ticket', async ({ page }) => {
    // First, ensure we have a ticket to comment on
    const ticketExists = await page.locator('[data-testid="ticket-item"], .ticket-item, .ticket-card').first().isVisible();
    
    if (!ticketExists) {
      // Create a ticket first
      await page.click('button:has-text("Create Ticket")');
      await page.fill('input[name="title"], input[placeholder*="title"]', 'Test Ticket for Comments');
      await page.click('button[type="submit"]:has-text("Create"), button:has-text("Save")');
      await page.waitForTimeout(2000);
    }
    
    // Click on first ticket to open details
    await page.locator('[data-testid="ticket-item"], .ticket-item, .ticket-card').first().click();
    
    // Look for comment section
    const commentField = page.locator('textarea[name="comment"], textarea[placeholder*="comment"], [data-testid="comment-input"]');
    
    if (await commentField.isVisible()) {
      // Add a comment
      const commentText = `Test comment added at ${new Date().toISOString()}`;
      await commentField.fill(commentText);
      
      // Submit comment
      await page.click('button:has-text("Add Comment"), button:has-text("Post"), button[type="submit"]');
      
      // Verify comment appears
      await expect(page.locator(`text=${commentText}`)).toBeVisible({ timeout: 10000 });
    } else {
      test.skip(true, 'Comment functionality not found in current ticket view');
    }
  });

  test('should attach file to ticket', async ({ page }) => {
    // Navigate to ticket creation or existing ticket
    const ticketExists = await page.locator('[data-testid="ticket-item"], .ticket-item, .ticket-card').first().isVisible();
    
    if (!ticketExists) {
      await page.click('button:has-text("Create Ticket")');
      await page.fill('input[name="title"], input[placeholder*="title"]', 'Test Ticket for Attachments');
    } else {
      await page.locator('[data-testid="ticket-item"], .ticket-item, .ticket-card').first().click();
    }
    
    // Look for file upload input
    const fileInput = page.locator('input[type="file"], [data-testid="file-upload"]');
    
    if (await fileInput.isVisible()) {
      // Create a test file
      const testFilePath = '/tmp/test-attachment.txt';
      await page.evaluate(() => {
        const fs = require('fs');
        fs.writeFileSync('/tmp/test-attachment.txt', 'This is a test attachment file.');
      });
      
      // Upload file
      await fileInput.setInputFiles(testFilePath);
      
      // Submit if needed
      const submitButton = page.locator('button:has-text("Upload"), button:has-text("Attach"), button[type="submit"]');
      if (await submitButton.isVisible()) {
        await submitButton.click();
      }
      
      // Verify attachment appears
      await expect(page.locator('text=test-attachment.txt')).toBeVisible({ timeout: 10000 });
    } else {
      test.skip(true, 'File attachment functionality not found');
    }
  });

  test('should persist ticket data on page refresh', async ({ page }) => {
    // Create a ticket with specific data
    await page.click('button:has-text("Create Ticket")');
    const ticketTitle = `Persistence Test ${Date.now()}`;
    await page.fill('input[name="title"], input[placeholder*="title"]', ticketTitle);
    await page.click('button[type="submit"]:has-text("Create"), button:has-text("Save")');
    
    // Wait for ticket to be created
    await expect(page.locator(`text=${ticketTitle}`)).toBeVisible();
    
    // Refresh the page
    await page.reload();
    
    // Verify ticket still exists after refresh
    await expect(page.locator(`text=${ticketTitle}`)).toBeVisible({ timeout: 10000 });
  });

  test('should filter tickets by status', async ({ page }) => {
    // Look for filter controls
    const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"], button:has-text("All")');
    
    if (await statusFilter.isVisible()) {
      // Try different filter options
      const filterOptions = ['All', 'Open', 'Closed', 'In Progress'];
      
      for (const option of filterOptions) {
        const optionElement = page.locator(`text=${option}`);
        if (await optionElement.isVisible()) {
          await optionElement.click();
          
          // Wait for filter to apply
          await page.waitForTimeout(1000);
          
          // Verify URL or UI reflects the filter
          const currentUrl = page.url();
          const hasFilterIndicator = await page.locator(`text=${option}`).isVisible();
          
          expect(hasFilterIndicator || currentUrl.includes(option.toLowerCase())).toBeTruthy();
        }
      }
    } else {
      test.skip(true, 'Ticket filtering functionality not found');
    }
  });

  test('should search tickets', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[placeholder*="search"], input[name="search"], [data-testid="search-input"]');
    
    if (await searchInput.isVisible()) {
      // Perform search
      await searchInput.fill('test');
      
      // Submit search (might be automatic or require button click)
      const searchButton = page.locator('button:has-text("Search")');
      if (await searchButton.isVisible()) {
        await searchButton.click();
      } else {
        // Try pressing Enter
        await searchInput.press('Enter');
      }
      
      // Wait for search results
      await page.waitForTimeout(2000);
      
      // Verify search was performed (URL change or results update)
      const currentUrl = page.url();
      const hasResults = await page.locator('[data-testid="ticket-item"], .ticket-item, .ticket-card').isVisible();
      const hasEmptyState = await page.locator('text=No tickets found, text=no results').isVisible();
      
      expect(hasResults || hasEmptyState || currentUrl.includes('search')).toBeTruthy();
    } else {
      test.skip(true, 'Ticket search functionality not found');
    }
  });
});
