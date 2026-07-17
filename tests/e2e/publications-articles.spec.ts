import { test, expect, type Page } from '@playwright/test'

test.setTimeout(60000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('admin browses articles and opens a detail with authors', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin/articles', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: /^articles$/i })).toBeVisible()
  const titleLink = page.getByRole('link', { name: /Outcomes of multi-valve intervention/i })
  await expect(titleLink).toBeVisible()
  await Promise.all([
    page.waitForURL(/\/en\/publications\/articles\/[^/]+$/, { timeout: 30000 }),
    titleLink.click(),
  ])
  await expect(page.getByRole('heading', { name: /Outcomes of multi-valve intervention/i })).toBeVisible({ timeout: 30000 })
  await expect(page.getByText(/Publications USER/i)).toBeVisible()
  await expect(page.getByText(/Jane COAUTHOR/i)).toBeVisible()
})
