import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  MenuItem,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SpeedIcon from '@mui/icons-material/Speed';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import UpgradeIcon from '@mui/icons-material/Upgrade';
import CancelIcon from '@mui/icons-material/Cancel';
import PaidIcon from '@mui/icons-material/Paid';
import {
  commercialApi,
  type APIProduct,
  type Subscription,
  type BillingRecord,
  type RateCard,
  type SLAConfig,
  type SLAMeasurement,
  type SLAIncident,
  type UsageSummary,
} from '@/api/master/commercial';
import i18n from '@/i18n';

const t = (key: string): string => i18n.t(`master.commercial.${key}`);

const TIERS = ['free', 'basic', 'professional', 'enterprise', 'unlimited'];

const CommercialConsolePage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 产品
  const [products, setProducts] = useState<APIProduct[]>([]);
  const [productForm, setProductForm] = useState({
    name: '',
    tier: 'basic',
    price_monthly: 0,
    rate_limit_per_min: 60,
    rate_limit_per_day: 1000,
    features: '',
  });

  // 订阅
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subForm, setSubForm] = useState({ api_product_id: '', tenant_id: '', tier: 'basic' });

  // 用量/计费
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [usageForm, setUsageForm] = useState({
    tenant_id: '',
    api_product_id: '',
    endpoint: '',
    requests: 0,
  });
  const [bills, setBills] = useState<BillingRecord[]>([]);
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [rateCardForm, setRateCardForm] = useState({
    tier: 'basic',
    cost_per_request: 0.01,
    cost_per_mb: 0.1,
  });

  // SLA
  const [_slaConfigs, setSlaConfigs] = useState<SLAConfig[]>([]);
  const [slaStatus, setSlaStatus] = useState<SLAMeasurement[]>([]);
  const [incidents, setIncidents] = useState<SLAIncident[]>([]);
  const [slaForm, setSlaForm] = useState({
    metric: '',
    target_value: 99.9,
    unit: '%',
    penalty_per_min: 1,
    measurement_window: 1440,
  });

  const loadProducts = useCallback(async () => {
    try {
      const res = await commercialApi.listProducts();
      if (res.success) setProducts(res.data || []);
    } catch (err) {
      console.error('加载产品失败', err);
    }
  }, []);

  const loadSubscriptions = useCallback(async () => {
    try {
      const res = await commercialApi.listSubscriptions();
      if (res.success) setSubscriptions(res.data || []);
    } catch (err) {
      console.error('加载订阅失败', err);
    }
  }, []);

  const loadBilling = useCallback(async () => {
    try {
      const [b, rc, u] = await Promise.all([
        commercialApi.getBillingHistory(),
        commercialApi.getRateCards(),
        commercialApi.getUsageSummary(),
      ]);
      if (b.success) setBills(b.data || []);
      if (rc.success) setRateCards(rc.data || []);
      if (u.success) setUsage(u.data || null);
    } catch (err) {
      console.error('加载计费数据失败', err);
    }
  }, []);

  const loadSla = useCallback(async () => {
    try {
      const [s, i] = await Promise.all([
        commercialApi.getSlaStatus(),
        commercialApi.getIncidents(),
      ]);
      if (s.success) setSlaStatus(s.data || []);
      if (i.success) setIncidents(i.data || []);
      setSlaConfigs([]); // 无独立 GET /sla/configs 端点，配置项在创建后于 status 中体现
    } catch (err) {
      console.error('加载 SLA 数据失败', err);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadSubscriptions();
    loadBilling();
    loadSla();
  }, [loadProducts, loadSubscriptions, loadBilling, loadSla]);

  const handleCreateProduct = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await commercialApi.createProduct({
        name: productForm.name,
        tier: productForm.tier,
        price_monthly: productForm.price_monthly || undefined,
        rate_limit_per_min: productForm.rate_limit_per_min || undefined,
        rate_limit_per_day: productForm.rate_limit_per_day || undefined,
        features: productForm.features
          .split(',')
          .map((f) => f.trim())
          .filter(Boolean),
      });
      if (!res.success) setError(res.message || t('product_create_failed'));
      else {
        setProductForm({ ...productForm, name: '', features: '' });
        loadProducts();
      }
    } catch (err) {
      console.error('创建产品失败', err);
      setError(t('product_create_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await commercialApi.subscribe(subForm);
      if (!res.success) setError(res.message || t('subscribe_failed'));
      else {
        setSubForm({ ...subForm, tenant_id: '' });
        loadSubscriptions();
      }
    } catch (err) {
      console.error('订阅失败', err);
      setError(t('subscribe_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSub = async (id: string) => {
    try {
      await commercialApi.cancelSubscription(id);
      loadSubscriptions();
    } catch (err) {
      console.error('取消订阅失败', err);
    }
  };

  const handleUpgradeSub = async (id: string) => {
    try {
      await commercialApi.upgradeSubscription(id);
      loadSubscriptions();
    } catch (err) {
      console.error('升级订阅失败', err);
    }
  };

  const handleRecordUsage = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await commercialApi.recordUsage({
        ...usageForm,
        errors: 0,
        data_transferred: 0,
      });
      if (!res.success) setError(res.message || t('usage_record_failed'));
      else {
        setUsageForm({ ...usageForm, endpoint: '', requests: 0 });
        loadBilling();
      }
    } catch (err) {
      console.error('记录用量失败', err);
      setError(t('usage_record_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBill = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await commercialApi.generateBill({ tenant_id: usageForm.tenant_id || 'default' });
      if (!res.success) setError(res.message || t('bill_generate_failed'));
      else loadBilling();
    } catch (err) {
      console.error('生成账单失败', err);
      setError(t('bill_generate_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await commercialApi.markBillPaid(id);
      loadBilling();
    } catch (err) {
      console.error('标记已支付失败', err);
    }
  };

  const handleCreateRateCard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await commercialApi.createRateCard(rateCardForm);
      if (!res.success) setError(res.message || t('rate_card_failed'));
      else {
        setRateCardForm({ tier: 'basic', cost_per_request: 0.01, cost_per_mb: 0.1 });
        loadBilling();
      }
    } catch (err) {
      console.error('创建价目表失败', err);
      setError(t('rate_card_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureSla = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await commercialApi.configureSla(slaForm);
      if (!res.success) setError(res.message || t('sla_configure_failed'));
      else loadSla();
    } catch (err) {
      console.error('配置 SLA 失败', err);
      setError(t('sla_configure_failed'));
    } finally {
      setLoading(false);
    }
  };

  const billStatusColor = (s: string) =>
    s === 'paid' ? 'success' : s === 'overdue' ? 'error' : s === 'invoiced' ? 'info' : 'warning';

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <StorefrontIcon sx={{ color: 'primary.main' }} />
        <Typography
          variant='h5'
          sx={{ fontWeight: 600 }}
        >
          {t('title')}
        </Typography>
      </Box>
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ mb: 2 }}
      >
        {t('desc')}
      </Typography>

      {error && (
        <Alert
          severity='error'
          sx={{ mb: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2 }}
      >
        <Tab
          icon={<StorefrontIcon />}
          iconPosition='start'
          label={t('tab_products')}
        />
        <Tab
          icon={<SpeedIcon />}
          iconPosition='start'
          label={t('tab_subscriptions')}
        />
        <Tab
          icon={<ReceiptLongIcon />}
          iconPosition='start'
          label={t('tab_billing')}
        />
        <Tab
          icon={<SpeedIcon />}
          iconPosition='start'
          label={t('tab_sla')}
        />
      </Tabs>

      {loading && (
        <CircularProgress
          size={24}
          sx={{ display: 'block', mb: 2 }}
        />
      )}

      {/* Tab 1: 产品 */}
      {tab === 0 && (
        <Box>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {t('create_product_title')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <TextField
                  label={t('product_name')}
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  size='small'
                />
                <TextField
                  select
                  label={t('tier')}
                  value={productForm.tier}
                  onChange={(e) => setProductForm({ ...productForm, tier: e.target.value })}
                  size='small'
                  sx={{ minWidth: 130 }}
                >
                  {TIERS.map((v) => (
                    <MenuItem
                      key={v}
                      value={v}
                    >
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label={t('price_monthly')}
                  type='number'
                  value={productForm.price_monthly}
                  onChange={(e) =>
                    setProductForm({ ...productForm, price_monthly: Number(e.target.value) })
                  }
                  size='small'
                />
                <TextField
                  label={t('rate_limit_per_min')}
                  type='number'
                  value={productForm.rate_limit_per_min}
                  onChange={(e) =>
                    setProductForm({ ...productForm, rate_limit_per_min: Number(e.target.value) })
                  }
                  size='small'
                />
                <TextField
                  label={t('features')}
                  value={productForm.features}
                  onChange={(e) => setProductForm({ ...productForm, features: e.target.value })}
                  size='small'
                  placeholder='a, b, c'
                />
                <Button
                  variant='contained'
                  startIcon={<AddIcon />}
                  onClick={handleCreateProduct}
                  disabled={loading}
                >
                  {t('create_product_btn')}
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  {t('products_title')}
                </Typography>
                <Button
                  size='small'
                  startIcon={<RefreshIcon />}
                  onClick={loadProducts}
                >
                  {t('refresh')}
                </Button>
              </Box>
              {products.length === 0 ? (
                <Typography variant='body1'>{t('products_empty')}</Typography>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 600 }}>{t('product_name')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('tier')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('price_monthly')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('rate_limit')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('status')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {products.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.name}</TableCell>
                          <TableCell>{p.tier}</TableCell>
                          <TableCell>{p.price_monthly}</TableCell>
                          <TableCell>
                            {p.rate_limit_per_min}/min · {p.rate_limit_per_day}/day
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={p.active ? t('active') : t('inactive')}
                              size='small'
                              color={p.active ? 'success' : 'default'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Tab 2: 订阅 */}
      {tab === 1 && (
        <Box>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {t('subscribe_title')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <TextField
                  label={t('product_id')}
                  value={subForm.api_product_id}
                  onChange={(e) => setSubForm({ ...subForm, api_product_id: e.target.value })}
                  size='small'
                />
                <TextField
                  label={t('tenant_id')}
                  value={subForm.tenant_id}
                  onChange={(e) => setSubForm({ ...subForm, tenant_id: e.target.value })}
                  size='small'
                />
                <TextField
                  select
                  label={t('tier')}
                  value={subForm.tier}
                  onChange={(e) => setSubForm({ ...subForm, tier: e.target.value })}
                  size='small'
                  sx={{ minWidth: 130 }}
                >
                  {TIERS.map((v) => (
                    <MenuItem
                      key={v}
                      value={v}
                    >
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  variant='contained'
                  onClick={handleSubscribe}
                  disabled={loading}
                >
                  {t('subscribe_btn')}
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  {t('subscriptions_title')}
                </Typography>
                <Button
                  size='small'
                  startIcon={<RefreshIcon />}
                  onClick={loadSubscriptions}
                >
                  {t('refresh')}
                </Button>
              </Box>
              {subscriptions.length === 0 ? (
                <Typography variant='body1'>{t('subscriptions_empty')}</Typography>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 600 }}>{t('product_id')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('tenant_id')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('tier')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('status')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('expires_at')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('col_actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {subscriptions.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.api_product_id}</TableCell>
                          <TableCell>{s.tenant_id}</TableCell>
                          <TableCell>{s.tier}</TableCell>
                          <TableCell>
                            <Chip
                              label={s.status}
                              size='small'
                              color={s.status === 'active' ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(s.expires_at).toLocaleDateString('zh-CN')}
                          </TableCell>
                          <TableCell>
                            <Tooltip title={t('upgrade')}>
                              <IconButton
                                size='small'
                                color='primary'
                                onClick={() => handleUpgradeSub(s.id)}
                              >
                                <UpgradeIcon fontSize='small' />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('cancel')}>
                              <IconButton
                                size='small'
                                color='error'
                                onClick={() => handleCancelSub(s.id)}
                              >
                                <CancelIcon fontSize='small' />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Tab 3: 计费 */}
      {tab === 2 && (
        <Box>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {t('usage_title')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <TextField
                  label={t('tenant_id')}
                  value={usageForm.tenant_id}
                  onChange={(e) => setUsageForm({ ...usageForm, tenant_id: e.target.value })}
                  size='small'
                />
                <TextField
                  label={t('product_id')}
                  value={usageForm.api_product_id}
                  onChange={(e) => setUsageForm({ ...usageForm, api_product_id: e.target.value })}
                  size='small'
                />
                <TextField
                  label={t('endpoint')}
                  value={usageForm.endpoint}
                  onChange={(e) => setUsageForm({ ...usageForm, endpoint: e.target.value })}
                  size='small'
                />
                <TextField
                  label={t('requests')}
                  type='number'
                  value={usageForm.requests}
                  onChange={(e) => setUsageForm({ ...usageForm, requests: Number(e.target.value) })}
                  size='small'
                />
                <Button
                  variant='contained'
                  onClick={handleRecordUsage}
                  disabled={loading}
                >
                  {t('record_usage_btn')}
                </Button>
                <Button
                  variant='outlined'
                  onClick={handleGenerateBill}
                  disabled={loading}
                >
                  {t('generate_bill_btn')}
                </Button>
              </Box>
              {usage && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                  <Chip label={`${t('total_requests')}: ${usage.total_requests}`} />
                  <Chip
                    label={`${t('total_errors')}: ${usage.total_errors}`}
                    color='warning'
                  />
                  <Chip label={`${t('total_data_mb')}: ${usage.total_data_mb.toFixed(1)} MB`} />
                  <Chip label={`${t('error_rate')}: ${(usage.error_rate * 100).toFixed(2)}%`} />
                </Box>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  {t('bills_title')}
                </Typography>
                <Button
                  size='small'
                  startIcon={<RefreshIcon />}
                  onClick={loadBilling}
                >
                  {t('refresh')}
                </Button>
              </Box>
              {bills.length === 0 ? (
                <Typography variant='body1'>{t('bills_empty')}</Typography>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 600 }}>{t('tenant_id')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('period')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('total_amount')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('status')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('col_actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bills.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell>{b.tenant_id}</TableCell>
                          <TableCell>
                            {new Date(b.period_start).toLocaleDateString('zh-CN')} ~{' '}
                            {new Date(b.period_end).toLocaleDateString('zh-CN')}
                          </TableCell>
                          <TableCell>{b.total_amount}</TableCell>
                          <TableCell>
                            <Chip
                              label={b.status}
                              size='small'
                              color={billStatusColor(b.status)}
                            />
                          </TableCell>
                          <TableCell>
                            {b.status !== 'paid' && (
                              <Tooltip title={t('mark_paid')}>
                                <IconButton
                                  size='small'
                                  color='success'
                                  onClick={() => handleMarkPaid(b.id)}
                                >
                                  <PaidIcon fontSize='small' />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  {t('rate_cards_title')}
                </Typography>
                <Button
                  size='small'
                  startIcon={<RefreshIcon />}
                  onClick={loadBilling}
                >
                  {t('refresh')}
                </Button>
              </Box>
              {rateCards.length === 0 ? (
                <Typography variant='body1'>{t('rate_cards_empty')}</Typography>
              ) : (
                <TableContainer sx={{ mb: 2 }}>
                  <Table size='small'>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 600 }}>{t('tier')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('cost_per_request')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('cost_per_mb')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rateCards.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.tier}</TableCell>
                          <TableCell>{r.cost_per_request}</TableCell>
                          <TableCell>{r.cost_per_mb}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <TextField
                  select
                  label={t('tier')}
                  value={rateCardForm.tier}
                  onChange={(e) => setRateCardForm({ ...rateCardForm, tier: e.target.value })}
                  size='small'
                  sx={{ minWidth: 130 }}
                >
                  {TIERS.map((v) => (
                    <MenuItem
                      key={v}
                      value={v}
                    >
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label={t('cost_per_request')}
                  type='number'
                  value={rateCardForm.cost_per_request}
                  onChange={(e) =>
                    setRateCardForm({ ...rateCardForm, cost_per_request: Number(e.target.value) })
                  }
                  size='small'
                  slotProps={{ htmlInput: { step: 0.001 } }}
                />
                <TextField
                  label={t('cost_per_mb')}
                  type='number'
                  value={rateCardForm.cost_per_mb}
                  onChange={(e) =>
                    setRateCardForm({ ...rateCardForm, cost_per_mb: Number(e.target.value) })
                  }
                  size='small'
                  slotProps={{ htmlInput: { step: 0.001 } }}
                />
                <Button
                  variant='outlined'
                  startIcon={<AddIcon />}
                  onClick={handleCreateRateCard}
                  disabled={loading}
                >
                  {t('create_rate_card_btn')}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Tab 4: SLA */}
      {tab === 3 && (
        <Box>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {t('configure_sla_title')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <TextField
                  label={t('metric')}
                  value={slaForm.metric}
                  onChange={(e) => setSlaForm({ ...slaForm, metric: e.target.value })}
                  size='small'
                />
                <TextField
                  label={t('target_value')}
                  type='number'
                  value={slaForm.target_value}
                  onChange={(e) => setSlaForm({ ...slaForm, target_value: Number(e.target.value) })}
                  size='small'
                />
                <TextField
                  label={t('unit')}
                  value={slaForm.unit}
                  onChange={(e) => setSlaForm({ ...slaForm, unit: e.target.value })}
                  size='small'
                />
                <TextField
                  label={t('penalty_per_min')}
                  type='number'
                  value={slaForm.penalty_per_min}
                  onChange={(e) =>
                    setSlaForm({ ...slaForm, penalty_per_min: Number(e.target.value) })
                  }
                  size='small'
                />
                <Button
                  variant='contained'
                  onClick={handleConfigureSla}
                  disabled={loading}
                >
                  {t('configure_sla_btn')}
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  {t('sla_status_title')}
                </Typography>
                <Button
                  size='small'
                  startIcon={<RefreshIcon />}
                  onClick={loadSla}
                >
                  {t('refresh')}
                </Button>
              </Box>
              {slaStatus.length === 0 ? (
                <Typography variant='body1'>{t('sla_status_empty')}</Typography>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 600 }}>{t('tenant_id')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('metric')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('measured_value')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('target_value')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('result')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {slaStatus.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>{m.tenant_id}</TableCell>
                          <TableCell>{m.config_id}</TableCell>
                          <TableCell>{m.measured_value}</TableCell>
                          <TableCell>{m.target_value}</TableCell>
                          <TableCell>
                            <Chip
                              label={m.met ? t('met') : t('missed')}
                              size='small'
                              color={m.met ? 'success' : 'error'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  {t('incidents_title')}
                </Typography>
                <Button
                  size='small'
                  startIcon={<RefreshIcon />}
                  onClick={loadSla}
                >
                  {t('refresh')}
                </Button>
              </Box>
              {incidents.length === 0 ? (
                <Typography variant='body1'>{t('incidents_empty')}</Typography>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 600 }}>{t('tenant_id')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('incident_type')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('duration_min')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('compensation')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('status')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {incidents.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell>{i.tenant_id}</TableCell>
                          <TableCell>{i.incident_type}</TableCell>
                          <TableCell>{i.duration_min}</TableCell>
                          <TableCell>{i.compensation_amount}</TableCell>
                          <TableCell>
                            <Chip
                              label={i.status}
                              size='small'
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default CommercialConsolePage;
