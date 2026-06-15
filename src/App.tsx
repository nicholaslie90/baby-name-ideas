import { useState } from 'react';
import ParameterForm, { type FormState } from './components/ParameterForm';
import ResultPanel from './components/ResultPanel';
import { ELEMENTS, COMMON_NAMES } from './data';
import { generateName, generateFamiliarName } from './lib/generator';
import type { GenerateResult } from './types';

const INITIAL_FORM: FormState = {
  nameStyle: 'familiar',
  surname: '',
  gender: 'N',
  slots: [{}, {}],
};

export default function App() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [result, setResult] = useState<GenerateResult | null>(null);

  function generate() {
    if (form.nameStyle === 'familiar') {
      setResult(
        generateFamiliarName(
          {
            surname: form.surname,
            gender: form.gender,
            syllables: form.slots.length,
            initial: form.familiarInitial,
            origins: form.familiarOrigins,
          },
          COMMON_NAMES,
        ),
      );
    } else {
      setResult(
        generateName({ surname: form.surname, gender: form.gender, slots: form.slots }, ELEMENTS),
      );
    }
  }

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
        <ResultPanel result={result} onRegenerate={generate} />
      </div>

      <footer className="app__footer">
        Arab · Sanskerta/Jawa · Latin/Yunani · Ibrani — dibuat untuk berbagi kebahagiaan 🍼
      </footer>
    </div>
  );
}
