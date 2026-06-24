import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  AutoGraph as AutoGraphIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useCrmStore } from '../store/crmStore';
import type { CreateSalesForecastRequest } from '../api/crm';

const PERIOD_TYPES: Array<{ value: 'monthly' | 'quarterly' | 'yearly'; label: string }> = [
  { value: 'monthly', label: '月度' },
  { value: 'quarterly', label: '季度' },
  { value: 'yearly', label: '年度' },
];

const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
  if (trend === 'up') return 'success';
  if (trend === 'down') return 'error';
  return 'default';
};

export const SalesForecastPage: React.FC = () => {
  const { salesForecasts, loading, error, loadSalesForecasts, generateSalesForecast, removeSalesForecast } = useCrmStore();

  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [newForecast, setNewForecast] = useState<CreateSalesForecastRequest>({
    period_type: 'monthly',
    period: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSalesForecasts({ page: 1, pageSize: 20 });
  }, [loadSalesForecasts]);

  const totalPredicted = salesForecasts.reduce((sum, f) => sum + f.predicted_amount, 0);
  const totalActual = salesForecasts.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
  const avgConfidence =
    salesForecasts.length > 0
      ? Math.round(
          (salesForecasts.reduce((sum, f) => sum + f.confidence_level, 0) /
            salesForecasts.length) *
            100
        )
      : 0;

  const handleGenerate = async () => {
    if (!newForecast.period) return;
    setSubmitting(true);
    try {
      await generateSalesForecast(newForecast);
      setGenerateDialogOpen(false);
      setNewForecast({ period_type: 'monthly', period: '' });
    } catch (err) {
      console.error('生成销售预测失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该预测吗？')) return;
    try {
      await removeSalesForecast(id);
    } catch (err) {
      console.error('删除销售预测失败:', err);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            销售预测
          </Typography>
          <Typography variant="body2" color="text.secondary">
            基于历史数据与多维度因子的销售预测
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadSalesForecasts({ page: 1, pageSize: 20 })}
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setGenerateDialogOpen(true)}
          >
            生成预测
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">预测总额</Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 600, color: 'primary.main' }}>
                ¥{totalPredicted.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">实际金额</Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 600, color: 'success.main' }}>
                ¥{totalActual.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">平均置信度</Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 600 }}>
                {avgConfidence}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoGraphIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            预测明细
          </Typography>
        </Box>
        <Divider />
        {loading ? (
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : salesForecasts.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">暂无预测数据</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>周期</TableCell>
                  <TableCell>周期类型</TableCell>
                  <TableCell>预测金额</TableCell>
                  <TableCell>实际金额</TableCell>
                  <TableCell>准确率</TableCell>
                  <TableCell>趋势</TableCell>
                  <TableCell>置信度</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {salesForecasts.map((forecast) => (
                  <TableRow key={forecast.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {forecast.period}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {PERIOD_TYPES.find((p) => p.value === forecast.period_type)?.label ||
                        forecast.period_type}
                    </TableCell>
                    <TableCell>¥{forecast.predicted_amount.toLocaleString()}</TableCell>
                    <TableCell>
                      {forecast.actual_amount
                        ? `¥${forecast.actual_amount.toLocaleString()}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {forecast.accuracy ? `${(forecast.accuracy * 100).toFixed(1)}%` : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={forecast.trend}
                        size="small"
                        color={getTrendColor(forecast.trend)}
                      />
                    </TableCell>
                    <TableCell>{(forecast.confidence_level * 100).toFixed(0)}%</TableCell>
                    <TableCell>
                      <Chip label={forecast.status} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleDelete(forecast.id)}
                      >
                        删除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog
        open={generateDialogOpen}
        onClose={() => setGenerateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>生成销售预测</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>周期类型</InputLabel>
              <Select
                value={newForecast.period_type}
                label="周期类型"
                onChange={(e) =>
                  setNewForecast({
                    ...newForecast,
                    period_type: e.target.value as 'monthly' | 'quarterly' | 'yearly',
                  })
                }
              >
                {PERIOD_TYPES.map((p) => (
                  <MenuItem key={p.value} value={p.value}>
                    {p.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="周期"
              required
              placeholder="例如 2026-01, 2026Q1, 2026"
              value={newForecast.period}
              onChange={(e) => setNewForecast({ ...newForecast, period: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={submitting || !newForecast.period}
          >
            {submitting ? '生成中...' : '生成'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SalesForecastPage;
