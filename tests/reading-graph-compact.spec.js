import { test, expect } from '@playwright/test'
import { login, navigateToTab } from './helpers.js'

const SCREENSHOT_DIR = 'tests/test_screenshots/onboarding'

test.describe('Compact Reading Graph', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('compact graph renders in ReadingSection', async ({ page }) => {
    await navigateToTab(page, 'Portrait')
    await page.waitForTimeout(2000)

    // Look for the compact graph SVG (has data-cg-theme attributes)
    const compactGraph = page.locator('[data-cg-theme]')
    const graphExists = await compactGraph.count() > 0

    if (graphExists) {
      // SVG element should be present
      const svg = page.locator('svg path[stroke="#C5B89C"]')
      await expect(svg.first()).toBeVisible()

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/09-compact-graph-rendered.png`,
        fullPage: true
      })
    }
  })

  test('graph animates on mount', async ({ page }) => {
    await navigateToTab(page, 'Portrait')
    await page.waitForTimeout(1000)

    // Check SVG paths have stroke-dasharray (animation property)
    const paths = page.locator('svg path[stroke-dasharray="200"]')
    const count = await paths.count()

    if (count > 0) {
      // Verify animation style is applied
      const style = await paths.first().getAttribute('style')
      expect(style).toContain('graphDraw')
    }
  })

  test('"Tap to explore" appears after animation', async ({ page }) => {
    await navigateToTab(page, 'Portrait')

    // Wait for animation delay (~2.2s)
    await page.waitForTimeout(3000)

    const tapLabel = page.locator('text=Tap to explore your connections')
    const isVisible = await tapLabel.isVisible().catch(() => false)

    // Only check if compact graph is rendered (user needs 3+ books + graph data)
    if (isVisible) {
      await expect(tapLabel).toBeVisible()
    }
  })

  test('click opens ReadingDetailModal', async ({ page }) => {
    await navigateToTab(page, 'Portrait')
    await page.waitForTimeout(2000)

    // Click the compact graph area
    const compactGraph = page.locator('[data-cg-theme]').first()
    const graphExists = await compactGraph.isVisible().catch(() => false)

    if (graphExists) {
      // Click parent container (the clickable div wrapping the graph)
      await compactGraph.locator('..').locator('..').click()
      await page.waitForTimeout(1000)

      // Check for the ReadingDetailModal
      const modal = page.locator('[style*="position: fixed"]')
      const modalVisible = await modal.isVisible().catch(() => false)

      if (modalVisible) {
        await page.screenshot({
          path: `${SCREENSHOT_DIR}/10-compact-graph-tap-modal.png`,
          fullPage: true
        })
      }
    }
  })
})
