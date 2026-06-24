import { describe, it, expect } from 'vitest';
import { analyzeNameCandidates } from '../src/lib/generator';
import type { CommonName, NameElement } from '../src/types';

const NAMES: CommonName[] = [
  { id: 'm1', name: 'Sara', initial: 's', syllables: 2, origin: 'ibrani', gender: 'P', meaning: { id: 'putri', en: 'princess' } },
  { id: 'm2', name: 'Sara', initial: 's', syllables: 2, origin: 'arab', gender: 'P', meaning: { id: 'murni', en: 'pure' } },
  { id: 'm3', name: 'Marcus', initial: 'm', syllables: 2, origin: 'latin', gender: 'L', meaning: { id: 'kuat, perang', en: 'warlike' } },
];
const ELEMENTS: NameElement[] = [
  { id: 'e-nur', text: 'nur', initial: 'n', origin: 'arab', gender: 'N', meaning: { id: 'cahaya', en: 'light' } },
];

describe('analyzeNameCandidates — exact + fallback', () => {
  it('returns [] for empty input', () => {
    expect(analyzeNameCandidates('   ', NAMES, ELEMENTS)).toEqual([]);
  });

  it('returns one WordAnalysis per word, preserving typed casing in raw', () => {
    const r = analyzeNameCandidates('Sara Marcus', NAMES, ELEMENTS);
    expect(r.map((w) => w.raw)).toEqual(['Sara', 'Marcus']);
  });

  it('returns ALL exact matches across etymologies for a word', () => {
    const [sara] = analyzeNameCandidates('Sara', NAMES, ELEMENTS);
    const exact = sara.candidates.filter((c) => c.kind === 'exact');
    expect(exact.map((c) => c.origins[0]).sort()).toEqual(['arab', 'ibrani']);
    expect(exact.every((c) => c.elements.length === 1)).toBe(true);
  });

  it('falls back to a not-found candidate when nothing matches', () => {
    const [w] = analyzeNameCandidates('Zzzqq', NAMES, ELEMENTS);
    expect(w.candidates).toHaveLength(1);
    expect(w.candidates[0].meaning.id.toLowerCase()).toContain('tidak ditemukan');
    expect(w.candidates[0].meaning.en.toLowerCase()).toContain('not found');
    expect(w.candidates[0].origins).toEqual(['lainnya']);
  });
});
