import React from 'react';
import { Box, Typography, IconButton, Chip } from '@mui/material';
import { FileText, Edit, Trash2, Copy, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Template, TemplateCategory } from '@/api/template';

interface TemplateListItemProps {
  template: Template;
  categories: TemplateCategory[];
  onPreview: (template: Template) => void;
  onEdit: (template: Template) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleStatus: (id: string) => void;
  index: number;
  total: number;
}

const TemplateListItem: React.FC<TemplateListItemProps> = ({
  template,
  categories,
  onPreview,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleStatus,
  index,
  total,
}) => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2,
        borderBottom: index < total - 1 ? 1 : 0,
        borderColor: 'divider',
        '&:hover': { bgcolor: 'grey.50' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            bgcolor: 'primary.100',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FileText sx={{ width: 20, height: 20, color: 'primary.main' }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontWeight: 500 }}>{template.name}</Typography>
            <Chip
              label={
                template.isactive
                  ? ` + ${t('report.template_management_page.enabled')} + `
                  : t('report.template_management_page.disabled')
              }
              size='small'
              sx={{
                bgcolor: template.isactive ? 'success.100' : 'grey.100',
                color: template.isactive ? 'success.700' : 'grey.700',
              }}
            />
          </Box>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {template.code} ·{' '}
            {categories.find((c) => c.id === template.category_id)?.name ||
              template.category_name ||
              t('report.template_management_page.no_category')}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <IconButton
          onClick={() => onToggleStatus(template.id)}
          sx={{
            color: template.isactive ? 'success.main' : 'grey.400',
          }}
          aria-label='切换'
        >
          {template.isactive ? (
            <ToggleRight sx={{ width: 20, height: 20 }} />
          ) : (
            <ToggleLeft sx={{ width: 20, height: 20 }} />
          )}
        </IconButton>
        <IconButton
          onClick={() => onPreview(template)}
          sx={{ color: 'primary.main' }}
          aria-label='查看'
        >
          <Eye sx={{ width: 16, height: 16 }} />
        </IconButton>
        <IconButton
          onClick={() => onDuplicate(template.id)}
          sx={{ color: 'success.main' }}
          aria-label='复制'
        >
          <Copy sx={{ width: 16, height: 16 }} />
        </IconButton>
        <IconButton
          onClick={() => onEdit(template)}
          sx={{ color: 'primary.main' }}
          aria-label='编辑'
        >
          <Edit sx={{ width: 16, height: 16 }} />
        </IconButton>
        <IconButton
          onClick={() => onDelete(template.id)}
          sx={{ color: 'error.main' }}
          aria-label='删除'
        >
          <Trash2 sx={{ width: 16, height: 16 }} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default TemplateListItem;
