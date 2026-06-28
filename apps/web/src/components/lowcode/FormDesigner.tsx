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
  useTheme,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  Save,
  Play,
  Send,
  Trash2,
  Copy,
  ArrowLeft,
  Settings,
  Undo,
  Redo,
} from 'lucide-react';
import ComponentPalette from './ComponentPalette';
import PropertyPanel from './PropertyPanel';
import DesignCanvas from './DesignCanvas';
import FormRenderer from './FormRenderer';
import { componentApi } from '@/api/lowcode';
import type {
  FormSchema,
  ComponentSchema,
  ComponentCategory,
  ComponentDefinition,
} from '@/api/lowcode';

interface FormDesignerProps {
  formId?: string;
  initialSchema?: FormSchema;
  onSave?: (schema: FormSchema) => void;
  onPublish?: (schema: FormSchema) => void;
  onBack?: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

const FormDesigner: React.FC<FormDesignerProps> = ({
  formId,
  initialSchema,
  onSave,
  onPublish,
  onBack,
}) => {
  const theme = useTheme();
  const [categories, setCategories] = useState<ComponentCategory[]>([]);
  const [schema, setSchema] = useState<FormSchema>(
    initialSchema || {
      id: formId || generateId(),
      name: '未命名表单',
      description: '',
      version: '1.0.0',
      components: [],
      layout: 'vertical',
      labelWidth: 100,
      size: 'medium',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [history, setHistory] = useState<FormSchema[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    componentApi.getFormComponents().then(setCategories);
  }, []);

  useEffect(() => {
    if (history.length === 0 && schema.components.length >= 0) {
      setHistory([schema]);
      setHistoryIndex(0);
    }
  }, []);

  const pushHistory = useCallback(
    (newSchema: FormSchema) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newSchema);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [history, historyIndex]
  );

  const updateSchema = useCallback(
    (updater: (prev: FormSchema) => FormSchema) => {
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
      name: `${componentDef.type}_${Date.now()}`,
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

  const renderDesignComponent = (component: ComponentSchema, isSelected: boolean): React.ReactNode => {
    const placeholderStyle: React.CSSProperties = isSelected
      ? {}
      : { opacity: 0.9 };

    switch (component.type) {
      case 'input':
      case 'password':
      case 'textarea':
      case 'number':
      case 'select':
      case 'radio':
      case 'checkbox':
      case 'switch':
      case 'date-picker':
      case 'time-picker':
      case 'rating':
      case 'image-upload':
      case 'rich-text':
      case 'button':
      case 'divider':
        return (
          <Box sx={{ p: 1, ...placeholderStyle }}>
            <FormRenderer
              schema={{ ...schema, components: [component] }}
              readOnly
            />
          </Box>
        );

      case 'grid':
        return (
          <Box
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              p: 1,
              minHeight: 80,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              栅格布局 ({(component.props?.columns as number) || 2}列)
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: `repeat(${component.props?.columns || 2}, 1fr)`,
                gap: 1,
              }}
            >
              {component.children?.length ? (
                component.children.map((child, idx) => (
                  <Box key={idx} sx={{ border: '1px dashed', borderColor: 'divider', p: 1, borderRadius: 0.5 }}>
                    {renderDesignComponent(child, false)}
                  </Box>
                ))
              ) : (
                Array.from({ length: component.props?.columns as number || 2 }).map((_, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      border: '1px dashed',
                      borderColor: 'grey.300',
                      height: 60,
                      borderRadius: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="caption" color="text.disabled">
                      放置组件
                    </Typography>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        );

      case 'tabs':
        return (
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: 'grey.100', p: 1, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary">
                标签页
              </Typography>
            </Box>
            <Box sx={{ p: 2, minHeight: 80 }}>
              <Typography variant="body2" color="text.secondary">
                标签页组件
              </Typography>
            </Box>
          </Box>
        );

      case 'group':
        return (
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {component.props?.title as string}
            </Typography>
            <Box sx={{ minHeight: 40 }}>
              {component.children?.length ? (
                component.children.map((child, idx) => (
                  <React.Fragment key={idx}>
                    {renderDesignComponent(child, false)}
                  </React.Fragment>
                ))
              ) : (
                <Typography variant="caption" color="text.disabled">
                  放置子组件
                </Typography>
              )}
            </Box>
          </Box>
        );

      default:
        return (
          <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
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
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense">
          {onBack && (
            <IconButton edge="start" onClick={onBack} sx={{ mr: 1 }}>
              <ArrowLeft size={20} />
            </IconButton>
          )}
          <Breadcrumbs separator=">">
            <Link color="inherit" underline="hover" href="#">
              低代码平台
            </Link>
            <Typography color="text.primary">表单设计器</Typography>
          </Breadcrumbs>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="撤销">
            <span>
              <IconButton onClick={handleUndo} disabled={historyIndex <= 0}>
                <Undo size={20} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="重做">
            <span>
              <IconButton onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
                <Redo size={20} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="预览">
            <IconButton onClick={() => setShowPreview(true)}>
              <Play size={20} />
            </IconButton>
          </Tooltip>
          <Tooltip title="保存">
            <IconButton onClick={handleSave} color="primary">
              <Save size={20} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            size="small"
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
          emptyText="拖拽表单组件到此处开始设计"
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
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>表单预览</DialogTitle>
        <DialogContent dividers>
          <FormRenderer schema={schema} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FormDesigner;
