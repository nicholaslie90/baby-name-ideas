# Sanskrit/Javanese Fused Compound Names — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the "Unik" (composed) mode fuse 1–2 etymology roots into a single word (e.g. `guna`+`dharma` → **Gunadharma**) so names like *Gunadharma Wijaya Wangsa* generate with correct per-word meanings.

**Architecture:** Add a `fuse` flag to `GenerateRequest` and a `wordGroups: number[]` field to `GeneratedName`. `generateName` resolves each slot's candidate pool, decides which words fuse, and builds fused word text with light vowel-sandhi cleanup. `composeMeaning` chunks elements by `wordGroups` so each word's roots render joined while words stay separated. The Sanskrit dataset is enriched to ~80+ roots. A new UI toggle in composed mode drives the flag.

**Tech Stack:** React 18 + TypeScript + Vite, Vitest, pure functions with a seeded PRNG (`makeRng`).

## Global Constraints

- All meanings are **bilingual**: every `meaning` object has non-empty `id` (Indonesian) and `en` (English) strings — copied verbatim convention from the existing dataset.
- Generation stays **pure & deterministic**: all randomness flows through the injected `rng: () => number`; never call `Math.random()` directly inside logic that tests seed.
- **Backward compatibility:** consumers that pass a `GeneratedName` without `wordGroups` (e.g. existing `composeMeaning` tests, other generators) must keep their current behavior unchanged.
- New Sanskrit roots use id prefix `sa-<text>`, `origin: "sanskerta"`, and lowercase `text`/`initial`.
- Run the whole suite with `npm test` (Vitest, `vitest run`).

---

### Task 1: Generator fusion + type changes

**Files:**
- Modify: `src/types.ts` (`GenerateRequest`, `GeneratedName`)
- Modify: `src/lib/generator.ts:76-98` (`generateName`) + new helpers
- Test: `tests/generator.test.ts`

**Interfaces:**
- Consumes: existing `matchesGender`, `matchesSlot`, `preferByPosition`, `pick`, `cleanup`, `capitalize`, `distinct` in `src/lib/generator.ts`.
- Produces:
  - `GenerateRequest.fuse?: boolean`
  - `GeneratedName.wordGroups?: number[]` (count of roots per word; `sum === elements.length`)
  - `generateName(req, pool, rng?)` now returns `wordGroups` and may emit multi-root words when `req.fuse` is true.

- [ ] **Step 1: Add the type fields**

In `src/types.ts`, extend `GenerateRequest` (around line 102-106):

```ts
export interface GenerateRequest {
  surname: string;
  gender: Gender;
  slots: SlotConstraint[];
  /** When true, each slot may fuse 1–2 roots into a single word (samasa style). */
  fuse?: boolean;
}
```

And extend `GeneratedName` (around line 136-142):

```ts
export interface GeneratedName {
  name: string;
  surname: string;
  elements: NameElement[];
  /** Distinct origins used, in first-seen order. */
  origins: Origin[];
  /**
   * Number of roots per word. sum(wordGroups) === elements.length.
   * Absent => each element is its own word (backward compatible).
   */
  wordGroups?: number[];
}
```

- [ ] **Step 2: Write failing tests for fusion**

Append to `tests/generator.test.ts` (inside the file, after the existing `describe('generateName', ...)` block — a new describe is fine):

```ts
describe('generateName fusion', () => {
  it('fuses at least one word into 2 roots when fuse is on', () => {
    const r = generateName(
      { surname: '', gender: 'N', slots: [{}, {}, {}], fuse: true },
      POOL,
      makeRng(7),
    );
    const g = r as GeneratedName;
    expect(isGenerateError(r)).toBe(false);
    // wordGroups sums to the number of elements, one entry per word.
    expect(g.wordGroups!.reduce((a, b) => a + b, 0)).toBe(g.elements.length);
    expect(g.wordGroups).toContain(2);
    // A fused name has fewer space-separated words than roots.
    const words = g.name.split(' ');
    expect(words.length).toBe(g.wordGroups!.length);
    expect(g.elements.length).toBeGreaterThan(words.length);
  });

  it('collapses a repeated vowel at the fusion seam', () => {
    // 'luna' (ends 'a') + 'adi'-like... use a pool guaranteeing an a|a seam.
    const seamPool: NameElement[] = [
      { id: 'x1', text: 'wira', initial: 'w', origin: 'sanskerta', gender: 'N', meaning: { id: 'berani', en: 'brave' } },
      { id: 'x2', text: 'adi', initial: 'a', origin: 'sanskerta', gender: 'N', meaning: { id: 'utama', en: 'first' } },
    ];
    const r = generateName(
      { surname: '', gender: 'N', slots: [{}], fuse: true },
      seamPool,
      makeRng(1),
    );
    const g = r as GeneratedName;
    // Fused word should be 'Wiradi' (one 'a' dropped), never 'Wiraadi'.
    expect(g.name).not.toMatch(/aa/i);
  });

  it('emits all-1 wordGroups and never fuses when fuse is off', () => {
    const r = generateName({ surname: '', gender: 'N', slots: [{}, {}], fuse: false }, POOL, makeRng(7));
    const g = r as GeneratedName;
    expect(g.wordGroups).toEqual([1, 1]);
    expect(g.elements).toHaveLength(2);
  });

  it('falls back to a single root when a slot pool has fewer than 2 candidates', () => {
    const tiny: NameElement[] = [
      { id: 'o1', text: 'luna', initial: 'l', origin: 'latin', gender: 'N', meaning: { id: 'bulan', en: 'moon' } },
    ];
    const r = generateName({ surname: '', gender: 'N', slots: [{}], fuse: true }, tiny, makeRng(3));
    const g = r as GeneratedName;
    expect(g.wordGroups).toEqual([1]);
    expect(g.elements).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/generator.test.ts -t fusion`
Expected: FAIL — `wordGroups` is `undefined` (not an array), so `g.wordGroups!.reduce` / `.toEqual([1,1])` throw or mismatch.

- [ ] **Step 4: Implement fusion in `generateName`**

In `src/lib/generator.ts`, add helpers above `generateName` (near the other helpers, after `distinct`):

```ts
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

/** Glue two root texts; drop one of a doubled vowel at the seam (light sandhi). */
function fuseText(a: string, b: string): string {
  if (a.length > 0 && b.length > 0) {
    const last = a[a.length - 1];
    if (VOWELS.has(last) && last === b[0]) return a + b.slice(1);
  }
  return a + b;
}

/**
 * Decide which words fuse (2 roots) vs stay single (1 root). When `fuse` is on,
 * each slot whose pool has >= 2 candidates fuses with 50% chance, and at least
 * one eligible slot is guaranteed to fuse. Returns a boolean per slot.
 */
function decideFusion(
  bases: NameElement[][],
  fuse: boolean,
  rng: () => number,
): boolean[] {
  const flags = bases.map(() => false);
  if (!fuse) return flags;
  const eligible: number[] = [];
  for (let i = 0; i < bases.length; i++) if (bases[i].length >= 2) eligible.push(i);
  if (eligible.length === 0) return flags;
  for (const i of eligible) flags[i] = rng() < 0.5;
  if (!eligible.some((i) => flags[i])) flags[eligible[0]] = true;
  return flags;
}
```

Then replace the body of `generateName` (lines 76-98) with:

```ts
export function generateName(
  req: GenerateRequest,
  pool: NameElement[],
  rng: () => number = defaultRng(),
): GenerateResult {
  const total = req.slots.length;

  // Phase 1: resolve each slot's candidate pool up front.
  const bases: NameElement[][] = [];
  for (let i = 0; i < total; i++) {
    const base = pool.filter((e) => matchesGender(e, req.gender) && matchesSlot(e, req.slots[i]));
    if (base.length === 0) return { error: 'empty-pool', slotIndex: i };
    bases.push(base);
  }

  // Phase 2: decide which words fuse.
  const fuseFlags = decideFusion(bases, !!req.fuse, rng);

  // Phase 3: build each word.
  const chosen: NameElement[] = [];
  const wordGroups: number[] = [];
  const words: string[] = [];
  for (let i = 0; i < total; i++) {
    const base = bases[i];
    if (fuseFlags[i]) {
      // First root avoids suffix-only; second avoids prefix-only (positions of a 2-slot word).
      const a = pick(preferByPosition(base, 0, 2), rng);
      const rest = base.filter((e) => e.id !== a.id);
      const b = pick(preferByPosition(rest, 1, 2), rng);
      chosen.push(a, b);
      words.push(capitalize(cleanup(fuseText(a.text, b.text))));
      wordGroups.push(2);
    } else {
      const el = pick(preferByPosition(base, i, total), rng);
      chosen.push(el);
      words.push(capitalize(cleanup(el.text)));
      wordGroups.push(1);
    }
  }

  return {
    name: words.join(' '),
    surname: req.surname.trim(),
    elements: chosen,
    origins: distinct(chosen.map((e) => e.origin)),
    wordGroups,
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/generator.test.ts`
Expected: PASS — all existing `generateName` tests plus the four new fusion tests. (Existing tests don't check `wordGroups`, so the added field doesn't break them.)

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/lib/generator.ts tests/generator.test.ts
git commit -m "feat: fuse 1-2 roots into one word in composed generator"
```

---

### Task 2: Per-word meaning composition

**Files:**
- Modify: `src/lib/composeMeaning.ts:13-22` (`composeMeaning`)
- Test: `tests/composeMeaning.test.ts`

**Interfaces:**
- Consumes: `GeneratedName.wordGroups` from Task 1; existing local `capitalize`.
- Produces: `composeMeaning(g)` groups roots per word — roots inside a fused word join with `-` using each root's **first sense** (text before the first comma); single-root words keep their full gloss; words join with ` · `.

- [ ] **Step 1: Write failing tests**

Append to `tests/composeMeaning.test.ts` (new describe inside the file):

```ts
describe('composeMeaning grouping', () => {
  const guna: NameElement = { id: 'g', text: 'guna', initial: 'g', origin: 'sanskerta', gender: 'N', meaning: { id: 'kebajikan, kebaikan', en: 'virtue, merit' } };
  const dharma: NameElement = { id: 'd', text: 'dharma', initial: 'd', origin: 'sanskerta', gender: 'N', meaning: { id: 'kebenaran, kewajiban', en: 'righteousness, duty' } };
  const wijaya: NameElement = { id: 'w', text: 'wijaya', initial: 'w', origin: 'sanskerta', gender: 'L', meaning: { id: 'kemenangan', en: 'victory' } };

  it('joins fused roots with a hyphen (first sense) and words with a middot', () => {
    const g: GeneratedName = {
      name: 'Gunadharma Wijaya',
      surname: '',
      elements: [guna, dharma, wijaya],
      origins: ['sanskerta'],
      wordGroups: [2, 1],
    };
    const m = composeMeaning(g);
    expect(m.id).toBe('Kebajikan-kebenaran · Kemenangan');
    expect(m.en).toBe('Virtue-righteousness · Victory');
  });

  it('keeps the full gloss for single-root words (all-1 groups)', () => {
    const g: GeneratedName = {
      name: 'Guna Wijaya',
      surname: '',
      elements: [guna, wijaya],
      origins: ['sanskerta'],
      wordGroups: [1, 1],
    };
    const m = composeMeaning(g);
    // Single-root words keep the comma-listed senses, not just the first.
    expect(m.id).toBe('Kebajikan, kebaikan · Kemenangan');
    expect(m.en).toBe('Virtue, merit · Victory');
  });
});
```

(The existing tests — which pass a `GeneratedName` with **no** `wordGroups` — must still pass; do not edit them.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/composeMeaning.test.ts -t grouping`
Expected: FAIL — current code joins every element with ` · ` ignoring `wordGroups`, so `m.id` is `Kebajikan, kebaikan · Kebenaran, kewajiban · Kemenangan` (not the grouped/hyphenated string).

- [ ] **Step 3: Implement grouping**

Replace the body of `composeMeaning` in `src/lib/composeMeaning.ts` (lines 13-22) with:

```ts
export function composeMeaning(g: GeneratedName): Bilingual {
  const groups = g.wordGroups ?? g.elements.map(() => 1);

  // Chunk elements into words per `groups`; any leftover becomes its own word.
  const words: GeneratedName['elements'][] = [];
  let idx = 0;
  for (const n of groups) {
    words.push(g.elements.slice(idx, idx + n));
    idx += n;
  }
  while (idx < g.elements.length) {
    words.push([g.elements[idx]]);
    idx += 1;
  }

  const render = (lang: 'id' | 'en'): string =>
    words
      .map((w) =>
        w.length === 1
          ? capitalize(w[0].meaning[lang])
          : w.map((e) => capitalize(firstSense(e.meaning[lang]))).join('-'),
      )
      .join(' · ');

  return { id: render('id'), en: render('en') };
}

/** The leading sense of a gloss — text before the first comma, trimmed. */
function firstSense(s: string): string {
  const i = s.indexOf(',');
  return (i >= 0 ? s.slice(0, i) : s).trim();
}
```

Note: the old single-element early-return is removed — a one-word name now flows through the same path (`groups` defaults to `[1]`, producing the full gloss), preserving existing behavior.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/composeMeaning.test.ts`
Expected: PASS — the two new grouping tests plus both original tests (single element and the no-`wordGroups` two-element case).

- [ ] **Step 5: Commit**

```bash
git add src/lib/composeMeaning.ts tests/composeMeaning.test.ts
git commit -m "feat: group fused-word meanings per word in composeMeaning"
```

---

### Task 3: Enrich the Sanskrit/Javanese vocabulary

**Files:**
- Modify: `src/data/elements.sanskerta.json` (append 54 new roots; 32 → 86)
- Test: `tests/dataset.test.ts`

**Interfaces:**
- Consumes: nothing (pure data).
- Produces: ≥80 Sanskrit roots in the pool, including `guna`, `dharma`, `wangsa`, each a valid `NameElement` shape with bilingual non-empty meanings. Glosses are ordered so the **leading sense** reads well when fused (e.g. `guna` → "kebajikan", `dharma` → "kebenaran").

- [ ] **Step 1: Write failing tests**

Append to `tests/dataset.test.ts` (new describe inside the file):

```ts
import sanskerta from '../src/data/elements.sanskerta.json';

describe('enriched sanskerta vocabulary', () => {
  it('has at least 80 roots', () => {
    expect(sanskerta.length).toBeGreaterThanOrEqual(80);
  });

  it('includes the roots used by Gunadharma Wijaya Wangsa', () => {
    const texts = new Set(sanskerta.map((e: any) => e.text));
    for (const t of ['guna', 'dharma', 'wangsa', 'wijaya']) {
      expect(texts.has(t)).toBe(true);
    }
  });

  it('every root has the required shape with non-empty bilingual meanings', () => {
    for (const e of sanskerta as any[]) {
      expect(e.id).toMatch(/^sa-/);
      expect(typeof e.text).toBe('string');
      expect(e.text.length).toBeGreaterThan(0);
      expect(e.initial).toBe(e.text[0]);
      expect(e.origin).toBe('sanskerta');
      expect(['L', 'P', 'N']).toContain(e.gender);
      expect(e.meaning.id.trim().length).toBeGreaterThan(0);
      expect(e.meaning.en.trim().length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate texts', () => {
    const texts = sanskerta.map((e: any) => e.text);
    expect(new Set(texts).size).toBe(texts.length);
  });
});
```

If `tests/dataset.test.ts` does not already import JSON with `resolveJsonModule`, this works because the project already imports these JSON files in `src/data/index.ts`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/dataset.test.ts -t "enriched sanskerta"`
Expected: FAIL — `sanskerta.length` is 32 (< 80) and `guna`/`dharma`/`wangsa` are absent.

- [ ] **Step 3: Append the new roots**

Add these objects to the array in `src/data/elements.sanskerta.json` (insert before the closing `]`, with a comma after the current last element). Keep two-space indentation to match the file.

```json
  { "id": "sa-guna", "text": "guna", "initial": "g", "origin": "sanskerta", "gender": "N", "meaning": { "id": "kebajikan, kebaikan", "en": "virtue, merit" } },
  { "id": "sa-dharma", "text": "dharma", "initial": "d", "origin": "sanskerta", "gender": "N", "meaning": { "id": "kebenaran, kewajiban", "en": "righteousness, duty" } },
  { "id": "sa-wangsa", "text": "wangsa", "initial": "w", "origin": "sanskerta", "gender": "N", "position": "suffix", "meaning": { "id": "keturunan, dinasti", "en": "lineage, dynasty" } },
  { "id": "sa-arta", "text": "arta", "initial": "a", "origin": "sanskerta", "gender": "N", "meaning": { "id": "kekayaan, harta", "en": "wealth, riches" } },
  { "id": "sa-cipta", "text": "cipta", "initial": "c", "origin": "sanskerta", "gender": "N", "meaning": { "id": "ciptaan, gagasan", "en": "creation, idea" } },
  { "id": "sa-karsa", "text": "karsa", "initial": "k", "origin": "sanskerta", "gender": "N", "meaning": { "id": "kehendak, niat", "en": "will, intention" } },
  { "id": "sa-nata", "text": "nata", "initial": "n", "origin": "sanskerta", "gender": "L", "meaning": { "id": "raja, pemimpin", "en": "king, ruler" } },
  { "id": "sa-prabu", "text": "prabu", "initial": "p", "origin": "sanskerta", "gender": "L", "position": "prefix", "meaning": { "id": "raja", "en": "king" } },
  { "id": "sa-raden", "text": "raden", "initial": "r", "origin": "sanskerta", "gender": "L", "position": "prefix", "meaning": { "id": "bangsawan", "en": "nobleman" } },
  { "id": "sa-sena", "text": "sena", "initial": "s", "origin": "sanskerta", "gender": "L", "meaning": { "id": "prajurit, pasukan", "en": "soldier, army" } },
  { "id": "sa-teja", "text": "teja", "initial": "t", "origin": "sanskerta", "gender": "N", "meaning": { "id": "cahaya, sinar", "en": "radiance, light" } },
  { "id": "sa-sakti", "text": "sakti", "initial": "s", "origin": "sanskerta", "gender": "N", "meaning": { "id": "perkasa, sakti", "en": "mighty, powerful" } },
  { "id": "sa-wibawa", "text": "wibawa", "initial": "w", "origin": "sanskerta", "gender": "N", "meaning": { "id": "wibawa, kehormatan", "en": "authority, dignity" } },
  { "id": "sa-agung", "text": "agung", "initial": "a", "origin": "sanskerta", "gender": "N", "meaning": { "id": "agung, besar", "en": "great, exalted" } },
  { "id": "sa-mulia", "text": "mulia", "initial": "m", "origin": "sanskerta", "gender": "N", "meaning": { "id": "mulia, luhur", "en": "noble, glorious" } },
  { "id": "sa-sentosa", "text": "sentosa", "initial": "s", "origin": "sanskerta", "gender": "N", "meaning": { "id": "sentosa, tenteram", "en": "secure, at peace" } },
  { "id": "sa-lestari", "text": "lestari", "initial": "l", "origin": "sanskerta", "gender": "N", "meaning": { "id": "abadi, kekal", "en": "everlasting, enduring" } },
  { "id": "sa-dirga", "text": "dirga", "initial": "d", "origin": "sanskerta", "gender": "N", "position": "prefix", "meaning": { "id": "panjang, jauh", "en": "long, far" } },
  { "id": "sa-kusuma", "text": "kusuma", "initial": "k", "origin": "sanskerta", "gender": "N", "meaning": { "id": "bunga", "en": "flower" } },
  { "id": "sa-ayu", "text": "ayu", "initial": "a", "origin": "sanskerta", "gender": "P", "meaning": { "id": "cantik, elok", "en": "beautiful, lovely" } },
  { "id": "sa-seta", "text": "seta", "initial": "s", "origin": "sanskerta", "gender": "N", "meaning": { "id": "putih, suci", "en": "white, pure" } },
  { "id": "sa-eka", "text": "eka", "initial": "e", "origin": "sanskerta", "gender": "N", "position": "prefix", "meaning": { "id": "satu, tunggal", "en": "one, sole" } },
  { "id": "sa-dwi", "text": "dwi", "initial": "d", "origin": "sanskerta", "gender": "N", "position": "prefix", "meaning": { "id": "dua", "en": "two" } },
  { "id": "sa-tri", "text": "tri", "initial": "t", "origin": "sanskerta", "gender": "N", "position": "prefix", "meaning": { "id": "tiga", "en": "three" } },
  { "id": "sa-catur", "text": "catur", "initial": "c", "origin": "sanskerta", "gender": "N", "position": "prefix", "meaning": { "id": "empat", "en": "four" } },
  { "id": "sa-panca", "text": "panca", "initial": "p", "origin": "sanskerta", "gender": "N", "position": "prefix", "meaning": { "id": "lima", "en": "five" } },
  { "id": "sa-sapta", "text": "sapta", "initial": "s", "origin": "sanskerta", "gender": "N", "position": "prefix", "meaning": { "id": "tujuh", "en": "seven" } },
  { "id": "sa-asta", "text": "asta", "initial": "a", "origin": "sanskerta", "gender": "N", "position": "prefix", "meaning": { "id": "delapan", "en": "eight" } },
  { "id": "sa-baskara", "text": "baskara", "initial": "b", "origin": "sanskerta", "gender": "L", "meaning": { "id": "matahari", "en": "sun" } },
  { "id": "sa-aditya", "text": "aditya", "initial": "a", "origin": "sanskerta", "gender": "L", "meaning": { "id": "matahari", "en": "sun" } },
  { "id": "sa-bumi", "text": "bumi", "initial": "b", "origin": "sanskerta", "gender": "N", "meaning": { "id": "bumi, tanah", "en": "earth, land" } },
  { "id": "sa-samudra", "text": "samudra", "initial": "s", "origin": "sanskerta", "gender": "N", "meaning": { "id": "samudra, lautan", "en": "ocean, sea" } },
  { "id": "sa-giri", "text": "giri", "initial": "g", "origin": "sanskerta", "gender": "N", "meaning": { "id": "gunung", "en": "mountain" } },
  { "id": "sa-angkasa", "text": "angkasa", "initial": "a", "origin": "sanskerta", "gender": "N", "meaning": { "id": "langit, angkasa", "en": "sky, space" } },
  { "id": "sa-jagat", "text": "jagat", "initial": "j", "origin": "sanskerta", "gender": "N", "meaning": { "id": "dunia, alam", "en": "world, universe" } },
  { "id": "sa-buana", "text": "buana", "initial": "b", "origin": "sanskerta", "gender": "N", "meaning": { "id": "dunia, bumi", "en": "world, earth" } },
  { "id": "sa-wening", "text": "wening", "initial": "w", "origin": "sanskerta", "gender": "N", "meaning": { "id": "jernih, hening", "en": "clear, serene" } },
  { "id": "sa-tentrem", "text": "tentrem", "initial": "t", "origin": "sanskerta", "gender": "N", "meaning": { "id": "damai, tenteram", "en": "peaceful, tranquil" } },
  { "id": "sa-raharja", "text": "raharja", "initial": "r", "origin": "sanskerta", "gender": "N", "meaning": { "id": "sejahtera, makmur", "en": "prosperous, flourishing" } },
  { "id": "sa-sembada", "text": "sembada", "initial": "s", "origin": "sanskerta", "gender": "L", "meaning": { "id": "gagah, cakap", "en": "capable, robust" } },
  { "id": "sa-widya", "text": "widya", "initial": "w", "origin": "sanskerta", "gender": "N", "meaning": { "id": "ilmu, pengetahuan", "en": "knowledge, learning" } },
  { "id": "sa-jnana", "text": "jnana", "initial": "j", "origin": "sanskerta", "gender": "N", "meaning": { "id": "pengetahuan, kebijaksanaan", "en": "wisdom, knowledge" } },
  { "id": "sa-satria", "text": "satria", "initial": "s", "origin": "sanskerta", "gender": "L", "meaning": { "id": "kesatria, pahlawan", "en": "knight, warrior" } },
  { "id": "sa-wisesa", "text": "wisesa", "initial": "w", "origin": "sanskerta", "gender": "N", "position": "suffix", "meaning": { "id": "berkuasa, agung", "en": "sovereign, supreme" } },
  { "id": "sa-atma", "text": "atma", "initial": "a", "origin": "sanskerta", "gender": "N", "meaning": { "id": "jiwa, ruh", "en": "soul, spirit" } },
  { "id": "sa-kanaka", "text": "kanaka", "initial": "k", "origin": "sanskerta", "gender": "N", "meaning": { "id": "emas", "en": "gold" } },
  { "id": "sa-ratih", "text": "ratih", "initial": "r", "origin": "sanskerta", "gender": "P", "meaning": { "id": "dewi bulan, cinta", "en": "moon goddess, love" } },
  { "id": "sa-kumala", "text": "kumala", "initial": "k", "origin": "sanskerta", "gender": "P", "meaning": { "id": "permata", "en": "gem, jewel" } },
  { "id": "sa-larasati", "text": "larasati", "initial": "l", "origin": "sanskerta", "gender": "P", "meaning": { "id": "selaras, harmoni", "en": "harmony, accord" } },
  { "id": "sa-parameswara", "text": "parameswara", "initial": "p", "origin": "sanskerta", "gender": "L", "position": "prefix", "meaning": { "id": "penguasa agung", "en": "supreme lord" } },
  { "id": "sa-agni", "text": "agni", "initial": "a", "origin": "sanskerta", "gender": "L", "meaning": { "id": "api", "en": "fire" } },
  { "id": "sa-brata", "text": "brata", "initial": "b", "origin": "sanskerta", "gender": "N", "meaning": { "id": "tapa, disiplin", "en": "austerity, discipline" } },
  { "id": "sa-krida", "text": "krida", "initial": "k", "origin": "sanskerta", "gender": "N", "meaning": { "id": "kegiatan, olah", "en": "activity, endeavor" } },
  { "id": "sa-manggala", "text": "manggala", "initial": "m", "origin": "sanskerta", "gender": "L", "position": "prefix", "meaning": { "id": "pemimpin, panglima", "en": "leader, commander" } }
```

Remember to add a comma after the previous last element (`sa-wira`'s closing `}`) so the JSON stays valid.

- [ ] **Step 4: Verify JSON validity and run tests**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/data/elements.sanskerta.json','utf8')); console.log('valid')"`
Expected: `valid`

Run: `npx vitest run tests/dataset.test.ts`
Expected: PASS — count ≥ 80, key roots present, shapes valid, no duplicate texts.

- [ ] **Step 5: Commit**

```bash
git add src/data/elements.sanskerta.json tests/dataset.test.ts
git commit -m "feat: enrich Sanskrit/Javanese vocabulary to 80+ roots"
```

---

### Task 4: UI toggle + App wiring

**Files:**
- Modify: `src/components/ParameterForm.tsx` (`FormState`, composed-mode block ~line 290-313)
- Modify: `src/App.tsx:65-68` (pass `fuse` into `generateName`)
- Test: `tests/parameterForm.fuse.test.tsx` (new)

**Interfaces:**
- Consumes: `GenerateRequest.fuse` from Task 1.
- Produces: `FormState.fuse?: boolean`; a "Pisah / Lebur" segmented control shown only in composed mode; `App.runGenerator` forwards `form.fuse` to `generateName`.

- [ ] **Step 1: Write a failing component test**

Create `tests/parameterForm.fuse.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ParameterForm, { type FormState } from '../src/components/ParameterForm';

function composedForm(extra: Partial<FormState> = {}): FormState {
  return { nameStyle: 'composed', surname: '', gender: 'N', slots: [{}, {}], ...extra };
}

describe('Fuse toggle (composed mode)', () => {
  it('renders the Lebur option in composed mode', () => {
    render(<ParameterForm value={composedForm()} onChange={() => {}} onGenerate={() => {}} />);
    expect(screen.getByText(/Lebur/)).toBeTruthy();
  });

  it('does not render the fuse toggle in familiar mode', () => {
    const familiar: FormState = { nameStyle: 'familiar', surname: '', gender: 'N', slots: [{}, {}] };
    render(<ParameterForm value={familiar} onChange={() => {}} onGenerate={() => {}} />);
    expect(screen.queryByText(/Lebur akar jadi satu kata/)).toBeNull();
  });

  it('sets fuse=true when Lebur is clicked', () => {
    const onChange = vi.fn();
    render(<ParameterForm value={composedForm()} onChange={onChange} onGenerate={() => {}} />);
    fireEvent.click(screen.getByText(/Lebur/));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fuse: true }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/parameterForm.fuse.test.tsx`
Expected: FAIL — no element with text "Lebur" exists yet.

- [ ] **Step 3: Add `fuse` to `FormState`**

In `src/components/ParameterForm.tsx`, add to the `FormState` interface (after `sameOrigin`, around line 30):

```ts
  /** Composed-mode: fuse 1–2 roots into a single word (samasa style). */
  fuse?: boolean;
```

- [ ] **Step 4: Render the toggle in the composed block**

In `src/components/ParameterForm.tsx`, inside the composed-mode branch (the `: (` block, after the etymology chips `</div>` at ~line 312 and before that block's closing `</div>` at ~line 313), insert:

```tsx
          <div className="field">
            <span className="field__label">
              Gaya kata <span className="field__hint">/ Word style</span>
            </span>
            <div className="segmented">
              <button
                type="button"
                aria-pressed={!value.fuse}
                onClick={() => onChange({ ...value, fuse: false })}
              >
                Pisah
              </button>
              <button
                type="button"
                aria-pressed={!!value.fuse}
                onClick={() => onChange({ ...value, fuse: true })}
              >
                Lebur
              </button>
            </div>
            <p className="field__hint" style={{ marginTop: '0.35rem' }}>
              {value.fuse
                ? 'Lebur akar jadi satu kata, mis. Gunadharma · fuse roots into one word'
                : 'Tiap kata satu akar · one root per word'}
            </p>
          </div>
```

- [ ] **Step 5: Run the component test to verify it passes**

Run: `npx vitest run tests/parameterForm.fuse.test.tsx`
Expected: PASS — all three tests.

- [ ] **Step 6: Wire the flag into `App.runGenerator`**

In `src/App.tsx`, update the composed-mode `generateName` call (lines 65-68) to forward `fuse`:

```ts
    return generateName(
      { surname: form.surname, gender: form.gender, slots: form.slots.slice(0, wordCount), fuse: form.fuse },
      ELEMENTS,
    );
```

- [ ] **Step 7: Run the full suite + typecheck/build**

Run: `npm test`
Expected: PASS — entire suite green.

Run: `npm run build`
Expected: `tsc -b` and `vite build` succeed with no type errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/ParameterForm.tsx src/App.tsx tests/parameterForm.fuse.test.tsx
git commit -m "feat: add fuse toggle to composed mode and wire it through App"
```

---

## Self-Review

**Spec coverage:**
- §1 model data (`fuse`, `wordGroups`) → Task 1, Step 1. ✓
- §2 generator fusion (guarantee ≥1 fused word, position hints, sandhi seam, fallback) → Task 1, Steps 2-4. ✓
- §3 meaning composition (per-word grouping, first-sense within fused word, backward compat) → Task 2. ✓
- §4 vocabulary ~80+ incl. guna/dharma/wangsa → Task 3. ✓
- §5 UI toggle composed-only + App wiring → Task 4. ✓
- §6 tests (generator, composeMeaning, dataset, UI) → Tasks 1-4. ✓

**Placeholder scan:** No TBD/TODO; every code/data/test step shows full content. The vocabulary list is fully enumerated (54 concrete entries → 86 total ≥ 80). ✓

**Type consistency:** `fuse?: boolean` is the same on `GenerateRequest` (Task 1) and `FormState` (Task 4). `wordGroups?: number[]` defined in Task 1 is the field consumed in Task 2. `generateName` signature is unchanged (3rd `rng` arg optional). `composeMeaning(g)` signature unchanged. ✓
