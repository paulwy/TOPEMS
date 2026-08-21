import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useWmsMock, type WmsMockShape } from '@/api/wms/_mock';
import { WmsStatusBadge } from '@/components/wms';
import type { InventoryMovementDto } from '@/types/wms';
import i18n from '@/i18n';

export default function WmsInventoryMovementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useWmsMock<WmsMockShape>();

  const move = useMemo<InventoryMovementDto | undefined>(() => {
    if (!id) return data.movementList?.[0];
    return (
      data.movementList?.find((m) => m.id === id || m.movement_number === id) ??
      data.movementList?.[0]
    );
  }, [id, data.movementList]);

  const serials = useMemo(() => {
    if (move?.serial_number) return [move.serial_number];
    return ['SN-2024A001', 'SN-2024A002', 'SN-2024A003'];
  }, [move]);

  if (!move)
    return <div className='p-8'>{i18n.t('pages.wms_inventory_movement_detail_page.k0')}</div>;

  const sourceLoc = move.source_location_code ?? 'A-01-01';
  const targetLoc = move.target_location_code ?? 'B-02-05';
  const warehouse = move.warehouse_name ?? '-';
  const matCode = move.material_code ?? 'SKU-1000';
  const matName = move.material_name ?? '-';

  return (
    <div className='space-y-4 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h1 className='text-2xl font-bold'>
            {i18n.t('wms:wms_inventory_movement_detail_page.v0_5', { v0: move.movement_number })}
          </h1>
          <p className='text-sm text-gray-500'>
            {i18n.t('wms:wms_inventory_movement_detail_page.k4', {
              v0: i18n.t('pages.wms_inventory_movement_detail_page.k1'),
              v1: move.movement_type ?? i18n.t('pages.wms_inventory_movement_detail_page.k0'),
              v2: move.created_at.slice(0, 10),
            })}
          </p>
        </div>
        <WmsStatusBadge
          fsm='movement'
          status={move.status}
        />
      </div>

      <div className='rounded-lg border p-6'>
        <div className='flex flex-wrap items-center justify-around gap-4'>
          <div className='text-center p-4 rounded-lg bg-amber-50 border border-amber-200 min-w-[180px]'>
            <p className='text-xs text-amber-700'>
              {i18n.t('pages.wms_inventory_movement_detail_page.k1')}
            </p>
            <p className='text-lg font-bold text-amber-800 font-mono mt-1'>{sourceLoc}</p>
            <p className='text-xs text-gray-500 mt-1'>
              {i18n.t('wms:wms_inventory_movement_detail_page.v0_3', { v0: warehouse })}
            </p>
          </div>

          <div className='flex items-center justify-center'>
            <ArrowRight
              className='text-gray-400'
              size={32}
            />
          </div>

          <div className='text-center p-4 rounded-lg bg-blue-50 border border-blue-200 min-w-[180px]'>
            <p className='text-xs text-blue-700'>
              {i18n.t('pages.wms_inventory_movement_detail_page.k2')}
            </p>
            <p className='text-lg font-bold text-blue-800 font-mono mt-1'>{targetLoc}</p>
            <p className='text-xs text-gray-500 mt-1'>
              {i18n.t('wms:wms_inventory_movement_detail_page.v0_2', { v0: warehouse })}
            </p>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>
            {i18n.t('wms:wms_inventory_movement_detail_page.k1')}
          </p>
          <p className='mt-1 font-mono font-semibold'>{matCode}</p>
          <p className='text-sm text-gray-600'>{matName}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>
            {i18n.t('pages.wms_inventory_movement_detail_page.k3')}
          </p>
          <p className='mt-1 text-2xl font-bold text-blue-600'>
            {move.quantity ?? move.total_quantity ?? 0}
          </p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>
            {i18n.t('pages.wms_inventory_movement_detail_page.k4')}
          </p>
          <p className='mt-1 font-mono font-semibold'>{move.batch_number ?? 'B202410-001'}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>
            {i18n.t('pages.wms_inventory_movement_detail_page.k5')}
          </p>
          <p className='mt-1 text-2xl font-bold text-purple-600'>{serials.length}</p>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div className='rounded-lg border p-4'>
          <h3 className='mb-2 font-semibold'>
            {i18n.t('pages.wms_inventory_movement_detail_page.k6')}
          </h3>
          <div className='flex flex-wrap gap-2'>
            {serials.map((sn, i) => (
              <span
                key={i}
                className='inline-block px-2 py-1 rounded bg-gray-100 border border-gray-200 text-xs font-mono text-gray-700'
              >
                {sn}
              </span>
            ))}
          </div>
        </div>

        <div className='rounded-lg border p-4'>
          <h3 className='mb-2 font-semibold'>
            {i18n.t('pages.wms_inventory_movement_detail_page.k7')}
          </h3>
          <ol className='relative border-l border-gray-200 ml-3 space-y-3'>
            {[
              {
                t: move.created_at,
                title: i18n.t('pages.wms_inventory_movement_detail_page.k8'),
                who: move.created_by ?? 'system',
                color: 'bg-blue-500',
              },
              {
                t: move.posted_at,
                title: i18n.t('pages.wms_inventory_movement_detail_page.k9'),
                who: move.posted_by,
                color: 'bg-amber-500',
              },
              {
                t: move.approved_at,
                title: i18n.t('pages.wms_inventory_movement_detail_page.k10'),
                who: move.approved_by,
                color: 'bg-green-500',
              },
            ]
              .filter((x) => x.t)
              .map((e, i) => (
                <li
                  key={i}
                  className='ml-6'
                >
                  <span
                    className={`absolute -left-1.5 mt-1 h-3 w-3 rounded-full ${e.color} border-2 border-var(--color-primary-foreground)`}
                  />
                  <div className='text-xs text-gray-500'>{e.t?.slice(0, 19).replace('T', ' ')}</div>
                  <div className='text-sm font-medium'>{e.title}</div>
                  <div className='text-xs text-gray-600'>
                    {i18n.t('wms:wms_inventory_movement_detail_page.v0_0', {
                      v0: e.who ?? 'system',
                    })}
                  </div>
                </li>
              ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
