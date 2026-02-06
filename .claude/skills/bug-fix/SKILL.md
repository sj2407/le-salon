---
name: bug-fix
description: Systematically diagnose and fix a bug
disable-model-invocation: true
argument-hint: "[bug description]"
---

**Purpose**: Systematically diagnose and fix a bug.

**Instructions**:

You are fixing: **[BUG DESCRIPTION]**

## 1. REPRODUCE & UNDERSTAND

Ask the user:
- Expected behavior?
- Actual behavior?
- Steps to reproduce?
- Error messages?
- Which page/component?

## 1.5 CHECK FOR ROOT CAUSE

Before fixing:
- Is this bug appearing because of code duplication?
- Is the same bug likely in similar code elsewhere?

If yes, flag for refactoring rather than patching multiple places.

## 2. LOCATE THE BUG

Find the affected code:
```
glob: "src/**/*[ComponentName]*.jsx"
read: [found file]
```

Trace the data flow:
- Where does data come from?
- What transforms it?
- Where does it fail?

## 3. FIND WORKING REFERENCE

Find similar code that works correctly:
```
glob: "src/**/*[SimilarWorkingFeature]*.jsx"
read: [found file]
```

## 4. COMPARE AND FIX

Compare the buggy code to the working code:
- What's different?
- What pattern is the buggy code missing?
- How does the working code handle this case?

Apply the fix by matching the working pattern.

## 5. VERIFY THE FIX

- Does it now match the working pattern?
- Does it handle the edge case?
- Could this break anything else?

## 6. TEST & DOCUMENT

Tell user how to test the fix.

Add to MISTAKES_LOG.md:
```
### [Date] - [Bug Name]
**Problem**: [Description]
**Location**: `file.jsx:line`
**Cause**: [Root cause]
**Fix**: [What was changed]
**Pattern**: [What to follow in future]
```
