/**
 * 生产计划详情页
 *
 * 展示生产计划详细信息，包含 StatusBadge 和 FSMActionButtons。
 * 使用 APS API client 获取数据。
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productionPlanApi } from '@/api/aps';
import type { ProductionPlan } from '@/api/aps/types';
import { StatusBadge } from '@/components/aps/StatusBadge';
import { FSMActionButtons } from '@/components/aps/FSMActionButtons';

export default function ProductionPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<ProductionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    productionPlanApi
      .get(id)
      .then((res) => {
        if (res.success && res.data) {
          setPlan(res.data);
        }
      })
      .catch(() => {
        // API unavailable, keep null
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    if (!id || !plan) return;
    if (requiresApproval) {
      productionPlanApi.approve(id, 'system').catch(() => {});
    } else if (targetStatus === 'pending_approval') {
      productionPlanApi.submit(id, 'system').catch(() => {});
    } else if (targetStatus === 'draft') {
      productionPlanApi.reject(id, 'system').catch(() => {});
    }
  };

  if (loading) {
    return <div className='p-4 text-gray-600'>加载中...</div>;
  }

  if (!plan) {
    return (
      <div className='p-4'>
        <p className='text-gray-600'>未找到生产计划数据。</p>
        <button
          onClick={() => navigate('/aps/production-plans')}
          className='mt-2 text-blue-600 underline'
        >
          返回列表
        </button>
      </div>
    );
  }

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <div>
          <button
            onClick={() => navigate('/aps/production-plans')}
            className='mb-2 text-sm text-blue-600 hover:underline'
          >
            ← 返回生产计划列表
          </button>
          <h1 className='text-2xl font-bold'>{plan.plan_no}</h1>
          <p className='mt-1 text-sm text-gray-500'>{plan.plan_name}</p>
        </div>
        <StatusBadge
          fsm='production_plan'
          status={plan.status ?? 'draft'}
        />
      </div>

      <div className='rounded-lg border p-4'>
        <p className='mb-3 text-sm font-semibold text-gray-700'>状态机操作</p>
        <FSMActionButtons
          fsm='production_plan'
          currentStatus={plan.status ?? 'draft'}
          onAction={handleAction}
        />
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-3 font-semibold'>基本信息</h3>
        <dl className='grid grid-cols-2 gap-4 text-sm'>
          <div>
            <dt className='text-gray-500'>计划编号</dt>
            <dd className='font-medium'>{plan.plan_no}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>计划名称</dt>
            <dd className='font-medium'>{plan.plan_name}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>计划类型</dt>
            <dd className='font-medium'>{plan.plan_type ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>产品名称</dt>
            <dd className='font-medium'>{plan.product_name ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>目标产量</dt>
            <dd className='font-medium'>{plan.target_quantity?.toLocaleString() ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>开始日期</dt>
            <dd className='font-medium'>{plan.start_date ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>结束日期</dt>
            <dd className='font-medium'>{plan.end_date ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>备注</dt>
            <dd className='font-medium'>{plan.notes ?? '-'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
