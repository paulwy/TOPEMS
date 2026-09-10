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
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  Dataset as DatasetIcon,
  Description as DescriptionIcon,
  Api as ApiIcon,
} from '@mui/icons-material';
import { dataAssetCatalogApiV66 } from '@/api/master/dataAssetCatalogV66';
import type {
  DataAsset,
  AssetType,
  AssetStatus,
  AssetSensitivity,
  AssetCatalogDashboard,
} from '@/api/master/dataAssetCatalogV66';

// 类型标签颜色映射
const TYPE_COLORS: Record<AssetType, string> = {
  table: '#1976d2',
  view: '#00acc1',
  function: '#3949ab',
  api: '#7b1fa2',
  file: '#f57c00',
  report: '#388e3c',
  dashboard: '#c2185b',
};

const STATUS_COLORS: Record<AssetStatus, string> = {
  active: '#388e3c',
  deprecated: '#f57c00',
  archived: '#757575',
  development: '#1976d2',
};

const SENSITIVITY_COLORS: Record<AssetSensitivity, string> = {
  public: '#388e3c',
  internal: '#1976d2',
  confidential: '#f57c00',
  restricted: '#d32f2f',
};

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
      setError('加载资产列表失败，请稍后重试');
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
            <DatasetIcon sx={{ color: '#1976d2' }} />
            数据资产目录
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mt: 0.5 }}
          >
            数据资产编目、搜索与治理 · V66 试点（后端复用 V60 metadata）
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
            刷新
          </Button>
          <Tooltip title='新建资产功能开发中'>
            <span>
              <Button
                variant='contained'
                startIcon={<AddIcon />}
                disabled
              >
                新建资产
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
                <DatasetIcon sx={{ color: '#1976d2' }} />
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  总资产数
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
                <DescriptionIcon sx={{ color: '#388e3c' }} />
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  活跃资产
                </Typography>
              </Box>
              {dashboardLoading ? (
                <CircularProgress size={24} />
              ) : (
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700, color: '#388e3c' }}
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
                  已弃用
                </Typography>
              </Box>
              {dashboardLoading ? (
                <CircularProgress size={24} />
              ) : (
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700, color: '#f57c00' }}
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
                <ApiIcon sx={{ color: '#d32f2f' }} />
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  未分配负责人
                </Typography>
              </Box>
              {dashboardLoading ? (
                <CircularProgress size={24} />
              ) : (
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700, color: '#d32f2f' }}
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
          placeholder='搜索资产名称/描述，按回车查询'
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
            border: '1px solid #ccc',
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
          查询
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
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 600 }}>资产名称</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>显示名</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>类型</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>敏感度</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>负责人</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>数据库/表</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>更新时间</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>操作</TableCell>
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
                    <Typography color='text.secondary'>暂无数据资产</Typography>
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
                          backgroundColor: TYPE_COLORS[asset.type],
                          color: '#fff',
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={asset.status}
                        size='small'
                        sx={{
                          backgroundColor: STATUS_COLORS[asset.status],
                          color: '#fff',
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={asset.sensitivity}
                        size='small'
                        sx={{
                          backgroundColor: SENSITIVITY_COLORS[asset.sensitivity],
                          color: '#fff',
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
                      <Tooltip title='详情'>
                        <IconButton
                          size='small'
                          onClick={() => handleView(asset)}
                        >
                          <VisibilityIcon fontSize='small' />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title='删除'>
                        <IconButton
                          size='small'
                          color='error'
                          onClick={() => handleDelete(asset)}
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
          labelRowsPerPage='每页行数'
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 共 ${count} 条`}
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
          sx={{ display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #eee' }}
        >
          <DatasetIcon sx={{ color: '#1976d2' }} />
          资产详情
          {detailAsset && (
            <Chip
              label={detailAsset.name}
              size='small'
              sx={{ ml: 2, backgroundColor: '#1976d2', color: '#fff' }}
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
                  资产名称
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
                  显示名
                </Typography>
                <Typography variant='body1'>{detailAsset.display_name || '-'}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 22%', minWidth: 150 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  类型
                </Typography>
                <Chip
                  label={detailAsset.type}
                  size='small'
                  sx={{ backgroundColor: TYPE_COLORS[detailAsset.type], color: '#fff', mt: 0.5 }}
                />
              </Box>
              <Box sx={{ flex: '1 1 22%', minWidth: 150 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  状态
                </Typography>
                <Chip
                  label={detailAsset.status}
                  size='small'
                  sx={{
                    backgroundColor: STATUS_COLORS[detailAsset.status],
                    color: '#fff',
                    mt: 0.5,
                  }}
                />
              </Box>
              <Box sx={{ flex: '1 1 22%', minWidth: 150 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  敏感度
                </Typography>
                <Chip
                  label={detailAsset.sensitivity}
                  size='small'
                  sx={{
                    backgroundColor: SENSITIVITY_COLORS[detailAsset.sensitivity],
                    color: '#fff',
                    mt: 0.5,
                  }}
                />
              </Box>
              <Box sx={{ flex: '1 1 22%', minWidth: 150 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  负责人
                </Typography>
                <Typography variant='body1'>{detailAsset.owner || '-'}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 22%', minWidth: 150 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  所属团队
                </Typography>
                <Typography variant='body1'>{detailAsset.owner_team || '-'}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 22%', minWidth: 150 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  分类
                </Typography>
                <Typography variant='body1'>{detailAsset.category || '-'}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 15%', minWidth: 120 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  数据库
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
                  表名
                </Typography>
                <Typography variant='body1'>{detailAsset.table_name || '-'}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 22%', minWidth: 150 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  行数
                </Typography>
                <Typography variant='body1'>{detailAsset.row_count ?? '-'}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 22%', minWidth: 150 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  列数
                </Typography>
                <Typography variant='body1'>{detailAsset.column_count ?? '-'}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 100%', minWidth: '100%' }}>
                <Divider sx={{ my: 1 }} />
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  描述
                </Typography>
                <Typography variant='body1'>{detailAsset.description || '-'}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 100%', minWidth: '100%' }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  标签
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
                  创建时间
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
                  更新时间
                </Typography>
                <Typography variant='body1'>
                  {detailAsset.updated_at
                    ? new Date(detailAsset.updated_at).toLocaleString('zh-CN')
                    : '-'}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataAssetCatalogPage;
