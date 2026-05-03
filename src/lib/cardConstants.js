// Shared category configuration for the weekly card.
// Icons are display-only and added by each component (CardEdit, CardDisplay).
//
// Two shapes exist:
//   - `subcategories: [...]` — fixed buckets. Edit modal renders one input
//     group per bucket. Display renders subheader per entry.
//   - `entryOptions: [...]` — per-entry subcategory picked from a closed list.
//     Edit modal renders a flat list of rows, each with its own dropdown.
//     Display groups entries by subcategory and renders each subheader once.
//
// `entryOptions` is opt-in per section. Other sections continue to use
// `subcategories` and are unaffected.
export const CATEGORY_CONFIG = {
  'Reading': { subcategories: ['book', 'article'] },
  'Listening': { subcategories: ['music', 'podcast', 'audiobook'] },
  'Watching': { subcategories: ['tv', 'movie'] },
  'Looking Forward To': { subcategories: [] },
  'Performing Arts and Exhibits': {
    subcategories: [],
    entryOptions: ['Play', 'Musical', 'Opera', 'Ballet', 'Stand-up', 'Concert', 'Exhibit'],
  },
  'Obsessing Over': { subcategories: [] },
  'My latest AI prompt': { subcategories: [] }
}
