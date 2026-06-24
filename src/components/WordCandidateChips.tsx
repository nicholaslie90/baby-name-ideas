import { ORIGIN_LABELS } from '../types';
import type { WordAnalysis } from '../lib/generator';

interface Props {
  words: WordAnalysis[];
  selections: number[];
  onSelect: (wordIndex: number, candidateIndex: number) => void;
}

export default function WordCandidateChips({ words, selections, onSelect }: Props) {
  if (words.length === 0) return null;
  return (
    <div className="candidates">
      {words.map((w, wi) => (
        <div className="candidates__word" key={`${w.raw}-${wi}`} role="radiogroup" aria-label={`Arti untuk ${w.raw}`}>
          <span className="candidates__label">{w.raw}</span>
          <div className="candidates__chips">
            {w.candidates.map((c, ci) => {
              const selected = (selections[wi] ?? 0) === ci;
              const originId = c.origins.map((o) => ORIGIN_LABELS[o].id).join(', ');
              const originEn = c.origins.map((o) => ORIGIN_LABELS[o].en).join(', ');
              return (
                <button
                  key={ci}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`chip${selected ? ' chip--on' : ''}`}
                  onClick={() => onSelect(wi, ci)}
                  title={`${c.meaning.en} · ${originEn}`}
                >
                  <strong className="chip__name">{c.displayName}</strong>
                  <span className="chip__meaning">{c.meaning.id}</span>
                  <span className="chip__origin">{originId}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
