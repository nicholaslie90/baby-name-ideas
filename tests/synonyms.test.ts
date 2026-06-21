import { describe, it, expect } from 'vitest';
import { expandTerms, addedSynonyms } from '../src/lib/synonyms';

describe('expandTerms', () => {
  it('always retains the original terms', () => {
    const out = expandTerms(['brave']);
    expect(out).toContain('brave');
  });

  it('expands an English term to its cluster synonyms', () => {
    const out = expandTerms(['brave']);
    expect(out).toContain('valiant');
  });

  it('expands across languages: an Indonesian term reaches English synonyms', () => {
    const out = expandTerms(['berani']);
    expect(out).toContain('brave');
  });

  it('expands an English term to its Indonesian synonyms', () => {
    const out = expandTerms(['light']);
    expect(out).toContain('cahaya');
  });

  it('is symmetric within a cluster', () => {
    expect(expandTerms(['valiant'])).toContain('brave');
    expect(expandTerms(['brave'])).toContain('valiant');
  });

  it('leaves an unknown term as just itself', () => {
    expect(expandTerms(['xyzzy'])).toEqual(['xyzzy']);
  });

  it('never returns duplicates', () => {
    const out = expandTerms(['brave', 'valiant']);
    expect(out.length).toBe(new Set(out).size);
  });

  it('handles an empty input', () => {
    expect(expandTerms([])).toEqual([]);
  });
});

describe('addedSynonyms', () => {
  it('returns the extra words for a query, excluding what was typed', () => {
    const added = addedSynonyms('brave');
    expect(added).toContain('valiant');
    expect(added).not.toContain('brave');
  });

  it('returns nothing for a blank query', () => {
    expect(addedSynonyms('   ')).toEqual([]);
  });

  it('returns nothing for an unknown term', () => {
    expect(addedSynonyms('xyzzy')).toEqual([]);
  });

  it('parses commas and whitespace like the search does', () => {
    const added = addedSynonyms('  BRAVE , light ');
    expect(added).toContain('valiant');
    expect(added).toContain('cahaya');
  });

  it('does not list a typed term even if another typed term would expand to it', () => {
    const added = addedSynonyms('brave, valiant');
    expect(added).not.toContain('brave');
    expect(added).not.toContain('valiant');
  });
});
