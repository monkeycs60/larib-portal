import { test, expect, type Page } from '@playwright/test'

test.setTimeout(60000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('admin browses, edits and merges authors', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin/authors', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'Authors', exact: true })).toBeVisible()

  // Two seeded authors are present (displayed as "FirstName LASTNAME")
  await expect(page.getByRole('row', { name: /Jane COAUTHOR/i })).toBeVisible()

  // Edit the first-author row
  await page.getByRole('row', { name: /Publications USER/i }).getByRole('button', { name: /^edit$/i }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // The centre picker is searchable by name
  await dialog.getByRole('combobox').filter({ hasText: /add centre/i }).click()
  const centreSearch = page.getByPlaceholder(/search centre/i)
  await expect(centreSearch).toBeVisible()
  await centreSearch.fill('lariboisi')
  await expect(page.getByRole('option', { name: /Lariboisière/i })).toBeVisible()
  await page.getByRole('option', { name: /Lariboisière/i }).click()
  await expect(dialog.getByText(/Lariboisière/i)).toBeVisible()

  await page.getByRole('button', { name: /save changes/i }).click()
  await expect(page.getByText(/author updated/i)).toBeVisible()

  // Merge the two seeded authors (same single article -> keeper keeps 1 authorship)
  const rows = page.locator('tbody tr')
  await rows.nth(0).getByRole('checkbox').click()
  await rows.nth(1).getByRole('checkbox').click()
  await page.getByRole('button', { name: /merge duplicates/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: /^merge$/i }).click()
  await expect(page.getByText(/merged:/i)).toBeVisible()
})
