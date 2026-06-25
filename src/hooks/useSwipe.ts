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
