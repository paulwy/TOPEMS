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
import i18n from '@/i18n';
import { TrendingUp, Send, Check, XCircle } from 'lucide-react';
import CrudPage, { type RowAction } from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { inquirySchema } from '@/schemas/srm';
import { srmApi, type Inquiry, type Quotation } from '@/api/srm';
import { QUERY_KEYS, queryClient } from '@/lib/reactQuery';
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
    update: srmApi.updateInquiry,
    delete: srmApi.deleteInquiry,
  });

  const invalidateInquiries = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SRM.INQUIRIES ,
  exact: false,
  refetchType: 'active',
});
  };

  const publishMutation = useMutation({
    mutationFn: async (id: string) => srmApi.publishInquiry(id),
    onSuccess: () => {
      
      queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.SRM.STATISTICS,
          exact: false,
          refetchType: 'active',
        });
      addNotification({ type: 'success', title: i18n.t('pages.inquiry_quotation_page.k1'), message: i18n.t('pages.inquiry_quotation_page.k0') });
      invalidateInquiries();
    },
    onError: () => {
      addNotification({ type: 'error', title: i18n.t('pages.inquiry_quotation_page.k3'), message: i18n.t('pages.inquiry_quotation_page.k2') });
    },
  });

  const awardMutation = useMutation({
    mutationFn: async (id: string) => srmApi.awardQuotation(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: i18n.t('pages.inquiry_quotation_page.k5'), message: i18n.t('pages.inquiry_quotation_page.k4') });
      invalidateInquiries();
      if (viewingInquiry) {
        queryClient.invalidateQueries({
          queryKey: [...QUERY_KEYS.SRM.QUOTATIONS, viewingInquiry.id],
        
  exact: false,
  refetchType: 'active',
});
      }
    },
    onError: () => {
      addNotification({ type: 'error', title: i18n.t('pages.inquiry_quotation_page.k7'), message: i18n.t('pages.inquiry_quotation_page.k6') });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => srmApi.rejectQuotation(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: i18n.t('pages.inquiry_quotation_page.k9'), message: i18n.t('pages.inquiry_quotation_page.k8') });
      if (viewingInquiry) {
        queryClient.invalidateQueries({
          queryKey: [...QUERY_KEYS.SRM.QUOTATIONS, viewingInquiry.id],
        
  exact: false,
  refetchType: 'active',
});
      }
    },
    onError: () => {
      addNotification({ type: 'error', title: i18n.t('pages.inquiry_quotation_page.k11'), message: i18n.t('pages.inquiry_quotation_page.k10') });
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
      if (window.confirm(`${i18n.t('pages.inquiry_quotation_page.k0')}${inquiry.inquiry_no}${i18n.t('pages.inquiry_quotation_page.k1')}`)) {
        publishMutation.mutate(inquiry.id);
      }
    },
    [publishMutation]
  );

  const handleAwardQuotation = useCallback(
    (quotation: Quotation) => {
      if (
        window.confirm(
          `${i18n.t('pages.inquiry_quotation_page.k2')}${quotation.quotation_no}${i18n.t('pages.inquiry_quotation_page.k3')}${quotation.supplier_name}${i18n.t('pages.inquiry_quotation_page.k4')}`
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
      label: i18n.t('pages.inquiry_quotation_page.k12'),
      icon: <Send size={14} />,
      show: (row) => row.status === 'draft',
      onClick: (row) => handlePublish(row as unknown as Inquiry),
    },
    {
      label: i18n.t('pages.inquiry_quotation_page.k13'),
      icon: <TrendingUp size={14} />,
      show: (row) =>
        (row.status === 'published' || row.status === 'in_progress') &&
        (row.quotation_count as number) > 0,
      onClick: (row) => handleViewQuotations(row as unknown as Inquiry),
    },
  ];

  const headerContent = (rows: Record<string, unknown>[], total: number) => {
    const draft = rows.filter((r) => r.status === 'draft').length;
    const published = rows.filter((r) => r.status === 'published').length;
    const inProgress = rows.filter((r) => r.status === 'in_progress').length;
    const totalQuotations = rows.reduce((sum, r) => sum + ((r as Record<string, number>).quotation_count || 0), 0);

    return (
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        {[
          { label: i18n.t('pages.inquiry_quotation_page.k14'), value: total, color: 'primary' },
          { label: i18n.t('pages.inquiry_quotation_page.k15'), value: draft, color: 'default' },
          { label: i18n.t('pages.inquiry_quotation_page.k16'), value: published, color: 'info' },
          { label: i18n.t('pages.inquiry_quotation_page.k17'), value: inProgress, color: 'warning' },
          { label: i18n.t('pages.inquiry_quotation_page.k18'), value: totalQuotations, color: 'success' },
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
          label={`${i18n.t('pages.inquiry_quotation_page.k5')}${inquiry.status}`}
          size='small'
          sx={{ mr: 1 }}
        />
        <Chip
          label={`${i18n.t('pages.inquiry_quotation_page.k6')}${inquiry.urgency}`}
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
          <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{i18n.t('pages.inquiry_quotation_page.k19')}</Box>
          <Box sx={{ fontWeight: 600 }}>{inquiry.quotation_count || 0}</Box>
        </Box>
        <Box>
          <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{i18n.t('pages.inquiry_quotation_page.k20')}</Box>
          <Box sx={{ fontWeight: 600 }}>
            {inquiry.deadline ? new Date(inquiry.deadline).toLocaleDateString('zh-CN') : '-'}
          </Box>
        </Box>
      </Box>
      {inquiry.description && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>{i18n.t('pages.inquiry_quotation_page.k21')}</Box>
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
        breadcrumbs={[{ label: 'SRM' }, { label: i18n.t('pages.inquiry_quotation_page.k22') }]}
      />

      <Dialog
        open={showQuotationDialog}
        onClose={() => setShowQuotationDialog(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>{i18n.t('pages.inquiry_quotation_page.k0')}</DialogTitle>
        <DialogContent>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{i18n.t('pages.inquiry_quotation_page.k23')}</TableCell>
                <TableCell>{i18n.t('pages.inquiry_quotation_page.k24')}</TableCell>
                <TableCell>{i18n.t('pages.inquiry_quotation_page.k25')}</TableCell>
                <TableCell>{i18n.t('pages.inquiry_quotation_page.k26')}</TableCell>
                <TableCell>{i18n.t('pages.inquiry_quotation_page.k27')}</TableCell>
                <TableCell>{i18n.t('pages.inquiry_quotation_page.k28')}</TableCell>
                <TableCell align='center'>{i18n.t('pages.inquiry_quotation_page.k29')}</TableCell>
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
                    {i18n.t('pages.inquiry_quotation_page.k0')}
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
                            ? i18n.t('pages.inquiry_quotation_page.k30')
                            : quotation.status === 'awarded'
                              ? i18n.t('pages.inquiry_quotation_page.k31')
                              : quotation.status === 'rejected'
                                ? i18n.t('pages.inquiry_quotation_page.k32')
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
                              aria-label={i18n.t('pages.inquiry_quotation_page.k33')}
                              title={i18n.t('pages.inquiry_quotation_page.k34')}
                            >
                              <Check size={16} />
                            </IconButton>
                            <IconButton
                              size='small'
                              color='error'
                              onClick={() => handleRejectQuotation(quotation)}
                              aria-label={i18n.t('pages.inquiry_quotation_page.k35')}
                              title={i18n.t('pages.inquiry_quotation_page.k36')}
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
            {i18n.t('pages.inquiry_quotation_page.k1')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InquiryQuotationPage;
