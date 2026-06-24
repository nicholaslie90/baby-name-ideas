# Own-Name Meaning Candidates — Design

**Date:** 2026-06-24
**Mode affected:** "Nama Sendiri" (`nameStyle: 'analyze'`)

## Problem

When a user types their own name (e.g. *Shan Markus Susanto*), the app frequently
shows "Arti tidak ditemukan · Meaning not found". The current `analyzeName` resolves
each word to **exactly one** interpretation, in order: exact attested-name match →
first greedy root decomposition → "not found" placeholder. Two gaps cause the misses:

1. **No near-spelling matches.** The dataset has *Marcus* (Latin) and *Mark*
   (biblical) but not the spelling *Markus*, so an exact-only lookup fails.
2. **No choice when several meanings exist.** A name can be attested across multiple
   etymology families with different meanings, but only the first is ever surfaced.

## Goal

Let the analyze mode surface **multiple candidate meanings per word**, drawn from the
existing dataset, and let the user **pick the etymology/meaning** they intend, per
word, via chips. The composed frame updates live from the selections.

Non-goal: inventing meanings not present in the dataset. Candidates are always grounded
in existing `CommonName` / `NameElement` data.

## Approach (chosen: A — candidate layer + derived GeneratedName)

A new pure function gathers ranked candidates per word. `App` holds per-word selection
state and **derives** a `GeneratedName` from the selected candidates, which flows into
the existing `ResultPanel` / `NameFrame` / export paths unchanged. Chips render only in
analyze mode.

Rejected alternatives:
- **B — bake `alternatives` into `GeneratedName.elements`:** pollutes the shared type
  used by every mode; frame/export must learn to ignore the extra field. More risk.
- **C — global list of full-name combinations:** rejected earlier; combinations explode
  for multi-word names, and per-word chips were preferred.

## Components

### 1. Candidate gathering — `analyzeNameCandidates(input, names, elements)`

Pure function in `src/lib/generator.ts` (alongside `analyzeName`, which stays for
back-compat / other callers and tests). Splits `input` on whitespace; the surname is
NOT part of `input` (it stays display-only via the form). For each word
(case-insensitive, stripped to `[a-z]`), gathers candidates from three sources:

- **Exact across etymologies** — ALL `CommonName` entries whose name equals the word
  (today only the first is kept; this keeps every match). `kind: 'exact'`.
- **Fuzzy (Levenshtein distance ≤ 2 AND same first letter)** — e.g. `markus`→`marcus`
  (dist 1), `markus`→`mark` (dist 2). `kind: 'fuzzy'`, carries `distance`.
- **Root decomposition** — the existing greedy `findRoots` split as one candidate;
  plus bounded alternative splits (varying the first root choice). `kind: 'root'`.

Returns:

```ts
type MeaningCandidate = {
  kind: 'exact' | 'fuzzy' | 'root';
  label: string;          // short bilingual label for the chip
  displayName: string;    // name/spelling this candidate represents
  origin: Origin;
  meaning: { id: string; en: string };
  distance?: number;      // for fuzzy
};

type WordAnalysis = {
  raw: string;            // the word as typed (casing preserved)
  candidates: MeaningCandidate[];  // ranked; may be a single "not found" entry
};

// analyzeNameCandidates -> WordAnalysis[]   (empty input -> [])
```

### 2. Ranking, dedup, cap

- **Order:** `exact` → `fuzzy` (ascending `distance`) → `root`.
- **Dedup** by `(displayName + origin + meaning.id + meaning.en)`.
- **Cap:** max **6** candidates per word; extras dropped (kept order means the best
  survive). When truncated, this is a silent UI cap (acceptable — best candidates win).
- **Default selection:** index 0 (top candidate).
- **Zero candidates:** a single synthetic candidate `{ kind:'root', meaning:{ id:'arti
  tidak ditemukan', en:'meaning not found' }, origin:'lainnya' }` — preserves today's
  graceful fallback.

### 3. App state & data flow

In analyze mode:
- `analyzeNameCandidates(form.ownName, COMMON_NAMES, ELEMENTS)` is memoized on the typed
  name.
- `App` holds `selections: number[]` (one index per word), reset/clamped when the typed
  name (and thus candidate shape) changes.
- A derived `GeneratedName` is built from the selected candidate of each word using the
  existing `asElement` shape and `composeMeaning`. Surname comes from the form as today.
- Changing a chip updates `selections` → frame re-composes live. **No history entry is
  added per interaction**; the random-generation history / Prev-Next / no-repeat flow is
  bypassed in analyze mode (it is not meaningful there).

Other modes (`generate`, `familiar`, `meaning`) are untouched.

### 4. UI — `WordCandidateChips`

New component rendered by `ResultPanel`, only in analyze mode, above the frame.
- One row per word; each row is a `role="radiogroup"` of chips (`role="radio"`,
  `aria-checked`).
- Selected chip highlighted. Chip text: short bilingual gloss + origin (e.g.
  `Marcus · kuat, perang · Latin`). Fuzzy chips may hint the matched spelling.
- A word with only the "not found" fallback shows a single inert chip.

### 5. Frame & export

Unchanged. They consume the derived `GeneratedName`.

## Testing

**Unit — `analyzeNameCandidates` (tests/analyzeCandidates.test.ts):**
- Multiple exact matches across origins are all returned.
- Fuzzy: distance ≤2 with same first letter included; distance >2 or different first
  letter excluded.
- Root decomposition produces candidate(s).
- Dedup removes identical `(displayName, origin, meaning)`.
- Cap at 6 enforced.
- Ranking order: exact → fuzzy(by distance) → root.
- Zero-candidate word yields the "not found" fallback candidate.
- Multi-word input yields one `WordAnalysis` per word; surname not part of input.

**Component — `WordCandidateChips` (tests/wordCandidateChips.test.tsx):**
- Renders one radiogroup per word with the expected chips.
- Clicking a chip changes selection and the composed meaning shown.

## Out of scope

- Adding new dictionary entries / new etymology families.
- Cross-cultural meanings (e.g. Chinese "Shan = mountain") unless already in the data.
- Spelling normalization tables beyond the generic Levenshtein fuzzy match.
