# Project Guidelines for Claude

## Code Quality - CRITICAL

**When you see duplicate or similar code, STOP and flag it for refactoring.**

Duplicate code is technical debt that compounds with every new feature. Before making ANY changes, scan for duplication:

**Red flags to watch for:**
- Similar structures in different files (UI, logic, data fetching)
- Same pattern implemented multiple times
- Code that "should behave the same" but has separate implementations

**Why this matters - it's not just about consistency:**
- Today: styling changes need to be made in 2 places (and will drift)
- Tomorrow: new logic (filtering, sorting) needs to be added in 2 places
- Next month: analytics/stats need to be tracked in 2 places
- Future: LLM recommendations, data exports, API integrations - all multiplied by duplication

**The fix is always architectural - consolidate first, then enhance:**
```
WRONG: Make changes in File A, then make same changes in File B
RIGHT: Create shared module/component, have both files use it, then enhance once
```

**Examples:**
```
UI Components: ReviewsDisplay.jsx shared by Reviews.jsx and FriendCard.jsx
Data fetching: Custom hook useFetchReviews() shared across components
Business logic: Utility function calculateStats() in a shared module
Transformations: Data formatter shared between display and export
```

**When you spot duplication, flag it immediately:**
"I notice [X] and [Y] have similar code. Before making changes, should we refactor into a shared [component/hook/utility]? This will make future enhancements (stats, recommendations, etc.) much easier."

## Git Workflow

- **NEVER ask to push to git until the user has tested changes locally.** Wait for the user to explicitly confirm they've tested and are ready to push.
- Do not suggest or offer to push changes proactively.
- Only proceed with git operations (commit, push) when the user explicitly requests them.

## Design System

Refer to the README.md "Design System" section for:
- Color palette
- Typography rules
- Layout rules (header alignment, content boxes, icons)
- Spacing reference table
- The no-border rule (use boxShadow instead)

## Code Style

- Keep changes minimal and focused
- Match existing patterns in the codebase
- Use inline styles consistently with existing components

## Execution Best Practices

- **Change ONLY what is requested** - when asked to move one element, move only that element. Use `transform: translateY()` to move elements visually without affecting layout of siblings.
- **Don't guess** - understand the exact structure before making changes. Read the code first.
- **My Corner views are the benchmark** - when there's a discrepancy between My Corner and Friend views, always adjust Friend to match My Corner, never the reverse.

## Shared Components Architecture

When views exist in both My Corner and Friend view (Reviews, Wishlist, Profile):

1. **Create a shared Display component** (e.g., `ReviewsDisplay.jsx`, `WishlistDisplay.jsx`)
2. **The shared component defines the EXACT structure** - layout, spacing, decorative elements
3. **Action buttons (+, edit, delete) must be absolutely positioned overlays** - they should NEVER affect the base structure
4. **Don't nest container classes** - shared components should NOT have `className="container"` since parents already provide it
5. **Use render props for customization** (`renderActions`, `renderHeaderActions`) - these are overlays, not structural elements

## UI Development Guidelines

When implementing new UI features, always include cancel/close functionality and test all interaction states (hover, click, focus, escape key) before considering the feature complete.

**Interactive Component Checklist** - For any interactive component (modals, flip cards, overlays), verify these states work:
1. Open/activate
2. Cancel/close
3. Submit/confirm
4. Escape key dismissal
5. Click-outside behavior

## Session Guidelines

After implementing features, run a quick manual interaction test and report any edge cases before marking complete. If session may be interrupted, note remaining work in a TODO comment.

## Development Rules

### Be Proactive, Not Just Reactive
- If a solution requires credentials, environment variables, or external service access — check if there's an MCP server or existing config that can handle it automatically before asking me to do it manually
- If you create something that needs setup (like test credentials), complete the setup yourself instead of giving me instructions
- If you notice a pattern where I'm acting as middleman between you and a service, suggest or implement the automation
- Think one step ahead: don't just complete the task, complete the workflow around the task
