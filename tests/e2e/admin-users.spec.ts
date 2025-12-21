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

		// Active user rows should have gradient avatar
		const adminRow = page.locator('tr', { hasText: ADMIN_USER.email });
		const adminAvatar = adminRow.locator('.rounded-full').first();
		await expect(adminAvatar).toBeVisible();

		// Placeholder user rows should have different styling (muted background)
		const placeholderRow = page.locator('tr', { hasText: 'placeholder@larib-portal.test' });
		await expect(placeholderRow).toHaveClass(/bg-muted/);

		// Placeholder avatar should have dashed border style
		const placeholderAvatar = placeholderRow.locator('.rounded-full').first();
		await expect(placeholderAvatar).toBeVisible();
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
});
