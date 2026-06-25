// tests/modal.test.tsx
import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../src/components/Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}}>
        <p>body</p>
      </Modal>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders children inside a dialog when open', () => {
    render(
      <Modal open onClose={() => {}} title="Customize">
        <p>body</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Customize' })).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('calls onClose on backdrop click but not on content click', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <p>body</p>
      </Modal>,
    );
    fireEvent.click(screen.getByText('body'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(document.querySelector('.modal-overlay') as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape and on the close button', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <p>body</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByLabelText('Tutup · Close'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('keeps focus on a child input when the parent re-renders (with a fresh onClose)', () => {
    // Reproduces the typing-loses-focus bug: App passes a new onClose arrow on
    // every render, so a re-render must NOT re-focus the dialog and steal focus
    // from whatever input the user is typing in.
    function Harness() {
      const [n, setN] = useState(0);
      return (
        <Modal open onClose={() => {}}>
          <input data-testid="field" />
          <button onClick={() => setN(n + 1)}>bump {n}</button>
        </Modal>
      );
    }
    render(<Harness />);
    const field = screen.getByTestId('field') as HTMLInputElement;
    field.focus();
    expect(document.activeElement).toBe(field);
    // Force a parent re-render (new onClose identity, mimicking App on keystroke).
    fireEvent.click(screen.getByText(/bump/));
    expect(document.activeElement).toBe(field);
  });
});
