import { test, expect, Page } from '@playwright/test';

test.setTimeout(60000);

const ADMIN_USER = {
  email: 'test-admin@larib-portal.test',
  password: 'ristifou',
};

async function loginAsAdmin(page: Page) {
  await page.goto('/en/login', { timeout: 60000 });
  await page.getByPlaceholder('Email').fill(ADMIN_USER.email);
  await page.getByPlaceholder('Password').fill(ADMIN_USER.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 60000 });
}

async function goToAdminUsers(page: Page) {
  await page.goto('/en/admin/users', { timeout: 60000 });
  await page.waitForSelector('table', { timeout: 30000 });
  await page.waitForSelector('table tbody tr', { timeout: 30000 });
  await page.waitForTimeout(1000);
}

test.describe('Admin User Status Management', () => {
  test('should display user status column and filter buttons', async ({ page }) => {
    await loginAsAdmin(page);
    await goToAdminUsers(page);

    await expect(page.locator('thead th:has-text("Status")')).toBeVisible();
    await expect(page.getByRole('button', { name: /all/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /active/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /pending/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /inactive/i })).toBeVisible();
  });

  test('should display status badges for users', async ({ page }) => {
    await loginAsAdmin(page);
    await goToAdminUsers(page);

    const statusColumn = page.locator('table tbody tr td:nth-child(3)');
    const statusCount = await statusColumn.count();
    expect(statusCount).toBeGreaterThan(0);

    const firstStatusBadge = statusColumn.first();
    const badgeText = await firstStatusBadge.textContent();
    expect(['Active', 'Pending', 'Inactive']).toContain(badgeText?.trim());
  });

  test('should filter users by status when clicking filter buttons', async ({ page }) => {
    await loginAsAdmin(page);
    await goToAdminUsers(page);

    const allButton = page.getByRole('button', { name: /^all\s*\(/i });
    await expect(allButton).toBeVisible();
    const allButtonText = await allButton.textContent();
    const totalCountMatch = allButtonText?.match(/\((\d+)\)/);
    const totalCount = totalCountMatch ? parseInt(totalCountMatch[1], 10) : 0;

    const activeButton = page.getByRole('button', { name: /^active\s*\(/i });
    await activeButton.click();
    await page.waitForTimeout(500);

    const rowsAfterActiveFilter = await page.locator('table tbody tr').count();
    expect(rowsAfterActiveFilter).toBeLessThanOrEqual(totalCount);

    await allButton.click();
    await page.waitForTimeout(500);
    const rowsAfterReset = await page.locator('table tbody tr').count();
    expect(rowsAfterReset).toBe(totalCount);
  });

  test('should show departure date change warning in edit dialog', async ({ page }) => {
    await loginAsAdmin(page);
    await goToAdminUsers(page);

    const editButton = page.getByRole('button', { name: /edit/i }).first();
    await editButton.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    const departureDateInput = page.locator('input[type="date"]').last();
    const originalValue = await departureDateInput.inputValue();

    const newDate = new Date();
    newDate.setFullYear(newDate.getFullYear() + 1);
    const newDateStr = newDate.toISOString().slice(0, 10);
    await departureDateInput.fill(newDateStr);

    if (originalValue !== newDateStr) {
      await expect(page.getByText(/will send an email/i)).toBeVisible({ timeout: 3000 });
    }
  });

  test('should display user management page in French locale', async ({ page }) => {
    await page.goto('/fr/login', { timeout: 60000 });
    await page.getByPlaceholder('E-mail').fill(ADMIN_USER.email);
    await page.getByPlaceholder('Mot de passe').fill(ADMIN_USER.password);
    await page.getByRole('button', { name: /se connecter/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 60000 });

    await page.goto('/fr/admin/users', { timeout: 60000 });
    await page.waitForSelector('table', { timeout: 30000 });
    await page.waitForTimeout(1000);

    await expect(page.locator('thead th:has-text("Statut")')).toBeVisible();
    await expect(page.getByRole('button', { name: /tous/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /actif/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /en attente/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /inactif/i })).toBeVisible();
  });
});
