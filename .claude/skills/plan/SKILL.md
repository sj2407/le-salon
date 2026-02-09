---
name: plan
description: Create an implementation plan for a new feature or change
disable-model-invocation: true
argument-hint: "[feature description]"
---

**Purpose**: Create an implementation plan for a new feature or change.

**Instructions**:

You are planning: **[FEATURE/CHANGE DESCRIPTION]**

## 1. CLARIFY THE REQUEST

Ask the user:
- What is the goal?
- Are there similar existing features to reference?
- Any specific requirements or constraints?

## 2. FIND SIMILAR EXISTING CODE

Before planning, find and read similar features:

```
glob: "src/**/*[SimilarFeature]*.jsx"
read: [found files]

If database changes needed:
glob: "supabase/migrations/*.sql"
read: [similar migration files]
```

Study how the existing feature works:
- Component structure
- Data fetching patterns
- Database schema and RLS policies
- Routing and navigation
- Styling approach

## 3. CREATE THE PLAN

**Goal**: [One sentence]

**Files to Create**:
- List new files with brief purpose

**Files to Modify**:
- List existing files with what needs to change

**Database Changes** (if needed):
- Migration file name
- Tables/columns to add
- Note: "Match RLS and index patterns from [similar migration file]"

**Implementation Steps**:
1. Step 1 - Reference similar code to copy pattern from
2. Step 2 - Reference similar code to copy pattern from
3. ...

**Testing Checklist**:
- What to verify after implementation

## 4. GET APPROVAL

Ask the user: "Does this approach make sense? Any concerns?"
