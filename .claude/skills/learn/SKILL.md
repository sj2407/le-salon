---
name: learn
description: Extract knowledge about a pattern or technique
disable-model-invocation: true
argument-hint: "[topic]"
---

**Purpose**: Extract knowledge about a pattern or technique.

**Instructions**:

You are learning about: **[TOPIC]**

## 1. FIND RELEVANT CODE

Search for code related to the topic:
```
glob: "src/**/*[keyword]*.jsx"
grep: pattern for specific code
read: [found files]
```

## 2. TRACE THE PATTERN

Read multiple examples of the pattern:
- How is it used in file A?
- How is it used in file B?
- How is it used in file C?

## 3. IDENTIFY CONSISTENCY

What's consistent across all examples?
- Same structure?
- Same approach?
- Same conventions?

This is the pattern.

## 4. DOCUMENT THE PATTERN

Create notes:
```
# Learning: [Topic]

## Pattern Discovered
[Describe the consistent pattern]

## Examples in Codebase
- `file1.jsx:line` - [Usage]
- `file2.jsx:line` - [Usage]

## When to Use
[Based on where you found it used]
```

## 5. CONSIDER DOCUMENTATION

If this pattern is valuable and repeatable, consider adding it to documentation or MISTAKES_LOG.md.
