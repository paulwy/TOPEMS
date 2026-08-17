/**
 * 需求预测详情页
 *
 * 展示需求预测详细信息，包含 StatusBadge 和 FSMActionButtons。
 * 使用 APS API client 获取数据。
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { forecastApi } from '@/api/aps';
import type { DemandForecast } from '@/api/aps/types';
import { StatusBadge } from '@/components/aps/StatusBadge';
import { FSMActionButtons } from '@/components/aps/FSMActionButtons';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

export default function ForecastDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('aps');
  const navigate = useNavigate();
  const [forecast, setForecast] = useState<DemandForecast | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    forecastApi
      .get(id)
      .then((res) => {
        if (res.success && res.data) {
          setForecast(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleAction = (targetStatus: string, _requiresApproval: boolean) => {
    if (!id || !forecast) return;
    if (targetStatus === 'calculated') {
      forecastApi.calculate(id).catch(() => {});
    } else if (targetStatus === 'validated') {
      forecastApi.validate(id).catch(() => {});
    }
    // adopted/superseded/cancelled would call additional approval APIs
    // which are not yet defined for forecast in the backend
  };

  if (loading) {
    return <div className='p-4 text-gray-600'>{i18n.t('pages.forecast_detail_page.k0')}</div>;
  }

  if (!forecast) {
    return (
      <div className='p-4'>
        <p className='text-gray-600'>{t('aps.forecast_detail_page.k0')}</p>
        <button
          onClick={() => navigate('/aps/forecasts')}
          className='mt-2 text-blue-600 underline'
        >
          {i18n.t('pages.forecast_detail_page.k0')}
        </button>
      </div>
    );
  }

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <div>
          <button
            onClick={() => navigate('/aps/forecasts')}
            className='mb-2 text-sm text-blue-600 hover:underline'
          >
            {i18n.t('pages.forecast_detail_page.k1')}
          </button>
          <h1 className='text-2xl font-bold'>{forecast.forecast_no}</h1>
          <p className='mt-1 text-sm text-gray-500'>{forecast.product_name ?? '-'}</p>
        </div>
        <StatusBadge
          fsm='forecast'
          status={forecast.status ?? 'draft'}
        />
      </div>

      <div className='rounded-lg border p-4'>
        <p className='mb-3 text-sm font-semibold text-gray-700'>
          {t('aps.forecast_detail_page.k1')}
        </p>
        <FSMActionButtons
          fsm='forecast'
          currentStatus={forecast.status ?? 'draft'}
          onAction={handleAction}
        />
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-3 font-semibold'>{t('aps.forecast_detail_page.k2')}</h3>
        <dl className='grid grid-cols-2 gap-4 text-sm'>
          <div>
            <dt className='text-gray-500'>{t('aps.forecast_detail_page.k3')}</dt>
            <dd className='font-medium'>{forecast.forecast_no}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>{t('aps.forecast_detail_page.k4')}</dt>
            <dd className='font-medium'>{forecast.product_name ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>{t('aps.forecast_detail_page.k5')}</dt>
            <dd className='font-medium'>{forecast.forecast_period ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>{t('aps.forecast_detail_page.k6')}</dt>
            <dd className='font-medium'>{forecast.forecast_date ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>{t('aps.forecast_detail_page.k7')}</dt>
            <dd className='font-medium'>{forecast.forecast_quantity?.toLocaleString() ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>{t('aps.forecast_detail_page.k8')}</dt>
            <dd className='font-medium'>{forecast.actual_quantity?.toLocaleString() ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>{t('aps.forecast_detail_page.k9')}</dt>
            <dd className='font-medium'>
              {forecast.accuracy_rate != null ? `${forecast.accuracy_rate}%` : '-'}
            </dd>
          </div>
          <div>
            <dt className='text-gray-500'>{t('aps.forecast_detail_page.k10')}</dt>
            <dd className='font-medium'>{forecast.method ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>{t('aps.forecast_detail_page.k11')}</dt>
            <dd className='font-medium'>
              {forecast.confidence_level != null ? `${forecast.confidence_level}%` : '-'}
            </dd>
          </div>
          <div>
            <dt className='text-gray-500'>{t('aps.forecast_detail_page.k12')}</dt>
            <dd className='font-medium'>{forecast.notes ?? '-'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
