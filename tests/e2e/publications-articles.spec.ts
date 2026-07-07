import { test, expect, type Page } from '@playwright/test'

test.setTimeout(60000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('admin browses articles and opens a detail with authors + centre', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')

  // Import the fixture papers (creates articles + affiliations + centres)
  await page.goto('/en/publications/admin', { timeout: 60000 })
  await page.getByRole('button', { name: /^search$/i }).click()
  await expect(page.getByRole('button', { name: /import selected \(2\)/i })).toBeVisible()
  await page.getByRole('button', { name: /import selected \(2\)/i }).click()
  await expect(page.getByRole('paragraph').filter({ hasText: /imported/i })).toBeVisible()

  // Articles list shows the imported title
  await page.goto('/en/publications/admin/articles', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: /^articles$/i })).toBeVisible()
  const titleLink = page.getByRole('link', { name: /Multimodal imaging of the mitral valve/i })
  await expect(titleLink).toBeVisible()

  // Detail shows the author with the auto-extracted centre
  await titleLink.click()
  await expect(page.getByRole('heading', { name: /Multimodal imaging of the mitral valve/i })).toBeVisible()
  await expect(page.getByText(/Lariboisière/i)).toBeVisible()
})
