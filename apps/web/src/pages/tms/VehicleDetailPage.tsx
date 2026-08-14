/**
 * 车辆详情页
 *
 * 包含：基本信息、状态机操作
 * 使用 StatusBadge + FSMActionButtons 组件。
 * 数据来自 TMS API client。
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vehicleApi } from '@/api/tms';
import type { Vehicle } from '@/api/tms/types';
import { StatusBadge } from '@/components/tms/StatusBadge';
import { FSMActionButtons } from '@/components/tms/FSMActionButtons';
import { TMS_PATHS } from '@/modules/tms/config';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('tms');
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    vehicleApi
      .get(id)
      .then((res) => {
        if (res.success && res.data) {
          setVehicle(res.data);
        } else {
          setError(res.message || t('tms.vehicle_detail_page.k0'));
        }
      })
      .catch(() => setError(t('tms.vehicle_detail_page.k1')))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    void targetStatus;
    void requiresApproval;
  };

  if (loading) {
    return <div className='p-4 text-gray-600'>{i18n.t('pages.vehicle_detail_page.k0')}</div>;
  }

  if (error || !vehicle) {
    return (
      <div className='p-4'>
        <p className='text-gray-600'>{error || t('tms.vehicle_detail_page.k2')}</p>
        <button
          onClick={() => navigate(TMS_PATHS.vehicles)}
          className='mt-2 text-blue-600 underline'
        >
          {i18n.t('pages.vehicle_detail_page.k0')}
        </button>
      </div>
    );
  }

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <div>
          <button
            onClick={() => navigate(TMS_PATHS.vehicles)}
            className='mb-2 text-sm text-blue-600 hover:underline'
          >
            {i18n.t('pages.vehicle_detail_page.k1')}
          </button>
          <h1 className='text-2xl font-bold'>{vehicle.vehicle_no}</h1>
          <p className='mt-1 text-sm text-gray-500'>{vehicle.plate_number ?? '-'}</p>
        </div>
        <StatusBadge fsm='vehicle' status={vehicle.status ?? 'active'} />
      </div>

      <div className='rounded-lg border p-4'>
        <p className='mb-3 text-sm font-semibold text-gray-700'>{t('tms.vehicle_detail_page.k3')}</p>
        <FSMActionButtons
          fsm='vehicle'
          currentStatus={vehicle.status ?? 'active'}
          onAction={handleAction}
        />
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <Field label={t('tms.vehicle_detail_page.k4')} value={vehicle.vehicle_no} />
        <Field label={t('tms.vehicle_detail_page.k5')} value={vehicle.plate_number ?? '-'} />
        <Field label={t('tms.vehicle_detail_page.k6')} value={vehicle.vehicle_type ?? '-'} />
        <Field
          label={t('tms.vehicle_detail_page.k7')}
          value={vehicle.capacity != null ? `${vehicle.capacity}` : '-'}
        />
        <Field label={t('tms.vehicle_detail_page.k8')} value={vehicle.status ?? '-'} />
        <Field label={t('tms.vehicle_detail_page.id_9')} value={vehicle.carrier_id ?? '-'} />
        <Field label={t('tms.vehicle_detail_page.k10')} value={vehicle.notes ?? '-'} />
        <Field
          label={t('tms.vehicle_detail_page.k11')}
          value={vehicle.created_at ? new Date(vehicle.created_at).toLocaleString('zh-CN') : '-'}
        />
        <Field
          label={t('tms.vehicle_detail_page.k12')}
          value={vehicle.updated_at ? new Date(vehicle.updated_at).toLocaleString('zh-CN') : '-'}
        />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-lg border p-3'>
      <p className='text-xs text-gray-500'>{label}</p>
      <p className='mt-1 font-medium'>{value}</p>
    </div>
  );
}
