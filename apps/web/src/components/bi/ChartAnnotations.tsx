import { useState } from 'react';
import { Flag, MessageSquare, Tag, Plus, X, Edit3, Check } from 'lucide-react';
import { TextField, Chip, Paper, Button, useTheme } from '@mui/material';
import { designTokens, semanticTokens } from '@topems/tokens';
import i18n from '@/i18n';
import { alpha } from '@mui/material/styles';

interface Annotation {
  id: string;
  type: 'flag' | 'note' | 'tag';
  position: { x: number; y: number };
  content: string;
  color: string;
}

interface ChartAnnotationsProps {
  annotations: Annotation[];
  onAddAnnotation: (_annotation: Omit<Annotation, 'id'>) => void;
  onUpdateAnnotation: (_id: string, _updates: Partial<Annotation>) => void;
  onDeleteAnnotation: (_id: string) => void;
  enabled?: boolean;
}

const annotationTypes = [
  {
    id: 'flag',
    label: i18n.t('components.chart_annotations.k0'),
    icon: Flag,
    colors: ['error.main', 'warning.main', 'success.main'],
  },
  {
    id: 'note',
    label: i18n.t('components.chart_annotations.k1'),
    icon: MessageSquare,
    colors: ['primary.main', 'secondary.main', 'colors.cyan.500'],
  },
  {
    id: 'tag',
    label: i18n.t('components.chart_annotations.k2'),
    icon: Tag,
    colors: [
      designTokens.colors.pink.main,
      'colors.teal.500',
      'var(--color-fallback-ant-green)',
    ],
  },
];

export function ChartAnnotations({
  annotations,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  enabled = true,
}: ChartAnnotationsProps) {
  const theme = useTheme();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [selectedType, setSelectedType] = useState<'flag' | 'note' | 'tag'>('flag');
  const [selectedColor, setSelectedColor] = useState('error.main');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const handleAddAnnotation = () => {
    if (!content.trim()) return;

    onAddAnnotation({
      type: selectedType,
      position: { x: 50, y: 50 },
      content: content.trim(),
      color: selectedColor,
    });

    setContent('');
    setShowAddMenu(false);
  };

  const handleStartEdit = (annotation: Annotation) => {
    setEditingId(annotation.id);
    setEditingContent(annotation.content);
  };

  const handleSaveEdit = () => {
    if (editingId && editingContent.trim()) {
      onUpdateAnnotation(editingId, { content: editingContent.trim() });
    }
    setEditingId(null);
    setEditingContent('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingContent('');
  };

  if (!enabled) return null;

  return (
    <div style={{ position: 'relative' }}>
      <Button
        variant='text'
        size='small'
        onClick={() => setShowAddMenu(!showAddMenu)}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 10,
          backgroundColor: 'common.white',
          '&:hover': { backgroundColor: 'common.white' },
          borderRadius: 1,
          boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.1)}`,
        }}
        title={i18n.t('components.chart_annotations.k3')}
      >
        <Plus sx={{ width: 16, height: 16, color: 'text.secondary' }} />
      </Button>

      {showAddMenu && (
        <Paper
          sx={{
            position: 'absolute',
            top: 40,
            right: 8,
            zIndex: 20,
            padding: 2,
            width: 256,
            boxShadow: 3,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: theme.palette.text.secondary,
              marginBottom: 8,
            }}
          >
            {i18n.t('components.chart_annotations.k0')}
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: theme.palette.text.disabled, marginBottom: 4 }}>
              {i18n.t('components.chart_annotations.k1')}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {annotationTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => {
                      setSelectedType(type.id as 'flag' | 'note' | 'tag');
                      setSelectedColor(type.colors[0]);
                    }}
                    style={{
                      padding: 8,
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: selectedType === type.id ? 'primary.100' : 'transparent',
                      color:
                        selectedType === type.id ? 'primary.700' : theme.palette.text.secondary,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedType !== type.id)
                        e.currentTarget.style.backgroundColor = 'colors.grey.100';
                    }}
                    onMouseLeave={(e) => {
                      if (selectedType !== type.id)
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    title={type.label}
                  >
                    <Icon style={{ width: 16, height: 16 }} />
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: theme.palette.text.disabled, marginBottom: 4 }}>
              {i18n.t('components.chart_annotations.k2')}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {annotationTypes
                .find((t) => t.id === selectedType)
                ?.colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: color,
                      cursor: 'pointer',
                      transform: selectedColor === color ? 'scale(1.25)' : 'scale(1)',
                      boxShadow: selectedColor === color ? '0 0 0 2px ${alpha(theme.palette.common.black, 0.1)}' : 'none',
                      transition: 'transform 0.2s',
                    }}
                  />
                ))}
            </div>
          </div>

          <TextField
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={i18n.t('components.chart_annotations.k3')}
            size='small'
            fullWidth
            sx={{ marginBottom: 8 }}
            onKeyPress={(e) => e.key === 'Enter' && handleAddAnnotation()}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant='outlined'
              size='small'
              fullWidth
              onClick={() => setShowAddMenu(false)}
            >
              {i18n.t('components.chart_annotations.k4')}
            </Button>
            <Button
              size='small'
              fullWidth
              onClick={handleAddAnnotation}
            >
              {i18n.t('components.chart_annotations.k5')}
            </Button>
          </div>
        </Paper>
      )}

      {annotations.map((annotation) => {
        const typeInfo = annotationTypes.find((t) => t.id === annotation.type);
        const Icon = typeInfo?.icon || Flag;

        if (editingId === annotation.id) {
          return (
            <div
              key={annotation.id}
              style={{
                position: 'absolute',
                backgroundColor: 'common.white',
                borderRadius: 8,
                boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.15)}`,
                padding: 8,
                zIndex: 30,
                left: `${annotation.position.x}%`,
                top: `${annotation.position.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <TextField
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                size='small'
                fullWidth
                sx={{ marginBottom: 8 }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 4 }}>
                <Button
                  variant='text'
                  size='small'
                  onClick={handleSaveEdit}
                  aria-label={i18n.t('components.chart_annotations.k4')}
                >
                  <Check sx={{ width: 12, height: 12 }} />
                </Button>
                <Button
                  variant='text'
                  size='small'
                  onClick={handleCancelEdit}
                >
                  <X sx={{ width: 12, height: 12 }} />
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div
            key={annotation.id}
            style={{
              position: 'absolute',
              backgroundColor: 'common.white',
              backdropFilter: 'blur(8px)',
              borderRadius: 8,
              boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.15)}`,
              padding: 8,
              zIndex: 30,
              minWidth: 120,
              left: `${annotation.position.x}%`,
              top: `${annotation.position.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Icon
                style={{
                  width: 16,
                  height: 16,
                  flexShrink: 0,
                  marginTop: 2,
                  color: annotation.color,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, color: theme.palette.text.primary, margin: 0 }}>
                  {annotation.content}
                </p>
              </div>
            </div>
            <div
              style={{ display: 'flex', gap: 4, marginTop: 8, opacity: 0 }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
            >
              <Button
                variant='text'
                size='small'
                onClick={() => handleStartEdit(annotation)}
              >
                <Edit3 sx={{ width: 12, height: 12 }} />
              </Button>
              <Button
                variant='text'
                size='small'
                onClick={() => onDeleteAnnotation(annotation.id)}
                sx={{ color: 'error.main' }}
              >
                <X sx={{ width: 12, height: 12 }} />
              </Button>
            </div>
          </div>
        );
      })}

      {annotations.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            zIndex: 10,
            backgroundColor: 'common.white',
            backdropFilter: 'blur(8px)',
            borderRadius: 8,
            padding: `${designTokens.spacing.xs}px ${designTokens.spacing.sm}px`,
          }}
        >
          <Chip
            size='small'
            label={`${annotations.length} ${i18n.t('components.chart_annotations.k6')}`}
            variant='outlined'
          />
        </div>
      )}
    </div>
  );
}

export default ChartAnnotations;
