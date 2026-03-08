import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Review Notes & Quotes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    // Navigate directly to My Corner with Reviews tab
    await page.goto('/my-corner?tab=reviews')
    await page.waitForSelector('.bookshelf, .handwritten', { timeout: 10000 })
    await page.waitForTimeout(500)
  })

  test('review reader shows Notes & Quotes section', async ({ page }) => {
    // Find a review cover that opens the reader (has review text)
    const cover = page.locator('.cover-item:not(.score-only)').first()
    if (await cover.count() === 0) {
      test.skip(true, 'No reviews with text to test')
      return
    }

    await cover.click()
    await page.waitForTimeout(500)

    // Verify the reader opened
    await expect(page.locator('.review-reader.open')).toBeVisible()

    // Scroll down to find Notes & Quotes section
    const readerScroll = page.locator('.reader-scroll')
    await readerScroll.evaluate(el => el.scrollTo(0, el.scrollHeight))
    await page.waitForTimeout(300)

    // Verify Notes & Quotes header is visible
    await expect(page.locator('.review-reader.open >> text=Notes & Quotes')).toBeVisible()
  })

  test('owner can add a note', async ({ page }) => {
    const cover = page.locator('.cover-item:not(.score-only)').first()
    if (await cover.count() === 0) {
      test.skip(true, 'No reviews with text to test')
      return
    }

    await cover.click()
    await page.waitForTimeout(500)

    // Scroll to bottom
    const readerScroll = page.locator('.reader-scroll')
    await readerScroll.evaluate(el => el.scrollTo(0, el.scrollHeight))
    await page.waitForTimeout(300)

    // Click the + icon button to open add form
    const addBtn = page.locator('.review-reader.open button[title="Add note or quote"]')
    await addBtn.click()
    await page.waitForTimeout(200)

    // Fill in the note
    const textarea = page.locator('.review-reader.open textarea')
    await textarea.fill('Test note from Playwright')

    // Click Save
    await page.locator('.review-reader.open >> button:has-text("Save")').click()
    await page.waitForTimeout(500)

    // Verify the note appears
    await expect(page.locator('.review-reader.open >> text=Test note from Playwright').first()).toBeVisible()
  })

  test('owner can add a quote with page reference', async ({ page }) => {
    const cover = page.locator('.cover-item:not(.score-only)').first()
    if (await cover.count() === 0) {
      test.skip(true, 'No reviews with text to test')
      return
    }

    await cover.click()
    await page.waitForTimeout(500)

    const readerScroll = page.locator('.reader-scroll')
    await readerScroll.evaluate(el => el.scrollTo(0, el.scrollHeight))
    await page.waitForTimeout(300)

    // Click the + icon button
    const addBtn = page.locator('.review-reader.open button[title="Add note or quote"]')
    await addBtn.click()
    await page.waitForTimeout(200)

    // Fill in quote content
    const textarea = page.locator('.review-reader.open textarea')
    await textarea.fill('To be or not to be, that is the question.')

    // Check "This is a quote"
    await page.locator('.review-reader.open >> text=This is a quote').click()

    // Fill page reference
    const pageInput = page.locator('.review-reader.open input[placeholder*="p."]')
    await pageInput.fill('Act 3, Scene 1')

    // Save
    await page.locator('.review-reader.open >> button:has-text("Save")').click()
    await page.waitForTimeout(500)

    // Verify quote appears with page ref
    await expect(page.locator('.review-reader.open >> text=To be or not to be').first()).toBeVisible()
    await expect(page.locator('.review-reader.open >> text=Act 3, Scene 1').first()).toBeVisible()
  })

  test('owner can edit a note via overflow menu', async ({ page }) => {
    const cover = page.locator('.cover-item:not(.score-only)').first()
    if (await cover.count() === 0) {
      test.skip(true, 'No reviews with text to test')
      return
    }

    await cover.click()
    await page.waitForTimeout(500)

    const readerScroll = page.locator('.reader-scroll')
    await readerScroll.evaluate(el => el.scrollTo(0, el.scrollHeight))
    await page.waitForTimeout(300)

    // Find an overflow menu ··· button on a note
    const overflowBtn = page.locator('.review-reader.open >> text=···').first()
    if (await overflowBtn.count() === 0) {
      test.skip(true, 'No existing notes to edit')
      return
    }

    // Open the overflow menu
    await overflowBtn.click()
    await page.waitForTimeout(200)

    // Click Edit in the dropdown
    await page.locator('.review-reader.open >> button:has-text("Edit")').first().click()
    await page.waitForTimeout(200)

    // Clear and update content
    const textarea = page.locator('.review-reader.open textarea')
    await textarea.fill('Updated note content')

    // Click Update
    await page.locator('.review-reader.open >> button:has-text("Update")').click()
    await page.waitForTimeout(500)

    // Verify updated content
    await expect(page.locator('.review-reader.open >> text=Updated note content')).toBeVisible()
  })

  test('owner can delete a note via overflow menu', async ({ page }) => {
    const cover = page.locator('.cover-item:not(.score-only)').first()
    if (await cover.count() === 0) {
      test.skip(true, 'No reviews with text to test')
      return
    }

    await cover.click()
    await page.waitForTimeout(500)

    const readerScroll = page.locator('.reader-scroll')
    await readerScroll.evaluate(el => el.scrollTo(0, el.scrollHeight))
    await page.waitForTimeout(300)

    // Find an overflow menu button
    const overflowBtn = page.locator('.review-reader.open >> text=···').first()
    if (await overflowBtn.count() === 0) {
      test.skip(true, 'No existing notes to delete')
      return
    }

    // Open the overflow menu on the first note
    await overflowBtn.click()
    await page.waitForTimeout(200)

    // Verify Delete option appears in dropdown
    const deleteBtn = page.locator('.review-reader.open >> button:has-text("Delete")').first()
    await expect(deleteBtn).toBeVisible()

    // Click Delete
    await deleteBtn.click()
    await page.waitForTimeout(500)

    // Verify the menu closed (dropdown gone)
    await expect(deleteBtn).not.toBeVisible()
  })

  test('cancel dismisses the add form', async ({ page }) => {
    const cover = page.locator('.cover-item:not(.score-only)').first()
    if (await cover.count() === 0) {
      test.skip(true, 'No reviews with text to test')
      return
    }

    await cover.click()
    await page.waitForTimeout(500)

    const readerScroll = page.locator('.reader-scroll')
    await readerScroll.evaluate(el => el.scrollTo(0, el.scrollHeight))
    await page.waitForTimeout(300)

    // Open add form via + icon
    const addBtn = page.locator('.review-reader.open button[title="Add note or quote"]')
    await addBtn.click()
    await page.waitForTimeout(200)

    // Verify textarea is visible
    await expect(page.locator('.review-reader.open textarea')).toBeVisible()

    // Click Cancel
    await page.locator('.review-reader.open >> button:has-text("Cancel")').click()
    await page.waitForTimeout(200)

    // Verify form is dismissed
    await expect(page.locator('.review-reader.open textarea')).not.toBeVisible()
  })

  test('escape key dismisses the add form', async ({ page }) => {
    const cover = page.locator('.cover-item:not(.score-only)').first()
    if (await cover.count() === 0) {
      test.skip(true, 'No reviews with text to test')
      return
    }

    await cover.click()
    await page.waitForTimeout(500)

    const readerScroll = page.locator('.reader-scroll')
    await readerScroll.evaluate(el => el.scrollTo(0, el.scrollHeight))
    await page.waitForTimeout(300)

    // Open add form via + icon
    const addBtn = page.locator('.review-reader.open button[title="Add note or quote"]')
    await addBtn.click()
    await page.waitForTimeout(200)

    // Fill something
    const textarea = page.locator('.review-reader.open textarea')
    await textarea.fill('Will be discarded')

    // Press Escape
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Form should be dismissed (textarea gone)
    const textareaStillVisible = await textarea.isVisible().catch(() => false)
    expect(textareaStillVisible).toBe(false)
  })
})
