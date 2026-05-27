import React, { useState, useRef, useCallback } from 'react';

export interface DraggableItemProps {
  id: string;
  index: number;
  children: React.ReactNode;
  onDragStart: (index: number) => void;
  onDragEnd: () => void;
}

export const DraggableItem: React.FC<DraggableItemProps> = ({
  id,
  index,
  children,
  onDragStart,
  onDragEnd,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    setIsDragging(true);
    onDragStart(index);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`cursor-move transition-all duration-200 ${
        isDragging ? 'opacity-50 scale-105' : 'hover:shadow-md'
      }`}
    >
      {children}
    </div>
  );
};

export interface DragDropListProps<T> {
  items: T[];
  itemKey: keyof T;
  renderItem: (item: T, index: number, isDragging: boolean, dragOverIndex: number) => React.ReactNode;
  onReorder: (items: T[]) => void;
}

export const DragDropList = <T extends Record<string, any>>({
  items,
  itemKey,
  renderItem,
  onReorder,
}: DragDropListProps<T>) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedItem);
    onReorder(newItems);

    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [items, draggedIndex, onReorder]);

  return (
    <div ref={listRef} className="space-y-2">
      {items.map((item, index) => (
        <div
          key={item[itemKey]}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          className={`relative transition-all duration-200 ${
            dragOverIndex === index && draggedIndex !== index
              ? 'ring-2 ring-primary-500 ring-offset-2'
              : ''
          }`}
        >
          <DraggableItem
            id={String(item[itemKey])}
            index={index}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {renderItem(item, index, draggedIndex === index, dragOverIndex === index)}
          </DraggableItem>
        </div>
      ))}
    </div>
  );
};

export interface SortableItemProps {
  children: React.ReactNode;
  isDragging?: boolean;
}

export const SortableItem: React.FC<SortableItemProps> = ({ children, isDragging }) => (
  <div
    className={`bg-white rounded-lg border border-gray-200 p-4 transition-all duration-200 ${
      isDragging
        ? 'shadow-lg scale-105 opacity-80'
        : 'hover:shadow-md hover:border-gray-300'
    }`}
  >
    {children}
  </div>
);

export default DragDropList;
