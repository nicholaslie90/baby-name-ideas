import { useEffect, useRef, useState } from 'react';
import ParameterForm, { type FormState } from './components/ParameterForm';
import ResultPanel from './components/ResultPanel';
import { ELEMENTS, COMMON_NAMES, MEANING_POOL } from './data';
import { generateName, generateFamiliarName, generateByMeaning } from './lib/generator';
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
      { surname: form.surname, gender: form.gender, slots: form.slots.slice(0, wordCount) },
      ELEMENTS,
    );
  }

  /** Generate a fresh, non-repeating name and append it to the history. */
  function generate() {
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
    sameOrigin: form.sameOrigin ?? false,
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
    cursor >= 0 && cursor < history.length
      ? { ...history[cursor], surname: form.surname.trim() }
      : null;

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Generator Nama Bayi</h1>
        <p className="app__subtitle">
          Rangkai nama bermakna dari akar etimologi · Craft a meaningful name from etymological roots
        </p>
      </header>

      <div className="layout">
        <ParameterForm value={form} onChange={setForm} onGenerate={generate} />
        <ResultPanel
          current={current}
          error={error}
          notice={notice}
          position={{ index: cursor, total: history.length }}
          canPrev={cursor > 0}
          onPrev={goPrev}
          onNext={goNext}
          onRegenerate={generate}
          onReset={reset}
        />
      </div>

      <footer className="app__footer">
        Arab · Sanskerta/Jawa · Latin/Yunani · Ibrani — dibuat untuk berbagi kebahagiaan 🍼
      </footer>
    </div>
  );
}
