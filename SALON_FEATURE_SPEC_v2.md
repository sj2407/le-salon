# Le Salon — The Salon Feature: Design Specification

## Overview

The Salon becomes the app's landing page (replacing the current default). It is the shared intellectual space where friends gather. My Corner (weekly card, reviews, wishlists) remains in its current location.

**The metaphor:** You open the app and walk into the Salon. The room has two elements:
1. **The Parlor** — A weekly philosophical text with space for friends to respond
2. **The Commonplace Book** — A shared notebook accessed through a typewriter icon, where friends write and read each other's weekly thoughts

Both reset weekly. The Parlor gets a new text. The Commonplace Book starts fresh. Previous weeks are archived silently (stored in the database but not displayed to users yet).

---

## Page Structure: The Salon

The Salon is a **single scrollable page**. The Parlor takes center stage — the full philosophical text is visible without needing to expand. The Commonplace Book is accessed via a persistent visual element (typewriter icon) that opens a separate overlay or sheet.

### Layout (top to bottom):

```
┌─────────────────────────────────────┐
│          SALON HEADER               │
│    "Le Salon" + week indicator      │
│    (e.g., "Week of Feb 10")        │
├─────────────────────────────────────┤
│                                     │
│          THE PARLOR                 │
│                                     │
│  Title: "Stoicism"                  │
│                                     │
│  [Full text of the weekly entry,    │
│   displayed in its entirety.        │
│   Literary typography: serif or     │
│   display font, generous line       │
│   height, reading-optimized.]       │
│                                     │
│  --- (divider) ---                  │
│                                     │
│  "Some things are within our        │
│   power, while others are not..."   │
│   — Epictetus, Enchiridion          │
│                                     │
│  --- (divider) ---                  │
│                                     │
│  Further reading:                   │
│  · Epictetus, Enchiridion           │
│  · Marcus Aurelius, Meditations     │
│  · Seneca, Letters to Lucilius      │
│                                     │
│  Sources: [collapsible or small     │
│  text — links to SEP, IEP, etc.]   │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  "Vos réflexions"                   │
│  [Tappable — expands to reveal      │
│   text input area + existing        │
│   friend responses]                 │
│                                     │
│  When expanded:                     │
│  ┌───────────────────────────────┐  │
│  │ ✏️  Write your response...     │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [Avatar] Marie · 2 days ago   │  │
│  │ "The distinction between      │  │
│  │  preference and dependence    │  │
│  │  is really clarifying..."     │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ [Avatar] Karim · 1 day ago    │  │
│  │ "Nietzsche's critique hits    │  │
│  │  harder than I expected..."   │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  [Typewriter icon]                  │
│  Persistent, floating or anchored   │
│  at bottom of screen                │
│  Tapping opens the Commonplace Book │
└─────────────────────────────────────┘
```

---

## Section Details

### Salon Header

- Title: "Le Salon" — use the app's existing display/heading font
- Subtitle: Week indicator (e.g., "Semaine du 10 février")
- Minimal — a room name, not a toolbar

### The Parlor

**The Weekly Text:**
- Displayed in full, no collapse, no "read more"
- The text IS the page. The user opens the Salon and reads
- Content structure:
  1. Title (e.g., "Stoicism")
  2. Full body text (400-500 words)
  3. Divider
  4. Defining quote with attribution
  5. Divider
  6. Further reading list
  7. Sources (small, unobtrusive — collapsible or small font)
- Typography: literary treatment consistent with the app's existing style system. Claude Code should consult the existing codebase for fonts, sizes, spacing, and padding before implementing. The text should feel like reading a well-set essay within the app's established design language.

**"Vos réflexions" — The Response Section:**
- Sits below the full text
- **Collapsed by default** — shows only the label "Vos réflexions" (styled as an invitation, not a button)
- Optionally shows a count: "Vos réflexions (3)" if friends have responded
- **Tapping expands** to reveal:
  - Text input area at the top ("Write your response..." placeholder)
  - Friend responses below, ordered chronologically (oldest first — conversation order)
- Each response shows:
  - Friend's avatar and name
  - Relative timestamp ("2 days ago")
  - Free-text content
- No likes, no reactions, no threading
- Users can edit/delete their own responses

**Why this structure:** The full text commands the screen. "Vos réflexions" is a gentle doorway — you've finished reading, and now if you want to see what others think (or share your own), you open it. It keeps the reading experience clean while making engagement one tap away.

### The Commonplace Book

**Accessed via a typewriter icon**, not inline on the page. This keeps the Salon page focused on the Parlor text while giving the Commonplace Book its own distinct identity.

**The typewriter icon:**
- A visual element using Soumaya's existing typewriter icon asset
- Position: floating (bottom-right corner) or anchored in the Salon header area — depends on existing app patterns. Claude Code should check how other floating/persistent actions are handled in the current codebase.
- Always visible while on the Salon page
- Subtle animation or indicator if there are new entries from friends (e.g., a small dot or number badge)

**Tapping the typewriter opens:** a full-screen sheet/overlay styled as a notebook or page. This should feel like opening a physical commonplace book.

**Inside the Commonplace Book:**
```
┌─────────────────────────────────────┐
│     The Commonplace Book            │
│     [Close / X button]             │
│                                     │
│  "A shared notebook. What crossed   │
│   your mind this week?"             │
│  (first-time only, or always as     │
│   subtle header text)               │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ ✏️  What's on your mind?       │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [Avatar] Léa · 3 days ago     │  │
│  │ "Started reading Ferrante's   │  │
│  │  Neapolitan novels and I      │  │
│  │  can't put them down..."      │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ [Avatar] Omar · 5 days ago    │  │
│  │ "Visited the Rodin museum     │  │
│  │  yesterday. The way he        │  │
│  │  leaves marble rough around   │  │
│  │  the figures..."              │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

**Entries:**
- Each shows: avatar, name, timestamp, free-text content
- Ordered reverse-chronologically (newest first — notebook style)
- No likes, no reactions
- Users can edit/delete their own entries

**The "page" aesthetic:** The overlay should feel like a page or notebook — not a modal dialog. Think: paper texture, or the same warm tones as the rest of the app, with typography that feels personal/handwritten or at least distinct from the Parlor's literary style.

---

## Data Model

### Weekly Salon Cycle
```
SalonWeek {
  id: string
  weekOf: date (Monday of the week)
  parlorEntry: {
    title: string
    body: string (markdown)
    quote: string
    quoteAttribution: string
    furtherReading: [{title, author, description}]
    sources: [{label, url}]
  }
  parlorResponses: [{
    userId: string
    text: string
    createdAt: timestamp
    updatedAt: timestamp (for edits)
  }]
  commonplaceEntries: [{
    userId: string
    text: string
    createdAt: timestamp
    updatedAt: timestamp (for edits)
  }]
  archivedAt: timestamp (null until the week rolls over)
}
```

### Weekly Rollover
- Every Monday, a new SalonWeek is created with the next parlor entry
- The previous SalonWeek's `archivedAt` is set
- Users see only the current week's SalonWeek
- Archived weeks are stored but not displayed

### Content Management
- The parlor entry text is stored as part of the SalonWeek document
- Soumaya manually sets the text each week (for now)
- The master schedule provides the content pipeline

---

## User Flows

### Flow 1: Opening the app
1. User opens app → lands on The Salon
2. Sees the full Parlor text for this week
3. Reads the text by scrolling
4. Sees "Vos réflexions" below the text
5. Notices the typewriter icon (Commonplace Book)

### Flow 2: Reading the Parlor and responding
1. User reads the full text (no tap needed — it's all there)
2. Scrolls past the text, quote, and reading list
3. Taps "Vos réflexions"
4. Section expands showing input area and existing friend responses
5. User reads friend responses
6. User taps the input, writes their response, submits
7. Response appears in the thread

### Flow 3: Using the Commonplace Book
1. User taps the typewriter icon (from anywhere on the Salon page)
2. A full-screen sheet/overlay opens — the Commonplace Book
3. User sees friends' entries for this week
4. User taps "What's on your mind?", writes, submits
5. Entry appears at the top
6. User closes the sheet to return to the Salon

### Flow 4: Empty states
- **Parlor, no responses yet:** "Vos réflexions" shows without a count. Expanding it shows only the input area. No "be the first!" language — the invitation is the input itself.
- **Commonplace Book, no entries yet:** The notebook opens with the input and a gentle line: "The Commonplace Book is empty this week." or simply the input placeholder.

### Flow 5: Returning mid-week
1. User opens app mid-week
2. Sees the same Parlor text (already read)
3. Can immediately check "Vos réflexions" for new friend responses
4. Can check the typewriter icon for new Commonplace entries
5. Badge/dot on typewriter icon indicates new activity since last visit

---

## Implementation Notes for Claude Code

### Before starting:
1. **Consult the existing codebase** for fonts, sizes, layout, padding, color palette, and component patterns. The Salon should feel native to the app, not like a new app bolted on.
2. **Check how the current navigation works** — the Salon needs to become the landing/home tab. Understand the existing tab structure before modifying it.
3. **Check for existing overlay/sheet patterns** — the Commonplace Book opens as a sheet. Use whatever pattern the app already uses for full-screen overlays.
4. **Check where Soumaya's typewriter icon asset lives** — or create a placeholder that she can replace.

### Key implementation details:
- The Parlor text is **markdown** — render it accordingly (but strip headers, the text itself has no markdown headers, just prose with bold for the quote)
- The "Vos réflexions" section is a collapsible component — collapsed by default, expands on tap with smooth animation
- The Commonplace Book is a separate sheet/overlay, not part of the scroll
- All content (responses, commonplace entries) needs real-time or near-real-time sync so friends see each other's contributions
- Archive happens automatically on week rollover — no user action needed

### What NOT to do:
- Do not add like buttons, reaction emojis, or any social media engagement patterns
- Do not add threading or reply-to functionality
- Do not add notification badges everywhere — at most, a subtle indicator on the typewriter icon
- Do not deviate from the app's existing visual language — this feature should look like it was always part of the app

---

## Design Principles

### What the Salon IS:
- A room you walk into, not a feed you scroll
- The text is the centerpiece — everything else serves it
- Quiet, considered, literary
- Weekly rhythm — one reason to come back each week, no pressure for daily engagement

### What the Salon is NOT:
- Social media (no likes, no reactions, no algorithms)
- A discussion forum (no threading, no reply chains)
- A notification machine

### The two elements have different energies:
- **The Parlor** is structured: here is a text, here is space to respond to it. It's a reading group.
- **The Commonplace Book** is unstructured: write whatever is on your mind. It's a shared notebook.
- The Parlor is on the page (you can't miss it). The Commonplace Book is behind an icon (you choose to open it). This mirrors the difference in formality.

---

## Open Questions for Later

1. **Notifications:** Start minimal. One notification per week: "A new text has arrived in the Parlor." Possibly a second: "X friends have shared their réflexions." No more than that.

2. **Archive access:** Stored but hidden. Future feature: browse previous weeks.

3. **Content management:** Currently manual. Could later be a simple admin screen or scheduled deployment.

4. **Multiple friend groups:** Each Salon (friend group) would have its own Parlor and Commonplace Book. For now, assume one group.

5. **The typewriter icon position:** Floating bottom-right (like a FAB) vs. anchored in the header vs. fixed at the bottom of the Salon page. Test what feels right within the existing app layout.

6. **Commonplace Book "chat":** Soumaya mentioned friends can "read and chat with them" in the Commonplace Book. For v1, keep this as just entries (no chat). If conversation emerges as a need, it can be added later — but adding it now risks turning the Commonplace Book into a messaging app, which contradicts the salon atmosphere.
