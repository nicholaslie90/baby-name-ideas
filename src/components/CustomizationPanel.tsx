import type { RefObject } from 'react';
import ParameterForm, { type FormState } from './ParameterForm';
import FrameStyleSwitcher from './FrameStyleSwitcher';
import NameFontSwitcher from './NameFontSwitcher';
import ExportButtons from './ExportButtons';
import WordCandidateChips from './WordCandidateChips';
import type { FrameStyle, NameFontId } from './NameFrame';
import type { WordAnalysis } from '../lib/generator';

interface CustomizationPanelProps {
  form: FormState;
  onFormChange: (next: FormState) => void;
  onGenerate: () => void;
  /** Re-roll a fresh name with the current settings AND close the modal. */
  onShuffle: () => void;
  style: FrameStyle;
  onStyleChange: (style: FrameStyle) => void;
  nameFont: NameFontId;
  onNameFontChange: (font: NameFontId) => void;
  frameRef: RefObject<HTMLDivElement>;
  exportName: string;
  exportSurname: string;
  onReset: () => void;
  wordAnalyses?: WordAnalysis[];
  selections?: number[];
  onSelectCandidate?: (wordIndex: number, candidateIndex: number) => void;
}

export default function CustomizationPanel({
  form,
  onFormChange,
  onGenerate,
  onShuffle,
  style,
  onStyleChange,
  nameFont,
  onNameFontChange,
  frameRef,
  exportName,
  exportSurname,
  onReset,
  wordAnalyses,
  selections,
  onSelectCandidate,
}: CustomizationPanelProps) {
  const analyzeMode = !!wordAnalyses && wordAnalyses.length > 0;

  return (
    <div className="customize">
      <ParameterForm value={form} onChange={onFormChange} onGenerate={onGenerate} />

      {analyzeMode && (
        <div className="field">
          <span className="field__label">
            Pilihan arti per kata <span className="field__hint">/ Per-word meaning</span>
          </span>
          <WordCandidateChips
            words={wordAnalyses!}
            selections={selections ?? []}
            onSelect={onSelectCandidate ?? (() => {})}
          />
        </div>
      )}

      <div className="field">
        <span className="field__label">
          Gaya pigura <span className="field__hint">/ Frame style</span>
        </span>
        <FrameStyleSwitcher value={style} onChange={onStyleChange} />
      </div>

      <div className="field">
        <span className="field__label">
          Font nama <span className="field__hint">/ Name font</span>
        </span>
        <NameFontSwitcher value={nameFont} onChange={onNameFontChange} />
      </div>

      <div className="customize__actions">
        <ExportButtons targetRef={frameRef} name={exportName} surname={exportSurname} />
        {!analyzeMode && (
          <button className="btn btn--ghost btn--icon" onClick={onReset} title="Reset" aria-label="Reset">
            🗑
          </button>
        )}
      </div>

      {/* Re-roll with current settings and close the modal so the new name is
          visible on the card (especially on mobile, where the modal covers it). */}
      {!analyzeMode && (
        <button type="button" className="btn btn--primary customize__shuffle" onClick={onShuffle}>
          🎲 Nama lain · Shuffle
        </button>
      )}
    </div>
  );
}
