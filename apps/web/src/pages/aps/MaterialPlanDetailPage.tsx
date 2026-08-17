/**
 * 物料计划详情页
 *
 * 展示物料计划详细信息，包含 StatusBadge 和 FSMActionButtons。
 * 使用 APS API client 获取数据。
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { materialPlanApi } from '@/api/aps';
import type { MaterialPlan } from '@/api/aps/types';
import { StatusBadge } from '@/components/aps/StatusBadge';
import { FSMActionButtons } from '@/components/aps/FSMActionButtons';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

export default function MaterialPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('aps');
  const navigate = useNavigate();
  const [plan, setPlan] = useState<MaterialPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    materialPlanApi
      .get(id)
      .then((res) => {
        if (res.success && res.data) {
          setPlan(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    if (!id || !plan) return;
    if (requiresApproval && targetStatus === 'requisitioned') {
      materialPlanApi.requisition(id, 'system').catch(() => {});
    } else if (targetStatus === 'cancelled') {
      materialPlanApi.cancel(id, 'system').catch(() => {});
    }
  };

  if (loading) {
    return <div className='p-4 text-gray-600'>{i18n.t('pages.material_plan_detail_page.k0')}</div>;
  }

  if (!plan) {
    return (
      <div className='p-4'>
        <p className='text-gray-600'>{t('aps.material_plan_detail_page.k0')}</p>
        <button
          onClick={() => navigate('/aps/material-plans')}
          className='mt-2 text-blue-600 underline'
        >
          {i18n.t('pages.material_plan_detail_page.k0')}
        </button>
      </div>
    );
  }

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <div>
          <button
            onClick={() => navigate('/aps/material-plans')}
            className='mb-2 text-sm text-blue-600 hover:underline'
          >
            {i18n.t('pages.material_plan_detail_page.k1')}
          </button>
          <h1 className='text-2xl font-bold'>{plan.plan_no}</h1>
          <p className='mt-1 text-sm text-gray-500'>{plan.material_name ?? '-'}</p>
        </div>
        <StatusBadge
          fsm='material_plan'
          status={plan.status ?? 'pending'}
        />
      </div>

      <div className='rounded-lg border p-4'>
        <p className='mb-3 text-sm font-semibold text-gray-700'>
          {t('aps.material_plan_detail_page.k1')}
        </p>
        <FSMActionButtons
          fsm='material_plan'
          currentStatus={plan.status ?? 'pending'}
          onAction={handleAction}
        />
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-3 font-semibold'>{t('aps.material_plan_detail_page.k2')}</h3>
        <dl className='grid grid-cols-2 gap-4 text-sm'>
          <div>
            <dt className='text-gray-500'>{t('aps.material_plan_detail_page.k3')}</dt>
            <dd className='font-medium'>{plan.plan_no}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>{t('aps.material_plan_detail_page.k4')}</dt>
            <dd className='font-medium'>{plan.material_code ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>{t('aps.material_plan_detail_page.k5')}</dt>
            <dd className='font-medium'>{plan.material_name ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>{t('aps.material_plan_detail_page.k6')}</dt>
            <dd className='font-medium'>{plan.required_quantity?.toLocaleString() ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>{t('aps.material_plan_detail_page.k7')}</dt>
            <dd className='font-medium'>{plan.available_quantity?.toLocaleString() ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>{t('aps.material_plan_detail_page.k8')}</dt>
            <dd className='font-medium'>{plan.shortfall_quantity?.toLocaleString() ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>{t('aps.material_plan_detail_page.k9')}</dt>
            <dd className='font-medium'>{plan.required_date ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>{t('aps.material_plan_detail_page.k10')}</dt>
            <dd className='font-medium'>{plan.supply_type ?? '-'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
