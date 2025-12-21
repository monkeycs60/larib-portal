import { test, expect, Page } from '@playwright/test';

test.setTimeout(60000);

const TEST_USER = {
	email: 'test-user@larib-portal.test',
	password: 'ristifou',
};

async function loginAsUser(page: Page): Promise<void> {
	await page.goto('/en/login', { timeout: 60000 });
	await page.getByPlaceholder('Email').fill(TEST_USER.email);
	await page.getByPlaceholder('Password').fill(TEST_USER.password);
	await page.getByRole('button', { name: /sign in/i }).click();
	await page.waitForURL('**/dashboard', { timeout: 60000 });
}

test.describe('Conges Working Days Calculation', () => {
	test('should display working days (not calendar days) for leave requests including weekends and holidays', async ({
		page,
	}) => {
		await loginAsUser(page);

		await page.goto('/en/conges', { timeout: 60000 });
		await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

		await expect(page.getByRole('heading', { name: /leave management/i })).toBeVisible({
			timeout: 10000,
		});

		await expect(page.getByText(/total allocation/i)).toBeVisible();
		await expect(page.getByText(/approved/i).first()).toBeVisible();

		const historyTable = page.locator('table');
		await expect(historyTable).toBeVisible({ timeout: 10000 });

		const historyRows = page.locator('table tbody tr');
		const rowCount = await historyRows.count();
		expect(rowCount).toBeGreaterThan(0);

		const daysCells = page.locator('table tbody tr td:nth-child(2)');
		const firstDayCell = await daysCells.first().textContent();
		expect(firstDayCell).toContain('6');

		const approvedCard = page.locator('text=/approved/i').first().locator('..').locator('..');
		await expect(approvedCard).toBeVisible();

		await page.goto('/fr/conges', { timeout: 60000 });
		await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

		await expect(page.getByRole('heading', { name: /gestion des congés/i })).toBeVisible({
			timeout: 10000,
		});

		const frenchHistoryRows = page.locator('table tbody tr');
		const frenchRowCount = await frenchHistoryRows.count();
		expect(frenchRowCount).toBeGreaterThan(0);

		const frenchDaysCells = page.locator('table tbody tr td:nth-child(2)');
		const frenchFirstDayCell = await frenchDaysCells.first().textContent();
		expect(frenchFirstDayCell).toContain('6');
	});
});
