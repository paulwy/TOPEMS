import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Package, GitCompare, CheckCircle, Archive } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter, CrudTab } from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { bomSchema, bomItemSchema } from '@/schemas/pdm';
import { bomApi } from '@/api/pdm/bom';
import type {
  BomVersion,
  BomItem,
  CreateBomVersionRequest,
  CreateBomItemRequest,
} from '@/api/pdm/bom';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { useNotificationStore } from '@/store';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const baseAdapter = createCrudPageAdapter<BomVersion, CreateBomVersionRequest>({
  list: bomApi.listVersions,
  create: bomApi.createVersion,
  update: bomApi.updateVersion,
  delete: bomApi.deleteVersion,
});

const statusColorMap: Record<string, { bg: string; color: string }> = {
  draft: { bg: 'grey.100', color: 'text.secondary' },
  active: { bg: 'success.lighter', color: 'success.dark' },
  archived: { bg: 'grey.100', color: 'text.secondary' },
  superseded: { bg: 'warning.lighter', color: 'warning.dark' },
};

const statusLabelMap: Record<string, string> = {
  draft: '草稿',
  active: '激活',
  archived: '归档',
  superseded: '替代',
};

function extractListData(response: unknown): BomVersion[] {
  if (!response || typeof response !== 'object') return [];
  const obj = response as Record<string, unknown>;
  const data = obj.data;
  if (!data) return [];
  if (Array.isArray(data)) return data as BomVersion[];
  if (typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.items)) return d.items as BomVersion[];
    if (Array.isArray(d.data)) return d.data as BomVersion[];
  }
  return [];
}

export const BomPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [compareVersionA, setCompareVersionA] = useState('');
  const [compareVersionB, setCompareVersionB] = useState('');

  const { data: versionsResp } = useQuery({
    queryKey: QUERY_KEYS.PDM.BOM_VERSIONS,
    queryFn: async () => bomApi.listVersions(),
    staleTime: 5 * 60 * 1000,
  });

  const versions = extractListData(versionsResp);

  const { data: bomItems = [] } = useQuery({
    queryKey: QUERY_KEYS.PDM.BOM_ITEMS,
    queryFn: async () => {
      if (!selectedVersionId) return [];
      const response = await bomApi.listItems(selectedVersionId);
      if (response.success && response.data) {
        return response.data as BomItem[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!selectedVersionId,
  });

  const stats = useMemo(() => {
    return {
      total: versions.length,
      active: versions.filter((v) => v.status === 'active').length,
      draft: versions.filter((v) => v.status === 'draft').length,
    };
  }, [versions]);

  const activateVersionMutation = useMutation({
    mutationFn: (id: string) => bomApi.activateVersion(id),
    onSuccess: () => {
      addNotification({ title: '成功', message: 'BOM版本已激活', type: 'success' });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.BOM_VERSIONS });
    },
    onError: () => {
      addNotification({ title: '错误', message: '激活失败', type: 'error' });
    },
  });

  const archiveVersionMutation = useMutation({
    mutationFn: (id: string) => bomApi.archiveVersion(id),
    onSuccess: () => {
      addNotification({ title: '成功', message: 'BOM版本已归档', type: 'success' });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.BOM_VERSIONS });
    },
    onError: () => {
      addNotification({ title: '错误', message: '归档失败', type: 'error' });
    },
  });

  const compareVersionsMutation = useMutation({
    mutationFn: ({ versionA, versionB }: { versionA: string; versionB: string }) =>
      bomApi.compareVersions(versionA, versionB),
    onSuccess: (response) => {
      if (response.success && response.data) {
        addNotification({
          title: '对比完成',
          message: `发现差异：新增 ${response.data.differences.addeditems.length} 项，移除 ${response.data.differences.removeditems.length} 项，修改 ${response.data.differences.modifieditems.length} 项`,
          type: 'success',
        });
      }
      setCompareDialogOpen(false);
    },
    onError: () => {
      addNotification({ title: '错误', message: '对比失败', type: 'error' });
    },
  });

  const customRowActions = [
    {
      label: '查看物料',
      icon: <Package size={16} />,
      color: 'primary' as const,
      onClick: (row: Record<string, unknown>) => {
        const version = row as unknown as BomVersion;
        setSelectedVersionId(version.id);
      },
    },
    {
      label: '激活',
      icon: <CheckCircle size={16} />,
      color: 'success' as const,
      onClick: (row: Record<string, unknown>) => {
        const version = row as unknown as BomVersion;
        activateVersionMutation.mutate(version.id);
      },
      show: (row: Record<string, unknown>) => {
        const version = row as unknown as BomVersion;
        return version.status === 'draft';
      },
    },
    {
      label: '归档',
      icon: <Archive size={16} />,
      color: 'warning' as const,
      onClick: (row: Record<string, unknown>) => {
        const version = row as unknown as BomVersion;
        archiveVersionMutation.mutate(version.id);
      },
      show: (row: Record<string, unknown>) => {
        const version = row as unknown as BomVersion;
        return version.status === 'active';
      },
      divider: true,
    },
  ];

  const bomItemAdapter: CrudApiAdapter<Record<string, unknown>> = {
    list: async (_params) => {
      if (!selectedVersionId) return { data: [], total: 0 };
      const response = await bomApi.listItems(selectedVersionId);
      if (response.success && response.data) {
        return {
          data: response.data as unknown as Record<string, unknown>[],
          total: (response.data as BomItem[]).length,
        };
      }
      return { data: [], total: 0 };
    },
    create: async (data) => {
      const itemData = {
        ...data,
        bom_version_id: selectedVersionId,
      } as unknown as CreateBomItemRequest;
      const response = await bomApi.createItem(itemData);
      return (
        (response.data as unknown as Record<string, unknown>) || ({} as Record<string, unknown>)
      );
    },
    update: async (id, data) => {
      const response = await bomApi.updateItem(id, data as unknown as CreateBomItemRequest);
      return (
        (response.data as unknown as Record<string, unknown>) || ({} as Record<string, unknown>)
      );
    },
    delete: async (id) => {
      await bomApi.deleteItem(id);
    },
  };

  const headerContent = () => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'secondary.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package sx={{ width: 20, height: 20, color: 'secondary.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
              >
                BOM总数
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700 }}
              >
                {stats.total}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'success.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle sx={{ width: 20, height: 20, color: 'success.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
              >
                激活版本
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'success.main' }}
              >
                {stats.active}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'warning.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Archive sx={{ width: 20, height: 20, color: 'warning.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
              >
                草稿版本
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'warning.main' }}
              >
                {stats.draft}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  const detailContent = (row: Record<string, unknown>) => {
    const bom = row as unknown as BomVersion;
    const statusColors = statusColorMap[bom.status] || {
      bg: 'grey.100',
      color: 'text.secondary',
    };
    const statusLabel = statusLabelMap[bom.status] || bom.status;

    return (
      <Box
        sx={{
          pt: 2,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 2,
        }}
      >
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            BOM编号
          </Box>
          <Box sx={{ fontWeight: 500 }}>{bom.bom_no}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            版本
          </Box>
          <Box>v{bom.version || '1.0'}</Box>
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            BOM名称
          </Box>
          <Box>{bom.name}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            产品
          </Box>
          <Box>{bom.product_name || '-'}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            状态
          </Box>
          <Box sx={{ mt: 0.5 }}>
            <Chip
              label={statusLabel}
              size='small'
              sx={{
                backgroundColor: statusColors.bg,
                color: statusColors.color,
                fontWeight: 500,
              }}
            />
          </Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            生效日期
          </Box>
          <Box>{bom.effective_date || '-'}</Box>
        </Box>
        <Box>
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            创建时间
          </Box>
          <Box>{bom.created_at ? new Date(bom.created_at).toLocaleDateString('zh-CN') : '-'}</Box>
        </Box>
        {bom.description && (
          <Box sx={{ gridColumn: '1 / -1' }}>
            <Box
              component='span'
              sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
            >
              描述
            </Box>
            <Box>{bom.description}</Box>
          </Box>
        )}
      </Box>
    );
  };

  const handleCompare = () => {
    if (!compareVersionA || !compareVersionB) {
      addNotification({ title: '提示', message: '请选择两个版本进行对比', type: 'warning' });
      return;
    }
    compareVersionsMutation.mutate({ versionA: compareVersionA, versionB: compareVersionB });
  };

  const bomItemsTabContent = (
    <Box sx={{ mt: 2 }}>
      {selectedVersionId ? (
        <CrudPage
          schema={bomItemSchema}
          apiAdapter={bomItemAdapter}
          headerContent={
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              物料清单 - {versions.find((v) => v.id === selectedVersionId)?.name || ''}
            </Typography>
          }
          customColumns={[
            {
              id: 'level',
              label: '层级',
              render: (row: Record<string, unknown>) =>
                `第 ${(row as unknown as BomItem).level} 层`,
            },
          ]}
        />
      ) : (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <Package
            size={48}
            style={{ marginBottom: 16, opacity: 0.5 }}
          />
          <Typography>请先选择一个BOM版本查看物料</Typography>
        </Box>
      )}
    </Box>
  );

  const compareTabContent = (
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
  );

  const tabs: CrudTab[] = [
    {
      id: 'versions',
      label: 'BOM版本',
      content: null,
    },
    {
      id: 'items',
      label: 'BOM物料',
      content: bomItemsTabContent,
    },
    {
      id: 'compare',
      label: 'BOM对比',
      content: compareTabContent,
    },
  ];

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Package style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary.main} 0%, ${ct.secondary.dark} 100%)`,
      }}
      maxWidth='xl'
    >
      <CrudPage
        schema={bomSchema}
        apiAdapter={baseAdapter}
        breadcrumbs={[{ label: 'PDM' }, { label: 'BOM管理' }]}
        headerContent={headerContent}
        detailContent={detailContent}
        detailMaxWidth='lg'
        customRowActions={customRowActions}
        tabs={tabs}
        defaultTab='versions'
      />

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
