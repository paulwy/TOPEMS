import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { Plus } from 'lucide-react';
import type { ComponentSchema, ComponentDefinition } from '@/api/lowcode';

interface DesignCanvasProps {
  components: ComponentSchema[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDrop: (index: number, component: ComponentDefinition) => void;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onDelete: (id: string) => void;
  renderComponent: (component: ComponentSchema, isSelected: boolean) => React.ReactNode;
  emptyText?: string;
}

const DesignCanvas: React.FC<DesignCanvasProps> = ({
  components,
  selectedId,
  onSelect,
  onDrop,
  onMove,
  onDelete,
  renderComponent,
  emptyText = '拖拽组件到此处',
}) => {
  const theme = useTheme();
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    const componentData = e.dataTransfer.getData('component');
    if (componentData) {
      try {
        const component = JSON.parse(componentData) as ComponentDefinition;
        onDrop(index, component);
      } catch {
        // ignore parse errors
      }
    }

    const existingComponentId = e.dataTransfer.getData('componentId');
    if (existingComponentId && draggingId) {
      const dragIndex = components.findIndex((c) => c.id === draggingId);
      if (dragIndex !== -1 && dragIndex !== index) {
        onMove(dragIndex, index);
      }
    }

    setDraggingId(null);
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (components.length === 0) {
      setDragOverIndex(0);
    }
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (components.length === 0) {
      const componentData = e.dataTransfer.getData('component');
      if (componentData) {
        try {
          const component = JSON.parse(componentData) as ComponentDefinition;
          onDrop(0, component);
        } catch {
          // ignore
        }
      }
    }
    setDragOverIndex(null);
  };

  const handleComponentDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('componentId', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(id);
  };

  const handleComponentDragEnd = () => {
    setDraggingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onDelete(id);
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        height: '100%',
        overflow: 'auto',
        bgcolor: 'grey.50',
        p: 3,
      }}
      onDragOver={handleCanvasDragOver}
      onDrop={handleCanvasDrop}
      onClick={() => onSelect(null)}
    >
      <Box
        sx={{
          maxWidth: 900,
          mx: 'auto',
          minHeight: 500,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: theme.shadows[2],
          p: 3,
          border: dragOverIndex === 0 && components.length === 0 ? '2px dashed' : 'none',
          borderColor: 'primary.main',
          transition: 'all 0.2s',
        }}
      >
        {components.length === 0 ? (
          <Box
            sx={{
              minHeight: 400,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
              gap: 2,
            }}
          >
            <Plus size={48} strokeWidth={1} />
            <Typography variant="body1">{emptyText}</Typography>
            <Typography variant="body2" color="text.secondary">
              从左侧组件库拖拽组件到这里
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {components.map((component, index) => {
              const isSelected = selectedId === component.id;
              const isDragOver = dragOverIndex === index && draggingId !== component.id;
              const isDragging = draggingId === component.id;

              return (
                <React.Fragment key={component.id}>
                  {isDragOver && (
                    <Box
                      sx={{
                        height: 4,
                        bgcolor: 'primary.main',
                        borderRadius: 2,
                        my: -1,
                        zIndex: 1,
                      }}
                    />
                  )}
                  <Box
                    draggable
                    onDragStart={(e) => handleComponentDragStart(e, component.id)}
                    onDragEnd={handleComponentDragEnd}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(component.id);
                    }}
                    onKeyDown={(e) => handleKeyDown(e, component.id)}
                    tabIndex={0}
                    sx={{
                      position: 'relative',
                      opacity: isDragging ? 0.5 : 1,
                      cursor: 'move',
                      outline: isSelected ? `2px solid ${theme.palette.primary.main}` : 'none',
                      outlineOffset: 2,
                      borderRadius: 1,
                      transition: 'all 0.15s',
                      '&:hover': {
                        outline: isSelected
                          ? `2px solid ${theme.palette.primary.main}`
                          : `1px solid ${theme.palette.primary.light}`,
                        outlineOffset: 2,
                      },
                    }}
                  >
                    {renderComponent(component, isSelected)}
                  </Box>
                </React.Fragment>
              );
            })}
            {dragOverIndex === components.length && (
              <Box
                sx={{
                  height: 4,
                  bgcolor: 'primary.main',
                  borderRadius: 2,
                }}
              />
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DesignCanvas;
