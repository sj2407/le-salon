import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Salon intro splash screen', () => {
  test('shows full-screen splash with video on first login, then transitions to Salon', async ({ page }) => {
    await page.goto('/signin')
    await page.evaluate(() => sessionStorage.removeItem('salon-intro-played'))

    await login(page)

    // Splash should be visible with the video
    const video = page.locator('video[src="/salon-intro.mp4"]')
    await expect(video).toBeVisible({ timeout: 5000 })

    // Skip button should be visible
    const skip = page.locator('button:has-text("Skip")')
    await expect(skip).toBeVisible()

    // Screenshot mid-video
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'tests/screenshots/salon-splash-playing.png' })

    // Wait for video to end — splash disappears, Salon content appears
    await expect(video).toBeHidden({ timeout: 12000 })

    // Static couch image should now be visible
    const staticImg = page.locator('img[src="/images/salon-couch-ready.png"]')
    await expect(staticImg).toBeVisible({ timeout: 3000 })

    await page.screenshot({ path: 'tests/screenshots/salon-splash-ended.png' })
  })

  test('does NOT replay when navigating away and back', async ({ page }) => {
    await page.goto('/signin')
    await page.evaluate(() => sessionStorage.removeItem('salon-intro-played'))

    await login(page)

    // Wait for splash to finish
    const staticImg = page.locator('img[src="/images/salon-couch-ready.png"]')
    await expect(staticImg).toBeVisible({ timeout: 15000 })

    // Navigate away
    await page.click('a[href="/my-corner"], .nav-brand-link + * a')
    await page.waitForTimeout(500)

    // Navigate back to Salon
    await page.click('.nav-brand-link')
    await page.waitForTimeout(1000)

    // No video, just static image
    const video = page.locator('video[src="/salon-intro.mp4"]')
    await expect(video).toBeHidden()
    await expect(staticImg).toBeVisible()

    await page.screenshot({ path: 'tests/screenshots/salon-splash-no-replay.png' })
  })

  test('skip button ends splash immediately', async ({ page }) => {
    await page.goto('/signin')
    await page.evaluate(() => sessionStorage.removeItem('salon-intro-played'))

    await login(page)

    // Video playing
    const video = page.locator('video[src="/salon-intro.mp4"]')
    await expect(video).toBeVisible({ timeout: 5000 })

    // Click skip
    await page.click('button:has-text("Skip")')

    // Should immediately show Salon content
    const staticImg = page.locator('img[src="/images/salon-couch-ready.png"]')
    await expect(staticImg).toBeVisible({ timeout: 3000 })
    await expect(video).toBeHidden()

    await page.screenshot({ path: 'tests/screenshots/salon-splash-skipped.png' })
  })
})
