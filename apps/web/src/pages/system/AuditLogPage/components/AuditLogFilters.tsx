import React from 'react';
import { Search, Calendar, X } from 'lucide-react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  InputAdornment,
  Typography,
  Paper,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { AuditLogFilters } from '../hooks/useAuditLog';

interface AuditLogFiltersProps {
  filters: AuditLogFilters;
  updateFilter: (key: keyof AuditLogFilters, value: string) => void;
  clearFilters: () => void;
  uniqueUsers: string[];
  uniqueActions: string[];
  uniqueEntityTypes: string[];
  formatAction: (action: string) => string;
}

const AuditLogFilters: React.FC<AuditLogFiltersProps> = ({
  filters,
  updateFilter,
  clearFilters,
  uniqueUsers,
  uniqueActions,
  uniqueEntityTypes,
  formatAction,
}) => {
  const { t } = useTranslation();

  const hasActiveFilters =
    filters.startDate ||
    filters.endDate ||
    filters.userFilter ||
    filters.actionFilter ||
    filters.entityTypeFilter ||
    filters.statusFilter;

  return (
    <Paper
      sx={{
        borderRadius: 3,
        boxShadow: 1,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          p: 3,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <TextField
          size='small'
          placeholder={t('system.auditPage.search_placeholder')}
          value={filters.searchQuery}
          onChange={(e) => updateFilter('searchQuery', e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <Search
                    size={16}
                    style={{ opacity: 0.5 }}
                  />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 280 }}
        />

        <FormControl
          size='small'
          sx={{ minWidth: 140 }}
        >
          <InputLabel>{t('system.field.user')}</InputLabel>
          <Select
            value={filters.userFilter}
            label={t('system.field.user')}
            onChange={(e) => updateFilter('userFilter', e.target.value)}
          >
            <MenuItem value=''>{t('system.message.all_users')}</MenuItem>
            {uniqueUsers.map((user) => (
              <MenuItem
                key={user}
                value={user}
              >
                {user}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl
          size='small'
          sx={{ minWidth: 140 }}
        >
          <InputLabel>{t('system.field.operation_type')}</InputLabel>
          <Select
            value={filters.actionFilter}
            label={t('system.field.operation_type')}
            onChange={(e) => updateFilter('actionFilter', e.target.value)}
          >
            <MenuItem value=''>{t('system.message.all_types')}</MenuItem>
            {uniqueActions.map((action) => (
              <MenuItem
                key={action}
                value={action}
              >
                {formatAction(action)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl
          size='small'
          sx={{ minWidth: 140 }}
        >
          <InputLabel>{t('system.field.entity_type')}</InputLabel>
          <Select
            value={filters.entityTypeFilter}
            label={t('system.field.entity_type')}
            onChange={(e) => updateFilter('entityTypeFilter', e.target.value)}
          >
            <MenuItem value=''>{t('system.message.all_entities')}</MenuItem>
            {uniqueEntityTypes.map((type) => (
              <MenuItem
                key={type}
                value={type}
              >
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl
          size='small'
          sx={{ minWidth: 120 }}
        >
          <InputLabel>{t('system.field.status')}</InputLabel>
          <Select
            value={filters.statusFilter}
            label={t('system.field.status')}
            onChange={(e) => updateFilter('statusFilter', e.target.value)}
          >
            <MenuItem value=''>{t('system.message.all_statuses')}</MenuItem>
            <MenuItem value='success'>{t('system.status.success')}</MenuItem>
            <MenuItem value='failed'>{t('system.status.failed')}</MenuItem>
            <MenuItem value='error'>{t('system.status.error')}</MenuItem>
            <MenuItem value='warning'>{t('system.status.warning')}</MenuItem>
            <MenuItem value='partial'>{t('system.status.partial_success')}</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Calendar
            size={18}
            style={{ opacity: 0.5 }}
          />
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {t('system.field.time_range')}
          </Typography>
        </Box>

        <TextField
          size='small'
          label={t('system.field.start_time')}
          type='datetime-local'
          value={filters.startDate}
          onChange={(e) => updateFilter('startDate', e.target.value)}
          sx={{ width: 200 }}
          slotProps={{ inputLabel: { shrink: true } } as const}
        />
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {t('system.field.to')}
        </Typography>
        <TextField
          size='small'
          label={t('system.field.end_time')}
          type='datetime-local'
          value={filters.endDate}
          onChange={(e) => updateFilter('endDate', e.target.value)}
          sx={{ width: 200 }}
          slotProps={{ inputLabel: { shrink: true } } as const}
        />

        {hasActiveFilters && (
          <Button
            variant='text'
            color='error'
            onClick={clearFilters}
            startIcon={<X size={14} />}
          >
            {t('system.action.clear_filter')}
          </Button>
        )}
      </Box>
    </Paper>
  );
};

export default AuditLogFilters;
