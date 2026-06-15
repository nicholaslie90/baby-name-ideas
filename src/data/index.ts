import type { CommonName, NameElement } from '../types';
import arab from './elements.arab.json';
import sanskerta from './elements.sanskerta.json';
import latin from './elements.latin.json';
import ibrani from './elements.ibrani.json';
import commonNames from './commonNames.json';
import importedNames from './commonNamesImported.json';

/** Building-block roots used by the "composed" (unique) name style. */
export const ELEMENTS: NameElement[] = [
  ...(arab as NameElement[]),
  ...(sanskerta as NameElement[]),
  ...(latin as NameElement[]),
  ...(ibrani as NameElement[]),
];

/**
 * Attested given names for the "familiar" style. The hand-curated set (with
 * proper bilingual meanings) is loaded first and wins over any imported entry
 * with the same name + gender; the large imported dictionary fills out the rest.
 */
function mergeCommonNames(): CommonName[] {
  const byKey = new Map<string, CommonName>();
  const key = (n: CommonName) => `${n.name.toLowerCase()}|${n.gender}`;
  for (const n of commonNames as CommonName[]) byKey.set(key(n), n);
  for (const n of importedNames as CommonName[]) {
    if (!byKey.has(key(n))) byKey.set(key(n), n);
  }
  return [...byKey.values()];
}

export const COMMON_NAMES: CommonName[] = mergeCommonNames();
