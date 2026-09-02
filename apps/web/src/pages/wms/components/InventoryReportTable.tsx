/**
 * @done V79 Phase 2 split
 * Report tables for the inventory report:
 *  - InventoryReportABCTable: ABC analysis detail table (Tab 1)
 *  - InventoryReportTurnoverTable: turnover detail table (Tab 2)
 *  - InventoryReportValueByWarehouseTable: warehouse inventory detail table (Tab 3)
 * Each sub-component is exported individually so the page can compose them
 * alongside their respective summary cards / charts.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Grid } from '@/components/common';
import type { ABCAnalysisItem, InventoryTurnoverData, InventoryValueByWarehouse } from '@/api/wms';

interface InventoryReportABCTableProps {
  abcAnalysis: ABCAnalysisItem[];
  formatNumber: (num: number) => string;
  getABCCategoryColor: (category: string) => string;
}

export const InventoryReportABCTable: React.FC<InventoryReportABCTableProps> = ({
  abcAnalysis,
  formatNumber,
  getABCCategoryColor,
}) => {
  const { t } = useTranslation();
  return (
    <Card>
      <CardContent>
        <Typography
          variant='h6'
          sx={{ mb: 2 }}
        >
          {t('wms.inventory_report_page.abc_detail_title')}
        </Typography>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell>{t('wms.inventory_report_page.col_category')}</TableCell>
                <TableCell align='right'>{t('wms.inventory_report_page.col_sku_count')}</TableCell>
                <TableCell align='right'>
                  {t('wms.inventory_report_page.col_sku_percentage')}
                </TableCell>
                <TableCell align='right'>
                  {t('wms.inventory_report_page.col_total_value')}
                </TableCell>
                <TableCell align='right'>
                  {t('wms.inventory_report_page.col_value_percentage')}
                </TableCell>
                <TableCell align='right'>
                  {t('wms.inventory_report_page.col_cumulative_value_percentage')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {abcAnalysis.map((item, index) => (
                <TableRow
                  key={index}
                  sx={{
                    bgcolor:
                      item.category === 'A'
                        ? 'error.50'
                        : item.category === 'B'
                          ? 'warning.50'
                          : 'success.50',
                  }}
                >
                  <TableCell>
                    <Chip
                      label={item.category}
                      color={getABCCategoryColor(item.category) as 'error' | 'warning' | 'success'}
                      size='small'
                    />
                  </TableCell>
                  <TableCell align='right'>{item.sku_count}</TableCell>
                  <TableCell align='right'>{(item.sku_percentage * 100).toFixed(2)}%</TableCell>
                  <TableCell align='right'>¥{formatNumber(item.total_value)}</TableCell>
                  <TableCell align='right'>{(item.value_percentage * 100).toFixed(2)}%</TableCell>
                  <TableCell align='right'>
                    {(item.cumulative_value_percentage * 100).toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))}
              {abcAnalysis.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    sx={{ textAlign: 'center' }}
                  >
                    {t('wms.inventory_report_page.empty_data')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

interface InventoryReportTurnoverTableProps {
  turnoverData: InventoryTurnoverData[];
  formatNumber: (num: number) => string;
}

export const InventoryReportTurnoverTable: React.FC<InventoryReportTurnoverTableProps> = ({
  turnoverData,
  formatNumber,
}) => {
  const { t } = useTranslation();
  return (
    <Card>
      <CardContent>
        <Typography
          variant='h6'
          sx={{ mb: 2 }}
        >
          {t('wms.inventory_report_page.turnover_detail_title')}
        </Typography>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell>{t('wms.inventory_report_page.col_period')}</TableCell>
                <TableCell align='right'>
                  {t('wms.inventory_report_page.col_turnover_rate')}
                </TableCell>
                <TableCell align='right'>
                  {t('wms.inventory_report_page.col_turnover_days')}
                </TableCell>
                <TableCell align='right'>{t('wms.inventory_report_page.col_cogs')}</TableCell>
                <TableCell align='right'>
                  {t('wms.inventory_report_page.col_avg_inventory')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {turnoverData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.period}</TableCell>
                  <TableCell align='right'>{item.turnover_rate.toFixed(2)}</TableCell>
                  <TableCell align='right'>{item.turnover_days.toFixed(0)}</TableCell>
                  <TableCell align='right'>¥{formatNumber(item.cost_of_goods_sold)}</TableCell>
                  <TableCell align='right'>¥{formatNumber(item.average_inventory_value)}</TableCell>
                </TableRow>
              ))}
              {turnoverData.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    sx={{ textAlign: 'center' }}
                  >
                    {t('wms.inventory_report_page.empty_data')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

interface InventoryReportValueByWarehouseTableProps {
  valueByWarehouse: InventoryValueByWarehouse[];
  totalWarehouseValue: number;
  formatNumber: (num: number) => string;
}

export const InventoryReportValueByWarehouseTable: React.FC<
  InventoryReportValueByWarehouseTableProps
> = ({ valueByWarehouse, totalWarehouseValue, formatNumber }) => {
  const { t } = useTranslation();
  return (
    <Card>
      <CardContent>
        <Typography
          variant='h6'
          sx={{ mb: 2 }}
        >
          {t('wms.inventory_report_page.warehouse_inventory_detail')}
        </Typography>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell>{t('wms.inventory_report_page.col_warehouse')}</TableCell>
                <TableCell align='right'>{t('wms.inventory_report_page.col_sku_count')}</TableCell>
                <TableCell align='right'>{t('wms.inventory_report_page.col_quantity')}</TableCell>
                <TableCell align='right'>
                  {t('wms.inventory_report_page.field_total_value')}
                </TableCell>
                <TableCell align='right'>
                  {t('wms.inventory_report_page.col_value_percentage')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {valueByWarehouse.map((item, index) => {
                const percentage =
                  totalWarehouseValue > 0 ? (item.total_value / totalWarehouseValue) * 100 : 0;
                return (
                  <TableRow key={index}>
                    <TableCell>{item.warehouse_name}</TableCell>
                    <TableCell align='right'>{item.sku_count}</TableCell>
                    <TableCell align='right'>{formatNumber(item.total_quantity)}</TableCell>
                    <TableCell align='right'>¥{formatNumber(item.total_value)}</TableCell>
                    <TableCell align='right'>{percentage.toFixed(2)}%</TableCell>
                  </TableRow>
                );
              })}
              {valueByWarehouse.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    sx={{ textAlign: 'center' }}
                  >
                    {t('wms.inventory_report_page.empty_data')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

/**
 * Convenience wrapper that renders the empty-state placeholder used across
 * the chart / summary regions when no data is available.
 */
export const InventoryReportEmptyState: React.FC<{ colSpan?: number }> = ({ colSpan = 12 }) => {
  const { t } = useTranslation();
  return (
    <Grid
      item
      xs={12}
      md={colSpan}
    >
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <Typography color='text.secondary'>{t('wms.inventory_report_page.empty_data')}</Typography>
      </Box>
    </Grid>
  );
};

const InventoryReportTable = {
  InventoryReportABCTable,
  InventoryReportTurnoverTable,
  InventoryReportValueByWarehouseTable,
  InventoryReportEmptyState,
};

export default InventoryReportTable;
