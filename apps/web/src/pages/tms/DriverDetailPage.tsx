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

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
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
          setError(res.message || '司机不存在');
        }
      })
      .catch(() => setError('获取司机失败'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    void targetStatus;
    void requiresApproval;
  };

  if (loading) {
    return <div className='p-4 text-gray-600'>加载中...</div>;
  }

  if (error || !driver) {
    return (
      <div className='p-4'>
        <p className='text-gray-600'>{error || '未找到司机数据。'}</p>
        <button
          onClick={() => navigate(TMS_PATHS.drivers)}
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
            onClick={() => navigate(TMS_PATHS.drivers)}
            className='mb-2 text-sm text-blue-600 hover:underline'
          >
            ← 返回司机列表
          </button>
          <h1 className='text-2xl font-bold'>{driver.name}</h1>
          <p className='mt-1 text-sm text-gray-500'>{driver.driver_no}</p>
        </div>
        <StatusBadge fsm='driver' status={driver.status ?? 'active'} />
      </div>

      <div className='rounded-lg border p-4'>
        <p className='mb-3 text-sm font-semibold text-gray-700'>状态机操作</p>
        <FSMActionButtons
          fsm='driver'
          currentStatus={driver.status ?? 'active'}
          onAction={handleAction}
        />
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <Field label='司机编号' value={driver.driver_no} />
        <Field label='姓名' value={driver.name} />
        <Field label='电话' value={driver.phone ?? '-'} />
        <Field label='驾照号' value={driver.license_no ?? '-'} />
        <Field label='驾照类型' value={driver.license_type ?? '-'} />
        <Field label='状态' value={driver.status ?? '-'} />
        <Field label='承运商ID' value={driver.carrier_id ?? '-'} />
        <Field
          label='创建时间'
          value={driver.created_at ? new Date(driver.created_at).toLocaleString('zh-CN') : '-'}
        />
        <Field
          label='更新时间'
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
