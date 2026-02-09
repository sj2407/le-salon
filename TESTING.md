# UI Testing with Playwright

## Quick Start

```bash
# Run smoke tests (no auth needed)
npm run test -- tests/smoke.spec.js

# Run all tests with credentials
TEST_EMAIL=your@email.com TEST_PASSWORD=yourpass npm run test

# Interactive mode
npm run test:ui

# See tests run in browser
npm run test:headed
```

## Test Files

| File | Description | Auth Required |
|------|-------------|---------------|
| `tests/smoke.spec.js` | App loads, routing works | No |
| `tests/modals.spec.js` | Modal interactions (open, edit, save, cancel, escape, click-outside) | Yes |

## Setting Up Test Credentials

1. Create a test user in your Supabase project
2. Set environment variables:
   ```bash
   export TEST_EMAIL="test@example.com"
   export TEST_PASSWORD="your-test-password"
   ```
3. Run tests: `npm run test`

## What Gets Tested

Each interactive component is tested for:

- **Opens** - Component activates on trigger
- **Displays content** - Existing data shows in form
- **Editing** - User can modify content without losing focus
- **Save** - Changes persist
- **Cancel** - Closes without saving
- **Escape key** - Dismisses modal
- **Click outside** - Dismisses modal
- **No page flash** - Page doesn't go blank during save

## Adding New Tests

When adding a new modal or interactive component:

1. Add test cases to `tests/modals.spec.js`
2. Follow the existing pattern:
   ```javascript
   test.describe('MyNewModal', () => {
     test('opens when trigger clicked', async ({ page }) => { ... })
     test('escape key closes modal', async ({ page }) => { ... })
     test('cancel button works', async ({ page }) => { ... })
     test('click outside closes', async ({ page }) => { ... })
   })
   ```
3. Run tests to verify: `npm run test`
