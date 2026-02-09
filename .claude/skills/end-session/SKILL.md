# End Session Skill

Use this skill BEFORE ending any coding session.

## Required Steps

### 1. Bug Sweep
List any known bugs, incomplete functionality, or edge cases:

```
## Known Issues
- [ ] Issue 1: Description
- [ ] Issue 2: Description
(or "None identified" if clean)
```

### 2. TODO Comments
Add TODO comments in code for anything unfinished:

```javascript
// TODO: Handle edge case where X happens
// TODO: Add validation for Y
```

### 3. Test Status
If tests exist, run them and report:

```
## Test Results
- npm run test:ui: ✅ 15/15 passed (or ❌ 3 failures)
- npm run build: ✅ Success
```

### 4. Status Summary
Provide a clear handoff summary:

```
## Session Summary
**Completed:**
- Feature X implemented
- Bug Y fixed

**In Progress:**
- Feature Z partially done (see TODO in file.jsx:42)

**Blocked:**
- None (or list blockers)

**Next Steps:**
1. Test feature X manually
2. Complete feature Z
```

## Rules

- **NEVER say "session complete" if there are known bugs**
- Always run build before ending to catch errors
- If tests fail, either fix them or document why they're failing
- Leave the codebase in a working state
