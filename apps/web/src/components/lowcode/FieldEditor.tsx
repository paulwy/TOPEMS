import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  Button,
  Typography,
  Divider,
  IconButton,
  Chip,
} from '@mui/material';
import { Plus, X, Trash2 } from 'lucide-react';
import type { ModelField, FieldType } from '../../api/lowcode/types';

const fieldTypeOptions: { value: FieldType; label: string; category: string }[] = [
  { value: 'string', label: '字符串', category: '文本类' },
  { value: 'text', label: '文本', category: '文本类' },
  { value: 'richText', label: '富文本', category: '文本类' },
  { value: 'integer', label: '整数', category: '数值类' },
  { value: 'float', label: '浮点数', category: '数值类' },
  { value: 'currency', label: '货币', category: '数值类' },
  { value: 'percent', label: '百分比', category: '数值类' },
  { value: 'date', label: '日期', category: '日期类' },
  { value: 'time', label: '时间', category: '日期类' },
  { value: 'datetime', label: '日期时间', category: '日期类' },
  { value: 'select', label: '单选', category: '选择类' },
  { value: 'multiSelect', label: '多选', category: '选择类' },
  { value: 'boolean', label: '布尔开关', category: '选择类' },
  { value: 'relation', label: '关联单条', category: '关联类' },
  { value: 'multiRelation', label: '关联多条', category: '关联类' },
  { value: 'file', label: '文件', category: '关联类' },
  { value: 'image', label: '图片', category: '关联类' },
];

const systemFieldTypes: FieldType[] = ['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'];

interface FieldEditorProps {
  field: ModelField | null;
  modelFields?: ModelField[];
  models?: Array<{ id: string; label: string }>;
  onSave: (field: Partial<ModelField>) => void;
  onCancel: () => void;
  onDelete?: (fieldId: string) => void;
  isNew?: boolean;
}

export const FieldEditor: React.FC<FieldEditorProps> = ({
  field,
  models = [],
  onSave,
  onCancel,
  onDelete,
  isNew = false,
}) => {
  const [formData, setFormData] = useState<Partial<ModelField>>({});
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');

  useEffect(() => {
    if (field) {
      setFormData({ ...field });
    } else {
      setFormData({
        name: '',
        label: '',
        type: 'string',
        required: false,
        unique: false,
        searchable: false,
        sortable: false,
        options: [],
      });
    }
  }, [field]);

  const handleChange = (key: keyof ModelField, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddOption = () => {
    if (newOptionLabel && newOptionValue) {
      const options = formData.options || [];
      setFormData((prev) => ({
        ...prev,
        options: [...options, { label: newOptionLabel, value: newOptionValue }],
      }));
      setNewOptionLabel('');
      setNewOptionValue('');
    }
  };

  const handleRemoveOption = (index: number) => {
    const options = [...(formData.options || [])];
    options.splice(index, 1);
    setFormData((prev) => ({ ...prev, options }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const isSystemField =
    field?.isSystem || systemFieldTypes.includes(field?.type || ('string' as FieldType));
  const needsOptions = formData.type === 'select' || formData.type === 'multiSelect';
  const needsRelation = formData.type === 'relation' || formData.type === 'multiRelation';
  const needsLength = formData.type === 'string';
  const needsPrecision =
    formData.type === 'float' || formData.type === 'currency' || formData.type === 'percent';

  const categories = Array.from(new Set(fieldTypeOptions.map((o) => o.category)));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant='h6'>
          {isNew ? '新增字段' : isSystemField ? '系统字段' : '编辑字段'}
        </Typography>
        {!isNew && !isSystemField && onDelete && (
          <IconButton
            color='error'
            onClick={() => onDelete(field!.id)}
          >
            <Trash2 style={{ width: 20, height: 20 }} />
          </IconButton>
        )}
      </Box>

      <Divider />

      <TextField
        label='字段名称'
        value={formData.name || ''}
        onChange={(e) => handleChange('name', e.target.value)}
        disabled={isSystemField}
        size='small'
        helperText='英文标识，用于代码中引用'
      />

      <TextField
        label='字段显示名'
        value={formData.label || ''}
        onChange={(e) => handleChange('label', e.target.value)}
        disabled={isSystemField}
        size='small'
      />

      <FormControl size='small'>
        <InputLabel>字段类型</InputLabel>
        <Select
          value={formData.type || 'string'}
          label='字段类型'
          onChange={(e) => handleChange('type', e.target.value as FieldType)}
          disabled={isSystemField}
        >
          {categories.map((category) => (
            <MenuItem
              key={category}
              value=''
              disabled
            >
              <em>{category}</em>
            </MenuItem>
          ))}
          {fieldTypeOptions.map((opt) => (
            <MenuItem
              key={opt.value}
              value={opt.value}
            >
              &nbsp;&nbsp;{opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {needsLength && (
        <TextField
          label='长度'
          type='number'
          value={formData.length || 255}
          onChange={(e) => handleChange('length', Number(e.target.value))}
          disabled={isSystemField}
          size='small'
        />
      )}

      {needsPrecision && (
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label='精度'
            type='number'
            value={formData.precision || 10}
            onChange={(e) => handleChange('precision', Number(e.target.value))}
            disabled={isSystemField}
            size='small'
            sx={{ flex: 1 }}
          />
          <TextField
            label='小数位数'
            type='number'
            value={formData.scale || 2}
            onChange={(e) => handleChange('scale', Number(e.target.value))}
            disabled={isSystemField}
            size='small'
            sx={{ flex: 1 }}
          />
        </Box>
      )}

      {needsOptions && (
        <Box>
          <Typography
            variant='subtitle2'
            gutterBottom
          >
            选项配置
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {(formData.options || []).map((opt, idx) => (
              <Chip
                key={idx}
                label={`${opt.label} (${opt.value})`}
                onDelete={() => handleRemoveOption(idx)}
                size='small'
              />
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label='显示名'
              value={newOptionLabel}
              onChange={(e) => setNewOptionLabel(e.target.value)}
              size='small'
              sx={{ flex: 1 }}
            />
            <TextField
              label='值'
              value={newOptionValue}
              onChange={(e) => setNewOptionValue(e.target.value)}
              size='small'
              sx={{ flex: 1 }}
            />
            <Button
              variant='outlined'
              startIcon={<Plus style={{ width: 16, height: 16 }} />}
              onClick={handleAddOption}
            >
              添加
            </Button>
          </Box>
        </Box>
      )}

      {needsRelation && (
        <>
          <FormControl size='small'>
            <InputLabel>关联模型</InputLabel>
            <Select
              value={formData.relationModelId || ''}
              label='关联模型'
              onChange={(e) => handleChange('relationModelId', e.target.value)}
              disabled={isSystemField}
            >
              {models.map((m) => (
                <MenuItem
                  key={m.id}
                  value={m.id}
                >
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label='关联显示字段'
            value={formData.relationField || ''}
            onChange={(e) => handleChange('relationField', e.target.value)}
            disabled={isSystemField}
            size='small'
          />
        </>
      )}

      <TextField
        label='默认值'
        value={formData.defaultValue?.toString() || ''}
        onChange={(e) => handleChange('defaultValue', e.target.value)}
        disabled={isSystemField}
        size='small'
      />

      <Box>
        <Typography
          variant='subtitle2'
          gutterBottom
        >
          属性设置
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.required || false}
                onChange={(e) => handleChange('required', e.target.checked)}
                disabled={isSystemField}
              />
            }
            label='必填'
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.unique || false}
                onChange={(e) => handleChange('unique', e.target.checked)}
                disabled={isSystemField}
              />
            }
            label='唯一'
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.searchable || false}
                onChange={(e) => handleChange('searchable', e.target.checked)}
                disabled={isSystemField}
              />
            }
            label='可搜索'
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.sortable || false}
                onChange={(e) => handleChange('sortable', e.target.checked)}
                disabled={isSystemField}
              />
            }
            label='可排序'
          />
        </Box>
      </Box>

      <TextField
        label='描述'
        value={formData.description || ''}
        onChange={(e) => handleChange('description', e.target.value)}
        disabled={isSystemField}
        size='small'
        multiline
        rows={2}
      />

      <Divider />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={onCancel}>取消</Button>
        {!isSystemField && (
          <Button
            variant='contained'
            onClick={handleSave}
          >
            {isNew ? '添加' : '保存'}
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default FieldEditor;
