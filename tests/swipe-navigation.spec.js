import { test, expect } from '@playwright/test'
import { login, navigateToTab } from './helpers.js'

/**
 * Swipe navigation tests
 * Verifies tab swiping is self-contained (no browser back/forward)
 * and works consistently across all tabs including short-content ones
 *
 * Wheel direction mapping:
 *   wheel(+deltaX, 0) = scroll right = next tab
 *   wheel(-deltaX, 0) = scroll left  = previous tab
 */

test.describe('MyCorner Tab Swipe Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/my-corner')
    await page.waitForSelector('.card, .error-message', { timeout: 15000 })
  })

  test('wheel swipe switches to next tab', async ({ page }) => {
    const cardTab = page.getByRole('button', { name: 'Card', exact: true })
    await expect(cardTab).toHaveCSS('font-weight', '600')

    const container = page.locator('[style*="touch-action"]').first()
    await container.hover()
    await page.mouse.wheel(120, 0) // next tab
    await page.waitForTimeout(700)

    const reviewsTab = page.getByRole('button', { name: 'Reviews', exact: true })
    await expect(reviewsTab).toHaveCSS('font-weight', '600')
    expect(page.url()).toContain('/my-corner')
  })

  test('wheel swipe switches to previous tab', async ({ page }) => {
    await navigateToTab(page, 'Reviews')

    const container = page.locator('[style*="touch-action"]').first()
    await container.hover()
    await page.mouse.wheel(-120, 0) // previous tab
    await page.waitForTimeout(700)

    const cardTab = page.getByRole('button', { name: 'Card', exact: true })
    await expect(cardTab).toHaveCSS('font-weight', '600')
    expect(page.url()).toContain('/my-corner')
  })

  test('swipe at boundary does not trigger browser back', async ({ page }) => {
    // Build browser history so back would go somewhere
    await page.goto('/friends')
    await page.waitForTimeout(500)
    await page.goto('/my-corner')
    await page.waitForSelector('.card, .error-message', { timeout: 15000 })

    // On Card tab (first), swipe toward previous - no tab to go to
    const container = page.locator('[style*="touch-action"]').first()
    await container.hover()
    await page.mouse.wheel(-120, 0) // previous (none exists)
    await page.waitForTimeout(700)

    // Should still be on /my-corner, NOT /friends (browser back)
    expect(page.url()).toContain('/my-corner')
  })

  test('rapid swipes do not skip tabs', async ({ page }) => {
    const container = page.locator('[style*="touch-action"]').first()
    await container.hover()

    // Fire two rapid next-tab swipes
    await page.mouse.wheel(120, 0)
    await page.mouse.wheel(120, 0)
    await page.waitForTimeout(700)

    // Should only advance ONE tab (cooldown blocks second)
    const reviewsTab = page.getByRole('button', { name: 'Reviews', exact: true })
    await expect(reviewsTab).toHaveCSS('font-weight', '600')
  })

  test('La Liste tab swipes forward', async ({ page }) => {
    await navigateToTab(page, 'La Liste')

    const container = page.locator('[style*="touch-action"]').first()
    await container.hover()
    await page.mouse.wheel(120, 0) // next tab
    await page.waitForTimeout(700)

    const wishlistTab = page.getByRole('button', { name: 'Wishlist', exact: true })
    await expect(wishlistTab).toHaveCSS('font-weight', '600')
    expect(page.url()).toContain('/my-corner')
  })

  test('La Liste tab swipes backward', async ({ page }) => {
    await navigateToTab(page, 'La Liste')

    const container = page.locator('[style*="touch-action"]').first()
    await container.hover()
    await page.mouse.wheel(-120, 0) // previous tab
    await page.waitForTimeout(700)

    const reviewsTab = page.getByRole('button', { name: 'Reviews', exact: true })
    await expect(reviewsTab).toHaveCSS('font-weight', '600')
  })
})
