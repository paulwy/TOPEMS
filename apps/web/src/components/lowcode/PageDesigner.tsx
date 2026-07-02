import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Breadcrumbs,
  Link,
} from '@mui/material';
import { Save, Play, Send, Trash2, Copy, ArrowLeft, Settings, Undo, Redo } from 'lucide-react';
import ComponentPalette from './ComponentPalette';
import PropertyPanel from './PropertyPanel';
import DesignCanvas from './DesignCanvas';
import PageRenderer from './PageRenderer';
import { componentApi } from '@/api/lowcode';
import type {
  PageSchema,
  ComponentSchema,
  ComponentCategory,
  ComponentDefinition,
} from '@/api/lowcode';

interface PageDesignerProps {
  pageId?: string;
  initialSchema?: PageSchema;
  onSave?: (schema: PageSchema) => void;
  onPublish?: (schema: PageSchema) => void;
  onBack?: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

const PageDesigner: React.FC<PageDesignerProps> = ({
  pageId,
  initialSchema,
  onSave,
  onPublish,
  onBack,
}) => {
  const [categories, setCategories] = useState<ComponentCategory[]>([]);
  const [schema, setSchema] = useState<PageSchema>(
    initialSchema || {
      id: pageId || generateId(),
      name: '未命名页面',
      description: '',
      version: '1.0.0',
      components: [],
      layout: {
        type: 'flex',
        gap: 16,
      },
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [history, setHistory] = useState<PageSchema[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    componentApi.getPageComponents().then(setCategories);
  }, []);

  useEffect(() => {
    if (history.length === 0) {
      setHistory([schema]);
      setHistoryIndex(0);
    }
  }, []);

  const pushHistory = useCallback(
    (newSchema: PageSchema) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newSchema);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [history, historyIndex]
  );

  const updateSchema = useCallback(
    (updater: (prev: PageSchema) => PageSchema) => {
      setSchema((prev) => {
        const newSchema = updater(prev);
        pushHistory(newSchema);
        return newSchema;
      });
    },
    [pushHistory]
  );

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setSchema(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setSchema(history[newIndex]);
    }
  };

  const selectedComponent = schema.components.find((c) => c.id === selectedId) || null;

  const selectedComponentDefinition = selectedComponent
    ? (() => {
        for (const cat of categories) {
          const comp = cat.components.find((c) => c.type === selectedComponent.type);
          if (comp) return comp;
        }
        return null;
      })()
    : null;

  const handleDrop = (index: number, componentDef: ComponentDefinition) => {
    const newComponent: ComponentSchema = {
      id: generateId(),
      type: componentDef.type,
      label: componentDef.name,
      props: { ...componentDef.defaultProps },
      children: componentDef.isContainer ? [] : undefined,
    };

    updateSchema((prev) => {
      const newComponents = [...prev.components];
      newComponents.splice(index, 0, newComponent);
      return { ...prev, components: newComponents };
    });

    setSelectedId(newComponent.id);
  };

  const handleMove = (dragIndex: number, hoverIndex: number) => {
    updateSchema((prev) => {
      const newComponents = [...prev.components];
      const [removed] = newComponents.splice(dragIndex, 1);
      newComponents.splice(hoverIndex, 0, removed);
      return { ...prev, components: newComponents };
    });
  };

  const handleDelete = (id: string) => {
    updateSchema((prev) => ({
      ...prev,
      components: prev.components.filter((c) => c.id !== id),
    }));
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  const handlePropertyChange = (path: string, value: unknown) => {
    if (!selectedId) return;

    updateSchema((prev) => {
      const newComponents = prev.components.map((comp) => {
        if (comp.id !== selectedId) return comp;

        const newComp = { ...comp };
        const keys = path.split('.');

        if (keys.length === 1) {
          (newComp as Record<string, unknown>)[keys[0]] = value;
        } else {
          const objKey = keys[0];
          const propKey = keys[1];
          (newComp as Record<string, unknown>)[objKey] = {
            ...((newComp as Record<string, unknown>)[objKey] as Record<string, unknown>),
            [propKey]: value,
          };
        }

        return newComp;
      });

      return { ...prev, components: newComponents };
    });
  };

  const renderDesignComponent = (
    component: ComponentSchema,
    isSelected: boolean
  ): React.ReactNode => {
    switch (component.type) {
      case 'container':
      case 'card':
      case 'table':
      case 'chart':
      case 'list':
      case 'form':
      case 'button-group':
      case 'image':
      case 'text':
      case 'tabs':
        return (
          <Box sx={{ p: 1 }}>
            <PageRenderer
              schema={{
                ...schema,
                components: [component],
              }}
            />
          </Box>
        );

      default:
        return (
          <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {component.label || component.type}
            </Typography>
          </Box>
        );
    }
  };

  const handleSave = () => {
    onSave?.(schema);
  };

  const handlePublish = () => {
    onPublish?.(schema);
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position='static'
        color='default'
        elevation={1}
      >
        <Toolbar variant='dense'>
          {onBack && (
            <IconButton
              edge='start'
              onClick={onBack}
              sx={{ mr: 1 }}
            >
              <ArrowLeft size={20} />
            </IconButton>
          )}
          <Breadcrumbs separator='>'>
            <Link
              color='inherit'
              underline='hover'
              href='#'
            >
              低代码平台
            </Link>
            <Typography color='text.primary'>页面设计器</Typography>
          </Breadcrumbs>
          <Box sx={{ flex: 1 }} />
          <Tooltip title='撤销'>
            <span>
              <IconButton
                onClick={handleUndo}
                disabled={historyIndex <= 0}
              >
                <Undo size={20} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title='重做'>
            <span>
              <IconButton
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
              >
                <Redo size={20} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title='预览'>
            <IconButton onClick={() => setShowPreview(true)}>
              <Play size={20} />
            </IconButton>
          </Tooltip>
          <Tooltip title='保存'>
            <IconButton
              onClick={handleSave}
              color='primary'
            >
              <Save size={20} />
            </IconButton>
          </Tooltip>
          <Button
            variant='contained'
            size='small'
            startIcon={<Send size={16} />}
            onClick={handlePublish}
            sx={{ ml: 1 }}
          >
            发布
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <ComponentPalette categories={categories} />

        <DesignCanvas
          components={schema.components}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDrop={handleDrop}
          onMove={handleMove}
          onDelete={handleDelete}
          renderComponent={renderDesignComponent}
          emptyText='拖拽页面组件到此处开始设计'
        />

        <PropertyPanel
          selectedComponent={selectedComponent}
          componentDefinition={selectedComponentDefinition}
          onPropertyChange={handlePropertyChange}
        />
      </Box>

      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>页面预览</DialogTitle>
        <DialogContent
          dividers
          sx={{ p: 3 }}
        >
          <PageRenderer schema={schema} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PageDesigner;
