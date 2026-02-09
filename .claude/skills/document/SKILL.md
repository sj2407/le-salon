---
name: document
description: Update documentation to reflect changes
disable-model-invocation: true
argument-hint: "[what to document]"
---

**Purpose**: Update documentation to reflect changes.

**Instructions**:

You are documenting: **[FEATURE/CHANGE]**

## 1. IDENTIFY DOCS TO UPDATE

For new features:
- README.md
- src/pages/Help.jsx (if user-facing)
- Feature-specific docs (if complex)

For bugs:
- MISTAKES_LOG.md

For database changes:
- README.md database section

## 2. READ EXISTING DOCUMENTATION

Read the files you need to update:
```
read: README.md
read: src/pages/Help.jsx
read: MISTAKES_LOG.md
```

Study the style:
- How are features documented?
- What level of detail?
- What format/structure?

## 3. MATCH THE DOCUMENTATION STYLE

Add your documentation matching the existing style exactly:
- Same section structure
- Same level of detail
- Same formatting
- Same tone

## 4. KEEP IT LEAN

Don't document what's obvious from reading code.
Focus on "why" and "how to use", not "what" (that's obvious).
