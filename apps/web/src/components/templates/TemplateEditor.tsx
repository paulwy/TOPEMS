import {
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  Switch,
  FormLabel,
  Typography,
  Box,
  Button,
  useTheme,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

import { Plus, Trash2, GripVertical, Sparkles, Eye, EyeOff } from 'lucide-react';
import type {
  Template,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateVariable,
  TemplateType,
  TemplateCategory,
} from '../../api/template';

interface TemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: Template | null;
  categories: TemplateCategory[];
  onSave: (data: CreateTemplateRequest | UpdateTemplateRequest) => void;
}

const TEMPLATE_TYPES: { value: TemplateType; label: string }[] = [
  { value: 'document', label: '文档模板' },
  { value: 'workflow', label: '工作流模板' },
  { value: 'form', label: '表单模板' },
  { value: 'report', label: '报表模板' },
  { value: 'notification', label: '通知模板' },
];

const VARIABLE_TYPES: { value: string; label: string }[] = [
  { value: 'string', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'date', label: '日期' },
  { value: 'select', label: '单选' },
  { value: 'multiselect', label: '多选' },
  { value: 'lookup', label: '查找' },
  { value: 'user', label: '用户' },
  { value: 'now', label: '当前时间' },
];

const TemplateEditor: React.FC<TemplateEditorProps> = ({
  open,
  onOpenChange,
  template,
  categories,
  onSave,
}) => {
  const theme = useTheme();
  const [isPreview, setIsPreview] = useState(false);
  const [formData, setFormData] = useState<CreateTemplateRequest>({
    name: '',
    code: '',
    module: 'doc',
    content: '',
    variables: [],
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        code: template.code,
        template_type: template.template_type,
        category_id: template.category_id,
        module: template.module || 'doc',
        description: template.description,
        content: template.content,
        variables: template.variables,
        isactive: template.isactive,
        is_public: template.is_public,
        ai_enabled: template.ai_enabled,
        sort_order: 0,
      });
    } else {
      setFormData({
        name: '',
        code: '',
        module: 'doc',
        content: '',
        variables: [],
        isactive: true,
        is_public: false,
        ai_enabled: false,
      });
    }
  }, [template, open]);

  const handleVariableAdd = () => {
    const newVariable: TemplateVariable = {
      key: `var_${Date.now()}`,
      label: '新变量',
      type: 'string',
      required: false,
    };
    setFormData((prev) => ({
      ...prev,
      variables: [...(prev.variables || []), newVariable],
    }));
  };

  const handleVariableRemove = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      variables: prev.variables ? prev.variables.filter((_, i) => i !== index) : [],
    }));
  };

  const handleVariableChange = (index: number, field: keyof TemplateVariable, value: unknown) => {
    setFormData((prev) => {
      const variables = prev.variables || [];
      const updatedVariables = variables.map((v, i) =>
        i === index ? { ...v, [field]: value } : v
      );
      return { ...prev, variables: updatedVariables };
    });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.code) return;

    if (template) {
      onSave({
        ...formData,
        id: template.id,
      } as UpdateTemplateRequest);
    } else {
      onSave(formData);
    }

    onOpenChange(false);
  };

  const insertVariable = (variableKey: string) => {
    const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
    const cursorPos = textarea?.selectionStart;
    if (cursorPos !== undefined) {
      const content = formData.content;
      const newContent = `${content.slice(0, cursorPos)}{{${variableKey}}}${content.slice(cursorPos)}`;
      setFormData((prev) => ({ ...prev, content: newContent }));
    }
  };

  const previewContent = () => {
    if (!formData.content) return '';
    let content = formData.content;
    (formData.variables || []).forEach((v) => {
      const pattern = new RegExp(`{{\\s*${v.key}\\s*}}`, 'g');
      content = content.replace(pattern, String(v.default_value || `[${v.label}]`));
    });
    return content;
  };

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      maxWidth='md'
      fullWidth
      sx={{ '& .MuiDialog-paper': { maxHeight: '90vh' } }}
    >
      <DialogContent sx={{ overflowY: 'auto' }}>
        <Typography
          variant='h6'
          sx={{ mb: 3 }}
        >
          {template ? '编辑模板' : '创建模板'}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(1, 1fr)',
                md: 'repeat(2, 1fr)',
              },
              gap: 2,
            }}
          >
            <Box>
              <FormLabel component='legend'>模板名称 *</FormLabel>
              <TextField
                fullWidth
                size='small'
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder='输入模板名称'
                sx={{ mt: 1 }}
              />
            </Box>
            <Box>
              <FormLabel component='legend'>模板编码 *</FormLabel>
              <TextField
                fullWidth
                size='small'
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder='输入模板编码'
                disabled={!!template}
                sx={{ mt: 1 }}
              />
            </Box>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(1, 1fr)',
                md: 'repeat(2, 1fr)',
              },
              gap: 2,
            }}
          >
            <Box>
              <FormLabel component='legend'>模板类型</FormLabel>
              <Select
                fullWidth
                size='small'
                value={formData.template_type || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    template_type: e.target.value as TemplateType,
                  })
                }
                sx={{ mt: 1 }}
              >
                {TEMPLATE_TYPES.map((type) => (
                  <MenuItem
                    key={type.value}
                    value={type.value}
                  >
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </Box>
            <Box>
              <FormLabel component='legend'>分类</FormLabel>
              <Select
                fullWidth
                size='small'
                value={formData.category_id || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category_id: e.target.value || undefined,
                  })
                }
                sx={{ mt: 1 }}
              >
                {categories.map((cat) => (
                  <MenuItem
                    key={cat.id}
                    value={cat.id}
                  >
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          </Box>

          <Box>
            <FormLabel component='legend'>描述</FormLabel>
            <TextField
              fullWidth
              size='small'
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder='输入模板描述'
              sx={{ mt: 1 }}
            />
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography
              sx={{
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <span>模板变量</span>
              <Button
                size='small'
                onClick={handleVariableAdd}
                startIcon={<Plus size={16} />}
              >
                添加变量
              </Button>
            </Typography>
            <Button
              size='small'
              variant='outlined'
              onClick={() => setIsPreview(!isPreview)}
              startIcon={isPreview ? <EyeOff size={16} /> : <Eye size={16} />}
            >
              {isPreview ? '编辑模式' : '预览模式'}
            </Button>
          </Box>

          {formData.variables && formData.variables.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {formData.variables.map((variable, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    p: 2,
                    backgroundColor: 'grey.50',
                    borderRadius: 1,
                  }}
                >
                  <GripVertical
                    size={16}
                    style={{
                      color: theme.palette.text.disabled,
                      marginTop: 8,
                      cursor: 'move',
                      flexShrink: 0,
                    }}
                  />
                  <Box
                    sx={{
                      flex: 1,
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: 'repeat(1, 1fr)',
                        md: 'repeat(4, 1fr)',
                      },
                      gap: 2,
                    }}
                  >
                    <Box>
                      <FormLabel
                        component='legend'
                        sx={{ fontSize: '0.75rem' }}
                      >
                        变量标识
                      </FormLabel>
                      <TextField
                        fullWidth
                        size='small'
                        value={variable.key}
                        onChange={(e) => handleVariableChange(index, 'key', e.target.value)}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                    <Box>
                      <FormLabel
                        component='legend'
                        sx={{ fontSize: '0.75rem' }}
                      >
                        显示名称
                      </FormLabel>
                      <TextField
                        fullWidth
                        size='small'
                        value={variable.label}
                        onChange={(e) => handleVariableChange(index, 'label', e.target.value)}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                    <Box>
                      <FormLabel
                        component='legend'
                        sx={{ fontSize: '0.75rem' }}
                      >
                        类型
                      </FormLabel>
                      <Select
                        fullWidth
                        size='small'
                        value={variable.type || ''}
                        onChange={(e) => handleVariableChange(index, 'type', e.target.value)}
                        sx={{ mt: 0.5 }}
                      >
                        {VARIABLE_TYPES.map((type) => (
                          <MenuItem
                            key={type.value}
                            value={type.value}
                          >
                            {type.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Switch
                          size='small'
                          checked={variable.required || false}
                          onChange={(e) =>
                            handleVariableChange(index, 'required', e.target.checked)
                          }
                        />
                        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                          必填
                        </Typography>
                      </Box>
                      <Button
                        size='small'
                        color='error'
                        onClick={() => handleVariableRemove(index)}
                        sx={{ minWidth: 'auto', p: 0.5 }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1,
              }}
            >
              <FormLabel component='legend'>模板内容</FormLabel>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {(formData.variables || []).map((v) => (
                  <Button
                    key={v.key}
                    size='small'
                    variant='outlined'
                    onClick={() => insertVariable(v.key)}
                  >
                    {`{{${v.key}}}`}
                  </Button>
                ))}
              </Box>
            </Box>
            {isPreview ? (
              <Box
                sx={{
                  p: 2,
                  backgroundColor: 'grey.50',
                  borderRadius: 1,
                  border: '1px solid grey.200',
                  minHeight: 200,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {previewContent()}
              </Box>
            ) : (
              <TextField
                fullWidth
                multiline
                rows={8}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder='输入模板内容，使用 {{变量名}} 引用变量'
                sx={{
                  mt: 1,
                  '& .MuiInputBase-input': {
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                  },
                }}
              />
            )}
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(1, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Switch
                  size='small'
                  checked={formData.isactive || false}
                  onChange={(e) => setFormData({ ...formData, isactive: e.target.checked })}
                />
                <FormLabel component='legend'>启用状态</FormLabel>
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Switch
                  size='small'
                  checked={formData.is_public || false}
                  onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                />
                <FormLabel component='legend'>公开模板</FormLabel>
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Switch
                  size='small'
                  checked={formData.ai_enabled || false}
                  onChange={(e) => setFormData({ ...formData, ai_enabled: e.target.checked })}
                />
                <FormLabel
                  component='legend'
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <Sparkles
                    size={16}
                    style={{ color: theme.palette.warning.main }}
                  />
                  AI 辅助
                </FormLabel>
              </Box>
            </Box>
          </Box>
        </Box>

        <DialogActions sx={{ px: 0, pb: 2 }}>
          <Button
            variant='outlined'
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSubmit}
          >
            {template ? '更新模板' : '创建模板'}
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateEditor;
