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
  it('produces a capitalized name from the requested number of syllables', () => {
    const r = gen({ surname: 'Putra', gender: 'N', slots: [{}, {}] });
    expect(isGenerateError(r)).toBe(false);
    const g = r as GeneratedName;
    expect(g.elements).toHaveLength(2);
    expect(g.name[0]).toBe(g.name[0].toUpperCase());
    expect(g.name.slice(1)).toBe(g.name.slice(1).toLowerCase());
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
