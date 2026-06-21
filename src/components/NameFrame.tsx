import { forwardRef } from 'react';
import type { GeneratedName } from '../types';
import { composeMeaning, composeEtymology } from '../lib/composeMeaning';
import styles from './NameFrame.module.css';

export type FrameStyle = 'elegant' | 'modern' | 'botanical' | 'royal';

export type NameFontId = 'great-vibes' | 'dancing' | 'parisienne' | 'sacramento' | 'pacifico';

/** Cursive fonts offered for the big name. `family` is a CSS font-family value. */
export const NAME_FONTS: { id: NameFontId; label: string; family: string }[] = [
  { id: 'great-vibes', label: 'Great Vibes', family: "'Great Vibes', cursive" },
  { id: 'dancing', label: 'Dancing Script', family: "'Dancing Script', cursive" },
  { id: 'parisienne', label: 'Parisienne', family: "'Parisienne', cursive" },
  { id: 'sacramento', label: 'Sacramento', family: "'Sacramento', cursive" },
  { id: 'pacifico', label: 'Pacifico', family: "'Pacifico', cursive" },
];

export const FRAME_STYLES: { id: FrameStyle; label: { id: string; en: string } }[] = [
  { id: 'elegant', label: { id: 'Klasik Elegan', en: 'Elegant' } },
  { id: 'modern', label: { id: 'Modern Lembut', en: 'Soft modern' } },
  { id: 'botanical', label: { id: 'Botani', en: 'Botanical' } },
  { id: 'royal', label: { id: 'Royal Gelap', en: 'Royal dark' } },
];

interface Props {
  result: GeneratedName;
  style: FrameStyle;
  /** CSS font-family for the big name; defaults to the theme's script font. */
  nameFontFamily?: string;
}

/**
 * The downloadable "pigura". Rendered to a real DOM node so it can be captured
 * as a hi-res PNG/PDF. The ref points at the exact node to export.
 */
const NameFrame = forwardRef<HTMLDivElement, Props>(function NameFrame({ result, style, nameFontFamily }, ref) {
  const meaning = composeMeaning(result);
  const etymology = composeEtymology(result);

  return (
    <div className={styles.scale}>
      <div ref={ref} className={`${styles.frame} ${styles[style]}`}>
        <div className={styles.inner} />
        <span className={styles.leafTop}>❧ ❀ ❧</span>

        <div className={styles.kicker}>Sebuah nama untuk · A name for</div>
        <div className={styles.name} style={nameFontFamily ? { fontFamily: nameFontFamily } : undefined}>
          {result.name}
        </div>
        {result.surname && <div className={styles.surname}>{result.surname}</div>}

        <div className={styles.divider} />

        <p className={styles.meaningId}>“{meaning.id}”</p>
        <p className={styles.meaningEn}>{meaning.en}</p>

        <div className={styles.etymology}>{etymology.id}</div>

        <span className={styles.leafBottom}>❧ ❀ ❧</span>
      </div>
    </div>
  );
});

export default NameFrame;
