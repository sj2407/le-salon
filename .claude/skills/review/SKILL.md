---
name: review
description: Review code for correctness and pattern adherence
disable-model-invocation: true
---

**Purpose**: Review code for correctness and pattern adherence.

**Instructions**:

You are reviewing: **[DESCRIPTION OF CHANGES]**

## 1. READ THE CHANGED CODE

Read all modified/created files completely.

## 2. FIND COMPARISON CODE

Find similar existing code that works correctly:
```
glob: "src/**/*[SimilarFeature]*.jsx"
read: [found file]
```

## 3. COMPARE PATTERNS

For each changed file, compare against the similar working code:

**Structure**: Does it follow the same pattern?
**Data fetching**: Same Supabase query pattern?
**Error handling**: Same try-catch pattern?
**Loading states**: Same loading/error display pattern?
**Styling**: Same class names and style approach?

## 4. CHECK DATABASE (if applicable)

If database changes were made:
- Read a similar working migration file
- Compare RLS policies (same pattern?)
- Compare indexes (covering same query patterns?)

## 5. IDENTIFY ISSUES

List any deviations from existing patterns:
- **Issue**: [What's different]
- **Location**: `file.jsx:line`
- **Fix**: [How to match existing pattern]

## 6. PROVIDE VERDICT

**Status**: ✅ Approved / ⚠️ Needs Changes / ❌ Requires Rework

**Required Changes** (if any):
1. [Change to match existing pattern]
