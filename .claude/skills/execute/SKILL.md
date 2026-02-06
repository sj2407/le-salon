---
name: execute
description: Implement the feature following the approved plan
disable-model-invocation: true
---

**Purpose**: Implement the feature following the approved plan.

**Instructions**:

You are implementing: **[FEATURE/CHANGE FROM PLAN]**

## 1. FOLLOW THE PLAN

Refer to the approved plan from `/plan`. Do not deviate without asking.

## 2. IMPLEMENT STEP-BY-STEP

For each step in the plan:

**A. Read before writing**:
Find and read the similar file referenced in the plan. This is your template.

**B. Match the pattern exactly**:
- Copy the structure (imports, state, useEffect, functions, JSX layout)
- Copy the data fetching pattern
- Copy the error handling and loading states
- Copy the styling approach (class names, inline styles)

**C. Write/Edit**:
Create new files or edit existing files following the pattern.

**D. Verify**:
Does your code match the template's patterns?

## 3. DATABASE CHANGES (if applicable)

Find and read a similar migration file:
```
glob: "supabase/migrations/*.sql"
read: [similar migration]
```

Create your migration file matching the structure:
- Same table structure pattern
- Same RLS policy pattern
- Same index pattern

Tell user: "Run this SQL in Supabase SQL Editor: [path to migration]"

## 4. INTEGRATION POINTS

If adding routes, read `src/App.jsx` and match the route pattern.

If adding navigation, read `src/components/Navigation.jsx` and match how other items are added.

If adding notifications, find where notifications are created elsewhere and match that pattern.

## 5. VERIFY COMPLETENESS

Check:
- All files from plan created/modified?
- Patterns match existing code?
- No hardcoded values that should come from database?

## 6. EXECUTION PRINCIPLES

**Change only what is requested**:
- If asked to move one element, move ONLY that element
- Use `transform` for visual-only changes that don't affect siblings
- Don't guess or assume - ask if unclear

**Don't affect unrelated elements**:
- Margin changes push siblings - use `transform` instead for isolated moves
- Action buttons (+, edit, delete) should be `position: absolute` overlays
- Verify your change didn't shift anything else

**My Corner is the benchmark**:
- When shared views differ, adjust Friend view to match My Corner
- Never change My Corner to match Friend view

## 7. SUMMARIZE

**Implemented**: [Feature name]
**Files Created**: [List]
**Files Modified**: [List]
**Next Steps**: [What user should do]
