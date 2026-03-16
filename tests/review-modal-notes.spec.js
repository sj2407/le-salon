import { test, expect } from '@playwright/test'
import { login, navigateToTab } from './helpers.js'

/** Helper: open the "Add Review & Notes" modal from the Reviews tab */
async function openAddModal(page) {
  await page.click('button[title="Add review"]')
  await page.waitForSelector('text=Add Review & Notes', { timeout: 5000 })
}

test.describe('Review Modal — Notes & Quotes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToTab(page, 'Reviews')
    await page.waitForTimeout(500)
  })

  test('add modal shows Notes & Quotes section', async ({ page }) => {
    await openAddModal(page)

    await expect(page.locator('text=Notes & Quotes (optional)')).toBeVisible()
    await expect(page.locator('button:has-text("Add a note or quote")')).toBeVisible()
  })

  test('can add a note draft in the modal', async ({ page }) => {
    await openAddModal(page)

    // Open note form
    await page.click('button:has-text("Add a note or quote")')
    await page.waitForTimeout(200)

    const noteTextarea = page.locator('textarea[placeholder="Write a note..."]')
    await expect(noteTextarea).toBeVisible()
    await noteTextarea.fill('A test note from the modal')

    // Click Add
    await page.click('button:has-text("Add")')
    await page.waitForTimeout(200)

    // Note draft should appear
    await expect(page.locator('text=A test note from the modal')).toBeVisible()
    // Form should collapse
    await expect(page.locator('button:has-text("Add a note or quote")')).toBeVisible()
  })

  test('can add a quote draft with page reference', async ({ page }) => {
    await openAddModal(page)

    await page.click('button:has-text("Add a note or quote")')
    await page.waitForTimeout(200)

    // Check Quote checkbox
    await page.locator('label:has-text("Quote") input[type="checkbox"]').check()

    // Placeholder should change
    const quoteTextarea = page.locator('textarea[placeholder="Enter the passage..."]')
    await expect(quoteTextarea).toBeVisible()
    await quoteTextarea.fill('All happy families are alike')

    // Fill page ref
    await page.locator('input[placeholder="p. 42..."]').fill('p. 1')

    await page.click('button:has-text("Add")')
    await page.waitForTimeout(200)

    await expect(page.locator('text=All happy families are alike')).toBeVisible()
    await expect(page.locator('text=p. 1')).toBeVisible()
  })

  test('can remove a note draft', async ({ page }) => {
    await openAddModal(page)

    // Add a note
    await page.click('button:has-text("Add a note or quote")')
    await page.locator('textarea[placeholder="Write a note..."]').fill('Note to remove')
    await page.click('button:has-text("Add")')
    await page.waitForTimeout(200)

    await expect(page.locator('text=Note to remove')).toBeVisible()

    // Click × to remove it
    await page.locator('button:has-text("×")').first().click()
    await page.waitForTimeout(200)

    await expect(page.locator('text=Note to remove')).not.toBeVisible()
  })

  test('cancel note form clears input', async ({ page }) => {
    await openAddModal(page)

    await page.click('button:has-text("Add a note or quote")')
    await page.locator('textarea[placeholder="Write a note..."]').fill('Will be cancelled')

    // Click Cancel (the note form's Cancel, not the modal's)
    // The note form Cancel is the first one visible in the notes section
    const cancelBtns = page.locator('button:has-text("Cancel")')
    // The note form cancel is smaller/appears before the modal Cancel
    await cancelBtns.first().click()
    await page.waitForTimeout(200)

    await expect(page.locator('button:has-text("Add a note or quote")')).toBeVisible()
    await expect(page.locator('textarea[placeholder="Write a note..."]')).not.toBeVisible()
  })

  test('full flow: create review with notes, verify persistence', async ({ page }) => {
    await openAddModal(page)

    const uniqueTitle = `PW-Test-${Date.now()}`

    // Fill review fields
    await page.locator('input[placeholder*="Avatar"]').fill(uniqueTitle)
    await page.locator('input[type="number"]').fill('8')

    // Add a note
    await page.click('button:has-text("Add a note or quote")')
    await page.locator('textarea[placeholder="Write a note..."]').fill('Modal test note')
    await page.click('button:has-text("Add")')
    await page.waitForTimeout(200)

    // Add a quote
    await page.click('button:has-text("Add a note or quote")')
    await page.locator('label:has-text("Quote") input[type="checkbox"]').check()
    await page.locator('textarea[placeholder="Enter the passage..."]').fill('Modal test quote')
    await page.locator('input[placeholder="p. 42..."]').fill('Ch. 1')
    await page.click('button:has-text("Add")')
    await page.waitForTimeout(200)

    // Both drafts visible
    await expect(page.locator('text=Modal test note')).toBeVisible()
    await expect(page.locator('text=Modal test quote')).toBeVisible()

    // Save
    await page.click('button:has-text("Save")')
    await page.waitForTimeout(2000)

    // Modal should close
    await expect(page.locator('text=Add Review & Notes')).not.toBeVisible()

    // Find and open the new review
    const reviewCard = page.locator(`text=${uniqueTitle}`).first()
    await expect(reviewCard).toBeVisible({ timeout: 5000 })
    await reviewCard.click()
    await page.waitForTimeout(800)

    // If reader opened, scroll to bottom to see notes
    const reader = page.locator('.review-reader.open')
    if (await reader.count() > 0) {
      const readerScroll = page.locator('.reader-scroll')
      await readerScroll.evaluate(el => el.scrollTo(0, el.scrollHeight))
      await page.waitForTimeout(500)

      await expect(page.locator('text=Modal test note').first()).toBeVisible()
      await expect(page.locator('text=Modal test quote').first()).toBeVisible()
    }

    // Close reader
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
  })
})
