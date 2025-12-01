import { test, expect, Page } from '@playwright/test';

test.setTimeout(60000);

const REGULAR_USER = {
	email: 'test-user@larib-portal.test',
	password: 'ristifou',
};

const ADMIN_USER = {
	email: 'test-admin@larib-portal.test',
	password: 'ristifou',
};

async function loginAs(page: Page, userType: 'admin' | 'user') {
	const user = userType === 'admin' ? ADMIN_USER : REGULAR_USER;
	await page.goto('/en/login', { timeout: 60000 });
	await page.getByPlaceholder('Email').fill(user.email);
	await page.getByPlaceholder('Password').fill(user.password);
	await page.getByRole('button', { name: /sign in/i }).click();
	await page.waitForURL('**/dashboard', { timeout: 60000 });
}

test.describe('Dashboard Click Me Button Tests', () => {
	test('should display the click me button on dashboard for regular user', async ({
		page,
	}) => {
		await loginAs(page, 'user');

		const clickMeButton = page.getByTestId('click-me-button');
		await expect(clickMeButton).toBeVisible();
		await expect(clickMeButton).toHaveText('click me');
	});

	test('should display the click me button on dashboard for admin user', async ({
		page,
	}) => {
		await loginAs(page, 'admin');

		const clickMeButton = page.getByTestId('click-me-button');
		await expect(clickMeButton).toBeVisible();
		await expect(clickMeButton).toHaveText('click me');
	});

	test('should log "click me" to console when button is clicked', async ({
		page,
	}) => {
		await loginAs(page, 'user');

		const consoleLogs: string[] = [];
		page.on('console', (message) => {
			if (message.type() === 'log') {
				consoleLogs.push(message.text());
			}
		});

		const clickMeButton = page.getByTestId('click-me-button');
		await expect(clickMeButton).toBeVisible();

		await clickMeButton.click();

		expect(consoleLogs).toContain('click me');
	});

	test('should display button in French when using French locale', async ({
		page,
	}) => {
		const user = REGULAR_USER;
		await page.goto('/fr/login', { timeout: 60000 });
		await page.getByPlaceholder('E-mail').fill(user.email);
		await page.getByPlaceholder('Mot de passe').fill(user.password);
		await page.getByRole('button', { name: /se connecter/i }).click();
		await page.waitForURL('**/dashboard', { timeout: 60000 });

		const clickMeButton = page.getByTestId('click-me-button');
		await expect(clickMeButton).toBeVisible();
		await expect(clickMeButton).toHaveText('click me');
	});

	test('should still log "click me" in English to console even on French locale', async ({
		page,
	}) => {
		const user = REGULAR_USER;
		await page.goto('/fr/login', { timeout: 60000 });
		await page.getByPlaceholder('E-mail').fill(user.email);
		await page.getByPlaceholder('Mot de passe').fill(user.password);
		await page.getByRole('button', { name: /se connecter/i }).click();
		await page.waitForURL('**/dashboard', { timeout: 60000 });

		const consoleLogs: string[] = [];
		page.on('console', (message) => {
			if (message.type() === 'log') {
				consoleLogs.push(message.text());
			}
		});

		const clickMeButton = page.getByTestId('click-me-button');
		await clickMeButton.click();

		expect(consoleLogs).toContain('click me');
	});
});
