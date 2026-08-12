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

export default function ForecastDetailPage() {
  const { id } = useParams<{ id: string }>();
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
    return <div className='p-4 text-gray-600'>加载中...</div>;
  }

  if (!forecast) {
    return (
      <div className='p-4'>
        <p className='text-gray-600'>未找到需求预测数据。</p>
        <button
          onClick={() => navigate('/aps/forecasts')}
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
            onClick={() => navigate('/aps/forecasts')}
            className='mb-2 text-sm text-blue-600 hover:underline'
          >
            ← 返回需求预测列表
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
        <p className='mb-3 text-sm font-semibold text-gray-700'>状态机操作</p>
        <FSMActionButtons
          fsm='forecast'
          currentStatus={forecast.status ?? 'draft'}
          onAction={handleAction}
        />
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-3 font-semibold'>基本信息</h3>
        <dl className='grid grid-cols-2 gap-4 text-sm'>
          <div>
            <dt className='text-gray-500'>预测编号</dt>
            <dd className='font-medium'>{forecast.forecast_no}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>产品名称</dt>
            <dd className='font-medium'>{forecast.product_name ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>预测周期</dt>
            <dd className='font-medium'>{forecast.forecast_period ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>预测日期</dt>
            <dd className='font-medium'>{forecast.forecast_date ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>预测数量</dt>
            <dd className='font-medium'>{forecast.forecast_quantity?.toLocaleString() ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>实际数量</dt>
            <dd className='font-medium'>{forecast.actual_quantity?.toLocaleString() ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>准确率</dt>
            <dd className='font-medium'>
              {forecast.accuracy_rate != null ? `${forecast.accuracy_rate}%` : '-'}
            </dd>
          </div>
          <div>
            <dt className='text-gray-500'>预测方法</dt>
            <dd className='font-medium'>{forecast.method ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>置信度</dt>
            <dd className='font-medium'>
              {forecast.confidence_level != null ? `${forecast.confidence_level}%` : '-'}
            </dd>
          </div>
          <div>
            <dt className='text-gray-500'>备注</dt>
            <dd className='font-medium'>{forecast.notes ?? '-'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
