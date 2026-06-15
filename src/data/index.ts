import type { CommonName, NameElement } from '../types';
import arab from './elements.arab.json';
import sanskerta from './elements.sanskerta.json';
import latin from './elements.latin.json';
import ibrani from './elements.ibrani.json';
import commonNames from './commonNames.json';

/** Building-block roots used by the "composed" (unique) name style. */
export const ELEMENTS: NameElement[] = [
  ...(arab as NameElement[]),
  ...(sanskerta as NameElement[]),
  ...(latin as NameElement[]),
  ...(ibrani as NameElement[]),
];

/** Attested given names used by the "familiar" (common) name style. */
export const COMMON_NAMES: CommonName[] = commonNames as CommonName[];
