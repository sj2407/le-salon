import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

// iPhone 14 viewport dimensions (Chromium — validates layout, not Safari rendering)
test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
})

test.describe('Card layout on iPhone viewport', () => {
  test('card sections are centered and properly laid out', async ({ page }) => {
    await login(page)

    // Navigate to My Corner > Card tab
    await page.goto('/my-corner')
    await page.waitForTimeout(2000) // Wait for card data to load

    // Take full-page screenshot
    await page.screenshot({
      path: 'tests/screenshots/iphone-card-full.png',
      fullPage: true,
    })

    // Check that the grid exists
    const grid = page.locator('.grid')
    await expect(grid).toBeVisible()

    // Check that section boxes are visible
    const sectionBoxes = page.locator('.section-box')
    const count = await sectionBoxes.count()
    expect(count).toBeGreaterThan(0)

    // Verify each section-box is within viewport width (centered, not overflowing)
    const viewportWidth = 390
    for (let i = 0; i < count; i++) {
      const box = await sectionBoxes.nth(i).boundingBox()
      if (box) {
        // Section should not overflow left or right of viewport
        expect(box.x).toBeGreaterThanOrEqual(-5) // small tolerance for transforms
        expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth + 5)
        // Section should have reasonable width (at least 60% of viewport on mobile = single col)
        expect(box.width).toBeGreaterThan(viewportWidth * 0.6)
      }
    }

    // Check that drag handles are visible (own card)
    const dragHandles = page.locator('[style*="cursor: grab"]')
    const handleCount = await dragHandles.count()
    expect(handleCount).toBeGreaterThan(0)

    // Take a viewport-only screenshot for quick visual check
    await page.screenshot({
      path: 'tests/screenshots/iphone-card-viewport.png',
    })
  })
})
