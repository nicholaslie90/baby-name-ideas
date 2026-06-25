// tests/useSwipe.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
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
  act(() => {
    const el = screen.getByTestId('card');

    // Create and dispatch pointerdown
    const downEvent = new Event('pointerdown', { bubbles: true, cancelable: true });
    Object.defineProperty(downEvent, 'clientX', { value: from, configurable: true });
    Object.defineProperty(downEvent, 'pointerId', { value: 1, configurable: true });
    el.dispatchEvent(downEvent);

    // Create and dispatch pointermove
    const moveEvent = new Event('pointermove', { bubbles: true, cancelable: true });
    Object.defineProperty(moveEvent, 'clientX', { value: to, configurable: true });
    Object.defineProperty(moveEvent, 'pointerId', { value: 1, configurable: true });
    el.dispatchEvent(moveEvent);

    // Create and dispatch pointerup
    const upEvent = new Event('pointerup', { bubbles: true, cancelable: true });
    Object.defineProperty(upEvent, 'clientX', { value: to, configurable: true });
    Object.defineProperty(upEvent, 'pointerId', { value: 1, configurable: true });
    el.dispatchEvent(upEvent);
  });
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
    act(() => {
      const el = screen.getByTestId('card');
      const downEvent = new Event('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(downEvent, 'clientX', { value: 0, configurable: true });
      Object.defineProperty(downEvent, 'pointerId', { value: 1, configurable: true });
      el.dispatchEvent(downEvent);

      const moveEvent = new Event('pointermove', { bubbles: true, cancelable: true });
      Object.defineProperty(moveEvent, 'clientX', { value: 200, configurable: true });
      Object.defineProperty(moveEvent, 'pointerId', { value: 1, configurable: true });
      el.dispatchEvent(moveEvent);

      const cancelEvent = new Event('pointercancel', { bubbles: true, cancelable: true });
      Object.defineProperty(cancelEvent, 'clientX', { value: 200, configurable: true });
      Object.defineProperty(cancelEvent, 'pointerId', { value: 1, configurable: true });
      el.dispatchEvent(cancelEvent);
    });
    expect(onSwipeRight).not.toHaveBeenCalled();
  });
});
