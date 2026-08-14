import React, { useState, useCallback } from 'react';
import i18n from '@/i18n';

interface BiddingSupplier {
  id: string;
  supplier_name: string;
  bid_amount?: number;
  delivery_time?: string;
  contact_person?: string;
  phone?: string;
  status?: string;
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { Gavel, Users, Send, Check } from 'lucide-react';
import CrudPage, { type RowAction } from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { biddingSchema } from '@/schemas/srm';
import { srmApi, type Bidding } from '@/api/srm';
import { QUERY_KEYS, queryClient } from '@/lib/reactQuery';
import { useNotificationStore } from '@/store';

const BiddingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [viewingBidding, setViewingBidding] = useState<Bidding | null>(null);
  const [biddingSuppliers, setBiddingSuppliers] = useState<BiddingSupplier[]>([]);

  const apiAdapter = createCrudPageAdapter({
    list: srmApi.listBiddings,
    create: srmApi.createBidding,
    update: srmApi.updateBidding,
    delete: srmApi.deleteBidding,
  });

  const invalidateBiddings = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SRM.BIDDING ,
  exact: false,
  refetchType: 'active',
});
  };

  const publishMutation = useMutation({
    mutationFn: async (id: string) => srmApi.publishBidding(id),
    onSuccess: () => {
      
      queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.SRM.STATISTICS,
          exact: false,
          refetchType: 'active',
        });
      addNotification({ type: 'success', title: i18n.t('pages.bidding_page.k1'), message: i18n.t('pages.bidding_page.k0') });
      invalidateBiddings();
    },
    onError: () => {
      addNotification({ type: 'error', title: i18n.t('pages.bidding_page.k3'), message: i18n.t('pages.bidding_page.k2') });
    },
  });

  const openBiddingMutation = useMutation({
    mutationFn: async (id: string) => srmApi.openBidding(id),
    onSuccess: () => {
      
      queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.SRM.STATISTICS,
          exact: false,
          refetchType: 'active',
        });
      addNotification({ type: 'success', title: i18n.t('pages.bidding_page.k5'), message: i18n.t('pages.bidding_page.k4') });
      invalidateBiddings();
    },
    onError: () => {
      addNotification({ type: 'error', title: i18n.t('pages.bidding_page.k7'), message: i18n.t('pages.bidding_page.k6') });
    },
  });

  const awardMutation = useMutation({
    mutationFn: async (params: { biddingId: string; supplierId: string }) =>
      srmApi.awardBidding(params.biddingId, params.supplierId),
    onSuccess: () => {
      
      queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.SRM.STATISTICS,
          exact: false,
          refetchType: 'active',
        });
      addNotification({ type: 'success', title: i18n.t('pages.bidding_page.k9'), message: i18n.t('pages.bidding_page.k8') });
      invalidateBiddings();
      setShowSupplierDialog(false);
    },
    onError: () => {
      addNotification({ type: 'error', title: i18n.t('pages.bidding_page.k11'), message: i18n.t('pages.bidding_page.k10') });
    },
  });

  const handleViewSuppliers = useCallback(async (bidding: Bidding) => {
    setViewingBidding(bidding);
    setShowSupplierDialog(true);
    try {
      const response = await srmApi.listBiddingSuppliers(bidding.id);
      if (response.success && response.data) {
        setBiddingSuppliers(response.data as unknown as BiddingSupplier[]);
      } else {
        setBiddingSuppliers([]);
      }
    } catch {
      setBiddingSuppliers([]);
    }
  }, []);

  const handlePublish = useCallback(
    (bidding: Bidding) => {
      if (window.confirm(`${i18n.t('pages.bidding_page.k0')}${bidding.bidding_no}${i18n.t('pages.bidding_page.k1')}`)) {
        publishMutation.mutate(bidding.id);
      }
    },
    [publishMutation]
  );

  const handleOpenBidding = useCallback(
    (bidding: Bidding) => {
      if (window.confirm(`${i18n.t('pages.bidding_page.k2')}${bidding.bidding_no}${i18n.t('pages.bidding_page.k3')}`)) {
        openBiddingMutation.mutate(bidding.id);
      }
    },
    [openBiddingMutation]
  );

  const handleAward = useCallback(
    (supplierId: string, supplierName: string) => {
      if (
        viewingBidding &&
        window.confirm(`${i18n.t('pages.bidding_page.k4')}${viewingBidding.bidding_no}${i18n.t('pages.bidding_page.k5')}${supplierName}${i18n.t('pages.bidding_page.k6')}`)
      ) {
        awardMutation.mutate({ biddingId: viewingBidding.id, supplierId });
      }
    },
    [viewingBidding, awardMutation]
  );

  const customRowActions: RowAction[] = [
    {
      label: i18n.t('pages.bidding_page.k12'),
      icon: <Send size={14} />,
      show: (row) => row.status === 'draft',
      onClick: (row) => handlePublish(row as unknown as Bidding),
    },
    {
      label: i18n.t('pages.bidding_page.k13'),
      icon: <Users size={14} />,
      show: (row) => (row.supplier_count as number) > 0,
      onClick: (row) => handleViewSuppliers(row as unknown as Bidding),
    },
    {
      label: i18n.t('pages.bidding_page.k14'),
      icon: <Gavel size={14} />,
      show: (row) => row.status === 'bidding',
      onClick: (row) => handleOpenBidding(row as unknown as Bidding),
    },
  ];

  const headerContent = (rows: Record<string, unknown>[], total: number) => {
    const draft = rows.filter((r) => r.status === 'draft').length;
    const published = rows.filter((r) => r.status === 'published').length;
    const bidding = rows.filter((r) => r.status === 'bidding').length;
    const totalBudget = rows.reduce((sum, r) => sum + ((r as Record<string, number>).budget_amount || 0), 0);

    return (
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        {[
          { label: i18n.t('pages.bidding_page.k15'), value: total, color: 'primary' },
          { label: i18n.t('pages.bidding_page.k16'), value: draft, color: 'default' },
          { label: i18n.t('pages.bidding_page.k17'), value: published, color: 'info' },
          { label: i18n.t('pages.bidding_page.k18'), value: bidding, color: 'warning' },
          { label: i18n.t('pages.bidding_page.k19'), value: `¥${totalBudget.toLocaleString()}`, color: 'success' },
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

  const detailContent = (bidding: Bidding) => (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Chip
          label={`${i18n.t('pages.bidding_page.k7')}${bidding.status}`}
          size='small'
          sx={{ mr: 1 }}
        />
        <Chip
          label={`${i18n.t('pages.bidding_page.k8')}${bidding.supplier_count || 0}`}
          size='small'
          color='primary'
        />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
        <Box>
          <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{i18n.t('pages.bidding_page.k20')}</Box>
          <Box sx={{ fontWeight: 600 }}>
            {bidding.budget_amount ? `¥${bidding.budget_amount.toLocaleString()}` : '-'}
          </Box>
        </Box>
        <Box>
          <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{i18n.t('pages.bidding_page.k21')}</Box>
          <Box sx={{ fontWeight: 600 }}>{bidding.winner_supplier_name || '-'}</Box>
        </Box>
      </Box>
      {bidding.description && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>{i18n.t('pages.bidding_page.k22')}</Box>
          <Box sx={{ fontSize: 14 }}>{bidding.description}</Box>
        </Box>
      )}
    </Box>
  );

  return (
    <>
      <CrudPage
        schema={biddingSchema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
        headerContent={headerContent}
        detailContent={(row) => detailContent(row as unknown as Bidding)}
        breadcrumbs={[{ label: 'SRM' }, { label: i18n.t('pages.bidding_page.k23') }]}
      />

      <Dialog
        open={showSupplierDialog}
        onClose={() => setShowSupplierDialog(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>投标人列表 - {viewingBidding?.bidding_no}</DialogTitle>
        <DialogContent>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{i18n.t('pages.bidding_page.k24')}</TableCell>
                <TableCell align='right'>{i18n.t('pages.bidding_page.k25')}</TableCell>
                <TableCell>{i18n.t('pages.bidding_page.k26')}</TableCell>
                <TableCell>{i18n.t('pages.bidding_page.k27')}</TableCell>
                <TableCell>{i18n.t('pages.bidding_page.k28')}</TableCell>
                <TableCell>{i18n.t('pages.bidding_page.k29')}</TableCell>
                {(viewingBidding?.status === 'evaluating' ||
                  viewingBidding?.status === 'opened') && (
                  <TableCell align='center'>{i18n.t('pages.bidding_page.k30')}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {biddingSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      viewingBidding?.status === 'evaluating' || viewingBidding?.status === 'opened'
                        ? 7
                        : 6
                    }
                    align='center'
                    sx={{ py: 4, color: 'text.secondary' }}
                  >
                    {i18n.t('pages.bidding_page.k0')}
                  </TableCell>
                </TableRow>
              ) : (
                biddingSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell sx={{ fontWeight: 500 }}>{supplier.supplier_name}</TableCell>
                    <TableCell align='right'>
                      ¥{supplier.bid_amount?.toLocaleString() || '-'}
                    </TableCell>
                    <TableCell>{supplier.delivery_time || '-'}</TableCell>
                    <TableCell>{supplier.contact_person || '-'}</TableCell>
                    <TableCell>{supplier.phone || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        label={supplier.status === 'submitted' ? i18n.t('pages.bidding_page.k31') : supplier.status}
                        color='primary'
                        variant='outlined'
                      />
                    </TableCell>
                    {(viewingBidding?.status === 'evaluating' ||
                      viewingBidding?.status === 'opened') && (
                      <TableCell align='center'>
                        <Button
                          size='small'
                          color='success'
                          onClick={() => handleAward(supplier.id, supplier.supplier_name)}
                          startIcon={<Check size={12} />}
                        >
                          {i18n.t('pages.bidding_page.k1')}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowSupplierDialog(false)}
          >
            {i18n.t('pages.bidding_page.k2')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BiddingPage;
