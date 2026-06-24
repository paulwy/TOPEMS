import {
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  InputLabel,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Chip,
  Box,
} from '@mui/material';
import { Button } from '@mui/material';
import React, { useState, useEffect } from 'react';

import {
  Search,
  FileText,
  Workflow,
  FormInput,
  BarChart3,
  Bell,
  Check,
  Sparkles,
} from 'lucide-react';
import type {
  Template,
  TemplateType,
  TemplateCategory,
  RenderTemplateResponse,
} from '../../api/template';
import { templateApi } from '../../api/template';
import { apiLogger } from '@/utils/logger';

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateType?: TemplateType;
  onSelect: (template: Template, renderedContent?: string) => void;
  showVariables?: boolean;
}

const TYPE_ICONS: Record<TemplateType, React.ReactNode> = {
  document: <FileText sx={{ width: 20, height: 20 }} />,
  workflow: <Workflow sx={{ width: 20, height: 20 }} />,
  form: <FormInput sx={{ width: 20, height: 20 }} />,
  report: <BarChart3 sx={{ width: 20, height: 20 }} />,
  notification: <Bell sx={{ width: 20, height: 20 }} />,
};

const TYPE_LABELS: Record<TemplateType, string> = {
  document: '文档',
  workflow: '工作流',
  form: '表单',
  report: '报表',
  notification: '通知',
};

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  open,
  onOpenChange,
  templateType,
  onSelect,
  showVariables = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [variableValues, setVariableValues] = useState<Record<string, any>>({});
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    if (open) {
      loadTemplates();
      loadCategories();
      setSelectedTemplate(null);
      setVariableValues({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, templateType]);

  const loadTemplates = async () => {
    try {
      const response = await templateApi.list({
        type: templateType,
        category: selectedCategory,
        search: searchQuery || undefined,
        is_active: true,
        page_size: 50,
      });
      if (response.success && response.data) {
        setTemplates(response.data.items);
      }
    } catch (error: unknown) {
      apiLogger.error('Failed to load templates:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await templateApi.listCategories({ type: templateType });
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error: unknown) {
      apiLogger.error('Failed to load categories:', error);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    loadTemplates();
  };

  const handleCategoryChange = (categoryId: string | undefined) => {
    setSelectedCategory(categoryId);
    loadTemplates();
  };

  const handleVariableChange = (key: string, value: any) => {
    setVariableValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = async () => {
    if (!selectedTemplate) return;

    if (showVariables && selectedTemplate.variables.length > 0) {
      setIsRendering(true);
      try {
        const response = await templateApi.render(selectedTemplate.id, variableValues);
        if (response.success && response.data) {
          onSelect(selectedTemplate, response.data.content);
        } else {
          onSelect(selectedTemplate, selectedTemplate.content);
        }
      } catch (error: unknown) {
        apiLogger.error('Failed to render template:', error);
        onSelect(selectedTemplate, selectedTemplate.content);
      } finally {
        setIsRendering(false);
      }
    } else {
      onSelect(selectedTemplate);
    }

    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      maxWidth='xl'
      fullWidth
      sx={{ maxHeight: '90vh' }}
    >
      <DialogContent sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Typography
          variant='h6'
          sx={{ mb: 2 }}
        >
          选择模板
        </Typography>

        <Box
          sx={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            p: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
            }}
          >
            <Box sx={{ flex: 1, position: 'relative' }}>
              <Search
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 16,
                  height: 16,
                  color: 'text.disabled',
                }}
              />
              <TextField
                placeholder='搜索模板...'
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                size='small'
                sx={{ pl: 5, width: '100%' }}
              />
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
              <InputLabel sx={{ fontSize: 14, mb: 0.5 }}>分类筛选</InputLabel>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button
                  variant={!selectedCategory ? 'contained' : 'outlined'}
                  size='small'
                  onClick={() => handleCategoryChange(undefined)}
                >
                  全部
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'contained' : 'outlined'}
                    size='small'
                    onClick={() => handleCategoryChange(cat.id)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </Box>
            </Box>
          </Box>

          {!selectedTemplate ? (
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    lg: 'repeat(3, 1fr)',
                  },
                  gap: 2,
                }}
              >
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardHeader sx={{ pb: 1 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                            {TYPE_ICONS[template.template_type]}
                          </Box>
                          <Box>
                            <Typography variant='subtitle1'>{template.name}</Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {TYPE_LABELS[template.template_type]}
                            </Typography>
                          </Box>
                        </Box>
                        {template.ai_enabled && (
                          <Chip
                            size='small'
                            icon={<Sparkles style={{ width: 12, height: 12 }} />}
                            label='AI'
                            sx={{ bgcolor: 'warning.light', color: '#b45309' }}
                          />
                        )}
                      </Box>
                    </CardHeader>
                    <CardContent>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                        sx={{
                          mb: 1.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {template.description || '暂无描述'}
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            size='small'
                            variant='outlined'
                            label={template.category_name || '未分类'}
                          />
                          {template.is_public && (
                            <Chip
                              size='small'
                              label='公开'
                            />
                          )}
                        </Box>
                        <Typography
                          variant='caption'
                          color='text.disabled'
                        >
                          已使用 {template.use_count} 次
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>

              {templates.length === 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 6,
                    color: 'text.secondary',
                  }}
                >
                  <FileText
                    style={{
                      width: 48,
                      height: 48,
                      marginBottom: 16,
                      opacity: 0.5,
                    }}
                  />
                  <Typography>暂无模板</Typography>
                  <Typography variant='body2'>请先在系统管理中创建模板</Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <Card>
                <CardHeader>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          p: 1.5,
                          bgcolor: 'primary.light',
                          borderRadius: 1,
                        }}
                      >
                        {TYPE_ICONS[selectedTemplate.template_type]}
                      </Box>
                      <Box>
                        <Typography variant='h6'>{selectedTemplate.name}</Typography>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            fontSize: 14,
                            color: 'text.secondary',
                          }}
                        >
                          <span>{TYPE_LABELS[selectedTemplate.template_type]}</span>
                          {selectedTemplate.is_public && (
                            <Chip
                              size='small'
                              label='公开'
                            />
                          )}
                          {selectedTemplate.ai_enabled && (
                            <Chip
                              size='small'
                              icon={<Sparkles style={{ width: 12, height: 12 }} />}
                              label='AI 辅助'
                              sx={{ bgcolor: 'warning.light', color: '#b45309' }}
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>
                    <Button
                      variant='text'
                      onClick={() => setSelectedTemplate(null)}
                    >
                      返回列表
                    </Button>
                  </Box>
                </CardHeader>
                <CardContent>
                  <Typography sx={{ mb: 2, color: 'text.secondary' }}>
                    {selectedTemplate.description}
                  </Typography>

                  <Box sx={{ mb: 3 }}>
                    <InputLabel sx={{ mb: 1 }}>模板预览</InputLabel>
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'grey.200',
                        minHeight: 100,
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        fontSize: 14,
                      }}
                    >
                      {selectedTemplate.content}
                    </Box>
                  </Box>

                  {showVariables && selectedTemplate.variables.length > 0 && (
                    <Box>
                      <InputLabel sx={{ mb: 1.5, fontWeight: 'bold' }}>变量配置</InputLabel>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1.5,
                        }}
                      >
                        {selectedTemplate.variables.map((variable) => (
                          <Box key={variable.key}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                mb: 0.5,
                              }}
                            >
                              <span style={{ fontSize: 14, fontWeight: 500 }}>
                                {variable.label}
                              </span>
                              {variable.required && (
                                <span style={{ fontSize: 12, color: 'error.main' }}>必填</span>
                              )}
                            </Box>
                            <TextField
                              placeholder={variable.placeholder || `输入${variable.label}`}
                              defaultValue={variable.default_value}
                              onChange={(e) => handleVariableChange(variable.key, e.target.value)}
                              size='small'
                              sx={{ mt: 0.5 }}
                            />
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>

        <DialogActions>
          {selectedTemplate ? (
            <>
              <Button
                variant='outlined'
                onClick={() => setSelectedTemplate(null)}
              >
                返回列表
              </Button>
              <Button
                onClick={handleApply}
                disabled={isRendering}
              >
                {isRendering ? (
                  '处理中...'
                ) : (
                  <>
                    <Check style={{ width: 16, height: 16, marginRight: 8 }} />
                    应用模板
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant='outlined'
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button
                disabled={!selectedTemplate}
                onClick={handleApply}
              >
                应用模板
              </Button>
            </>
          )}
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateSelector;
