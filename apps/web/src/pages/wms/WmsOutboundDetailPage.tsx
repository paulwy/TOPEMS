import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useWmsMock, type WmsMockShape } from '@/api/wms/_mock';
import { WmsStatusBadge, WmsFSMActionButtons } from '@/components/wms';
import type { OutboundOrderDto } from '@/types/wms';
import i18n from '@/i18n';

const OUTBOUND_STAGES = ['created', 'confirmed', 'picking', 'packing', 'shipping', 'completed'];
function getStageLabels(): Record<string, string> {
  return {
    created: i18n.t('pages.wms_outbound_detail_page.k0'),
    confirmed: i18n.t('pages.wms_outbound_detail_page.k1'),
    picking: i18n.t('pages.wms_outbound_detail_page.k2'),
    packing: i18n.t('pages.wms_outbound_detail_page.k3'),
    shipping: i18n.t('pages.wms_outbound_detail_page.k4'),
    completed: i18n.t('pages.wms_outbound_detail_page.k5'),
  };
}

export default function WmsOutboundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useWmsMock<WmsMockShape>();

  const order = useMemo<OutboundOrderDto | undefined>(() => {
    if (!id) return data.outboundList?.[0];
    return (
      data.outboundList?.find((o) => o.id === id || o.order_number === id) ?? data.outboundList?.[0]
    );
  }, [id, data.outboundList]);

  const stageIndex = useMemo(() => {
    const i = OUTBOUND_STAGES.indexOf(order?.status ?? '');
    return i < 0 ? 0 : i;
  }, [order]);

  if (!order) return <div className='p-8'>{i18n.t('pages.wms_outbound_detail_page.k0')}</div>;

  return (
    <div className='space-y-4 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h1 className='text-2xl font-bold'>
            {i18n.t('wms:wms_outbound_detail_page.v0_3', { v0: order.order_number })}
          </h1>
          <p className='text-sm text-gray-500'>
            {i18n.t('wms:wms_outbound_detail_page.v0_2', { v0: order.customer_name ?? '-' })}
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <WmsStatusBadge
            fsm='outbound'
            status={order.status}
          />
          <WmsFSMActionButtons
            fsm='outbound'
            currentStatus={order.status}
            onAction={() => {}}
          />
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-3 font-semibold'>{i18n.t('pages.wms_outbound_detail_page.k6')}</h3>
        <div className='flex items-center justify-between'>
          {OUTBOUND_STAGES.map((s, i) => (
            <div
              key={s}
              className='flex items-center flex-1'
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                  i <= stageIndex
                    ? 'bg-blue-600 text-var(--color-primary-foreground)'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i + 1}
              </div>
              <div className='ml-2 text-xs'>{getStageLabels()[s]}</div>
              {i < OUTBOUND_STAGES.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${i < stageIndex ? 'bg-blue-600' : 'bg-gray-200'}`}
                />
              )}
            </div>
          ))}
        </div>
        <div className='mt-3 h-2 w-full rounded-full bg-gray-200'>
          <div
            className='h-2 rounded-full bg-blue-600 transition-all'
            style={{ width: `${(stageIndex / (OUTBOUND_STAGES.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('pages.wms_outbound_detail_page.k7')}</p>
          <p className='mt-1 font-semibold'>{order.warehouse_name ?? '-'}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('wms:wms_outbound_detail_page.k1')}</p>
          <p className='mt-1 font-semibold'>
            {order.carrier ?? '-'} / {order.tracking_number ?? '-'}
          </p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('wms:wms_outbound_detail_page.k0')}</p>
          <p className='mt-1 font-semibold'>
            {order.picked_quantity ?? 0} / {order.shipped_quantity ?? 0}
          </p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('pages.wms_outbound_detail_page.k8')}</p>
          <p className='mt-1 font-semibold text-green-700'>
            ¥{(order.total_amount ?? 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
