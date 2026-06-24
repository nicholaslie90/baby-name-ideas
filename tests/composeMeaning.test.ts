import { describe, it, expect } from 'vitest';
import { composeMeaning, composeEtymology } from '../src/lib/composeMeaning';
import type { GeneratedName, NameElement } from '../src/types';

const els: NameElement[] = [
  { id: 'a1', text: 'nur', initial: 'n', origin: 'arab', gender: 'N', meaning: { id: 'cahaya', en: 'light' } },
  { id: 's1', text: 'wira', initial: 'w', origin: 'sanskerta', gender: 'L', meaning: { id: 'berani', en: 'brave' } },
];

const g: GeneratedName = { name: 'Nurwira', surname: 'Santoso', elements: els, origins: ['arab', 'sanskerta'] };

describe('composeMeaning', () => {
  it('joins the part meanings bilingually and non-empty', () => {
    const m = composeMeaning(g);
    expect(m.id.toLowerCase()).toContain('cahaya');
    expect(m.id.toLowerCase()).toContain('berani');
    expect(m.en.toLowerCase()).toContain('light');
    expect(m.en.toLowerCase()).toContain('brave');
    expect(m.id.trim()).not.toBe('');
    expect(m.en.trim()).not.toBe('');
  });

  it('handles a single element without a joining word', () => {
    const single: GeneratedName = { name: 'Nur', surname: '', elements: [els[0]], origins: ['arab'] };
    const m = composeMeaning(single);
    expect(m.id.toLowerCase()).toContain('cahaya');
    expect(m.en.toLowerCase()).toContain('light');
  });
});

describe('composeEtymology', () => {
  it('lists distinct origin labels bilingually', () => {
    const e = composeEtymology(g);
    expect(e.id).toContain('Arab');
    expect(e.id).toContain('Sanskerta');
    expect(e.en).toContain('Arabic');
    expect(e.en).toContain('Sanskrit');
  });
});

describe('composeMeaning grouping', () => {
  const guna: NameElement = { id: 'g', text: 'guna', initial: 'g', origin: 'sanskerta', gender: 'N', meaning: { id: 'kebajikan, kebaikan', en: 'virtue, merit' } };
  const dharma: NameElement = { id: 'd', text: 'dharma', initial: 'd', origin: 'sanskerta', gender: 'N', meaning: { id: 'kebenaran, kewajiban', en: 'righteousness, duty' } };
  const wijaya: NameElement = { id: 'w', text: 'wijaya', initial: 'w', origin: 'sanskerta', gender: 'L', meaning: { id: 'kemenangan', en: 'victory' } };

  it('joins fused roots with a hyphen (first sense) and words with a middot', () => {
    const g: GeneratedName = {
      name: 'Gunadharma Wijaya',
      surname: '',
      elements: [guna, dharma, wijaya],
      origins: ['sanskerta'],
      wordGroups: [2, 1],
    };
    const m = composeMeaning(g);
    expect(m.id).toBe('Kebajikan-kebenaran · Kemenangan');
    expect(m.en).toBe('Virtue-righteousness · Victory');
  });

  it('appends overflow elements as their own single-root words', () => {
    const g: GeneratedName = {
      name: 'Guna Dharma Wijaya',
      surname: '',
      elements: [guna, dharma, wijaya],
      origins: ['sanskerta'],
      wordGroups: [1],
    };
    const m = composeMeaning(g);
    expect(m.id).toBe('Kebajikan, kebaikan · Kebenaran, kewajiban · Kemenangan');
    expect(m.en).toBe('Virtue, merit · Righteousness, duty · Victory');
  });

  it('keeps the full gloss for single-root words (all-1 groups)', () => {
    const g: GeneratedName = {
      name: 'Guna Wijaya',
      surname: '',
      elements: [guna, wijaya],
      origins: ['sanskerta'],
      wordGroups: [1, 1],
    };
    const m = composeMeaning(g);
    // Single-root words keep the comma-listed senses, not just the first.
    expect(m.id).toBe('Kebajikan, kebaikan · Kemenangan');
    expect(m.en).toBe('Virtue, merit · Victory');
  });
});
