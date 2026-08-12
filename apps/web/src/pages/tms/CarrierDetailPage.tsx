/**
 * 承运商详情页
 *
 * 包含：基本信息、状态机操作
 * 使用 StatusBadge + FSMActionButtons 组件。
 * 数据来自 TMS API client。
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { carrierApi } from '@/api/tms';
import type { Carrier } from '@/api/tms/types';
import { StatusBadge } from '@/components/tms/StatusBadge';
import { FSMActionButtons } from '@/components/tms/FSMActionButtons';
import { TMS_PATHS } from '@/modules/tms/config';

export default function CarrierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [carrier, setCarrier] = useState<Carrier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    carrierApi
      .get(id)
      .then((res) => {
        if (res.success && res.data) {
          setCarrier(res.data);
        } else {
          setError(res.message || '承运商不存在');
        }
      })
      .catch(() => setError('获取承运商失败'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    void targetStatus;
    void requiresApproval;
  };

  if (loading) {
    return <div className='p-4 text-gray-600'>加载中...</div>;
  }

  if (error || !carrier) {
    return (
      <div className='p-4'>
        <p className='text-gray-600'>{error || '未找到承运商数据。'}</p>
        <button
          onClick={() => navigate(TMS_PATHS.carriers)}
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
            onClick={() => navigate(TMS_PATHS.carriers)}
            className='mb-2 text-sm text-blue-600 hover:underline'
          >
            ← 返回承运商列表
          </button>
          <h1 className='text-2xl font-bold'>{carrier.name}</h1>
          <p className='mt-1 text-sm text-gray-500'>{carrier.carrier_no}</p>
        </div>
        <StatusBadge fsm='carrier' status={carrier.status ?? 'pending_review'} />
      </div>

      <div className='rounded-lg border p-4'>
        <p className='mb-3 text-sm font-semibold text-gray-700'>状态机操作</p>
        <FSMActionButtons
          fsm='carrier'
          currentStatus={carrier.status ?? 'pending_review'}
          onAction={handleAction}
        />
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <Field label='承运商编号' value={carrier.carrier_no} />
        <Field label='名称' value={carrier.name} />
        <Field label='联系人' value={carrier.contact_person ?? '-'} />
        <Field label='联系电话' value={carrier.contact_phone ?? '-'} />
        <Field label='状态' value={carrier.status ?? '-'} />
        <Field label='服务区域' value={carrier.service_area ?? '-'} />
        <Field
          label='创建时间'
          value={carrier.created_at ? new Date(carrier.created_at).toLocaleString('zh-CN') : '-'}
        />
        <Field
          label='更新时间'
          value={carrier.updated_at ? new Date(carrier.updated_at).toLocaleString('zh-CN') : '-'}
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
