import type { CommonName, NameElement } from '../types';
import { asElement } from '../lib/generator';
import arab from './elements.arab.json';
import sanskerta from './elements.sanskerta.json';
import latin from './elements.latin.json';
import ibrani from './elements.ibrani.json';
import commonNames from './commonNames.json';
import importedNames from './commonNamesImported.json';
import biblicalNames from './biblicalNames.json';
import islamicNames from './islamicNames.json';

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
  // Curated core wins, then curated biblical/islamic entries fill gaps, then the dictionary.
  for (const n of commonNames as CommonName[]) byKey.set(key(n), n);
  for (const n of biblicalNames as CommonName[]) {
    if (!byKey.has(key(n))) byKey.set(key(n), n);
  }
  for (const n of islamicNames as CommonName[]) {
    if (!byKey.has(key(n))) byKey.set(key(n), n);
  }
  for (const n of importedNames as CommonName[]) {
    if (!byKey.has(key(n))) byKey.set(key(n), n);
  }
  // Tag every entry whose name is a known biblical/islamic name (regardless of
  // gender), so attested dictionary entries (David, Yusuf, …) keep their own
  // meaning but still register in the category. A name may carry both flags.
  const biblicalSet = new Set((biblicalNames as CommonName[]).map((n) => n.name.toLowerCase()));
  const islamicSet = new Set((islamicNames as CommonName[]).map((n) => n.name.toLowerCase()));
  return [...byKey.values()].map((n) => {
    const lower = n.name.toLowerCase();
    const tagged = { ...n };
    if (biblicalSet.has(lower)) tagged.biblical = true;
    if (islamicSet.has(lower)) tagged.islamic = true;
    return tagged;
  });
}

export const COMMON_NAMES: CommonName[] = mergeCommonNames();

/**
 * Combined candidate pool for reverse search by meaning: every etymology root
 * plus every attested given name (converted to the element shape). Both carry
 * bilingual meanings, so they search and render uniformly.
 */
export const MEANING_POOL: NameElement[] = [...ELEMENTS, ...COMMON_NAMES.map(asElement)];
