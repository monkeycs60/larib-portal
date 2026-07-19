import { test, expect, type Page } from '@playwright/test'

test.setTimeout(60000)

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/en/login', { timeout: 60000 })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill('ristifou')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

test('publications member adds authors manually and by DOI', async ({ page }) => {
  await login(page, 'publications-user@larib-portal.test')

  // Manual entry: create a new author. Retry-safe: if the author already exists
  // from a previous attempt, the name-duplicate dialog appears -> confirm and proceed.
  await page.goto('/en/publications/authors/new', { timeout: 60000 })
  await expect(page.getByRole('heading', { name: 'Add author' })).toBeVisible()
  await page.getByPlaceholder('Pierre').fill('Yuki')
  await page.getByPlaceholder('Lefèvre').fill('Tanaka')
  await page.getByRole('button', { name: 'MD', exact: true }).click()
  await page.getByRole('button', { name: 'Add to bank' }).click()
  await page.getByRole('button', { name: 'Add anyway' }).click({ timeout: 3000 }).catch(() => {})
  await expect(page).toHaveURL(/\/publications\/authors$/, { timeout: 30000 })
  await expect(page.getByText('Tanaka').first()).toBeVisible()

  // DOI import (fixture-seamed, offline). Retry-safe: add the fetched authors when
  // they are new, otherwise verify they are flagged as already in the bank.
  await page.goto('/en/publications/authors/new', { timeout: 60000 })
  await page.getByRole('radio', { name: 'From DOI / PMID' }).click()
  await page.getByPlaceholder('10.1056/NEJMoa2501144 or 40218847').fill('10.1056/NEJMoa2501144')
  await page.getByRole('button', { name: 'Fetch' }).click()
  await expect(page.getByText('Transcatheter aortic-valve replacement')).toBeVisible({ timeout: 30000 })
  await expect(page.getByText('Marino').first()).toBeVisible()

  const addButton = page.getByRole('button', { name: /Add \d+ to bank/ })
  if (await addButton.isEnabled().catch(() => false)) {
    await addButton.click()
    await expect(page).toHaveURL(/\/publications\/authors$/, { timeout: 30000 })
    await expect(page.getByText('Marino').first()).toBeVisible()
  } else {
    await expect(page.getByText(/Already in bank/i).first()).toBeVisible()
  }
})
