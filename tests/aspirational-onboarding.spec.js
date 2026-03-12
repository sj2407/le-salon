import { test, expect } from '@playwright/test'
import { navigateToTab } from './helpers.js'

const SCREENSHOT_DIR = 'tests/test_screenshots/onboarding'

// Fresh empty user credentials — created/deleted via Supabase admin API
const EMPTY_USER_EMAIL = 'test-onboarding-empty@lesalon-test.com'
const EMPTY_USER_PASSWORD = 'TestOnboarding2026!'
const EMPTY_USER_NAME = 'Onboarding Tester'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Create a fresh empty user via Supabase admin API.
 * Returns the user id.
 */
async function createEmptyUser() {
  // First try to delete if leftover from a previous failed run
  await deleteEmptyUser()

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      email: EMPTY_USER_EMAIL,
      password: EMPTY_USER_PASSWORD,
      email_confirm: true, // skip email confirmation
      user_metadata: {
        display_name: EMPTY_USER_NAME,
        username: 'onboarding_tester',
      },
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Failed to create test user: ${JSON.stringify(data)}`)

  // Profile is auto-created by handle_new_user() trigger
  return data.id
}

/**
 * Delete the empty test user and cascade all data.
 * Uses PostgREST to find user by email, then admin API to delete.
 */
async function deleteEmptyUser() {
  // Find profile by email
  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(EMPTY_USER_EMAIL)}&select=id`,
    {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    }
  )
  const profiles = await profileRes.json()
  if (!Array.isArray(profiles) || profiles.length === 0) return

  const userId = profiles[0].id

  // Delete auth user (profile cascades via FK)
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })
}

/**
 * Log in the empty test user via the sign-in page.
 */
async function loginEmptyUser(page) {
  await page.goto('/signin')
  await page.fill('input[type="email"]', EMPTY_USER_EMAIL)
  await page.fill('input[type="password"]', EMPTY_USER_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('/', { timeout: 10000 })
}

// ───────────────────────────────────────────
// Tests with a FRESH EMPTY user (preview SHOULD show)
// ───────────────────────────────────────────
test.describe('Aspirational Onboarding — Empty User', () => {
  test.setTimeout(60000) // these tests wait for fade timers

  let userId

  test.beforeAll(async () => {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error('Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env')
    }
    userId = await createEmptyUser()
  })

  test.afterAll(async () => {
    await deleteEmptyUser()
  })

  test('reviews preview shows for empty user', async ({ page }) => {
    await loginEmptyUser(page)
    await navigateToTab(page, 'Reviews')
    await page.waitForTimeout(3000)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/empty-01-reviews-preview.png`, fullPage: true })

    // The overlay text MUST be visible for an empty user
    const overlayText = page.locator('text=what it can look like')
    await expect(overlayText).toBeVisible({ timeout: 5000 })

    // Skip button must be present
    const skipButton = page.locator('button:has-text("Skip")')
    await expect(skipButton).toBeVisible()

    // Showcase content should be rendered
    const showcaseContent = page.locator('text=Reviews')
    await expect(showcaseContent.first()).toBeVisible()
  })

  test('preview auto-fades after timer completes', async ({ page }) => {
    await loginEmptyUser(page)
    await navigateToTab(page, 'Reviews')

    const overlayText = page.locator('text=what it can look like')
    await expect(overlayText).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: `${SCREENSHOT_DIR}/empty-02-reviews-before-fade.png`, fullPage: true })

    // Wait for auto-fade (5s preview + 2s transition + buffer)
    await page.waitForTimeout(8000)

    // Overlay should be gone
    await expect(overlayText).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOT_DIR}/empty-03-reviews-after-fade.png`, fullPage: true })
  })

  test('skip button dismisses preview immediately', async ({ page }) => {
    await loginEmptyUser(page)
    await navigateToTab(page, 'Reviews')

    const overlayText = page.locator('text=what it can look like')
    await expect(overlayText).toBeVisible({ timeout: 5000 })

    // Click skip
    await page.click('button:has-text("Skip")')

    // Overlay gone immediately
    await expect(overlayText).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOT_DIR}/empty-04-skip-result.png`, fullPage: true })
  })

  test('preview shows again on revisit (no localStorage gating)', async ({ page }) => {
    await loginEmptyUser(page)
    await navigateToTab(page, 'Reviews')

    const overlayText = page.locator('text=what it can look like')
    await expect(overlayText).toBeVisible({ timeout: 5000 })

    // Skip to dismiss
    await page.click('button:has-text("Skip")')
    await expect(overlayText).not.toBeVisible()

    // Navigate away and back
    await navigateToTab(page, 'Wishlist')
    await page.waitForTimeout(1000)
    await navigateToTab(page, 'Reviews')
    await page.waitForTimeout(2000)

    // Preview should show AGAIN (no localStorage blocking)
    await expect(overlayText).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: `${SCREENSHOT_DIR}/empty-05-revisit-shows-again.png`, fullPage: true })
  })

  test('wishlist preview shows for empty user', async ({ page }) => {
    await loginEmptyUser(page)
    await navigateToTab(page, 'Wishlist')
    await page.waitForTimeout(3000)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/empty-06-wishlist-preview.png`, fullPage: true })

    const overlayText = page.locator('text=what it can look like')
    await expect(overlayText).toBeVisible({ timeout: 5000 })
  })

  test('la liste preview shows for empty user', async ({ page }) => {
    await loginEmptyUser(page)
    await navigateToTab(page, 'La Liste')
    await page.waitForTimeout(3000)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/empty-07-liste-preview.png`, fullPage: true })

    const overlayText = page.locator('text=what it can look like')
    await expect(overlayText).toBeVisible({ timeout: 5000 })
  })

  test('portrait preview shows for empty user', async ({ page }) => {
    await loginEmptyUser(page)
    await navigateToTab(page, 'Portrait')
    await page.waitForTimeout(3000)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/empty-08-portrait-preview.png`, fullPage: true })

    const overlayText = page.locator('text=what it can look like')
    await expect(overlayText).toBeVisible({ timeout: 5000 })
  })

  test('card preview shows for empty user', async ({ page }) => {
    await loginEmptyUser(page)
    await navigateToTab(page, 'Card')
    await page.waitForTimeout(3000)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/empty-09-card-preview.png`, fullPage: true })

    const overlayText = page.locator('text=what it can look like')
    await expect(overlayText).toBeVisible({ timeout: 5000 })
  })

  test('mobile viewport preview renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await loginEmptyUser(page)
    await navigateToTab(page, 'Reviews')
    await page.waitForTimeout(3000)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/empty-10-mobile-375px.png`, fullPage: true })

    const overlayText = page.locator('text=what it can look like')
    await expect(overlayText).toBeVisible({ timeout: 5000 })
  })
})

// ───────────────────────────────────────────
// Tests with existing user (preview should NOT show)
// ───────────────────────────────────────────
test.describe('Aspirational Onboarding — User With Data', () => {
  const login = async (page) => {
    const email = process.env.TEST_EMAIL
    const password = process.env.TEST_PASSWORD
    if (!email || !password) throw new Error('Missing TEST_EMAIL/TEST_PASSWORD in .env')
    await page.goto('/signin')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/', { timeout: 10000 })
  }

  test('no preview on reviews tab when user has data', async ({ page }) => {
    await login(page)
    await navigateToTab(page, 'Reviews')
    await page.waitForTimeout(2000)

    // User has reviews — no overlay should appear
    const overlayText = page.locator('text=what it can look like')
    await expect(overlayText).not.toBeVisible()

    // Normal content renders
    const reviews = page.locator('[id^="review-"]')
    expect(await reviews.count()).toBeGreaterThan(0)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/data-01-reviews-no-preview.png`, fullPage: true })
  })

  test('no preview on wishlist tab when user has data', async ({ page }) => {
    await login(page)
    await navigateToTab(page, 'Wishlist')
    await page.waitForTimeout(2000)

    const overlayText = page.locator('text=what it can look like')
    await expect(overlayText).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOT_DIR}/data-02-wishlist-no-preview.png`, fullPage: true })
  })
})
