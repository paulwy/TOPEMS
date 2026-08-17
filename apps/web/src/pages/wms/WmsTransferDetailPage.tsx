import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Truck, ArrowLeftRight, MapPin, Package, CheckCircle2 } from 'lucide-react';
import { useWmsMock, type WmsMockShape } from '@/api/wms/_mock';
import { WmsStatusBadge, WmsFSMActionButtons } from '@/components/wms';
import type { TransferOrderDto } from '@/types/wms';
import i18n from '@/i18n';

export default function WmsTransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useWmsMock<WmsMockShape>();

  const transfer = useMemo<TransferOrderDto | undefined>(() => {
    if (!id) return data.transferList?.[0];
    return (
      data.transferList?.find((t) => t.id === id || t.order_number === id) ?? data.transferList?.[0]
    );
  }, [id, data.transferList]);

  if (!transfer) return <div className='p-8'>{i18n.t('pages.wms_transfer_detail_page.k0')}</div>;

  return (
    <div className='space-y-4 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h1 className='text-2xl font-bold'>
            {i18n.t('wms:wms_transfer_detail_page.v0_4', { v0: transfer.order_number })}
          </h1>
          <p className='text-sm text-gray-500'>
            {i18n.t('wms:wms_transfer_detail_page.v0_3', { v0: transfer.created_at.slice(0, 10) })}
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <WmsStatusBadge
            fsm='transfer'
            status={transfer.status}
          />
          <WmsFSMActionButtons
            fsm='transfer'
            currentStatus={transfer.status}
            onAction={() => {}}
          />
        </div>
      </div>

      <div className='rounded-lg border p-6'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div className='flex items-center gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200'>
            <div className='p-2 rounded-full bg-blue-600 text-var(--color-primary-foreground, #ffffff)'>
              <MapPin size={20} />
            </div>
            <div>
              <p className='text-xs text-blue-600'>{i18n.t('pages.wms_transfer_detail_page.k0')}</p>
              <p className='text-lg font-bold text-blue-800'>
                {transfer.from_warehouse_name ?? '-'}
              </p>
            </div>
          </div>

          <div className='flex items-center justify-center px-6'>
            <div className='flex items-center gap-2 text-gray-400'>
              <Package size={18} />
              <ArrowLeftRight size={24} />
              <Truck size={20} />
            </div>
          </div>

          <div className='flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200'>
            <div className='p-2 rounded-full bg-green-600 text-var(--color-primary-foreground, #ffffff)'>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className='text-xs text-green-600'>
                {i18n.t('pages.wms_transfer_detail_page.k1')}
              </p>
              <p className='text-lg font-bold text-green-800'>
                {transfer.to_warehouse_name ?? '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('wms:wms_transfer_detail_page.k2')}</p>
          <p className='mt-1 font-semibold'>
            {transfer.transfer_type ?? i18n.t('pages.wms_transfer_detail_page.k2')}
          </p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('wms:wms_transfer_detail_page.k1')}</p>
          <p className='mt-1 font-semibold'>
            {transfer.transporter ?? '-'} / {transfer.tracking_number ?? '-'}
          </p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('wms:wms_transfer_detail_page.k0')}</p>
          <p className='mt-1 font-semibold'>
            {transfer.total_quantity ?? 0} · {transfer.planned_date?.slice(0, 10) ?? '-'}
          </p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t('pages.wms_transfer_detail_page.k3')}</h3>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
          <div>
            <span className='text-gray-600'>{i18n.t('pages.wms_transfer_detail_page.k4')}</span>
            <span>{transfer.shipped_at?.slice(0, 19).replace('T', ' ') ?? '-'}</span>
          </div>
          <div>
            <span className='text-gray-600'>{i18n.t('pages.wms_transfer_detail_page.k5')}</span>
            <span>{transfer.received_at?.slice(0, 19).replace('T', ' ') ?? '-'}</span>
          </div>
          <div className='md:col-span-2'>
            <span className='text-gray-600'>{i18n.t('pages.wms_transfer_detail_page.k6')}</span>
            <span>{transfer.remarks ?? i18n.t('pages.wms_transfer_detail_page.k7')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
