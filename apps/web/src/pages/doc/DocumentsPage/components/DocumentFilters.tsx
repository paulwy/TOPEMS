import React from 'react';
import { Box, Button } from '@mui/material';
import { Type, Clock, SortAsc, SortDesc } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SortField, SortOrder } from '../types';

interface DocumentFiltersProps {
  fileTypeFilter: string;
  onFileTypeChange: (value: string) => void;
  sortBy: SortField;
  sortOrder: SortOrder;
  onToggleSort: (field: SortField) => void;
}

const DocumentFilters: React.FC<DocumentFiltersProps> = ({
  fileTypeFilter,
  onFileTypeChange,
  sortBy,
  sortOrder,
  onToggleSort,
}) => {
  const { t } = useTranslation();

  const renderSortIcon = (field: SortField) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? (
      <SortAsc sx={{ width: 12, height: 12, ml: 0.5 }} />
    ) : (
      <SortDesc sx={{ width: 12, height: 12, ml: 0.5 }} />
    );
  };

  const sortButtons: Array<{ field: SortField; label: string }> = [
    { field: 'date', label: t('doc.documents.sort_time') },
    { field: 'name', label: t('doc.documents.sort_name') },
    { field: 'size', label: t('doc.documents.sort_size') },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 1.5,
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Type sx={{ width: 16, height: 16, color: 'grey.400' }} />
        <select
          value={fileTypeFilter}
          onChange={(e) => onFileTypeChange(e.target.value)}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: '0.875rem',
          }}
        >
          <option value='all'>{t('doc.documents.filter_all_type')}</option>
          <option value='pdf'>{t('doc.documents.filter_pdf')}</option>
          <option value='doc'>{t('doc.documents.filter_word')}</option>
          <option value='xls'>{t('doc.documents.filter_excel')}</option>
          <option value='ppt'>{t('doc.documents.filter_ppt')}</option>
          <option value='txt'>{t('doc.documents.filter_text')}</option>
          <option value='jpg'>{t('doc.documents.filter_image')}</option>
          <option value='zip'>{t('doc.documents.filter_zip')}</option>
        </select>
      </Box>
      <Box sx={{ width: 1, height: 16, bgcolor: 'grey.300' }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Clock sx={{ width: 16, height: 16, color: 'grey.400' }} />
        {sortButtons.map((btn) => (
          <Button
            key={btn.field}
            variant='text'
            size='small'
            onClick={() => onToggleSort(btn.field)}
            sx={{
              color: sortBy === btn.field ? 'primary.main' : 'grey.700',
            }}
          >
            {btn.label} {renderSortIcon(btn.field)}
          </Button>
        ))}
      </Box>
    </Box>
  );
};

export default DocumentFilters;
