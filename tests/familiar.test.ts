import { describe, it, expect } from 'vitest';
import { generateFamiliarName, makeRng } from '../src/lib/generator';
import { isGenerateError, type CommonName, type GeneratedName } from '../src/types';

const NAMES: CommonName[] = [
  { id: 'c1', name: 'Cindy', initial: 'c', syllables: 2, origin: 'latin', gender: 'P', meaning: { id: 'bulan', en: 'moon' } },
  { id: 'c2', name: 'Elaine', initial: 'e', syllables: 2, origin: 'latin', gender: 'P', meaning: { id: 'cahaya', en: 'light' } },
  { id: 'c3', name: 'Sophia', initial: 's', syllables: 3, origin: 'latin', gender: 'P', meaning: { id: 'kebijaksanaan', en: 'wisdom' } },
  { id: 'c4', name: 'Victor', initial: 'v', syllables: 2, origin: 'latin', gender: 'L', meaning: { id: 'pemenang', en: 'conqueror' } },
  { id: 'c5', name: 'Ahmad', initial: 'a', syllables: 2, origin: 'arab', gender: 'L', meaning: { id: 'terpuji', en: 'praiseworthy' } },
];

const NAMESET = new Set(NAMES.map((n) => n.name));

function gen(req: Parameters<typeof generateFamiliarName>[0]) {
  return generateFamiliarName(req, NAMES, makeRng(42));
}

describe('generateFamiliarName', () => {
  it('joins the requested number of words, each a real name', () => {
    const r = gen({ surname: 'Lie', gender: 'P', words: 3 });
    expect(isGenerateError(r)).toBe(false);
    const g = r as GeneratedName;
    const words = g.name.split(' ');
    expect(words).toHaveLength(3);
    for (const w of words) expect(NAMESET.has(w)).toBe(true);
    expect(g.surname).toBe('Lie');
  });

  it('auto-picks when the initial is empty', () => {
    const r = gen({ surname: '', gender: 'N', words: 2 });
    expect(isGenerateError(r)).toBe(false);
  });

  it('honors a requested initial on the first word', () => {
    const r = gen({ surname: '', gender: 'P', words: 2, initial: 'e' });
    const g = r as GeneratedName;
    expect(g.name.split(' ')[0]).toBe('Elaine');
  });

  it('honors the gender filter for every word', () => {
    const r = gen({ surname: '', gender: 'L', words: 2 });
    const g = r as GeneratedName;
    for (const w of g.name.split(' ')) expect(['Victor', 'Ahmad']).toContain(w);
  });

  it('honors an origin constraint', () => {
    const r = gen({ surname: '', gender: 'L', words: 1, origins: ['arab'] });
    const g = r as GeneratedName;
    expect(g.name).toBe('Ahmad');
    expect(g.origins).toEqual(['arab']);
  });

  it('prefers distinct words when the pool allows', () => {
    const r = gen({ surname: '', gender: 'P', words: 3 });
    const g = r as GeneratedName;
    const words = g.name.split(' ');
    expect(new Set(words).size).toBe(words.length);
  });

  it('errors only when nothing matches the hard filters', () => {
    const r = gen({ surname: '', gender: 'P', words: 2, initial: 'z' });
    expect(isGenerateError(r)).toBe(true);
  });
});

describe('generateFamiliarName — sameOrigin', () => {
  const MIXED: CommonName[] = [
    { id: 'l1', name: 'Cindy', initial: 'c', syllables: 2, origin: 'latin', gender: 'P', meaning: { id: 'bulan', en: 'moon' } },
    { id: 'l2', name: 'Elaine', initial: 'e', syllables: 2, origin: 'latin', gender: 'P', meaning: { id: 'cahaya', en: 'light' } },
    { id: 'l3', name: 'Sophia', initial: 's', syllables: 3, origin: 'latin', gender: 'P', meaning: { id: 'bijak', en: 'wisdom' } },
    { id: 'a1', name: 'Aisha', initial: 'a', syllables: 2, origin: 'arab', gender: 'P', meaning: { id: 'hidup', en: 'alive' } },
    { id: 'a2', name: 'Halima', initial: 'h', syllables: 3, origin: 'arab', gender: 'P', meaning: { id: 'lembut', en: 'gentle' } },
  ];

  it('forces every word to share one origin across seeds', () => {
    for (const seed of [1, 2, 3, 7, 42, 99]) {
      const r = generateFamiliarName({ surname: '', gender: 'P', words: 2, sameOrigin: true }, MIXED, makeRng(seed)) as GeneratedName;
      expect(isGenerateError(r)).toBe(false);
      expect(new Set(r.elements.map((e) => e.origin)).size).toBe(1);
      expect(r.origins).toHaveLength(1);
    }
  });

  it('mixed mode (default) can produce more than one origin', () => {
    const sawMix = [1, 2, 3, 7, 42, 99].some((seed) => {
      const r = generateFamiliarName({ surname: '', gender: 'P', words: 2 }, MIXED, makeRng(seed)) as GeneratedName;
      return new Set(r.elements.map((e) => e.origin)).size > 1;
    });
    expect(sawMix).toBe(true);
  });
});
