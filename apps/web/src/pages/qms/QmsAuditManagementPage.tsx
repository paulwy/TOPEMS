import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FileText, CheckCircle, Eye } from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Card,
  CardContent,
  Box,
  Typography,
  Button,
} from '@mui/material';
import { useAppStore } from '@/store';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { qmsApi } from '@/api/qms';
import type { AuditPlan } from '@/api/qms';
import { designTokens } from '@/theme/tokens';
const ct = designTokens.colors;

const QmsAuditManagementPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AuditPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const addNotification = useAppStore((state) => state.addNotification);

  const [auditPlans, setAuditPlans] = useState<AuditPlan[]>([]);

  const loadAuditPlans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await qmsApi.listAuditPlans();
      if (response.success && response.data) {
        const plansData = response.data as any;
        const plansArray = Array.isArray(plansData) ? plansData : plansData.plans || [];
        setAuditPlans(plansArray);
      }
    } catch (error: unknown) {
      addNotification({
        title: '加载失败',
        message: '加载审核数据失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadAuditPlans();
  }, [loadAuditPlans]);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      scheduled: { bg: 'primary.100', color: 'primary.dark' },
      planning: { bg: 'primary.100', color: 'primary.dark' },
      计划中: { bg: 'primary.100', color: 'primary.dark' },
      in_progress: { bg: 'warning.100', color: ct.yellow[600] },
 进行中: { bg: 'warning.100', color: ct.yellow[600] },
      completed: { bg: 'success.lighter', color: 'success.dark' },
      已完成: { bg: 'success.lighter', color: 'success.dark' },
      已计划: { bg: 'primary.100', color: 'primary.dark' },
    };
    const labels: Record<string, string> = {
      scheduled: '已计划',
      planning: '计划中',
      计划中: '计划中',
      in_progress: '进行中',
      进行中: '进行中',
      completed: '已完成',
      已完成: '已完成',
      已计划: '已计划',
    };
    const colorKey = status as keyof typeof colors;
    return (
      <Chip
        label={labels[status] || status}
        size='small'
        sx={{
          backgroundColor: colors[colorKey]?.bg || 'grey.100',
          color: colors[colorKey]?.color || 'text.secondary',
        }}
      />
    );
  };

  const auditColumns: ColumnDef<AuditPlan>[] = [
    { id: 'plan_no', label: '审核编号' },
    { id: 'title', label: '审核标题' },
    { id: 'audit_type', label: '审核类型' },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status),
    },
    { id: 'auditor', label: '审核人' },
    { id: 'start_date', label: '审核日期' },
    { id: 'departments', label: '涉及部门', render: (row) => row.departments?.join(', ') || '-' },
  ];

  const viewItem = (item: AuditPlan) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const auditRowActions: RowAction<AuditPlan>[] = [
    {
      label: '查看',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) => viewItem(row),
    },
  ];

  const filteredAudits = useMemo(() => {
    return auditPlans.filter(
      (item) =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.plan_no && item.plan_no.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [auditPlans, searchTerm]);

  const stats = {
    totalAudits: auditPlans.length,
    completedAudits: auditPlans.filter((a) => a.status === 'completed' || a.status === '已完成')
      .length,
    inProgressAudits: auditPlans.filter((a) => a.status === 'in_progress' || a.status === '进行中')
      .length,
  };

  const statsCards = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(1, 1fr)',
          md: 'repeat(3, 1fr)',
        },
        gap: 2,
        mb: 4,
      }}
    >
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.100',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText sx={{ width: 20, height: 20, color: 'primary.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                审核总数
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.totalAudits}
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
                bgcolor: 'secondary.100',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText sx={{ width: 20, height: 20, color: 'secondary.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                进行中审核
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.inProgressAudits}
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
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                已完成审核
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.completedAudits}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <PageContainer
      title='审核管理'
      subtitle='Audit Management'
      headerProps={{
        pageIcon: <FileText style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main}, ${ct.secondary[400]})`,
        search: {
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: '搜索编号或标题...',
        },
        actions: [],
      }}
      maxWidth='xl'
    >
      {statsCards}

      <Card>
        <CardContent sx={{ p: 0 }}>
          <ListPageTemplate
            columns={auditColumns}
            data={filteredAudits}
            loading={loading}
            getRowId={(row) => row.id}
            rowActions={auditRowActions}
            searchable={false}
            filters={[]}
            actions={[]}
            mobileCardTitleKey='title'
            mobileCardSubtitleKey='plan_no'
            mobileCardDisplayFields={['audit_type', 'status', 'auditor', 'start_date']}
            mobileCardFieldLabels={{
              audit_type: '审核类型',
              status: '状态',
              auditor: '审核人',
              start_date: '审核日期',
            }}
          />
        </CardContent>
      </Card>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>
          {selectedItem && selectedItem.plan_no
            ? `${selectedItem.plan_no} - ${selectedItem.title}`
            : selectedItem?.title || ''}
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    component='label'
                    sx={{
                      display: 'block',
                      fontSize: '0.875rem',
                      color: 'text.secondary',
                      mb: 0.5,
                    }}
                  >
                    审核类型
                  </Typography>
                  <Typography sx={{ mt: 0.5 }}>
                    {selectedItem.audit_type === 'internal' ? '内部审核' : '外部审核'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    component='label'
                    sx={{
                      display: 'block',
                      fontSize: '0.875rem',
                      color: 'text.secondary',
                      mb: 0.5,
                    }}
                  >
                    状态
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedItem.status)}</Box>
                </Box>
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    component='label'
                    sx={{
                      display: 'block',
                      fontSize: '0.875rem',
                      color: 'text.secondary',
                      mb: 0.5,
                    }}
                  >
                    审核人
                  </Typography>
                  <Typography sx={{ mt: 0.5 }}>{selectedItem.auditor || '-'}</Typography>
                </Box>
                <Box>
                  <Typography
                    component='label'
                    sx={{
                      display: 'block',
                      fontSize: '0.875rem',
                      color: 'text.secondary',
                      mb: 0.5,
                    }}
                  >
                    开始日期
                  </Typography>
                  <Typography sx={{ mt: 0.5 }}>
                    {selectedItem.start_date
                      ? new Date(selectedItem.start_date).toLocaleDateString('zh-CN')
                      : '-'}
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Typography
                  component='label'
                  sx={{
                    display: 'block',
                    fontSize: '0.875rem',
                    color: 'text.secondary',
                    mb: 0.5,
                  }}
                >
                  涉及部门
                </Typography>
                <Typography sx={{ mt: 0.5 }}>
                  {selectedItem.departments?.join(', ') || '-'}
                </Typography>
              </Box>
              {selectedItem.description && (
                <Box>
                  <Typography
                    component='label'
                    sx={{
                      display: 'block',
                      fontSize: '0.875rem',
                      color: 'text.secondary',
                      mb: 0.5,
                    }}
                  >
                    描述
                  </Typography>
                  <Typography sx={{ mt: 0.5 }}>{selectedItem.description}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default QmsAuditManagementPage;
