import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Calculator, Trophy, TrendingUp, Activity, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { forecastApi } from '@/api/crm';
import type {
  ForecastConfig,
  ForecastMethod,
  ForecastMethodInfo,
  ForecastResult,
  ForecastEvaluation,
} from '@/api/crm';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { PageContainer } from '@/components/common';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { designTokens, semanticTokens } from '@topems/tokens';

const METHOD_COLORS: Record<ForecastMethod, string> = {
  moving_average: designTokens.colors.primary.dark,
  weighted_moving_average: designTokens.colors.purple['500'],
  exponential_smoothing: designTokens.colors.success.dark,
  linear_regression: 'colors.orange.700',
};

const CrmForecastAlgorithmPage: React.FC = () => {
  const { t } = useTranslation();
  const { addNotification } = useNotificationStore();

  // 表单状态
  const [method, setMethod] = useState<ForecastMethod>('moving_average');
  const [historyInput, setHistoryInput] = useState(
    '120,135,128,142,138,155,148,162,158,175,168,182'
  );
  const [alpha, setAlpha] = useState(0.3);
  const [windowSize, setWindowSize] = useState(3);
  const [forecastPeriods, setForecastPeriods] = useState(3);

  // 预测结果
  const [predictResult, setPredictResult] = useState<ForecastResult | null>(null);
  // 评估结果
  const [evalResult, setEvalResult] = useState<ForecastEvaluation | null>(null);

  // 获取支持的预测方法
  const methodsQuery = useQuery({
    queryKey: [...QUERY_KEYS.CRM.FORECAST_ALGORITHM, 'methods'],
    queryFn: async () => {
      const res = await forecastApi.getMethods();
      return res.data || [];
    },
  });

  const methods: ForecastMethodInfo[] = methodsQuery.data || [];

  // 解析历史数据
  const parseHistory = (): number[] => {
    return historyInput
      .split(/[,\s\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => Number(s))
      .filter((n) => !Number.isNaN(n));
  };

  const buildConfig = (): ForecastConfig => {
    const historyData = parseHistory();
    return {
      method,
      history_data: historyData,
      forecast_periods: forecastPeriods,
      alpha: method === 'exponential_smoothing' ? alpha : undefined,
      window_size:
        method === 'moving_average' || method === 'weighted_moving_average'
          ? windowSize
          : undefined,
    };
  };

  // 执行预测
  const predictMutation = useMutation({
    mutationFn: async (config: ForecastConfig) => forecastApi.predict(config),
    onSuccess: (res) => {
      if (res.success && res.data) {
        setPredictResult(res.data);
        addNotification({
          type: 'success',
          title: t('crm.forecastAlgorithm.title_success'),
          message: t('crm.forecastAlgorithm.msg_predict_success'),
        });
      }
    },
    onError: (error: unknown) => {
      apiLogger.error(t('crm.forecastAlgorithm.log_predict_fail'), error);
      addNotification({
        type: 'error',
        title: t('crm.forecastAlgorithm.title_fail'),
        message: t('crm.forecastAlgorithm.msg_predict_fail'),
      });
    },
  });

  // 评估所有方法
  const evaluateMutation = useMutation({
    mutationFn: async (config: ForecastConfig) => forecastApi.evaluate(config),
    onSuccess: (res) => {
      if (res.success && res.data) {
        setEvalResult(res.data);
        addNotification({
          type: 'success',
          title: t('crm.forecastAlgorithm.title_success'),
          message: t('crm.forecastAlgorithm.msg_evaluate_success'),
        });
      }
    },
    onError: (error: unknown) => {
      apiLogger.error(t('crm.forecastAlgorithm.log_evaluate_fail'), error);
      addNotification({
        type: 'error',
        title: t('crm.forecastAlgorithm.title_fail'),
        message: t('crm.forecastAlgorithm.msg_evaluate_fail'),
      });
    },
  });

  const handlePredict = () => {
    const config = buildConfig();
    if (config.history_data.length < 3) {
      addNotification({
        type: 'warning',
        title: t('crm.forecastAlgorithm.title_warning'),
        message: t('crm.forecastAlgorithm.msg_insufficient_data'),
      });
      return;
    }
    predictMutation.mutate(config);
  };

  const handleEvaluate = () => {
    const config = buildConfig();
    if (config.history_data.length < 3) {
      addNotification({
        type: 'warning',
        title: t('crm.forecastAlgorithm.title_warning'),
        message: t('crm.forecastAlgorithm.msg_insufficient_data'),
      });
      return;
    }
    evaluateMutation.mutate(config);
  };

  const loading = predictMutation.isPending || evaluateMutation.isPending;

  const historyData = useMemo(() => {
    return historyInput
      .split(/[,\s\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => Number(s))
      .filter((n) => !Number.isNaN(n));
  }, [historyInput]);

  const fieldSx = useMemo(() => ({ minWidth: { xs: '100%', sm: 200 } }), []);

  return (
    <PageContainer
      maxWidth='xl'
      title={t('crm.forecastAlgorithm.title')}
      subtitle={t('crm.forecastAlgorithm.subtitle')}
      autoTitle
      autoBreadcrumbs
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* 配置面板 */}
        <Card variant='outlined'>
          <CardContent>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {t('crm.forecastAlgorithm.section_config')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <TextField
                select
                size='small'
                label={t('crm.forecastAlgorithm.field_method')}
                value={method}
                onChange={(e) => setMethod(e.target.value as ForecastMethod)}
                sx={fieldSx}
                helperText={methods.find((m) => m.method === method)?.description}
              >
                {methods.length === 0 && [
                  <MenuItem
                    key='moving_average'
                    value='moving_average'
                  >
                    {t('crm.forecastAlgorithm.method_moving_average')}
                  </MenuItem>,
                  <MenuItem
                    key='weighted_moving_average'
                    value='weighted_moving_average'
                  >
                    {t('crm.forecastAlgorithm.method_weighted_moving_average')}
                  </MenuItem>,
                  <MenuItem
                    key='exponential_smoothing'
                    value='exponential_smoothing'
                  >
                    {t('crm.forecastAlgorithm.method_exponential_smoothing')}
                  </MenuItem>,
                  <MenuItem
                    key='linear_regression'
                    value='linear_regression'
                  >
                    {t('crm.forecastAlgorithm.method_linear_regression')}
                  </MenuItem>,
                ]}
                {methods.map((m) => (
                  <MenuItem
                    key={m.method}
                    value={m.method}
                  >
                    {m.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size='small'
                type='number'
                label={t('crm.forecastAlgorithm.field_forecast_periods')}
                value={forecastPeriods}
                onChange={(e) => setForecastPeriods(Math.max(1, Number(e.target.value)))}
                sx={fieldSx}
                slotProps={{ htmlInput: { min: 1, max: 24 } }}
              />
              {(method === 'moving_average' || method === 'weighted_moving_average') && (
                <TextField
                  size='small'
                  type='number'
                  label={t('crm.forecastAlgorithm.field_window_size')}
                  value={windowSize}
                  onChange={(e) => setWindowSize(Math.max(2, Number(e.target.value)))}
                  sx={fieldSx}
                  slotProps={{ htmlInput: { min: 2, max: 12 } }}
                />
              )}
              {method === 'exponential_smoothing' && (
                <TextField
                  size='small'
                  type='number'
                  label={t('crm.forecastAlgorithm.field_alpha')}
                  value={alpha}
                  onChange={(e) => setAlpha(Math.min(1, Math.max(0, Number(e.target.value))))}
                  sx={fieldSx}
                  helperText='0-1'
                  slotProps={{ htmlInput: { min: 0, max: 1, step: 0.05 } }}
                />
              )}
              <TextField
                size='small'
                multiline
                minRows={1}
                maxRows={3}
                label={t('crm.forecastAlgorithm.field_history_data')}
                value={historyInput}
                onChange={(e) => setHistoryInput(e.target.value)}
                sx={{ minWidth: { xs: '100%', sm: '100%', md: 400 } }}
                placeholder={t('crm.forecastAlgorithm.placeholder_history')}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, mt: 2, flexWrap: 'wrap' }}>
              <Tooltip title={t('crm.forecastAlgorithm.btn_predict_tooltip')}>
                <Button
                  variant='contained'
                  startIcon={<Play size={16} />}
                  onClick={handlePredict}
                  disabled={loading}
                >
                  {t('crm.forecastAlgorithm.btn_predict')}
                </Button>
              </Tooltip>
              <Tooltip title={t('crm.forecastAlgorithm.btn_evaluate_tooltip')}>
                <Button
                  variant='outlined'
                  startIcon={<Calculator size={16} />}
                  onClick={handleEvaluate}
                  disabled={loading}
                >
                  {t('crm.forecastAlgorithm.btn_evaluate')}
                </Button>
              </Tooltip>
              <Chip
                label={`${t('crm.forecastAlgorithm.chip_data_points')}: ${historyData.length}`}
                size='small'
                color='primary'
                variant='outlined'
                sx={{ alignSelf: 'center' }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* 预测结果 */}
        {predictResult && (
          <Card variant='outlined'>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUp
                  size={20}
                  color={METHOD_COLORS[predictResult.method] ?? designTokens.colors.primary.dark}
                />
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600 }}
                >
                  {t('crm.forecastAlgorithm.section_predict_result')}
                </Typography>
                <Chip
                  label={predictResult.method}
                  size='small'
                  sx={{
                    bgcolor: `${METHOD_COLORS[predictResult.method] ?? designTokens.colors.primary.dark}20`,
                    color: METHOD_COLORS[predictResult.method] ?? designTokens.colors.primary.dark,
                    fontWeight: 600,
                  }}
                />
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                  gap: 2,
                  mb: 2,
                }}
              >
                <Paper
                  variant='outlined'
                  sx={{ p: 1.5, textAlign: 'center' }}
                >
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {t('crm.forecastAlgorithm.metric_mape')}
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700, color: 'error.main' }}
                  >
                    {(predictResult.mape * 100).toFixed(2)}%
                  </Typography>
                </Paper>
                <Paper
                  variant='outlined'
                  sx={{ p: 1.5, textAlign: 'center' }}
                >
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {t('crm.forecastAlgorithm.metric_rmse')}
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700 }}
                  >
                    {predictResult.rmse.toFixed(2)}
                  </Typography>
                </Paper>
                <Paper
                  variant='outlined'
                  sx={{ p: 1.5, textAlign: 'center' }}
                >
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {t('crm.forecastAlgorithm.metric_r_squared')}
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700, color: 'success.main' }}
                  >
                    {predictResult.r_squared.toFixed(4)}
                  </Typography>
                </Paper>
                <Paper
                  variant='outlined'
                  sx={{ p: 1.5, textAlign: 'center' }}
                >
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {t('crm.forecastAlgorithm.metric_forecast_count')}
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700 }}
                  >
                    {predictResult.forecasts.length}
                  </Typography>
                </Paper>
              </Box>
              <TableContainer
                component={Paper}
                variant='outlined'
              >
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell align='center'>#</TableCell>
                      <TableCell align='right'>
                        {t('crm.forecastAlgorithm.col_forecast_value')}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {predictResult.forecasts.map((v, i) => (
                      <TableRow
                        key={i}
                        hover
                      >
                        <TableCell align='center'>
                          {t('crm.forecastAlgorithm.label_period')} {i + 1}
                        </TableCell>
                        <TableCell
                          align='right'
                          sx={{ fontWeight: 600 }}
                        >
                          {v.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* 评估结果 */}
        {evalResult && (
          <Card variant='outlined'>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Trophy
                  size={20}
                  color='colors.orange.700'
                />
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600 }}
                >
                  {t('crm.forecastAlgorithm.section_evaluate_result')}
                </Typography>
                <Chip
                  icon={<Trophy size={14} />}
                  label={`${t('crm.forecastAlgorithm.chip_best_method')}: ${evalResult.best_method}`}
                  size='small'
                  color='warning'
                  sx={{ fontWeight: 600 }}
                />
              </Box>
              <TableContainer
                component={Paper}
                variant='outlined'
              >
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('crm.forecastAlgorithm.col_method')}</TableCell>
                      <TableCell align='right'>{t('crm.forecastAlgorithm.metric_mape')}</TableCell>
                      <TableCell align='right'>{t('crm.forecastAlgorithm.metric_rmse')}</TableCell>
                      <TableCell align='right'>
                        {t('crm.forecastAlgorithm.metric_r_squared')}
                      </TableCell>
                      <TableCell align='center'>
                        {t('crm.forecastAlgorithm.col_forecast_count')}
                      </TableCell>
                      <TableCell align='center'>{t('crm.forecastAlgorithm.col_best')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {evalResult.results.map((r) => {
                      const isBest = r.method === evalResult.best_method;
                      return (
                        <TableRow
                          key={r.method}
                          hover
                          sx={isBest ? { bgcolor: 'warning.50' } : {}}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Activity
                                size={14}
                                color={METHOD_COLORS[r.method] ?? designTokens.colors.primary.dark}
                              />
                              <Typography
                                variant='body2'
                                sx={{ fontWeight: isBest ? 700 : 400 }}
                              >
                                {r.method}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell
                            align='right'
                            sx={{ color: 'error.main' }}
                          >
                            {(r.mape * 100).toFixed(2)}%
                          </TableCell>
                          <TableCell align='right'>{r.rmse.toFixed(2)}</TableCell>
                          <TableCell
                            align='right'
                            sx={{ color: 'success.main' }}
                          >
                            {r.r_squared.toFixed(4)}
                          </TableCell>
                          <TableCell align='center'>{r.forecasts.length}</TableCell>
                          <TableCell align='center'>
                            {isBest && (
                              <Chip
                                label={t('crm.forecastAlgorithm.label_best')}
                                size='small'
                                color='warning'
                                icon={<Trophy size={12} />}
                                sx={{ fontWeight: 600 }}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* 支持的方法列表 */}
        {!predictResult && !evalResult && (
          <Card variant='outlined'>
            <CardContent>
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 1.5 }}
              >
                {t('crm.forecastAlgorithm.section_supported_methods')}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {methods.length === 0 && (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('crm.forecastAlgorithm.msg_loading_methods')}
                  </Typography>
                )}
                {methods.map((m) => (
                  <Box
                    key={m.method}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1,
                      borderRadius: 1,
                      bgcolor: 'grey.50',
                    }}
                  >
                    <Activity
                      size={16}
                      color={METHOD_COLORS[m.method] ?? designTokens.colors.primary.dark}
                    />
                    <Box>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 600 }}
                      >
                        {m.label}
                      </Typography>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {m.description}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
    </PageContainer>
  );
};

export default CrmForecastAlgorithmPage;
