---
name: database-change
description: Make database schema changes safely
disable-model-invocation: true
argument-hint: "[what to change]"
---

**Purpose**: Make database schema changes safely.

**Instructions**:

You are making database change: **[DESCRIPTION]**

## 1. UNDERSTAND THE CHANGE

Clarify with user:
- New table, column, or modification?
- What data needs to be stored?
- Who should have access?
- Similar existing tables?

## 2. READ EXISTING MIGRATIONS

Find the most similar table structure:
```
glob: "supabase/migrations/*.sql"
read: [most similar migration file]
```

Study the migration completely:
- Table structure pattern
- Column types used
- RLS policy patterns
- Index patterns
- Trigger patterns (if any)

## 3. CREATE MIGRATION MATCHING PATTERN

Create `supabase/migrations/[descriptive_name].sql`

Copy the structure from the similar migration:
- Same table creation pattern
- Same RLS enable pattern
- Same policy structure (modify using/with check for your table)
- Same index pattern
- Same naming conventions

## 4. PROVIDE TO USER

Tell user:
"Run this SQL in Supabase SQL Editor: [path to migration file]"

## 5. UPDATE APPLICATION CODE

After migration is ready, update queries in application code to use new table/columns.
