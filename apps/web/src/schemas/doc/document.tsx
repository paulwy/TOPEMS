import type { EntitySchema } from '@/schema';
import React from 'react';
import { Box, Typography, Chip, Stack } from '@mui/material';
import { FileText, FileSpreadsheet, File, Image, FolderOpen } from 'lucide-react';
import i18n from '@/i18n';

const TYPE_LABELS: Record<string, string> = {
  pdf: 'PDF',
  word: 'Word',
  excel: 'Excel',
  ppt: 'PPT',
  image: i18n.t('shared.document.k0'),
};

const TYPE_COLORS: Record<string, string> = {
  pdf: 'error.main',
  word: 'primary.main',
  excel: 'success.main',
  ppt: 'warning.main',
  image: 'secondary.main',
};

interface DocumentRow {
  content_type: string;
  name: string;
  category: string;
  size: number;
  folder_id: string;
  updated_at: string;
}

const getFileIcon = (type: string) => {
  const color = TYPE_COLORS[type] || 'colors.grey.400';
  switch (type) {
    case 'pdf':
      return (
        <FileText
          size={20}
          style={{ color }}
        />
      );
    case 'word':
      return (
        <File
          size={20}
          style={{ color }}
        />
      );
    case 'excel':
      return (
        <FileSpreadsheet
          size={20}
          style={{ color }}
        />
      );
    case 'ppt':
      return (
        <File
          size={20}
          style={{ color }}
        />
      );
    case 'image':
      return (
        <Image
          size={20}
          style={{ color }}
        />
      );
    default:
      return (
        <File
          size={20}
          style={{ color }}
        />
      );
  }
};

const getFileType = (contentType: string): string => {
  if (contentType.includes('pdf')) return 'pdf';
  if (contentType.includes('word') || contentType.includes('doc')) return 'word';
  if (contentType.includes('sheet') || contentType.includes('excel')) return 'excel';
  if (contentType.includes('presentation') || contentType.includes('ppt')) return 'ppt';
  if (contentType.startsWith('image/')) return 'image';
  return 'pdf';
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const documentSchema: EntitySchema = {
  entity: 'document',
  title: i18n.t('shared.document.k1'),
  description: i18n.t('shared.document.k2'),

  api: {
    module: 'doc',
    resource: 'documents',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('shared.document.k3'),
      type: 'text',
      listWidth: 240,
      renderCell: (row: Record<string, unknown>) => {
        const doc = row as unknown as DocumentRow;
        const type = doc.content_type ? getFileType(doc.content_type) : 'pdf';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.50',
              }}
            >
              {getFileIcon(type)}
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {doc.name}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {doc.category || 'work'}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      name: 'type',
      label: i18n.t('shared.document.k4'),
      type: 'select',
      listWidth: 100,
      options: {
        type: 'static',
        options: [
          { value: 'all', label: i18n.t('shared.document.k5') },
          { value: 'pdf', label: 'PDF' },
          { value: 'word', label: 'Word' },
          { value: 'excel', label: 'Excel' },
          { value: 'ppt', label: 'PPT' },
          { value: 'image', label: i18n.t('shared.document.k6') },
        ],
      },
      renderCell: (row: Record<string, unknown>) => {
        const doc = row as unknown as DocumentRow;
        const type = doc.content_type ? getFileType(doc.content_type) : 'pdf';
        const color = TYPE_COLORS[type] || 'colors.grey.400';
        const label = TYPE_LABELS[type] || type;
        return (
          <Chip
            size='small'
            label={label}
            sx={{
              bgcolor: `${color}15`,
              color,
              fontWeight: 500,
            }}
          />
        );
      },
    },
    {
      name: 'size',
      label: i18n.t('shared.document.k7'),
      type: 'text',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => (
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {formatFileSize((row as unknown as DocumentRow).size || 0)}
        </Typography>
      ),
    },
    {
      name: 'folder_id',
      label: i18n.t('shared.document.k8'),
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => (
        <Stack
          direction='row'
          spacing={0.5}
          sx={{ alignItems: 'center' }}
        >
          <FolderOpen
            size={14}
            style={{ color: 'grey.500' }}
          />
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {(row as unknown as DocumentRow).folder_id || i18n.t('shared.document.k9')}
          </Typography>
        </Stack>
      ),
    },
    {
      name: 'updated_at',
      label: i18n.t('shared.document.k10'),
      type: 'datetime',
      listWidth: 160,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => (
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {new Date((row as unknown as DocumentRow).updated_at).toLocaleString('zh-CN')}
        </Typography>
      ),
    },
  ],

  list: {
    searchFields: ['name'],
    pageSize: 10,
    filters: [
      {
        id: 'type',
        label: i18n.t('shared.document.k11'),
        type: 'select',
        options: [
          { label: i18n.t('shared.document.k12'), value: 'all' },
          { label: 'PDF', value: 'pdf' },
          { label: 'Word', value: 'word' },
          { label: 'Excel', value: 'excel' },
          { label: 'PPT', value: 'ppt' },
          { label: i18n.t('shared.document.k13'), value: 'image' },
        ],
      },
      {
        id: 'category',
        label: i18n.t('shared.document.k14'),
        type: 'select',
        options: [
          { label: i18n.t('shared.document.k15'), value: 'all' },
          { label: i18n.t('shared.document.k16'), value: 'work' },
          { label: i18n.t('shared.document.k17'), value: 'personal' },
          { label: i18n.t('shared.document.k18'), value: 'project' },
        ],
      },
    ],
  },

  actions: ['detail', 'delete'],

  formColCount: 2,
  detailTitle: i18n.t('shared.document.k19'),
};
