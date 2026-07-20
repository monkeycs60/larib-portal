import { test, expect, type Page } from '@playwright/test'

test.setTimeout(60000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('admin creates and curates a centre', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin/centres', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'Centres', exact: true })).toBeVisible()

  // Create a new centre through the redesigned modal (short code + parent + location)
  await page.getByRole('button', { name: /add centre/i }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByPlaceholder('Hôpital Lariboisière').fill('Institut Test Cardio')
  await dialog.getByPlaceholder('LRB').fill('ITC')
  await dialog.getByPlaceholder(/INSERM/).fill('INSERM')
  await dialog.getByPlaceholder('Paris').fill('Lyon')
  await dialog.getByPlaceholder('France').fill('France')
  await page.getByRole('button', { name: /add to bank/i }).click()
  // Assert the persistent outcome (row + parent org) rather than the transient toast
  const createdRow = page.getByRole('row', { name: /Institut Test Cardio/i })
  await expect(createdRow).toBeVisible({ timeout: 30000 })
  await expect(createdRow.getByText('INSERM')).toBeVisible()
  await expect(createdRow.getByText('Lyon')).toBeVisible()

  // Edit an existing centre
  const row = page.getByRole('row', { name: /Lariboisière/i }).first()
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: /save changes/i }).click()
  await expect(page.getByText(/centre updated/i)).toBeVisible({ timeout: 20000 })
})
