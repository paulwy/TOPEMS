/**
 * 运单详情页
 *
 * 包含：基本信息、运输信息、状态机操作
 * 使用 StatusBadge + FSMActionButtons 组件。
 * 数据来自 TMS API client。
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shipmentApi } from '@/api/tms';
import type { Shipment } from '@/api/tms/types';
import { StatusBadge } from '@/components/tms/StatusBadge';
import { FSMActionButtons } from '@/components/tms/FSMActionButtons';
import { TMS_PATHS } from '@/modules/tms/config';

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    shipmentApi
      .get(id)
      .then((res) => {
        if (res.success && res.data) {
          setShipment(res.data);
        } else {
          setError(res.message || '运单不存在');
        }
      })
      .catch(() => setError('获取运单失败'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    void targetStatus;
    void requiresApproval;
  };

  if (loading) {
    return <div className='p-4 text-gray-600'>加载中...</div>;
  }

  if (error || !shipment) {
    return (
      <div className='p-4'>
        <p className='text-gray-600'>{error || '未找到运单数据。'}</p>
        <button
          onClick={() => navigate(TMS_PATHS.shipments)}
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
            onClick={() => navigate(TMS_PATHS.shipments)}
            className='mb-2 text-sm text-blue-600 hover:underline'
          >
            ← 返回运单列表
          </button>
          <h1 className='text-2xl font-bold'>{shipment.shipment_no}</h1>
          <p className='mt-1 text-sm text-gray-500'>
            {shipment.origin ?? '-'} → {shipment.destination ?? '-'}
          </p>
        </div>
        <StatusBadge fsm='shipment' status={shipment.status ?? 'draft'} />
      </div>

      <div className='rounded-lg border p-4'>
        <p className='mb-3 text-sm font-semibold text-gray-700'>状态机操作</p>
        <FSMActionButtons
          fsm='shipment'
          currentStatus={shipment.status ?? 'draft'}
          onAction={handleAction}
        />
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <Field label='运单编号' value={shipment.shipment_no} />
        <Field label='状态' value={shipment.status ?? '-'} />
        <Field label='起点' value={shipment.origin ?? '-'} />
        <Field label='终点' value={shipment.destination ?? '-'} />
        <Field
          label='运费'
          value={shipment.freight_amount != null ? `¥${shipment.freight_amount}` : '-'}
        />
        <Field label='承运商ID' value={shipment.carrier_id ?? '-'} />
        <Field label='车辆ID' value={shipment.vehicle_id ?? '-'} />
        <Field label='司机ID' value={shipment.driver_id ?? '-'} />
        <Field label='路线ID' value={shipment.route_id ?? '-'} />
        <Field label='订单ID' value={shipment.order_id ?? '-'} />
        <Field
          label='计划发车'
          value={shipment.planned_departure ? new Date(shipment.planned_departure).toLocaleString('zh-CN') : '-'}
        />
        <Field
          label='计划到达'
          value={shipment.planned_arrival ? new Date(shipment.planned_arrival).toLocaleString('zh-CN') : '-'}
        />
        <Field
          label='实际发车'
          value={shipment.actual_departure ? new Date(shipment.actual_departure).toLocaleString('zh-CN') : '-'}
        />
        <Field
          label='实际到达'
          value={shipment.actual_arrival ? new Date(shipment.actual_arrival).toLocaleString('zh-CN') : '-'}
        />
        <Field label='备注' value={shipment.notes ?? '-'} />
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
