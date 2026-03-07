// Mock data for Portrait tab — used as fallback during development

export const MOCK_SPOTIFY_PROFILE = {
  mood_label: 'Melancholic',
  mood_line: 'minor key \u00b7 contemplative \u00b7 slow',
  portrait_text: 'You live in the space between minor chords and marginalia \u2014 drawn to music that lingers and books that ask more than they answer. There is a thread of quiet intensity running through everything you return to.',
  top_artists: [
    { name: 'Radiohead', image_url: null, genres: ['art rock', 'alternative rock'] },
    { name: 'Bon Iver', image_url: null, genres: ['indie folk', 'chamber pop'] },
    { name: 'Nils Frahm', image_url: null, genres: ['neo-classical', 'ambient'] },
    { name: 'Fiona Apple', image_url: null, genres: ['art pop', 'singer-songwriter'] },
    { name: 'Nick Drake', image_url: null, genres: ['folk', 'chamber folk'] },
  ],
  top_genres: [
    { genre: 'Indie Folk', count: 12 },
    { genre: 'Art Rock', count: 9 },
    { genre: 'Neo-Classical', count: 7 },
    { genre: 'Alternative Rock', count: 6 },
    { genre: 'Ambient', count: 4 },
  ],
  listening_mode: 'immersion',
  cultural_geography: [
    { region: 'United Kingdom', count: 8 },
    { region: 'France', count: 3 },
  ],
  is_active: true,
}

export const MOCK_BOOKS = [
  { id: '1', title: 'The Rings of Saturn', author: 'W.G. Sebald', cover_url: null, status: 'read', rating: 9, google_books_genres: ['Fiction', 'Literary Fiction'] },
  { id: '2', title: 'Dept. of Speculation', author: 'Jenny Offill', cover_url: null, status: 'read', rating: 8, google_books_genres: ['Fiction'] },
  { id: '3', title: 'The Stranger', author: 'Albert Camus', cover_url: null, status: 'read', rating: 10, google_books_genres: ['Fiction', 'Philosophy'] },
  { id: '4', title: 'Outline', author: 'Rachel Cusk', cover_url: null, status: 'reading', rating: null, google_books_genres: ['Fiction'] },
]

export const MOCK_READING_THEMES = ['memory & loss', 'the absurd', 'female interiority']

export const MOCK_EXPERIENCES = [
  { id: '1', name: 'Anselm Kiefer at Grand Palais', category: 'exhibition', date: '2026-01-15', city: 'Paris', note: 'Overwhelming scale. The lead books.' },
  { id: '2', name: 'Nils Frahm at Philharmonie', category: 'concert', date: '2025-12-20', city: 'Paris', note: null },
  { id: '3', name: 'Chartier', category: 'restaurant', date: '2025-11-10', city: 'Paris', note: 'Belle \u00c9poque dining room.' },
]

export const MOCK_CREATIONS = [
  { id: '1', type: 'text', title: 'November', text_content: 'The leaves remember falling\nbefore they learn to let go.\nI am still learning.', is_visible: true, created_at: '2026-02-01T10:00:00Z' },
  { id: '2', type: 'text', title: null, text_content: 'Light enters the room like an apology.', is_visible: true, created_at: '2026-01-15T10:00:00Z' },
]

export const EXPERIENCE_CATEGORIES = [
  { value: 'concert', label: 'Concert', icon: '\ud83c\udfb5' },
  { value: 'exhibition', label: 'Exhibition', icon: '\ud83d\uddbc\ufe0f' },
  { value: 'restaurant', label: 'Restaurant', icon: '\ud83c\udf7d\ufe0f' },
  { value: 'cinema', label: 'Cinema', icon: '\ud83c\udfac' },
  { value: 'theatre', label: 'Theatre', icon: '\ud83c\udfad' },
  { value: 'other', label: 'Other', icon: '\u2728' },
]
