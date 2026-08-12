import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useWmsMock, type WmsMockShape } from '@/api/wms/_mock';
import { WmsStatusBadge } from '@/components/wms';
import type { WavePickDto } from '@/types/wms';

function buildWaveOrders(waveId: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${waveId}-order-${i + 1}`,
    orderNumber: `OUT-${20250100 + i + 1}`,
    customer: `客户-${i + 1}`,
    lines: 2 + (i % 3),
    totalQty: 10 + i * 4,
    pickedQty: Math.floor((10 + i * 4) * (0.6 + i * 0.1)),
  }));
}

const PICKERS = ['张伟', '李强', '王磊', '赵敏', '陈晨'];

export default function WmsWavePickDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useWmsMock<WmsMockShape>();

  const wave = useMemo<WavePickDto | undefined>(() => {
    if (!id) return data.wavePickList?.[0];
    return (
      data.wavePickList?.find((w) => w.id === id || w.wave_pick_number === id) ??
      data.wavePickList?.[0]
    );
  }, [id, data.wavePickList]);

  const orders = useMemo(() => (wave ? buildWaveOrders(wave.id, 6) : []), [wave]);

  const progress = useMemo(() => {
    const total = orders.reduce((s, o) => s + o.totalQty, 0);
    const picked = orders.reduce((s, o) => s + o.pickedQty, 0);
    return { total, picked, pct: total ? Math.round((picked / total) * 100) : 0 };
  }, [orders]);

  if (!wave) return <div className='p-8'>加载中...</div>;

  const picker =
    wave.assigned_user_name ?? PICKERS[Number(wave.assigned_to ?? 0) % PICKERS.length] ?? '未分配';

  return (
    <div className='space-y-4 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h1 className='text-2xl font-bold'>波次拣货详情 — {wave.wave_pick_number}</h1>
          <p className='text-sm text-gray-500'>
            创建于 {wave.created_at.slice(0, 10)} · 优先级：{wave.priority ?? '普通'}
          </p>
        </div>
        <WmsStatusBadge
          fsm='wavepick'
          status={wave.status}
        />
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>拣货员</p>
          <p className='mt-1 text-lg font-semibold'>{picker}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>包含订单数</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{orders.length}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>已拣 / 待拣</p>
          <p className='mt-1 text-lg font-semibold'>
            <span className='text-green-600'>{progress.picked}</span>
            <span className='mx-1 text-gray-400'>/</span>
            <span className='text-gray-600'>{progress.total}</span>
          </p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>完成进度</p>
          <p className='mt-1 text-3xl font-bold text-purple-600'>{progress.pct}%</p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <div className='flex justify-between mb-2 text-sm'>
          <span className='font-semibold'>整体拣货进度</span>
          <span>
            {progress.picked} / {progress.total}（{progress.pct}%）
          </span>
        </div>
        <div className='h-3 w-full rounded-full bg-gray-200'>
          <div
            className='h-3 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all'
            style={{ width: `${progress.pct}%` }}
          />
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>波次包含订单明细</h3>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-3 py-2 text-left'>出库单号</th>
                <th className='px-3 py-2 text-left'>客户</th>
                <th className='px-3 py-2 text-right'>行数</th>
                <th className='px-3 py-2 text-right'>总数量</th>
                <th className='px-3 py-2 text-right'>已拣</th>
                <th className='px-3 py-2 w-48'>单行进度</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className='border-t'
                >
                  <td className='px-3 py-2 font-mono'>{o.orderNumber}</td>
                  <td className='px-3 py-2'>{o.customer}</td>
                  <td className='px-3 py-2 text-right'>{o.lines}</td>
                  <td className='px-3 py-2 text-right'>{o.totalQty}</td>
                  <td className='px-3 py-2 text-right'>{o.pickedQty}</td>
                  <td className='px-3 py-2'>
                    <div className='h-2 w-full rounded-full bg-gray-200'>
                      <div
                        className='h-2 rounded-full bg-blue-600'
                        style={{
                          width: `${o.totalQty ? Math.round((o.pickedQty / o.totalQty) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
