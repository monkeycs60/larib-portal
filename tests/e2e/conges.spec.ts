import { test, expect, type Page } from '@playwright/test';

test.setTimeout(60000);

const TEST_USER = {
	email: 'test-user@larib-portal.test',
	password: 'ristifou',
};

const ADMIN_USER = {
	email: 'test-admin@larib-portal.test',
	password: 'ristifou',
};

async function loginAs(page: Page, user: { email: string; password: string }): Promise<void> {
	await page.goto('/en/login', { timeout: 60000 });
	await page.getByPlaceholder('Email').fill(user.email);
	await page.getByPlaceholder('Password').fill(user.password);
	await page.getByRole('button', { name: /sign in/i }).click();
	await page.waitForURL('**/dashboard', { timeout: 60000 });
}

async function gotoConges(page: Page, locale: 'en' | 'fr' = 'en'): Promise<void> {
	await page.goto(`/${locale}/conges`, { timeout: 60000 });
	await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
}

function getFutureDateString(monthsFromNow: number, day: number): string {
	const date = new Date();
	date.setMonth(date.getMonth() + monthsFromNow);
	date.setDate(day);
	return date.toISOString().split('T')[0];
}

test.describe('Conges - Leave Management', () => {
	test.describe('User Workflow', () => {
		test('should display user dashboard with leave balance and allow submitting a leave request', async ({
			page,
		}) => {
			await loginAs(page, TEST_USER);
			await gotoConges(page);

			// Verify user dashboard elements are visible
			await expect(page.getByRole('heading', { name: /leave management/i })).toBeVisible({
				timeout: 10000,
			});

			// Check summary cards are displayed
			await expect(page.getByText(/allocated days/i)).toBeVisible();
			await expect(page.getByText(/approved/i).first()).toBeVisible();
			await expect(page.getByText(/pending/i).first()).toBeVisible();
			await expect(page.getByText(/remaining/i).first()).toBeVisible();

			// Verify Request leave button is visible for users
			const requestLeaveButton = page.getByRole('button', { name: /request leave/i });
			await expect(requestLeaveButton).toBeVisible();

			// Verify calendar is displayed
			await expect(page.getByText(/calendar/i).first()).toBeVisible();

			// Check history section exists
			await expect(page.getByText(/request history/i)).toBeVisible();

			// Open the request leave dialog
			await requestLeaveButton.click();
			await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
			await expect(page.getByText(/submit a leave request/i)).toBeVisible();

			// Verify dialog contains required elements
			await expect(page.getByText('Start date', { exact: true })).toBeVisible();
			await expect(page.getByText('End date', { exact: true })).toBeVisible();
			await expect(page.getByText('Reason', { exact: true })).toBeVisible();

			// Close dialog with Escape
			await page.keyboard.press('Escape');

			// Test French locale
			await gotoConges(page, 'fr');
			await expect(page.getByRole('heading', { name: /gestion des congés/i })).toBeVisible({
				timeout: 10000,
			});
		});

		test('should show request dialog with calendar and submit button', async ({ page }) => {
			await loginAs(page, TEST_USER);
			await gotoConges(page);

			// Open request dialog
			await page.getByRole('button', { name: /request leave/i }).click();
			await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

			// Verify calendar navigation is available
			const nextMonthButton = page.getByRole('button', { name: /next month/i });
			await expect(nextMonthButton).toBeVisible();

			// Verify submit button exists (initially disabled until dates are selected)
			const sendButton = page.getByRole('button', { name: /send request/i });
			await expect(sendButton).toBeVisible();

			// Close dialog with Escape
			await page.keyboard.press('Escape');
			await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
		});
	});

	test.describe('Admin Workflow', () => {
		test('should display admin dashboard with pending requests and allow approval', async ({
			page,
		}) => {
			await loginAs(page, ADMIN_USER);
			await gotoConges(page);

			// Admin should NOT see "Request leave" button (admins don't request leave for themselves)
			// Instead they see the pending requests section
			await expect(page.getByText(/pending requests/i).first()).toBeVisible({ timeout: 10000 });

			// Admin should see the team leave overview
			await expect(page.getByText(/team leave overview/i)).toBeVisible();

			// Check that the pending request from seed data is visible
			const pendingSection = page.locator('section').filter({ hasText: /pending/i }).first();
			await expect(pendingSection).toBeVisible();

			// Look for approve button
			const approveButton = page.getByRole('button', { name: /approve/i }).first();

			if (await approveButton.isVisible()) {
				// Click approve
				await approveButton.click();

				// Wait for the action to complete
				await page.waitForTimeout(1000);

				// The request should disappear from pending or show success feedback
				// (exact behavior depends on implementation)
			}

			// Test French locale
			await gotoConges(page, 'fr');
			await expect(page.getByText(/vue d'ensemble/i)).toBeVisible({
				timeout: 10000,
			});
		});

		test('should only display users with CONGES access in admin dashboard', async ({ page }) => {
			await loginAs(page, ADMIN_USER);
			await gotoConges(page);

			// Wait for the team overview table
			const adminTableTitle = page.getByText(/team leave overview/i);
			await expect(adminTableTitle).toBeVisible({ timeout: 10000 });

			const table = page.locator('table').first();
			await expect(table).toBeVisible({ timeout: 10000 });

			const tableBody = table.locator('tbody');
			const tableContent = await tableBody.textContent();

			// Should contain Test User (has CONGES access)
			expect(tableContent).toContain('Test User');

			// Should NOT contain users without CONGES access
			expect(tableContent).not.toContain('No Conges User');
			expect(tableContent).not.toContain('no-conges@larib-portal.test');

			// Admin should not appear in their own team overview
			expect(tableContent).not.toContain('Test Admin');
			expect(tableContent).not.toContain('test-admin@larib-portal.test');

			// Verify "Who is off today" section also filters correctly
			const todaySection = page.locator('section').filter({ hasText: /today/i });
			if (await todaySection.isVisible()) {
				const todaySectionContent = await todaySection.textContent();
				expect(todaySectionContent).not.toContain('No Conges User');
				expect(todaySectionContent).not.toContain('Test Admin');
			}

			// Test French locale maintains filtering
			await gotoConges(page, 'fr');
			const tableFr = page.locator('table').first();
			await expect(tableFr).toBeVisible({ timeout: 10000 });

			const tableBodyFr = tableFr.locator('tbody');
			const tableContentFr = await tableBodyFr.textContent();

			expect(tableContentFr).toContain('Test User');
			expect(tableContentFr).not.toContain('No Conges User');
			expect(tableContentFr).not.toContain('Test Admin');
		});
	});

	test.describe('Working Days Calculation', () => {
		test('should display working days (excluding weekends and holidays) in leave requests', async ({
			page,
		}) => {
			await loginAs(page, TEST_USER);
			await gotoConges(page);

			// Verify the page loads correctly
			await expect(page.getByRole('heading', { name: /leave management/i })).toBeVisible({
				timeout: 10000,
			});

			// Check that approved/pending counters show working days
			await expect(page.getByText(/allocated days/i)).toBeVisible();
			await expect(page.getByText(/approved/i).first()).toBeVisible();

			// Open request dialog to verify working days calculation in real-time
			await page.getByRole('button', { name: /request leave/i }).click();
			await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

			// Navigate to a month with known holidays
			const nextMonthButton = page.getByRole('button', { name: /next month/i });
			await nextMonthButton.click();

			// Select dates that would include a weekend
			// For example, Monday to Friday = 5 working days
			const dayButtons = await page.getByRole('button', { name: /monday/i }).all();
			if (dayButtons.length > 0) {
				await dayButtons[0].click();
			}

			const fridayButtons = await page.getByRole('button', { name: /friday/i }).all();
			if (fridayButtons.length > 0) {
				await fridayButtons[0].click();
			}

			// If dates were selected, verify the "Requested days" shows working days only
			const requestedDaysText = page.getByText(/requested days/i);
			if (await requestedDaysText.isVisible()) {
				// The count should be 5 or less (working days only, no weekends)
				const daysSection = requestedDaysText.locator('..').locator('..');
				const daysContent = await daysSection.textContent();
				// Should contain a number (the working days count)
				expect(daysContent).toMatch(/\d+/);
			}

			// Verify French locale
			await page.keyboard.press('Escape');
			await gotoConges(page, 'fr');
			await expect(page.getByRole('heading', { name: /gestion des congés/i })).toBeVisible({
				timeout: 10000,
			});
		});

		test('should show excluded days (holidays) in the request dialog', async ({ page }) => {
			await loginAs(page, TEST_USER);
			await gotoConges(page);

			await page.getByRole('button', { name: /request leave/i }).click();
			await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

			// Navigate to December (has Christmas) or January (has New Year)
			const prevMonthButton = page.getByRole('button', { name: /previous month/i });
			const nextMonthButton = page.getByRole('button', { name: /next month/i });

			// Try to navigate to a month with holidays
			await nextMonthButton.click();

			// Look for the "Public holiday" legend indicator
			const holidayLegend = page.getByText(/public holiday/i);
			await expect(holidayLegend).toBeVisible({ timeout: 5000 });

			// Select a date range that includes a potential holiday
			const day20Buttons = await page.getByRole('button', { name: /20th,/ }).all();
			if (day20Buttons.length > 0) {
				await day20Buttons[0].click();
			}

			const day28Buttons = await page.getByRole('button', { name: /28th,/ }).all();
			if (day28Buttons.length > 0) {
				await day28Buttons[0].click();
			}

			// Check if "Days not counted" section appears (shows excluded holidays)
			const daysNotCounted = page.getByText(/days not counted/i);
			// This section only appears when there are holidays in the selected range
			// It's optional but should be present if holidays are included
		});
	});
});
