import { test, expect, type Page } from '@playwright/test'

test.setTimeout(60000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('admin imports a study from ClinicalTrials.gov', async ({ page }) => {
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin/studies', { timeout: 60000 })

  await page.getByRole('button', { name: /import from clinicaltrials/i }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  await dialog.getByPlaceholder('NCT06235385').fill('NCT06235385')
  await dialog.getByRole('button', { name: /^fetch$/i }).click()

  // Preview appears (served from the local fixture) with core fields + resolved lists
  await expect(dialog.getByText(/Multiple and Mixed Valvular/i)).toBeVisible({ timeout: 20000 })
  await expect(dialog.getByText('EACVI-MMVD')).toBeVisible()
  await expect(dialog.getByText(/Assistance Publique Hôpitaux de Paris/i)).toBeVisible()
  await expect(dialog.getByText(/PEZEL/i)).toBeVisible()

  await dialog.getByRole('button', { name: /import study/i }).click()

  // Study persisted and listed with imported enrollment
  const row = page.getByRole('row', { name: /Multiple and Mixed Valvular/i })
  await expect(row).toBeVisible({ timeout: 30000 })
  await expect(row.getByText('1,500')).toBeVisible()

  // Open the detail page and verify the rich sections rendered
  await row.getByRole('link').last().click()
  await expect(page.getByRole('heading', { level: 1, name: /Multiple and Mixed Valvular/i })).toBeVisible({ timeout: 20000 })
  await expect(page.getByText('NCT06235385').first()).toBeVisible()
  await expect(page.getByText(/Investigating centres/i)).toBeVisible()
  await expect(page.getByText(/Assistance Publique Hôpitaux de Paris/i)).toBeVisible()
  await expect(page.getByText(/PEZEL/i).first()).toBeVisible()
})
