import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SortableList from './SortableList';

function pointerEvent(
  type: string,
  init: EventInit & {
    button?: number;
    pointerId: number;
    clientX: number;
    clientY: number;
  },
): Event {
  const event = new Event(type, { bubbles: true, ...init });
  for (const [key, value] of Object.entries({
    button: init.button ?? 0,
    pointerId: init.pointerId,
    clientX: init.clientX,
    clientY: init.clientY,
  })) {
    Object.defineProperty(event, key, { value });
  }
  return event;
}

function mockSortableLayout() {
  const rowHeight = 56;
  const listTop = 100;
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      const base = {
        x: 0,
        left: 0,
        right: 300,
        width: 300,
        bottom: 0,
        height: 0,
        top: 0,
        y: 0,
        toJSON: () => ({}),
      };
      if (this.tagName === 'UL') {
        return { ...base, top: listTop, height: rowHeight * 2 };
      }
      if (this.tagName === 'LI') {
        const index = Array.from(this.parentElement?.children ?? []).indexOf(
          this,
        );
        const top = listTop + index * rowHeight;
        return { ...base, top, height: rowHeight, bottom: top + rowHeight };
      }
      return { ...base, top: listTop, height: rowHeight };
    },
  );
}

describe('SortableList', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSortableLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('calls onReorder after long-press drag and drop', async () => {
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

    const handle = screen.getByRole('button', { name: /長按並拖曳調整順序：A/ });
    fireEvent(
      handle,
      pointerEvent('pointerdown', {
        button: 0,
        pointerId: 1,
        clientX: 10,
        clientY: 110,
      }),
    );
    await act(async () => {
      vi.runAllTimers();
    });

    await act(async () => {
      document.dispatchEvent(
        pointerEvent('pointermove', {
          pointerId: 1,
          clientX: 10,
          clientY: 200,
        }),
      );
    });
    await act(async () => {
      document.dispatchEvent(
        pointerEvent('pointerup', {
          pointerId: 1,
          clientX: 10,
          clientY: 200,
        }),
      );
    });

    expect(onReorder).toHaveBeenCalledWith(['b', 'a']);
  });

  it('does not reorder on short tap without long press', () => {
    const onReorder = vi.fn();
    render(
      <SortableList
        items={[{ key: 'a', label: 'A' }]}
        onReorder={onReorder}
        renderItem={(item) => <span>{item.label}</span>}
      />,
    );

    const handle = screen.getByRole('button', { name: /長按並拖曳調整順序：A/ });
    fireEvent(
      handle,
      pointerEvent('pointerdown', {
        button: 0,
        pointerId: 1,
        clientX: 10,
        clientY: 110,
      }),
    );
    fireEvent(
      handle,
      pointerEvent('pointerup', {
        pointerId: 1,
        clientX: 10,
        clientY: 110,
      }),
    );
    vi.advanceTimersByTime(500);

    expect(onReorder).not.toHaveBeenCalled();
  });

  it('does not use HTML draggable on the handle', () => {
    render(
      <SortableList
        items={[{ key: 'a', label: 'A' }]}
        onReorder={vi.fn()}
        renderItem={(item) => <span>{item.label}</span>}
      />,
    );
    expect(
      screen.getByRole('button', { name: /長按並拖曳調整順序：A/ }),
    ).not.toHaveAttribute('draggable');
  });
});
