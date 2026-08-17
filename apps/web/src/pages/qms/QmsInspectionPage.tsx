import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Divider,
  Button as MuiButton,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import {
  Plus,
  CheckCircle,
  XCircle,
  ClipboardCheck,
  User,
  Send,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import {
  qmsApi,
  type QualityCheck,
  type CreateQualityCheckRequest,
  type AssignInspectionRequestBackend,
  type SubmitInspectionResultRequestBackend,
  type AuditInspectionRequestBackend,
} from '@/api/qms';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { inspectionSchema } from '@/schemas/qms';

const ct = designTokens.colors;

interface InspectionResultItem {
  item_name: string;
  standard_value?: string;
  measured_value?: string;
  is_qualified: boolean;
  remark?: string;
}

const apiAdapter: CrudApiAdapter<QualityCheck> = {
  list: async () => {
    const response = await qmsApi.listChecks();
    if (response.success === false) {
      throw new Error(response.message || i18n.t('pages.qms_inspection_page.k0'));
    }
    const items = response.data ?? [];
    return { data: items, total: items.length };
  },
  create: async (data) => {
    const response = await qmsApi.createCheck(data as CreateQualityCheckRequest);
    if (response.success === false) {
      throw new Error(response.message || i18n.t('pages.qms_inspection_page.k1'));
    }
    return response.data ?? ({} as QualityCheck);
  },
  update: async (id, data) => {
    const response = await qmsApi.updateCheck(id, data as CreateQualityCheckRequest);
    if (response.success === false) {
      throw new Error(response.message || i18n.t('pages.qms_inspection_page.k2'));
    }
    return response.data ?? ({} as QualityCheck);
  },
  delete: async (id) => {
    const response = await qmsApi.deleteCheck(id);
    if (response.success === false) {
      throw new Error(response.message || i18n.t('pages.qms_inspection_page.k3'));
    }
  },
};

const QmsInspectionPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<QualityCheck | null>(null);
  const [assignData, setAssignData] = useState({ assignee: '', operator: '' });
  const [submitData, setSubmitData] = useState({
    qualified_quantity: 0,
    unqualified_quantity: 0,
    inspector: '',
    memo: '',
    results: [] as InspectionResultItem[],
  });
  const [auditData, setAuditData] = useState({
    action: 'approve',
    operator: '',
    comment: '',
  });

  const assignMutation = useMutation({
    mutationFn: async (params: { id: string; data: AssignInspectionRequestBackend }) => {
      const response = await qmsApi.assignCheck(params.id, params.data);
      if (!response.success) {
        throw new Error(response.message || i18n.t('pages.qms_inspection_page.k4'));
      }
      return response;
    },
    onSuccess: () => {
      addNotification({
        title: i18n.t('pages.qms_inspection_page.k6'),
        message: i18n.t('pages.qms_inspection_page.k5'),
        type: 'success',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.QMS.INSPECTIONS,
        exact: false,
        refetchType: 'active',
      });
      setShowAssignModal(false);
    },
    onError: (err: unknown) => {
      addNotification({
        title: i18n.t('pages.qms_inspection_page.k7'),
        message: err instanceof Error ? err.message : i18n.t('pages.qms_inspection_page.k8'),
        type: 'error',
      });
    },
  });

  const submitResultMutation = useMutation({
    mutationFn: async (params: { id: string; data: SubmitInspectionResultRequestBackend }) => {
      const response = await qmsApi.submitCheckResult(params.id, params.data);
      if (!response.success) {
        throw new Error(response.message || i18n.t('pages.qms_inspection_page.k9'));
      }
      return response;
    },
    onSuccess: () => {
      addNotification({
        title: i18n.t('pages.qms_inspection_page.k11'),
        message: i18n.t('pages.qms_inspection_page.k10'),
        type: 'success',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.QMS.INSPECTIONS,
        exact: false,
        refetchType: 'active',
      });
      setShowSubmitModal(false);
    },
    onError: (err: unknown) => {
      addNotification({
        title: i18n.t('pages.qms_inspection_page.k12'),
        message: err instanceof Error ? err.message : i18n.t('pages.qms_inspection_page.k13'),
        type: 'error',
      });
    },
  });

  const auditMutation = useMutation({
    mutationFn: async (params: {
      id: string;
      data: AuditInspectionRequestBackend;
      action: string;
    }) => {
      const response =
        params.action === 'rework'
          ? await qmsApi.reworkCheck(params.id, params.data)
          : await qmsApi.auditCheck(params.id, params.data);
      if (!response.success) {
        throw new Error(response.message || i18n.t('pages.qms_inspection_page.k14'));
      }
      return response;
    },
    onSuccess: () => {
      const actionText =
        auditData.action === 'approve'
          ? i18n.t('pages.qms_inspection_page.k15')
          : auditData.action === 'reject'
            ? i18n.t('pages.qms_inspection_page.k16')
            : i18n.t('pages.qms_inspection_page.k17');
      addNotification({
        title: i18n.t('pages.qms_inspection_page.k18'),
        message: `${actionText}${i18n.t('pages.qms_inspection_page.k0')}`,
        type: 'success',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.QMS.INSPECTIONS,
        exact: false,
        refetchType: 'active',
      });
      setShowAuditModal(false);
    },
    onError: (err: unknown) => {
      addNotification({
        title: i18n.t('pages.qms_inspection_page.k19'),
        message: err instanceof Error ? err.message : i18n.t('pages.qms_inspection_page.k20'),
        type: 'error',
      });
    },
  });

  const submitting =
    assignMutation.isPending || submitResultMutation.isPending || auditMutation.isPending;

  const handleAssign = (row: Record<string, unknown>) => {
    setSelectedInspection(row as unknown as QualityCheck);
    setAssignData({ assignee: '', operator: '' });
    setShowAssignModal(true);
  };

  const handleSubmit = (row: Record<string, unknown>) => {
    setSelectedInspection(row as unknown as QualityCheck);
    setSubmitData({
      qualified_quantity: 0,
      unqualified_quantity: 0,
      inspector: '',
      memo: '',
      results: [],
    });
    setShowSubmitModal(true);
  };

  const handleAudit = (row: Record<string, unknown>, action: string) => {
    setSelectedInspection(row as unknown as QualityCheck);
    setAuditData({ action, operator: '', comment: '' });
    setShowAuditModal(true);
  };

  const handleRework = (row: Record<string, unknown>) => {
    setSelectedInspection(row as unknown as QualityCheck);
    setAuditData({ action: 'rework', operator: '', comment: '' });
    setShowAuditModal(true);
  };

  const handleAssignSubmit = () => {
    if (!selectedInspection) return;
    assignMutation.mutate({
      id: selectedInspection.id,
      data: {
        assignee: assignData.assignee,
        operator: assignData.operator,
      },
    });
  };

  const handleSubmitResult = () => {
    if (!selectedInspection) return;
    const total = submitData.qualified_quantity + submitData.unqualified_quantity;
    const rate = total > 0 ? (submitData.qualified_quantity / total) * 100 : 0;
    submitResultMutation.mutate({
      id: selectedInspection.id,
      data: {
        qualified_quantity: submitData.qualified_quantity,
        unqualified_quantity: submitData.unqualified_quantity,
        qualification_rate: rate,
        inspector: submitData.inspector,
        memo: submitData.memo,
        results: submitData.results.length > 0 ? submitData.results : undefined,
      },
    });
  };

  const handleAuditSubmit = () => {
    if (!selectedInspection) return;
    auditMutation.mutate({
      id: selectedInspection.id,
      action: auditData.action,
      data: {
        action: auditData.action,
        operator: auditData.operator,
        comment: auditData.comment,
      },
    });
  };

  const addResultItem = () => {
    setSubmitData((prev) => ({
      ...prev,
      results: [...prev.results, { item_name: '', is_qualified: true }],
    }));
  };

  const removeResultItem = (index: number) => {
    setSubmitData((prev) => ({
      ...prev,
      results: prev.results.filter((_, i) => i !== index),
    }));
  };

  const updateResultItem = (index: number, field: keyof InspectionResultItem, value: unknown) => {
    setSubmitData((prev) => ({
      ...prev,
      results: prev.results.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: field === 'is_qualified' ? value === 'true' || value === true : value,
            }
          : item
      ),
    }));
  };

  const customRowActions: RowAction[] = [
    {
      label: i18n.t('pages.qms_inspection_page.k21'),
      icon: <User style={{ width: 16, height: 16 }} />,
      color: 'primary',
      show: (row) => row.status === 'pending',
      onClick: (row) => handleAssign(row),
    },
    {
      label: i18n.t('pages.qms_inspection_page.k22'),
      icon: <Send style={{ width: 16, height: 16 }} />,
      color: 'primary',
      show: (row) => row.status === 'in_progress',
      onClick: (row) => handleSubmit(row),
    },
    {
      label: i18n.t('pages.qms_inspection_page.k23'),
      icon: <CheckCircle style={{ width: 16, height: 16 }} />,
      color: 'success',
      show: (row) => row.status === 'pending_audit',
      onClick: (row) => handleAudit(row, 'approve'),
    },
    {
      label: i18n.t('pages.qms_inspection_page.k24'),
      icon: <XCircle style={{ width: 16, height: 16 }} />,
      color: 'error',
      show: (row) => row.status === 'pending_audit',
      onClick: (row) => handleAudit(row, 'reject'),
    },
    {
      label: i18n.t('pages.qms_inspection_page.k25'),
      icon: <RotateCcw style={{ width: 16, height: 16 }} />,
      color: 'warning',
      show: (row) => row.status === 'rejected',
      onClick: (row) => handleRework(row),
    },
  ];

  const headerContent = (rows: QualityCheck[], total: number) => {
    const stats = {
      total,
      pending: rows.filter((i) => i.status === 'pending').length,
      in_progress: rows.filter((i) => i.status === 'in_progress').length,
      pending_audit: rows.filter((i) => i.status === 'pending_audit').length,
      completed: rows.filter((i) => i.status === 'completed').length,
      rejected: rows.filter((i) => i.status === 'rejected').length,
    };

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(6, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Card sx={{ bgcolor: 'primary.light' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'primary.light',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ClipboardCheck sx={{ width: 20, height: 20, color: 'primary.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  {i18n.t('pages.qms_inspection_page.k1')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.total}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: 'warning.100' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: ct.yellow[300],
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertCircle sx={{ width: 20, height: 20, color: ct.yellow[600] }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  {i18n.t('pages.qms_inspection_page.k2')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.pending}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: 'primary.100' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: ct.blue[300],
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ClipboardCheck sx={{ width: 20, height: 20, color: 'primary.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  {i18n.t('pages.qms_inspection_page.k3')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.in_progress}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: 'secondary.100' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: ct.purple[200],
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Send sx={{ width: 20, height: 20, color: 'secondary.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  {i18n.t('pages.qms_inspection_page.k4')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.pending_audit}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: 'success.lighter' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: ct.success[300],
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
                  {i18n.t('pages.qms_inspection_page.k5')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.completed}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: 'error.lighter' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: ct.error[300],
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <XCircle sx={{ width: 20, height: 20, color: 'error.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  {i18n.t('pages.qms_inspection_page.k6')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.rejected}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  };

  return (
    <>
      <CrudPage
        schema={inspectionSchema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
        headerContent={headerContent}
        breadcrumbs={[{ label: 'QMS' }, { label: i18n.t('pages.qms_inspection_page.k26') }]}
      />

      <Dialog
        open={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{i18n.t('pages.qms_inspection_page.k27')}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label={i18n.t('pages.qms_inspection_page.k7')}
              value={assignData.assignee}
              onChange={(e) => setAssignData({ ...assignData, assignee: e.target.value })}
              placeholder={i18n.t('pages.qms_inspection_page.k28')}
            />
            <TextField
              fullWidth
              label={i18n.t('pages.qms_inspection_page.k8')}
              value={assignData.operator}
              onChange={(e) => setAssignData({ ...assignData, operator: e.target.value })}
              placeholder={i18n.t('pages.qms_inspection_page.k29')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowAssignModal(false)}
            disabled={submitting}
          >
            {i18n.t('pages.qms_inspection_page.k9')}
          </Button>
          <Button
            variant='contained'
            onClick={handleAssignSubmit}
            sx={{ bgcolor: 'primary.main' }}
            disabled={submitting}
          >
            {submitting
              ? i18n.t('pages.qms_inspection_page.k10')
              : i18n.t('pages.qms_inspection_page.k30')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{i18n.t('pages.qms_inspection_page.k31')}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              type='number'
              label={i18n.t('pages.qms_inspection_page.k11')}
              value={submitData.qualified_quantity}
              onChange={(e) =>
                setSubmitData({
                  ...submitData,
                  qualified_quantity: parseInt(e.target.value) || 0,
                })
              }
              placeholder={i18n.t('pages.qms_inspection_page.k32')}
            />
            <TextField
              fullWidth
              type='number'
              label={i18n.t('pages.qms_inspection_page.k12')}
              value={submitData.unqualified_quantity}
              onChange={(e) =>
                setSubmitData({
                  ...submitData,
                  unqualified_quantity: parseInt(e.target.value) || 0,
                })
              }
              placeholder={i18n.t('pages.qms_inspection_page.k33')}
            />
            <TextField
              fullWidth
              label={i18n.t('pages.qms_inspection_page.k13')}
              value={submitData.inspector}
              onChange={(e) => setSubmitData({ ...submitData, inspector: e.target.value })}
              placeholder={i18n.t('pages.qms_inspection_page.k34')}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label={i18n.t('pages.qms_inspection_page.k35')}
              value={submitData.memo}
              onChange={(e) => setSubmitData({ ...submitData, memo: e.target.value })}
              placeholder={i18n.t('pages.qms_inspection_page.k36')}
            />
            <Divider />
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('pages.qms_inspection_page.k14')}
              </Typography>
              <Button
                variant='outlined'
                size='small'
                onClick={addResultItem}
                startIcon={<Plus style={{ width: 14, height: 14 }} />}
              >
                {i18n.t('pages.qms_inspection_page.k15')}
              </Button>
            </Box>
            {submitData.results.map((item, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                }}
              >
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <TextField
                    sx={{ flex: 1 }}
                    label={i18n.t('pages.qms_inspection_page.k37')}
                    value={item.item_name}
                    onChange={(e) => updateResultItem(index, 'item_name', e.target.value)}
                  />
                  <TextField
                    sx={{ flex: 1 }}
                    label={i18n.t('pages.qms_inspection_page.k38')}
                    value={item.standard_value || ''}
                    onChange={(e) => updateResultItem(index, 'standard_value', e.target.value)}
                  />
                  <TextField
                    sx={{ flex: 1 }}
                    label={i18n.t('pages.qms_inspection_page.k39')}
                    value={item.measured_value || ''}
                    onChange={(e) => updateResultItem(index, 'measured_value', e.target.value)}
                  />
                  <FormControl sx={{ minWidth: 100 }}>
                    <InputLabel>{i18n.t('pages.qms_inspection_page.k40')}</InputLabel>
                    <Select
                      value={String(item.is_qualified)}
                      label={i18n.t('pages.qms_inspection_page.k41')}
                      onChange={(e) => updateResultItem(index, 'is_qualified', e.target.value)}
                    >
                      <MenuItem value='true'>{i18n.t('pages.qms_inspection_page.k42')}</MenuItem>
                      <MenuItem value='false'>{i18n.t('pages.qms_inspection_page.k43')}</MenuItem>
                    </Select>
                  </FormControl>
                  <MuiButton
                    onClick={() => removeResultItem(index)}
                    color='error'
                    size='small'
                  >
                    {i18n.t('pages.qms_inspection_page.k16')}
                  </MuiButton>
                </Box>
                <TextField
                  fullWidth
                  label={i18n.t('pages.qms_inspection_page.k44')}
                  value={item.remark || ''}
                  onChange={(e) => updateResultItem(index, 'remark', e.target.value)}
                />
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowSubmitModal(false)}
            disabled={submitting}
          >
            {i18n.t('pages.qms_inspection_page.k17')}
          </Button>
          <Button
            variant='contained'
            onClick={handleSubmitResult}
            sx={{ bgcolor: 'primary.main' }}
            disabled={submitting}
          >
            {submitting
              ? i18n.t('pages.qms_inspection_page.k18')
              : i18n.t('pages.qms_inspection_page.k45')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          {auditData.action === 'rework'
            ? i18n.t('pages.qms_inspection_page.k46')
            : auditData.action === 'approve'
              ? i18n.t('pages.qms_inspection_page.k47')
              : i18n.t('pages.qms_inspection_page.k48')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label={i18n.t('pages.qms_inspection_page.k19')}
              value={auditData.operator}
              onChange={(e) => setAuditData({ ...auditData, operator: e.target.value })}
              placeholder={i18n.t('pages.qms_inspection_page.k49')}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label={i18n.t('pages.qms_inspection_page.k50')}
              value={auditData.comment}
              onChange={(e) => setAuditData({ ...auditData, comment: e.target.value })}
              placeholder={i18n.t('pages.qms_inspection_page.k51')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowAuditModal(false)}
            disabled={submitting}
          >
            {i18n.t('pages.qms_inspection_page.k20')}
          </Button>
          <Button
            variant='contained'
            onClick={handleAuditSubmit}
            disabled={submitting}
            sx={{
              bgcolor:
                auditData.action === 'approve'
                  ? 'success.dark'
                  : auditData.action === 'rework'
                    ? ct.yellow[600]
                    : 'error.dark',
            }}
          >
            {submitting
              ? i18n.t('pages.qms_inspection_page.k21')
              : auditData.action === 'rework'
                ? i18n.t('pages.qms_inspection_page.k52')
                : auditData.action === 'approve'
                  ? i18n.t('pages.qms_inspection_page.k53')
                  : i18n.t('pages.qms_inspection_page.k54')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default QmsInspectionPage;
