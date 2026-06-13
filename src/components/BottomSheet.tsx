import type { ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
}

export default function BottomSheet({
  open,
  onClose,
  ariaLabel,
  children,
}: BottomSheetProps) {
  if (!open) return null;

  return (
    <div
      className="bottom-sheet-backdrop"
      data-testid="bottom-sheet-backdrop"
      onClick={onClose}
    >
      <div
        className="bottom-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="bottom-sheet-panel__close"
          aria-label="關閉"
          onClick={onClose}
        >
          關閉
        </button>
        {children}
      </div>
    </div>
  );
}
