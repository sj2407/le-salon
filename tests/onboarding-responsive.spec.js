// Onboarding responsive smoke test.
// Walks through every step at 3 iPhone viewports and asserts the action
// button (Begin / Continue / Skip on the video) is fully inside the viewport.
//
// Uses ?mode=replay so the test doesn't depend on a no-data user — existing
// TEST_EMAIL works, and replay skips DB writes for step transitions.
//
// Caveat: Playwright Chromium emulates the viewport but renders Blink, not
// WebKit/WKWebView. Catches layout/sizing bugs across screen sizes; final
// iOS verification still required in Xcode simulator.

import { test, expect } from '@playwright/test'

// Dedicated test user seeded directly in auth.users for this suite.
// This user has no data so the trigger naturally redirects them to /onboarding,
// but we also navigate explicitly with ?mode=replay to avoid timing flakes.
const TEST_USER = {
  email: 'onboarding-test@lesalon.app',
  password: 'OnboardingTest2026!',
}

async function loginAsTestUser(page) {
  await page.goto('/signin')
  await page.fill('input[type="email"]', TEST_USER.email)
  await page.fill('input[type="password"]', TEST_USER.password)
  await page.click('button[type="submit"]')
  // Don't wait on a specific URL — empty users are redirected to /onboarding,
  // users with data go to /. Just wait until we leave /signin.
  await page.waitForURL(url => !url.pathname.includes('/signin'), { timeout: 20000 })
}

const VIEWPORTS = [
  { name: 'iPhone SE',      width: 375, height: 667 },
  { name: 'iPhone 13',      width: 390, height: 844 },
  { name: 'iPhone Pro Max', width: 430, height: 932 },
]

// One entry per onboarding step. The button name is the visible text of the
// element that advances the flow on that step.
const STEPS = [
  { name: 'Welcome',                    button: 'Begin' },
  { name: 'Profile basics',             button: 'Continue' },
  { name: 'Share extension demo',       button: 'Continue' },
  { name: 'Share sheet tip',            button: 'Continue' },
  { name: 'Portrait tour',              button: 'Continue' },
  { name: 'Scan access (experience)',   button: 'Continue' },
  { name: 'Scan access (books)',        button: 'Continue' },
  { name: 'Bring friends in',           button: 'Continue' },
  { name: 'Closing',                    button: 'Continue' },
  { name: 'Salon intro video',          button: 'Skip' },
]

for (const vp of VIEWPORTS) {
  test.describe(`onboarding @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    test('action button is fully in viewport at every step', async ({ page }) => {
      await loginAsTestUser(page)
      await page.goto('/onboarding?mode=replay')

      for (const step of STEPS) {
        const button = page.locator(`button:has-text("${step.button}")`).first()
        await expect(button, `${step.name}: button "${step.button}" should appear`).toBeVisible({ timeout: 8000 })

        const box = await button.boundingBox()
        expect(box, `${step.name}: button must have a bounding box`).not.toBeNull()

        // 1. Action button must fit fully inside the viewport.
        expect(box.y, `${step.name}: button top is above viewport on ${vp.name}`)
          .toBeGreaterThanOrEqual(0)
        expect(box.y + box.height, `${step.name}: button bottom (${Math.round(box.y + box.height)}) exceeds viewport height (${vp.height}) on ${vp.name}`)
          .toBeLessThanOrEqual(vp.height)

        // 2. Self-contained: the scroll container should not have content past
        // the viewport. Skip this check on VideoStep because it portals out.
        if (step.name !== 'Salon intro video') {
          const overflow = await page.evaluate(() => {
            const el = document.querySelector('.app-scroll-content')
            if (!el) return 0
            return Math.max(0, el.scrollHeight - el.clientHeight)
          })
          // Tolerance of 4px for sub-pixel rendering; anything more means
          // content is below the fold and requires scrolling.
          expect(overflow, `${step.name}: ${overflow}px of content overflows the viewport on ${vp.name} (must be self-contained)`)
            .toBeLessThanOrEqual(4)
        }

        // 3. Vertically centered: distance from viewport top to first heading
        // should be roughly equal to distance from button bottom to viewport
        // bottom. Skip on VideoStep (no heading) and Welcome (large H1 with its
        // own intentional spacing). Tolerance ±60px for asymmetric content.
        if (step.name !== 'Salon intro video') {
          const heading = page.locator('h1, h2').first()
          if (await heading.count() > 0) {
            const headingBox = await heading.boundingBox()
            if (headingBox) {
              const topGap = headingBox.y
              const bottomGap = vp.height - (box.y + box.height)
              const delta = Math.abs(topGap - bottomGap)
              expect(delta, `${step.name}: content not centered on ${vp.name} — top gap ${Math.round(topGap)}px vs bottom gap ${Math.round(bottomGap)}px (delta ${Math.round(delta)}px)`)
                .toBeLessThanOrEqual(60)
            }
          }
        }

        await button.click()
        await page.waitForTimeout(400)
      }
    })
  })
}
