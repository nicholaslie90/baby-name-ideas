/** Etymological origin families. Expanded to cover the imported dictionary. */
export type Origin =
  | 'arab'
  | 'sanskerta'
  | 'latin'
  | 'ibrani'
  | 'yunani'
  | 'inggris'
  | 'keltik'
  | 'jermanik'
  | 'slavia'
  | 'afrika'
  | 'pasifik_asia'
  | 'lainnya';

/** All origins (used for labels and validation). */
export const ORIGINS: Origin[] = [
  'arab',
  'ibrani',
  'yunani',
  'latin',
  'inggris',
  'keltik',
  'jermanik',
  'sanskerta',
  'slavia',
  'afrika',
  'pasifik_asia',
  'lainnya',
];

/**
 * Origins that have building-block roots in the ELEMENTS dataset — only these
 * are offered in "composed" (per-syllable) mode.
 */
export const ELEMENT_ORIGINS: Origin[] = ['arab', 'sanskerta', 'latin', 'ibrani'];

/** Origins offered in "familiar" mode (the full expanded set). */
export const COMMON_ORIGINS: Origin[] = ORIGINS;

/** Bilingual label for each origin, shown in the UI and the frame. */
export const ORIGIN_LABELS: Record<Origin, { id: string; en: string }> = {
  arab: { id: 'Arab', en: 'Arabic' },
  ibrani: { id: 'Ibrani', en: 'Hebrew' },
  yunani: { id: 'Yunani', en: 'Greek' },
  latin: { id: 'Latin & Roman', en: 'Latin & Romance' },
  inggris: { id: 'Inggris', en: 'English' },
  keltik: { id: 'Keltik', en: 'Celtic (Irish/Scottish/Welsh)' },
  jermanik: { id: 'Jermanik', en: 'Germanic (German/Norse)' },
  sanskerta: { id: 'Sanskerta & Hindu', en: 'Sanskrit & Hindu' },
  slavia: { id: 'Slavia', en: 'Slavic' },
  afrika: { id: 'Afrika', en: 'African' },
  pasifik_asia: { id: 'Pasifik & Asia', en: 'Pacific & Asian' },
  lainnya: { id: 'Lainnya', en: 'Other' },
};

/** L = laki-laki (male), P = perempuan (female), N = netral (neutral/unisex). */
export type Gender = 'L' | 'P' | 'N';

/** Where an element reads best within an assembled name. */
export type Position = 'prefix' | 'suffix' | 'any';

/** A single name-building block (a syllable/root) with a bilingual meaning. */
export interface NameElement {
  id: string;
  text: string;
  /** Normalized lowercase first letter of `text`. */
  initial: string;
  origin: Origin;
  gender: Gender;
  meaning: { id: string; en: string };
  position?: Position;
}

/** A curated, attested given name used by the "familiar" name style. */
export interface CommonName {
  id: string;
  name: string;
  /** Normalized lowercase first letter of `name`. */
  initial: string;
  syllables: number;
  origin: Origin;
  gender: Gender;
  meaning: { id: string; en: string };
}

/** Which generation style the user picked. */
export type NameStyle = 'familiar' | 'composed';

/** Per-syllable constraints chosen by the user. */
export interface SlotConstraint {
  /** Optional desired initial letter (lowercase). Empty = any. */
  initial?: string;
  /** Optional subset of origins for this slot. Empty/undefined = all. */
  origins?: Origin[];
}

export interface GenerateRequest {
  surname: string;
  gender: Gender;
  slots: SlotConstraint[];
}

export interface FamiliarRequest {
  surname: string;
  gender: Gender;
  /** Preferred syllable count (soft — falls back to any count if none match). */
  syllables: number;
  /** Optional desired first letter (lowercase). Empty = auto. */
  initial?: string;
  /** Optional subset of origins. Empty/undefined = all. */
  origins?: Origin[];
}

export interface GeneratedName {
  name: string;
  surname: string;
  elements: NameElement[];
  /** Distinct origins used, in first-seen order. */
  origins: Origin[];
}

/** Returned instead of a name when a slot has no matching candidates. */
export interface GenerateError {
  error: 'empty-pool';
  /** Index of the slot (0-based) whose constraints matched nothing. */
  slotIndex: number;
}

export type GenerateResult = GeneratedName | GenerateError;

export function isGenerateError(r: GenerateResult): r is GenerateError {
  return 'error' in r;
}
