import { test, expect, type Page } from '@playwright/test';

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

async function gotoAdminUsers(page: Page) {
	await page.goto('/en/admin/users', { timeout: 60000 });
	await page.waitForSelector('table', { timeout: 30000 });
	await page.waitForSelector('table tbody tr', { timeout: 30000 });
}

test.describe('Admin User Management - Onboarding Status Feature', () => {
	test('should display user table with onboarding status badges and legend', async ({
		page,
	}) => {
		await loginAsAdmin(page);
		await gotoAdminUsers(page);

		// Verify status legend is displayed
		await expect(page.getByText('Status legend')).toBeVisible();

		// Verify all three status badges in legend
		await expect(page.getByText('Active').first()).toBeVisible();
		await expect(page.getByText('Invitation sent').first()).toBeVisible();
		await expect(page.getByText('Invitation expired').first()).toBeVisible();

		// Verify legend descriptions
		await expect(page.getByText('User has set their password')).toBeVisible();
		await expect(page.getByText('Awaiting password setup')).toBeVisible();
		await expect(page.getByText('Invitation link has expired')).toBeVisible();

		// Verify table has Status column
		const statusHeader = page.locator('th', { hasText: 'Status' });
		await expect(statusHeader).toBeVisible();

		// Check that admin user has Active status badge (admin has password set)
		const adminRow = page.locator('tr', { hasText: ADMIN_USER.email });
		await expect(adminRow.locator('text=Active')).toBeVisible();

		// Check that placeholder user has Invitation sent status
		const placeholderRow = page.locator('tr', { hasText: 'placeholder@larib-portal.test' });
		await expect(placeholderRow.locator('text=Invitation sent')).toBeVisible();

		// Check that expired placeholder user has Invitation expired status
		const expiredRow = page.locator('tr', { hasText: 'expired@larib-portal.test' });
		await expect(expiredRow.locator('text=Invitation expired')).toBeVisible();
	});

	test('should show resend invitation button only for users without password', async ({
		page,
	}) => {
		await loginAsAdmin(page);
		await gotoAdminUsers(page);

		// Admin user (Active) should NOT have resend button
		const adminRow = page.locator('tr', { hasText: ADMIN_USER.email });
		await expect(adminRow.getByRole('button', { name: /resend invitation/i })).not.toBeVisible();

		// Placeholder user (Invitation sent) should have resend button
		const placeholderRow = page.locator('tr', { hasText: 'placeholder@larib-portal.test' });
		await expect(placeholderRow.getByRole('button', { name: /resend invitation/i })).toBeVisible();

		// Expired invitation user should have resend button
		const expiredRow = page.locator('tr', { hasText: 'expired@larib-portal.test' });
		await expect(expiredRow.getByRole('button', { name: /resend invitation/i })).toBeVisible();
	});

	test('should visually differentiate placeholder users from active users', async ({
		page,
	}) => {
		await loginAsAdmin(page);
		await gotoAdminUsers(page);

		// Active users should have a regular avatar
		const adminRow = page.locator('tr', { hasText: ADMIN_USER.email });
		const adminAvatar = adminRow.locator('.rounded-full').first();
		await expect(adminAvatar).toBeVisible();
		await expect(adminAvatar).not.toHaveClass(/border-dashed/);

		// Placeholder users should have a distinct background
		const placeholderRow = page.locator('tr', { hasText: 'placeholder@larib-portal.test' });
		await expect(placeholderRow).toHaveClass(/bg-gray-50\/50/);

		// Placeholder avatars should have a dashed border
		const placeholderAvatar = placeholderRow.locator('.rounded-full').first();
		await expect(placeholderAvatar).toBeVisible();
		await expect(placeholderAvatar).toHaveClass(/border-dashed/);
	});

	test('should work correctly in French locale', async ({ page }) => {
		await page.goto('/fr/login', { timeout: 60000 });
		await page.getByPlaceholder('E-mail').fill(ADMIN_USER.email);
		await page.getByPlaceholder('Mot de passe').fill(ADMIN_USER.password);
		await page.getByRole('button', { name: /se connecter/i }).click();
		await page.waitForURL('**/dashboard', { timeout: 60000 });

		await page.goto('/fr/admin/users', { timeout: 60000 });
		await page.waitForSelector('table', { timeout: 30000 });

		// Verify French translations
		await expect(page.getByText('Légende des statuts')).toBeVisible();
		await expect(page.getByText('Actif').first()).toBeVisible();
		await expect(page.getByText('Invitation envoyée').first()).toBeVisible();
		await expect(page.getByText('Invitation expirée').first()).toBeVisible();

		// Verify resend button text in French
		const placeholderRow = page.locator('tr', { hasText: 'placeholder@larib-portal.test' });
		await expect(placeholderRow.getByRole('button', { name: /renvoyer l'invitation/i })).toBeVisible();
	});

	test('should save an edited user who has no profile photo', async ({ page }) => {
		await loginAsAdmin(page);
		await gotoAdminUsers(page);

		const row = page.locator('tr', { hasText: 'test-user@larib-portal.test' });
		await row.getByRole('button', { name: 'Edit' }).click();

		const dialog = page.getByRole('dialog');
		await expect(dialog.getByText('Edit user')).toBeVisible();

		await dialog.getByRole('button', { name: /save/i }).click();

		// Regression: users without a profile photo previously failed silent
		// zod validation (empty string vs url()), so Save did nothing.
		await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 15000 });
		await expect(dialog).toBeHidden();
	});

	test('should save a CONGES user after editing dates, apps and leave days', async ({ page }) => {
		await loginAsAdmin(page);
		await gotoAdminUsers(page);

		const row = page.locator('tr', { hasText: 'conges-admin@larib-portal.test' });
		await row.getByRole('button', { name: 'Edit' }).click();

		const dialog = page.getByRole('dialog');
		await expect(dialog.getByText('Edit user')).toBeVisible();

		await dialog.locator('input[type="date"]').first().fill('2026-05-11');
		await dialog.locator('input[type="date"]').nth(1).fill('2027-06-01');
		await dialog.locator('input[type="number"]').fill('30');

		await dialog.getByRole('button', { name: /save/i }).click();

		await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 15000 });
		await expect(dialog).toBeHidden();

		// Leave days must round-trip from the DB into the form (no mismatch).
		await row.getByRole('button', { name: 'Edit' }).click();
		await expect(dialog.locator('input[type="number"]')).toHaveValue('30');
	});
});
