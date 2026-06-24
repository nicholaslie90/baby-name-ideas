import { describe, it, expect } from 'vitest';
import { analyzeNameCandidates, buildAnalyzedName } from '../src/lib/generator';
import { composeMeaning } from '../src/lib/composeMeaning';
import type { CommonName, NameElement } from '../src/types';

const NAMES: CommonName[] = [
  { id: 's-ib', name: 'Sara', initial: 's', syllables: 2, origin: 'ibrani', gender: 'P', meaning: { id: 'putri', en: 'princess' } },
  { id: 's-ar', name: 'Sara', initial: 's', syllables: 2, origin: 'arab', gender: 'P', meaning: { id: 'murni', en: 'pure' } },
];
const ELEMENTS: NameElement[] = [];

describe('buildAnalyzedName', () => {
  it('returns null for no words', () => {
    expect(buildAnalyzedName([], [], '')).toBeNull();
  });

  it('uses the selected candidate per word and composes its meaning', () => {
    const words = analyzeNameCandidates('Sara', NAMES, ELEMENTS);
    // index of the arab 'Sara' candidate
    const arabIdx = words[0].candidates.findIndex((c) => c.origins[0] === 'arab');
    const g = buildAnalyzedName(words, [arabIdx], 'Tan')!;
    expect(g.name).toBe('Sara');
    expect(g.surname).toBe('Tan');
    expect(g.origins).toEqual(['arab']);
    expect(composeMeaning(g).id.toLowerCase()).toContain('murni');
  });

  it('defaults to candidate 0 when a selection is missing or out of range', () => {
    const words = analyzeNameCandidates('Sara', NAMES, ELEMENTS);
    const g = buildAnalyzedName(words, [], '')!;
    expect(g.elements).toHaveLength(1);
    expect(g.wordGroups).toEqual([1]);
  });
});
