import { NAME_FONTS, type NameFontId } from './NameFrame';

interface Props {
  value: NameFontId;
  onChange: (font: NameFontId) => void;
}

/** Picks the cursive font for the big name. Each button previews its own font. */
export default function NameFontSwitcher({ value, onChange }: Props) {
  return (
    <div className="style-switch" role="group" aria-label="Font nama / Name font">
      {NAME_FONTS.map((f) => (
        <button
          key={f.id}
          type="button"
          aria-pressed={value === f.id}
          onClick={() => onChange(f.id)}
          style={{ fontFamily: f.family, fontSize: '1.05rem' }}
          title={f.label}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
