import { ORIGIN_LABELS, type GeneratedName, type NameElement, type Origin } from '../types';

interface Bilingual {
  id: string;
  en: string;
}

/**
 * Compose a bilingual meaning from the chosen words. Words are separated by a
 * middot (·). For each word:
 * - A single-root word keeps its full gloss (all comma-listed senses).
 * - A fused word (multiple roots joined per `wordGroups`) joins each root's
 *   first sense with a hyphen and capitalizes the result once
 *   (e.g. "Kebajikan-kebenaran").
 * Any elements beyond the `wordGroups` sum are appended as their own
 * single-root words.
 */
export function composeMeaning(g: GeneratedName): Bilingual {
  const groups = g.wordGroups ?? g.elements.map(() => 1);

  // Chunk elements into words per `groups`; any leftover becomes its own word.
  const words: GeneratedName['elements'][] = [];
  let idx = 0;
  for (const n of groups) {
    words.push(g.elements.slice(idx, idx + n));
    idx += n;
  }
  while (idx < g.elements.length) {
    words.push([g.elements[idx]]);
    idx += 1;
  }

  return {
    id: words.map((w) => renderWord(w, 'id')).join(' · '),
    en: words.map((w) => renderWord(w, 'en')).join(' · '),
  };
}

/** Render one word: a single root keeps its full gloss; a fused word joins each root's first sense with a hyphen, capitalized once. */
function renderWord(word: NameElement[], lang: 'id' | 'en'): string {
  if (word.length === 1) return capitalize(word[0].meaning[lang]);
  return capitalize(word.map((e) => firstSense(e.meaning[lang])).join('-'));
}

/** The leading sense of a gloss — text before the first comma, trimmed. */
function firstSense(s: string): string {
  const i = s.indexOf(',');
  return (i >= 0 ? s.slice(0, i) : s).trim();
}

/** A bilingual etymology line naming the distinct origins used. */
export function composeEtymology(g: GeneratedName): Bilingual {
  const labels = g.origins.map((o: Origin) => ORIGIN_LABELS[o]);
  return {
    id: `Etimologi: ${labels.map((l) => l.id).join(' · ')}`,
    en: `Etymology: ${labels.map((l) => l.en).join(' · ')}`,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
