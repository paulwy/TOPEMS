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
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useNotificationStore } from '@/store';

const BiddingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [viewingBidding, setViewingBidding] = useState<Bidding | null>(null);
  const [biddingSuppliers, setBiddingSuppliers] = useState<any[]>([]);

  const apiAdapter = createCrudPageAdapter({
    list: srmApi.listBiddings,
    create: srmApi.createBidding,
    update: srmApi.updateBidding as any,
    delete: srmApi.deleteBidding,
  });

  const invalidateBiddings = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SRM.BIDDING });
  };

  const publishMutation = useMutation({
    mutationFn: async (id: string) => srmApi.publishBidding(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '发布成功', message: '招标项目已发布' });
      invalidateBiddings();
    },
    onError: () => {
      addNotification({ type: 'error', title: '发布失败', message: '发布招标项目失败' });
    },
  });

  const openBiddingMutation = useMutation({
    mutationFn: async (id: string) => srmApi.openBidding(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '开标成功', message: '招标项目已开标' });
      invalidateBiddings();
    },
    onError: () => {
      addNotification({ type: 'error', title: '开标失败', message: '开标操作失败' });
    },
  });

  const awardMutation = useMutation({
    mutationFn: async (params: { biddingId: string; supplierId: string }) =>
      srmApi.awardBidding(params.biddingId, params.supplierId),
    onSuccess: () => {
      addNotification({ type: 'success', title: '定标成功', message: '已完成定标' });
      invalidateBiddings();
      setShowSupplierDialog(false);
    },
    onError: () => {
      addNotification({ type: 'error', title: '定标失败', message: '定标操作失败' });
    },
  });

  const handleViewSuppliers = useCallback(async (bidding: Bidding) => {
    setViewingBidding(bidding);
    setShowSupplierDialog(true);
    try {
      const response = await srmApi.listBiddingSuppliers(bidding.id);
      if (response.success && response.data) {
        setBiddingSuppliers(response.data);
      } else {
        setBiddingSuppliers([]);
      }
    } catch {
      setBiddingSuppliers([]);
    }
  }, []);

  const handlePublish = useCallback(
    (bidding: Bidding) => {
      if (window.confirm(`确定要发布招标项目 "${bidding.bidding_no}" 吗？`)) {
        publishMutation.mutate(bidding.id);
      }
    },
    [publishMutation]
  );

  const handleOpenBidding = useCallback(
    (bidding: Bidding) => {
      if (window.confirm(`确定要对招标项目 "${bidding.bidding_no}" 进行开标吗？`)) {
        openBiddingMutation.mutate(bidding.id);
      }
    },
    [openBiddingMutation]
  );

  const handleAward = useCallback(
    (supplierId: string, supplierName: string) => {
      if (
        viewingBidding &&
        window.confirm(`确定将招标项目 "${viewingBidding.bidding_no}" 授予 ${supplierName} 吗？`)
      ) {
        awardMutation.mutate({ biddingId: viewingBidding.id, supplierId });
      }
    },
    [viewingBidding, awardMutation]
  );

  const customRowActions: RowAction[] = [
    {
      label: '发布',
      icon: <Send size={14} />,
      show: (row) => row.status === 'draft',
      onClick: (row) => handlePublish(row as unknown as Bidding),
    },
    {
      label: '投标人',
      icon: <Users size={14} />,
      show: (row) => (row.supplier_count as number) > 0,
      onClick: (row) => handleViewSuppliers(row as unknown as Bidding),
    },
    {
      label: '开标',
      icon: <Gavel size={14} />,
      show: (row) => row.status === 'bidding',
      onClick: (row) => handleOpenBidding(row as unknown as Bidding),
    },
  ];

  const headerContent = (rows: any[], total: number) => {
    const draft = rows.filter((r) => r.status === 'draft').length;
    const published = rows.filter((r) => r.status === 'published').length;
    const bidding = rows.filter((r) => r.status === 'bidding').length;
    const totalBudget = rows.reduce((sum, r) => sum + (r.budget_amount || 0), 0);

    return (
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        {[
          { label: '招标项目总数', value: total, color: 'primary' },
          { label: '草稿', value: draft, color: 'default' },
          { label: '已发布', value: published, color: 'info' },
          { label: '投标中', value: bidding, color: 'warning' },
          { label: '预算总额', value: `¥${totalBudget.toLocaleString()}`, color: 'success' },
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
          label={`状态: ${bidding.status}`}
          size='small'
          sx={{ mr: 1 }}
        />
        <Chip
          label={`投标数: ${bidding.supplier_count || 0}`}
          size='small'
          color='primary'
        />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
        <Box>
          <Box sx={{ fontSize: 12, color: 'text.secondary' }}>预算金额</Box>
          <Box sx={{ fontWeight: 600 }}>
            {bidding.budget_amount ? `¥${bidding.budget_amount.toLocaleString()}` : '-'}
          </Box>
        </Box>
        <Box>
          <Box sx={{ fontSize: 12, color: 'text.secondary' }}>中标供应商</Box>
          <Box sx={{ fontWeight: 600 }}>{bidding.winner_supplier_name || '-'}</Box>
        </Box>
      </Box>
      {bidding.description && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>项目描述</Box>
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
        breadcrumbs={[{ label: 'SRM' }, { label: '招投标管理' }]}
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
                <TableCell>供应商名称</TableCell>
                <TableCell align='right'>投标金额</TableCell>
                <TableCell>交货期</TableCell>
                <TableCell>联系人</TableCell>
                <TableCell>联系电话</TableCell>
                <TableCell>状态</TableCell>
                {(viewingBidding?.status === 'evaluating' ||
                  viewingBidding?.status === 'opened') && (
                  <TableCell align='center'>操作</TableCell>
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
                    暂无投标人
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
                        label={supplier.status === 'submitted' ? '已投标' : supplier.status}
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
                          定标
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
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BiddingPage;
