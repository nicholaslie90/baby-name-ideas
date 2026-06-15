import { describe, it, expect } from 'vitest';
import { generateFamiliarName } from '../src/lib/generator';
import { makeRng } from '../src/lib/generator';
import { isGenerateError, type CommonName, type GeneratedName } from '../src/types';

const NAMES: CommonName[] = [
  { id: 'c1', name: 'Cindy', initial: 'c', syllables: 2, origin: 'latin', gender: 'P', meaning: { id: 'bulan', en: 'moon' } },
  { id: 'c2', name: 'Elaine', initial: 'e', syllables: 2, origin: 'latin', gender: 'P', meaning: { id: 'cahaya', en: 'light' } },
  { id: 'c3', name: 'Sophia', initial: 's', syllables: 3, origin: 'latin', gender: 'P', meaning: { id: 'kebijaksanaan', en: 'wisdom' } },
  { id: 'c4', name: 'Victor', initial: 'v', syllables: 2, origin: 'latin', gender: 'L', meaning: { id: 'pemenang', en: 'conqueror' } },
  { id: 'c5', name: 'Ahmad', initial: 'a', syllables: 2, origin: 'arab', gender: 'L', meaning: { id: 'terpuji', en: 'praiseworthy' } },
];

function gen(req: Parameters<typeof generateFamiliarName>[0]) {
  return generateFamiliarName(req, NAMES, makeRng(42));
}

describe('generateFamiliarName', () => {
  it('returns a real, attested name from the pool', () => {
    const r = gen({ surname: 'Wijaya', gender: 'P', syllables: 2 });
    expect(isGenerateError(r)).toBe(false);
    const g = r as GeneratedName;
    expect(['Cindy', 'Elaine', 'Sophia']).toContain(g.name);
    expect(g.surname).toBe('Wijaya');
  });

  it('auto-picks when the initial is empty', () => {
    const r = gen({ surname: '', gender: 'N', syllables: 2 });
    expect(isGenerateError(r)).toBe(false);
  });

  it('honors a requested initial letter', () => {
    const r = gen({ surname: '', gender: 'P', syllables: 2, initial: 'e' });
    const g = r as GeneratedName;
    expect(g.name).toBe('Elaine');
  });

  it('honors the gender filter', () => {
    const r = gen({ surname: '', gender: 'L', syllables: 2 });
    const g = r as GeneratedName;
    expect(['Victor', 'Ahmad']).toContain(g.name);
  });

  it('honors an origin constraint', () => {
    const r = gen({ surname: '', gender: 'L', syllables: 2, origins: ['arab'] });
    const g = r as GeneratedName;
    expect(g.name).toBe('Ahmad');
    expect(g.origins).toEqual(['arab']);
  });

  it('softly prefers the requested syllable count but still returns a name', () => {
    // No 4-syllable names exist; should fall back rather than error.
    const r = gen({ surname: '', gender: 'P', syllables: 4 });
    expect(isGenerateError(r)).toBe(false);
  });

  it('errors only when nothing matches the hard filters', () => {
    const r = gen({ surname: '', gender: 'P', syllables: 2, initial: 'z' });
    expect(isGenerateError(r)).toBe(true);
  });
});
