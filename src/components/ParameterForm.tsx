import {
  COMMON_ORIGINS,
  ELEMENT_ORIGINS,
  ORIGIN_LABELS,
  type Gender,
  type NameStyle,
  type Origin,
  type SlotConstraint,
} from '../types';
import SyllableSlotRow from './SyllableSlotRow';

export interface FormState {
  nameStyle: NameStyle;
  surname: string;
  gender: Gender;
  /** Length tracks the chosen syllable count; per-slot data used in composed mode. */
  slots: SlotConstraint[];
  /** Familiar-mode: desired first letter of the name (empty = auto). */
  familiarInitial?: string;
  /** Familiar-mode: allowed origins (empty = all). */
  familiarOrigins?: Origin[];
}

const NAME_STYLES: { value: NameStyle; label: string; hint: string }[] = [
  { value: 'familiar', label: 'Umum', hint: 'mis. Cindy, Elaine, Christie' },
  { value: 'composed', label: 'Unik', hint: 'dirangkai dari akar kata' },
];

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
  const familiar = value.nameStyle === 'familiar';
  const familiarOrigins = value.familiarOrigins ?? [];

  function setSyllableCount(count: number) {
    const slots: SlotConstraint[] = Array.from({ length: count }, (_, i) => value.slots[i] ?? {});
    onChange({ ...value, slots });
  }

  function setSlot(index: number, slot: SlotConstraint) {
    const slots = value.slots.map((s, i) => (i === index ? slot : s));
    onChange({ ...value, slots });
  }

  function applyToAll(origins: Origin[]) {
    onChange({
      ...value,
      slots: value.slots.map((s) => ({ ...s, origins: origins.length ? origins : undefined })),
    });
  }

  function setFamiliarInitial(raw: string) {
    const letter = raw.replace(/[^a-zA-Z]/g, '').slice(0, 1).toLowerCase();
    onChange({ ...value, familiarInitial: letter || undefined });
  }

  function toggleFamiliarOrigin(o: Origin) {
    const next = familiarOrigins.includes(o)
      ? familiarOrigins.filter((x) => x !== o)
      : [...familiarOrigins, o];
    onChange({ ...value, familiarOrigins: next });
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
        <span className="field__label">Gaya nama <span className="field__hint">/ Name style</span></span>
        <div className="segmented">
          {NAME_STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-pressed={value.nameStyle === s.value}
              onClick={() => onChange({ ...value, nameStyle: s.value })}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="field__hint" style={{ marginTop: '0.35rem' }}>
          {familiar ? 'Nama umum yang dikenal · ' + NAME_STYLES[0].hint : 'Nama unik · ' + NAME_STYLES[1].hint}
        </p>
      </div>

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

      {familiar ? (
        <>
          <div className="field">
            <label className="field__label" htmlFor="familiar-initial">
              Awalan nama <span className="field__hint">/ Initial — kosongkan untuk acak otomatis</span>
            </label>
            <input
              id="familiar-initial"
              type="text"
              maxLength={1}
              placeholder="— (auto)"
              value={value.familiarInitial ?? ''}
              onChange={(e) => setFamiliarInitial(e.target.value)}
            />
          </div>
          <div className="field">
            <span className="field__label">
              Etimologi <span className="field__hint">(kosong = semua)</span>
            </span>
            <div className="chips">
              {COMMON_ORIGINS.map((o) => (
                <button
                  key={o}
                  type="button"
                  className="chip"
                  aria-pressed={familiarOrigins.includes(o)}
                  onClick={() => toggleFamiliarOrigin(o)}
                >
                  {ORIGIN_LABELS[o].id}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="field">
          <span className="field__label">
            Pengaturan per suku kata <span className="field__hint">/ Per-syllable — kosongkan awalan untuk acak</span>
          </span>
          {value.slots.map((slot, i) => (
            <SyllableSlotRow key={i} index={i} slot={slot} onChange={(s) => setSlot(i, s)} />
          ))}
          <div className="chips" style={{ marginTop: '0.5rem' }}>
            <button type="button" className="chip" onClick={() => applyToAll([])}>
              Campur semua etimologi
            </button>
            {ELEMENT_ORIGINS.map((o) => (
              <button key={o} type="button" className="chip" onClick={() => applyToAll([o])}>
                Samakan: {ORIGIN_LABELS[o].id}
              </button>
            ))}
          </div>
        </div>
      )}

      <button type="submit" className="btn btn--primary">
        ✨ Buat Nama · Generate
      </button>
    </form>
  );
}
