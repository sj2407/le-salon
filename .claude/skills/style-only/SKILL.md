---
name: style-only
description: Make pure visual changes without touching logic
disable-model-invocation: true
argument-hint: "[what to style]"
---

**Purpose**: Make pure visual changes without touching logic.

**Instructions**:

You are styling: **[DESCRIPTION]**

## 1. VERIFY STYLE-ONLY

Confirm with user: Is this purely visual? No logic changes?

## 2. READ STYLE GUIDE

**First**, read `README.md` "Design System" section for:
- Layout rules (header alignment, content boxes, icons)
- Spacing reference table
- No-border rule (use boxShadow)
- Edit button positioning

**Then**, read `src/index.css` for:
- Color palette
- Font families
- Animation keyframes
- CSS class names
- Responsive breakpoints

## 3. FIND SIMILAR STYLED COMPONENTS

Find components with similar styling:
```
glob: "src/**/*[SimilarComponent]*.jsx"
read: [found files]
```

How do they apply styles?
- Global CSS classes?
- Inline styles?
- Combination?

## 4. APPLY STYLES MATCHING PATTERN

Match the styling approach of similar components:
- Use same CSS classes if applicable
- Use same inline style structure
- Use same color values
- Use same spacing values
- Use same animation names

## 5. VERIFY NO LOGIC CHANGES

Check:
- No JavaScript logic modified?
- No data fetching changed?
- No event handlers altered?
- Only visual appearance changed?
