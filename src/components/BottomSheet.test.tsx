import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BottomSheet from './BottomSheet';

describe('BottomSheet', () => {
  it('does not render a dialog when closed', () => {
    render(
      <BottomSheet open={false} onClose={vi.fn()} ariaLabel="管理任務">
        <p>內容</p>
      </BottomSheet>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders an accessible dialog when open', () => {
    render(
      <BottomSheet open onClose={vi.fn()} ariaLabel="管理任務">
        <p>內容</p>
      </BottomSheet>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', '管理任務');
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} ariaLabel="管理任務">
        <p>內容</p>
      </BottomSheet>,
    );
    fireEvent.click(screen.getByTestId('bottom-sheet-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} ariaLabel="管理任務">
        <p>內容</p>
      </BottomSheet>,
    );
    fireEvent.click(screen.getByRole('button', { name: '關閉' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders children inside the sheet', () => {
    render(
      <BottomSheet open onClose={vi.fn()} ariaLabel="管理任務">
        <p>sheet 內容</p>
      </BottomSheet>,
    );
    expect(screen.getByText('sheet 內容')).toBeInTheDocument();
  });
});
