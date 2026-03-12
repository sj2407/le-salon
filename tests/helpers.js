/**
 * Test helpers for Le Salon UI tests
 *
 * Credentials are loaded automatically from .env file.
 * Required: TEST_EMAIL and TEST_PASSWORD
 */

export async function login(page) {
  const email = process.env.TEST_EMAIL
  const password = process.env.TEST_PASSWORD

  if (!email || !password) {
    throw new Error(
      'Missing test credentials. Ensure TEST_EMAIL and TEST_PASSWORD are set in .env file.'
    )
  }

  await page.goto('/signin')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')

  // Wait for redirect to home page
  await page.waitForURL('/', { timeout: 10000 })
}

export async function waitForModalOpen(page, timeout = 5000) {
  await page.waitForSelector('[style*="position: fixed"]', { timeout })
}

export async function waitForModalClose(page, timeout = 5000) {
  await page.waitForSelector('[style*="position: fixed"]', { state: 'detached', timeout })
}

/**
 * Navigate to a tab in MyCorner (Card, Reviews, La Liste, Wishlist)
 */
export async function navigateToTab(page, tabName) {
  // Ensure we're on My Corner first (login lands on The Salon)
  if (!page.url().includes('/my-corner')) {
    await page.goto('/my-corner')
    await page.waitForTimeout(500)
  }
  await page.click(`button:has-text("${tabName}")`)
  // Wait for tab content to render
  await page.waitForTimeout(500)
}

/**
 * Interaction test checklist - every modal/overlay should pass these
 */
export const INTERACTION_CHECKLIST = [
  'opens on trigger',
  'displays existing content',
  'allows editing',
  'saves changes',
  'cancel button works',
  'escape key closes',
  'click outside closes',
  'no page flash on save'
]
