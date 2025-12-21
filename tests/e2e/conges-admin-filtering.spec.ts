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

async function gotoConges(page: Page) {
	await page.goto('/en/conges', { timeout: 60000 });
}

test.describe('Conges Admin Filtering Tests', () => {
	test('should only display users with CONGES application in admin dashboard and calendar', async ({
		page,
	}) => {
		await loginAsAdmin(page);
		await gotoConges(page);

		await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

		const adminTableTitle = page.getByRole('heading', {
			name: /team leave overview/i,
		});
		await expect(adminTableTitle).toBeVisible({ timeout: 10000 });

		const table = page.locator('table').first();
		await expect(table).toBeVisible({ timeout: 10000 });

		const tableBody = table.locator('tbody');
		const tableContent = await tableBody.textContent();

		expect(tableContent).toContain('Test User');
		expect(tableContent).not.toContain('No Conges User');
		expect(tableContent).not.toContain('no-conges@larib-portal.test');
		expect(tableContent).not.toContain('Test Admin');
		expect(tableContent).not.toContain('test-admin@larib-portal.test');

		const todaySection = page.locator('section').filter({ hasText: /today/i });

		if (await todaySection.isVisible()) {
			const todaySectionContent = await todaySection.textContent();
			expect(todaySectionContent).not.toContain('No Conges User');
			expect(todaySectionContent).not.toContain('Test Admin');
		}

		await page.goto('/fr/conges', { timeout: 60000 });
		await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

		const adminTableTitleFr = page.getByRole('heading', {
			name: /vue d'ensemble/i,
		});
		await expect(adminTableTitleFr).toBeVisible({ timeout: 10000 });

		const tableFr = page.locator('table').first();
		const tableBodyFr = tableFr.locator('tbody');
		const tableContentFr = await tableBodyFr.textContent();

		expect(tableContentFr).toContain('Test User');
		expect(tableContentFr).not.toContain('No Conges User');
		expect(tableContentFr).not.toContain('Test Admin');
	});
});
