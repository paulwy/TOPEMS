import {
  Box,
  Card,
  Chip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
} from '@mui/material';
import React, { useState, useMemo } from 'react';
import { Plus, Eye, Filter, CheckSquare, XCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { PageContainer } from '@/components/common';

interface ExpenseClaim {
  id: string;
  title: string;
  amount: number;
  category: string;
  employee: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  description?: string;
}

type ModalType = 'create' | 'view' | 'approve';

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: 'warning.light', color: 'warning.dark', label: '待审批' },
  approved: { bg: 'success.light', color: 'success.dark', label: '已批准' },
  rejected: { bg: 'error.light', color: 'error.dark', label: '已拒绝' },
};

const EXPENSE_CATEGORIES = ['差旅费', '办公费', '招待费', '培训费', '交通费', '其他'];

const ExpenseClaimPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [showModal, setShowModal] = useState(false);
  const [currentModalType, setCurrentModalType] = useState<ModalType>('create');
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [formData, setFormData] = useState<Partial<ExpenseClaim>>({
    title: '',
    amount: 0,
    category: '',
    employee: '',
    description: '',
  });

  const [expenseClaims, setExpenseClaims] = useState<ExpenseClaim[]>([
    {
      id: '1',
      title: '差旅费报销',
      amount: 2580,
      category: '差旅费',
      employee: '张三',
      status: 'approved',
      created_at: '2026-05-20',
      description: '北京出差机票、酒店费用',
    },
    {
      id: '2',
      title: '办公用品采购',
      amount: 850,
      category: '办公费',
      employee: '李四',
      status: 'pending',
      created_at: '2026-05-25',
      description: '打印纸、笔、文件夹等办公用品',
    },
    {
      id: '3',
      title: '业务招待费',
      amount: 1200,
      category: '招待费',
      employee: '王五',
      status: 'rejected',
      created_at: '2026-05-24',
      description: '客户招待餐费',
    },
    {
      id: '4',
      title: '培训费用',
      amount: 3500,
      category: '培训费',
      employee: '赵六',
      status: 'pending',
      created_at: '2026-05-26',
      description: '技术培训课程费用',
    },
    {
      id: '5',
      title: '市内交通费',
      amount: 320,
      category: '交通费',
      employee: '钱七',
      status: 'approved',
      created_at: '2026-05-22',
      description: '本月市内打车费用',
    },
  ]);

  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config = STATUS_STYLES[status] || {
      bg: 'grey.200',
      color: 'grey.700',
      label: status,
    };
    return (
      <Chip
        size='small'
        label={config.label}
        sx={{ bgcolor: config.bg, color: config.color, fontWeight: 500 }}
      />
    );
  };

  const handleOpenModal = (type: ModalType, claim?: ExpenseClaim) => {
    setCurrentModalType(type);
    if (claim) {
      setSelectedClaim(claim);
      setFormData({ ...claim });
    } else {
      setSelectedClaim(null);
      setFormData({
        title: '',
        amount: 0,
        category: '',
        employee: '',
        description: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedClaim(null);
    setFormData({
      title: '',
      amount: 0,
      category: '',
      employee: '',
      description: '',
    });
  };

  const handleCreateClaim = () => {
    if (!formData.title || !formData.amount || !formData.category || !formData.employee) {
      addNotification({
        title: '提交失败',
        message: '请填写必填项',
        type: 'error',
      });
      return;
    }

    const newClaim: ExpenseClaim = {
      id: String(Date.now()),
      title: formData.title,
      amount: Number(formData.amount),
      category: formData.category,
      employee: formData.employee,
      status: 'pending',
      created_at: new Date().toISOString().split('T')[0],
      description: formData.description,
    };

    setExpenseClaims([newClaim, ...expenseClaims]);
    addNotification({
      title: '提交成功',
      message: '报销申请已提交，等待审批',
      type: 'success',
    });
    handleCloseModal();
  };

  const handleApprove = (id: string) => {
    setExpenseClaims(
      expenseClaims.map((claim) =>
        claim.id === id ? { ...claim, status: 'approved' as const } : claim
      )
    );
    addNotification({
      title: '审批通过',
      message: '报销申请已批准',
      type: 'success',
    });
  };

  const handleReject = (id: string) => {
    setExpenseClaims(
      expenseClaims.map((claim) =>
        claim.id === id ? { ...claim, status: 'rejected' as const } : claim
      )
    );
    addNotification({
      title: '已拒绝',
      message: '报销申请已拒绝',
      type: 'error',
    });
  };

  const stats = useMemo(() => {
    const pending = expenseClaims.filter((e) => e.status === 'pending');
    const approved = expenseClaims.filter((e) => e.status === 'approved');
    const rejected = expenseClaims.filter((e) => e.status === 'rejected');

    return {
      pending: {
        count: pending.length,
        amount: pending.reduce((sum, e) => sum + e.amount, 0),
      },
      approved: {
        count: approved.length,
        amount: approved.reduce((sum, e) => sum + e.amount, 0),
      },
      rejected: {
        count: rejected.length,
        amount: rejected.reduce((sum, e) => sum + e.amount, 0),
      },
      total: {
        count: expenseClaims.length,
        amount: expenseClaims.reduce((sum, e) => sum + e.amount, 0),
      },
    };
  }, [expenseClaims]);

  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    expenseClaims.forEach((claim) => {
      const current = map.get(claim.category) || 0;
      map.set(claim.category, current + claim.amount);
    });
    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const maxAmount = entries.length > 0 ? entries[0][1] : 1;
    const colors = [
      'primary.main',
      'success.main',
      'warning.main',
      'secondary.main',
      'info.main',
      'error.main',
    ];
    return entries.map(([category, amount], idx) => ({
      category,
      amount,
      percentage: (amount / maxAmount) * 100,
      color: colors[idx % colors.length],
    }));
  }, [expenseClaims]);

  const getModalTitle = () => {
    switch (currentModalType) {
      case 'create':
        return '提交报销';
      case 'view':
        return '查看详情';
      case 'approve':
        return '审批报销';
      default:
        return '报销详情';
    }
  };

  return (
    <PageContainer
      title='费用报销'
      subtitle='管理费用报销申请、审批流程'
    >
      <Stack spacing={2}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
          }}
        >
          <Stack
            component='div'
            direction='row'
            spacing={1.5}
            sx={{ alignItems: 'center' }}
          >
            <Typography
              component='div'
              variant='h5'
              sx={{ fontWeight: 'bold' }}
            >
              费用报销
            </Typography>
            <IconButton
              size='small'
              sx={{ color: 'text.secondary' }}
            >
              <Filter />
            </IconButton>
          </Stack>
          <Button
            variant='contained'
            startIcon={<Plus />}
            onClick={() => handleOpenModal('create')}
          >
            提交报销
          </Button>
        </Box>

        <Grid
          container
          spacing={2}
        >
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={{ boxShadow: 1, borderRadius: 2, overflow: 'hidden' }}>
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table>
                  <TableHead sx={{ bgcolor: 'grey.50' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>报销标题</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>申请人</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>类别</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>金额</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>状态</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expenseClaims.map((claim) => (
                      <TableRow
                        key={claim.id}
                        hover
                      >
                        <TableCell>
                          <Typography
                            component='div'
                            sx={{ fontWeight: 'medium' }}
                          >
                            {claim.title}
                          </Typography>
                        </TableCell>
                        <TableCell>{claim.employee}</TableCell>
                        <TableCell>{claim.category}</TableCell>
                        <TableCell>
                          <Typography>¥{claim.amount.toLocaleString()}</Typography>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={claim.status} />
                        </TableCell>
                        <TableCell>
                          <Stack
                            direction='row'
                            spacing={0.5}
                          >
                            {claim.status === 'pending' && (
                              <>
                                <Tooltip title='批准'>
                                  <IconButton
                                    size='small'
                                    color='success'
                                    onClick={() => handleApprove(claim.id)}
                                  >
                                    <CheckSquare fontSize='small' />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title='拒绝'>
                                  <IconButton
                                    size='small'
                                    color='error'
                                    onClick={() => handleReject(claim.id)}
                                  >
                                    <XCircle fontSize='small' />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            <Tooltip title='查看'>
                              <IconButton
                                size='small'
                                sx={{ color: 'text.secondary' }}
                                onClick={() => handleOpenModal('view', claim)}
                              >
                                <Eye fontSize='small' />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={2}>
              <Card sx={{ p: 2.5, boxShadow: 1, borderRadius: 2 }}>
                <Typography
                  variant='h6'
                  component='div'
                  sx={{ fontWeight: 'bold', mb: 2 }}
                >
                  报销统计
                </Typography>
                <Stack spacing={1.5}>
                  {[
                    {
                      label: '待审批',
                      status: 'pending',
                      color: 'warning.main',
                      data: stats.pending,
                    },
                    {
                      label: '已批准',
                      status: 'approved',
                      color: 'success.main',
                      data: stats.approved,
                    },
                    {
                      label: '已拒绝',
                      status: 'rejected',
                      color: 'error.main',
                      data: stats.rejected,
                    },
                  ].map((item) => (
                    <Box
                      key={item.status}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Typography color='text.secondary'>{item.label}</Typography>
                      <Typography
                        variant='h5'
                        component='div'
                        sx={{ fontWeight: 'bold' }}
                        color={item.color}
                      >
                        ¥{item.data.amount.toLocaleString()}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Card>
              <Card sx={{ p: 2.5, boxShadow: 1, borderRadius: 2 }}>
                <Typography
                  variant='h6'
                  component='div'
                  sx={{ fontWeight: 'bold', mb: 2 }}
                >
                  类别分布
                </Typography>
                <Stack spacing={1.5}>
                  {categoryStats.map((item) => (
                    <Box
                      key={item.category}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {item.category}
                      </Typography>
                      <Stack
                        direction='row'
                        spacing={1}
                        component='div'
                        sx={{ alignItems: 'center' }}
                      >
                        <Box
                          sx={{
                            width: 96,
                            bgcolor: 'grey.200',
                            borderRadius: 5,
                            height: 10,
                          }}
                        >
                          <Box
                            sx={{
                              height: '100%',
                              borderRadius: 5,
                              width: `${item.percentage}%`,
                              bgcolor: item.color,
                            }}
                          />
                        </Box>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                          sx={{ width: 64, textAlign: 'right' }}
                        >
                          ¥{item.amount.toLocaleString()}
                        </Typography>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Stack>

      <Dialog
        open={showModal}
        onClose={handleCloseModal}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant='h6'>{getModalTitle()}</Typography>
            <IconButton onClick={handleCloseModal}>
              <X />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              fullWidth
              label='报销标题'
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={currentModalType !== 'create'}
              placeholder='请输入报销标题'
              required
            />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
                gap: 2,
              }}
            >
              <TextField
                fullWidth
                label='申请人'
                value={formData.employee || ''}
                onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                disabled={currentModalType !== 'create'}
                placeholder='请输入申请人姓名'
                required
              />
              <FormControl fullWidth>
                <InputLabel>费用类别</InputLabel>
                <Select
                  value={formData.category || ''}
                  label='费用类别'
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  disabled={currentModalType !== 'create'}
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <MenuItem
                      key={cat}
                      value={cat}
                    >
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <TextField
              fullWidth
              label='报销金额'
              type='number'
              slotProps={{
                input: {
                  startAdornment: <span style={{ marginRight: 8 }}>¥</span>,
                  inputProps: { min: 0, step: '0.01' },
                },
              }}
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              disabled={currentModalType !== 'create'}
              placeholder='请输入报销金额'
              required
            />
            <TextField
              fullWidth
              label='报销说明'
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={currentModalType !== 'create'}
              multiline
              rows={4}
              placeholder='请详细说明报销事由'
            />
            {currentModalType === 'view' && selectedClaim && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  pt: 1,
                  borderTop: 1,
                  borderColor: 'divider',
                }}
              >
                <Typography color='text.secondary'>状态</Typography>
                <StatusBadge status={selectedClaim.status} />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          {currentModalType === 'create' && (
            <>
              <Button onClick={handleCloseModal}>取消</Button>
              <Button
                variant='contained'
                onClick={handleCreateClaim}
              >
                提交
              </Button>
            </>
          )}
          {currentModalType === 'view' && (
            <Button
              variant='contained'
              onClick={handleCloseModal}
            >
              关闭
            </Button>
          )}
          {currentModalType === 'approve' && selectedClaim && (
            <>
              <Button onClick={handleCloseModal}>取消</Button>
              <Button
                color='error'
                onClick={() => {
                  handleReject(selectedClaim.id);
                  handleCloseModal();
                }}
              >
                拒绝
              </Button>
              <Button
                variant='contained'
                color='success'
                onClick={() => {
                  handleApprove(selectedClaim.id);
                  handleCloseModal();
                }}
              >
                批准
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default ExpenseClaimPage;
