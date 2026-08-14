import React from 'react';
import { Search, RefreshCw } from 'lucide-react';
import {
  Box,
  Tabs,
  Tab,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  InputAdornment,
} from '@mui/material';
import i18n from '@/i18n';
import type { VoucherManagementReturn } from '../hooks/useVoucherManagement';
export type VoucherFiltersProps = VoucherManagementReturn;
const VoucherFilters: React.FC<VoucherFiltersProps> = (vm) => {
  const {
    activeTab,
    handleTabChange,
    tabs,
    searchQuery,
    setSearchQuery,
    voucherTypeFilter,
    setVoucherTypeFilter,
    periodFilter,
    setPeriodFilter,
    setPage,
    vouchersQuery,
  } = vm;
  return (
    <>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {tab.label}
                <Chip
                  label={tab.count}
                  size='small'
                  sx={{ height: 20, minWidth: 24 }}
                />
              </Box>
            }
          />
        ))}
      </Tabs>
      <Box
        sx={{
          p: 2,
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
          placeholder={i18n.t('erp.voucher_mgmt.label.search_placeholder')}
          value={searchQuery}
          // @controlled-uncontrolled-mixed uses {value + onChange} two-way binding + V79 will migrate to Controller
          onChange={(e) => setSearchQuery(e.target.value)}
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
          <InputLabel>{i18n.t('erp.voucher_mgmt.label.voucher_type')}</InputLabel>
          <Select
            value={voucherTypeFilter}
            label={i18n.t('erp.voucher_mgmt.label.voucher_type')}
            onChange={(e) => {
              setVoucherTypeFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value=''>{i18n.t('erp.voucher_mgmt.label.all_types')}</MenuItem>
            <MenuItem value={i18n.t('erp.voucher_mgmt.voucher_type_short.receipt')}>
              {i18n.t('erp.voucher_mgmt.voucher_type.receipt')}
            </MenuItem>
            <MenuItem value={i18n.t('erp.voucher_mgmt.voucher_type_short.payment')}>
              {i18n.t('erp.voucher_mgmt.voucher_type.payment')}
            </MenuItem>
            <MenuItem value={i18n.t('erp.voucher_mgmt.voucher_type_short.transfer')}>
              {i18n.t('erp.voucher_mgmt.voucher_type.transfer')}
            </MenuItem>
            <MenuItem value={i18n.t('erp.voucher_mgmt.voucher_type_short.accounting')}>
              {i18n.t('erp.voucher_mgmt.voucher_type.accounting')}
            </MenuItem>
          </Select>
        </FormControl>
        <FormControl
          size='small'
          sx={{ minWidth: 160 }}
        >
          <InputLabel>{i18n.t('erp.voucher_mgmt.label.period')}</InputLabel>
          <Select
            value={periodFilter}
            label={i18n.t('erp.voucher_mgmt.label.period')}
            onChange={(e) => {
              setPeriodFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value=''>{i18n.t('erp.voucher_mgmt.label.all_periods')}</MenuItem>
            <MenuItem value='2024-01'>{i18n.t('erp.voucher_mgmt.period.2024_01')}</MenuItem>
            <MenuItem value='2024-02'>{i18n.t('erp.voucher_mgmt.period.2024_02')}</MenuItem>
            <MenuItem value='2024-03'>{i18n.t('erp.voucher_mgmt.period.2024_03')}</MenuItem>
            <MenuItem value='2024-04'>{i18n.t('erp.voucher_mgmt.period.2024_04')}</MenuItem>
            <MenuItem value='2024-05'>{i18n.t('erp.voucher_mgmt.period.2024_05')}</MenuItem>
            <MenuItem value='2024-06'>{i18n.t('erp.voucher_mgmt.period.2024_06')}</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant='outlined'
          size='small'
          startIcon={<RefreshCw size={16} />}
          onClick={() => vouchersQuery.refetch()}
        >
          {i18n.t('erp.voucher_mgmt.label.refresh')}
        </Button>
      </Box>
    </>
  );
};
export default VoucherFilters;