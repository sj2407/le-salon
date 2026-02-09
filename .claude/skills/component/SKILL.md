# UI Component Skill

Use this skill when creating interactive UI components (modals, flip cards, dropdowns, overlays, etc.)

## Required States Checklist

When creating interactive UI components, implement and verify ALL of these states:

1. **Open/activate** - Component can be triggered to open/show
2. **Cancel/close button** - User has a clear way to dismiss without submitting
3. **Submit/confirm** - If applicable, the primary action works correctly
4. **Escape key handling** - Pressing Escape dismisses the component
5. **Click-outside behavior** - Clicking outside the component closes it (if appropriate for the UI pattern)

## Implementation Steps

1. Build the basic open/activate functionality first
2. Add the cancel/close mechanism immediately (before any other features)
3. Implement Escape key listener using useEffect
4. Add click-outside detection if needed
5. Test each interaction manually before marking complete

## Code Patterns

### Escape Key Handler
```jsx
useEffect(() => {
  const handleEscape = (e) => {
    if (e.key === 'Escape') onClose()
  }
  if (isOpen) {
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }
}, [isOpen, onClose])
```

### Click-Outside Handler
```jsx
const containerRef = useRef(null)

useEffect(() => {
  const handleClickOutside = (e) => {
    if (containerRef.current && !containerRef.current.contains(e.target)) {
      onClose()
    }
  }
  if (isOpen) {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }
}, [isOpen, onClose])
```

## Before Completing

Run through this verification:
- [ ] Can open the component
- [ ] Can close via cancel/close button
- [ ] Can close via Escape key
- [ ] Click-outside works (if applicable)
- [ ] All interactions work on first try (no multiple clicks needed)
- [ ] Component doesn't trap the user with no way out
