---
name: explore
description: Find and understand how something works in the codebase
disable-model-invocation: true
argument-hint: "[topic or feature]"
---

**Purpose**: Find and understand how something works in the codebase.

**Instructions**:

You are exploring: **[USER'S QUESTION]**

## 1. IDENTIFY SEARCH STRATEGY

Based on the question, determine what to search for:
- Feature/component name?
- Styling pattern?
- Data flow?
- Database schema?

## 2. SEARCH SYSTEMATICALLY

Use Glob and Grep to find relevant files:

```
For features: glob "src/**/*[keyword]*.jsx"
For styling: read src/index.css and search for class names
For data: glob "supabase/migrations/*.sql"
For routing: read src/App.jsx
```

## 3. READ AND TRACE

Once you find relevant files:
- Read the files completely
- Trace data flow from database → component → UI
- Note dependencies and relationships
- Find related files (imports, references)

## 4. DOCUMENT FINDINGS

Create a clear summary:
- **What**: Brief description
- **Where**: File paths
- **How**: Data flow in numbered steps
- **Key files**: List with line numbers for important code

## 5. ANSWER THE QUESTION

Provide a concise answer with file references (e.g., `src/pages/File.jsx:123`).
