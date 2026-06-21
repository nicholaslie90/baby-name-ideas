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
  /** Meaning-mode: meaning words to search, e.g. "joy, happy, glee". */
  meaningQuery?: string;
  /** Familiar/meaning modes: force all words to share one etymology. */
  sameOrigin?: boolean;
}

const NAME_STYLES: { value: NameStyle; label: string; hint: string }[] = [
  { value: 'familiar', label: 'Umum', hint: 'mis. Cindy, Elaine, Christie' },
  { value: 'composed', label: 'Unik', hint: 'dirangkai dari akar kata' },
  { value: 'meaning', label: 'Arti', hint: 'mis. joy, happy, glee' },
];

const STYLE_HINTS: Record<NameStyle, string> = {
  familiar: 'Nama umum yang dikenal · ' + NAME_STYLES[0].hint,
  composed: 'Nama unik · ' + NAME_STYLES[1].hint,
  meaning: 'Cari dari arti · ' + NAME_STYLES[2].hint,
};

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' },
  { value: 'N', label: 'Netral' },
];

const WORD_OPTIONS = [2, 3, 4];

interface Props {
  value: FormState;
  onChange: (next: FormState) => void;
  onGenerate: () => void;
}

export default function ParameterForm({ value, onChange, onGenerate }: Props) {
  const familiar = value.nameStyle === 'familiar';
  const meaning = value.nameStyle === 'meaning';
  const familiarOrigins = value.familiarOrigins ?? [];
  const surname = value.surname.trim();
  // The surname is one of the chosen words, so one fewer word is generated.
  const generatedWords = Math.max(1, value.slots.length - (surname ? 1 : 0));

  function setWordCount(count: number) {
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
          {STYLE_HINTS[value.nameStyle]}
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
        <span className="field__label">
          Jumlah kata <span className="field__hint">/ Words — mis. 3 = tiga kata</span>
        </span>
        <div className="segmented">
          {WORD_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={value.slots.length === n}
              onClick={() => setWordCount(n)}
            >
              {n}
            </button>
          ))}
        </div>
        {surname && (
          <p className="field__hint" style={{ marginTop: '0.35rem' }}>
            Termasuk nama keluarga «{surname}» · includes surname — {generatedWords} kata akan dibuat
          </p>
        )}
      </div>

      {meaning ? (
        <div className="field">
          <label className="field__label" htmlFor="meaning-query">
            Kata arti <span className="field__hint">/ Meaning words — pisahkan dengan koma</span>
          </label>
          <input
            id="meaning-query"
            type="text"
            placeholder="mis. joy, happy, glee"
            value={value.meaningQuery ?? ''}
            onChange={(e) => onChange({ ...value, meaningQuery: e.target.value })}
          />
          <p className="field__hint" style={{ marginTop: '0.35rem' }}>
            Nama dirangkai dari kata yang artinya mengandung salah satu kata ini ·
            names are built from parts meaning any of these words
          </p>
        </div>
      ) : familiar ? (
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
            Pengaturan per kata <span className="field__hint">/ Per-word — kosongkan awalan untuk acak</span>
          </span>
          {value.slots.slice(0, generatedWords).map((slot, i) => (
            <SyllableSlotRow key={i} index={i} slot={slot} onChange={(s) => setSlot(i, s)} />
          ))}
          {surname && (
            <p className="field__hint" style={{ margin: '0 0 0.5rem' }}>
              Kata terakhir: nama keluarga «{surname}» · last word is the surname
            </p>
          )}
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

      {(familiar || meaning) && (
        <div className="field">
          <span className="field__label">
            Etimologi antar-kata <span className="field__hint">/ Across words</span>
          </span>
          <div className="segmented">
            <button
              type="button"
              aria-pressed={!value.sameOrigin}
              onClick={() => onChange({ ...value, sameOrigin: false })}
            >
              Campur
            </button>
            <button
              type="button"
              aria-pressed={!!value.sameOrigin}
              onClick={() => onChange({ ...value, sameOrigin: true })}
            >
              Sama
            </button>
          </div>
          <p className="field__hint" style={{ marginTop: '0.35rem' }}>
            {value.sameOrigin
              ? 'Semua kata dari satu etimologi · all words share one etymology'
              : 'Boleh beda etimologi tiap kata · words may mix etymologies'}
          </p>
        </div>
      )}

      <button type="submit" className="btn btn--primary">
        ✨ Buat Nama · Generate
      </button>
    </form>
  );
}
