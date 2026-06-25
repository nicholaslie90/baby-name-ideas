import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../src/App';
import styles from '../src/components/NameFrame.module.css';

function generatedName(): string {
  return document.querySelector(`.${styles.name}`)?.textContent?.trim() ?? '';
}

function wordCount(): number {
  const n = generatedName();
  return n ? n.split(/\s+/).length : 0;
}

function openCustomize() {
  // Idempotent: opening an already-open modal is a no-op for these tests.
  const btn = screen.queryByLabelText('Sesuaikan · Customize');
  if (btn) fireEvent.click(btn);
}

function closeModal() {
  if (screen.queryByRole('dialog')) fireEvent.keyDown(document, { key: 'Escape' });
}

function setWords(count: number) {
  openCustomize();
  fireEvent.click(screen.getByRole('button', { name: String(count) }));
}

function clickNext() {
  // The next arrow lives on the main view, so the modal must be closed to reach it.
  closeModal();
  fireEvent.click(screen.getByLabelText('Nama berikutnya'));
}

describe('App: word count controls how many words the name has', () => {
  it('generated names have exactly the selected number of words', () => {
    render(<App />);
    for (const count of [2, 3, 4]) {
      setWords(count); // opens modal, sets count → auto-regenerates once
      expect(wordCount(), `count=${count}, name="${generatedName()}"`).toBe(count);
      for (let i = 0; i < 5; i++) {
        clickNext(); // closes modal, then samples a fresh name with this count
        expect(wordCount(), `count=${count}, name="${generatedName()}"`).toBe(count);
      }
    }
  });

  it('auto-regenerates with the new word count when changed (no Generate click)', () => {
    render(<App />);
    openCustomize();
    setWords(2);
    expect(wordCount()).toBe(2);
    setWords(4);
    expect(wordCount()).toBe(4);
    setWords(3);
    expect(wordCount()).toBe(3);
  });

  it('counts the surname as one of the words', () => {
    render(<App />);
    openCustomize();
    fireEvent.change(screen.getByPlaceholderText('mis. Santoso'), { target: { value: 'Lie' } });
    setWords(2);
    // 1 generated word + surname "Lie" = 2 words total
    expect(wordCount()).toBe(1);
    setWords(3);
    // auto-regenerates: 2 generated words + surname = 3
    expect(wordCount()).toBe(2);
  });

  it('auto-generates a name on first load', () => {
    render(<App />);
    expect(generatedName()).not.toBe('');
  });

  it('the Next arrow generates a fresh name', () => {
    render(<App />);
    const first = generatedName();
    const next = screen.getByLabelText('Nama berikutnya') as HTMLButtonElement;
    expect(next.disabled).toBe(false);
    fireEvent.click(next);
    // A new, non-repeating name replaces the first one.
    expect(generatedName()).not.toBe('');
    expect(generatedName()).not.toBe(first);
  });

  it('the Shuffle button generates a new name and closes the modal', () => {
    render(<App />);
    const first = generatedName();
    openCustomize();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Nama lain/i }));
    // Modal closes so the new name is visible on the card.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(generatedName()).not.toBe('');
    expect(generatedName()).not.toBe(first);
  });
});
