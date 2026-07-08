import { test, expect, type Page } from '@playwright/test'

test.setTimeout(60000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('admin creates a study', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin/studies', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: /studies/i })).toBeVisible()

  await page.getByRole('button', { name: /new study/i }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // First textbox in the dialog is the study title
  await dialog.getByRole('textbox').first().fill('MULTIVALVE registry E2E')
  await dialog.getByRole('button', { name: /^save$/i }).click()

  await expect(page.getByRole('cell', { name: /MULTIVALVE registry E2E/i })).toBeVisible()
})
