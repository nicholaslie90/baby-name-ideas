import { describe, it, expect } from 'vitest';
import { ELEMENTS } from '../src/data';
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
