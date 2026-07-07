import { test, expect, type Page } from '@playwright/test'

test.setTimeout(60000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('Publications access: member reaches app in EN and FR, blocked from portal admin', async ({ page }) => {
  await login(page, 'publications-user@larib-portal.test')

  await page.goto('/en/publications', { timeout: 60000 })
  await expect(page).toHaveURL(/\/en\/publications/)
  await expect(page.getByRole('heading', { name: /my publications/i })).toBeVisible()

  await page.goto('/fr/publications', { timeout: 60000 })
  await expect(page).toHaveURL(/\/fr\/publications/)
  await expect(page.getByRole('heading', { name: /mes publications/i })).toBeVisible()

  const adminResp = await page.goto('/en/admin/users', { timeout: 60000 })
  expect(adminResp?.status()).toBe(404)
})

test('Publications gating: user without access is redirected away', async ({ page }) => {
  await login(page, 'bestof-admin@larib-portal.test')
  await page.goto('/en/publications', { timeout: 60000 })
  await expect(page).not.toHaveURL(/publications/)
})
