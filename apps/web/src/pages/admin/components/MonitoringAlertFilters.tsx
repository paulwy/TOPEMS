/**
 * @done V79 Phase 2 split - Monitoring Alert Filters Component
 */
import React from 'react';
import { Box, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Search } from 'lucide-react';
import i18n from '@/i18n';
export interface MonitoringAlertFiltersProps {
  searchQuery: string;
  filterLevel: string;
  filterStatus: string;
  onSearchChange: (query: string) => void;
  onLevelChange: (level: string) => void;
  onStatusChange: (status: string) => void;
}
export const MonitoringAlertFilters: React.FC<MonitoringAlertFiltersProps> = ({
  searchQuery,
  filterLevel,
  filterStatus,
  onSearchChange,
  onLevelChange,
  onStatusChange,
}) => {
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', p: 0 }}>
      <TextField
        fullWidth
        label={i18n.t('admin.monitoring_alert.search')}
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={i18n.t('admin.monitoring_alert.search_alert_content')}
        slotProps={{
          input: {
            startAdornment: <Search className='w-4 h-4 mr-2 text-gray-400' />,
          },
        }}
        sx={{ minWidth: 240, flex: 1 }}
        size='small'
      />
      <FormControl
        sx={{ minWidth: 120 }}
        size='small'
      >
        <InputLabel>{i18n.t('admin.monitoring_alert.level')}</InputLabel>
        <Select
          value={filterLevel}
          onChange={(e) => onLevelChange(e.target.value)}
          label={i18n.t('admin.monitoring_alert.level')}
        >
          <MenuItem value='all'>{i18n.t('admin.monitoring_alert.all_levels')}</MenuItem>
          <MenuItem value='critical'>{i18n.t('admin.monitoring_alert.critical')}</MenuItem>
          <MenuItem value='warning'>{i18n.t('admin.monitoring_alert.warning')}</MenuItem>
          <MenuItem value='info'>{i18n.t('admin.monitoring_alert.info')}</MenuItem>
        </Select>
      </FormControl>
      <FormControl
        sx={{ minWidth: 120 }}
        size='small'
      >
        <InputLabel>{i18n.t('admin.monitoring_alert.status')}</InputLabel>
        <Select
          value={filterStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          label={i18n.t('admin.monitoring_alert.status')}
        >
          <MenuItem value='all'>{i18n.t('admin.monitoring_alert.all_status')}</MenuItem>
          <MenuItem value='pending'>{i18n.t('admin.monitoring_alert.pending')}</MenuItem>
          <MenuItem value='acknowledged'>{i18n.t('admin.monitoring_alert.acknowledged')}</MenuItem>
          <MenuItem value='resolved'>{i18n.t('admin.monitoring_alert.resolved')}</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};
export default MonitoringAlertFilters;