/**
 * @done V79 Phase 2 split
 * Chart-like visualizations for the inventory report:
 *  - InventoryReportABCOverview: A/B/C category overview cards (Tab 1)
 *  - InventoryReportTurnoverSummary: turnover summary stat boxes (Tab 2)
 *  - InventoryReportValueDistribution: warehouse value distribution with
 *    progress-bar visualization (Tab 3)
 *
 * Note: the original page uses MUI Box-based progress bars rather than a
 * chart library (e.g. ECharts). These visualizations are gathered here so
 * a real chart library can be dropped in later without touching the tables.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Card, CardContent, Chip, Grid } from '@mui/material';
import type { ABCAnalysisItem, InventoryTurnoverData, InventoryValueByWarehouse } from '@/api/wms';

interface InventoryReportABCOverviewProps {
  abcAnalysis: ABCAnalysisItem[];
  abcTotalSku: number;
}

export const InventoryReportABCOverview: React.FC<InventoryReportABCOverviewProps> = ({
  abcAnalysis,
  abcTotalSku,
}) => {
  const { t } = useTranslation();
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant='h6'>{t('wms.inventory_report_page.abc_overview_title')}</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Chip
              label={t('wms.inventory_report_page.abc_a_label')}
              color='error'
              variant='outlined'
            />
            <Chip
              label={t('wms.inventory_report_page.abc_b_label')}
              color='warning'
              variant='outlined'
            />
            <Chip
              label={t('wms.inventory_report_page.abc_c_label')}
              color='success'
              variant='outlined'
            />
          </Box>
        </Box>
        <Grid
          container
          spacing={2}
        >
          <Grid size={{ xs: 6, md: 3 }}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700, color: 'error.dark' }}
              >
                {abcAnalysis.filter((item) => item.category === 'A').length}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {t('wms.inventory_report_page.abc_a_sku_count')}
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700, color: 'warning.dark' }}
              >
                {abcAnalysis.filter((item) => item.category === 'B').length}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {t('wms.inventory_report_page.abc_b_sku_count')}
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700, color: 'success.dark' }}
              >
                {abcAnalysis.filter((item) => item.category === 'C').length}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {t('wms.inventory_report_page.abc_c_sku_count')}
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700 }}
              >
                {abcTotalSku}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {t('wms.inventory_report_page.abc_total_sku_count')}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

interface InventoryReportTurnoverSummaryProps {
  turnoverData: InventoryTurnoverData[];
  formatNumber: (num: number) => string;
}

export const InventoryReportTurnoverSummary: React.FC<InventoryReportTurnoverSummaryProps> = ({
  turnoverData,
  formatNumber,
}) => {
  const { t } = useTranslation();
  const latest = turnoverData.length > 0 ? turnoverData[turnoverData.length - 1] : undefined;
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography
          variant='h6'
          sx={{ mb: 2 }}
        >
          {t('wms.inventory_report_page.turnover_title')}
        </Typography>
        <Grid
          container
          spacing={2}
        >
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700 }}
              >
                {latest ? latest.turnover_rate.toFixed(2) : '0.00'}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {t('wms.inventory_report_page.current_turnover_rate')}
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700 }}
              >
                {latest ? latest.turnover_days.toFixed(0) : '0'}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {t('wms.inventory_report_page.current_turnover_days')}
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700 }}
              >
                ¥{formatNumber(latest?.average_inventory_value || 0)}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {t('wms.inventory_report_page.avg_inventory_value')}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

interface InventoryReportValueDistributionProps {
  valueByWarehouse: InventoryValueByWarehouse[];
  totalWarehouseValue: number;
  formatNumber: (num: number) => string;
}

export const InventoryReportValueDistribution: React.FC<InventoryReportValueDistributionProps> = ({
  valueByWarehouse,
  totalWarehouseValue,
  formatNumber,
}) => {
  const { t } = useTranslation();
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant='h6'>
            {t('wms.inventory_report_page.value_distribution_title')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {t('wms.inventory_report_page.total_value_currency', {
              v0: formatNumber(totalWarehouseValue),
            })}
          </Typography>
        </Box>
        <Grid
          container
          spacing={2}
        >
          {valueByWarehouse.map((item, index) => {
            const percentage =
              totalWarehouseValue > 0 ? (item.total_value / totalWarehouseValue) * 100 : 0;
            return (
              <Grid
                size={{ xs: 12 }}
                key={index}
              >
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant='body1'>{item.warehouse_name}</Typography>
                    <Typography variant='body1'>
                      ¥{formatNumber(item.total_value)} ({percentage.toFixed(1)}%)
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      height: 8,
                      bgcolor: 'grey.200',
                      borderRadius: 1,
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        height: '100%',
                        width: `${percentage}%`,
                        bgcolor:
                          index === 0
                            ? 'primary.main'
                            : index === 1
                              ? 'secondary.main'
                              : 'grey.500',
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      SKU: {item.sku_count}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {t('wms.inventory_report_page.quantity_label', {
                        v0: formatNumber(item.total_quantity),
                      })}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            );
          })}
          {valueByWarehouse.length === 0 && (
            <Grid size={{ xs: 12 }}>
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <Typography color='text.secondary'>
                  {t('wms.inventory_report_page.empty_data')}
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

const InventoryReportChart = {
  InventoryReportABCOverview,
  InventoryReportTurnoverSummary,
  InventoryReportValueDistribution,
};

export default InventoryReportChart;
