# Definition of Done Skill

Use this skill at the START of any feature or fix implementation.

## Before Building

State explicit acceptance criteria. For interactive components, always include:

1. **Open/activate** - Component can be triggered
2. **Edit existing content** - User can modify pre-populated data
3. **Save** - Changes persist to database
4. **Cancel/close** - User can exit without saving
5. **Escape key** - Pressing Escape dismisses without saving
6. **Click outside** - Clicking backdrop closes (if applicable)
7. **No blank flash** - Page updates smoothly

Format:
```
## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
...
```

Ask user to confirm criteria before proceeding.

## After Building

Walk through EVERY criterion and verify:

```
## Verification Results
| Criterion | Status | Notes |
|-----------|--------|-------|
| Open/activate | ✅ | Works on first click |
| Edit existing | ❌ | Focus lost on blur |
...
```

## Rules

- **NEVER say "done" until all criteria pass**
- If any criterion fails, fix it before reporting completion
- If a fix introduces new issues, re-verify ALL criteria
- Run `npm run test:ui` if available to verify automatically
