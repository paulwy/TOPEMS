import React, { useState, useEffect } from 'react';
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
import type { Contract, ContractMilestone, ContractPaymentSchedule } from '../api/pm';
import { pmApi } from '../api/pm';

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending: '待审批',
  approved: '已批准',
  active: '执行中',
  completed: '已完成',
  cancelled: '已取消',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-purple-100 text-purple-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-gray-100 text-gray-800',
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
      console.error('Failed to load contract data:', error);
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

  if (loading) {
    return (
      <div className='flex items-center justify-center h-96'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className='p-6'>
        <p className='text-gray-500'>合同不存在</p>
      </div>
    );
  }

  return (
    <div className='p-6 bg-gray-50 min-h-screen'>
      <div className='max-w-4xl mx-auto'>
        <div className='flex items-center justify-between mb-6'>
          <div className='flex items-center gap-4'>
            <button
              onClick={() => navigate('/pm/contracts')}
              className='flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors'
            >
              <ArrowLeft className='w-5 h-5' />
            </button>
            <div>
              <h1 className='text-2xl font-bold text-gray-900'>{contract.contract_name}</h1>
              <p className='text-gray-500'>{contract.contract_code}</p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => navigate(`/pm/contracts/${id}/edit`)}
              className='flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors'
            >
              <Edit className='w-4 h-4' />
              编辑
            </button>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
          <div className='bg-white rounded-lg shadow p-6'>
            <div className='flex items-center gap-3'>
              <div className='p-3 bg-blue-100 rounded-full'>
                <FileText className='w-6 h-6 text-blue-600' />
              </div>
              <div>
                <p className='text-sm text-gray-500'>合同状态</p>
                <span
                  className={`inline-block px-2 py-1 text-sm rounded-full ${STATUS_COLORS[contract.status] || STATUS_COLORS.draft}`}
                >
                  {STATUS_LABELS[contract.status] || contract.status}
                </span>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-lg shadow p-6'>
            <div className='flex items-center gap-3'>
              <div className='p-3 bg-purple-100 rounded-full'>
                <DollarSign className='w-6 h-6 text-purple-600' />
              </div>
              <div>
                <p className='text-sm text-gray-500'>合同金额</p>
                <p className='text-xl font-bold text-gray-900'>{formatCurrency(contract.amount)}</p>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-lg shadow p-6'>
            <div className='flex items-center gap-3'>
              <div className='p-3 bg-green-100 rounded-full'>
                <Building className='w-6 h-6 text-green-600' />
              </div>
              <div>
                <p className='text-sm text-gray-500'>合同类型</p>
                <p className='text-lg font-medium text-gray-900'>
                  {contract.contract_type === 'construction'
                    ? '工程合同'
                    : contract.contract_type === 'service'
                      ? '服务合同'
                      : contract.contract_type === 'purchase'
                        ? '采购合同'
                        : contract.contract_type === 'sales'
                          ? '销售合同'
                          : contract.contract_type}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className='bg-white rounded-lg shadow p-6 mb-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
            <div>
              <p className='text-sm text-gray-500 mb-1'>甲方</p>
              <p className='font-medium flex items-center gap-1'>
                <Building className='w-4 h-4 text-gray-400' />
                {contract.party_a_name || '-'}
              </p>
            </div>
            <div>
              <p className='text-sm text-gray-500 mb-1'>乙方</p>
              <p className='font-medium flex items-center gap-1'>
                <Building className='w-4 h-4 text-gray-400' />
                {contract.party_b_name || '-'}
              </p>
            </div>
            <div>
              <p className='text-sm text-gray-500 mb-1'>签署日期</p>
              <p className='font-medium flex items-center gap-1'>
                <Calendar className='w-4 h-4 text-gray-400' />
                {formatDate(contract.signing_date)}
              </p>
            </div>
            <div>
              <p className='text-sm text-gray-500 mb-1'>到期日期</p>
              <p className='font-medium flex items-center gap-1'>
                <Calendar className='w-4 h-4 text-gray-400' />
                {formatDate(contract.end_date)}
              </p>
            </div>
          </div>
          {contract.description && (
            <div className='mt-6 pt-6 border-t border-gray-200'>
              <p className='text-sm text-gray-500 mb-2'>合同描述</p>
              <p className='text-gray-700'>{contract.description}</p>
            </div>
          )}
        </div>

        {milestones.length > 0 && (
          <div className='bg-white rounded-lg shadow p-6 mb-6'>
            <h3 className='text-lg font-semibold mb-4 flex items-center gap-2'>
              <CheckCircle className='w-5 h-5 text-blue-600' />
              合同里程碑
            </h3>
            <div className='space-y-4'>
              {milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className='border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors'
                >
                  <div className='flex items-start justify-between'>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2'>
                        <h4 className='font-medium'>{milestone.name}</h4>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            milestone.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : milestone.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {milestone.status === 'completed'
                            ? '已完成'
                            : milestone.status === 'pending'
                              ? '进行中'
                              : milestone.status}
                        </span>
                      </div>
                      {milestone.description && <p className='text-sm text-gray-500 mt-1'>{milestone.description}</p>}
                    </div>
                    <div className='text-right'>
                      <p className='text-sm text-gray-500'>目标日期</p>
                      <p className='font-medium'>{formatDate(milestone.target_date)}</p>
                      <p className='text-sm text-purple-600 mt-1'>{formatCurrency(milestone.payment_amount)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {payments.length > 0 && (
          <div className='bg-white rounded-lg shadow p-6'>
            <h3 className='text-lg font-semibold mb-4 flex items-center gap-2'>
              <DollarSign className='w-5 h-5 text-purple-600' />
              付款计划
            </h3>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-4 py-3 text-left text-xs font-medium text-gray-500'>期次</th>
                    <th className='px-4 py-3 text-left text-xs font-medium text-gray-500'>付款日期</th>
                    <th className='px-4 py-3 text-left text-xs font-medium text-gray-500'>金额</th>
                    <th className='px-4 py-3 text-left text-xs font-medium text-gray-500'>比例</th>
                    <th className='px-4 py-3 text-left text-xs font-medium text-gray-500'>状态</th>
                    <th className='px-4 py-3 text-left text-xs font-medium text-gray-500'>备注</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200'>
                  {payments.map((payment, index) => (
                    <tr key={payment.id} className='hover:bg-gray-50'>
                      <td className='px-4 py-3 text-sm font-medium text-gray-900'>第 {index + 1} 期</td>
                      <td className='px-4 py-3 text-sm text-gray-500'>{formatDate(payment.due_date)}</td>
                      <td className='px-4 py-3 text-sm font-medium text-gray-900'>
                        {formatCurrency(payment.payment_amount)}
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-500'>{payment.payment_percent || 0}%</td>
                      <td className='px-4 py-3 text-sm'>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            payment.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : payment.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : payment.status === 'overdue'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {payment.status === 'paid'
                            ? '已支付'
                            : payment.status === 'pending'
                              ? '待支付'
                              : payment.status === 'overdue'
                                ? '已逾期'
                                : payment.status || '-'}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-500'>-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PmContractDetailPage;
