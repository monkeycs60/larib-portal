import { test, expect, type Page } from '@playwright/test'

test.setTimeout(120000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('admin imports the PubMed backlog with curation, idempotent on re-run', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: /import from pubmed/i })).toBeVisible()

  const rows = page.locator('tbody tr')

  // Search (fixture returns 2 candidates, all selected by default)
  await page.getByRole('button', { name: /^search$/i }).click()
  await expect(page.getByText(/2 papers found/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /import selected \(2\)/i })).toBeVisible()

  // Curate: uncheck the 2nd paper (the editorial to exclude) -> count drops to 1
  await rows.nth(1).getByRole('checkbox').click()
  await expect(page.getByRole('button', { name: /import selected \(1\)/i })).toBeVisible()

  // Import selected (1)
  await page.getByRole('button', { name: /import selected \(1\)/i }).click()
  await expect(
    page.getByRole('paragraph').filter({ hasText: /(?:1 imported, 0 already present|0 imported, 1 already present)/i }),
  ).toBeVisible({ timeout: 30000 })

  // Re-search resets selection to all -> re-curate -> re-import -> idempotent (skipped)
  await page.getByRole('button', { name: /^search$/i }).click()
  await expect(page.getByRole('button', { name: /import selected \(2\)/i })).toBeVisible()
  await rows.nth(1).getByRole('checkbox').click()
  await expect(page.getByRole('button', { name: /import selected \(1\)/i })).toBeVisible()
  await page.getByRole('button', { name: /import selected \(1\)/i }).click()
  await expect(page.getByRole('paragraph').filter({ hasText: /0 imported, 1 already present/i })).toBeVisible({ timeout: 30000 })
})
