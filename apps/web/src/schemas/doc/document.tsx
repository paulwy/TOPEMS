import type { EntitySchema } from '@/schema';
import React from 'react';
import { Box, Typography, Chip, Stack } from '@mui/material';
import {
  FileText,
  FileSpreadsheet,
  File,
  Image,
  FolderOpen,
} from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  pdf: 'PDF',
  word: 'Word',
  excel: 'Excel',
  ppt: 'PPT',
  image: '图片',
};

const TYPE_COLORS: Record<string, string> = {
  pdf: 'error.main',
  word: 'primary.main',
  excel: 'success.main',
  ppt: 'warning.main',
  image: 'secondary.main',
};

const getFileIcon = (type: string) => {
  const color = TYPE_COLORS[type] || '#9ca3af';
  switch (type) {
    case 'pdf':
      return <FileText size={20} style={{ color }} />;
    case 'word':
      return <File size={20} style={{ color }} />;
    case 'excel':
      return <FileSpreadsheet size={20} style={{ color }} />;
    case 'ppt':
      return <File size={20} style={{ color }} />;
    case 'image':
      return <Image size={20} style={{ color }} />;
    default:
      return <File size={20} style={{ color }} />;
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
  title: '文档',
  description: '管理您的所有文档',

  api: {
    module: 'doc',
    resource: 'documents',
  },

  fields: [
    {
      name: 'name',
      label: '文档名称',
      type: 'text',
      listWidth: 240,
      renderCell: (row) => {
        const doc = row as any;
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
              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                {doc.name}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {doc.category || 'work'}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      name: 'type',
      label: '类型',
      type: 'select',
      listWidth: 100,
      options: {
        type: 'static',
        options: [
          { value: 'all', label: '全部类型' },
          { value: 'pdf', label: 'PDF' },
          { value: 'word', label: 'Word' },
          { value: 'excel', label: 'Excel' },
          { value: 'ppt', label: 'PPT' },
          { value: 'image', label: '图片' },
        ],
      },
      renderCell: (row) => {
        const doc = row as any;
        const type = doc.content_type ? getFileType(doc.content_type) : 'pdf';
        const color = TYPE_COLORS[type] || '#9ca3af';
        const label = TYPE_LABELS[type] || type;
        return (
          <Chip
            size='small'
            label={label}
            sx={{
              bgcolor: `${color}15`,
              color: color,
              fontWeight: 500,
            }}
          />
        );
      },
    },
    {
      name: 'size',
      label: '大小',
      type: 'text',
      listWidth: 100,
      renderCell: (row) => (
        <Typography variant='body2' color='text.secondary'>
          {formatFileSize((row as any).size || 0)}
        </Typography>
      ),
    },
    {
      name: 'folder_id',
      label: '所在文件夹',
      type: 'text',
      listWidth: 140,
      renderCell: (row) => (
        <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
          <FolderOpen size={14} style={{ color: '#6b7280' }} />
          <Typography variant='body2' color='text.secondary'>
            {(row as any).folder_id || '根目录'}
          </Typography>
        </Stack>
      ),
    },
    {
      name: 'updated_at',
      label: '修改时间',
      type: 'datetime',
      listWidth: 160,
      hideInForm: true,
      renderCell: (row) => (
        <Typography variant='body2' color='text.secondary'>
          {new Date((row as any).updated_at).toLocaleString('zh-CN')}
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
        label: '类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: 'PDF', value: 'pdf' },
          { label: 'Word', value: 'word' },
          { label: 'Excel', value: 'excel' },
          { label: 'PPT', value: 'ppt' },
          { label: '图片', value: 'image' },
        ],
      },
      {
        id: 'category',
        label: '分类',
        type: 'select',
        options: [
          { label: '全部分类', value: 'all' },
          { label: '工作', value: 'work' },
          { label: '个人', value: 'personal' },
          { label: '项目', value: 'project' },
        ],
      },
    ],
  },

  actions: ['detail', 'delete'],

  formColCount: 2,
  detailTitle: '文档详情',
};
