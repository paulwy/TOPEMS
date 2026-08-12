import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useWmsMock, type WmsMockShape } from '@/api/wms/_mock';
import { WmsStatusBadge, WmsFSMActionButtons } from '@/components/wms';
import type { StockTakeDto } from '@/types/wms';

function buildStockTakeItems(id: string, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const system = 20 + i * 15;
    const actual = system + (i % 3 === 0 ? -2 : i % 3 === 1 ? 1 : 0);
    const diff = actual - system;
    return {
      id: `${id}-item-${i}`,
      sku: `SKU-${String(1000 + i).padStart(4, '0')}`,
      name: `盘点物料-${i + 1}`,
      location: `A-${Math.floor(i / 4) + 1}-${(i % 10) + 1}`,
      systemQty: system,
      actualQty: actual,
      diff,
      reason: diff === 0 ? '无差异' : diff > 0 ? '盘盈（漏记）' : '盘亏（损耗）',
    };
  });
}

export default function WmsStockTakeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useWmsMock<WmsMockShape>();

  const task = useMemo<StockTakeDto | undefined>(() => {
    if (!id) return data.stockTakeList?.[0];
    return (
      data.stockTakeList?.find((t) => t.id === id || t.stock_take_number === id) ??
      data.stockTakeList?.[0]
    );
  }, [id, data.stockTakeList]);

  const items = useMemo(() => (task ? buildStockTakeItems(task.id, 8) : []), [task]);

  const diffSummary = useMemo(() => {
    const over = items.filter((i) => i.diff > 0).length;
    const under = items.filter((i) => i.diff < 0).length;
    const ok = items.filter((i) => i.diff === 0).length;
    return { over, under, ok, total: items.length };
  }, [items]);

  if (!task) return <div className='p-8'>加载中...</div>;

  return (
    <div className='space-y-4 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h1 className='text-2xl font-bold'>盘点单详情 — {task.stock_take_number}</h1>
          <p className='text-sm text-gray-500'>
            盘点类型：{task.stock_take_type ?? '周期'} · 仓库：{task.warehouse_name ?? '-'}
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <WmsStatusBadge
            fsm='stocktake'
            status={task.status}
          />
          <WmsFSMActionButtons
            fsm='stocktake'
            currentStatus={task.status}
            onAction={() => {}}
          />
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border-l-4 border-green-500 p-4'>
          <p className='text-sm text-gray-600'>账实一致</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{diffSummary.ok}</p>
        </div>
        <div className='rounded-lg border-l-4 border-amber-500 p-4'>
          <p className='text-sm text-gray-600'>盘盈（数多）</p>
          <p className='mt-1 text-3xl font-bold text-amber-600'>{diffSummary.over}</p>
        </div>
        <div className='rounded-lg border-l-4 border-red-500 p-4'>
          <p className='text-sm text-gray-600'>盘亏（数少）</p>
          <p className='mt-1 text-3xl font-bold text-red-600'>{diffSummary.under}</p>
        </div>
        <div className='rounded-lg border-l-4 border-blue-500 p-4'>
          <p className='text-sm text-gray-600'>准确率</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>
            {diffSummary.total ? Math.round((diffSummary.ok / diffSummary.total) * 100) : 0}%
          </p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>盘点差异清单（系统 / 实盘 / 差额 / 原因）</h3>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-3 py-2 text-left'>SKU</th>
                <th className='px-3 py-2 text-left'>名称</th>
                <th className='px-3 py-2 text-left'>库位</th>
                <th className='px-3 py-2 text-right'>系统数</th>
                <th className='px-3 py-2 text-right'>实盘数</th>
                <th className='px-3 py-2 text-right'>差额</th>
                <th className='px-3 py-2 text-left'>原因</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr
                  key={it.id}
                  className='border-t'
                >
                  <td className='px-3 py-2 font-mono'>{it.sku}</td>
                  <td className='px-3 py-2'>{it.name}</td>
                  <td className='px-3 py-2 font-mono'>{it.location}</td>
                  <td className='px-3 py-2 text-right'>{it.systemQty}</td>
                  <td className='px-3 py-2 text-right'>{it.actualQty}</td>
                  <td
                    className={`px-3 py-2 text-right font-semibold ${
                      it.diff === 0
                        ? 'text-green-600'
                        : it.diff > 0
                          ? 'text-amber-600'
                          : 'text-red-600'
                    }`}
                  >
                    {it.diff > 0 ? '+' : ''}
                    {it.diff}
                  </td>
                  <td className='px-3 py-2'>{it.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
