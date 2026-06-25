import { useEffect, useMemo, useRef, useState } from 'react';
import { type FormState } from './components/ParameterForm';
import Deck from './components/Deck';
import Modal from './components/Modal';
import CustomizationPanel from './components/CustomizationPanel';
import { NAME_FONTS, type FrameStyle, type NameFontId } from './components/NameFrame';
import { ELEMENTS, COMMON_NAMES, MEANING_POOL } from './data';
import { generateName, generateFamiliarName, generateByMeaning, analyzeNameCandidates, buildAnalyzedName } from './lib/generator';
import { isGenerateError, type GeneratedName, type GenerateError, type GenerateResult } from './types';

const INITIAL_FORM: FormState = {
  nameStyle: 'familiar',
  surname: '',
  gender: 'N',
  slots: [{}, {}],
};

/** How many random draws to attempt before declaring the filtered pool exhausted. */
const MAX_TRIES = 80;

const nameKey = (g: GeneratedName) => g.name.toLowerCase();

export default function App() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [history, setHistory] = useState<GeneratedName[]>([]);
  const [cursor, setCursor] = useState(-1);
  const [error, setError] = useState<GenerateError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Names already shown — kept across regenerations until the user resets.
  const seen = useRef<Set<string>>(new Set());

  const [style, setStyle] = useState<FrameStyle>('elegant');
  const [nameFont, setNameFont] = useState<NameFontId>('great-vibes');
  const [modalOpen, setModalOpen] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  const analysis = useMemo(
    () =>
      form.nameStyle === 'analyze'
        ? analyzeNameCandidates(form.ownName ?? '', COMMON_NAMES, ELEMENTS)
        : [],
    [form.nameStyle, form.ownName],
  );
  const analysisKey = useMemo(() => analysis.map((w) => w.raw).join('|'), [analysis]);
  const [selections, setSelections] = useState<number[]>([]);
  useEffect(() => {
    setSelections(analysis.map(() => 0));
  }, [analysisKey]);

  function runGenerator(): GenerateResult {
    // The surname counts as one of the chosen words, so generate one fewer
    // given-name word when a surname is present (at least one word always).
    const hasSurname = form.surname.trim().length > 0;
    const wordCount = Math.max(1, form.slots.length - (hasSurname ? 1 : 0));

    if (form.nameStyle === 'familiar') {
      return generateFamiliarName(
        {
          surname: form.surname,
          gender: form.gender,
          words: wordCount,
          initial: form.familiarInitial,
          origins: form.familiarOrigins,
          sameOrigin: form.sameOrigin,
          biblicalOnly: form.biblicalOnly,
          islamicOnly: form.islamicOnly,
        },
        COMMON_NAMES,
      );
    }
    if (form.nameStyle === 'meaning') {
      return generateByMeaning(
        {
          surname: form.surname,
          gender: form.gender,
          words: wordCount,
          query: form.meaningQuery ?? '',
          sameOrigin: form.sameOrigin,
        },
        MEANING_POOL,
      );
    }
    return generateName(
      { surname: form.surname, gender: form.gender, slots: form.slots.slice(0, wordCount), fuse: form.fuse },
      ELEMENTS,
    );
  }

  /** Generate a fresh, non-repeating name and append it to the history. */
  function generate() {
    if (form.nameStyle === 'analyze') {
      // Analyze mode derives `current` live from chip selections; no history.
      setError(null);
      setNotice(null);
      return;
    }

    setNotice(null);

    let res = runGenerator();
    if (isGenerateError(res)) {
      setError(res);
      return;
    }

    let tries = 1;
    while (seen.current.has(nameKey(res)) && tries < MAX_TRIES) {
      const next = runGenerator();
      if (isGenerateError(next)) {
        setError(next);
        return;
      }
      res = next;
      tries++;
    }

    if (seen.current.has(nameKey(res))) {
      setNotice(
        'Semua nama untuk filter ini sudah ditampilkan — tekan Reset untuk mengulang. · ' +
          'All names for these filters have been shown — press Reset to start over.',
      );
      return;
    }

    seen.current.add(nameKey(res));
    const nextHistory = [...history, res];
    setHistory(nextHistory);
    setCursor(nextHistory.length - 1);
    setError(null);
  }

  function goPrev() {
    setError(null);
    setNotice(null);
    setCursor((c) => Math.max(0, c - 1));
  }

  function goNext() {
    setError(null);
    setNotice(null);
    // Step forward through history, or generate a fresh name when at the end.
    if (cursor < history.length - 1) {
      setCursor((c) => c + 1);
    } else {
      generate();
    }
  }

  /** Forget every tracked name so generation can repeat from scratch. */
  function reset() {
    seen.current.clear();
    setHistory([]);
    setCursor(-1);
    setError(null);
    setNotice(null);
  }

  // A signature of everything that affects WHICH name is generated (surname is
  // only displayed, so it is excluded). When this changes and a name is already
  // shown, auto-regenerate so the preview always reflects the current filters.
  const filterSig = JSON.stringify({
    style: form.nameStyle,
    gender: form.gender,
    initial: form.familiarInitial ?? '',
    origins: form.familiarOrigins ?? [],
    meaningQuery: form.meaningQuery ?? '',
    ownName: form.ownName ?? '',
    sameOrigin: form.sameOrigin ?? false,
    biblicalOnly: form.biblicalOnly ?? false,
    islamicOnly: form.islamicOnly ?? false,
    slots: form.slots,
    // Whether a surname exists changes the generated word count (but typing
    // within an existing surname does not — that updates the frame live).
    surnamePresent: form.surname.trim().length > 0,
  });
  const lastSig = useRef(filterSig);
  useEffect(() => {
    if (lastSig.current === filterSig) return;
    lastSig.current = filterSig;
    // Only auto-regenerate once the user has generated at least one name.
    if (cursor >= 0) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSig]);

  // Clear any stale error/notice when entering analyze mode.
  useEffect(() => {
    if (form.nameStyle === 'analyze') {
      setError(null);
      setNotice(null);
    }
  }, [form.nameStyle]);

  // Generate a first name automatically on initial load (once).
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Surname is applied live to the displayed frame without needing to regenerate.
  const current =
    form.nameStyle === 'analyze'
      ? buildAnalyzedName(analysis, selections, form.surname)
      : cursor >= 0 && cursor < history.length
        ? { ...history[cursor], surname: form.surname.trim() }
        : null;

  const analyzeMode = form.nameStyle === 'analyze' && analysis.length > 0;
  const nameFontFamily = NAME_FONTS.find((f) => f.id === nameFont)?.family;

  return (
    <div className="app">
      <Deck
        current={current}
        style={style}
        nameFontFamily={nameFontFamily}
        error={error}
        notice={notice}
        canPrev={cursor > 0}
        onNext={goNext}
        onPrev={goPrev}
        navDisabled={analyzeMode}
        onOpenCustomize={() => setModalOpen(true)}
        frameRef={frameRef}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Sesuaikan nama · Customize">
        <CustomizationPanel
          form={form}
          onFormChange={setForm}
          onGenerate={generate}
          onShuffle={() => {
            generate();
            setModalOpen(false);
          }}
          style={style}
          onStyleChange={setStyle}
          nameFont={nameFont}
          onNameFontChange={setNameFont}
          frameRef={frameRef}
          exportName={current?.name ?? ''}
          exportSurname={current?.surname ?? ''}
          onReset={reset}
          wordAnalyses={analyzeMode ? analysis : undefined}
          selections={selections}
          onSelectCandidate={(wi, ci) =>
            setSelections((prev) => {
              const next = [...prev];
              next[wi] = ci;
              return next;
            })
          }
        />
      </Modal>
    </div>
  );
}
