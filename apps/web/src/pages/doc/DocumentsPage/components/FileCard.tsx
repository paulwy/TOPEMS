import { designTokens } from '@topems/tokens';
import React from 'react';
import { Card, CardContent, Box, Typography, Button, Tooltip, Chip } from '@mui/material';
import { FileText, Star, MoreVertical, Download, Eye, Share2, CheckCircle } from 'lucide-react';
import type { FileItem } from '../types';
import i18n from '@/i18n';

interface FileCardProps {
  file: FileItem;
  onStarToggle: (id: string) => void;
  onDownload: (file: FileItem) => void;
  onPreview: (file: FileItem) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onClick?: (file: FileItem) => void;
}

const FileCard: React.FC<FileCardProps> = ({
  file,
  onStarToggle,
  onDownload,
  onPreview,
  isSelected = false,
  onSelect,
  onClick,
}) => {
  return (
    <Card
      sx={{
        '&:hover': { boxShadow: 6 },
        transition: 'box-shadow 0.2s',
        cursor: 'pointer',
        position: 'relative',
        '&:hover .hidden-actions': { opacity: 1 },
        ...(isSelected && { ring: 2, ringColor: 'primary.main' }),
      }}
      onClick={() => onClick?.(file)}
    >
      {onSelect && (
        <Box sx={{ position: 'absolute', top: 1, left: 1, zIndex: 1 }}>
          <Box
            onClick={(e) => {
              e.stopPropagation();
              onSelect(file.id);
            }}
            sx={{
              width: 20,
              height: 20,
              borderRadius: 'xs',
              border: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              borderColor: isSelected ? 'primary.main' : 'grey.300',
              bgcolor: isSelected ? 'primary.main' : 'var(--color-primary-foreground)',
              cursor: 'pointer',
            }}
          >
            {isSelected && (
              <CheckCircle
                sx={{
                  width: 12,
                  height: 12,
                  color: 'common.white',
                }}
              />
            )}
          </Box>
        </Box>
      )}
      <CardContent sx={{ p: 3 }}>
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
              width: 56,
              height: 56,
              borderRadius: 3,
              bgcolor: 'secondary.100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText sx={{ width: 28, height: 28, color: 'secondary.main' }} />
          </Box>
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0 }}
            className='hidden-actions'
          >
            <Tooltip title={i18n.t('pages.file_card.k0')}>
              <span>
                <Button
                  variant='text'
                  size='small'
                  onClick={(e) => {
                    e.stopPropagation();
                    onStarToggle(file.id);
                  }}
                >
                  <Star
                    sx={{
                      width: 16,
                      height: 16,
                      color: file.starred ? 'warning.main' : 'grey.400',
                    }}
                    style={{ fill: file.starred ? 'currentColor' : 'none' }}
                  />
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={i18n.t('pages.file_card.k1')}>
              <span>
                <Button
                  variant='text'
                  size='small'
                >
                  <MoreVertical sx={{ width: 16, height: 16, color: 'grey.400' }} />
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>
        <Typography
          variant='h6'
          sx={{
            fontWeight: 600,
            color: 'grey.900',
            mb: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {file.name}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            color: 'grey.500',
            mb: 1.5,
          }}
        >
          {file.size && <span>{file.size}</span>}
          {file.size && <span style={{ margin: `0 ${designTokens.spacing.sm}px` }}>•</span>}
          <span>{file.updatedAt}</span>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {file.tags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size='small'
              variant='outlined'
            />
          ))}
        </Box>
      </CardContent>
      <Box
        sx={{
          px: 3,
          py: 1.5,
          bgcolor: 'grey.50',
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          opacity: 0,
        }}
        className='hidden-actions'
      >
        <Button
          variant='text'
          size='small'
          onClick={(e) => {
            e.stopPropagation();
            onPreview(file);
          }}
        >
          <Eye sx={{ width: 16, height: 16, mr: 1 }} />
          {i18n.t('pages.file_card.k0')}
        </Button>
        <Button
          variant='text'
          size='small'
          onClick={(e) => {
            e.stopPropagation();
            onDownload(file);
          }}
        >
          <Download sx={{ width: 16, height: 16, mr: 1 }} />
          {i18n.t('pages.file_card.k1')}
        </Button>
        <Button
          variant='text'
          size='small'
        >
          <Share2 sx={{ width: 16, height: 16, mr: 1 }} />
          {i18n.t('pages.file_card.k2')}
        </Button>
      </Box>
    </Card>
  );
};

export default FileCard;
