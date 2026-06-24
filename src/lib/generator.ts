import type {
  CommonName,
  FamiliarRequest,
  GenerateRequest,
  GenerateResult,
  MeaningRequest,
  NameElement,
  SlotConstraint,
} from '../types';
import { expandTerms } from './synonyms';

/** Deterministic PRNG (mulberry32) so a fixed seed yields repeatable names. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A real-random rng for production use. */
export function defaultRng(): () => number {
  return () => Math.random();
}

function matchesGender(el: { gender: NameElement['gender'] }, want: NameElement['gender']): boolean {
  if (want === 'N') return true; // user asked for any/neutral → everything allowed
  return el.gender === want || el.gender === 'N';
}

function matchesSlot(el: NameElement, slot: SlotConstraint): boolean {
  if (slot.initial && el.initial !== slot.initial.toLowerCase()) return false;
  if (slot.origins && slot.origins.length > 0 && !slot.origins.includes(el.origin)) return false;
  return true;
}

/**
 * Soft position preference: the first slot of a multi-syllable name avoids
 * suffix-only elements, the last avoids prefix-only ones. Falls back to the
 * full pool if the preference would empty it.
 */
function preferByPosition(pool: NameElement[], slotIndex: number, total: number): NameElement[] {
  if (total < 2) return pool;
  let filtered = pool;
  if (slotIndex === 0) filtered = pool.filter((e) => e.position !== 'suffix');
  else if (slotIndex === total - 1) filtered = pool.filter((e) => e.position !== 'prefix');
  return filtered.length > 0 ? filtered : pool;
}

function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

/** Collapse runs of 3+ identical letters down to 2 (e.g. "nnn" → "nn"). */
function cleanup(raw: string): string {
  return raw.replace(/(.)\1{2,}/g, '$1$1');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function distinct<T>(items: T[]): T[] {
  return [...new Set(items)];
}

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
  if (!eligible.some((slotIdx) => flags[slotIdx])) flags[eligible[0]] = true;
  return flags;
}

/**
 * Assemble a name from the candidate pool according to the per-slot
 * constraints. Returns a typed error (not a throw) when a slot matches nothing,
 * so the UI can point at the over-constrained slot.
 */
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

/** Split a meaning query ("joy, happy, glee") into lowercase, non-empty terms. */
function parseTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/** True when either gloss (lowercased) contains ANY of the query terms. */
function matchesMeaning(el: NameElement, terms: string[]): boolean {
  const id = el.meaning.id.toLowerCase();
  const en = el.meaning.en.toLowerCase();
  return terms.some((t) => id.includes(t) || en.includes(t));
}

/**
 * Reverse search: assemble a name from `req.words` parts whose meaning matches
 * any of the query terms, honoring the gender filter. Parts are drawn from the
 * combined pool of etymology roots and attested names. Returns a typed error
 * (with a bilingual message) when the query is blank or nothing matches, so the
 * UI can guide the user rather than fail silently.
 */
export function generateByMeaning(
  req: MeaningRequest,
  pool: NameElement[],
  rng: () => number = defaultRng(),
): GenerateResult {
  const terms = expandTerms(parseTerms(req.query));
  if (terms.length === 0) {
    return {
      error: 'empty-pool',
      slotIndex: -1,
      message: {
        id: 'Ketik kata arti dulu, mis. "joy, happy, glee".',
        en: 'Type some meaning words first, e.g. "joy, happy, glee".',
      },
    };
  }

  const base = pool.filter((e) => matchesGender(e, req.gender) && matchesMeaning(e, terms));
  if (base.length === 0) {
    return {
      error: 'empty-pool',
      slotIndex: -1,
      message: {
        id: 'Tidak ada nama yang cocok dengan arti itu — coba kata lain.',
        en: 'No name matches these meanings — try other words.',
      },
    };
  }

  const total = Math.max(1, req.words);
  const chosen: NameElement[] = [];
  const usedIds = new Set<string>();
  const first = pick(base, rng);
  chosen.push(first);
  usedIds.add(first.id);

  // "Same origin": lock the remaining parts to the first part's origin.
  const originPool = req.sameOrigin ? base.filter((e) => e.origin === first.origin) : base;
  for (let i = 1; i < total; i++) {
    const available = originPool.filter((e) => !usedIds.has(e.id));
    const picked = pick(available.length > 0 ? available : originPool, rng);
    chosen.push(picked);
    usedIds.add(picked.id);
  }

  const name = chosen.map((e) => capitalize(cleanup(e.text))).join(' ');
  return {
    name,
    surname: req.surname.trim(),
    elements: chosen,
    origins: distinct(chosen.map((e) => e.origin)),
  };
}

/** Convert an attested given name into the building-block element shape. */
export function asElement(n: CommonName): NameElement {
  return {
    id: n.id,
    text: n.name.toLowerCase(),
    initial: n.initial,
    origin: n.origin,
    gender: n.gender,
    meaning: n.meaning,
  };
}

/**
 * Build a full name from `req.words` attested given names (e.g. Cindy, Elaine,
 * Christie) joined by spaces, matching the gender / origin filters. The first
 * word honors the requested initial; an empty initial means "auto". Only
 * single-word entries are used so the word count is exact.
 */
export function generateFamiliarName(
  req: FamiliarRequest,
  names: CommonName[],
  rng: () => number = defaultRng(),
): GenerateResult {
  const wantInitial = req.initial?.toLowerCase();
  // Category chips combine as OR: with none on, every name passes; with one or
  // more on, a name needs to match at least one enabled category.
  const matchesCategory = (n: CommonName): boolean => {
    if (!req.biblicalOnly && !req.islamicOnly) return true;
    return (req.biblicalOnly === true && n.biblical === true) || (req.islamicOnly === true && n.islamic === true);
  };
  const base = names.filter(
    (n) =>
      !n.name.includes(' ') &&
      matchesGender(n, req.gender) &&
      (!req.origins || req.origins.length === 0 || req.origins.includes(n.origin)) &&
      matchesCategory(n),
  );

  if (base.length === 0) {
    // -1 signals a familiar-style miss (no per-slot index applies).
    return { error: 'empty-pool', slotIndex: -1 };
  }

  const firstPool = wantInitial ? base.filter((n) => n.initial === wantInitial) : base;
  if (firstPool.length === 0) {
    return { error: 'empty-pool', slotIndex: -1 };
  }

  const total = Math.max(1, req.words);
  const chosen: CommonName[] = [];
  const usedIds = new Set<string>();

  const first = pick(firstPool, rng);
  chosen.push(first);
  usedIds.add(first.id);

  // "Same origin": lock the remaining words to the first word's origin so the
  // whole name shares one (effectively random, from the allowed set) etymology.
  const pool = req.sameOrigin ? base.filter((n) => n.origin === first.origin) : base;
  for (let i = 1; i < total; i++) {
    const available = pool.filter((n) => !usedIds.has(n.id));
    const picked = pick(available.length > 0 ? available : pool, rng);
    chosen.push(picked);
    usedIds.add(picked.id);
  }

  return {
    name: chosen.map((c) => c.name).join(' '),
    surname: req.surname.trim(),
    elements: chosen.map(asElement),
    origins: distinct(chosen.map((c) => c.origin)),
  };
}

/**
 * Greedily find known etymology roots inside a word: longest root first, left to
 * right, non-overlapping, minimum length 3 (so tiny fragments don't over-match).
 */
function findRoots(word: string, elements: NameElement[]): NameElement[] {
  const lower = word.toLowerCase();
  const roots = elements.filter((e) => e.text.length >= 3).sort((a, b) => b.text.length - a.text.length);
  const matched: NameElement[] = [];
  let i = 0;
  while (i < lower.length) {
    const hit = roots.find((e) => e.text.length <= lower.length - i && lower.startsWith(e.text, i));
    if (hit) {
      matched.push(hit);
      i += hit.text.length;
    } else {
      i += 1;
    }
  }
  return matched;
}

/**
 * Analyze a user-typed name into a meaning + etymology. Each word is, in order:
 * (1) matched exactly against the attested names, else (2) decomposed into known
 * etymology roots, else (3) left with a "meaning not found" placeholder. Always
 * returns a GeneratedName (the typed name is valid even when unmeaningful); only
 * empty input yields an error.
 */
export function analyzeName(
  input: string,
  names: CommonName[],
  elements: NameElement[],
): GenerateResult {
  const words = input.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return {
      error: 'empty-pool',
      slotIndex: -1,
      message: {
        id: 'Ketik nama dulu untuk dilihat artinya.',
        en: 'Type a name to see its meaning.',
      },
    };
  }

  const byName = new Map<string, CommonName>();
  for (const n of names) {
    const k = n.name.toLowerCase();
    if (!byName.has(k)) byName.set(k, n);
  }

  const chosen: NameElement[] = [];
  for (const w of words) {
    const lw = w.toLowerCase().replace(/[^a-z]/g, '');
    const exact = lw ? byName.get(lw) : undefined;
    if (exact) {
      chosen.push(asElement(exact));
      continue;
    }
    const roots = lw ? findRoots(lw, elements) : [];
    if (roots.length > 0) {
      chosen.push(...roots);
      continue;
    }
    chosen.push({
      id: `unknown-${lw || 'x'}`,
      text: w.toLowerCase(),
      initial: lw[0] ?? '',
      origin: 'lainnya',
      gender: 'N',
      meaning: { id: 'arti tidak ditemukan', en: 'meaning not found' },
    });
  }

  return {
    name: words.join(' '),
    surname: '',
    elements: chosen,
    origins: distinct(chosen.map((e) => e.origin)),
  };
}
