import { describe, it, expect } from 'vitest';
import { generateByMeaning, makeRng } from '../src/lib/generator';
import { isGenerateError, type GeneratedName, type NameElement } from '../src/types';

const POOL: NameElement[] = [
  { id: 'a1', text: 'farah', initial: 'f', origin: 'arab', gender: 'P', meaning: { id: 'kegembiraan', en: 'joy, happiness' } },
  { id: 'a2', text: 'huda', initial: 'h', origin: 'arab', gender: 'N', meaning: { id: 'petunjuk', en: 'guidance' } },
  { id: 's1', text: 'ananda', initial: 'a', origin: 'sanskerta', gender: 'L', meaning: { id: 'kebahagiaan', en: 'bliss, happy' } },
  { id: 'l1', text: 'luna', initial: 'l', origin: 'latin', gender: 'P', meaning: { id: 'bulan', en: 'moon' } },
  { id: 'i1', text: 'gila', initial: 'g', origin: 'ibrani', gender: 'P', meaning: { id: 'sukacita', en: 'joy, glee' } },
];

function gen(req: Parameters<typeof generateByMeaning>[0]) {
  return generateByMeaning(req, POOL, makeRng(42));
}

describe('generateByMeaning', () => {
  it('produces exactly `words` capitalized parts', () => {
    const r = gen({ surname: 'Putra', gender: 'N', words: 2, query: 'joy, happy, glee' });
    expect(isGenerateError(r)).toBe(false);
    const g = r as GeneratedName;
    expect(g.elements).toHaveLength(2);
    const words = g.name.split(' ');
    expect(words).toHaveLength(2);
    for (const w of words) expect(w[0]).toBe(w[0].toUpperCase());
    expect(g.surname).toBe('Putra');
  });

  it('only includes parts whose meaning matches ANY query term (across id and en)', () => {
    const r = gen({ surname: '', gender: 'N', words: 3, query: 'joy, happy, glee' });
    const g = r as GeneratedName;
    // 'luna' (moon) and 'huda' (guidance) must never appear; the three joy-ish
    // parts are farah, ananda, gila.
    const ids = g.elements.map((e) => e.id).sort();
    expect(ids).toEqual(['a1', 'i1', 's1']);
  });

  it('matches the Indonesian gloss too', () => {
    const r = gen({ surname: '', gender: 'N', words: 1, query: 'bulan' });
    const g = r as GeneratedName;
    expect(g.elements[0].id).toBe('l1');
  });

  it('does substring matching so a term catches longer words', () => {
    const r = gen({ surname: '', gender: 'N', words: 1, query: 'happ' });
    const g = r as GeneratedName;
    // 'happ' matches 'happiness' (farah) and 'happy' (ananda).
    expect(['a1', 's1']).toContain(g.elements[0].id);
  });

  it('respects the gender filter, allowing neutral parts through', () => {
    const r = gen({ surname: '', gender: 'P', words: 1, query: 'joy, happy, glee' });
    const g = r as GeneratedName;
    // Male-only 'ananda' (s1) must be excluded for gender P.
    expect(g.elements[0].id).not.toBe('s1');
    expect(['P', 'N']).toContain(g.elements[0].gender);
  });

  it('parses commas, extra whitespace, and mixed case', () => {
    const r = gen({ surname: '', gender: 'N', words: 1, query: '  JOY ,   ,glee ' });
    expect(isGenerateError(r)).toBe(false);
    const g = r as GeneratedName;
    expect(['a1', 'i1']).toContain(g.elements[0].id);
  });

  it('returns an empty-pool error with a message when the query is blank', () => {
    const r = gen({ surname: '', gender: 'N', words: 2, query: '   ' });
    expect(isGenerateError(r)).toBe(true);
    if (isGenerateError(r)) {
      expect(r.slotIndex).toBe(-1);
      expect(r.message).toBeDefined();
    }
  });

  it('returns an empty-pool error with a message when nothing matches', () => {
    const r = gen({ surname: '', gender: 'N', words: 2, query: 'xyzzy' });
    expect(isGenerateError(r)).toBe(true);
    if (isGenerateError(r)) {
      expect(r.slotIndex).toBe(-1);
      expect(r.message).toBeDefined();
    }
  });

  it('prefers not to repeat a part within one name', () => {
    const r = gen({ surname: '', gender: 'N', words: 3, query: 'joy, happy, glee' });
    const g = r as GeneratedName;
    const ids = g.elements.map((e) => e.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('is deterministic for a fixed seed', () => {
    const req = { surname: '', gender: 'N' as const, words: 2, query: 'joy, happy, glee' };
    const a = generateByMeaning(req, POOL, makeRng(7)) as GeneratedName;
    const b = generateByMeaning(req, POOL, makeRng(7)) as GeneratedName;
    expect(a.name).toBe(b.name);
  });
});
