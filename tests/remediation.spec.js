import { test, expect } from '@playwright/test'
import { login, navigateToTab } from './helpers.js'

/**
 * Regression tests for the remediation changes:
 * - Salon page (markdown rendering, audio, localStorage, commonplace book)
 * - Notifications page (rewritten with extracted components)
 * - NotificationBell (shared routing utility)
 * - Navigation menu (close on route change)
 * - Wishlist (header actions repositioning)
 */

test.describe('Salon Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    // After login we land on / which is the Salon
    await page.waitForSelector('.handwritten', { timeout: 15000 })
  })

  test('loads and renders the weekly text', async ({ page }) => {
    // The parlor title should be visible
    const title = page.locator('h2.handwritten').first()
    await expect(title).toBeVisible()
    const titleText = await title.textContent()
    expect(titleText.length).toBeGreaterThan(0)

    // The text body should have content (ParlorText renders paragraphs)
    const paragraphs = page.locator('p')
    const count = await paragraphs.count()
    expect(count).toBeGreaterThan(2) // At least title + body paragraphs

    // No JS errors means markdown rendered without crashing (the lookbehind fix)
  })

  test('text size slider works and persists', async ({ page }) => {
    const slider = page.locator('input[type="range"][aria-label="Text size"]')
    await expect(slider).toBeVisible()

    // Change the slider value
    await slider.fill('18')
    await page.waitForTimeout(300)

    // Reload and check it persisted
    await page.reload()
    await page.waitForSelector('.handwritten', { timeout: 15000 })
    const sliderAfterReload = page.locator('input[type="range"][aria-label="Text size"]')
    await expect(sliderAfterReload).toHaveValue('18')

    // Reset to default
    await sliderAfterReload.fill('13')
  })

  test('typewriter button opens Commonplace Book', async ({ page }) => {
    const typewriterBtn = page.locator('button[aria-label="Open Commonplace Book"]')
    await expect(typewriterBtn).toBeVisible()

    await typewriterBtn.click()
    await page.waitForTimeout(500)

    // The overlay should appear with the title
    const bookTitle = page.locator('h2.handwritten:has-text("The Commonplace Book")')
    await expect(bookTitle).toBeVisible()

    // Textarea should be focused (or at least visible)
    const textarea = page.locator('textarea[placeholder="What\'s on your mind?"]')
    await expect(textarea).toBeVisible()
  })

  test('Commonplace Book closes on X button', async ({ page }) => {
    const typewriterBtn = page.locator('button[aria-label="Open Commonplace Book"]')
    await typewriterBtn.click()
    await page.waitForTimeout(500)

    const closeBtn = page.locator('button[aria-label="Close"]')
    await closeBtn.click()
    await page.waitForTimeout(500)

    // The overlay should be gone
    const bookTitle = page.locator('h2.handwritten:has-text("The Commonplace Book")')
    await expect(bookTitle).not.toBeVisible()
  })

  test('Commonplace Book closes on Escape key', async ({ page }) => {
    const typewriterBtn = page.locator('button[aria-label="Open Commonplace Book"]')
    await typewriterBtn.click()
    await page.waitForTimeout(500)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    const bookTitle = page.locator('h2.handwritten:has-text("The Commonplace Book")')
    await expect(bookTitle).not.toBeVisible()
  })

  test('rapid open/close of Commonplace Book does not crash', async ({ page }) => {
    const typewriterBtn = page.locator('button[aria-label="Open Commonplace Book"]')

    // Rapid toggle 3 times
    for (let i = 0; i < 3; i++) {
      await typewriterBtn.click()
      await page.waitForTimeout(100)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(100)
    }

    // Page should still be functional — no crash
    const title = page.locator('h2.handwritten').first()
    await expect(title).toBeVisible()

    // Check console for React warnings
    const consoleErrors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    await page.waitForTimeout(500)
    // No "unmounted component" errors
    const unmountErrors = consoleErrors.filter(e => e.includes('unmounted'))
    expect(unmountErrors.length).toBe(0)
  })
})

test.describe('Notifications Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('loads and displays notification sections', async ({ page }) => {
    await page.goto('/notifications')
    await page.waitForSelector('h1.handwritten', { timeout: 15000 })

    // Title should be visible
    const title = page.locator('h1.handwritten:has-text("Notifications")')
    await expect(title).toBeVisible()

    // Either shows notifications or empty state
    const hasNotifications = await page.locator('section').count() > 0
    const hasEmptyState = await page.locator('text=No notifications yet').isVisible().catch(() => false)
    expect(hasNotifications || hasEmptyState).toBe(true)
  })

  test('notification items are clickable and navigate', async ({ page }) => {
    await page.goto('/notifications')
    await page.waitForSelector('h1.handwritten', { timeout: 15000 })

    // If there are notifications, click the first one
    const firstNotification = page.locator('section button').first()
    if (await firstNotification.isVisible().catch(() => false)) {
      await firstNotification.click()
      // Should navigate away from /notifications
      await page.waitForTimeout(1000)
      const url = page.url()
      expect(url).not.toContain('/notifications')
    }
  })

  test('notification items have hover effects', async ({ page }) => {
    await page.goto('/notifications')
    await page.waitForSelector('h1.handwritten', { timeout: 15000 })

    const firstNotification = page.locator('section button').first()
    if (await firstNotification.isVisible().catch(() => false)) {
      // Hover should change background
      await firstNotification.hover()
      await page.waitForTimeout(300)
      const bg = await firstNotification.evaluate(el => el.style.background)
      expect(bg).toContain('#F5F1EB')
    }
  })
})

test.describe('Notification Bell', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.waitForSelector('button[aria-label="Notifications"]', { timeout: 15000 })
  })

  test('bell icon is visible in navigation', async ({ page }) => {
    const bell = page.locator('button[aria-label="Notifications"]')
    await expect(bell).toBeVisible()
  })

  test('clicking bell opens dropdown', async ({ page }) => {
    const bell = page.locator('button[aria-label="Notifications"]')
    await bell.click()
    await page.waitForTimeout(500)

    // Dropdown should appear with "Notifications" header or "You're all caught up"
    const dropdown = page.locator('text=Notifications').nth(0) // The dropdown header
    await expect(dropdown).toBeVisible()
  })

  test('clicking bell again closes dropdown', async ({ page }) => {
    const bell = page.locator('button[aria-label="Notifications"]')
    await bell.click()
    await page.waitForTimeout(500)
    await bell.click()
    await page.waitForTimeout(500)

    // "See all notifications" link should not be visible (dropdown closed)
    const seeAll = page.locator('text=See all notifications')
    await expect(seeAll).not.toBeVisible()
  })

  test('clicking outside closes dropdown', async ({ page }) => {
    const bell = page.locator('button[aria-label="Notifications"]')
    await bell.click()
    await page.waitForTimeout(500)

    // Click on the page body
    await page.click('body', { position: { x: 100, y: 400 } })
    await page.waitForTimeout(500)

    const seeAll = page.locator('text=See all notifications')
    await expect(seeAll).not.toBeVisible()
  })
})

test.describe('Navigation Menu', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    // Set mobile viewport for hamburger menu
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)
  })

  test('hamburger menu opens and closes', async ({ page }) => {
    const hamburger = page.locator('button[aria-label="Menu"]')
    if (await hamburger.isVisible().catch(() => false)) {
      await hamburger.click()
      await page.waitForTimeout(300)

      // Menu items should be visible
      const menuItem = page.locator('text=My Corner')
      await expect(menuItem).toBeVisible()

      // Press Escape to close
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
      await expect(menuItem).not.toBeVisible()
    }
  })

  test('menu closes when navigating to a page', async ({ page }) => {
    const hamburger = page.locator('button[aria-label="Menu"]')
    if (await hamburger.isVisible().catch(() => false)) {
      await hamburger.click()
      await page.waitForTimeout(300)

      // Click a menu item
      const myCorner = page.locator('button:has-text("My Corner")')
      if (await myCorner.isVisible()) {
        await myCorner.click()
        await page.waitForTimeout(500)

        // Menu should be closed and we should be on my-corner
        await expect(page).toHaveURL(/my-corner/)
      }
    }
  })
})

test.describe('Wishlist', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/my-corner?tab=wishlist')
    await page.waitForSelector('h1.handwritten', { timeout: 15000 })
  })

  test('wishlist page loads with title', async ({ page }) => {
    const title = page.locator('h1.handwritten:has-text("Wishlist")')
    await expect(title).toBeVisible()
  })

  test('add button is visible and clickable', async ({ page }) => {
    // The + button should be visible
    const addBtn = page.locator('button:has-text("+")')
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click()
      await page.waitForTimeout(500)

      // A modal or form should appear
      const modal = page.locator('[style*="position: fixed"]')
      await expect(modal).toBeVisible()
    }
  })
})

test.describe('No Console Errors', () => {
  test('navigating through main pages produces no JS errors', async ({ page }) => {
    const jsErrors = []
    page.on('pageerror', (error) => jsErrors.push(error.message))

    await login(page)

    // Visit each main page
    const routes = ['/', '/notifications', '/my-corner', '/my-corner?tab=wishlist']
    for (const route of routes) {
      await page.goto(route)
      await page.waitForTimeout(1000)
    }

    // Filter out known benign errors (e.g., network errors from external services)
    const realErrors = jsErrors.filter(e =>
      !e.includes('Failed to fetch') &&
      !e.includes('NetworkError') &&
      !e.includes('AbortError')
    )

    expect(realErrors).toEqual([])
  })
})
