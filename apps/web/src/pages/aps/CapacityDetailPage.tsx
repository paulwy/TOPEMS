/**
 * 产能详情页
 *
 * 展示产能详细信息，包含 StatusBadge 和 FSMActionButtons。
 * 使用 APS API client 获取数据。
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { capacityApi } from '@/api/aps';
import type { Capacity } from '@/api/aps/types';
import { StatusBadge } from '@/components/aps/StatusBadge';
import { FSMActionButtons } from '@/components/aps/FSMActionButtons';
import i18n from '@/i18n';

export default function CapacityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [capacity, setCapacity] = useState<Capacity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    capacityApi
      .get(id)
      .then((res) => {
        if (res.success && res.data) {
          setCapacity(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    if (!id || !capacity) return;
    if (requiresApproval && targetStatus === 'allocated') {
      capacityApi.allocate(id, 'system').catch(() => {});
    } else if (targetStatus === 'released') {
      capacityApi.release(id, 'system').catch(() => {});
    }
  };

  if (loading) {
    return <div className='p-4 text-gray-600'>{i18n.t('pages.capacity_detail_page.k0')}</div>;
  }

  if (!capacity) {
    return (
      <div className='p-4'>
        <p className='text-gray-600'>{i18n.t('pages.capacity_detail_page.k0')}</p>
        <button
          onClick={() => navigate('/aps/capacities')}
          className='mt-2 text-blue-600 underline'
        >
          {i18n.t('pages.capacity_detail_page.k1')}
        </button>
      </div>
    );
  }

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <div>
          <button
            onClick={() => navigate('/aps/capacities')}
            className='mb-2 text-sm text-blue-600 hover:underline'
          >
            {i18n.t('pages.capacity_detail_page.k2')}
          </button>
          <h1 className='text-2xl font-bold'>{capacity.work_center_name ?? capacity.work_center_id}</h1>
          <p className='mt-1 text-sm text-gray-500'>{i18n.t('aps.capacity_detail_page.k4')}: {capacity.capacity_date ?? '-'}</p>
        </div>
        <StatusBadge
          fsm='capacity'
          status={capacity.status ?? 'available'}
        />
      </div>

      <div className='rounded-lg border p-4'>
        <p className='mb-3 text-sm font-semibold text-gray-700'>{i18n.t('pages.capacity_detail_page.k1')}</p>
        <FSMActionButtons
          fsm='capacity'
          currentStatus={capacity.status ?? 'available'}
          onAction={handleAction}
        />
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-3 font-semibold'>{i18n.t('pages.capacity_detail_page.k2')}</h3>
        <dl className='grid grid-cols-2 gap-4 text-sm'>
          <div>
            <dt className='text-gray-500'>{i18n.t('pages.capacity_detail_page.k3')}</dt>
            <dd className='font-medium'>{capacity.work_center_name ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>{i18n.t('pages.capacity_detail_page.k4')}</dt>
            <dd className='font-medium'>{capacity.capacity_date ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>{i18n.t('pages.capacity_detail_page.k5')}</dt>
            <dd className='font-medium'>{capacity.available_hours ?? '-'} h</dd>
          </div>
          <div>
            <dt className='text-gray-500'>{i18n.t('pages.capacity_detail_page.k6')}</dt>
            <dd className='font-medium'>{capacity.used_hours ?? '-'} h</dd>
          </div>
          <div>
            <dt className='text-gray-500'>{i18n.t('pages.capacity_detail_page.k7')}</dt>
            <dd className='font-medium'>{capacity.utilization_rate != null ? `${capacity.utilization_rate}%` : '-'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
