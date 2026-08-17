/**
 * 路线详情页
 *
 * 包含：基本信息、状态机操作
 * 使用 StatusBadge + FSMActionButtons 组件。
 * 数据来自 TMS API client。
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { routeApi } from '@/api/tms';
import type { Route } from '@/api/tms/types';
import { StatusBadge } from '@/components/tms/StatusBadge';
import { FSMActionButtons } from '@/components/tms/FSMActionButtons';
import { TMS_PATHS } from '@/modules/tms/config';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

export default function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('tms');
  const navigate = useNavigate();
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    routeApi
      .get(id)
      .then((res) => {
        if (res.success && res.data) {
          setRoute(res.data);
        } else {
          setError(res.message || t('tms.route_detail_page.k0'));
        }
      })
      .catch(() => setError(t('tms.route_detail_page.k1')))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    void targetStatus;
    void requiresApproval;
  };

  if (loading) {
    return <div className='p-4 text-gray-600'>{i18n.t('pages.route_detail_page.k0')}</div>;
  }

  if (error || !route) {
    return (
      <div className='p-4'>
        <p className='text-gray-600'>{error || t('tms.route_detail_page.k2')}</p>
        <button
          onClick={() => navigate(TMS_PATHS.routes)}
          className='mt-2 text-blue-600 underline'
        >
          {i18n.t('pages.route_detail_page.k0')}
        </button>
      </div>
    );
  }

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <div>
          <button
            onClick={() => navigate(TMS_PATHS.routes)}
            className='mb-2 text-sm text-blue-600 hover:underline'
          >
            {i18n.t('pages.route_detail_page.k1')}
          </button>
          <h1 className='text-2xl font-bold'>{route.name}</h1>
          <p className='mt-1 text-sm text-gray-500'>{route.route_no}</p>
        </div>
        <StatusBadge
          fsm='route'
          status={route.status ?? 'planning'}
        />
      </div>

      <div className='rounded-lg border p-4'>
        <p className='mb-3 text-sm font-semibold text-gray-700'>{t('tms.route_detail_page.k3')}</p>
        <FSMActionButtons
          fsm='route'
          currentStatus={route.status ?? 'planning'}
          onAction={handleAction}
        />
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <Field
          label={t('tms.route_detail_page.k4')}
          value={route.route_no}
        />
        <Field
          label={t('tms.route_detail_page.k5')}
          value={route.name}
        />
        <Field
          label={t('tms.route_detail_page.k6')}
          value={route.origin ?? '-'}
        />
        <Field
          label={t('tms.route_detail_page.k7')}
          value={route.destination ?? '-'}
        />
        <Field
          label={t('tms.route_detail_page.k8')}
          value={route.distance_km != null ? `${route.distance_km} km` : '-'}
        />
        <Field
          label={t('tms.route_detail_page.k9')}
          value={route.estimated_hours != null ? `${route.estimated_hours} h` : '-'}
        />
        <Field
          label={t('tms.route_detail_page.k10')}
          value={route.status ?? '-'}
        />
        <Field
          label={t('tms.route_detail_page.k11')}
          value={route.created_at ? new Date(route.created_at).toLocaleString('zh-CN') : '-'}
        />
        <Field
          label={t('tms.route_detail_page.k12')}
          value={route.updated_at ? new Date(route.updated_at).toLocaleString('zh-CN') : '-'}
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
