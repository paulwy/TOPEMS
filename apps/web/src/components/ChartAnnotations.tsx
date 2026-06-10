import { useState } from 'react';
import { Flag, MessageSquare, Tag, Plus, X, Edit3, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

export interface Annotation {
  id: string;
  type: 'flag' | 'note' | 'tag';
  position: { x: number; y: number };
  content: string;
  color: string;
}

interface ChartAnnotationsProps {
  annotations: Annotation[];
  onAddAnnotation: (annotation: Omit<Annotation, 'id'>) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  enabled?: boolean;
}

const annotationTypes = [
  { id: 'flag', label: '标记', icon: Flag, colors: ['#EF4444', '#F59E0B', '#10B981'] },
  { id: 'note', label: '注释', icon: MessageSquare, colors: ['#3B82F6', '#8B5CF6', '#06B6D4'] },
  { id: 'tag', label: '标签', icon: Tag, colors: ['#EC4899', '#14B8A6', '#84CC16'] },
];

export function ChartAnnotations({
  annotations,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  enabled = true,
}: ChartAnnotationsProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [selectedType, setSelectedType] = useState<'flag' | 'note' | 'tag'>('flag');
  const [selectedColor, setSelectedColor] = useState('#EF4444');
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
    <div className='relative'>
      <Button
        variant='ghost'
        size='icon'
        onClick={() => setShowAddMenu(!showAddMenu)}
        className='absolute top-2 right-2 z-10 bg-white/80 hover:bg-white rounded-lg shadow-md'
        title='添加标注'
      >
        <Plus className='w-4 h-4 text-gray-600'></Plus>
      </Button>

      {showAddMenu && (
        <div className='absolute top-12 right-2 z-20 bg-white rounded-lg shadow-xl p-3 w-64'>
          <div className='text-xs font-medium text-gray-500 mb-2'>添加标注</div>

          <div className='mb-2'>
            <div className='text-xs text-gray-400 mb-1'>类型</div>
            <div className='flex gap-1'>
              {annotationTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => {
                      setSelectedType(type.id as 'flag' | 'note' | 'tag');
                      setSelectedColor(type.colors[0]);
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      selectedType === type.id ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    title={type.label}
                  >
                    <Icon className='w-4 h-4'></Icon>
                  </button>
                );
              })}
            </div>
          </div>

          <div className='mb-2'>
            <div className='text-xs text-gray-400 mb-1'>颜色</div>
            <div className='flex gap-1'>
              {annotationTypes
                .find((t) => t.id === selectedType)
                ?.colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      selectedColor === color ? 'scale-125 ring-2 ring-offset-1 ring-gray-300' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                  ></button>
                ))}
            </div>
          </div>

          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder='输入标注内容...'
            className='mb-2 text-sm'
            onKeyPress={(e) => e.key === 'Enter' && handleAddAnnotation()}
          ></Input>

          <div className='flex gap-2'>
            <Button variant='outline' size='sm' className='flex-1' onClick={() => setShowAddMenu(false)}>
              取消
            </Button>
            <Button size='sm' className='flex-1' onClick={handleAddAnnotation}>
              添加
            </Button>
          </div>
        </div>
      )}

      {annotations.map((annotation) => {
        const typeInfo = annotationTypes.find((t) => t.id === annotation.type);
        const Icon = typeInfo?.icon || Flag;

        if (editingId === annotation.id) {
          return (
            <div
              key={annotation.id}
              className='absolute bg-white rounded-lg shadow-lg p-2 z-30'
              style={{
                left: `${annotation.position.x}%`,
                top: `${annotation.position.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <Input
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                className='text-sm mb-2'
                autoFocus
              ></Input>
              <div className='flex gap-1'>
                <Button variant='ghost' size='icon' onClick={handleSaveEdit} className='p-1'>
                  <Check className='w-3 h-3'></Check>
                </Button>
                <Button variant='ghost' size='icon' onClick={handleCancelEdit} className='p-1'>
                  <X className='w-3 h-3'></X>
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div
            key={annotation.id}
            className='absolute bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2 z-30 min-w-[120px] group'
            style={{
              left: `${annotation.position.x}%`,
              top: `${annotation.position.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className='flex items-start gap-2'>
              <Icon className='w-4 h-4 flex-shrink-0 mt-0.5' style={{ color: annotation.color }}></Icon>
              <div className='flex-1 min-w-0'>
                <p className='text-sm text-gray-700'>{annotation.content}</p>
              </div>
            </div>
            <div className='flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity'>
              <Button variant='ghost' size='icon' onClick={() => handleStartEdit(annotation)} className='p-1'>
                <Edit3 className='w-3 h-3'></Edit3>
              </Button>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => onDeleteAnnotation(annotation.id)}
                className='p-1 text-red-500'
              >
                <X className='w-3 h-3'></X>
              </Button>
            </div>
          </div>
        );
      })}

      {annotations.length > 0 && (
        <div className='absolute bottom-2 left-2 z-10 bg-white/80 backdrop-blur-sm rounded-lg px-2 py-1'>
          <Badge variant='outline' className='text-xs'>
            {annotations.length} 个标注
          </Badge>
        </div>
      )}
    </div>
  );
}

export default ChartAnnotations;
