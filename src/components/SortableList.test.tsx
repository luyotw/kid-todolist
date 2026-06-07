import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SortableList from './SortableList';

describe('SortableList', () => {
  it('calls onReorder when dropping on another row handle target', () => {
    const onReorder = vi.fn();
    render(
      <SortableList
        items={[
          { key: 'a', label: 'A' },
          { key: 'b', label: 'B' },
        ]}
        onReorder={onReorder}
        renderItem={(item) => <span>{item.label}</span>}
      />,
    );

    const handles = screen.getAllByRole('button', { name: /拖曳調整順序/ });
    fireEvent.dragStart(handles[0]!, {
      dataTransfer: { setData: vi.fn(), effectAllowed: 'move' },
    });
    fireEvent.drop(screen.getByText('B').closest('li')!, {
      dataTransfer: { getData: () => 'a' },
    });

    expect(onReorder).toHaveBeenCalledWith(['b', 'a']);
  });

  it('only exposes draggable on the handle button', () => {
    render(
      <SortableList
        items={[{ key: 'a', label: 'A' }]}
        onReorder={vi.fn()}
        renderItem={(item) => <span>{item.label}</span>}
      />,
    );
    expect(screen.getByRole('button', { name: /拖曳調整順序：A/ })).toHaveAttribute(
      'draggable',
      'true',
    );
    expect(screen.getByText('A').closest('span')).not.toHaveAttribute('draggable');
  });
});
