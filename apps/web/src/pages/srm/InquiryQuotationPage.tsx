import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { TrendingUp, Send, Check, XCircle } from 'lucide-react';
import CrudPage, { type RowAction } from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { inquirySchema } from '@/schemas/srm';
import { srmApi, type Inquiry, type Quotation } from '@/api/srm';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useNotificationStore } from '@/store';

const InquiryQuotationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const [showQuotationDialog, setShowQuotationDialog] = useState(false);
  const [viewingInquiry, setViewingInquiry] = useState<Inquiry | null>(null);
  const [quotations, setQuotations] = useState<Quotation[]>([]);

  const apiAdapter = createCrudPageAdapter({
    list: srmApi.listInquiries,
    create: srmApi.createInquiry,
    update: srmApi.updateInquiry as any,
    delete: srmApi.deleteInquiry,
  });

  const invalidateInquiries = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SRM.INQUIRIES });
  };

  const publishMutation = useMutation({
    mutationFn: async (id: string) => srmApi.publishInquiry(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '发布成功', message: '询价单已发布' });
      invalidateInquiries();
    },
    onError: () => {
      addNotification({ type: 'error', title: '发布失败', message: '发布询价单失败' });
    },
  });

  const awardMutation = useMutation({
    mutationFn: async (id: string) => srmApi.awardQuotation(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '授标成功', message: '已完成授标' });
      invalidateInquiries();
      if (viewingInquiry) {
        queryClient.invalidateQueries({
          queryKey: [...QUERY_KEYS.SRM.QUOTATIONS, viewingInquiry.id],
        });
      }
    },
    onError: () => {
      addNotification({ type: 'error', title: '授标失败', message: '授标操作失败' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => srmApi.rejectQuotation(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '已拒绝', message: '报价单已拒绝' });
      if (viewingInquiry) {
        queryClient.invalidateQueries({
          queryKey: [...QUERY_KEYS.SRM.QUOTATIONS, viewingInquiry.id],
        });
      }
    },
    onError: () => {
      addNotification({ type: 'error', title: '操作失败', message: '拒绝报价失败' });
    },
  });

  const handleViewQuotations = useCallback(async (inquiry: Inquiry) => {
    setViewingInquiry(inquiry);
    setShowQuotationDialog(true);
    try {
      const response = await srmApi.listQuotations(inquiry.id);
      if (response.success && response.data) {
        setQuotations(response.data);
      } else {
        setQuotations([]);
      }
    } catch {
      setQuotations([]);
    }
  }, []);

  const handlePublish = useCallback(
    (inquiry: Inquiry) => {
      if (window.confirm(`确定要发布询价单 "${inquiry.inquiry_no}" 吗？`)) {
        publishMutation.mutate(inquiry.id);
      }
    },
    [publishMutation]
  );

  const handleAwardQuotation = useCallback(
    (quotation: Quotation) => {
      if (
        window.confirm(
          `确定要将报价单 "${quotation.quotation_no}" 授标给 ${quotation.supplier_name} 吗？`
        )
      ) {
        awardMutation.mutate(quotation.id);
      }
    },
    [awardMutation]
  );

  const handleRejectQuotation = useCallback(
    (quotation: Quotation) => {
      rejectMutation.mutate(quotation.id);
    },
    [rejectMutation]
  );

  const customRowActions: RowAction[] = [
    {
      label: '发布',
      icon: <Send size={14} />,
      show: (row) => row.status === 'draft',
      onClick: (row) => handlePublish(row as Inquiry),
    },
    {
      label: '查看报价',
      icon: <TrendingUp size={14} />,
      show: (row) =>
        (row.status === 'published' || row.status === 'in_progress') &&
        (row.quotation_count as number) > 0,
      onClick: (row) => handleViewQuotations(row as Inquiry),
    },
  ];

  const headerContent = (rows: any[], total: number) => {
    const draft = rows.filter((r) => r.status === 'draft').length;
    const published = rows.filter((r) => r.status === 'published').length;
    const inProgress = rows.filter((r) => r.status === 'in_progress').length;
    const totalQuotations = rows.reduce((sum, r) => sum + (r.quotation_count || 0), 0);

    return (
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        {[
          { label: '询价单总数', value: total, color: 'primary' },
          { label: '草稿', value: draft, color: 'default' },
          { label: '已发布', value: published, color: 'info' },
          { label: '报价中', value: inProgress, color: 'warning' },
          { label: '总报价数', value: totalQuotations, color: 'success' },
        ].map((stat) => (
          <Box
            key={stat.label}
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: `${stat.color}.light`,
              minWidth: 120,
              textAlign: 'center',
            }}
          >
            <Box sx={{ fontSize: 20, fontWeight: 600, color: `${stat.color}.dark` }}>
              {stat.value}
            </Box>
            <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{stat.label}</Box>
          </Box>
        ))}
      </Box>
    );
  };

  const detailContent = (inquiry: Inquiry) => (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Chip
          label={`状态: ${inquiry.status}`}
          size='small'
          sx={{ mr: 1 }}
        />
        <Chip
          label={`紧急程度: ${inquiry.urgency}`}
          size='small'
          color={
            inquiry.urgency === 'urgent'
              ? 'error'
              : inquiry.urgency === 'high'
                ? 'warning'
                : 'primary'
          }
        />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
        <Box>
          <Box sx={{ fontSize: 12, color: 'text.secondary' }}>报价数</Box>
          <Box sx={{ fontWeight: 600 }}>{inquiry.quotation_count || 0}</Box>
        </Box>
        <Box>
          <Box sx={{ fontSize: 12, color: 'text.secondary' }}>截止日期</Box>
          <Box sx={{ fontWeight: 600 }}>
            {inquiry.deadline ? new Date(inquiry.deadline).toLocaleDateString('zh-CN') : '-'}
          </Box>
        </Box>
      </Box>
      {inquiry.description && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>描述</Box>
          <Box sx={{ fontSize: 14 }}>{inquiry.description}</Box>
        </Box>
      )}
    </Box>
  );

  return (
    <>
      <CrudPage
        schema={inquirySchema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
        headerContent={headerContent}
        detailContent={(row) => detailContent(row as unknown as Inquiry)}
        breadcrumbs={[{ label: 'SRM' }, { label: '询报价管理' }]}
      />

      <Dialog
        open={showQuotationDialog}
        onClose={() => setShowQuotationDialog(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>报价单列表 - {viewingInquiry?.inquiry_no}</DialogTitle>
        <DialogContent>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>报价单号</TableCell>
                <TableCell>供应商</TableCell>
                <TableCell>总金额</TableCell>
                <TableCell>交货期</TableCell>
                <TableCell>有效期至</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align='center'>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {quotations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align='center'
                    sx={{ py: 4, color: 'text.secondary' }}
                  >
                    暂无报价
                  </TableCell>
                </TableRow>
              ) : (
                quotations.map((quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell sx={{ fontWeight: 500 }}>{quotation.quotation_no}</TableCell>
                    <TableCell>{quotation.supplier_name}</TableCell>
                    <TableCell>¥{quotation.total_amount?.toLocaleString() || '-'}</TableCell>
                    <TableCell>{quotation.delivery_time || '-'}</TableCell>
                    <TableCell>
                      {quotation.valid_until
                        ? new Date(quotation.valid_until).toLocaleDateString('zh-CN')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        label={
                          quotation.status === 'submitted'
                            ? '已提交'
                            : quotation.status === 'awarded'
                              ? '已授标'
                              : quotation.status === 'rejected'
                                ? '已拒绝'
                                : quotation.status
                        }
                        color={
                          quotation.status === 'awarded'
                            ? 'success'
                            : quotation.status === 'rejected'
                              ? 'error'
                              : 'primary'
                        }
                        variant='outlined'
                      />
                    </TableCell>
                    <TableCell align='center'>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        {quotation.status === 'submitted' && (
                          <>
                            <IconButton
                              size='small'
                              color='success'
                              onClick={() => handleAwardQuotation(quotation)}
                              aria-label='授标'
                              title='授标'
                            >
                              <Check size={16} />
                            </IconButton>
                            <IconButton
                              size='small'
                              color='error'
                              onClick={() => handleRejectQuotation(quotation)}
                              aria-label='拒绝'
                              title='拒绝'
                            >
                              <XCircle size={16} />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowQuotationDialog(false)}
          >
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InquiryQuotationPage;
