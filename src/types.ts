/** The four etymological origin families supported in v1. */
export type Origin = 'arab' | 'sanskerta' | 'latin' | 'ibrani';

export const ORIGINS: Origin[] = ['arab', 'sanskerta', 'latin', 'ibrani'];

/** Bilingual label for each origin, shown in the UI and the frame. */
export const ORIGIN_LABELS: Record<Origin, { id: string; en: string }> = {
  arab: { id: 'Arab / Islami', en: 'Arabic / Islamic' },
  sanskerta: { id: 'Sanskerta & Jawa', en: 'Sanskrit & Javanese' },
  latin: { id: 'Latin / Yunani', en: 'Latin / Greek' },
  ibrani: { id: 'Ibrani', en: 'Hebrew' },
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
