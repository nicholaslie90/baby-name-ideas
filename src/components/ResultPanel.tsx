import { useRef, useState } from 'react';
import type { GeneratedName, GenerateError } from '../types';
import NameFrame, { NAME_FONTS, type FrameStyle, type NameFontId } from './NameFrame';
import FrameStyleSwitcher from './FrameStyleSwitcher';
import NameFontSwitcher from './NameFontSwitcher';
import ExportButtons from './ExportButtons';

interface Props {
  current: GeneratedName | null;
  error: GenerateError | null;
  notice: string | null;
  position: { index: number; total: number };
  canPrev: boolean;
  onPrev: () => void;
  onNext: () => void;
  onRegenerate: () => void;
  onReset: () => void;
}

export default function ResultPanel({
  current,
  error,
  notice,
  position,
  canPrev,
  onPrev,
  onNext,
  onRegenerate,
  onReset,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<FrameStyle>('elegant');
  const [nameFont, setNameFont] = useState<NameFontId>('great-vibes');
  const nameFontFamily = NAME_FONTS.find((f) => f.id === nameFont)?.family;

  if (error) {
    return (
      <div className="panel result">
        <div className="error">
          {error.message ? (
            <>
              {error.message.id}
              <br />
              {error.message.en}
            </>
          ) : error.slotIndex >= 0 ? (
            <>
              Tidak ada kandidat untuk <strong>kata {error.slotIndex + 1}</strong>. Longgarkan
              awalan atau etimologinya.
              <br />
              No candidates for word {error.slotIndex + 1} — relax its initial letter or etymology.
            </>
          ) : (
            <>
              Tidak ada nama umum yang cocok. Longgarkan awalan atau etimologinya.
              <br />
              No matching common name — relax the initial letter or etymology.
            </>
          )}
        </div>
        <button className="btn btn--ghost" onClick={onRegenerate}>
          ↻ Coba lagi · Try again
        </button>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="panel result">
        <div className="empty">
          <p style={{ fontSize: '2.5rem', margin: 0 }}>👶</p>
          <p>
            Atur parameter di kiri, lalu tekan <strong>Buat Nama</strong>.
            <br />
            Set the parameters and press <strong>Generate</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel result">
      <FrameStyleSwitcher value={style} onChange={setStyle} />
      <NameFontSwitcher value={nameFont} onChange={setNameFont} />

      <div className="result__stage">
        <button
          className="navarrow"
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="Nama sebelumnya"
        >
          ‹
        </button>
        <NameFrame ref={frameRef} result={current} style={style} nameFontFamily={nameFontFamily} />
        <button className="navarrow" onClick={onNext} aria-label="Nama berikutnya">
          ›
        </button>
      </div>

      <span className="result__counter">
        {position.index + 1} / {position.total}
      </span>

      {notice && <p className="notice">{notice}</p>}

      <div className="result__actions">
        <button
          className="btn btn--ghost btn--icon"
          onClick={onRegenerate}
          title="Buat lagi · Regenerate"
          aria-label="Buat lagi · Regenerate"
        >
          ↻
        </button>
        <ExportButtons targetRef={frameRef} name={current.name} surname={current.surname} />
        <button
          className="btn btn--ghost btn--icon"
          onClick={onReset}
          title="Reset"
          aria-label="Reset"
        >
          🗑
        </button>
      </div>
    </div>
  );
}
