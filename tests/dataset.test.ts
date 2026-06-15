import { describe, it, expect } from 'vitest';
import { ELEMENTS, COMMON_NAMES } from '../src/data';
import { ORIGINS } from '../src/types';

const GENDERS = ['L', 'P', 'N'];
const POSITIONS = ['prefix', 'suffix', 'any'];

describe('name-element dataset', () => {
  it('has a healthy number of elements per origin', () => {
    for (const origin of ORIGINS) {
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
  it('has names for every origin and both genders', () => {
    for (const origin of ORIGINS) {
      const list = COMMON_NAMES.filter((n) => n.origin === origin);
      expect(list.length, `origin ${origin}`).toBeGreaterThanOrEqual(8);
      expect(list.some((n) => n.gender === 'L'), `male ${origin}`).toBe(true);
      expect(list.some((n) => n.gender === 'P'), `female ${origin}`).toBe(true);
    }
  });

  it('has unique ids', () => {
    const ids = COMMON_NAMES.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every common name is well-formed', () => {
    for (const n of COMMON_NAMES) {
      expect(n.name, `name for ${n.id}`).toMatch(/^[A-Z][a-zA-Z]+$/);
      expect(n.initial, `initial for ${n.id}`).toBe(n.name[0].toLowerCase());
      expect(n.syllables, `syllables for ${n.id}`).toBeGreaterThanOrEqual(1);
      expect(ORIGINS, `origin for ${n.id}`).toContain(n.origin);
      expect(['L', 'P', 'N'], `gender for ${n.id}`).toContain(n.gender);
      expect(n.meaning.id.trim(), `meaning.id for ${n.id}`).not.toBe('');
      expect(n.meaning.en.trim(), `meaning.en for ${n.id}`).not.toBe('');
    }
  });
});
