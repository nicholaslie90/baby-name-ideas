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
