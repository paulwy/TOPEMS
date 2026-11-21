import React from 'react';
import { Box, TextField, CircularProgress, Paper, Chip, Typography, useTheme } from '@mui/material';
import { Search, FolderOpen, Tag, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DictType } from '@/api/system';

interface DictionarySidebarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  typesLoading: boolean;
  groupedTypes: Record<string, DictType[]>;
  selectedTypeId?: string;
  onSelectType: (type: DictType) => void;
}

const DictionarySidebar: React.FC<DictionarySidebarProps> = ({
  searchQuery,
  onSearchChange,
  typesLoading,
  groupedTypes,
  selectedTypeId,
  onSelectType,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const categoryLabels: Record<string, string> = {
    system: t('admin.dictionary_management.system_dictionary'),
    business: t('admin.dictionary_management.business_dictionary'),
    basic: t('admin.dictionary_management.base_data'),
    custom: t('admin.dictionary_management.custom_dictionary'),
  };

  return (
    <Box sx={{ width: 320, flexShrink: 0 }}>
      <Paper sx={{ p: 2 }}>
        <Box sx={{ position: 'relative', mb: 2 }}>
          <TextField
            type='text'
            placeholder={t('admin.dictionary_management_page.attr_9427f4')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            size='small'
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <Box
                    component='span'
                    sx={{ mr: 1, display: 'flex', alignItems: 'center' }}
                  >
                    <Search
                      size={16}
                      style={{ color: theme.palette.text.disabled }}
                    />
                  </Box>
                ),
              },
            }}
          />
        </Box>

        {typesLoading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Object.entries(groupedTypes).map(([category, types]) => (
                <Box key={category}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <FolderOpen
                      size={16}
                      style={{ color: theme.palette.text.secondary }}
                    />
                    <Typography
                      variant='caption'
                      sx={{
                        fontWeight: 500,
                        color: 'text.secondary',
                        textTransform: 'uppercase',
                      }}
                    >
                      {categoryLabels[category] || category}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {types.map((type) => (
                      <Box
                        key={type.id}
                        onClick={() => onSelectType(type)}
                        sx={{
                          p: 1.5,
                          borderRadius: 1,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          border: 1,
                          borderColor: selectedTypeId === type.id ? 'primary.main' : 'transparent',
                          bgcolor: selectedTypeId === type.id ? 'primary.50' : 'transparent',
                          '&:hover': {
                            bgcolor: selectedTypeId === type.id ? 'primary.50' : 'action.hover',
                          },
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
                            <Tag
                              size={16}
                              style={{ color: theme.palette.text.disabled }}
                            />
                            <Box>
                              <Typography
                                variant='body2'
                                sx={{ fontWeight: 500 }}
                              >
                                {type.name}
                              </Typography>
                              <Typography
                                variant='caption'
                                color='text.secondary'
                              >
                                {type.code}
                              </Typography>
                            </Box>
                          </Box>
                          <ChevronRight
                            size={16}
                            style={{ color: theme.palette.text.disabled }}
                          />
                        </Box>
                        <Chip
                          label={
                            type.status === 'active'
                              ? ` + ${t('admin.dictionary_management.enable')} + `
                              : t('admin.dictionary_management.disable')
                          }
                          size='small'
                          variant='outlined'
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default DictionarySidebar;
