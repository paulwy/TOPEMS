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
  Button,
  useTheme,
} from '@mui/material';
import i18n from '@/i18n';
import React, { useState, useEffect, useCallback } from 'react';

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
import type { Template, TemplateType, TemplateCategory } from '../../api/template';
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
  document: i18n.t('components.template_selector.k0'),
  workflow: i18n.t('components.template_selector.k1'),
  form: i18n.t('components.template_selector.k2'),
  report: i18n.t('components.template_selector.k3'),
  notification: i18n.t('components.template_selector.k4'),
};

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  open,
  onOpenChange,
  templateType,
  onSelect,
  showVariables = true,
}) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [variableValues, setVariableValues] = useState<Record<string, unknown>>({});
  const [isRendering, setIsRendering] = useState(false);

  const loadTemplates = useCallback(async () => {
    try {
      const response = await templateApi.list({
        type: templateType,
        category: selectedCategory,
        search: searchQuery || undefined,
        isactive: true,
        pagesize: 50,
      });
      if (response.success && response.data) {
        setTemplates(response.data.items);
      }
    } catch (error: unknown) {
      apiLogger.error('Failed to load templates:', error);
    }
  }, [templateType, selectedCategory, searchQuery]);

  const loadCategories = useCallback(async () => {
    try {
      const response = await templateApi.listCategories({ type: templateType });
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error: unknown) {
      apiLogger.error('Failed to load categories:', error);
    }
  }, [templateType]);

  useEffect(() => {
    if (open) {
      loadTemplates();
      loadCategories();
      setSelectedTemplate(null);
      setVariableValues({});
    }
  }, [open, templateType, loadTemplates, loadCategories]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    loadTemplates();
  };

  const handleCategoryChange = (categoryId: string | undefined) => {
    setSelectedCategory(categoryId);
    loadTemplates();
  };

  const handleVariableChange = (key: string, value: unknown) => {
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
          {i18n.t('components.template_selector.k0')}
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
                  color: theme.palette.text.disabled,
                }}
              />
              <TextField
                placeholder={i18n.t('components.template_selector.k1')}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                size='small'
                sx={{ pl: 5, width: '100%' }}
              />
            </Box>
            <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
              <InputLabel sx={{ fontSize: 14, mb: 0.5 }}>
                {i18n.t('components.template_selector.k5')}
              </InputLabel>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button
                  variant={!selectedCategory ? 'contained' : 'outlined'}
                  size='small'
                  onClick={() => handleCategoryChange(undefined)}
                >
                  {i18n.t('components.template_selector.k2')}
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
                            sx={{ bgcolor: 'warning.light', color: 'warning.dark' }}
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
                        {template.description || i18n.t('components.template_selector.k6')}
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
                            label={
                              template.category_name || i18n.t('components.template_selector.k7')
                            }
                          />
                          {template.is_public && (
                            <Chip
                              size='small'
                              label={i18n.t('components.template_selector.k8')}
                            />
                          )}
                        </Box>
                        <Typography
                          variant='caption'
                          color='text.disabled'
                        >
                          {i18n.t('components.template_selector.k0')} {template.use_count}{' '}
                          {i18n.t('components.template_selector.k1')}
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
                  <Typography>{i18n.t('components.template_selector.k9')}</Typography>
                  <Typography variant='body2'>
                    {i18n.t('components.template_selector.k10')}
                  </Typography>
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
                              label={i18n.t('components.template_selector.k11')}
                            />
                          )}
                          {selectedTemplate.ai_enabled && (
                            <Chip
                              size='small'
                              icon={<Sparkles style={{ width: 12, height: 12 }} />}
                              label={i18n.t('components.template_selector.ai_3')}
                              sx={{ bgcolor: 'warning.light', color: 'warning.dark' }}
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>
                    <Button
                      variant='text'
                      onClick={() => setSelectedTemplate(null)}
                    >
                      {i18n.t('components.template_selector.k4')}
                    </Button>
                  </Box>
                </CardHeader>
                <CardContent>
                  <Typography sx={{ mb: 2, color: 'text.secondary' }}>
                    {selectedTemplate.description}
                  </Typography>

                  <Box sx={{ mb: 3 }}>
                    <InputLabel sx={{ mb: 1 }}>
                      {i18n.t('components.template_selector.k12')}
                    </InputLabel>
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
                      <InputLabel sx={{ mb: 1.5, fontWeight: 'bold' }}>
                        {i18n.t('components.template_selector.k13')}
                      </InputLabel>
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
                                <span style={{ fontSize: 12, color: theme.palette.error.main }}>
                                  {i18n.t('components.template_selector.k5')}
                                </span>
                              )}
                            </Box>
                            <TextField
                              placeholder={
                                variable.placeholder ||
                                `${i18n.t('components.template_selector.k6')}${variable.label}`
                              }
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
                {i18n.t('components.template_selector.k7')}
              </Button>
              <Button
                onClick={handleApply}
                disabled={isRendering}
              >
                {isRendering ? (
                  i18n.t('components.template_selector.k8')
                ) : (
                  <>
                    <Check style={{ width: 16, height: 16, marginRight: 8 }} />
                    {i18n.t('components.template_selector.k9')}
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
                {i18n.t('components.template_selector.k10')}
              </Button>
              <Button
                disabled={!selectedTemplate}
                onClick={handleApply}
              >
                {i18n.t('components.template_selector.k11')}
              </Button>
            </>
          )}
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateSelector;
