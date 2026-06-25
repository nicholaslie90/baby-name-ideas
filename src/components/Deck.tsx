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
  // Flick the card AWAY to the left to advance (= next, like the right arrow);
  // flick it right to go back (= previous). This inverts the drag direction
  // relative to the arrow buttons, matching a Tinder-style "throw away" feel.
  const { dx, dragging, handlers } = useSwipe({
    onSwipeLeft: onNext,
    onSwipeRight: () => {
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
    <div className="deck" tabIndex={0} onKeyDown={onKeyDown} role="group" aria-label="Kartu nama · Name card">
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
            {error.message && (
              <div>
                <div>{error.message.id}</div>
                <br />
                <div>{error.message.en}</div>
              </div>
            )}
            {!error.message && error.slotIndex >= 0 && (
              <div>
                Tidak ada kandidat untuk <strong>kata {error.slotIndex + 1}</strong>. Longgarkan
                awalan atau etimologinya.
                <br />
                No candidates for word {error.slotIndex + 1} — relax its initial letter or etymology.
              </div>
            )}
            {!error.message && error.slotIndex < 0 && (
              <div>
                Tidak ada nama umum yang cocok. Longgarkan awalan atau etimologinya.
                <br />
                No matching common name — relax the initial letter or etymology.
              </div>
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
