# Pigura-first Swipe UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the main view show only the pigura with Tinder-style swipe (right = new name, left = previous), and move all controls/parameters into a single customization modal.

**Architecture:** Lift frame `style`/`nameFont`/`modalOpen`/`frameRef` state up to `App`. A new `Deck` renders the current `NameFrame` full-viewport with a hand-rolled `useSwipe` pointer hook, slim desktop arrows, and a ⚙ button. A new accessible `Modal` hosts a new `CustomizationPanel` (ParameterForm + style/font switchers + export + reset + analyze chips). `ResultPanel` is retired; `NameFrame`, `ParameterForm`, the switchers, `ExportButtons`, and `WordCandidateChips` are reused unchanged, only relocated.

**Tech Stack:** React 18, TypeScript, Vite, Vitest + Testing Library, plain CSS modules / global CSS. No new dependencies.

## Global Constraints

- No new runtime or dev dependencies — swipe is hand-rolled with pointer events.
- TypeScript strict build must pass: `npx tsc -b`.
- All UI copy stays bilingual Indonesian · English (`id · en`), matching existing strings.
- Full test suite must pass: `npm test`.
- Do not change name-generation logic, datasets, or `NameFrame` rendering/markup.
- No "save/favorites" feature: swipe-right means "new", not "like".
- Main view must not scroll vertically or horizontally; the pigura fits the viewport.

---

### Task 1: `useSwipe` pointer hook

**Files:**
- Create: `src/hooks/useSwipe.ts`
- Test: `tests/useSwipe.test.tsx`

**Interfaces:**
- Consumes: nothing (React only).
- Produces:
  - `useSwipe(opts: UseSwipeOptions): UseSwipeResult`
  - `interface UseSwipeOptions { onSwipeRight: () => void; onSwipeLeft: () => void; disabled?: boolean; threshold?: number }`
  - `interface SwipeHandlers { onPointerDown; onPointerMove; onPointerUp; onPointerCancel: (e: React.PointerEvent) => void }`
  - `interface UseSwipeResult { dx: number; dragging: boolean; handlers: SwipeHandlers }`
  - Commit rule: on pointer up, `delta >= threshold` → `onSwipeRight()`; `delta <= -threshold` → `onSwipeLeft()`; else nothing. Pointer cancel resets without firing. Default `threshold = 90`.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/useSwipe.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useSwipe, type UseSwipeOptions } from '../src/hooks/useSwipe';

function Harness(opts: UseSwipeOptions) {
  const { dx, dragging, handlers } = useSwipe(opts);
  return (
    <div data-testid="card" {...handlers}>
      dx:{dx} drag:{String(dragging)}
    </div>
  );
}

function drag(from: number, to: number) {
  const el = screen.getByTestId('card');
  fireEvent.pointerDown(el, { clientX: from, pointerId: 1 });
  fireEvent.pointerMove(el, { clientX: to, pointerId: 1 });
  fireEvent.pointerUp(el, { clientX: to, pointerId: 1 });
}

describe('useSwipe', () => {
  it('fires onSwipeRight when dragged right past the threshold', () => {
    const onSwipeRight = vi.fn();
    const onSwipeLeft = vi.fn();
    render(<Harness onSwipeRight={onSwipeRight} onSwipeLeft={onSwipeLeft} threshold={50} />);
    drag(0, 120);
    expect(onSwipeRight).toHaveBeenCalledTimes(1);
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it('fires onSwipeLeft when dragged left past the threshold', () => {
    const onSwipeRight = vi.fn();
    const onSwipeLeft = vi.fn();
    render(<Harness onSwipeRight={onSwipeRight} onSwipeLeft={onSwipeLeft} threshold={50} />);
    drag(120, 0);
    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('fires nothing below the threshold and resets dx to 0', () => {
    const onSwipeRight = vi.fn();
    const onSwipeLeft = vi.fn();
    render(<Harness onSwipeRight={onSwipeRight} onSwipeLeft={onSwipeLeft} threshold={50} />);
    drag(0, 20);
    expect(onSwipeRight).not.toHaveBeenCalled();
    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(screen.getByTestId('card').textContent).toContain('dx:0');
  });

  it('does nothing when disabled', () => {
    const onSwipeRight = vi.fn();
    render(<Harness onSwipeRight={onSwipeRight} onSwipeLeft={() => {}} threshold={50} disabled />);
    drag(0, 200);
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('does not fire on pointer cancel even past the threshold', () => {
    const onSwipeRight = vi.fn();
    render(<Harness onSwipeRight={onSwipeRight} onSwipeLeft={() => {}} threshold={50} />);
    const el = screen.getByTestId('card');
    fireEvent.pointerDown(el, { clientX: 0, pointerId: 1 });
    fireEvent.pointerMove(el, { clientX: 200, pointerId: 1 });
    fireEvent.pointerCancel(el, { clientX: 200, pointerId: 1 });
    expect(onSwipeRight).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/useSwipe.test.tsx`
Expected: FAIL — cannot resolve `../src/hooks/useSwipe`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/hooks/useSwipe.ts
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

export interface UseSwipeOptions {
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  /** When true, all gestures are ignored. */
  disabled?: boolean;
  /** Horizontal distance (px) a drag must exceed to commit. */
  threshold?: number;
}

export interface SwipeHandlers {
  onPointerDown: (e: ReactPointerEvent) => void;
  onPointerMove: (e: ReactPointerEvent) => void;
  onPointerUp: (e: ReactPointerEvent) => void;
  onPointerCancel: (e: ReactPointerEvent) => void;
}

export interface UseSwipeResult {
  /** Current horizontal drag offset in px (0 when idle). */
  dx: number;
  dragging: boolean;
  handlers: SwipeHandlers;
}

const DEFAULT_THRESHOLD = 90;

export function useSwipe({
  onSwipeRight,
  onSwipeLeft,
  disabled = false,
  threshold = DEFAULT_THRESHOLD,
}: UseSwipeOptions): UseSwipeResult {
  const startX = useRef<number | null>(null);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);

  function reset() {
    startX.current = null;
    setDragging(false);
    setDx(0);
  }

  function onPointerDown(e: ReactPointerEvent) {
    if (disabled) return;
    startX.current = e.clientX;
    setDragging(true);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (disabled || startX.current === null) return;
    setDx(e.clientX - startX.current);
  }

  function onPointerUp(e: ReactPointerEvent) {
    if (disabled || startX.current === null) return;
    const delta = e.clientX - startX.current;
    reset();
    if (delta >= threshold) onSwipeRight();
    else if (delta <= -threshold) onSwipeLeft();
  }

  return {
    dx,
    dragging,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: reset },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/useSwipe.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSwipe.ts tests/useSwipe.test.tsx
git commit -m "feat: add useSwipe pointer hook for card gestures"
```

---

### Task 2: `Modal` accessible dialog

**Files:**
- Create: `src/components/Modal.tsx`
- Test: `tests/modal.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `Modal({ open, onClose, title?, children }): JSX.Element | null`
  - `interface ModalProps { open: boolean; onClose: () => void; title?: string; children: React.ReactNode }`
  - Renders `null` when `!open`. When open: an overlay `div.modal-overlay` (click → `onClose`) wrapping `div.modal[role="dialog"][aria-modal="true"]` (click stops propagation), with a close button `aria-label="Tutup · Close"`. Esc anywhere calls `onClose`. Focus moves into the dialog on open and is restored to the previously focused element on close.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/modal.test.tsx
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/modal.test.tsx`
Expected: FAIL — cannot resolve `../src/components/Modal`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/Modal.tsx
import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal__close" onClick={onClose} aria-label="Tutup · Close">
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/modal.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/Modal.tsx tests/modal.test.tsx
git commit -m "feat: add accessible Modal dialog component"
```

---

### Task 3: `Deck` full-viewport card with swipe + arrows + customize button

**Files:**
- Create: `src/components/Deck.tsx`
- Test: `tests/deck.test.tsx`

**Interfaces:**
- Consumes: `useSwipe` (Task 1); `NameFrame` + `FrameStyle` from `./NameFrame`; `GeneratedName`, `GenerateError` from `../types`.
- Produces: `Deck(props: DeckProps): JSX.Element` where

```ts
interface DeckProps {
  current: GeneratedName | null;
  style: FrameStyle;
  nameFontFamily?: string;
  error: GenerateError | null;
  notice: string | null;
  canPrev: boolean;
  onNext: () => void;          // swipe right / right arrow / ArrowRight → new name
  onPrev: () => void;          // swipe left / left arrow / ArrowLeft → previous name
  navDisabled: boolean;        // true in analyze mode: hides arrows, disables swipe/keys
  onOpenCustomize: () => void;
  frameRef: React.RefObject<HTMLDivElement>;
}
```
  - Arrows have `aria-label` `"Nama sebelumnya"` (left, `disabled` when `!canPrev`) and `"Nama berikutnya"` (right). They are not rendered when `navDisabled`. The ⚙ button has `aria-label="Sesuaikan · Customize"`. The error state renders the bilingual error and a `↻ Coba lagi · Try again` button calling `onNext`.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/deck.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Deck from '../src/components/Deck';
import type { GeneratedName } from '../src/types';

const CURRENT: GeneratedName = {
  name: 'Sara',
  surname: '',
  elements: [{ id: 's', text: 'sara', initial: 's', origin: 'arab', gender: 'P', meaning: { id: 'murni', en: 'pure' } }],
  origins: ['arab'],
  wordGroups: [1],
};

function renderDeck(over: Partial<React.ComponentProps<typeof Deck>> = {}) {
  const props = {
    current: CURRENT,
    style: 'elegant' as const,
    nameFontFamily: undefined,
    error: null,
    notice: null,
    canPrev: true,
    onNext: vi.fn(),
    onPrev: vi.fn(),
    navDisabled: false,
    onOpenCustomize: vi.fn(),
    frameRef: createRef<HTMLDivElement>(),
    ...over,
  };
  render(<Deck {...props} />);
  return props;
}

describe('Deck', () => {
  it('renders the current name and the customize button', () => {
    const props = renderDeck();
    expect(screen.getByText('Sara')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Sesuaikan · Customize'));
    expect(props.onOpenCustomize).toHaveBeenCalledTimes(1);
  });

  it('right arrow calls onNext, left arrow calls onPrev', () => {
    const props = renderDeck();
    fireEvent.click(screen.getByLabelText('Nama berikutnya'));
    expect(props.onNext).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByLabelText('Nama sebelumnya'));
    expect(props.onPrev).toHaveBeenCalledTimes(1);
  });

  it('disables the left arrow when canPrev is false', () => {
    renderDeck({ canPrev: false });
    expect(screen.getByLabelText('Nama sebelumnya')).toBeDisabled();
  });

  it('hides the nav arrows when navDisabled', () => {
    renderDeck({ navDisabled: true });
    expect(screen.queryByLabelText('Nama berikutnya')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nama sebelumnya')).not.toBeInTheDocument();
  });

  it('maps ArrowRight/ArrowLeft keys to onNext/onPrev', () => {
    const props = renderDeck();
    const deck = screen.getByText('Sara').closest('.deck') as HTMLElement;
    fireEvent.keyDown(deck, { key: 'ArrowRight' });
    expect(props.onNext).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(deck, { key: 'ArrowLeft' });
    expect(props.onPrev).toHaveBeenCalledTimes(1);
  });

  it('renders the error state with a retry that calls onNext', () => {
    const props = renderDeck({
      current: null,
      error: { slotIndex: -1, message: { id: 'Tidak ada', en: 'None' } },
    });
    expect(screen.getByText('Tidak ada')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Coba lagi/ }));
    expect(props.onNext).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/deck.test.tsx`
Expected: FAIL — cannot resolve `../src/components/Deck`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/Deck.tsx
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';
import type { GeneratedName, GenerateError } from '../types';
import NameFrame, { type FrameStyle } from './NameFrame';
import { useSwipe } from '../hooks/useSwipe';

interface DeckProps {
  current: GeneratedName | null;
  style: FrameStyle;
  nameFontFamily?: string;
  error: GenerateError | null;
  notice: string | null;
  canPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
  navDisabled: boolean;
  onOpenCustomize: () => void;
  frameRef: RefObject<HTMLDivElement>;
}

export default function Deck({
  current,
  style,
  nameFontFamily,
  error,
  notice,
  canPrev,
  onNext,
  onPrev,
  navDisabled,
  onOpenCustomize,
  frameRef,
}: DeckProps) {
  const { dx, dragging, handlers } = useSwipe({
    onSwipeRight: onNext,
    onSwipeLeft: () => {
      if (canPrev) onPrev();
    },
    disabled: navDisabled,
  });

  function onKeyDown(e: ReactKeyboardEvent) {
    if (navDisabled) return;
    if (e.key === 'ArrowRight') onNext();
    else if (e.key === 'ArrowLeft' && canPrev) onPrev();
  }

  return (
    <div className="deck" tabIndex={0} onKeyDown={onKeyDown}>
      <button className="deck__customize" onClick={onOpenCustomize} aria-label="Sesuaikan · Customize">
        ⚙
      </button>

      {!navDisabled && (
        <button
          className="deck__arrow deck__arrow--left"
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="Nama sebelumnya"
        >
          ‹
        </button>
      )}

      <div className="deck__stage">
        {error ? (
          <div className="error deck__error">
            {error.message ? (
              <>
                {error.message.id}
                <br />
                {error.message.en}
              </>
            ) : error.slotIndex >= 0 ? (
              <>
                Tidak ada kandidat untuk <strong>kata {error.slotIndex + 1}</strong>. Longgarkan
                awalan atau etimologinya.
                <br />
                No candidates for word {error.slotIndex + 1} — relax its initial letter or etymology.
              </>
            ) : (
              <>
                Tidak ada nama umum yang cocok. Longgarkan awalan atau etimologinya.
                <br />
                No matching common name — relax the initial letter or etymology.
              </>
            )}
            <div>
              <button className="btn btn--ghost" onClick={onNext}>
                ↻ Coba lagi · Try again
              </button>
            </div>
          </div>
        ) : current ? (
          <div
            key={current.name}
            className={`deck__card${dragging ? ' is-dragging' : ''}`}
            style={{ transform: `translateX(${dx}px) rotate(${dx * 0.04}deg)` }}
            {...handlers}
          >
            <NameFrame ref={frameRef} result={current} style={style} nameFontFamily={nameFontFamily} />
          </div>
        ) : (
          <div className="empty">
            <p style={{ fontSize: '2.5rem', margin: 0 }}>👶</p>
            <p>
              Tekan <strong>⚙</strong> untuk mengatur, lalu geser kartu.
              <br />
              Tap <strong>⚙</strong> to set parameters, then swipe the card.
            </p>
          </div>
        )}
        {notice && <p className="notice deck__notice">{notice}</p>}
      </div>

      {!navDisabled && (
        <button className="deck__arrow deck__arrow--right" onClick={onNext} aria-label="Nama berikutnya">
          ›
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/deck.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/Deck.tsx tests/deck.test.tsx
git commit -m "feat: add Deck full-viewport swipeable card"
```

---

### Task 4: `CustomizationPanel` (modal body) — replaces ResultPanel's controls

**Files:**
- Create: `src/components/CustomizationPanel.tsx`
- Create: `tests/customizationPanel.test.tsx`
- Delete: `src/components/ResultPanel.tsx`
- Delete: `tests/resultPanelCandidates.test.tsx`

**Interfaces:**
- Consumes: `ParameterForm` + `FormState` from `./ParameterForm`; `FrameStyleSwitcher`; `NameFontSwitcher`; `ExportButtons`; `WordCandidateChips`; `FrameStyle`, `NameFontId` from `./NameFrame`; `WordAnalysis` from `../lib/generator`.
- Produces: `CustomizationPanel(props: CustomizationPanelProps): JSX.Element`

```ts
interface CustomizationPanelProps {
  form: FormState;
  onFormChange: (next: FormState) => void;
  onGenerate: () => void;
  style: FrameStyle;
  onStyleChange: (style: FrameStyle) => void;
  nameFont: NameFontId;
  onNameFontChange: (font: NameFontId) => void;
  frameRef: React.RefObject<HTMLDivElement>;
  exportName: string;
  exportSurname: string;
  onReset: () => void;
  wordAnalyses?: WordAnalysis[];
  selections?: number[];
  onSelectCandidate?: (wordIndex: number, candidateIndex: number) => void;
}
```
  - Analyze mode = `wordAnalyses` non-empty. In analyze mode the `WordCandidateChips` render and the Reset button is hidden; otherwise Reset (`aria-label="Reset"`) shows. Export buttons always render.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/customizationPanel.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomizationPanel from '../src/components/CustomizationPanel';
import type { FormState } from '../src/components/ParameterForm';
import type { WordAnalysis } from '../src/lib/generator';

const FORM: FormState = { nameStyle: 'familiar', surname: '', gender: 'N', slots: [{}, {}] };

function base(over: Partial<React.ComponentProps<typeof CustomizationPanel>> = {}) {
  const props = {
    form: FORM,
    onFormChange: vi.fn(),
    onGenerate: vi.fn(),
    style: 'elegant' as const,
    onStyleChange: vi.fn(),
    nameFont: 'great-vibes' as const,
    onNameFontChange: vi.fn(),
    frameRef: createRef<HTMLDivElement>(),
    exportName: 'Sara',
    exportSurname: '',
    onReset: vi.fn(),
    ...over,
  };
  render(<CustomizationPanel {...props} />);
  return props;
}

const WORDS: WordAnalysis[] = [
  {
    raw: 'Sara',
    candidates: [
      { kind: 'exact', displayName: 'Sara', elements: [], meaning: { id: 'putri', en: 'princess' }, origins: ['ibrani'] },
      { kind: 'exact', displayName: 'Sara', elements: [], meaning: { id: 'murni', en: 'pure' }, origins: ['arab'] },
    ],
  },
];

describe('CustomizationPanel', () => {
  it('shows the form, style switch, font switch, export and reset', () => {
    base();
    expect(screen.getByText(/Gaya nama/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Frame style/ })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Name font/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Unduh PNG · Download PNG')).toBeInTheDocument();
    expect(screen.getByLabelText('Reset')).toBeInTheDocument();
  });

  it('in analyze mode shows candidate chips and hides Reset', async () => {
    const onSelectCandidate = vi.fn();
    base({
      form: { ...FORM, nameStyle: 'analyze', ownName: 'Sara' },
      wordAnalyses: WORDS,
      selections: [1],
      onSelectCandidate,
    });
    const group = screen.getByRole('group', { name: /Sara/ });
    const chips = within(group).getAllByRole('button');
    expect(chips).toHaveLength(2);
    expect(chips[1]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByLabelText('Reset')).not.toBeInTheDocument();
    await userEvent.click(chips[0]);
    expect(onSelectCandidate).toHaveBeenCalledWith(0, 0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/customizationPanel.test.tsx`
Expected: FAIL — cannot resolve `../src/components/CustomizationPanel`.

- [ ] **Step 3: Write minimal implementation and delete ResultPanel**

```tsx
// src/components/CustomizationPanel.tsx
import type { RefObject } from 'react';
import ParameterForm, { type FormState } from './ParameterForm';
import FrameStyleSwitcher from './FrameStyleSwitcher';
import NameFontSwitcher from './NameFontSwitcher';
import ExportButtons from './ExportButtons';
import WordCandidateChips from './WordCandidateChips';
import type { FrameStyle, NameFontId } from './NameFrame';
import type { WordAnalysis } from '../lib/generator';

interface CustomizationPanelProps {
  form: FormState;
  onFormChange: (next: FormState) => void;
  onGenerate: () => void;
  style: FrameStyle;
  onStyleChange: (style: FrameStyle) => void;
  nameFont: NameFontId;
  onNameFontChange: (font: NameFontId) => void;
  frameRef: RefObject<HTMLDivElement>;
  exportName: string;
  exportSurname: string;
  onReset: () => void;
  wordAnalyses?: WordAnalysis[];
  selections?: number[];
  onSelectCandidate?: (wordIndex: number, candidateIndex: number) => void;
}

export default function CustomizationPanel({
  form,
  onFormChange,
  onGenerate,
  style,
  onStyleChange,
  nameFont,
  onNameFontChange,
  frameRef,
  exportName,
  exportSurname,
  onReset,
  wordAnalyses,
  selections,
  onSelectCandidate,
}: CustomizationPanelProps) {
  const analyzeMode = !!wordAnalyses && wordAnalyses.length > 0;

  return (
    <div className="customize">
      <ParameterForm value={form} onChange={onFormChange} onGenerate={onGenerate} />

      {analyzeMode && (
        <div className="field">
          <span className="field__label">
            Pilihan arti per kata <span className="field__hint">/ Per-word meaning</span>
          </span>
          <WordCandidateChips
            words={wordAnalyses!}
            selections={selections ?? []}
            onSelect={onSelectCandidate ?? (() => {})}
          />
        </div>
      )}

      <div className="field">
        <span className="field__label">
          Gaya pigura <span className="field__hint">/ Frame style</span>
        </span>
        <FrameStyleSwitcher value={style} onChange={onStyleChange} />
      </div>

      <div className="field">
        <span className="field__label">
          Font nama <span className="field__hint">/ Name font</span>
        </span>
        <NameFontSwitcher value={nameFont} onChange={onNameFontChange} />
      </div>

      <div className="customize__actions">
        <ExportButtons targetRef={frameRef} name={exportName} surname={exportSurname} />
        {!analyzeMode && (
          <button className="btn btn--ghost btn--icon" onClick={onReset} title="Reset" aria-label="Reset">
            🗑
          </button>
        )}
      </div>
    </div>
  );
}
```

```bash
git rm src/components/ResultPanel.tsx tests/resultPanelCandidates.test.tsx
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/customizationPanel.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/CustomizationPanel.tsx tests/customizationPanel.test.tsx
git commit -m "feat: add CustomizationPanel modal body, retire ResultPanel"
```

---

### Task 5: Rewire `App.tsx` to the Deck + Modal shell

**Files:**
- Modify: `src/App.tsx` (replace the `return (...)` block at lines 202-239; add state + `frameRef`; add imports)
- Modify: `tests/app.words.test.tsx` (open the modal to reach form controls; drop counter assertions)
- Create: `tests/app.shell.test.tsx`

**Interfaces:**
- Consumes: `Deck` (Task 3), `Modal` (Task 2), `CustomizationPanel` (Task 4), `NAME_FONTS`/`FrameStyle`/`NameFontId` from `./components/NameFrame`.
- Produces: the assembled app. The ⚙ button (`aria-label="Sesuaikan · Customize"`) opens the modal; form controls live inside it; the `Deck` renders the single `NameFrame` (with `frameRef`).

- [ ] **Step 1: Update the App-level tests first (failing)**

Replace the entire contents of `tests/app.words.test.tsx` with:

```tsx
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

function setWords(count: number) {
  fireEvent.click(screen.getByRole('button', { name: String(count) }));
}

function clickGenerate() {
  fireEvent.click(screen.getByRole('button', { name: /Buat Nama/i }));
}

describe('App: word count controls how many words the name has', () => {
  it('generated names have exactly the selected number of words', () => {
    render(<App />);
    openCustomize();
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
    openCustomize();
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
    openCustomize();
    fireEvent.change(screen.getByPlaceholderText('mis. Santoso'), { target: { value: 'Lie' } });
    setWords(2);
    clickGenerate();
    expect(wordCount()).toBe(1);
    setWords(3);
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
});
```

Then create the shell test:

```tsx
// tests/app.shell.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../src/App';

describe('App shell: modal + minimal main view', () => {
  it('hides the form until the customize button is pressed', () => {
    render(<App />);
    expect(screen.queryByText(/Gaya nama/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Sesuaikan · Customize'));
    expect(screen.getByText(/Gaya nama/)).toBeInTheDocument();
  });

  it('closes the modal on Escape', () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('Sesuaikan · Customize'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('the previous arrow is disabled on first load', () => {
    render(<App />);
    expect(screen.getByLabelText('Nama sebelumnya')).toBeDisabled();
  });

  it('does not render the old header, footer, or counter', () => {
    render(<App />);
    expect(screen.queryByText('Name Generator')).not.toBeInTheDocument();
    expect(screen.queryByText(/1 \/ 1/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/app.shell.test.tsx tests/app.words.test.tsx`
Expected: FAIL — `Sesuaikan · Customize` button / dialog do not exist yet (old App still renders header + counter).

- [ ] **Step 3: Rewire App**

In `src/App.tsx`, update the import on line 3 and add new imports below it:

```tsx
// replace line 3 (`import ResultPanel ...`) with:
import Deck from './components/Deck';
import Modal from './components/Modal';
import CustomizationPanel from './components/CustomizationPanel';
import { NAME_FONTS, type FrameStyle, type NameFontId } from './components/NameFrame';
```

Add new state next to the existing `useState` calls (after line 27, the `seen` ref):

```tsx
  const [style, setStyle] = useState<FrameStyle>('elegant');
  const [nameFont, setNameFont] = useState<NameFontId>('great-vibes');
  const [modalOpen, setModalOpen] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
```

Replace the entire `return (...)` block (current lines 202-239) with:

```tsx
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
```

Note: `current`, `goNext`, `goPrev`, `reset`, `generate`, `analysis`, `selections`, `setSelections`, `cursor` already exist above. The `useState`/`useRef` imports are already present on line 1.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/app.shell.test.tsx tests/app.words.test.tsx`
Expected: PASS (4 + 5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx tests/app.words.test.tsx tests/app.shell.test.tsx
git commit -m "feat: rewire App to Deck + customization modal shell"
```

---

### Task 6: Styling — full-viewport deck, modal, no-scroll layout

**Files:**
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: class names emitted by `Deck`, `Modal`, `CustomizationPanel` (`.deck`, `.deck__stage`, `.deck__card`, `.deck__arrow`, `.deck__customize`, `.deck__error`, `.deck__notice`, `.modal-overlay`, `.modal`, `.modal__close`, `.customize`, `.customize__actions`).
- Produces: a non-scrolling full-viewport main view with the pigura centered and fitted; a centered scrollable modal.

This task has no unit test (CSS rendering is not asserted in jsdom); it ends with a build + manual verification step.

- [ ] **Step 1: Update the layout rules**

Replace the `.app` rule (current lines 34-38) with:

```css
.app {
  height: 100dvh;
  overflow: hidden;
}
```

Delete the now-unused `.app__header`, `.app__title`, `.app__subtitle`, `.layout`, its `@media (max-width: 860px)` block, `.app__footer`, and the `.result`, `.result__stage`, `.result__counter`, `.result__actions`, `.navarrow` rules (the old result chrome). Keep `.panel`, `.field*`, `input`, `select`, `.segmented`, `.slot*`, `.chips`, `.chip*`, `.btn*`, `.style-switch*`, `.notice`, `.error`, `.empty`, and `.candidates*` rules — they are reused inside the modal and Deck.

- [ ] **Step 2: Append the new Deck + Modal styles**

```css
/* ---- Deck: full-viewport, centered, no scroll ---- */
.deck {
  position: relative;
  height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  outline: none;
}

.deck__stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  max-width: 480px;
}

.deck__card {
  /* Fit within both axes: width is capped by the viewport height (frame is 4:5,
     so width = 0.8 * height) and by the viewport width. */
  width: min(480px, 92vw, calc((100dvh - 4rem) * 0.8));
  touch-action: pan-y;
  cursor: grab;
  transition: transform 0.25s ease;
  animation: card-in 0.3s ease;
}

.deck__card.is-dragging {
  transition: none;
  cursor: grabbing;
}

@keyframes card-in {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to   { opacity: 1; transform: none; }
}

.deck__customize {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink);
  font-size: 1.25rem;
  cursor: pointer;
  box-shadow: var(--shadow);
  z-index: 2;
}

.deck__arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: rgba(255, 253, 250, 0.7);
  color: var(--ink);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  box-shadow: var(--shadow);
  z-index: 2;
}

.deck__arrow--left { left: 0.5rem; }
.deck__arrow--right { right: 0.5rem; }
.deck__arrow:disabled { opacity: 0.3; cursor: not-allowed; }

.deck__error { max-width: 380px; }
.deck__error .btn { margin-top: 0.75rem; }
.deck__notice { position: absolute; bottom: 1rem; left: 50%; transform: translateX(-50%); }

/* ---- Modal ---- */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(40, 30, 18, 0.45);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 1.5rem 1rem;
  overflow-y: auto;
  z-index: 10;
}

.modal {
  position: relative;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1.5rem;
  width: 100%;
  max-width: 420px;
  margin: auto;
}

.modal__close {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: #fff;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  color: var(--ink);
}

.customize > .panel { box-shadow: none; border: none; padding: 0; }
.customize__actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

/* ---- Phones ---- */
@media (max-width: 560px) {
  .deck__arrow { width: 38px; height: 38px; font-size: 1.3rem; }
}

@media (prefers-reduced-motion: reduce) {
  .deck__card { transition: none; animation: none; }
}
```

Also remove the obsolete `@media (max-width: 560px)` rules that reference `.result__stage`, `.navarrow`, and `.result__actions` (current lines ~73-96) since those classes no longer exist.

- [ ] **Step 3: Verify the build and full suite**

Run: `npx tsc -b && npm test`
Expected: type-check clean; all test files pass.

- [ ] **Step 4: Manual visual verification**

Run: `npm run dev`, then in a browser (and the browser's device/responsive mode):
- The pigura is centered and fully visible with no page scroll (no vertical or horizontal scrollbar) on both desktop and a phone viewport (e.g. 390×844).
- The ⚙ button opens the modal; Esc / backdrop / × close it; changing style/font/parameters updates the card live behind the modal.
- On a touch device or emulated touch: dragging the card right shows a new name; dragging left returns to the previous; below-threshold drags spring back.
- Desktop ‹ / › arrows and ←/→ keys navigate; ‹ is disabled at the first name.
- In "Nama Sendiri" mode the arrows are hidden and the per-word chips appear inside the modal and update the card live.

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css
git commit -m "style: full-viewport deck and customization modal layout"
```

---

## Self-Review

**Spec coverage:**
- Main view = only pigura, no scroll → Task 3 (Deck) + Task 6 (`.app`/`.deck` `100dvh`/`overflow:hidden`, fitted card). ✓
- Swipe right=new / left=prev → Task 1 (`useSwipe`) + Task 3 (wiring to `onNext`/`onPrev`). ✓
- Desktop arrows + keyboard → Task 3. ✓
- `prefers-reduced-motion` → Task 6 (CSS). ✓
- Single button → customization modal → Task 2 (Modal) + Task 5 (⚙ wiring). ✓
- ParameterForm + style + font + export + reset in modal → Task 4 (CustomizationPanel). ✓
- Live updates behind modal → Task 5 reuses existing `filterSig` effect (unchanged). ✓
- Analyze chips move into modal; nav disabled in analyze → Task 3 (`navDisabled`) + Task 4 (chips) + Task 5 (`analyzeMode`). ✓
- Remove header/subtitle/footer/counter/visible regenerate-reset → Task 5 (new render) + Task 6 (CSS removal); asserted by `tests/app.shell.test.tsx`. ✓
- Lift `style`/`nameFont`/`modalOpen`/`frameRef` to App → Task 5. ✓
- No new deps; TS strict; bilingual copy; tests pass → Global Constraints + Task 6 Step 3. ✓
- Out of scope (no favorites, no gesture lib, no generator changes) → respected. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to". Every code step shows complete code. ✓

**Type consistency:** `FrameStyle`/`NameFontId`/`NAME_FONTS` imported from `./components/NameFrame` consistently. `frameRef: RefObject<HTMLDivElement>` consistent across App → Deck → CustomizationPanel → ExportButtons (`targetRef`). `onNext`/`onPrev`/`navDisabled`/`canPrev` names match between Deck props and App wiring. `useSwipe` `{ dx, dragging, handlers }` matches Deck usage. `WordAnalysis`/`selections`/`onSelectCandidate` signatures match the retired ResultPanel's contract preserved in CustomizationPanel. ✓
