import React from 'react';
import {
  Box,
  Card,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import { Search, Grid, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TemplateCategory } from '@/api/template';

interface TemplateFilterProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  categories: TemplateCategory[];
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  onRefresh: () => void;
}

const TemplateFilter: React.FC<TemplateFilterProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  categories,
  viewMode,
  setViewMode,
  onRefresh,
}) => {
  const { t } = useTranslation();

  return (
    <Card sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ position: 'relative', flex: 1 }}>
          <Search
            sx={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 20,
              height: 20,
              color: 'grey.400',
            }}
          />
          <TextField
            placeholder={t('report.template_management_page.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ pl: 5, width: '100%' }}
            size='small'
          />
        </Box>

        <FormControl
          size='small'
          sx={{ minWidth: 150 }}
        >
          <InputLabel>{t('report.template_management_page.all_categories')}</InputLabel>
          <Select
            value={selectedCategory}
            label={t('report.template_management_page.all_categories')}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <MenuItem value=''>{t('report.template_management_page.all_categories')}</MenuItem>
            {categories.map((cat) => (
              <MenuItem
                key={cat.id}
                value={cat.code}
              >
                {cat.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', border: 1, borderColor: 'divider' }}>
          <Button
            variant={viewMode === 'grid' ? 'contained' : 'text'}
            onClick={() => setViewMode('grid')}
            sx={{ borderRadius: 0 }}
          >
            <Grid sx={{ width: 20, height: 20 }} />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'contained' : 'text'}
            onClick={() => setViewMode('list')}
            sx={{ borderRadius: 0 }}
          >
            <List sx={{ width: 20, height: 20 }} />
          </Button>
        </Box>

        <Button
          variant='outlined'
          onClick={onRefresh}
        >
          {t('report.template_management_page.refresh')}
        </Button>
      </Box>
    </Card>
  );
};

export default TemplateFilter;
