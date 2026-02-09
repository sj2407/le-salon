import { test, expect } from '@playwright/test'

/**
 * Smoke tests that don't require authentication
 * These verify the app loads and basic routing works
 */

test.describe('App Smoke Tests', () => {
  test('homepage redirects to signin when not logged in', async ({ page }) => {
    await page.goto('/')
    // Should redirect to signin
    await expect(page).toHaveURL(/signin/)
  })

  test('signin page loads', async ({ page }) => {
    await page.goto('/signin')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('signup page loads', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('signin has link to signup', async ({ page }) => {
    await page.goto('/signin')
    const signupLink = page.locator('a[href="/signup"]')
    await expect(signupLink).toBeVisible()
  })
})
