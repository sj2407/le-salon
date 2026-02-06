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

## 6. STYLING RULES FOR SHARED COMPONENTS

When styling views that exist in both My Corner and Friend view:

1. **My Corner is the benchmark** - always match Friend view to My Corner, never the reverse
2. **Change only the source component** - if ReviewsDisplay.jsx is shared, change it there so both views update
3. **Action buttons must be absolutely positioned** - +, edit, delete buttons should use `position: absolute` so they don't affect layout
4. **Move single elements with transform** - use `transform: translateY()` to move one element without affecting siblings
5. **Don't nest container classes** - shared Display components should NOT have `className="container"`

## 7. SINGLE ELEMENT CHANGES

When asked to move/adjust ONE element:
- Use `transform: translateY(Xpx)` or `transform: translateX(Xpx)` for visual-only movement
- Do NOT use margin changes that will push other elements
- Verify only the requested element moved, nothing else shifted
