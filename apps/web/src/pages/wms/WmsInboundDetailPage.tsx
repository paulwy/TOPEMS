import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useWmsMock, type WmsMockShape } from '@/api/wms/_mock';
import { WmsStatusBadge, WmsFSMActionButtons } from '@/components/wms';
import type { InboundOrderDto } from '@/types/wms';
import i18n from '@/i18n';

function buildInboundItems(orderId: string, count: number) {
  const mats = [
    { code: 'MAT-001', name: i18n.t('pages.wms_inbound_detail_page.a_1'), unit: i18n.t('pages.wms_inbound_detail_page.k0') },
    { code: 'MAT-002', name: i18n.t('pages.wms_inbound_detail_page.b_3'), unit: i18n.t('pages.wms_inbound_detail_page.k2') },
    { code: 'MAT-003', name: i18n.t('pages.wms_inbound_detail_page.c_5'), unit: i18n.t('pages.wms_inbound_detail_page.k4') },
  ];
  return Array.from({ length: count }, (_, i) => {
    const m = mats[i % mats.length];
    const expected = 10 + i * 15;
    return {
      id: `${orderId}-line-${i + 1}`,
      line_number: i + 1,
      material_code: m.code,
      material_name: m.name,
      unit: m.unit,
      expected_quantity: expected,
      received_quantity: Math.floor(expected * (0.8 + i * 0.1)),
      unit_price: 50 + i * 100,
      total_amount: expected * (50 + i * 100),
      status: i % 2 ? 'received' : 'pending',
    };
  });
}

export default function WmsInboundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useWmsMock<WmsMockShape>();

  const order = useMemo<InboundOrderDto | undefined>(() => {
    if (!id) return data.inboundList?.[0];
    return (
      data.inboundList?.find((o) => o.id === id || o.order_number === id) ?? data.inboundList?.[0]
    );
  }, [id, data.inboundList]);

  const items = useMemo(() => (order ? buildInboundItems(order.id, 4) : []), [order]);

  if (!order) return <div className='p-8'>{i18n.t('pages.wms_inbound_detail_page.k0')}</div>;

  return (
    <div className='space-y-4 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h1 className='text-2xl font-bold'>入库单详情 — {order.order_number}</h1>
          <p className='text-sm text-gray-500'>创建于 {order.created_at.slice(0, 10)}</p>
        </div>
        <div className='flex items-center gap-3'>
          <WmsStatusBadge
            fsm='inbound'
            status={order.status}
          />
          <WmsFSMActionButtons
            fsm='inbound'
            currentStatus={order.status}
            onAction={() => {}}
          />
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('pages.wms_inbound_detail_page.k6')}</p>
          <p className='mt-1 font-semibold'>{order.warehouse_name ?? '-'}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('pages.wms_inbound_detail_page.k7')}</p>
          <p className='mt-1 font-semibold'>{order.supplier_name ?? '-'}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>总数量 / 已收</p>
          <p className='mt-1 font-semibold'>
            {order.total_quantity ?? 0} / {order.received_quantity ?? 0}
          </p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('pages.wms_inbound_detail_page.k8')}</p>
          <p className='mt-1 font-semibold text-green-700'>
            ¥{(order.total_amount ?? 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t('pages.wms_inbound_detail_page.k9')}</h3>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-3 py-2 text-left'>{i18n.t('pages.wms_inbound_detail_page.k10')}</th>
                <th className='px-3 py-2 text-left'>{i18n.t('pages.wms_inbound_detail_page.k11')}</th>
                <th className='px-3 py-2 text-left'>{i18n.t('pages.wms_inbound_detail_page.k12')}</th>
                <th className='px-3 py-2 text-right'>{i18n.t('pages.wms_inbound_detail_page.k13')}</th>
                <th className='px-3 py-2 text-right'>{i18n.t('pages.wms_inbound_detail_page.k14')}</th>
                <th className='px-3 py-2 text-right'>{i18n.t('pages.wms_inbound_detail_page.k15')}</th>
                <th className='px-3 py-2 text-left'>{i18n.t('pages.wms_inbound_detail_page.k16')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr
                  key={it.id}
                  className='border-t'
                >
                  <td className='px-3 py-2'>{it.line_number}</td>
                  <td className='px-3 py-2 font-mono'>{it.material_code}</td>
                  <td className='px-3 py-2'>{it.material_name}</td>
                  <td className='px-3 py-2 text-right'>{it.expected_quantity}</td>
                  <td className='px-3 py-2 text-right'>{it.received_quantity}</td>
                  <td className='px-3 py-2 text-right'>¥{it.unit_price}</td>
                  <td className='px-3 py-2'>
                    <span
                      className={`text-xs ${it.status === 'received' ? 'text-green-600' : 'text-gray-500'}`}
                    >
                      {it.status === 'received' ? i18n.t('pages.wms_inbound_detail_page.k18') : i18n.t('pages.wms_inbound_detail_page.k17')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t('pages.wms_inbound_detail_page.k19')}</h3>
        <ol className='relative border-l border-gray-200 ml-3'>
          {[
            { t: order.created_at, title: i18n.t('pages.wms_inbound_detail_page.k20'), who: order.created_by },
            { t: order.approved_at, title: i18n.t('pages.wms_inbound_detail_page.k21'), who: order.approved_by },
          ]
            .filter((x) => x.t)
            .map((e, i) => (
              <li
                key={i}
                className='ml-6 pb-4'
              >
                <span className='absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-blue-500 border-2 border-white' />
                <div className='text-sm text-gray-500'>{e.t?.slice(0, 19).replace('T', ' ')}</div>
                <div className='font-medium'>{e.title}</div>
                <div className='text-sm text-gray-600'>操作人：{e.who ?? 'system'}</div>
              </li>
            ))}
        </ol>
      </div>
    </div>
  );
}
