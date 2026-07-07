import { test, expect, type Page } from '@playwright/test'

test.setTimeout(60000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('import creates a centre, admin curates it', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')

  // Import the fixture papers -> creates affiliations + auto-extracted centres
  await page.goto('/en/publications/admin', { timeout: 60000 })
  await page.getByRole('button', { name: /^search$/i }).click()
  await expect(page.getByRole('button', { name: /import selected \(2\)/i })).toBeVisible()
  await page.getByRole('button', { name: /import selected \(2\)/i }).click()
  await expect(page.getByRole('paragraph').filter({ hasText: /imported/i })).toBeVisible()

  // Centres bank shows the auto-extracted centre
  await page.goto('/en/publications/admin/centres', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: /centres/i })).toBeVisible()
  await expect(page.getByRole('row', { name: /Lariboisière/i })).toBeVisible()

  // Flag it as our centre
  await page.getByRole('row', { name: /Lariboisière/i }).getByRole('switch').click()
  await expect(page.getByText(/updated/i)).toBeVisible()
})
