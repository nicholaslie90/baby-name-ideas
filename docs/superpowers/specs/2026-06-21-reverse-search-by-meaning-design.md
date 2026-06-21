# Reverse Search by Meaning — Design

**Date:** 2026-06-21
**Status:** Approved

## Goal

Let a user type meaning words (e.g. `joy, happy, glee`) and generate names whose
meanings contain those concepts — the reverse of the existing "pick filters →
get a name" flow.

## Decisions

- **UI:** a third name-style mode, **Arti** (by meaning), alongside Umum and Unik.
- **Data source:** search **both** datasets — the 128 etymology roots
  (`ELEMENTS`) and the ~5,200 attested common names (`COMMON_NAMES`).
- **Matching:** compare each query term against **both** the Indonesian
  (`meaning.id`) and English (`meaning.en`) glosses; a candidate matches if it
  contains **ANY** term (substring match, so `joy` also catches `joyful`).

## UI changes (`ParameterForm.tsx`)

- Add a third entry to `NAME_STYLES`: `{ value: 'meaning', label: 'Arti',
  hint: 'mis. joy, happy, glee' }`.
- When `nameStyle === 'meaning'`, render:
  - A text input **"Kata arti / Meaning words"** bound to `meaningQuery`
    (comma- or space-separated).
  - The existing **Gender** and **Jumlah kata** controls (still apply).
  - Hide the initial-letter and per-word origin controls (not meaningful here).
- `FormState` gains `meaningQuery?: string`.

## Types (`types.ts`)

- Extend `NameStyle`: `'familiar' | 'composed' | 'meaning'`.
- Add `MeaningRequest`:
  ```ts
  interface MeaningRequest {
    surname: string;
    gender: Gender;
    words: number;
    /** Raw meaning query, e.g. "joy, happy, glee". */
    query: string;
  }
  ```
- Add an optional bilingual `message` to `GenerateError` so the result panel can
  show mode-specific text:
  ```ts
  interface GenerateError {
    error: 'empty-pool';
    slotIndex: number;
    message?: { id: string; en: string };
  }
  ```

## Data (`data/index.ts`)

- Export a unified `MEANING_POOL: NameElement[]` = `ELEMENTS` plus every
  `COMMON_NAMES` entry converted to a `NameElement`. Reuse the existing
  `asElement` conversion (move/export it from `generator.ts`, or replicate it in
  the data module). Both pools already carry bilingual `meaning.{id,en}`, so they
  search and render uniformly.

## Generation (`generator.ts`)

New pure function:

```ts
export function generateByMeaning(
  req: MeaningRequest,
  pool: NameElement[],
  rng: () => number = defaultRng(),
): GenerateResult
```

- **Parse terms:** split `req.query` on commas/whitespace → `toLowerCase` → trim
  → drop empties.
- **Empty query:** return an `empty-pool` error with `slotIndex: -1` and a
  message prompting the user to type meaning words. (The App layer surfaces this
  as a gentle notice — see below.)
- **Filter:** keep a candidate if `matchesGender(el, req.gender)` AND its
  `meaning.id` or `meaning.en` (lowercased) contains ANY term as a substring.
- **No candidates:** return `empty-pool` (`slotIndex: -1`) with a bilingual
  message: "No name matches these meanings — try other words."
- **Assemble:** pick `words` parts from the filtered pool, preferring not to
  repeat a part within one name (mirrors `generateFamiliarName`). Capitalize via
  the existing `cleanup`/`capitalize` helpers and join with spaces. Return a
  standard `GeneratedName` (`elements`, `origins`) so `composeMeaning`,
  `composeEtymology`, the frame, and PNG/PDF export all work unchanged.

## App integration (`App.tsx`)

- `runGenerator()` gains a `form.nameStyle === 'meaning'` branch calling
  `generateByMeaning({ surname, gender, words: wordCount, query: form.meaningQuery ?? '' }, MEANING_POOL)`.
- `filterSig` includes `style` (already does) and `meaningQuery` so editing the
  query auto-regenerates once a name has been shown.
- Empty-query errors are shown via the existing error path; the bilingual
  `message` makes them read as guidance rather than failure.

## Result panel (`ResultPanel.tsx`)

- When `error.message` is present, render it (bilingual) instead of the generic
  slot/familiar text. Existing branches are the fallback.

## Trade-off

Because both pools mix, a multi-word result may pair an attested name with a raw
root (e.g. *"Sophia Nur"*). This is consistent with the app's existing composed
aesthetic and is accepted for v1.

## Testing (`tests/generator.test.ts` or a new `tests/meaning.test.ts`)

Unit tests for `generateByMeaning`, following the existing seeded-RNG patterns:

- Term parsing (commas, extra whitespace, mixed case).
- ANY-match across both `id` and `en` glosses.
- Gender filter is honored.
- Output has exactly `words` parts.
- Empty query → error with a message.
- Query that matches nothing → `empty-pool` error with a message.
- Determinism: same seed → same name.

## Out of scope (v1)

- Origin filtering within meaning mode.
- Synonym expansion / fuzzy matching beyond substring.
- Ranking results by match strength.
