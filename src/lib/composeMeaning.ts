import { ORIGIN_LABELS, type GeneratedName, type Origin } from '../types';

interface Bilingual {
  id: string;
  en: string;
}

/**
 * Compose a readable bilingual meaning from the chosen elements.
 * Two parts read as "A yang penuh B" / "A full of B"; more parts are joined
 * with commas. A single part is returned as-is.
 */
export function composeMeaning(g: GeneratedName): Bilingual {
  const idParts = g.elements.map((e) => e.meaning.id);
  const enParts = g.elements.map((e) => e.meaning.en);

  if (g.elements.length === 1) {
    return { id: capitalize(idParts[0]), en: capitalize(enParts[0]) };
  }

  if (g.elements.length === 2) {
    return {
      id: capitalize(`${idParts[0]} yang penuh ${idParts[1]}`),
      en: capitalize(`${enParts[0]} full of ${enParts[1]}`),
    };
  }

  return {
    id: capitalize(joinList(idParts, 'dan')),
    en: capitalize(joinList(enParts, 'and')),
  };
}

/** A bilingual etymology line naming the distinct origins used. */
export function composeEtymology(g: GeneratedName): Bilingual {
  const labels = g.origins.map((o: Origin) => ORIGIN_LABELS[o]);
  return {
    id: `Etimologi: ${labels.map((l) => l.id).join(' · ')}`,
    en: `Etymology: ${labels.map((l) => l.en).join(' · ')}`,
  };
}

function joinList(items: string[], conj: string): string {
  if (items.length <= 1) return items[0] ?? '';
  const head = items.slice(0, -1).join(', ');
  return `${head} ${conj} ${items[items.length - 1]}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
