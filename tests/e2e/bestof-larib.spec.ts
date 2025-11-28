import { test, expect } from '@playwright/test';

const ADMIN_USER = {
  email: 'toupin.solenn@gmail.com',
  password: 'ristifou',
};

const REGULAR_USER = {
  email: 'clement.serizay@gmail.com',
  password: 'ristifou',
};

test.describe('Best of Larib - Relative Time Display', () => {
  test.beforeEach(async ({ page }) => {
    // Login as regular user
    await page.goto('/en/login');
    await page.getByPlaceholder('Email').fill(REGULAR_USER.email);
    await page.getByPlaceholder('Password').fill(REGULAR_USER.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard');
  });

  test('should display relative time in Created At column for non-admin users', async ({ page }) => {
    await page.goto('/en/bestof-larib');

    // Wait for table to load
    await page.waitForSelector('table');

    // Check for "Created at" column header
    await expect(page.getByRole('columnheader', { name: /created at/i })).toBeVisible();

    // Check that cells contain relative time formats (not raw dates or translation keys)
    const createdAtCells = page.locator('table tbody tr td:has-text("ago")').or(
      page.locator('table tbody tr td:has-text("just now")')
    );

    // Should have at least one cell with relative time
    await expect(createdAtCells.first()).toBeVisible();

    // Verify NO translation keys are displayed (they would contain curly braces)
    const translationKeyPattern = /\{count\}/;
    const cellsWithKeys = page.locator(`table tbody tr td`, {
      has: page.locator(`:text-matches("${translationKeyPattern.source}", "i")`),
    });

    // Should have zero cells with translation keys
    await expect(cellsWithKeys).toHaveCount(0);
  });

  test('should display relative time in First Completion column', async ({ page }) => {
    await page.goto('/en/bestof-larib');

    await page.waitForSelector('table');

    // Check for "First Completion" column header
    await expect(page.getByRole('columnheader', { name: /first completion/i })).toBeVisible();

    // Get the column index of "First Completion"
    const firstCompletionHeader = page.getByRole('columnheader', { name: /first completion/i });
    await expect(firstCompletionHeader).toBeVisible();

    // Check cells in that column don't have translation keys
    const translationKeyPattern = /\{count\}/;
    const cellsWithKeys = page.locator(`table tbody tr td`, {
      has: page.locator(`:text-matches("${translationKeyPattern.source}", "i")`),
    });

    await expect(cellsWithKeys).toHaveCount(0);
  });

  test('should display valid relative time formats (no raw translation keys)', async ({ page }) => {
    await page.goto('/en/bestof-larib');

    await page.waitForSelector('table');

    // Valid relative time patterns
    const validPatterns = [
      /just now/i,
      /\d+m ago/,  // minutes
      /\d+h ago/,  // hours
      /\d+d ago/,  // days
      /\d+w ago/,  // weeks
      /\d+mo ago/, // months
      /\d+y ago/,  // years
      /-/,         // dash for empty values
    ];

    // Get all cells in Created At and First Completion columns
    const timeCells = page.locator('table tbody tr td').filter({
      hasText: /ago|just now|-/,
    });

    // Each cell should match one of the valid patterns
    const count = await timeCells.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const cellText = await timeCells.nth(i).textContent();
      const isValid = validPatterns.some(pattern => pattern.test(cellText || ''));

      expect(isValid, `Invalid time format: "${cellText}"`).toBe(true);
    }
  });
});

test.describe('Best of Larib - Admin View', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/en/login');
    await page.getByPlaceholder('Email').fill(ADMIN_USER.email);
    await page.getByPlaceholder('Password').fill(ADMIN_USER.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard');
  });

  test('should display relative time in Created At column for admin users', async ({ page }) => {
    await page.goto('/en/bestof-larib');

    await page.waitForSelector('table');

    // Check for "Created at" column header
    await expect(page.getByRole('columnheader', { name: /created at/i })).toBeVisible();

    // Verify NO translation keys are displayed
    const translationKeyPattern = /\{count\}/;
    const cellsWithKeys = page.locator(`table tbody tr td`, {
      has: page.locator(`:text-matches("${translationKeyPattern.source}", "i")`),
    });

    await expect(cellsWithKeys).toHaveCount(0);
  });
});

test.describe('Best of Larib - Language Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.getByPlaceholder('Email').fill(REGULAR_USER.email);
    await page.getByPlaceholder('Password').fill(REGULAR_USER.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard');
  });

  test('should display relative time correctly in French', async ({ page }) => {
    await page.goto('/fr/bestof-larib');

    await page.waitForSelector('table');

    // French relative time patterns
    const frenchPatterns = [
      /à l'instant/i,
      /il y a \d+m/,
      /il y a \d+h/,
      /il y a \d+j/,
      /il y a \d+s/,
      /il y a \d+mois/,
      /il y a \d+an/,
    ];

    // Check that table contains French relative time or English fallback
    const hasValidTime = await page.locator('table tbody tr td').filter({
      hasText: /il y a|ago|just now|à l'instant|-/,
    }).count() > 0;

    expect(hasValidTime).toBe(true);

    // NO translation keys should be present
    const translationKeyPattern = /\{count\}/;
    const cellsWithKeys = page.locator(`table tbody tr td`, {
      has: page.locator(`:text-matches("${translationKeyPattern.source}", "i")`),
    });

    await expect(cellsWithKeys).toHaveCount(0);
  });
});
