import React from 'react';
import { Box, Typography, Button, Paper, useTheme } from '@mui/material';
import { Edit, Trash2, Download, Upload, Book } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { dictItemSchema } from '@/schemas/admin';
import type { DictType } from '@/api/system';

interface DictionaryContentProps {
  selectedType: DictType | null;
  dictItemAdapter: CrudApiAdapter;
  onToggleStatus: (row: Record<string, unknown>) => void;
  onEditType: (type: DictType) => void;
  onDeleteType: (type: DictType) => void;
  onExport: () => void;
  onImport: () => void;
}

const DictionaryContent: React.FC<DictionaryContentProps> = ({
  selectedType,
  dictItemAdapter,
  onToggleStatus,
  onEditType,
  onDeleteType,
  onExport,
  onImport,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const categoryLabels: Record<string, string> = {
    system: t('admin.dictionary_management.system_dictionary'),
    business: t('admin.dictionary_management.business_dictionary'),
    basic: t('admin.dictionary_management.base_data'),
    custom: t('admin.dictionary_management.custom_dictionary'),
  };

  if (!selectedType) {
    return (
      <Paper sx={{ p: 6, textAlign: 'center' }}>
        <Book
          size={64}
          style={{ color: theme.palette.text.disabled, marginBottom: 16 }}
        />
        <Typography
          variant='h6'
          sx={{ mb: 1 }}
        >
          {t('admin.dictionary_management_page.text_4b3a81')}
        </Typography>
        <Typography color='text.secondary'>
          {t('admin.dictionary_management_page.text_f0736f')}
        </Typography>
      </Paper>
    );
  }

  return (
    <CrudPage
      schema={dictItemSchema}
      apiAdapter={dictItemAdapter}
      breadcrumbs={[
        { label: t('admin.dictionary_management.dictionary_management') },
        { label: selectedType.name },
      ]}
      extraQueryParams={{ dict_type_id: selectedType.id }}
      customRowActions={[
        {
          label: t('admin.dictionary_management.toggle_status'),
          icon: <Edit size={16} />,
          onClick: (row) => onToggleStatus(row),
        },
      ]}
      headerContent={
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {t('admin.dictionary_management.code')}: {selectedType.code} |{' '}
            {t('admin.dictionary_management.category')}:{' '}
            {categoryLabels[selectedType.category] || selectedType.category}
          </Typography>
          <Button
            variant='outlined'
            size='small'
            startIcon={<Edit size={16} />}
            onClick={() => onEditType(selectedType)}
          >
            {t('admin.dictionary_management_page.text_63bb91')}
          </Button>
          <Button
            variant='outlined'
            size='small'
            color='error'
            startIcon={<Trash2 size={16} />}
            onClick={() => onDeleteType(selectedType)}
          >
            {t('admin.dictionary_management_page.text_c0a407')}
          </Button>
          <Button
            variant='outlined'
            size='small'
            startIcon={<Download size={16} />}
            onClick={onExport}
          >
            {t('admin.dictionary_management_page.text_55405e')}
          </Button>
          <Button
            variant='outlined'
            size='small'
            startIcon={<Upload size={16} />}
            onClick={onImport}
          >
            {t('admin.dictionary_management_page.text_8d9a07')}
          </Button>
        </Box>
      }
    />
  );
};

export default DictionaryContent;
