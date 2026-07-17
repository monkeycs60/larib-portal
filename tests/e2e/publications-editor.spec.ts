import { test, expect, type Page } from '@playwright/test'

test.setTimeout(90000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('user creates + edits a publication and requests the author list; admin resolves it', async ({ page }) => {
  await login(page, 'publications-user@larib-portal.test')

  // Create a draft from My Publications
  await page.goto('/en/publications', { timeout: 60000 })
  await page.getByRole('button', { name: /new publication/i }).click()
  await page.waitForURL('**/edit', { timeout: 60000 })

  // Edit the header (title + status) and save
  const title = `TAVR low-risk 5-year outcomes ${Date.now()}`
  await page.getByPlaceholder('Publication title').fill(title)
  await page.getByRole('combobox').nth(1).selectOption('UNDER_REVIEW')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Changes saved')).toBeVisible({ timeout: 15000 })

  // Add a submission
  const journalName = `E2E Journal ${Date.now()}`
  await page.getByRole('button', { name: 'Add a submission' }).click()
  await page.getByPlaceholder('e.g. Circulation').fill(journalName)
  await page.locator('input[type="date"]').first().fill('2025-05-18')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText(journalName).first()).toBeVisible({ timeout: 15000 })

  // Request the author list to the admin
  await page.getByPlaceholder(/Marie Lambert/).fill('Dr. Test helped with imaging analysis')
  await page.getByRole('button', { name: /request author list to admin/i }).click()
  await expect(page.getByText('Request sent to the admin')).toBeVisible({ timeout: 15000 })

  // Admin resolves the request
  await page.context().clearCookies()
  await login(page, 'publications-admin@larib-portal.test')
  await page.goto('/en/publications/admin', { timeout: 60000 })
  const requestRow = page.getByText(title)
  await expect(requestRow).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: 'Resolve' }).first().click()
  await expect(page.getByText('Request resolved')).toBeVisible({ timeout: 15000 })
  await expect(page.getByText(title)).toHaveCount(0, { timeout: 15000 })
})
