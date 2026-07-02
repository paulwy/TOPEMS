import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import { Plus, Edit, Delete, Package, GitCompare, CheckCircle, Archive } from 'lucide-react';
import { bomApi, type BomVersion, type BomItem, type CreateBomVersionRequest } from '@/api/pdm/bom';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { PageContainer } from '@/components/common';

const STATUS_COLORS: Record<
  string,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
> = {
  draft: 'default',
  active: 'success',
  archived: 'default',
  superseded: 'warning',
};

const PHASE_STATUS_COLORS: Record<
  string,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
> = {
  planning: 'warning',
  active: 'success',
  on_hold: 'warning',
  completed: 'primary',
  cancelled: 'error',
};

interface BomFormData {
  bom_no: string;
  name: string;
  product_id: string;
  version: string;
  status: string;
  effective_date: string;
  description: string;
}

export const BomPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [versions, setVersions] = useState<BomVersion[]>([]);
  const [bomItems, setBomItems] = useState<BomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<BomVersion | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [compareVersionA, setCompareVersionA] = useState<string>('');
  const [compareVersionB, setCompareVersionB] = useState<string>('');
  const [formData, setFormData] = useState<BomFormData>({
    bom_no: '',
    name: '',
    product_id: '',
    version: '1.0',
    status: 'draft',
    effective_date: '',
    description: '',
  });
  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    loadVersions();
  }, []);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const response = await bomApi.listVersions();
      if (response.success && response.data) {
        setVersions(response.data as BomVersion[]);
      } else {
        setVersions([]);
      }
    } catch (err: unknown) {
      apiLogger.error('加载BOM版本数据失败:', err);
      setVersions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBomItems = async (versionId: string) => {
    try {
      const response = await bomApi.listItems(versionId);
      if (response.success && response.data) {
        setBomItems(response.data as BomItem[]);
      } else {
        setBomItems([]);
      }
    } catch (err: unknown) {
      apiLogger.error('加载BOM物料数据失败:', err);
      setBomItems([]);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleEditVersion = (version: BomVersion) => {
    setEditingVersion(version);
    setFormData({
      bom_no: version.bom_no || '',
      name: version.name || '',
      product_id: version.product_id || '',
      version: version.version || '1.0',
      status: version.status || 'draft',
      effective_date: version.effective_date || '',
      description: version.description || '',
    });
    setOpenDialog(true);
  };

  const handleDeleteVersion = async (id: string) => {
    try {
      await bomApi.deleteVersion(id);
      addNotification({ title: '成功', message: 'BOM版本删除成功', type: 'success' });
      loadVersions();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '删除失败', type: 'error' });
      apiLogger.error('删除BOM版本失败:', err);
    }
  };

  const handleActivateVersion = async (id: string) => {
    try {
      await bomApi.activateVersion(id);
      addNotification({ title: '成功', message: 'BOM版本已激活', type: 'success' });
      loadVersions();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '激活失败', type: 'error' });
      apiLogger.error('激活BOM版本失败:', err);
    }
  };

  const handleArchiveVersion = async (id: string) => {
    try {
      await bomApi.archiveVersion(id);
      addNotification({ title: '成功', message: 'BOM版本已归档', type: 'success' });
      loadVersions();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '归档失败', type: 'error' });
      apiLogger.error('归档BOM版本失败:', err);
    }
  };

  const handleViewItems = (version: BomVersion) => {
    setSelectedVersionId(version.id);
    loadBomItems(version.id);
    setActiveTab(1);
  };

  const handleCreate = () => {
    setEditingVersion(null);
    setFormData({
      bom_no: '',
      name: '',
      product_id: '',
      version: '1.0',
      status: 'draft',
      effective_date: '',
      description: '',
    });
    setOpenDialog(true);
  };

  const handleSaveVersion = async () => {
    try {
      const requestData: CreateBomVersionRequest = {
        bom_no: formData.bom_no,
        name: formData.name,
        product_id: formData.product_id,
        version: formData.version,
        status: formData.status,
        effective_date: formData.effective_date || undefined,
        description: formData.description,
      };

      if (editingVersion) {
        await bomApi.updateVersion(editingVersion.id, requestData);
        addNotification({ title: '成功', message: 'BOM版本更新成功', type: 'success' });
      } else {
        await bomApi.createVersion(requestData);
        addNotification({ title: '成功', message: 'BOM版本创建成功', type: 'success' });
      }
      setOpenDialog(false);
      setEditingVersion(null);
      loadVersions();
    } catch (err: unknown) {
      addNotification({
        title: '错误',
        message: editingVersion ? '更新失败' : '创建失败',
        type: 'error',
      });
      apiLogger.error('保存BOM版本失败:', err);
    }
  };

  const handleCompare = async () => {
    if (!compareVersionA || !compareVersionB) {
      addNotification({ title: '提示', message: '请选择两个版本进行对比', type: 'warning' });
      return;
    }
    try {
      const response = await bomApi.compareVersions(compareVersionA, compareVersionB);
      if (response.success && response.data) {
        addNotification({
          title: '对比完成',
          message: `发现差异：新增 ${response.data.differences.addeditems.length} 项，移除 ${response.data.differences.removeditems.length} 项，修改 ${response.data.differences.modifieditems.length} 项`,
          type: 'success',
        });
      }
      setCompareDialogOpen(false);
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '对比失败', type: 'error' });
      apiLogger.error('BOM对比失败:', err);
    }
  };

  const filteredVersions = useMemo(() => {
    return versions.filter((version) => {
      const matchesSearch =
        !searchTerm ||
        version.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        version.bom_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (version.product_name &&
          version.product_name.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [versions, searchTerm]);

  const statusOptions = [
    { label: '草稿', value: 'draft' },
    { label: '激活', value: 'active' },
    { label: '归档', value: 'archived' },
    { label: '替代', value: 'superseded' },
  ];

  const statusFilterOptions = statusOptions.map((opt) => ({ label: opt.label, value: opt.value }));

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: statusFilterOptions,
      },
    ],
    [statusFilterOptions]
  );

  const handleFilterChange = useCallback((values: Record<string, any>) => {
    // Filter implementation
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const columns: ColumnDef<BomVersion>[] = useMemo(
    () => [
      { id: 'bom_no', label: 'BOM编号', minWidth: 120 },
      { id: 'name', label: 'BOM名称', minWidth: 160 },
      { id: 'product_name', label: '产品', minWidth: 120 },
      {
        id: 'version',
        label: '版本',
        minWidth: 80,
        render: (row) => `v${row.version || '1.0'}`,
      },
      {
        id: 'status',
        label: '状态',
        minWidth: 100,
        render: (row) => (
          <Chip
            label={statusOptions.find((s) => s.value === row.status)?.label || row.status}
            color={STATUS_COLORS[row.status] || 'default'}
            size='small'
          />
        ),
      },
      { id: 'effective_date', label: '生效日期', minWidth: 120 },
      {
        id: 'created_at',
        label: '创建时间',
        minWidth: 160,
        render: (row) => {
          if (!row.created_at) return '-';
          const date = new Date(row.created_at);
          return date.toLocaleDateString('zh-CN');
        },
      },
    ],
    []
  );

  const rowActions: RowAction<BomVersion>[] = useMemo(
    () => [
      {
        label: '查看物料',
        icon: <Package size={16} />,
        color: 'primary',
        onClick: (row) => handleViewItems(row),
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        color: 'primary',
        onClick: (row) => handleEditVersion(row),
      },
      {
        label: '激活',
        icon: <CheckCircle size={16} />,
        color: 'success',
        onClick: (row) => handleActivateVersion(row.id),
        show: (row) => row.status === 'draft',
      },
      {
        label: '归档',
        icon: <Archive size={16} />,
        color: 'warning',
        onClick: (row) => handleArchiveVersion(row.id),
        show: (row) => row.status === 'active',
      },
      {
        label: '删除',
        icon: <Delete size={16} />,
        color: 'error',
        onClick: (row) => handleDeleteVersion(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个BOM版本吗？',
      },
    ],
    []
  );

  const itemColumns: ColumnDef<BomItem>[] = useMemo(
    () => [
      { id: 'item_no', label: '项号', minWidth: 80 },
      { id: 'part_number', label: '零件号', minWidth: 120 },
      { id: 'part_name', label: '零件名称', minWidth: 160 },
      { id: 'quantity', label: '数量', minWidth: 80 },
      { id: 'unit', label: '单位', minWidth: 80 },
      { id: 'unit_price', label: '单价', minWidth: 100 },
      { id: 'total_price', label: '总价', minWidth: 100 },
      {
        id: 'level',
        label: '层级',
        minWidth: 80,
        render: (row) => `第 ${row.level} 层`,
      },
    ],
    []
  );

  const statsCards = (
    <Grid
      container
      spacing={3}
      sx={{ mb: 2 }}
    >
      <Grid size={{ xs: 12, sm: 4 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}>BOM总数</Box>
          <Box sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
            {loading ? '...' : `${filteredVersions.length} 个`}
          </Box>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}>激活版本</Box>
          <Box sx={{ fontWeight: 'bold', fontSize: '1.5rem', color: 'success.main' }}>
            {loading ? '...' : `${versions.filter((v) => v.status === 'active').length} 个`}
          </Box>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}>草稿版本</Box>
          <Box sx={{ fontWeight: 'bold', fontSize: '1.5rem', color: 'warning.main' }}>
            {loading ? '...' : `${versions.filter((v) => v.status === 'draft').length} 个`}
          </Box>
        </Box>
      </Grid>
    </Grid>
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Package style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
      }}
    >
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{ mb: 2 }}
      >
        <Tab label='BOM版本' />
        <Tab label='BOM物料' />
        <Tab label='BOM对比' />
      </Tabs>

      {activeTab === 0 && (
        <ListPageTemplate
          title=''
          subtitle=''
          columns={columns}
          data={filteredVersions}
          loading={loading}
          searchable
          searchPlaceholder='搜索BOM名称、编号或产品...'
          onSearch={handleSearch}
          filters={filters}
          filtersValue={{}}
          onFilterChange={handleFilterChange}
          rowActions={rowActions}
          actions={[
            {
              label: 'BOM对比',
              icon: <GitCompare size={16} />,
              onClick: () => setCompareDialogOpen(true),
              variant: 'outlined',
            },
            {
              label: '添加BOM',
              icon: <Plus size={16} />,
              onClick: handleCreate,
              variant: 'contained',
            },
          ]}
          onRefresh={loadVersions}
          headerContent={statsCards}
          emptyMessage='暂无BOM数据'
        />
      )}

      {activeTab === 1 && (
        <ListPageTemplate
          title={
            selectedVersionId
              ? `物料清单 - ${versions.find((v) => v.id === selectedVersionId)?.name || ''}`
              : '请选择BOM版本'
          }
          subtitle=''
          columns={itemColumns}
          data={bomItems}
          loading={loading}
          searchable
          searchPlaceholder='搜索零件号或名称...'
          onSearch={(v) => setSearchTerm(v)}
          rowActions={[]}
          actions={[]}
          onRefresh={() => selectedVersionId && loadBomItems(selectedVersionId)}
          emptyMessage={selectedVersionId ? '暂无物料数据' : '请先选择一个BOM版本查看物料'}
        />
      )}

      {activeTab === 2 && (
        <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
          <GitCompare
            size={48}
            style={{ marginBottom: 16, opacity: 0.5 }}
          />
          <Box>选择两个BOM版本进行对比，查看差异</Box>
          <Button
            variant='contained'
            startIcon={<GitCompare size={16} />}
            onClick={() => setCompareDialogOpen(true)}
            sx={{ mt: 2 }}
          >
            开始对比
          </Button>
        </Box>
      )}

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{editingVersion ? '编辑BOM' : '添加BOM'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <TextField
              label='BOM编号 *'
              value={formData.bom_no}
              onChange={(e) => setFormData({ ...formData, bom_no: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label='BOM名称 *'
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label='产品ID'
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              fullWidth
            />
            <Grid
              container
              spacing={3}
            >
              <Grid size={{ xs: 6 }}>
                <TextField
                  label='版本'
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={formData.status}
                    label='状态'
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {statusOptions.map((option) => (
                      <MenuItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField
              label='生效日期'
              type='date'
              value={formData.effective_date}
              onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label='描述'
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleSaveVersion}
            disabled={!formData.bom_no || !formData.name}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={compareDialogOpen}
        onClose={() => setCompareDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>BOM版本对比</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>选择版本A</InputLabel>
              <Select
                value={compareVersionA}
                label='选择版本A'
                onChange={(e) => setCompareVersionA(e.target.value)}
              >
                {versions.map((v) => (
                  <MenuItem
                    key={v.id}
                    value={v.id}
                  >
                    {v.name} (v{v.version})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>选择版本B</InputLabel>
              <Select
                value={compareVersionB}
                label='选择版本B'
                onChange={(e) => setCompareVersionB(e.target.value)}
              >
                {versions.map((v) => (
                  <MenuItem
                    key={v.id}
                    value={v.id}
                  >
                    {v.name} (v{v.version})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareDialogOpen(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleCompare}
            disabled={!compareVersionA || !compareVersionB}
          >
            开始对比
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default BomPage;
