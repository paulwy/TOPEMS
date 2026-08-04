import React from 'react';
import { useTranslation } from 'react-i18next';
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
} from '@mui/material';

interface OptionItem {
  value: string;
  label: string;
}

interface OperationAuditLogFilterProps {
  userFilter: string;
  setUserFilter: (v: string) => void;
  moduleFilter: string;
  setModuleFilter: (v: string) => void;
  operationFilter: string;
  setOperationFilter: (v: string) => void;
  resourceTypeFilter: string;
  setResourceTypeFilter: (v: string) => void;
  traceIdFilter: string;
  setTraceIdFilter: (v: string) => void;
  successFilter: '' | 'true' | 'false';
  setSuccessFilter: (v: '' | 'true' | 'false') => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  setPage: (v: number) => void;
  moduleOptions: OptionItem[];
  operationOptions: OptionItem[];
  clearFilters: () => void;
}

const OperationAuditLogFilter: React.FC<OperationAuditLogFilterProps> = ({
  userFilter,
  setUserFilter,
  moduleFilter,
  setModuleFilter,
  operationFilter,
  setOperationFilter,
  resourceTypeFilter,
  setResourceTypeFilter,
  traceIdFilter,
  setTraceIdFilter,
  successFilter,
  setSuccessFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  setPage,
  moduleOptions,
  operationOptions,
  clearFilters,
}) => {
  const { t } = useTranslation();

  const hasActiveFilters =
    startDate ||
    endDate ||
    userFilter ||
    moduleFilter ||
    operationFilter ||
    resourceTypeFilter ||
    traceIdFilter ||
    successFilter;

  return (
    <Box
      sx={{
        p: 0,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        alignItems: 'center',
      }}
    >
      <TextField
        size='small'
        placeholder={t('admin.operation_audit_log.filter_by_username')}
        value={userFilter}
        onChange={(e) => {
          setUserFilter(e.target.value);
          setPage(0);
        }}
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
        sx={{ minWidth: 180 }}
      />

      <FormControl
        size='small'
        sx={{ minWidth: 140 }}
      >
        <InputLabel>{t('admin.operation_audit_log.module')}</InputLabel>
        <Select
          value={moduleFilter}
          label={t('admin.operation_audit_log.module')}
          onChange={(e) => {
            setModuleFilter(e.target.value);
            setPage(0);
          }}
        >
          <MenuItem value=''>{t('admin.operation_audit_log.all_modules')}</MenuItem>
          {moduleOptions.map((m) => (
            <MenuItem
              key={m.value}
              value={m.value}
            >
              {m.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl
        size='small'
        sx={{ minWidth: 140 }}
      >
        <InputLabel>{t('admin.operation_audit_log.action_type')}</InputLabel>
        <Select
          value={operationFilter}
          label={t('admin.operation_audit_log.action_type')}
          onChange={(e) => {
            setOperationFilter(e.target.value);
            setPage(0);
          }}
        >
          <MenuItem value=''>{t('admin.operation_audit_log.all_actions')}</MenuItem>
          {operationOptions.map((m) => (
            <MenuItem
              key={m.value}
              value={m.value}
            >
              {m.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        size='small'
        placeholder={t('admin.operation_audit_log.resource_type')}
        value={resourceTypeFilter}
        onChange={(e) => {
          setResourceTypeFilter(e.target.value);
          setPage(0);
        }}
        sx={{ minWidth: 160 }}
      />

      <TextField
        size='small'
        placeholder={t('admin.operation_audit_log_page.attr_22c443')}
        value={traceIdFilter}
        onChange={(e) => {
          setTraceIdFilter(e.target.value);
          setPage(0);
        }}
        sx={{ minWidth: 220 }}
      />

      <FormControl
        size='small'
        sx={{ minWidth: 120 }}
      >
        <InputLabel>{t('admin.operation_audit_log.status')}</InputLabel>
        <Select
          value={successFilter}
          label={t('admin.operation_audit_log.status')}
          onChange={(e) => {
            setSuccessFilter(e.target.value as '' | 'true' | 'false');
            setPage(0);
          }}
        >
          <MenuItem value=''>{t('admin.operation_audit_log.all_status')}</MenuItem>
          <MenuItem value='true'>{t('admin.operation_audit_log.success')}</MenuItem>
          <MenuItem value='false'>{t('admin.operation_audit_log.failed')}</MenuItem>
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
          {t('admin.operation_audit_log_page.text_cd649f')}
        </Typography>
      </Box>

      <TextField
        size='small'
        label={t('admin.operation_audit_log.start_time')}
        type='datetime-local'
        value={startDate}
        onChange={(e) => {
          setStartDate(e.target.value);
          setPage(0);
        }}
        sx={{ width: 200 }}
        slotProps={{ inputLabel: { shrink: true } } as const}
      />
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {t('admin.operation_audit_log.to')}
      </Typography>
      <TextField
        size='small'
        label={t('admin.operation_audit_log.end_time')}
        type='datetime-local'
        value={endDate}
        onChange={(e) => {
          setEndDate(e.target.value);
          setPage(0);
        }}
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
          {t('admin.operation_audit_log_page.text_a95500')}
        </Button>
      )}
    </Box>
  );
};

export default OperationAuditLogFilter;
