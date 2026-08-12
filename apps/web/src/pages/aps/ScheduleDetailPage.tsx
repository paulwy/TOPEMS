/**
 * 排程详情页
 *
 * 展示排程详细信息，包含 StatusBadge 和 FSMActionButtons。
 * 使用 APS API client 获取数据。
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { scheduleApi } from '@/api/aps';
import type { Schedule } from '@/api/aps/types';
import { StatusBadge } from '@/components/aps/StatusBadge';
import { FSMActionButtons } from '@/components/aps/FSMActionButtons';

export default function ScheduleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    scheduleApi
      .get(id)
      .then((res) => {
        if (res.success && res.data) {
          setSchedule(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    if (!id || !schedule) return;
    if (requiresApproval && targetStatus === 'released') {
      scheduleApi.release(id, 'system').catch(() => {});
    } else if (targetStatus === 'pending') {
      scheduleApi.hold(id, 'system').catch(() => {});
    }
  };

  if (loading) {
    return <div className='p-4 text-gray-600'>加载中...</div>;
  }

  if (!schedule) {
    return (
      <div className='p-4'>
        <p className='text-gray-600'>未找到排程数据。</p>
        <button
          onClick={() => navigate('/aps/schedules')}
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
            onClick={() => navigate('/aps/schedules')}
            className='mb-2 text-sm text-blue-600 hover:underline'
          >
            ← 返回排程列表
          </button>
          <h1 className='text-2xl font-bold'>{schedule.schedule_no}</h1>
          <p className='mt-1 text-sm text-gray-500'>{schedule.product_name ?? '-'}</p>
        </div>
        <StatusBadge
          fsm='schedule'
          status={schedule.status ?? 'pending'}
        />
      </div>

      <div className='rounded-lg border p-4'>
        <p className='mb-3 text-sm font-semibold text-gray-700'>状态机操作</p>
        <FSMActionButtons
          fsm='schedule'
          currentStatus={schedule.status ?? 'pending'}
          onAction={handleAction}
        />
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-3 font-semibold'>基本信息</h3>
        <dl className='grid grid-cols-2 gap-4 text-sm'>
          <div>
            <dt className='text-gray-500'>排程编号</dt>
            <dd className='font-medium'>{schedule.schedule_no}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>产品名称</dt>
            <dd className='font-medium'>{schedule.product_name ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>工作中心</dt>
            <dd className='font-medium'>{schedule.work_center_name ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>数量</dt>
            <dd className='font-medium'>{schedule.quantity ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>优先级</dt>
            <dd className='font-medium'>{schedule.priority ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>计划开始</dt>
            <dd className='font-medium'>{schedule.planned_start ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>计划结束</dt>
            <dd className='font-medium'>{schedule.planned_end ?? '-'}</dd>
          </div>
          <div>
            <dt className='text-gray-500'>实际开始</dt>
            <dd className='font-medium'>{schedule.actual_start ?? '-'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
