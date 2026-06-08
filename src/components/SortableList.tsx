import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export interface SortableListItem {
  key: string;
  label: string;
}

interface SortableListProps {
  items: SortableListItem[];
  onReorder: (orderedKeys: string[]) => void;
  renderItem: (item: SortableListItem) => ReactNode;
  listClassName?: string;
  itemClassName?: string;
}

const LONG_PRESS_MS = 450;

function reorderKeys(keys: string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0) return keys;
  const next = [...keys];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

function hoverIndexFromPointer(
  clientY: number,
  listTop: number,
  rowHeight: number,
  count: number,
): number {
  if (rowHeight <= 0 || count === 0) return 0;
  const raw = Math.floor((clientY - listTop + rowHeight / 2) / rowHeight);
  return Math.max(0, Math.min(count - 1, raw));
}

export default function SortableList({
  items,
  onReorder,
  renderItem,
  listClassName = 'sortable-list',
  itemClassName = 'sortable-list__item',
}: SortableListProps) {
  const keys = items.map((i) => i.key);
  const itemByKey = new Map(items.map((i) => [i.key, i]));

  const listRef = useRef<HTMLUListElement>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<{
    key: string;
    pointerId: number;
    fromIndex: number;
    offsetX: number;
    offsetY: number;
    rowWidth: number;
    rowHeight: number;
    listTop: number;
  } | null>(null);

  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const hoverIndexRef = useRef<number | null>(null);
  const [floatPos, setFloatPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const updateHoverIndex = useCallback((index: number) => {
    hoverIndexRef.current = index;
    setHoverIndex(index);
  }, []);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const finishDrag = useCallback(
    (commit: boolean) => {
      clearLongPress();
      const drag = dragRef.current;
      if (commit && drag && hoverIndexRef.current !== null) {
        const next = reorderKeys(keys, drag.fromIndex, hoverIndexRef.current);
        if (next.join(',') !== keys.join(',')) {
          onReorder(next);
        }
      }
      dragRef.current = null;
      setDraggingKey(null);
      hoverIndexRef.current = null;
      setHoverIndex(null);
      setFloatPos(null);
    },
    [clearLongPress, keys, onReorder],
  );

  const startDrag = useCallback(
    (key: string, pointerId: number, clientX: number, clientY: number) => {
      const row = rowRefs.current.get(key);
      if (!row) return;
      const rect = row.getBoundingClientRect();
      const fromIndex = keys.indexOf(key);
      if (fromIndex < 0) return;
      const listTop = listRef.current?.getBoundingClientRect().top ?? rect.top;
      const nextKey = keys[fromIndex + 1];
      const nextRow = nextKey ? rowRefs.current.get(nextKey) : null;
      const rowHeight = nextRow
        ? nextRow.getBoundingClientRect().top - rect.top
        : rect.height;

      dragRef.current = {
        key,
        pointerId,
        fromIndex,
        offsetX: clientX - rect.left,
        offsetY: clientY - rect.top,
        rowWidth: rect.width,
        rowHeight: rowHeight > 0 ? rowHeight : rect.height,
        listTop,
      };
      setDraggingKey(key);
      updateHoverIndex(fromIndex);
      setFloatPos({ x: rect.left, y: rect.top });
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(20);
      }
    },
    [keys, updateHoverIndex],
  );

  useEffect(() => {
    if (!draggingKey) return;

    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      setFloatPos({
        x: e.clientX - drag.offsetX,
        y: e.clientY - drag.offsetY,
      });
      updateHoverIndex(
        hoverIndexFromPointer(
          e.clientY,
          drag.listTop,
          drag.rowHeight,
          keys.length,
        ),
      );
    };

    const onPointerUp = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      finishDrag(true);
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
    };
  }, [draggingKey, finishDrag, keys, updateHoverIndex]);

  useEffect(() => () => clearLongPress(), [clearLongPress]);

  const previewKeys =
    draggingKey !== null && hoverIndex !== null
      ? reorderKeys(keys, keys.indexOf(draggingKey), hoverIndex)
      : keys;

  const draggedItem = draggingKey ? itemByKey.get(draggingKey) : null;

  return (
    <>
      <ul ref={listRef} className={listClassName}>
        {previewKeys.map((key) => {
          const item = itemByKey.get(key);
          if (!item) return null;
          const isDragging = draggingKey === key;
          return (
            <li
              key={key}
              ref={(el) => {
                if (el) rowRefs.current.set(key, el);
                else rowRefs.current.delete(key);
              }}
              className={`${itemClassName}${isDragging ? ' sortable-list__item--placeholder' : ''}`}
              aria-hidden={isDragging ? true : undefined}
            >
              {!isDragging && (
                <>
                  <button
                    type="button"
                    className="sortable-list__handle"
                    aria-label={`長按並拖曳調整順序：${item.label}`}
                    onPointerDown={(e) => {
                      if (e.button > 0) return;
                      clearLongPress();
                      longPressTimer.current = setTimeout(() => {
                        longPressTimer.current = null;
                        startDrag(key, e.pointerId, e.clientX, e.clientY);
                      }, LONG_PRESS_MS);
                    }}
                    onPointerUp={clearLongPress}
                    onPointerCancel={clearLongPress}
                    onPointerLeave={clearLongPress}
                  >
                    ⋮⋮
                  </button>
                  {renderItem(item)}
                </>
              )}
            </li>
          );
        })}
      </ul>

      {draggedItem && floatPos && (
        <div
          className={`${itemClassName} sortable-list__float`}
          style={{
            left: floatPos.x,
            top: floatPos.y,
            width: dragRef.current?.rowWidth,
          }}
          aria-hidden
        >
          <span className="sortable-list__handle" aria-hidden>
            ⋮⋮
          </span>
          {renderItem(draggedItem)}
        </div>
      )}
    </>
  );
}
