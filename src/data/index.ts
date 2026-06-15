import type { NameElement } from '../types';
import arab from './elements.arab.json';
import sanskerta from './elements.sanskerta.json';
import latin from './elements.latin.json';
import ibrani from './elements.ibrani.json';

/** All name-elements merged into one typed list. */
export const ELEMENTS: NameElement[] = [
  ...(arab as NameElement[]),
  ...(sanskerta as NameElement[]),
  ...(latin as NameElement[]),
  ...(ibrani as NameElement[]),
];
