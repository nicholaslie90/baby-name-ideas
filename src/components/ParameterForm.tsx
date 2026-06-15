import { ORIGINS, type Gender, type Origin, type SlotConstraint } from '../types';
import SyllableSlotRow from './SyllableSlotRow';

export interface FormState {
  surname: string;
  gender: Gender;
  slots: SlotConstraint[];
}

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' },
  { value: 'N', label: 'Netral' },
];

const SYLLABLE_OPTIONS = [2, 3, 4];

interface Props {
  value: FormState;
  onChange: (next: FormState) => void;
  onGenerate: () => void;
}

export default function ParameterForm({ value, onChange, onGenerate }: Props) {
  function setSyllableCount(count: number) {
    const slots: SlotConstraint[] = Array.from({ length: count }, (_, i) => value.slots[i] ?? {});
    onChange({ ...value, slots });
  }

  function setSlot(index: number, slot: SlotConstraint) {
    const slots = value.slots.map((s, i) => (i === index ? slot : s));
    onChange({ ...value, slots });
  }

  /** Apply one origin set to every slot, or clear all (allow full mixing). */
  function applyToAll(origins: Origin[]) {
    onChange({
      ...value,
      slots: value.slots.map((s) => ({ ...s, origins: origins.length ? origins : undefined })),
    });
  }

  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        onGenerate();
      }}
    >
      <div className="field">
        <label className="field__label" htmlFor="surname">
          Nama keluarga <span className="field__hint">/ Surname</span>
        </label>
        <input
          id="surname"
          type="text"
          placeholder="mis. Santoso"
          value={value.surname}
          onChange={(e) => onChange({ ...value, surname: e.target.value })}
        />
      </div>

      <div className="field">
        <span className="field__label">Jenis kelamin <span className="field__hint">/ Gender</span></span>
        <div className="segmented">
          {GENDER_OPTIONS.map((g) => (
            <button
              key={g.value}
              type="button"
              aria-pressed={value.gender === g.value}
              onClick={() => onChange({ ...value, gender: g.value })}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field__label">Jumlah suku kata <span className="field__hint">/ Syllables</span></span>
        <div className="segmented">
          {SYLLABLE_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={value.slots.length === n}
              onClick={() => setSyllableCount(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field__label">
          Pengaturan per suku kata <span className="field__hint">/ Per-syllable settings</span>
        </span>
        {value.slots.map((slot, i) => (
          <SyllableSlotRow key={i} index={i} slot={slot} onChange={(s) => setSlot(i, s)} />
        ))}
        <div className="chips" style={{ marginTop: '0.5rem' }}>
          <button type="button" className="chip" onClick={() => applyToAll([])}>
            Campur semua etimologi
          </button>
          {ORIGINS.map((o) => (
            <button key={o} type="button" className="chip" onClick={() => applyToAll([o])}>
              Samakan: {o}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className="btn btn--primary">
        ✨ Buat Nama · Generate
      </button>
    </form>
  );
}
