import { test, expect, type Page } from '@playwright/test'

test.setTimeout(60000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('admin curates a centre', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin/centres', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'Centres', exact: true })).toBeVisible()
  const row = page.getByRole('row', { name: /Lariboisière/i }).first()
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: /save changes/i }).click()
  await expect(page.getByText(/centre updated/i)).toBeVisible()
})
