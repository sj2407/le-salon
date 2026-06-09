// Fixtures for mock mode — TypeScript constants bundled at deploy time.
// Each key maps to a pre-crafted API response for a specific call.
// After verifying a real API response, replace the hand-crafted version.

export const FIXTURES: Record<string, unknown> = {
  // ── Feature A: URL classification ─────────────────────────────────
  'haiku-classify-book': {
    content: [{ type: 'text', text: '{"classification":"book","routed_to":"la_liste","confidence":0.95,"fields":{"title":"The Stranger","creator":"Albert Camus","tag":"book"}}' }],
    usage: { input_tokens: 400, output_tokens: 100 },
  },
  'haiku-classify-activity': {
    content: [{ type: 'text', text: '{"classification":"activity","routed_to":"activity","confidence":0.92,"fields":{"title":"Frida Kahlo: Making Her Self Up","city":"London","location":"V&A Museum","date_text":"Until Apr 30, 2026"}}' }],
    usage: { input_tokens: 420, output_tokens: 120 },
  },
  'haiku-classify-movie': {
    content: [{ type: 'text', text: '{"classification":"movie","routed_to":"la_liste","confidence":0.9,"fields":{"title":"Past Lives","creator":"Celine Song","tag":"movie"}}' }],
    usage: { input_tokens: 400, output_tokens: 100 },
  },
  'haiku-classify-other': {
    content: [{ type: 'text', text: '{"classification":"other","routed_to":"la_liste","confidence":0.5,"fields":{"title":"Interesting Link"}}' }],
    usage: { input_tokens: 380, output_tokens: 80 },
  },
};
