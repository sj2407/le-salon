---
name: courant-philosophiques
description: "Generate weekly philosophy entries for Le Salon's Parlor feature. Use when the user asks to write, draft, or generate a philosophy entry for a specific week number, philosophy name, or arc. Covers research, writing, and review following established quality standards. Trigger on: 'week 4', 'write the Augustine entry', 'next Parlor entry', 'generate Cynicism', 'courant philosophiques', etc."
---

# Courant Philosophiques: Parlor Philosophy Entry Generator

Generate high-quality, literary philosophy entries for Le Salon's Parlor feature. Each entry is a ~600-1000 word piece that introduces a philosophical movement through concrete scenes, precise arguments, and unresolved questions designed to spark conversation among intellectually engaged readers.

## Quick Start

When the user asks for a specific week or philosophy:

1. Look up the week in `schedule.md` to get the philosophy, key figures, connections, and sources
2. Read `requirements.md` for quality standards
3. Read `workflow.md` for the research and writing process
4. Follow the four phases below

## Phase 1: Research

For the given philosophy, gather sources in this order:

**Academic sources (always fetch these):**
- Stanford Encyclopedia of Philosophy (SEP) article on the movement
- Internet Encyclopedia of Philosophy (IEP) article on the movement
- Wikipedia article for context and references

**Historical context:**
- Wikipedia articles on the relevant historical period
- Look for: political situation, religious landscape, cultural mood

**Anecdotes and accessibility:**
- Philosophize This! episode transcripts (check episode numbers in schedule.md)
- Extract facts and stories, not style

**Critiques (go to the original critic's text):**
- Search for major critics by name
- Find the actual passages, not summaries of summaries

**Primary sources:**
- Identify 2-4 key texts from SEP/IEP
- Find one defining quote from a primary source

Compile findings into structured research notes following the template in `workflow.md` Section 2.

## Phase 2: Draft

Write the entry following all rules in `requirements.md`. Key principles:

**Structure (no headers or bullets in the final text):**
- Open with a concrete scene, anecdote, or image
- Establish era and historical context
- Present the core philosophical argument step by step
- Define technical terms before building on them
- Include the lineage (founders, developers, popularizers)
- Present a substantive critique traced to the original source
- Close with a question addressed directly to the reader using "you"

**Register:**
- Match the prose to the spirit of the philosophy
- Austere for Stoicism, warm for Epicureanism, blunt for Cynicism, etc.

**Arc continuity:**
- Each entry connects to the previous one
- Closing questions must be distinct from previous entries
- Reference the schedule.md "Connection to previous" field

**Word count:** 600-1000 words body text. Shorter entries are better if the philosophy is thin on systematic thought.

## Phase 3: Self-Review

Before presenting, run through the checklist in `workflow.md` Section 3.3. Critical checks:

- No em-dashes
- No flat adjectives (good, bad, interesting, important)
- No hedging (perhaps, arguably)
- No portentous filler (This changed everything)
- No language that could describe a different philosophy equally well
- Register matches the philosophy's spirit
- Every anecdote demonstrates a specific philosophical claim
- Closing question distinct from all previous entries
- Technical terms defined before use

## Phase 4: Present

Present the draft to the user for feedback. Include:
- The entry text
- Notes on register, arc, and closing question choices
- Any areas where you made judgment calls

Then iterate based on feedback.

## Completed Entries

Check the `examples/` directory for finished entries that set the standard:
- `examples/stoicism.md` (Week 1)
- `examples/epicureanism.md` (Week 2)

These are the reference for tone, depth, structure, and quality. New entries should match this standard.

## File Reference

| File | Purpose |
|------|---------|
| `schedule.md` | Master schedule with all weeks, arcs, key figures, connections, sources |
| `requirements.md` | Quality requirements, structure, style rules, checklist |
| `workflow.md` | Research process, writing rules, style checklist, review phases |
| `examples/stoicism.md` | Completed Week 1 entry (reference) |
| `examples/epicureanism.md` | Completed Week 2 entry (reference) |
