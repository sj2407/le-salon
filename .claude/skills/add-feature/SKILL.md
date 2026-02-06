---
name: add-feature
description: Add a new feature following existing patterns
disable-model-invocation: true
argument-hint: "[feature description]"
---

**Purpose**: Add a new feature following existing patterns.

**Instructions**:

You are adding: **[FEATURE DESCRIPTION]**

## 1. UNDERSTAND THE FEATURE

Ask clarifying questions:
- What user problem does this solve?
- How should users interact with it?
- Similar existing features to reference?

## 1.5 CHECK FOR DUPLICATION FIRST

Before implementing, scan for similar existing code:
- Does this pattern already exist elsewhere?
- Will this create duplicate code that should be shared?

If duplication exists or will be created:
1. Flag it to the user immediately
2. Propose refactoring into shared module first
3. Only proceed with implementation after consolidation

Why: Every duplicate today becomes double work for every future enhancement (stats, recommendations, exports, integrations).

## 2. FIND ANALOGOUS FEATURE

Find the most similar existing feature:
```
glob: "src/pages/*.jsx"
read: [most similar page]

If database needed:
glob: "supabase/migrations/*.sql"
read: [similar migration]
```

Study the analogous feature completely:
- How is it structured?
- How does it fetch/mutate data?
- How is it styled?
- How is it integrated (routing, navigation)?

## 3. PLAN FOLLOWING THE PATTERN

Based on the analogous feature:
- Create similar page structure
- Create similar database structure (if needed)
- Add similar routes
- Add similar navigation

## 4. IMPLEMENT BY COPYING PATTERN

Create your feature by copying and adapting the analogous feature:
- Copy file structure
- Copy component structure
- Copy data patterns
- Copy styling approach
- Copy integration points

## 5. VERIFY CONSISTENCY

Does your new feature look/feel like it was built by the same person who built the analogous feature?
