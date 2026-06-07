import { useState, type ReactNode } from 'react';

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

export default function SortableList({
  items,
  onReorder,
  renderItem,
  listClassName = 'sortable-list',
  itemClassName = 'sortable-list__item',
}: SortableListProps) {
  const [draggingKey, setDraggingKey] = useState<string | null>(null);

  const reorder = (fromKey: string, toKey: string) => {
    if (fromKey === toKey) return;
    const keys = items.map((i) => i.key);
    const from = keys.indexOf(fromKey);
    const to = keys.indexOf(toKey);
    if (from < 0 || to < 0) return;
    const next = [...keys];
    next.splice(from, 1);
    next.splice(to, 0, fromKey);
    onReorder(next);
  };

  return (
    <ul className={listClassName}>
      {items.map((item) => (
        <li
          key={item.key}
          className={`${itemClassName}${draggingKey === item.key ? ' sortable-list__item--dragging' : ''}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const fromKey = e.dataTransfer.getData('text/plain');
            if (fromKey) reorder(fromKey, item.key);
            setDraggingKey(null);
          }}
        >
          <button
            type="button"
            className="sortable-list__handle"
            draggable
            aria-label={`拖曳調整順序：${item.label}`}
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', item.key);
              e.dataTransfer.effectAllowed = 'move';
              setDraggingKey(item.key);
            }}
            onDragEnd={() => setDraggingKey(null)}
          >
            ⋮⋮
          </button>
          {renderItem(item)}
        </li>
      ))}
    </ul>
  );
}
