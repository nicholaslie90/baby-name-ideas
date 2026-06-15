import { FRAME_STYLES, type FrameStyle } from './NameFrame';

interface Props {
  value: FrameStyle;
  onChange: (style: FrameStyle) => void;
}

export default function FrameStyleSwitcher({ value, onChange }: Props) {
  return (
    <div className="style-switch" role="group" aria-label="Gaya pigura / Frame style">
      {FRAME_STYLES.map((s) => (
        <button
          key={s.id}
          type="button"
          aria-pressed={value === s.id}
          onClick={() => onChange(s.id)}
        >
          {s.label.id}
        </button>
      ))}
    </div>
  );
}
