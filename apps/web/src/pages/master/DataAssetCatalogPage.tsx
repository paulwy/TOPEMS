import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Tooltip,
  Divider,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import DatasetIcon from '@mui/icons-material/Dataset';
import DescriptionIcon from '@mui/icons-material/Description';
import ApiIcon from '@mui/icons-material/Api';
import { dataAssetCatalogApiV66 } from '@/api/master/dataAssetCatalogV66';
import type {
  DataAsset,
  AssetCatalogDashboard,
  V60LineageImpact,
  V60LifecycleHistory,
} from '@/api/master/dataAssetCatalogV66';
import i18n from '@/i18n';
import { assetTypeColors, assetStatusColors, assetSensitivityColors } from '@/theme/presets';

const LIFECYCLE_TRANSITIONS: Array<
  'active' | 'maintenance' | 'deprecated' | 'archived' | 'deleted'
> = ['active', 'maintenance', 'deprecated', 'archived', 'deleted'];

const DataAssetCatalogPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [assets, setAssets] = useState<DataAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<AssetCatalogDashboard | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailAsset, setDetailAsset] = useState<DataAsset | null>(null);
  const [error, setError] = useState<string | null>(null);

  // B5 接线：详情弹窗内 血缘影响分析 + 生命周期
  const [impact, setImpact] = useState<V60LineageImpact | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [history, setHistory] = useState<V60LifecycleHistory[]>([]);
  const [lineageBusy, setLineageBusy] = useState(false);
  const [transitionBusy, setTransitionBusy] = useState(false);

  const loadImpactAndLifecycle = useCallback(async (assetId: string) => {
    setLineageBusy(true);
    setImpact(null);
    setStage(null);
    setHistory([]);
    try {
      const [impactRes, stageRes, historyRes] = await Promise.all([
        dataAssetCatalogApiV66.getLineageImpact(assetId),
        dataAssetCatalogApiV66.getLifecycleStage(assetId),
        dataAssetCatalogApiV66.getLifecycleHistory(assetId),
      ]);
      if (impactRes.success && impactRes.data) setImpact(impactRes.data);
      if (stageRes.success && stageRes.data) setStage(stageRes.data.stage);
      if (historyRes.success && historyRes.data) setHistory(historyRes.data);
    } catch (err) {
      console.error('加载血缘/生命周期失败', err);
    } finally {
      setLineageBusy(false);
    }
  }, []);

  const handleTransition = useCallback(
    async (newStage: string) => {
      if (!detailAsset) return;
      setTransitionBusy(true);
      try {
        const res = await dataAssetCatalogApiV66.transitionLifecycleStage(detailAsset.id, {
          new_stage: newStage,
          reason: i18n.t('master.data_asset_catalog.transition_reason'),
          changed_by: 'admin',
        });
        if (res.success) {
          setStage(newStage);
          const historyRes = await dataAssetCatalogApiV66.getLifecycleHistory(detailAsset.id);
          if (historyRes.success && historyRes.data) setHistory(historyRes.data);
        }
      } catch (err) {
        console.error('生命周期流转失败', err);
      } finally {
        setTransitionBusy(false);
      }
    },
    [detailAsset]
  );

  // 加载资产列表
  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dataAssetCatalogApiV66.listAssets({
        search: searchKeyword || undefined,
        page: page + 1,
        pageSize,
      });
      if (res.success && res.data) {
        setAssets(res.data.items || []);
        setTotal(res.data.total || 0);
      } else {
        setAssets([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('加载资产列表失败', err);
      setError(i18n.t('master.data_asset_catalog.load_failed'));
      setAssets([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, page, pageSize]);

  // 加载仪表盘统计
  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const res = await dataAssetCatalogApiV66.getDashboard();
      if (res.success && res.data) {
        setDashboard(res.data);
      }
    } catch (err) {
      console.error('加载仪表盘失败', err);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssets();
    loadDashboard();
  }, [loadAssets, loadDashboard]);

  // 查看详情
  const handleView = async (asset: DataAsset) => {
    try {
      const res = await dataAssetCatalogApiV66.getAsset(asset.id);
      if (res.success && res.data) {
        setDetailAsset(res.data);
      } else {
        setDetailAsset(asset);
      }
    } catch {
      setDetailAsset(asset);
    }
    setDetailOpen(true);
    loadImpactAndLifecycle(asset.id);
  };

  // 删除
  const handleDelete = async (asset: DataAsset) => {
    try {
      const res = await dataAssetCatalogApiV66.deleteAsset(asset.id);
      if (res.success) {
        setAssets((prev) => prev.filter((a) => a.id !== asset.id));
        setTotal((prev) => prev - 1);
        loadDashboard();
      }
    } catch (err) {
      console.error('删除失败', err);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* 页面标题 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <DatasetIcon sx={{ color: 'primary.main' }} />
            {i18n.t('master.data_asset_catalog.title')}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mt: 0.5 }}
          >
            {i18n.t('master.data_asset_catalog.subtitle')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={() => {
              loadAssets();
              loadDashboard();
            }}
          >
            {i18n.t('master.data_asset_catalog.refresh')}
          </Button>
          <Tooltip title={i18n.t('master.data_asset_catalog.new_disabled')}>
            <span>
              <Button
                variant='contained'
                startIcon={<AddIcon />}
                disabled
              >
                {i18n.t('master.data_asset_catalog.new_asset')}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* 统计卡片 */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <DatasetIcon sx={{ color: 'primary.main' }} />
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('master.data_asset_catalog.stat_total')}
                </Typography>
              </Box>
              {dashboardLoading ? (
                <CircularProgress size={24} />
              ) : (
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700 }}
                >
                  {dashboard?.total_assets ?? total}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <DescriptionIcon sx={{ color: 'success.main' }} />
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('master.data_asset_catalog.stat_active')}
                </Typography>
              </Box>
              {dashboardLoading ? (
                <CircularProgress size={24} />
              ) : (
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700, color: 'success.main' }}
                >
                  {dashboard?.active_assets ?? 0}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('master.data_asset_catalog.stat_deprecated')}
                </Typography>
              </Box>
              {dashboardLoading ? (
                <CircularProgress size={24} />
              ) : (
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700, color: 'warning.main' }}
                >
                  {dashboard?.deprecated_assets ?? 0}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <ApiIcon sx={{ color: 'error.main' }} />
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('master.data_asset_catalog.stat_unassigned')}
                </Typography>
              </Box>
              {dashboardLoading ? (
                <CircularProgress size={24} />
              ) : (
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700, color: 'error.main' }}
                >
                  {dashboard?.unassigned_assets ?? 0}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* 搜索栏 */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <input
          type='text'
          placeholder={i18n.t('master.data_asset_catalog.search_placeholder')}
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setPage(0);
              loadAssets();
            }
          }}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid',
            borderColor: 'grey.300',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        />
        <Button
          variant='outlined'
          onClick={() => {
            setPage(0);
            loadAssets();
          }}
        >
          {i18n.t('master.data_asset_catalog.search')}
        </Button>
      </Paper>

      {/* 错误提示 */}
      {error && (
        <Alert
          severity='error'
          sx={{ mb: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* 资产列表 */}
      <Card>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'grey.100' }}>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('master.data_asset_catalog.col_name')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('master.data_asset_catalog.col_display_name')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('master.data_asset_catalog.col_type')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('master.data_asset_catalog.col_status')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('master.data_asset_catalog.col_sensitivity')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('master.data_asset_catalog.col_owner')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('master.data_asset_catalog.col_db_table')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('master.data_asset_catalog.col_updated_at')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>
                  {i18n.t('master.data_asset_catalog.col_actions')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    sx={{ textAlign: 'center', py: 4 }}
                  >
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : assets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    sx={{ textAlign: 'center', py: 4 }}
                  >
                    <Typography color='text.secondary'>
                      {i18n.t('master.data_asset_catalog.empty')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((asset) => (
                  <TableRow
                    key={asset.id}
                    hover
                  >
                    <TableCell>
                      <Button
                        size='small'
                        sx={{ p: 0, textTransform: 'none', fontWeight: 500, minWidth: 'auto' }}
                        onClick={() => handleView(asset)}
                      >
                        {asset.name}
                      </Button>
                    </TableCell>
                    <TableCell>{asset.display_name || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={asset.type}
                        size='small'
                        sx={{
                          backgroundColor: assetTypeColors[asset.type],
                          color: 'common.white',
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={asset.status}
                        size='small'
                        sx={{
                          backgroundColor: assetStatusColors[asset.status],
                          color: 'common.white',
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={asset.sensitivity}
                        size='small'
                        sx={{
                          backgroundColor: assetSensitivityColors[asset.sensitivity],
                          color: 'common.white',
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell>{asset.owner || '-'}</TableCell>
                    <TableCell>
                      <Box
                        sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}
                      >
                        {asset.database && (
                          <Chip
                            label={asset.database}
                            size='small'
                            variant='outlined'
                          />
                        )}
                        {asset.schema && (
                          <Chip
                            label={asset.schema}
                            size='small'
                            variant='outlined'
                          />
                        )}
                        {asset.table_name && (
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            {asset.table_name}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {asset.updated_at ? new Date(asset.updated_at).toLocaleString('zh-CN') : '-'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Tooltip title={i18n.t('master.data_asset_catalog.detail')}>
                        <IconButton
                          size='small'
                          onClick={() => handleView(asset)}
                          aria-label={i18n.t('master.data_asset_catalog.detail')}
                        >
                          <VisibilityIcon fontSize='small' />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={i18n.t('master.data_asset_catalog.delete')}>
                        <IconButton
                          size='small'
                          color='error'
                          onClick={() => handleDelete(asset)}
                          aria-label={i18n.t('master.data_asset_catalog.delete')}
                        >
                          <DeleteIcon fontSize='small' />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component='div'
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => {
            setPageSize(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage={i18n.t('master.data_asset_catalog.rows_per_page')}
          labelDisplayedRows={({ from, to, count }) =>
            i18n.t('master.data_asset_catalog.rows_range', { from, to, count })
          }
        />
      </Card>

      {/* 详情对话框 */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            borderBottom: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          <DatasetIcon sx={{ color: 'primary.main' }} />
          {i18n.t('master.data_asset_catalog.detail_title')}
          {detailAsset && (
            <Chip
              label={detailAsset.name}
              size='small'
              sx={{ ml: 2, backgroundColor: 'primary.main', color: 'common.white' }}
            />
          )}
        </DialogTitle>
        <DialogContent dividers>
          {detailAsset && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
              <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('master.data_asset_catalog.col_name')}
                </Typography>
                <Typography
                  variant='body1'
                  sx={{ fontWeight: 500 }}
                >
                  {detailAsset.name}
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('master.data_asset_catalog.col_display_name')}
                </Typography>
                <Typography variant='body1'>{detailAsset.display_name || '-'}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 22%', minWidth: 150 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('master.data_asset_catalog.col_type')}
                </Typography>
                <Chip
                  label={detailAsset.type}
                  size='small'
                  sx={{
                    backgroundColor: assetTypeColors[detailAsset.type],
                    color: 'common.white',
                    mt: 0.5,
                  }}
                />
              </Box>
              <Box sx={{ flex: '1 1 22%', minWidth: 150 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('master.data_asset_catalog.col_status')}
                </Typography>
                <Chip
                  label={detailAsset.status}
                  size='small'
                  sx={{
                    backgroundColor: assetStatusColors[detailAsset.status],
                    color: 'common.white',
                    mt: 0.5,
                  }}
                />
              </Box>
              <Box sx={{ flex: '1 1 22%', minWidth: 150 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('master.data_asset_catalog.col_sensitivity')}
                </Typography>
                <Chip
                  label={detailAsset.sensitivity}
                  size='small'
                  sx={{
                    backgroundColor: assetSensitivityColors[detailAsset.sensitivity],
                    color: 'common.white',
                    mt: 0.5,
                  }}
                />
              </Box>
              <Box sx={{ flex: '1 1 22%', minWidth: 150 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('master.data_asset_catalog.col_owner')}
                </Typography>
                <Typography variant='body1'>{detailAsset.owner || '-'}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 22%', minWidth: 150 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('master.data_asset_catalog.fld_owner_team')}
                </Typography>
                <Typography variant='body1'>{detailAsset.owner_team || '-'}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 22%', minWidth: 150 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('master.data_asset_catalog.fld_category')}
                </Typography>
                <Typography variant='body1'>{detailAsset.category || '-'}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 15%', minWidth: 120 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('master.data_asset_catalog.fld_database')}
                </Typography>
                <Typography variant='body1'>{detailAsset.database || '-'}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 15%', minWidth: 120 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  Schema
                </Typography>
                <Typography variant='body1'>{detailAsset.schema || '-'}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 15%', minWidth: 120 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('master.data_asset_catalog.fld_table_name')}
                </Typography>
                <Typography variant='body1'>{detailAsset.table_name || '-'}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 22%', minWidth: 150 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('master.data_asset_catalog.fld_row_count')}
                </Typography>
                <Typography variant='body1'>{detailAsset.row_count ?? '-'}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 22%', minWidth: 150 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('master.data_asset_catalog.fld_column_count')}
                </Typography>
                <Typography variant='body1'>{detailAsset.column_count ?? '-'}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 100%', minWidth: '100%' }}>
                <Divider sx={{ my: 1 }} />
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('master.data_asset_catalog.fld_description')}
                </Typography>
                <Typography variant='body1'>{detailAsset.description || '-'}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 100%', minWidth: '100%' }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('master.data_asset_catalog.fld_tags')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                  {detailAsset.tags && detailAsset.tags.length > 0 ? (
                    detailAsset.tags.map((t) => (
                      <Chip
                        key={t}
                        label={t}
                        size='small'
                      />
                    ))
                  ) : (
                    <Typography variant='body1'>-</Typography>
                  )}
                </Box>
              </Box>
              <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('master.data_asset_catalog.fld_created_at')}
                </Typography>
                <Typography variant='body1'>
                  {detailAsset.created_at
                    ? new Date(detailAsset.created_at).toLocaleString('zh-CN')
                    : '-'}
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('master.data_asset_catalog.col_updated_at')}
                </Typography>
                <Typography variant='body1'>
                  {detailAsset.updated_at
                    ? new Date(detailAsset.updated_at).toLocaleString('zh-CN')
                    : '-'}
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 100%', minWidth: '100%' }}>
                <Divider sx={{ my: 1 }} />
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  {i18n.t('master.data_asset_catalog.impact_title')}
                </Typography>
                {lineageBusy ? (
                  <CircularProgress size={20} />
                ) : impact ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ flex: '1 1 20%', minWidth: 120 }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('master.data_asset_catalog.impact_nodes')}
                      </Typography>
                      <Typography
                        variant='body1'
                        sx={{ fontWeight: 500 }}
                      >
                        {impact.affected_nodes}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: '1 1 20%', minWidth: 120 }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('master.data_asset_catalog.impact_downstream')}
                      </Typography>
                      <Typography
                        variant='body1'
                        sx={{ fontWeight: 500 }}
                      >
                        {impact.affected_downstream}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: '1 1 20%', minWidth: 120 }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('master.data_asset_catalog.impact_confidence')}
                      </Typography>
                      <Typography
                        variant='body1'
                        sx={{ fontWeight: 500 }}
                      >
                        {impact.confidence.toFixed(2)}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: '1 1 20%', minWidth: 120 }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('master.data_asset_catalog.impact_score')}
                      </Typography>
                      <Typography
                        variant='body1'
                        sx={{ fontWeight: 500 }}
                      >
                        {impact.impact_score.toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Typography variant='body1'>-</Typography>
                )}
              </Box>

              <Box sx={{ flex: '1 1 100%', minWidth: '100%' }}>
                <Divider sx={{ my: 1 }} />
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  {i18n.t('master.data_asset_catalog.lifecycle_title')}
                </Typography>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}
                >
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {i18n.t('master.data_asset_catalog.lifecycle_current')}
                  </Typography>
                  {lineageBusy ? (
                    <CircularProgress size={16} />
                  ) : (
                    <Chip
                      label={stage || '-'}
                      size='small'
                      color={stage === 'deleted' ? 'error' : 'primary'}
                    />
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                  {LIFECYCLE_TRANSITIONS.map((s) => (
                    <Button
                      key={s}
                      size='small'
                      variant={stage === s ? 'contained' : 'outlined'}
                      disabled={transitionBusy || stage === s}
                      onClick={() => handleTransition(s)}
                    >
                      {i18n.t(`master.data_asset_catalog.lifecycle_stage_${s}`)}
                    </Button>
                  ))}
                </Box>
                {history.length > 0 && (
                  <Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{ mb: 0.5 }}
                    >
                      {i18n.t('master.data_asset_catalog.lifecycle_history')}
                    </Typography>
                    {history.slice(0, 5).map((h) => (
                      <Typography
                        key={h.id}
                        variant='body2'
                        sx={{ mb: 0.25 }}
                      >
                        {h.from_stage ?? '-'} → {h.stage} · {h.reason || '-'} ·{' '}
                        {new Date(h.changed_at).toLocaleString('zh-CN')} · {h.changed_by}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>
            {i18n.t('master.data_asset_catalog.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataAssetCatalogPage;
