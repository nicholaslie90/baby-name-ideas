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
  console.log('drag: pointerDown at', from);
  fireEvent.pointerDown(el, { clientX: from, pointerId: 1 });
  console.log('drag: pointerMove to', to);
  fireEvent.pointerMove(el, { clientX: to, pointerId: 1 });
  console.log('drag: pointerUp at', to);
  fireEvent.pointerUp(el, { clientX: to, pointerId: 1 });
  console.log('drag: done');
}

describe('useSwipe', () => {
  it('fires onSwipeRight when dragged right past the threshold', () => {
    const onSwipeRight = vi.fn();
    const onSwipeLeft = vi.fn();
    render(<Harness onSwipeRight={onSwipeRight} onSwipeLeft={onSwipeLeft} threshold={50} />);
    drag(0, 120);
    console.log('onSwipeRight.mock.calls:', onSwipeRight.mock.calls);
    expect(onSwipeRight).toHaveBeenCalledTimes(1);
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });
});
