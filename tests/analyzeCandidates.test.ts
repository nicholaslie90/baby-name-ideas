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

  it('matches a hyphenated dataset name after normalization', () => {
    const names = [
      { id: 'k', name: 'Il-Sung', initial: 'i', syllables: 2, origin: 'pasifik_asia', gender: 'L', meaning: { id: 'pelita', en: 'lodestar' } },
    ] as CommonName[];
    const [w] = analyzeNameCandidates('Il-Sung', names, []);
    const exact = w.candidates.find((c) => c.kind === 'exact');
    expect(exact).toBeDefined();
    expect(exact!.displayName).toBe('Il-Sung');
  });
});

describe('analyzeNameCandidates — fuzzy', () => {
  it('matches near spellings within distance 2 sharing the first letter', () => {
    const [w] = analyzeNameCandidates('Markus', NAMES, ELEMENTS);
    const marcus = w.candidates.find((c) => c.displayName === 'Marcus');
    expect(marcus).toBeDefined();
    expect(marcus!.kind).toBe('fuzzy');
    expect(marcus!.distance).toBe(1);
  });

  it('excludes matches with a different first letter even if close', () => {
    const names = [
      { id: 'x', name: 'Aarcus', initial: 'a', syllables: 2, origin: 'latin', gender: 'L', meaning: { id: 'x', en: 'x' } },
    ] as CommonName[];
    const [w] = analyzeNameCandidates('Markus', names, []);
    expect(w.candidates.every((c) => c.kind !== 'fuzzy')).toBe(true);
  });

  it('orders exact before fuzzy, and fuzzy by ascending distance', () => {
    const names = [
      { id: 'a', name: 'Marcus', initial: 'm', syllables: 2, origin: 'latin', gender: 'L', meaning: { id: 'kuat', en: 'strong' } },
      { id: 'b', name: 'Mark', initial: 'm', syllables: 1, origin: 'latin', gender: 'L', meaning: { id: 'perang', en: 'war' } },
      { id: 'c', name: 'Markus', initial: 'm', syllables: 2, origin: 'latin', gender: 'L', meaning: { id: 'asli', en: 'exact' } },
    ] as CommonName[];
    const [w] = analyzeNameCandidates('Markus', names, []);
    expect(w.candidates[0].kind).toBe('exact');           // Markus exact
    const fuzzy = w.candidates.filter((c) => c.kind === 'fuzzy');
    expect(fuzzy.map((c) => c.distance)).toEqual([1, 2]); // Marcus(1) before Mark(2)
  });

  it('does not list the same name+origin+meaning twice', () => {
    const names = [
      { id: 'a', name: 'Sara', initial: 's', syllables: 2, origin: 'ibrani', gender: 'P', meaning: { id: 'putri', en: 'princess' } },
      { id: 'b', name: 'Sara', initial: 's', syllables: 2, origin: 'ibrani', gender: 'P', meaning: { id: 'putri', en: 'princess' } },
    ] as CommonName[];
    const [w] = analyzeNameCandidates('Sara', names, []);
    expect(w.candidates).toHaveLength(1);
  });
});

describe('analyzeNameCandidates — roots + cap', () => {
  const ROOTS: NameElement[] = [
    { id: 'r-nur', text: 'nur', initial: 'n', origin: 'arab', gender: 'N', meaning: { id: 'cahaya', en: 'light' } },
    { id: 'r-alia', text: 'alia', initial: 'a', origin: 'arab', gender: 'P', meaning: { id: 'mulia, tinggi', en: 'noble, exalted' } },
  ];

  it('decomposes an unknown word into known roots as a single candidate', () => {
    const [w] = analyzeNameCandidates('Nuralia', [], ROOTS);
    const root = w.candidates.find((c) => c.kind === 'root');
    expect(root).toBeDefined();
    expect(root!.elements.map((e) => e.id)).toEqual(['r-nur', 'r-alia']);
    // summary gloss joins leading senses with a hyphen
    expect(root!.meaning.id).toBe('cahaya-mulia');
    expect(root!.meaning.en).toBe('light-noble');
  });

  it('caps candidates per word at MAX_CANDIDATES_PER_WORD (6)', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: `n${i}`, name: 'Marcus', initial: 'm', syllables: 2, origin: 'latin', gender: 'L',
      meaning: { id: `arti ${i}`, en: `meaning ${i}` },
    })) as CommonName[];
    const [w] = analyzeNameCandidates('Marcus', many, []);
    expect(w.candidates.length).toBeLessThanOrEqual(6);
  });
});
