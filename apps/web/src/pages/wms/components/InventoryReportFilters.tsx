/**
 * @done V79 Phase 2 split
 * Top filter bar: report tabs (statistics / ABC / turnover / warehouse value)
 * + warehouse selector. Also re-exports the TabPanel helper used by the page
 * to render each tab's content.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import type { Warehouse } from '@/api/wms';

export interface InventoryReportFiltersProps {
  currentTab: number;
  onTabChange: (tab: number) => void;
  warehouseFilter: string;
  onWarehouseFilterChange: (value: string) => void;
  warehouses: Warehouse[];
}

const InventoryReportFilters: React.FC<InventoryReportFiltersProps> = ({
  currentTab,
  onTabChange,
  warehouseFilter,
  onWarehouseFilterChange,
  warehouses,
}) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => onTabChange(newValue)}
        >
          <Tab label={t('wms.inventory_report_page.tab_statistics')} />
          <Tab label={t('wms.inventory_report_page.tab_abc')} />
          <Tab label={t('wms.inventory_report_page.tab_turnover')} />
          <Tab label={t('wms.inventory_report_page.tab_warehouse')} />
        </Tabs>
      </Box>
      <FormControl
        size='small'
        sx={{ minWidth: 200 }}
      >
        <InputLabel>{t('wms.inventory_report_page.filter_warehouse_label')}</InputLabel>
        <Select
          value={warehouseFilter}
          label={t('wms.inventory_report_page.filter_warehouse')}
          onChange={(e) => onWarehouseFilterChange(e.target.value)}
        >
          <MenuItem value=''>{t('wms.inventory_report_page.all_warehouses')}</MenuItem>
          {warehouses.map((w) => (
            <MenuItem
              key={w.id}
              value={w.id}
            >
              {w.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

export const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`inventory-tabpanel-${index}`}
      aria-labelledby={`inventory-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

/**
 * Small helper kept here to avoid pulling Typography into the page file
 * when only the empty/placeholder copy is needed. Currently unused by the
 * page but exported for future filter-auxiliary text.
 */
const InventoryReportFilterHint: React.FC<{ text: string }> = ({ text }) => (
  <Typography
    variant='caption'
    color='text.secondary'
    sx={{ ml: 1 }}
  >
    {text}
  </Typography>
);

export default InventoryReportFilters;
