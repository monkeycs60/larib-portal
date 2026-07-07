import { test, expect, type Page } from '@playwright/test'

test.setTimeout(60000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('admin adds a journal from Crossref', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin/journals', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: /journals/i })).toBeVisible()

  // seed already has "European Heart Journal"
  await expect(page.getByRole('cell', { name: /European Heart Journal/i })).toBeVisible()

  // Crossref search (fixture) -> add Circulation
  await page.getByPlaceholder(/journal name/i).fill('circulation')
  await page.getByRole('button', { name: /search crossref/i }).click()
  await page.getByText(/^Circulation ·/).locator('..').getByRole('button', { name: /^add$/i }).click()
  await expect(page.getByRole('cell', { name: /^Circulation$/ })).toBeVisible()
})
