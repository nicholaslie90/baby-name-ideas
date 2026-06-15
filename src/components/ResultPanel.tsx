import { useRef, useState } from 'react';
import type { GenerateResult } from '../types';
import { isGenerateError } from '../types';
import NameFrame, { type FrameStyle } from './NameFrame';
import FrameStyleSwitcher from './FrameStyleSwitcher';
import ExportButtons from './ExportButtons';

interface Props {
  result: GenerateResult | null;
  onRegenerate: () => void;
}

export default function ResultPanel({ result, onRegenerate }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<FrameStyle>('elegant');

  if (result === null) {
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

  if (isGenerateError(result)) {
    return (
      <div className="panel result">
        <div className="error">
          Tidak ada kandidat untuk <strong>suku kata {result.slotIndex + 1}</strong>. Longgarkan
          awalan atau etimologinya.
          <br />
          No candidates for syllable {result.slotIndex + 1} — relax its initial letter or etymology.
        </div>
        <button className="btn btn--ghost" onClick={onRegenerate}>
          ↻ Coba lagi · Try again
        </button>
      </div>
    );
  }

  return (
    <div className="panel result">
      <FrameStyleSwitcher value={style} onChange={setStyle} />
      <NameFrame ref={frameRef} result={result} style={style} />
      <button className="btn btn--ghost" onClick={onRegenerate}>
        ↻ Buat lagi · Regenerate
      </button>
      <ExportButtons targetRef={frameRef} name={result.name} surname={result.surname} />
    </div>
  );
}
