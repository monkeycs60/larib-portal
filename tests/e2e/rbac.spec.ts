import { test, expect, type Page } from '@playwright/test'

test.setTimeout(60000)

async function login(page: Page, email: string) {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => url.pathname === '/en/dashboard', { timeout: 60000 })
}

test('Congés admin: manages leave, blocked from portal admin and Bestof stats', async ({ page }) => {
  await login(page, 'conges-admin@larib-portal.test')
  await page.goto('/en/conges', { timeout: 60000 })
  await expect(page).toHaveURL(/\/en\/conges/)                 // has CONGES access
  const adminResp = await page.goto('/en/admin/users', { timeout: 60000 })
  expect(adminResp?.status()).toBe(404)                        // super-admin only -> notFound
  await page.goto('/en/bestof-larib/statistics', { timeout: 60000 })
  await expect(page).not.toHaveURL(/statistics/)               // not a Bestof admin -> redirected
})

test('Bestof admin: reaches Bestof stats, blocked from portal admin', async ({ page }) => {
  await login(page, 'bestof-admin@larib-portal.test')
  await page.goto('/en/bestof-larib/statistics', { timeout: 60000 })
  await expect(page).toHaveURL(/statistics/)                   // is a Bestof admin
  const adminResp = await page.goto('/en/admin/users', { timeout: 60000 })
  expect(adminResp?.status()).toBe(404)
})

test('Super-admin: reaches portal user management', async ({ page }) => {
  await login(page, 'test-admin@larib-portal.test')
  const resp = await page.goto('/en/admin/users', { timeout: 60000 })
  expect(resp?.status()).toBe(200)
  await expect(page.locator('table')).toBeVisible()
})
