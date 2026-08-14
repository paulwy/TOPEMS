import React from 'react';
import { Box, Card, CardContent, Typography, IconButton } from '@mui/material';
import { FileText, Edit, Trash2, Copy, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Template, TemplateCategory } from '@/api/template';
import i18n from '@/i18n';

interface TemplateCardProps {
  template: Template;
  categories: TemplateCategory[];
  onPreview: (template: Template) => void;
  onEdit: (template: Template) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleStatus: (id: string) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  categories,
  onPreview,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleStatus,
}) => {
  const { t } = useTranslation();

  return (
    <Card
      sx={{
        bgcolor: 'grey.50',
        '&:hover': { boxShadow: 3 },
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              bgcolor: 'primary.100',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText sx={{ width: 24, height: 24, color: 'primary.main' }} />
          </Box>
          <IconButton
            onClick={() => onToggleStatus(template.id)}
            sx={{
              color: template.isactive ? 'success.main' : 'grey.400',
              '&:hover': {
                bgcolor: template.isactive ? 'success.light' : 'grey.200',
              },
            }}
            title={
              template.isactive
                ? ` + ${t('report.template_management_page.enabled')} + `
                : t('report.template_management_page.disabled')
            }
            aria-label={i18n.t('pages.template_card.k0')}
          >
            {template.isactive ? (
              <ToggleRight sx={{ width: 20, height: 20 }} />
            ) : (
              <ToggleLeft sx={{ width: 20, height: 20 }} />
            )}
          </IconButton>
        </Box>

        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 0.5 }}
        >
          {template.name}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 2 }}
        >
          {template.code}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {t('report.template_management_page.category_label')}
            {categories.find((c) => c.id === template.category_id)?.name ||
              template.category_name ||
              t('report.template_management_page.no_category')}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {t('report.template_management_page.module_label', { module: template.module })}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {t('report.template_management_page.variables_count', {
              count: template.variables?.length || 0,
            })}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 0.5,
            pt: 2,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <IconButton
            onClick={() => onPreview(template)}
            sx={{ color: 'primary.main' }}
            aria-label={t('report.template_management_page.preview')}
            title={t('report.template_management_page.preview')}
          >
            <Eye sx={{ width: 16, height: 16 }} />
          </IconButton>
          <IconButton
            onClick={() => onDuplicate(template.id)}
            sx={{ color: 'success.main' }}
            aria-label={t('report.template_management_page.duplicate')}
            title={t('report.template_management_page.duplicate')}
          >
            <Copy sx={{ width: 16, height: 16 }} />
          </IconButton>
          <IconButton
            onClick={() => onEdit(template)}
            sx={{ color: 'primary.main' }}
            aria-label={t('report.template_management_page.edit')}
            title={t('report.template_management_page.edit')}
          >
            <Edit sx={{ width: 16, height: 16 }} />
          </IconButton>
          <IconButton
            onClick={() => onDelete(template.id)}
            sx={{ color: 'error.main' }}
            aria-label={t('report.template_management_page.delete')}
            title={t('report.template_management_page.delete')}
          >
            <Trash2 sx={{ width: 16, height: 16 }} />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TemplateCard;
