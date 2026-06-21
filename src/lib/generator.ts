import type {
  CommonName,
  FamiliarRequest,
  GenerateRequest,
  GenerateResult,
  MeaningRequest,
  NameElement,
  Origin,
  SlotConstraint,
} from '../types';

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
  const chosen: NameElement[] = [];

  for (let i = 0; i < total; i++) {
    const slot = req.slots[i];
    const base = pool.filter((e) => matchesGender(e, req.gender) && matchesSlot(e, slot));
    if (base.length === 0) {
      return { error: 'empty-pool', slotIndex: i };
    }
    chosen.push(pick(preferByPosition(base, i, total), rng));
  }

  // Each slot becomes its own capitalized word, e.g. ["nur","wira"] -> "Nur Wira".
  const name = chosen.map((e) => capitalize(cleanup(e.text))).join(' ');
  const origins: Origin[] = distinct(chosen.map((e) => e.origin));

  return { name, surname: req.surname.trim(), elements: chosen, origins };
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
  const terms = parseTerms(req.query);
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
  for (let i = 0; i < total; i++) {
    const available = base.filter((e) => !usedIds.has(e.id));
    const picked = pick(available.length > 0 ? available : base, rng);
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
  const base = names.filter(
    (n) =>
      !n.name.includes(' ') &&
      matchesGender(n, req.gender) &&
      (!req.origins || req.origins.length === 0 || req.origins.includes(n.origin)),
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

  for (let i = 1; i < total; i++) {
    const available = base.filter((n) => !usedIds.has(n.id));
    const picked = pick(available.length > 0 ? available : base, rng);
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
