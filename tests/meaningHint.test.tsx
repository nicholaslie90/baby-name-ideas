import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ParameterForm, { type FormState } from '../src/components/ParameterForm';

function meaningForm(meaningQuery: string): FormState {
  return {
    nameStyle: 'meaning',
    surname: '',
    gender: 'N',
    slots: [{}, {}],
    meaningQuery,
  };
}

function renderForm(query: string) {
  render(<ParameterForm value={meaningForm(query)} onChange={() => {}} onGenerate={() => {}} />);
}

describe('By-meaning synonym hint', () => {
  it('shows the expanded synonyms for a known query term', () => {
    renderForm('brave');
    expect(screen.getByText(/valiant/i)).toBeTruthy();
  });

  it('shows Indonesian synonyms too', () => {
    renderForm('brave');
    expect(screen.getByText(/berani/i)).toBeTruthy();
  });

  it('shows no synonym hint for a blank query', () => {
    renderForm('   ');
    expect(screen.queryByText(/also searched/i)).toBeNull();
  });

  it('shows no synonym hint for an unknown term', () => {
    renderForm('xyzzy');
    expect(screen.queryByText(/also searched/i)).toBeNull();
  });
});
