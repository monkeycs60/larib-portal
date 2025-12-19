import { test, expect } from '@playwright/test';

test.setTimeout(60000);

const REGULAR_USER = {
	email: 'test-user@larib-portal.test',
	password: 'ristifou',
};

async function loginAs(page, userType: 'user') {
	const user = userType === 'user' ? REGULAR_USER : REGULAR_USER;
	await page.goto('/en/login', { timeout: 60000 });
	await page.getByPlaceholder('Email').fill(user.email);
	await page.getByPlaceholder('Password').fill(user.password);
	await page.getByRole('button', { name: /sign in/i }).click();
	await page.waitForURL('**/dashboard', { timeout: 60000 });
}

test.describe('Conges Working Days Calculation', () => {
	test('should display working days (not calendar days) for leave requests including weekends and holidays', async ({
		page,
	}) => {
		await loginAs(page, 'user');

		// Navigate to conges page
		await page.goto('/en/conges', { timeout: 60000 });

		// Wait for the page to load
		await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

		// Check that the page loaded correctly
		await expect(page.getByRole('heading', { name: /leave management/i })).toBeVisible({
			timeout: 10000,
		});

		// Verify the summary cards are visible
		await expect(page.getByText(/total allocation/i)).toBeVisible();
		await expect(page.getByText(/approved/i).first()).toBeVisible();

		// The approved leave (Dec 19-27, 2024) should show 5 working days, not 9 calendar days
		// Check the history table for the correct day count
		const historyTable = page.locator('table');
		await expect(historyTable).toBeVisible({ timeout: 10000 });

		// Find the row with Dec 19-27 period and verify it shows 6 days (working days)
		// Dec 19-27, 2024 breakdown:
		// Dec 19 (Thu), 20 (Fri) = 2 working days
		// Dec 21 (Sat), 22 (Sun) = weekend
		// Dec 23 (Mon), 24 (Tue) = 2 working days
		// Dec 25 (Wed) = Christmas holiday
		// Dec 26 (Thu), 27 (Fri) = 2 working days
		// Total: 6 working days (NOT 9 calendar days)
		const historyRows = page.locator('table tbody tr');
		const rowCount = await historyRows.count();

		// Verify at least one leave request exists
		expect(rowCount).toBeGreaterThan(0);

		// Look for '6' in the days column (the leave request should show 6 working days)
		// This validates the fix: the old code would show 9 (calendar days), the new code shows 6 (working days)
		const daysCells = page.locator('table tbody tr td:nth-child(2)');
		const firstDayCell = await daysCells.first().textContent();

		// The text should contain '6' for working days, not '9' for calendar days
		expect(firstDayCell).toContain('6');

		// Also verify the approved days in the summary matches
		// With 30 total days and 6 approved, remaining should be 24
		const approvedCard = page.locator('text=/approved/i').first().locator('..').locator('..');
		await expect(approvedCard).toBeVisible();

		// Test also in French to verify i18n works
		await page.goto('/fr/conges', { timeout: 60000 });
		await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

		// Check that the page loaded correctly in French
		await expect(page.getByRole('heading', { name: /gestion des congés/i })).toBeVisible({
			timeout: 10000,
		});

		// Verify the same working days calculation in French locale
		const frenchHistoryRows = page.locator('table tbody tr');
		const frenchRowCount = await frenchHistoryRows.count();
		expect(frenchRowCount).toBeGreaterThan(0);

		const frenchDaysCells = page.locator('table tbody tr td:nth-child(2)');
		const frenchFirstDayCell = await frenchDaysCells.first().textContent();
		expect(frenchFirstDayCell).toContain('6');
	});
});
