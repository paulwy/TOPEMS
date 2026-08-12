/**
 * 运输计划详情页
 *
 * 展示运输计划的汇总信息，包括关联的运单、车辆、司机、路线。
 * 由于暂无独立的运输计划 API，使用 mock 数据展示。
 * 包含 StatusBadge + FSMActionButtons 组件。
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/tms/StatusBadge';
import { FSMActionButtons } from '@/components/tms/FSMActionButtons';
import { TMS_PATHS } from '@/modules/tms/config';

interface TransportPlanItem {
  shipment_no: string;
  origin: string;
  destination: string;
  vehicle_no: string;
  driver_name: string;
  route_name: string;
  status: string;
  freight: number;
}

const MOCK_PLAN = {
  plan_no: 'TP-2025-0812',
  name: '8月华东区运输计划',
  status: 'planning',
  totalShipments: 12,
  totalFreight: 86500,
  startDate: '2025-08-15',
  endDate: '2025-08-31',
  items: [
    { shipment_no: 'SHP-001', origin: '上海', destination: '杭州', vehicle_no: 'V-001', driver_name: '张伟', route_name: '上海-杭州', status: 'draft', freight: 3200 },
    { shipment_no: 'SHP-002', origin: '上海', destination: '南京', vehicle_no: 'V-003', driver_name: '王磊', route_name: '上海-南京', status: 'pending', freight: 4500 },
    { shipment_no: 'SHP-003', origin: '杭州', destination: '宁波', vehicle_no: 'V-005', driver_name: '陈杰', route_name: '杭州-宁波', status: 'in_transit', freight: 2800 },
    { shipment_no: 'SHP-004', origin: '南京', destination: '苏州', vehicle_no: 'V-007', driver_name: '孙浩', route_name: '南京-苏州', status: 'delivered', freight: 2200 },
    { shipment_no: 'SHP-005', origin: '上海', destination: '合肥', vehicle_no: 'V-002', driver_name: '李强', route_name: '上海-合肥', status: 'cancelled', freight: 5800 },
  ] as TransportPlanItem[],
};

export default function TransportPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'info' | 'items'>('info');

  const plan = MOCK_PLAN;

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    void targetStatus;
    void requiresApproval;
  };

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <div>
          <button
            onClick={() => navigate(TMS_PATHS.dashboard)}
            className='mb-2 text-sm text-blue-600 hover:underline'
          >
            ← 返回运输管理概览
          </button>
          <h1 className='text-2xl font-bold'>{plan.name}</h1>
          <p className='mt-1 text-sm text-gray-500'>
            {plan.plan_no} {id && `| ID: ${id}`}
          </p>
        </div>
        <StatusBadge fsm='route' status={plan.status} />
      </div>

      <div className='rounded-lg border p-4'>
        <p className='mb-3 text-sm font-semibold text-gray-700'>状态机操作</p>
        <FSMActionButtons
          fsm='route'
          currentStatus={plan.status}
          onAction={handleAction}
        />
      </div>

      <div className='flex gap-2 border-b'>
        {[
          { id: 'info' as const, label: '基本信息' },
          { id: 'items' as const, label: '运单明细' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === t.id
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <Field label='计划编号' value={plan.plan_no} />
          <Field label='计划名称' value={plan.name} />
          <Field label='状态' value={plan.status} />
          <Field label='运单总数' value={String(plan.totalShipments)} />
          <Field label='总运费' value={`¥${plan.totalFreight.toLocaleString()}`} />
          <Field label='开始日期' value={plan.startDate} />
          <Field label='结束日期' value={plan.endDate} />
        </div>
      )}

      {activeTab === 'items' && (
        <div className='rounded-lg border p-4'>
          <h3 className='mb-3 font-semibold'>运单明细</h3>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b text-left text-gray-600'>
                <th className='py-2 pr-4'>运单号</th>
                <th className='py-2 pr-4'>起点</th>
                <th className='py-2 pr-4'>终点</th>
                <th className='py-2 pr-4'>车辆</th>
                <th className='py-2 pr-4'>司机</th>
                <th className='py-2 pr-4'>路线</th>
                <th className='py-2 pr-4'>状态</th>
                <th className='py-2'>运费</th>
              </tr>
            </thead>
            <tbody>
              {plan.items.map((item) => (
                <tr key={item.shipment_no} className='border-b'>
                  <td className='py-2 pr-4'>{item.shipment_no}</td>
                  <td className='py-2 pr-4'>{item.origin}</td>
                  <td className='py-2 pr-4'>{item.destination}</td>
                  <td className='py-2 pr-4'>{item.vehicle_no}</td>
                  <td className='py-2 pr-4'>{item.driver_name}</td>
                  <td className='py-2 pr-4'>{item.route_name}</td>
                  <td className='py-2 pr-4'>
                    <StatusBadge fsm='shipment' status={item.status} />
                  </td>
                  <td className='py-2'>¥{item.freight.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
