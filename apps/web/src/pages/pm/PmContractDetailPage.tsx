import React, { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import {
  ArrowLeft,
  Edit,
  FileText,
  Calendar,
  DollarSign,
  Building,
  User,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import type { Contract, ContractMilestone, ContractPaymentSchedule } from '@/api/pm';
import { pmApi } from '@/api/pm';

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending: '待审批',
  approved: '已批准',
  active: '执行中',
  completed: '已完成',
  cancelled: '已取消',
};

const STATUS_COLORS: Record<string, { bgcolor: string; color: string }> = {
  draft: { bgcolor: 'grey.200', color: 'grey.600' },
  pending: { bgcolor: 'warning.light', color: 'warning.dark' },
  approved: { bgcolor: '#e9d5ff', color: '#6b21a8' },
  active: { bgcolor: 'success.light', color: 'success.dark' },
  completed: { bgcolor: 'info.light', color: 'info.dark' },
  cancelled: { bgcolor: 'grey.200', color: 'grey.800' },
};

const PmContractDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [milestones, setMilestones] = useState<ContractMilestone[]>([]);
  const [payments, setPayments] = useState<ContractPaymentSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadContractData(id);
    }
  }, [id]);

  const loadContractData = async (contractId: string) => {
    setLoading(true);
    try {
      const [contractRes, milestonesRes, paymentsRes] = await Promise.all([
        pmApi.contracts.get(contractId),
        pmApi.contracts.milestones.list(contractId),
        pmApi.contracts.payments.list(contractId),
      ]);

      if (contractRes.success && contractRes.data) {
        setContract(contractRes.data);
      }
      if (milestonesRes.success && milestonesRes.data) {
        setMilestones(milestonesRes.data);
      }
      if (paymentsRes.success && paymentsRes.data) {
        setPayments(paymentsRes.data);
      }
    } catch (error) {
      logger.error('Failed to load contract data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getMilestoneStatusSx = (status: string) => {
    if (status === 'completed') {
      return { bgcolor: 'success.light', color: 'success.dark' };
    }
    if (status === 'pending') {
      return { bgcolor: 'warning.light', color: 'warning.dark' };
    }
    return { bgcolor: 'grey.200', color: 'grey.800' };
  };

  const getPaymentStatusSx = (status?: string) => {
    if (status === 'paid') {
      return { bgcolor: 'success.light', color: 'success.dark' };
    }
    if (status === 'pending') {
      return { bgcolor: 'warning.light', color: 'warning.dark' };
    }
    if (status === 'overdue') {
      return { bgcolor: 'error.light', color: 'error.dark' };
    }
    return { bgcolor: 'grey.200', color: 'grey.800' };
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 384,
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '2px solid #2563eb',
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite',
            '@keyframes spin': {
              to: { transform: 'rotate(360deg)' },
            },
          }}
        />
      </Box>
    );
  }

  if (!contract) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography sx={{ color: 'grey.500' }}>合同不存在</Typography>
      </Box>
    );
  }

  const statusKey = contract.status || 'draft';
  const statusSx = STATUS_COLORS[statusKey] || {
    bgcolor: 'grey.200',
    color: 'grey.800',
  };

  return (
    <Box sx={{ p: 3, bgcolor: 'grey.50', minHeight: '100vh' }}>
      <Box sx={{ maxWidth: 896, mx: 'auto' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button
              onClick={() => navigate('/pm/contracts')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#4b5563',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <Box>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700, color: 'grey.900' }}
              >
                {contract.contract_name}
              </Typography>
              <Typography sx={{ color: 'grey.500' }}>{contract.contract_code}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <button
              onClick={() => navigate(`/pm/contracts/${id}/edit`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                paddingLeft: 16,
                paddingRight: 16,
                paddingTop: 8,
                paddingBottom: 8,
                backgroundColor: '#f3f4f6',
                color: '#374151',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Edit size={16} />
              编辑
            </button>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 1,
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ p: 1.5, bgcolor: '#dbeafe', borderRadius: '50%' }}>
                <FileText
                  size={24}
                  color='#2563eb'
                />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  合同状态
                </Typography>
                <Box
                  component='span'
                  sx={{
                    display: 'inline-block',
                    px: 1,
                    py: 0.5,
                    fontSize: '0.875rem',
                    borderRadius: '9999px',
                    ...statusSx,
                  }}
                >
                  {STATUS_LABELS[statusKey] || contract.status}
                </Box>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 1,
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ p: 1.5, bgcolor: '#e9d5ff', borderRadius: '50%' }}>
                <DollarSign
                  size={24}
                  color='#7e22ce'
                />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  合同金额
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 700, color: 'grey.900' }}
                >
                  {formatCurrency(contract.amount)}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 1,
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ p: 1.5, bgcolor: 'success.light', borderRadius: '50%' }}>
                <Building
                  size={24}
                  color='#16a34a'
                />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  合同类型
                </Typography>
                <Typography
                  variant='body1'
                  sx={{ fontWeight: 500, color: 'grey.900' }}
                >
                  {contract.contract_type === 'construction'
                    ? '工程合同'
                    : contract.contract_type === 'service'
                      ? '服务合同'
                      : contract.contract_type === 'purchase'
                        ? '采购合同'
                        : contract.contract_type === 'sales'
                          ? '销售合同'
                          : contract.contract_type}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 1,
            p: 3,
            mb: 3,
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, 1fr)',
                lg: 'repeat(4, 1fr)',
              },
              gap: 3,
            }}
          >
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500', mb: 0.5 }}
              >
                甲方
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontWeight: 500,
                }}
              >
                <Building
                  size={16}
                  color='#9ca3af'
                />
                {contract.party_a_name || '-'}
              </Box>
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500', mb: 0.5 }}
              >
                乙方
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontWeight: 500,
                }}
              >
                <Building
                  size={16}
                  color='#9ca3af'
                />
                {contract.party_b_name || '-'}
              </Box>
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500', mb: 0.5 }}
              >
                签署日期
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontWeight: 500,
                }}
              >
                <Calendar
                  size={16}
                  color='#9ca3af'
                />
                {formatDate(contract.signing_date)}
              </Box>
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500', mb: 0.5 }}
              >
                到期日期
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontWeight: 500,
                }}
              >
                <Calendar
                  size={16}
                  color='#9ca3af'
                />
                {formatDate(contract.end_date)}
              </Box>
            </Box>
          </Box>
          {contract.description && (
            <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #e5e7eb' }}>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500', mb: 1 }}
              >
                合同描述
              </Typography>
              <Typography sx={{ color: 'grey.700' }}>{contract.description}</Typography>
            </Box>
          )}
        </Box>

        {milestones.length > 0 && (
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 1,
              p: 3,
              mb: 3,
            }}
          >
            <Typography
              variant='h6'
              sx={{
                fontWeight: 600,
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <CheckCircle
                size={20}
                color='#2563eb'
              />
              合同里程碑
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {milestones.map((milestone) => (
                <Box
                  key={milestone.id}
                  sx={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 2,
                    p: 2,
                    transition: 'border-color 0.2s',
                    '&:hover': { borderColor: '#93c5fd' },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontWeight: 500 }}>{milestone.name}</Typography>
                        <Box
                          component='span'
                          sx={{
                            px: 1,
                            py: 0.25,
                            fontSize: '0.75rem',
                            borderRadius: '9999px',
                            ...getMilestoneStatusSx(milestone.status || ''),
                          }}
                        >
                          {milestone.status === 'completed'
                            ? '已完成'
                            : milestone.status === 'pending'
                              ? '进行中'
                              : milestone.status}
                        </Box>
                      </Box>
                      {milestone.description && (
                        <Typography
                          variant='body2'
                          sx={{ color: 'grey.500', mt: 0.5 }}
                        >
                          {milestone.description}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography
                        variant='body2'
                        sx={{ color: 'grey.500' }}
                      >
                        目标日期
                      </Typography>
                      <Typography sx={{ fontWeight: 500 }}>
                        {formatDate(milestone.target_date)}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ color: '#7e22ce', mt: 0.5 }}
                      >
                        {formatCurrency(milestone.payment_amount)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {payments.length > 0 && (
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 1,
              p: 3,
            }}
          >
            <Typography
              variant='h6'
              sx={{
                fontWeight: 600,
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <DollarSign
                size={20}
                color='#7e22ce'
              />
              付款计划
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Box
                component='table'
                sx={{ width: '100%' }}
              >
                <Box
                  component='thead'
                  sx={{ bgcolor: 'grey.50' }}
                >
                  <Box component='tr'>
                    <Box
                      component='th'
                      sx={{
                        px: 2,
                        py: 1.5,
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: 'grey.500',
                      }}
                    >
                      期次
                    </Box>
                    <Box
                      component='th'
                      sx={{
                        px: 2,
                        py: 1.5,
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: 'grey.500',
                      }}
                    >
                      付款日期
                    </Box>
                    <Box
                      component='th'
                      sx={{
                        px: 2,
                        py: 1.5,
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: 'grey.500',
                      }}
                    >
                      金额
                    </Box>
                    <Box
                      component='th'
                      sx={{
                        px: 2,
                        py: 1.5,
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: 'grey.500',
                      }}
                    >
                      比例
                    </Box>
                    <Box
                      component='th'
                      sx={{
                        px: 2,
                        py: 1.5,
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: 'grey.500',
                      }}
                    >
                      状态
                    </Box>
                    <Box
                      component='th'
                      sx={{
                        px: 2,
                        py: 1.5,
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: 'grey.500',
                      }}
                    >
                      备注
                    </Box>
                  </Box>
                </Box>
                <Box component='tbody'>
                  {payments.map((payment, index) => (
                    <Box
                      component='tr'
                      key={payment.id}
                      sx={{
                        '&:hover': { bgcolor: 'grey.50' },
                      }}
                    >
                      <Box
                        component='td'
                        sx={{
                          px: 2,
                          py: 1.5,
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: 'grey.900',
                        }}
                      >
                        第 {index + 1} 期
                      </Box>
                      <Box
                        component='td'
                        sx={{
                          px: 2,
                          py: 1.5,
                          fontSize: '0.875rem',
                          color: 'grey.500',
                        }}
                      >
                        {formatDate(payment.due_date)}
                      </Box>
                      <Box
                        component='td'
                        sx={{
                          px: 2,
                          py: 1.5,
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: 'grey.900',
                        }}
                      >
                        {formatCurrency(payment.payment_amount)}
                      </Box>
                      <Box
                        component='td'
                        sx={{
                          px: 2,
                          py: 1.5,
                          fontSize: '0.875rem',
                          color: 'grey.500',
                        }}
                      >
                        {payment.payment_percent || 0}%
                      </Box>
                      <Box
                        component='td'
                        sx={{ px: 2, py: 1.5, fontSize: '0.875rem' }}
                      >
                        <Box
                          component='span'
                          sx={{
                            px: 1,
                            py: 0.5,
                            fontSize: '0.75rem',
                            borderRadius: '9999px',
                            display: 'inline-block',
                            ...getPaymentStatusSx(payment.status),
                          }}
                        >
                          {payment.status === 'paid'
                            ? '已支付'
                            : payment.status === 'pending'
                              ? '待支付'
                              : payment.status === 'overdue'
                                ? '已逾期'
                                : payment.status || '-'}
                        </Box>
                      </Box>
                      <Box
                        component='td'
                        sx={{
                          px: 2,
                          py: 1.5,
                          fontSize: '0.875rem',
                          color: 'grey.500',
                        }}
                      >
                        -
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PmContractDetailPage;
