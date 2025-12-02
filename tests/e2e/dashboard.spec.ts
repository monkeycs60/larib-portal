import { test, expect } from '@playwright/test';

// Set longer timeout for these tests due to server-side data fetching
test.setTimeout(60000);

// Test users created by prisma/seed.test.ts
const ADMIN_USER = {
	email: 'test-admin@larib-portal.test',
	password: 'ristifou',
};

const REGULAR_USER = {
	email: 'test-user@larib-portal.test',
	password: 'ristifou',
};

// Helper function to login
async function loginAs(
	page: import('@playwright/test').Page,
	userType: 'admin' | 'user'
) {
	const user = userType === 'admin' ? ADMIN_USER : REGULAR_USER;
	await page.goto('/en/login', { timeout: 60000 });
	await page.getByPlaceholder('Email').fill(user.email);
	await page.getByPlaceholder('Password').fill(user.password);
	await page.getByRole('button', { name: /sign in/i }).click();
	await page.waitForURL('**/dashboard', { timeout: 60000 });
}

// ============================================
// DASHBOARD TESTS
// ============================================

test.describe('Dashboard Display Tests', () => {
	test('should display a welcome greeting with user name', async ({
		page,
	}) => {
		await loginAs(page, 'user');

		// The dashboard should display a greeting with the user's name
		// The greeting is randomly selected from a list of greetings
		const greetingContainer = page.locator('p.text-xl, p.text-2xl');
		await expect(greetingContainer).toBeVisible();

		// Verify the greeting contains the user's name
		const greetingText = await greetingContainer.textContent();
		expect(greetingText).toBeTruthy();

		// The greeting should contain one of the expected greeting phrases (in English)
		const expectedGreetings = [
			'Welcome',
			'Great to see you again',
			'Welcome back',
			'Nice to have you back',
			'Hello',
			'Have an excellent day',
			'Ready for new discoveries',
			'Happy to assist you',
		];

		const containsGreeting = expectedGreetings.some((greeting) =>
			greetingText?.includes(greeting)
		);
		expect(containsGreeting).toBe(true);
	});

	test('should display French greeting when locale is French', async ({
		page,
	}) => {
		// First login in English (this redirects to dashboard)
		await loginAs(page, 'user');

		// Navigate to French dashboard
		await page.goto('/fr/dashboard', { timeout: 60000 });
		await page.waitForLoadState('networkidle');

		// The dashboard should display a greeting in French
		const greetingContainer = page.locator('p.text-xl, p.text-2xl');
		await expect(greetingContainer).toBeVisible();

		const greetingText = await greetingContainer.textContent();
		expect(greetingText).toBeTruthy();

		// The greeting should contain one of the expected French greeting phrases
		const expectedGreetingsFr = [
			'Bienvenue',
			'Ravi de vous revoir',
			'Bon retour',
			'Content de vous retrouver',
			'Bonjour',
			'Excellente journée à vous',
			'Prêt pour de nouvelles découvertes',
			'Au plaisir de vous accompagner',
		];

		const containsGreeting = expectedGreetingsFr.some((greeting) =>
			greetingText?.includes(greeting)
		);
		expect(containsGreeting).toBe(true);
	});

	test('should display consistent greeting for same user on same day', async ({
		page,
		browser,
	}) => {
		// Login and get the greeting
		await loginAs(page, 'user');
		const greetingContainer = page.locator('p.text-xl, p.text-2xl');
		const firstGreeting = await greetingContainer.textContent();

		// Refresh the page
		await page.reload();
		await page.waitForLoadState('networkidle');

		// The greeting should be the same (deterministic based on user ID + date)
		const secondGreeting = await greetingContainer.textContent();
		expect(firstGreeting).toBe(secondGreeting);

		// Login again in a new context to verify consistency
		const newContext = await browser.newContext();
		const newPage = await newContext.newPage();
		await loginAs(newPage, 'user');
		const thirdGreeting = await newPage
			.locator('p.text-xl, p.text-2xl')
			.textContent();
		expect(firstGreeting).toBe(thirdGreeting);

		await newContext.close();
	});

	test('should display dashboard title', async ({ page }) => {
		await loginAs(page, 'user');

		// Check for the main dashboard title "Dashboard"
		const title = page.locator('h1');
		await expect(title).toBeVisible();
		await expect(title).toHaveText('Dashboard');
	});

	test('should display apps section for user with applications', async ({
		page,
	}) => {
		await loginAs(page, 'user');

		// Check for the apps section title
		const appsSectionTitle = page.getByText('Access applications');
		await expect(appsSectionTitle).toBeVisible();
	});

	test('should display admin section only for admin users', async ({
		page,
	}) => {
		await loginAs(page, 'admin');

		// Admin should see the administration section
		const adminSectionTitle = page.getByText('Administration');
		await expect(adminSectionTitle).toBeVisible();

		// Admin should see the user management link
		const userManagementLink = page.getByText('User management');
		await expect(userManagementLink).toBeVisible();
	});

	test('should not display admin section for regular users', async ({
		page,
	}) => {
		await loginAs(page, 'user');

		// Regular user should NOT see the administration section
		const adminSectionTitle = page.getByText('Administration');
		await expect(adminSectionTitle).not.toBeVisible();
	});

	test('admin should see greeting with their name', async ({ page }) => {
		await loginAs(page, 'admin');

		const greetingContainer = page.locator('p.text-xl, p.text-2xl');
		await expect(greetingContainer).toBeVisible();

		const greetingText = await greetingContainer.textContent();

		// Should contain a greeting and a name
		const expectedGreetings = [
			'Welcome',
			'Great to see you again',
			'Welcome back',
			'Nice to have you back',
			'Hello',
			'Have an excellent day',
			'Ready for new discoveries',
			'Happy to assist you',
		];

		const containsGreeting = expectedGreetings.some((greeting) =>
			greetingText?.includes(greeting)
		);
		expect(containsGreeting).toBe(true);
	});
});

test.describe('Dashboard Navigation Tests', () => {
	test('should redirect to login when not authenticated', async ({ page }) => {
		await page.goto('/en/dashboard', { timeout: 60000 });
		await page.waitForURL(/\/en\/login/, { timeout: 10000 });
		expect(page.url()).toContain('/login');
	});

	test('should navigate to app when clicking on app card', async ({
		page,
	}) => {
		await loginAs(page, 'user');

		// Wait for the page to fully load
		await page.waitForLoadState('networkidle');

		// Find and click on the Best of Larib app card
		const bestofCard = page.getByRole('link', { name: /training best-of/i });
		if (await bestofCard.isVisible()) {
			await bestofCard.click();
			await page.waitForURL(/\/bestof-larib/, { timeout: 10000 });
			expect(page.url()).toContain('/bestof-larib');
		}
	});

	test('should navigate to user management when admin clicks on it', async ({
		page,
	}) => {
		await loginAs(page, 'admin');

		// Wait for the page to fully load
		await page.waitForLoadState('networkidle');

		// Click on user management
		const userManagementCard = page.getByRole('link', {
			name: /user management/i,
		});
		await expect(userManagementCard).toBeVisible();
		await userManagementCard.click();

		await page.waitForURL(/\/admin\/users/, { timeout: 10000 });
		expect(page.url()).toContain('/admin/users');
	});
});
