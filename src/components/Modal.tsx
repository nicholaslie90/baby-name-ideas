import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Focus the dialog only when it OPENS, and restore focus when it closes.
  // Keyed on `open` alone so ordinary re-renders (e.g. the parent passing a
  // fresh onClose on every keystroke) don't re-run this and steal focus from
  // an input the user is typing in.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => {
      previouslyFocused?.focus?.();
    };
  }, [open]);

  // Close on Escape while open. Separate effect so re-binding the listener
  // (when onClose changes) never triggers the focus side-effect above.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
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
