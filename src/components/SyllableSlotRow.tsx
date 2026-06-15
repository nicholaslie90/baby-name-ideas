import { ORIGINS, ORIGIN_LABELS, type Origin, type SlotConstraint } from '../types';

interface Props {
  index: number;
  slot: SlotConstraint;
  onChange: (next: SlotConstraint) => void;
}

export default function SyllableSlotRow({ index, slot, onChange }: Props) {
  const origins = slot.origins ?? [];

  function toggleOrigin(o: Origin) {
    const next = origins.includes(o) ? origins.filter((x) => x !== o) : [...origins, o];
    onChange({ ...slot, origins: next });
  }

  function setInitial(raw: string) {
    const letter = raw.replace(/[^a-zA-Z]/g, '').slice(0, 1).toLowerCase();
    onChange({ ...slot, initial: letter || undefined });
  }

  return (
    <div className="slot">
      <div className="slot__title">Suku kata {index + 1} · Syllable {index + 1}</div>
      <div className="slot__row">
        <div>
          <label className="field__label" htmlFor={`initial-${index}`}>
            Awalan
          </label>
          <input
            id={`initial-${index}`}
            type="text"
            inputMode="text"
            maxLength={1}
            placeholder="—"
            value={slot.initial ?? ''}
            onChange={(e) => setInitial(e.target.value)}
            aria-label={`Awalan suku kata ${index + 1}`}
          />
        </div>
        <div>
          <span className="field__label">
            Etimologi <span className="field__hint">(kosong = semua)</span>
          </span>
          <div className="chips">
            {ORIGINS.map((o) => (
              <button
                key={o}
                type="button"
                className="chip"
                aria-pressed={origins.includes(o)}
                onClick={() => toggleOrigin(o)}
              >
                {ORIGIN_LABELS[o].id}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
