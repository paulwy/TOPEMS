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

export default function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
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
          setError(res.message || '路线不存在');
        }
      })
      .catch(() => setError('获取路线失败'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    void targetStatus;
    void requiresApproval;
  };

  if (loading) {
    return <div className='p-4 text-gray-600'>加载中...</div>;
  }

  if (error || !route) {
    return (
      <div className='p-4'>
        <p className='text-gray-600'>{error || '未找到路线数据。'}</p>
        <button
          onClick={() => navigate(TMS_PATHS.routes)}
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
            onClick={() => navigate(TMS_PATHS.routes)}
            className='mb-2 text-sm text-blue-600 hover:underline'
          >
            ← 返回路线列表
          </button>
          <h1 className='text-2xl font-bold'>{route.name}</h1>
          <p className='mt-1 text-sm text-gray-500'>{route.route_no}</p>
        </div>
        <StatusBadge fsm='route' status={route.status ?? 'planning'} />
      </div>

      <div className='rounded-lg border p-4'>
        <p className='mb-3 text-sm font-semibold text-gray-700'>状态机操作</p>
        <FSMActionButtons
          fsm='route'
          currentStatus={route.status ?? 'planning'}
          onAction={handleAction}
        />
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <Field label='路线编号' value={route.route_no} />
        <Field label='名称' value={route.name} />
        <Field label='起点' value={route.origin ?? '-'} />
        <Field label='终点' value={route.destination ?? '-'} />
        <Field
          label='距离'
          value={route.distance_km != null ? `${route.distance_km} km` : '-'}
        />
        <Field
          label='预计时长'
          value={route.estimated_hours != null ? `${route.estimated_hours} h` : '-'}
        />
        <Field label='状态' value={route.status ?? '-'} />
        <Field
          label='创建时间'
          value={route.created_at ? new Date(route.created_at).toLocaleString('zh-CN') : '-'}
        />
        <Field
          label='更新时间'
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
