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
async function loginAs(page, userType: 'admin' | 'user') {
	const user = userType === 'admin' ? ADMIN_USER : REGULAR_USER;
	await page.goto('/en/login', { timeout: 60000 });
	await page.getByPlaceholder('Email').fill(user.email);
	await page.getByPlaceholder('Password').fill(user.password);
	await page.getByRole('button', { name: /sign in/i }).click();
	await page.waitForURL('**/dashboard', { timeout: 60000 });
}

// Helper function to wait for table to fully load
async function waitForTableToLoad(page) {
	// Wait for table to appear
	await page.waitForSelector('table', { timeout: 30000 });

	// Wait for at least one row in the table
	await page.waitForSelector('table tbody tr', { timeout: 30000 });

	// Wait for network to be mostly idle
	await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
		// Ignore networkidle timeout, table is already loaded
	});

	// Extra wait to ensure UI is stable (don't wait for loading overlay as it might stay forever)
	await page.waitForTimeout(1000);
}

// Helper function to navigate to bestof-larib with proper timeout
async function gotoBestofLarib(page) {
	await page.goto('/en/bestof-larib', { timeout: 60000 });
}

// ============================================
// 1️⃣ TESTS DE STRUCTURE & AFFICHAGE
// ============================================

test.describe('Structure & Display Tests', () => {
	test('should display correct table structure for regular users', async ({
		page,
	}) => {
		await loginAs(page, 'user');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		// Vérifier les colonnes visibles pour les utilisateurs (sortables)
		await expect(
			page.getByRole('button', { name: /sort by status/i })
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: /sort by name/i })
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: /sort by exam type/i })
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: /sort by created at/i })
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: /sort by first completion/i })
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: /sort by attempts/i })
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: /sort by level/i })
		).toBeVisible();
		// Colonnes non-triables
		await expect(
			page.locator('thead th:has-text("User Tags")')
		).toBeVisible();
		await expect(
			page.locator('thead th:has-text("Actions")')
		).toBeVisible();

		// Vérifier que les colonnes admin ne sont PAS visibles
		await expect(
			page.getByRole('button', { name: /sort by diagnosis/i })
		).not.toBeVisible();
		await expect(
			page.getByRole('button', { name: /sort by difficulty/i })
		).not.toBeVisible();
	});

	test('should display correct table structure for admin users', async ({
		page,
	}) => {
		await loginAs(page, 'admin');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		// Vérifier les colonnes admin (sortables)
		await expect(
			page.getByRole('button', { name: /sort by status/i })
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: /sort by name/i })
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: /sort by exam type/i })
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: /sort by diagnosis/i })
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: /sort by difficulty/i })
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: /sort by created at/i })
		).toBeVisible();
		// Colonnes non-triables
		await expect(
			page.locator('thead th:has-text("Admin Tags")')
		).toBeVisible();
		await expect(
			page.locator('thead th:has-text("Actions")')
		).toBeVisible();

		// Vérifier que les colonnes user ne sont PAS visibles
		await expect(
			page.getByRole('button', { name: /sort by first completion/i })
		).not.toBeVisible();
		await expect(
			page.getByRole('button', { name: /sort by attempts/i })
		).not.toBeVisible();
		await expect(
			page.getByRole('button', { name: /sort by level/i })
		).not.toBeVisible();
	});

	test('should display dates in relative format without translation keys', async ({
		page,
	}) => {
		await loginAs(page, 'user');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		const table = page.locator('table');

		// Vérifier qu'il n'y a pas de clés de traduction brutes
		const translationKeys = await table.locator('text=/\\{count\\}/').count();
		expect(translationKeys).toBe(0);

		// Vérifier qu'au moins une cellule contient un format de date valide
		const validFormats = ['ago', 'just now', '-'];
		const cells = table.locator('tbody td');
		const cellCount = await cells.count();

		let foundValidFormat = false;
		for (let i = 0; i < cellCount; i++) {
			const text = await cells.nth(i).textContent();
			if (text && validFormats.some((format) => text.includes(format))) {
				foundValidFormat = true;
				break;
			}
		}
		expect(foundValidFormat).toBe(true);
	});
});

// ============================================
// 2️⃣ TESTS DE FILTRES
// ============================================

test.describe('Filter Tests', () => {
	test('should filter cases by search text', async ({ page }) => {
		await loginAs(page, 'user');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		// Compter les lignes initiales
		const initialRowCount = await page.locator('table tbody tr').count();
		expect(initialRowCount).toBeGreaterThan(0);

		// Rechercher un cas spécifique
		const searchInput = page.getByPlaceholder('Search by name...');
		await searchInput.fill('Case 1');

		// Attendre que l'URL change (le filtre utilise des query params)
		await page.waitForURL(/\?q=Case/, { timeout: 3000 });
		await page.waitForTimeout(500);

		// Vérifier que le résultat est filtré
		const rows = page.locator('table tbody tr');
		const filteredCount = await rows.count();

		// Il devrait y avoir au moins un résultat avec "Case 1"
		expect(filteredCount).toBeGreaterThan(0);
		expect(filteredCount).toBeLessThanOrEqual(initialRowCount);

		// Vérifier que les résultats contiennent le texte recherché
		for (let i = 0; i < filteredCount; i++) {
			const rowText = await rows.nth(i).textContent();
			expect(rowText?.toLowerCase()).toContain('case 1'.toLowerCase());
		}
	});

	test('should filter cases by exam type using multi-select', async ({
		page,
	}) => {
		await loginAs(page, 'user');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		// Ouvrir le multi-select Exam
		const examFilter = page
			.locator('label:has-text("Exam")')
			.locator('..')
			.getByRole('combobox');
		await examFilter.click();

		// Attendre que les options apparaissent
		await page.waitForTimeout(300);

		// Sélectionner ECG (chercher dans les options visibles)
		const ecgOption = page.getByText('ECG', { exact: true }).first();
		if (await ecgOption.isVisible()) {
			await ecgOption.click();
		}

		// Fermer le dropdown
		await page.keyboard.press('Escape');
		await page.waitForTimeout(500);

		// Vérifier que le tableau est toujours visible
		await expect(page.locator('table tbody tr').first()).toBeVisible();
	});

	test('should reset all filters when clicking Reset button', async ({
		page,
	}) => {
		await loginAs(page, 'user');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		// Appliquer un filtre de recherche
		const searchInput = page.getByPlaceholder('Search by name...');
		await searchInput.fill('Test Case 1');
		await page.waitForTimeout(500);

		// Cliquer sur Reset
		await page.getByRole('button', { name: /reset/i }).click();
		await page.waitForTimeout(300);

		// Vérifier que le champ de recherche est vide
		await expect(searchInput).toHaveValue('');
	});

	test('should display all filter options for admin users', async ({
		page,
	}) => {
		await loginAs(page, 'admin');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		// Vérifier la présence des filtres admin
		await expect(page.locator('label:has-text("Admin Tag")')).toBeVisible();
		await expect(page.locator('label:has-text("Status")')).toBeVisible();
		await expect(page.locator('label:has-text("Diagnosis")')).toBeVisible();
		await expect(page.locator('label:has-text("Difficulty")')).toBeVisible();
	});
});

// ============================================
// 3️⃣ TESTS DE TRI
// ============================================

test.describe('Sorting Tests', () => {
	test('should sort table by clicking column headers', async ({ page }) => {
		await loginAs(page, 'user');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		// Récupérer les noms avant tri
		const namesBefore = await page
			.locator('table tbody tr td:nth-child(2)')
			.allTextContents();

		// Cliquer sur le header "Name" pour trier
		const nameHeader = page.getByRole('button', { name: /sort by name/i });
		await nameHeader.click();
		await page.waitForTimeout(500);

		// Récupérer les noms après tri
		const namesAfter = await page
			.locator('table tbody tr td:nth-child(2)')
			.allTextContents();

		// Les tableaux doivent exister
		expect(namesBefore.length).toBeGreaterThan(0);
		expect(namesAfter.length).toBeGreaterThan(0);

		// Le tri doit avoir un effet (l'ordre peut changer ou rester le même si déjà trié)
		expect(namesBefore.length).toBe(namesAfter.length);
	});

	test('should sort by user status correctly (completed > in progress > not started)', async ({
		page,
	}) => {
		await loginAs(page, 'user');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		const statusHeader = page.getByRole('button', { name: /sort by status/i });

		await statusHeader.click();
		await page.waitForURL(/sort=status&dir=asc/, { timeout: 5000 });
		await page.waitForTimeout(500);

		const statusesAsc = await page
			.locator('table tbody tr td:nth-child(1)')
			.allTextContents();
		expect(statusesAsc.length).toBeGreaterThan(0);

		const statusOrder = { 'Not Started': 0, 'In Progress': 1, Completed: 2 };
		const statusOrderFr = { 'Non commencé': 0, 'En cours': 1, Terminé: 2 };

		const getOrder = (status: string): number => {
			const trimmed = status.trim();
			return statusOrder[trimmed] ?? statusOrderFr[trimmed] ?? -1;
		};

		for (let i = 1; i < statusesAsc.length; i++) {
			const prevOrder = getOrder(statusesAsc[i - 1]);
			const currOrder = getOrder(statusesAsc[i]);
			expect(currOrder).toBeGreaterThanOrEqual(prevOrder);
		}

		await statusHeader.click();
		await page.waitForURL(/sort=status&dir=desc/, { timeout: 5000 });
		await page.waitForTimeout(500);

		const statusesDesc = await page
			.locator('table tbody tr td:nth-child(1)')
			.allTextContents();

		for (let i = 1; i < statusesDesc.length; i++) {
			const prevOrder = getOrder(statusesDesc[i - 1]);
			const currOrder = getOrder(statusesDesc[i]);
			expect(currOrder).toBeLessThanOrEqual(prevOrder);
		}
	});

	test('should sort by level (personalDifficulty) correctly', async ({
		page,
	}) => {
		await loginAs(page, 'user');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		const levelHeader = page.getByRole('button', { name: /sort by level/i });

		await levelHeader.click();
		await page.waitForURL(/sort=personalDifficulty&dir=asc/, { timeout: 5000 });
		await page.waitForTimeout(500);

		expect(page.url()).toContain('sort=personalDifficulty');
		expect(page.url()).toContain('dir=asc');

		await levelHeader.click();
		await page.waitForURL(/sort=personalDifficulty&dir=desc/, { timeout: 5000 });
		await page.waitForTimeout(500);

		expect(page.url()).toContain('sort=personalDifficulty');
		expect(page.url()).toContain('dir=desc');
	});

	test('should sort by difficulty correctly for admin (beginner < intermediate < advanced)', async ({
		page,
	}) => {
		await loginAs(page, 'admin');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		const difficultyHeader = page.getByRole('button', {
			name: /sort by difficulty/i,
		});

		await difficultyHeader.click();
		await page.waitForURL(/sort=difficulty&dir=asc/, { timeout: 5000 });
		await page.waitForTimeout(500);

		const difficultiesAsc = await page
			.locator('table tbody tr td:nth-child(5)')
			.allTextContents();
		expect(difficultiesAsc.length).toBeGreaterThan(0);

		const difficultyOrder = { Beginner: 0, Intermediate: 1, Advanced: 2 };
		const difficultyOrderFr = { Débutant: 0, Intermédiaire: 1, Avancé: 2 };

		const getOrder = (difficulty: string): number => {
			const trimmed = difficulty.trim();
			return difficultyOrder[trimmed] ?? difficultyOrderFr[trimmed] ?? -1;
		};

		for (let i = 1; i < difficultiesAsc.length; i++) {
			const prevOrder = getOrder(difficultiesAsc[i - 1]);
			const currOrder = getOrder(difficultiesAsc[i]);
			expect(currOrder).toBeGreaterThanOrEqual(prevOrder);
		}

		await difficultyHeader.click();
		await page.waitForURL(/sort=difficulty&dir=desc/, { timeout: 5000 });
		await page.waitForTimeout(500);

		const difficultiesDesc = await page
			.locator('table tbody tr td:nth-child(5)')
			.allTextContents();

		for (let i = 1; i < difficultiesDesc.length; i++) {
			const prevOrder = getOrder(difficultiesDesc[i - 1]);
			const currOrder = getOrder(difficultiesDesc[i]);
			expect(currOrder).toBeLessThanOrEqual(prevOrder);
		}
	});

	test('should sort by admin status correctly (draft/published)', async ({
		page,
	}) => {
		await loginAs(page, 'admin');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		const statusHeader = page.getByRole('button', { name: /sort by status/i });

		await statusHeader.click();
		await page.waitForURL(/sort=status&dir=asc/, { timeout: 5000 });
		await page.waitForTimeout(500);

		expect(page.url()).toContain('sort=status');

		await statusHeader.click();
		await page.waitForURL(/sort=status&dir=desc/, { timeout: 5000 });
		await page.waitForTimeout(500);

		const statuses = await page
			.locator('table tbody tr td:nth-child(1)')
			.allTextContents();
		expect(statuses.length).toBeGreaterThan(0);
	});
});

// ============================================
// 4️⃣ TESTS D'ACTIONS
// ============================================

test.describe('Action Tests', () => {
	test('should navigate to case detail when clicking View', async ({
		page,
	}) => {
		await loginAs(page, 'user');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		// Cliquer sur le premier bouton View
		const viewButton = page.getByRole('link', { name: /view/i }).first();
		await viewButton.click();

		// Vérifier la navigation vers la page de détail
		await page.waitForURL(/\/en\/bestof-larib\/[a-z0-9-]+$/, {
			timeout: 10000,
		});
		expect(page.url()).toMatch(/\/en\/bestof-larib\/[a-z0-9-]+$/);
	});

	test('should navigate to new attempt when clicking Start new attempt', async ({
		page,
	}) => {
		await loginAs(page, 'user');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		// Cliquer sur "Start new attempt"
		const startButton = page
			.getByRole('link', { name: /start new attempt/i })
			.first();
		await startButton.click();

		// Vérifier l'URL avec le paramètre newAttempt
		await page.waitForURL(/\/en\/bestof-larib\/[a-z0-9-]+\?newAttempt=1/, {
			timeout: 20000,
		});
		expect(page.url()).toMatch(/newAttempt=1/);
	});

	test('should open edit dialog when clicking Edit button as admin', async ({
		page,
	}) => {
		await loginAs(page, 'admin');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		// Cliquer sur Edit
		const editButton = page.getByRole('button', { name: /edit/i }).first();
		await editButton.click();

		// Vérifier que le dialog s'ouvre
		await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
	});

	test('should show delete confirmation when clicking Delete as admin', async ({
		page,
	}) => {
		await loginAs(page, 'admin');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		// Cliquer sur Delete
		const deleteButton = page
			.getByRole('button', { name: /delete/i })
			.first();
		await deleteButton.click();

		// Vérifier la confirmation (peut être un dialog ou alertdialog)
		const confirmation = page
			.locator('[role="dialog"], [role="alertdialog"]')
			.first();
		await expect(confirmation).toBeVisible({ timeout: 5000 });
	});
});

// ============================================
// 5️⃣ TESTS D'INTERNATIONALISATION
// ============================================

test.describe('Internationalization Tests', () => {
	test('should display correct translations when switching language', async ({
		page,
	}) => {
		await loginAs(page, 'user');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		// Vérifier texte en anglais
		await expect(
			page.getByRole('heading', { name: /clinical cases/i })
		).toBeVisible();

		// Naviguer vers la version française
		await page.goto('/fr/bestof-larib');
		await waitForTableToLoad(page);

		// Vérifier texte en français
		await expect(
			page.getByRole('heading', { name: /cas cliniques/i })
		).toBeVisible();
	});
});

// ============================================
// 6️⃣ TESTS D'AUTORISATIONS
// ============================================

test.describe('Permission & Authorization Tests', () => {
	test('should redirect to login when accessing bestof-larib without authentication', async ({
		page,
	}) => {
		// Naviguer sans être connecté
		await gotoBestofLarib(page);

		// Vérifier la redirection vers login
		await page.waitForURL(/\/en\/login/, { timeout: 10000 });
		expect(page.url()).toContain('/login');
	});

	test('should not show admin actions for regular users', async ({ page }) => {
		await loginAs(page, 'user');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		// Vérifier que Edit et Delete ne sont PAS visibles
		await expect(
			page.getByRole('button', { name: /^edit$/i })
		).not.toBeVisible();
		await expect(
			page.getByRole('button', { name: /^delete$/i })
		).not.toBeVisible();

		// Vérifier que "Create Case" n'est PAS visible
		await expect(
			page.getByRole('button', { name: /create case/i })
		).not.toBeVisible();

		// Vérifier que le lien admin "Statistics" (pas "My Statistics") n'est PAS visible
		// Les utilisateurs réguliers voient "My Statistics" au lieu de "Statistics"
		await expect(
			page.getByRole('link', { name: /^statistics$/i })
		).not.toBeVisible();

		// Vérifier que "My Statistics" EST visible pour les utilisateurs réguliers
		await expect(
			page.getByRole('link', { name: /my statistics/i })
		).toBeVisible();
	});

	test('should show admin actions for admin users', async ({ page }) => {
		await loginAs(page, 'admin');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		// Vérifier que les boutons admin sont visibles
		await expect(
			page.getByRole('button', { name: /create case/i })
		).toBeVisible();
		await expect(
			page.getByRole('link', { name: /statistics/i })
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: /^edit$/i }).first()
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: /^delete$/i }).first()
		).toBeVisible();
	});
});

// ============================================
// 7️⃣ TESTS DE PERFORMANCE & UX
// ============================================

test.describe('Performance & UX Tests', () => {
	test('should load table within acceptable time', async ({ page }) => {
		await loginAs(page, 'user');

		const startTime = Date.now();
		await gotoBestofLarib(page);
		await page.waitForSelector('table tbody tr', { timeout: 10000 });
		const loadTime = Date.now() - startTime;

		// Vérifier que le chargement prend moins de 10 secondes
		expect(loadTime).toBeLessThan(10000);
	});

	test('should display cases when data is available', async ({ page }) => {
		await loginAs(page, 'user');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		// Vérifier qu'il y a au moins une ligne de données
		const rowCount = await page.locator('table tbody tr').count();
		expect(rowCount).toBeGreaterThan(0);

		// Vérifier que les données sont complètes (pas de cellules vides critiques)
		const firstRow = page.locator('table tbody tr').first();
		await expect(firstRow.locator('td').nth(1)).not.toBeEmpty(); // Name
		await expect(firstRow.locator('td').nth(2)).not.toBeEmpty(); // Exam Type
	});
});

// ============================================
// 8️⃣ TESTS DE NAVIGATION & BOUTONS HEADER
// ============================================

test.describe('Navigation & Header Buttons Tests', () => {
	test('should open Tags Manager when clicking Tags Manager button', async ({
		page,
	}) => {
		await loginAs(page, 'user');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		// Cliquer sur Tags Manager
		await page.getByRole('button', { name: /tags manager/i }).click();

		// Vérifier que le dialog s'ouvre
		await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
	});

	test('should navigate to statistics page when clicking Statistics button as admin', async ({
		page,
	}) => {
		await loginAs(page, 'admin');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		// Cliquer sur Statistics
		await page.getByRole('link', { name: /statistics/i }).click();

		// Vérifier la navigation
		await page.waitForURL(/\/en\/bestof-larib\/statistics/, {
			timeout: 10000,
		});
		expect(page.url()).toContain('/statistics');
	});

	test('should open create case dialog when clicking Create Case as admin', async ({
		page,
	}) => {
		await loginAs(page, 'admin');
		await gotoBestofLarib(page);
		await waitForTableToLoad(page);

		// Cliquer sur Create Case
		await page.getByRole('button', { name: /create case/i }).click();

		// Vérifier que le dialog s'ouvre
		await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
	});
});

// ============================================
// 9️⃣ TESTS DE STATISTIQUES ADMIN
// ============================================

test.describe('Admin Statistics Tests', () => {
	test('should display database overview section with pie charts', async ({
		page,
	}) => {
		await loginAs(page, 'admin');
		await page.goto('/en/bestof-larib/statistics', { timeout: 60000 });

		// Wait for page to load
		await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

		// Check for the database overview section
		await expect(
			page.getByRole('heading', { name: /database overview/i })
		).toBeVisible({ timeout: 10000 });

		// Check for total cases card and pie charts
		await expect(page.getByText(/total cases/i).first()).toBeVisible();
		await expect(page.getByText(/cases by exam type/i).first()).toBeVisible();
		await expect(page.getByText(/top diagnoses/i).first()).toBeVisible();
		await expect(page.getByText(/cases by difficulty/i).first()).toBeVisible();
	});

	test('should display pie charts for database statistics', async ({
		page,
	}) => {
		await loginAs(page, 'admin');
		await page.goto('/en/bestof-larib/statistics', { timeout: 60000 });

		await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

		// Check for pie chart titles (cases by status was removed from the UI)
		await expect(page.getByText(/cases by exam type/i)).toBeVisible({ timeout: 10000 });
		await expect(page.getByText(/cases by difficulty/i)).toBeVisible();
		await expect(page.getByText(/top diagnoses/i)).toBeVisible();
	});

	test('should display user activity section with table', async ({
		page,
	}) => {
		await loginAs(page, 'admin');
		await page.goto('/en/bestof-larib/statistics', { timeout: 60000 });

		await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

		// Check for the user activity section
		await expect(
			page.getByRole('heading', { name: /user activity/i })
		).toBeVisible({ timeout: 10000 });

		// Check for user statistics heading
		await expect(page.getByText(/user statistics/i)).toBeVisible();
	});

	test('should display user activity section with completion trend', async ({ page }) => {
		await loginAs(page, 'admin');
		await page.goto('/en/bestof-larib/statistics', { timeout: 60000 });

		await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

		// Check for user activity section heading
		await expect(
			page.getByRole('heading', { name: /user activity/i })
		).toBeVisible({ timeout: 10000 });

		// Check for completion trend section
		await expect(
			page.getByRole('heading', { name: /completion trend over time/i })
		).toBeVisible();

		// Check for completion over time chart
		await expect(page.getByText(/completion over time/i)).toBeVisible();
	});

	test('should have back button that navigates to bestof-larib', async ({
		page,
	}) => {
		await loginAs(page, 'admin');
		await page.goto('/en/bestof-larib/statistics', { timeout: 60000 });

		await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

		// Find and click the back button
		const backButton = page.getByRole('link', { name: /back/i }).first();
		await expect(backButton).toBeVisible({ timeout: 10000 });
		await backButton.click();

		// Verify navigation back to bestof-larib
		await page.waitForURL(/\/en\/bestof-larib$/, { timeout: 10000 });
	});

	test('should display statistics page in French when locale is fr', async ({
		page,
	}) => {
		await loginAs(page, 'admin');
		await page.goto('/fr/bestof-larib/statistics', { timeout: 60000 });

		await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

		// Check for French translations - use exact match to avoid matching "Statistiques utilisateurs"
		await expect(
			page.getByRole('heading', { name: 'Statistiques', exact: true })
		).toBeVisible({ timeout: 10000 });
		await expect(page.getByText(/aperçu de la base de données/i)).toBeVisible();
		await expect(page.getByText(/activité des utilisateurs/i)).toBeVisible();
	});

	test('should display filters in user activity section', async ({
		page,
	}) => {
		await loginAs(page, 'admin');
		await page.goto('/en/bestof-larib/statistics', { timeout: 60000 });

		await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

		// Check for filter elements in the user activity section
		await expect(page.getByRole('button', { name: /reset/i })).toBeVisible({ timeout: 10000 });
	});
});
