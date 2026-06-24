import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ParameterForm, { type FormState } from '../src/components/ParameterForm';

function composedForm(extra: Partial<FormState> = {}): FormState {
  return { nameStyle: 'composed', surname: '', gender: 'N', slots: [{}, {}], ...extra };
}

describe('Fuse toggle (composed mode)', () => {
  it('renders the Lebur option in composed mode', () => {
    render(<ParameterForm value={composedForm()} onChange={() => {}} onGenerate={() => {}} />);
    expect(screen.getByText(/Lebur/)).toBeTruthy();
  });

  it('does not render the fuse toggle in familiar mode', () => {
    const familiar: FormState = { nameStyle: 'familiar', surname: '', gender: 'N', slots: [{}, {}] };
    render(<ParameterForm value={familiar} onChange={() => {}} onGenerate={() => {}} />);
    expect(screen.queryByText(/Lebur akar jadi satu kata/)).toBeNull();
  });

  it('sets fuse=true when Lebur is clicked', () => {
    const onChange = vi.fn();
    render(<ParameterForm value={composedForm()} onChange={onChange} onGenerate={() => {}} />);
    fireEvent.click(screen.getByText(/Lebur/));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fuse: true }));
  });
});
