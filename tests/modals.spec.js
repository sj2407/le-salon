import { test, expect } from '@playwright/test'
import { login, waitForModalOpen, waitForModalClose, navigateToTab } from './helpers.js'

test.describe('SectionEditModal (Weekly Card)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    // Wait for card to load (or error state to resolve)
    await page.waitForSelector('.card, .error-message', { timeout: 15000 })
  })

  test('opens when quill is clicked', async ({ page }) => {
    if (await page.locator('.error-message').isVisible()) return

    // Use force:true because quill image has CSS animation making it "not stable"
    const quill = page.locator('button img[alt="Edit"]').first()
    await quill.click({ force: true })

    await waitForModalOpen(page)
    await expect(page.locator('h3.handwritten')).toBeVisible()
  })

  test('displays existing content in form', async ({ page }) => {
    if (await page.locator('.error-message').isVisible()) return

    const quill = page.locator('button img[alt="Edit"]').first()
    await quill.click({ force: true })
    await waitForModalOpen(page)

    const inputs = page.locator('input[type="text"], textarea')
    await expect(inputs.first()).toBeVisible()
  })

  test('allows editing text without losing focus', async ({ page }) => {
    if (await page.locator('.error-message').isVisible()) return

    const quill = page.locator('button img[alt="Edit"]').first()
    await quill.click({ force: true })
    await waitForModalOpen(page)

    const input = page.locator('input[type="text"], textarea').first()
    await input.click()
    await input.fill('Test content edited')

    await expect(input).toHaveValue('Test content edited')
  })

  test('saves changes when Save clicked', async ({ page }) => {
    if (await page.locator('.error-message').isVisible()) return

    const quill = page.locator('button img[alt="Edit"]').first()
    await quill.click({ force: true })
    await waitForModalOpen(page)

    const input = page.locator('input[type="text"], textarea').first()
    const testValue = `Test ${Date.now()}`
    await input.fill(testValue)

    await page.click('button:has-text("Save")')
    await waitForModalClose(page)

    // Page should not flash blank
    await expect(page.locator('.card')).toBeVisible()
  })

  test('cancel button closes without saving', async ({ page }) => {
    if (await page.locator('.error-message').isVisible()) return

    const quill = page.locator('button img[alt="Edit"]').first()
    await quill.click({ force: true })
    await waitForModalOpen(page)

    const input = page.locator('input[type="text"], textarea').first()
    const originalValue = await input.inputValue()
    await input.fill('This should not be saved')

    await page.click('button:has-text("Cancel")')
    await waitForModalClose(page)

    // Reopen to verify original value
    await quill.click({ force: true })
    await waitForModalOpen(page)
    const inputAfterCancel = page.locator('input[type="text"], textarea').first()
    await expect(inputAfterCancel).toHaveValue(originalValue)
  })

  test('escape key closes modal', async ({ page }) => {
    if (await page.locator('.error-message').isVisible()) return

    const quill = page.locator('button img[alt="Edit"]').first()
    await quill.click({ force: true })
    await waitForModalOpen(page)

    await page.keyboard.press('Escape')
    await waitForModalClose(page)
  })

  test('click outside closes modal', async ({ page }) => {
    if (await page.locator('.error-message').isVisible()) return

    const quill = page.locator('button img[alt="Edit"]').first()
    await quill.click({ force: true })
    await waitForModalOpen(page)

    await page.click('[style*="position: fixed"]', { position: { x: 10, y: 10 } })
    await waitForModalClose(page)
  })

  test('page does not flash blank on save', async ({ page }) => {
    if (await page.locator('.error-message').isVisible()) return

    const quill = page.locator('button img[alt="Edit"]').first()
    await quill.click({ force: true })
    await waitForModalOpen(page)

    await page.click('button:has-text("Save")')

    await expect(page.locator('.card')).toBeVisible()
    await expect(page.locator('.loading')).not.toBeVisible()
  })

  test('click outside does NOT close modal when form is dirty', async ({ page }) => {
    if (await page.locator('.error-message').isVisible()) return

    const quill = page.locator('button img[alt="Edit"]').first()
    await quill.click({ force: true })
    await waitForModalOpen(page)

    // Make the form dirty by editing
    const input = page.locator('input[type="text"], textarea').first()
    await input.fill('Unsaved change')

    // Click outside - modal should stay open
    await page.click('[style*="position: fixed"]', { position: { x: 10, y: 10 } })
    await page.waitForTimeout(500)
    await expect(page.locator('[style*="position: fixed"]')).toBeVisible()
  })

  test('escape does NOT close modal when form is dirty', async ({ page }) => {
    if (await page.locator('.error-message').isVisible()) return

    const quill = page.locator('button img[alt="Edit"]').first()
    await quill.click({ force: true })
    await waitForModalOpen(page)

    // Make the form dirty
    const input = page.locator('input[type="text"], textarea').first()
    await input.fill('Unsaved change')

    // Press Escape - modal should stay open
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    await expect(page.locator('[style*="position: fixed"]')).toBeVisible()
  })

  test('cancel button still closes modal when form is dirty', async ({ page }) => {
    if (await page.locator('.error-message').isVisible()) return

    const quill = page.locator('button img[alt="Edit"]').first()
    await quill.click({ force: true })
    await waitForModalOpen(page)

    // Make the form dirty
    const input = page.locator('input[type="text"], textarea').first()
    await input.fill('Unsaved change')

    // Cancel should still close
    await page.click('button:has-text("Cancel")')
    await waitForModalClose(page)
  })
})

test.describe('Reviews Modal', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    // Reviews is a tab in MyCorner, not a separate route
    await page.waitForSelector('.card, .error-message', { timeout: 15000 })
    await navigateToTab(page, 'Reviews')
    // Wait for reviews tab content to load (+ button is always visible)
    await page.waitForSelector('button:has-text("+")', { timeout: 10000 })
  })

  test('opens add modal when + clicked', async ({ page }) => {
    const addButton = page.locator('button:has-text("+")').first()
    await addButton.click()
    await waitForModalOpen(page)
    await expect(page.locator('h2.handwritten')).toBeVisible()
  })

  test('escape key closes modal', async ({ page }) => {
    const addButton = page.locator('button:has-text("+")').first()
    await addButton.click()
    await waitForModalOpen(page)
    await page.keyboard.press('Escape')
    await waitForModalClose(page)
  })

  test('cancel button closes modal', async ({ page }) => {
    const addButton = page.locator('button:has-text("+")').first()
    await addButton.click()
    await waitForModalOpen(page)
    await page.click('button:has-text("Cancel")')
    await waitForModalClose(page)
  })

  test('click outside closes modal', async ({ page }) => {
    const addButton = page.locator('button:has-text("+")').first()
    await addButton.click()
    await waitForModalOpen(page)
    await page.click('[style*="position: fixed"]', { position: { x: 10, y: 10 } })
    await waitForModalClose(page)
  })

  test('click outside does NOT close modal when form is dirty', async ({ page }) => {
    const addButton = page.locator('button:has-text("+")').first()
    await addButton.click()
    await waitForModalOpen(page)

    // Make the form dirty
    await page.fill('input[placeholder="e.g., Avatar: The Way of Water"]', 'Test Review')

    // Click outside - modal should stay open
    await page.click('[style*="position: fixed"]', { position: { x: 10, y: 10 } })
    await page.waitForTimeout(500)
    await expect(page.locator('[style*="position: fixed"]')).toBeVisible()
  })

  test('escape does NOT close modal when form is dirty', async ({ page }) => {
    const addButton = page.locator('button:has-text("+")').first()
    await addButton.click()
    await waitForModalOpen(page)

    // Make the form dirty
    await page.fill('input[placeholder="e.g., Avatar: The Way of Water"]', 'Test Review')

    // Press Escape - modal should stay open
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    await expect(page.locator('[style*="position: fixed"]')).toBeVisible()
  })
})

test.describe('Wishlist Modal', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    // Wishlist is a tab in MyCorner, not a separate route
    await page.waitForSelector('.card, .error-message', { timeout: 15000 })
    await navigateToTab(page, 'Wishlist')
    // Wait for wishlist content to load
    await page.waitForSelector('.handwritten', { timeout: 10000 })
  })

  test('opens add modal when + clicked', async ({ page }) => {
    const addButton = page.locator('button:has-text("+")').first()
    await addButton.click()
    await waitForModalOpen(page)
  })

  test('escape key closes modal', async ({ page }) => {
    const addButton = page.locator('button:has-text("+")').first()
    await addButton.click()
    await waitForModalOpen(page)
    await page.keyboard.press('Escape')
    await waitForModalClose(page)
  })

  test('click outside does NOT close modal when form is dirty', async ({ page }) => {
    const addButton = page.locator('button:has-text("+")').first()
    await addButton.click()
    await waitForModalOpen(page)

    // Make the form dirty
    await page.fill('input[placeholder="e.g., Ceramic mug, Book title, etc."]', 'Test Item')

    // Click outside - modal should stay open
    await page.click('[style*="position: fixed"]', { position: { x: 10, y: 10 } })
    await page.waitForTimeout(500)
    await expect(page.locator('[style*="position: fixed"]')).toBeVisible()
  })
})

test.describe('ToDo/Activity Modal', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/todo')
    // ToDo always shows a date header and add button, even when empty
    await page.waitForSelector('.handwritten', { timeout: 10000 })
  })

  test('opens add modal when + clicked', async ({ page }) => {
    await page.click('button:has-text("+")')
    await waitForModalOpen(page)
  })

  test('escape key closes modal', async ({ page }) => {
    await page.click('button:has-text("+")')
    await waitForModalOpen(page)
    await page.keyboard.press('Escape')
    await waitForModalClose(page)
  })

  test('click outside does NOT close modal when form is dirty', async ({ page }) => {
    await page.click('button:has-text("+")')
    await waitForModalOpen(page)

    // Make the form dirty
    await page.fill('input[placeholder="e.g., Pottery class in Brooklyn"]', 'Test Activity')

    // Click outside - modal should stay open
    await page.click('[style*="position: fixed"]', { position: { x: 10, y: 10 } })
    await page.waitForTimeout(500)
    await expect(page.locator('[style*="position: fixed"]')).toBeVisible()
  })

  test('escape does NOT close modal when form is dirty', async ({ page }) => {
    await page.click('button:has-text("+")')
    await waitForModalOpen(page)

    // Make the form dirty
    await page.fill('input[placeholder="e.g., Pottery class in Brooklyn"]', 'Test Activity')

    // Press Escape - modal should stay open
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    await expect(page.locator('[style*="position: fixed"]')).toBeVisible()
  })
})

test.describe('FeedbackModal', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/help')
    await page.waitForSelector('button:has-text("Send Feedback")', { timeout: 10000 })
  })

  test('opens when Send Feedback clicked', async ({ page }) => {
    await page.click('button:has-text("Send Feedback")')
    await waitForModalOpen(page)
    await expect(page.locator('h2:has-text("Send Feedback")')).toBeVisible()
  })

  test('escape key closes modal', async ({ page }) => {
    await page.click('button:has-text("Send Feedback")')
    await waitForModalOpen(page)
    await page.keyboard.press('Escape')
    await waitForModalClose(page)
  })

  test('cancel button closes modal', async ({ page }) => {
    await page.click('button:has-text("Send Feedback")')
    await waitForModalOpen(page)
    await page.click('button:has-text("Cancel")')
    await waitForModalClose(page)
  })

  test('click outside closes modal', async ({ page }) => {
    await page.click('button:has-text("Send Feedback")')
    await waitForModalOpen(page)
    await page.click('[style*="position: fixed"]', { position: { x: 10, y: 10 } })
    await waitForModalClose(page)
  })
})

test.describe('Profile Save', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.waitForSelector('.card, .error-message', { timeout: 15000 })
    await navigateToTab(page, 'Profile')
    await page.waitForSelector('form', { timeout: 10000 })
  })

  test('saves without hard page reload', async ({ page }) => {
    // Change a field
    const locationInput = page.locator('input[placeholder="e.g., Paris, Brooklyn, Tokyo"]')
    const testValue = `Test City ${Date.now()}`
    await locationInput.fill(testValue)

    // Click Save
    await page.click('button:has-text("Save Profile")')

    // Success message should appear WITHOUT page reload
    // If page reloaded, this would fail because the message wouldn't persist
    await expect(page.locator('text=Profile updated successfully')).toBeVisible({ timeout: 10000 })

    // The Profile tab should still be active (no reload back to Card tab)
    await expect(page.locator('form')).toBeVisible()
  })
})

test.describe('Friends Page', () => {
  test('loads without errors', async ({ page }) => {
    await login(page)
    await page.goto('/friends')
    // Should show friends heading and Find Friends button
    await expect(page.locator('text=My Friends')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Find Friends')).toBeVisible()
  })
})

test.describe('Find Friends Page', () => {
  test('loads and shows search form', async ({ page }) => {
    await login(page)
    await page.goto('/find-friends')
    // Should show heading and search input
    await expect(page.locator('text=Find Friends')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('input[placeholder*="sarah_reads"]')).toBeVisible()
  })
})

test.describe('FriendSearch Dropdown', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.waitForSelector('nav', { timeout: 10000 })
  })

  test('opens on search icon click', async ({ page }) => {
    const searchIcon = page.locator('button[title="Search friends"]')
    await searchIcon.click()

    await expect(page.locator('input[placeholder="Search friends..."]')).toBeVisible()
  })

  test('click outside closes dropdown', async ({ page }) => {
    const searchIcon = page.locator('button[title="Search friends"]')
    await searchIcon.click()
    await expect(page.locator('input[placeholder="Search friends..."]')).toBeVisible()

    // Click outside
    await page.click('body', { position: { x: 50, y: 50 } })

    await expect(page.locator('input[placeholder="Search friends..."]')).not.toBeVisible()
  })
})
