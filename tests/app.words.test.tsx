import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '../src/App';
import styles from '../src/components/NameFrame.module.css';

function generatedName(): string {
  return document.querySelector(`.${styles.name}`)?.textContent?.trim() ?? '';
}

function wordCount(): number {
  const n = generatedName();
  return n ? n.split(/\s+/).length : 0;
}

function setWords(count: number) {
  fireEvent.click(screen.getByRole('button', { name: String(count) }));
}

function clickGenerate() {
  fireEvent.click(screen.getByRole('button', { name: /Buat Nama/i }));
}

describe('App: word count controls how many words the name has', () => {
  it('generated names have exactly the selected number of words', () => {
    render(<App />);
    for (const count of [2, 3, 4]) {
      setWords(count);
      for (let i = 0; i < 6; i++) {
        clickGenerate();
        expect(wordCount(), `count=${count}, name="${generatedName()}"`).toBe(count);
      }
    }
  });

  it('auto-regenerates with the new word count when changed (no Generate click)', () => {
    render(<App />);
    setWords(2);
    clickGenerate();
    expect(wordCount()).toBe(2);
    setWords(4);
    expect(wordCount()).toBe(4);
    setWords(3);
    expect(wordCount()).toBe(3);
  });

  it('counts the surname as one of the words', () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('mis. Santoso'), { target: { value: 'Lie' } });
    setWords(2);
    clickGenerate();
    // 1 generated word + surname "Lie" = 2 words total
    expect(wordCount()).toBe(1);
    setWords(3);
    // auto-regenerates: 2 generated words + surname = 3
    expect(wordCount()).toBe(2);
  });

  it('auto-generates a name on first load', () => {
    render(<App />);
    // No clicks: a name and the "1 / 1" counter are already present.
    expect(generatedName()).not.toBe('');
    const panel = screen.getByText(/Regenerate/i).closest('.result') as HTMLElement;
    expect(within(panel).getByText(/1 \/ 1/)).toBeTruthy();
  });

  it('the Next arrow is always enabled and generates a new name at the end', () => {
    render(<App />);
    const next = screen.getByLabelText('Nama berikutnya') as HTMLButtonElement;
    const panel = screen.getByText(/Regenerate/i).closest('.result') as HTMLElement;
    expect(next.disabled).toBe(false);
    // One name was auto-generated on load.
    expect(within(panel).getByText(/1 \/ 1/)).toBeTruthy();
    fireEvent.click(next);
    // At the end of history, Next generates a fresh name -> history grows to 2.
    expect(within(panel).getByText(/2 \/ 2/)).toBeTruthy();
  });
});
