import type {
  GenerateRequest,
  GenerateResult,
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

function matchesGender(el: NameElement, want: NameElement['gender']): boolean {
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

  const name = capitalize(cleanup(chosen.map((e) => e.text).join('')));
  const origins: Origin[] = distinct(chosen.map((e) => e.origin));

  return { name, surname: req.surname.trim(), elements: chosen, origins };
}
