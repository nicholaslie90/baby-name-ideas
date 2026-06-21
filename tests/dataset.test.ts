import { describe, it, expect } from 'vitest';
import { ELEMENTS, COMMON_NAMES } from '../src/data';
import { ORIGINS, ELEMENT_ORIGINS } from '../src/types';

const GENDERS = ['L', 'P', 'N'];
const POSITIONS = ['prefix', 'suffix', 'any'];

describe('name-element dataset', () => {
  it('has a healthy number of elements per root origin', () => {
    for (const origin of ELEMENT_ORIGINS) {
      const count = ELEMENTS.filter((e) => e.origin === origin).length;
      expect(count, `origin ${origin}`).toBeGreaterThanOrEqual(20);
    }
  });

  it('has unique ids', () => {
    const ids = ELEMENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every element is well-formed', () => {
    for (const e of ELEMENTS) {
      expect(e.id, 'id').toBeTruthy();
      expect(e.text, `text for ${e.id}`).toMatch(/^[a-z]+$/);
      expect(e.initial, `initial for ${e.id}`).toBe(e.text[0]);
      expect(ORIGINS, `origin for ${e.id}`).toContain(e.origin);
      expect(GENDERS, `gender for ${e.id}`).toContain(e.gender);
      if (e.position !== undefined) {
        expect(POSITIONS, `position for ${e.id}`).toContain(e.position);
      }
      expect(e.meaning.id.trim(), `meaning.id for ${e.id}`).not.toBe('');
      expect(e.meaning.en.trim(), `meaning.en for ${e.id}`).not.toBe('');
    }
  });
});

describe('common-names dataset', () => {
  it('is large (enriched from the imported dictionary)', () => {
    expect(COMMON_NAMES.length).toBeGreaterThan(2000);
  });

  it('covers both genders and many origins', () => {
    expect(COMMON_NAMES.some((n) => n.gender === 'L')).toBe(true);
    expect(COMMON_NAMES.some((n) => n.gender === 'P')).toBe(true);
    const origins = new Set(COMMON_NAMES.map((n) => n.origin));
    expect(origins.size).toBeGreaterThanOrEqual(8);
  });

  it('has unique ids', () => {
    const ids = COMMON_NAMES.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no duplicate name + gender pairs', () => {
    const keys = COMMON_NAMES.map((n) => `${n.name.toLowerCase()}|${n.gender}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every common name is well-formed', () => {
    for (const n of COMMON_NAMES) {
      expect(n.name.trim(), `name for ${n.id}`).not.toBe('');
      expect(n.initial, `initial for ${n.id}`).toMatch(/^[a-z]$/);
      expect(n.syllables, `syllables for ${n.id}`).toBeGreaterThanOrEqual(1);
      expect(ORIGINS, `origin for ${n.id}`).toContain(n.origin);
      expect(['L', 'P', 'N'], `gender for ${n.id}`).toContain(n.gender);
      expect(n.meaning.id.trim(), `meaning.id for ${n.id}`).not.toBe('');
      expect(n.meaning.en.trim(), `meaning.en for ${n.id}`).not.toBe('');
    }
  });

  it('tags a healthy set of biblical names (both testaments, both genders)', () => {
    const biblical = COMMON_NAMES.filter((n) => n.biblical);
    expect(biblical.length).toBeGreaterThanOrEqual(80);
    // attested dictionary entries get tagged too, not just freshly added ones
    expect(COMMON_NAMES.some((n) => n.name === 'David' && n.biblical)).toBe(true);
    expect(COMMON_NAMES.some((n) => n.name === 'Mary' && n.biblical)).toBe(true);
    expect(biblical.some((n) => n.gender === 'L')).toBe(true);
    expect(biblical.some((n) => n.gender === 'P')).toBe(true);
  });

  it('tags a healthy set of islamic names (both genders)', () => {
    const islamic = COMMON_NAMES.filter((n) => n.islamic);
    expect(islamic.length).toBeGreaterThanOrEqual(100);
    // attested dictionary entries get tagged too, not just freshly added ones
    expect(COMMON_NAMES.some((n) => n.name === 'Ali' && n.islamic)).toBe(true);
    expect(islamic.some((n) => n.gender === 'L')).toBe(true);
    expect(islamic.some((n) => n.gender === 'P')).toBe(true);
  });
});
