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
  await expect(page.getByRole('heading', { name: /centres/i })).toBeVisible()
  await expect(page.getByRole('row', { name: /Lariboisière/i })).toBeVisible()
  await page.getByRole('row', { name: /Lariboisière/i }).getByRole('switch').click()
  await expect(page.getByText(/updated/i)).toBeVisible()
})
