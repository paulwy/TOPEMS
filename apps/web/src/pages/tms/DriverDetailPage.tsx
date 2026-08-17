/**
 * 司机详情页
 *
 * 包含：基本信息、状态机操作
 * 使用 StatusBadge + FSMActionButtons 组件。
 * 数据来自 TMS API client。
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { driverApi } from '@/api/tms';
import type { Driver } from '@/api/tms/types';
import { StatusBadge } from '@/components/tms/StatusBadge';
import { FSMActionButtons } from '@/components/tms/FSMActionButtons';
import { TMS_PATHS } from '@/modules/tms/config';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('tms');
  const navigate = useNavigate();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    driverApi
      .get(id)
      .then((res) => {
        if (res.success && res.data) {
          setDriver(res.data);
        } else {
          setError(res.message || t('tms.driver_detail_page.k0'));
        }
      })
      .catch(() => setError(t('tms.driver_detail_page.k1')))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    void targetStatus;
    void requiresApproval;
  };

  if (loading) {
    return <div className='p-4 text-gray-600'>{i18n.t('pages.driver_detail_page.k0')}</div>;
  }

  if (error || !driver) {
    return (
      <div className='p-4'>
        <p className='text-gray-600'>{error || t('tms.driver_detail_page.k2')}</p>
        <button
          onClick={() => navigate(TMS_PATHS.drivers)}
          className='mt-2 text-blue-600 underline'
        >
          {i18n.t('pages.driver_detail_page.k0')}
        </button>
      </div>
    );
  }

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <div>
          <button
            onClick={() => navigate(TMS_PATHS.drivers)}
            className='mb-2 text-sm text-blue-600 hover:underline'
          >
            {i18n.t('pages.driver_detail_page.k1')}
          </button>
          <h1 className='text-2xl font-bold'>{driver.name}</h1>
          <p className='mt-1 text-sm text-gray-500'>{driver.driver_no}</p>
        </div>
        <StatusBadge
          fsm='driver'
          status={driver.status ?? 'active'}
        />
      </div>

      <div className='rounded-lg border p-4'>
        <p className='mb-3 text-sm font-semibold text-gray-700'>{t('tms.driver_detail_page.k3')}</p>
        <FSMActionButtons
          fsm='driver'
          currentStatus={driver.status ?? 'active'}
          onAction={handleAction}
        />
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <Field
          label={t('tms.driver_detail_page.k4')}
          value={driver.driver_no}
        />
        <Field
          label={t('tms.driver_detail_page.k5')}
          value={driver.name}
        />
        <Field
          label={t('tms.driver_detail_page.k6')}
          value={driver.phone ?? '-'}
        />
        <Field
          label={t('tms.driver_detail_page.k7')}
          value={driver.license_no ?? '-'}
        />
        <Field
          label={t('tms.driver_detail_page.k8')}
          value={driver.license_type ?? '-'}
        />
        <Field
          label={t('tms.driver_detail_page.k9')}
          value={driver.status ?? '-'}
        />
        <Field
          label={t('tms.driver_detail_page.id_10')}
          value={driver.carrier_id ?? '-'}
        />
        <Field
          label={t('tms.driver_detail_page.k11')}
          value={driver.created_at ? new Date(driver.created_at).toLocaleString('zh-CN') : '-'}
        />
        <Field
          label={t('tms.driver_detail_page.k12')}
          value={driver.updated_at ? new Date(driver.updated_at).toLocaleString('zh-CN') : '-'}
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
