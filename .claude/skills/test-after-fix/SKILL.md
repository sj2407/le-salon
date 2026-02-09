# Test After Fix Skill

Automatically run tests after implementing any fix or feature.

## When to Use

This skill is triggered automatically after:
- Implementing a new feature
- Fixing a bug
- Modifying any interactive component

## Workflow

### 1. Run Smoke Tests First
```bash
npm run test -- tests/smoke.spec.js --reporter=line
```

Expected: All tests pass. If any fail, investigate immediately.

### 2. Run Full Test Suite (if credentials available)
```bash
TEST_EMAIL="your-test-email" TEST_PASSWORD="your-test-password" npm run test -- --reporter=line
```

### 3. Report Results

Format the results clearly:

```
## Test Results

### Smoke Tests
✅ 4/4 passed

### Modal Interaction Tests
⚠️ Requires TEST_EMAIL and TEST_PASSWORD environment variables
- Set these to a test account's credentials
- Run: TEST_EMAIL=x TEST_PASSWORD=y npm run test

### Summary
- Build: ✅ Success
- Smoke tests: ✅ 4 passed
- Interaction tests: ⚠️ Needs credentials
```

## Rules

- **NEVER mark a fix complete without running tests**
- If tests fail, fix the issue before reporting
- If a fix breaks other tests, that's a regression - fix it
- Document any tests that are skipped and why

## Quick Commands

```bash
# Just smoke tests (no auth needed)
npm run test -- tests/smoke.spec.js

# All tests with credentials
TEST_EMAIL=x TEST_PASSWORD=y npm run test

# Interactive UI mode
npm run test:ui

# See tests in browser
npm run test:headed
```
