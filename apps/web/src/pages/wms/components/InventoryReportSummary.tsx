/**
 * @done V79 Phase 2 split
 * Top summary cards + alert overview (Tab 0: statistics).
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Card, CardContent, Grid } from '@mui/material';
import {
  BarChart3,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { designTokens } from '@/theme/tokens';
import type { InventoryStatistics } from '@/api/wms';

const ct= designTokens.colors;

export interface InventoryReportSummaryProps {
  statistics: InventoryStatistics | undefined;
  formatNumber: (num: number) => string;
}

const InventoryReportSummary: React.FC<InventoryReportSummaryProps> = ({
  statistics,
  formatNumber,
}) => {
  const { t } = useTranslation();

  return (
    <Box>
      <Grid
        container
        spacing={3}
        sx={{ mb: 3 }}
      >
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WarehouseIcon
                  style={{ width: 20, height: 20, marginRight: 8, color: ct.secondary[400] }}
                />
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                >
                  {t('wms.inventory_report_page.field_warehouse_count')}
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700 }}
              >
                {statistics?.warehouse_count || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Package
                  style={{ width: 20, height: 20, marginRight: 8, color: ct.success.main }}
                />
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                >
                  {t('wms.inventory_report_page.field_material_types')}
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700 }}
              >
                {statistics?.total_sku_count || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp
                  style={{ width: 20, height: 20, marginRight: 8, color: ct.warning.main }}
                />
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                >
                  {t('wms.inventory_report_page.field_total_quantity')}
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700 }}
              >
                {formatNumber(statistics?.total_quantity || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BarChart3
                  style={{ width: 20, height: 20, marginRight: 8, color: ct.secondary[500] }}
                />
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                >
                  {t('wms.inventory_report_page.field_total_value')}
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700 }}
              >
                ¥{formatNumber(statistics?.total_value || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid
        container
        spacing={3}
        sx={{ mb: 3 }}
      >
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%', bgcolor: 'error.light' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AlertTriangle
                  style={{ width: 20, height: 20, marginRight: 8, color: ct.error[600] }}
                />
                <Typography
                  variant='subtitle2'
                  color='error.dark'
                >
                  {t('wms.inventory_report_page.field_out_of_stock_items')}
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700, color: 'error.dark' }}
              >
                {statistics?.out_of_stockitems || 0}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {t('wms.inventory_report_page.hint_need_replenishment')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%', bgcolor: 'warning.light' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingDown
                  style={{ width: 20, height: 20, marginRight: 8, color: ct.warning.dark }}
                />
                <Typography
                  variant='subtitle2'
                  color='warning.dark'
                >
                  {t('wms.inventory_report_page.field_low_stock_items')}
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700, color: 'warning.dark' }}
              >
                {statistics?.low_stockitems || 0}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              ></Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%', bgcolor: 'info.light' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Clock style={{ width: 20, height: 20, marginRight: 8, color: ct.info.dark }} />
                <Typography
                  variant='subtitle2'
                  color='info.dark'
                >
                  {t('wms.inventory_report_page.field_avg_turnover_days')}
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700, color: 'info.dark' }}
              >
                {statistics?.average_turnover_days || 0}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {t('wms.inventory_report_page.unit_day')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%', bgcolor: 'success.light' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp
                  style={{ width: 20, height: 20, marginRight: 8, color: ct.success.dark }}
                />
                <Typography
                  variant='subtitle2'
                  color='success.dark'
                >
                  {t('wms.inventory_report_page.field_turnover_rate')}
                </Typography>
              </Box>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700, color: 'success.dark' }}
              >
                {statistics?.turnover_rate || 0}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {t('wms.inventory_report_page.unit_times_per_year')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography
            variant='h6'
            sx={{ mb: 2 }}
          >
            {t('wms.inventory_report_page.section_alert_overview')}
          </Typography>
          <Grid
            container
            spacing={2}
          >
            <Grid size={{ xs: 6, md: 3 }}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {statistics?.low_stockitems || 0}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('wms.inventory_report_page.alert_low_stock')}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {statistics?.out_of_stockitems || 0}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('wms.inventory_report_page.alert_out_of_stock')}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {statistics?.over_stockitems || 0}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('wms.inventory_report_page.alert_overstock')}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {(statistics?.low_stockitems || 0) + (statistics?.out_of_stockitems || 0)}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('wms.inventory_report_page.alert_attention')}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default InventoryReportSummary;
