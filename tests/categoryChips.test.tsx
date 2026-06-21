import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ParameterForm, { type FormState } from '../src/components/ParameterForm';

function familiarForm(extra: Partial<FormState> = {}): FormState {
  return { nameStyle: 'familiar', surname: '', gender: 'N', slots: [{}, {}], ...extra };
}

describe('Category chips (familiar mode)', () => {
  it('renders both the Biblical and Islamic category chips', () => {
    render(<ParameterForm value={familiarForm()} onChange={() => {}} onGenerate={() => {}} />);
    expect(screen.getByText(/Islami · Islamic/)).toBeTruthy();
    expect(screen.getByText(/Alkitab · Biblical/)).toBeTruthy();
  });

  it('toggles islamicOnly when the Islami chip is clicked', () => {
    const onChange = vi.fn();
    render(<ParameterForm value={familiarForm()} onChange={onChange} onGenerate={() => {}} />);
    fireEvent.click(screen.getByText(/Islami · Islamic/));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ islamicOnly: true }));
  });

  it('shows the islamic-only hint when islamicOnly is set', () => {
    render(<ParameterForm value={familiarForm({ islamicOnly: true })} onChange={() => {}} onGenerate={() => {}} />);
    expect(screen.getByText(/islamic names only/)).toBeTruthy();
  });

  it('shows the combined hint when both categories are set', () => {
    render(<ParameterForm value={familiarForm({ islamicOnly: true, biblicalOnly: true })} onChange={() => {}} onGenerate={() => {}} />);
    expect(screen.getByText(/biblical or islamic names only/)).toBeTruthy();
  });
});
