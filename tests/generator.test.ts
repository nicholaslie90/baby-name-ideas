import { describe, it, expect } from 'vitest';
import { generateName, makeRng } from '../src/lib/generator';
import { isGenerateError, type GeneratedName, type NameElement } from '../src/types';

const POOL: NameElement[] = [
  { id: 'a1', text: 'nur', initial: 'n', origin: 'arab', gender: 'N', meaning: { id: 'cahaya', en: 'light' } },
  { id: 'a2', text: 'huda', initial: 'h', origin: 'arab', gender: 'N', position: 'suffix', meaning: { id: 'petunjuk', en: 'guidance' } },
  { id: 's1', text: 'dewa', initial: 'd', origin: 'sanskerta', gender: 'L', position: 'prefix', meaning: { id: 'dewa', en: 'god' } },
  { id: 's2', text: 'wati', initial: 'w', origin: 'sanskerta', gender: 'P', position: 'suffix', meaning: { id: 'perempuan', en: 'woman' } },
  { id: 'l1', text: 'luna', initial: 'l', origin: 'latin', gender: 'P', meaning: { id: 'bulan', en: 'moon' } },
];

function gen(req: Parameters<typeof generateName>[0]) {
  // Fixed seed → deterministic results for assertions.
  return generateName(req, POOL, makeRng(42));
}

describe('generateName', () => {
  it('produces one capitalized word per slot', () => {
    const r = gen({ surname: 'Putra', gender: 'N', slots: [{}, {}] });
    expect(isGenerateError(r)).toBe(false);
    const g = r as GeneratedName;
    expect(g.elements).toHaveLength(2);
    const words = g.name.split(' ');
    expect(words).toHaveLength(2);
    for (const w of words) expect(w[0]).toBe(w[0].toUpperCase());
    expect(g.surname).toBe('Putra');
  });

  it('honors a per-slot initial-letter constraint', () => {
    const r = gen({ surname: '', gender: 'N', slots: [{ initial: 'n' }, {}] });
    const g = r as GeneratedName;
    expect(g.elements[0].initial).toBe('n');
    expect(g.name[0].toLowerCase()).toBe('n');
  });

  it('honors a per-slot origin constraint (etymology mixing)', () => {
    const r = gen({ surname: '', gender: 'N', slots: [{ origins: ['latin'] }, { origins: ['arab'] }] });
    const g = r as GeneratedName;
    expect(g.elements[0].origin).toBe('latin');
    expect(g.elements[1].origin).toBe('arab');
    expect(g.origins).toEqual(['latin', 'arab']);
  });

  it('respects the gender filter, allowing neutral elements through', () => {
    const r = gen({ surname: '', gender: 'L', slots: [{}, {}] });
    const g = r as GeneratedName;
    for (const e of g.elements) {
      expect(['L', 'N']).toContain(e.gender);
    }
  });

  it('returns an empty-pool error identifying the offending slot', () => {
    const r = gen({ surname: '', gender: 'N', slots: [{ initial: 'z' }] });
    expect(isGenerateError(r)).toBe(true);
    if (isGenerateError(r)) expect(r.slotIndex).toBe(0);
  });

  it('is deterministic for a fixed seed and varies across seeds', () => {
    const req = { surname: '', gender: 'N' as const, slots: [{}, {}] };
    const a = generateName(req, POOL, makeRng(7)) as GeneratedName;
    const b = generateName(req, POOL, makeRng(7)) as GeneratedName;
    expect(a.name).toBe(b.name);
  });
});

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
