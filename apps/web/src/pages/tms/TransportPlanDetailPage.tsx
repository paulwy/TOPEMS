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
import i18n from '@/i18n';
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
function getMockPlan() {
  return {
    plan_no: 'TP-2025-0812',
    name: i18n.t('pages.transport_plan_detail_page.8_0'),
    status: 'planning',
    totalShipments: 12,
    totalFreight: 86500,
    startDate: '2025-08-15',
    endDate: '2025-08-31',
    items: [
      { shipment_no: 'SHP-001', origin: i18n.t('tms.transport_plan_detail_page.k3'), destination: i18n.t('tms.transport_plan_detail_page.k2'), vehicle_no: 'V-001', driver_name: i18n.t('tms.transport_plan_detail_page.k1'), route_name: i18n.t('tms.transport_plan_detail_page.k0'), status: 'draft', freight: 3200 },
      { shipment_no: 'SHP-002', origin: i18n.t('tms.transport_plan_detail_page.k7'), destination: i18n.t('tms.transport_plan_detail_page.k6'), vehicle_no: 'V-003', driver_name: i18n.t('tms.transport_plan_detail_page.k5'), route_name: i18n.t('tms.transport_plan_detail_page.k4'), status: 'pending', freight: 4500 },
      { shipment_no: 'SHP-003', origin: i18n.t('tms.transport_plan_detail_page.k11'), destination: i18n.t('tms.transport_plan_detail_page.k10'), vehicle_no: 'V-005', driver_name: i18n.t('tms.transport_plan_detail_page.k9'), route_name: i18n.t('tms.transport_plan_detail_page.k8'), status: 'in_transit', freight: 2800 },
      { shipment_no: 'SHP-004', origin: i18n.t('tms.transport_plan_detail_page.k15'), destination: i18n.t('tms.transport_plan_detail_page.k14'), vehicle_no: 'V-007', driver_name: i18n.t('tms.transport_plan_detail_page.k13'), route_name: i18n.t('tms.transport_plan_detail_page.k12'), status: 'delivered', freight: 2200 },
      { shipment_no: 'SHP-005', origin: i18n.t('tms.transport_plan_detail_page.k19'), destination: i18n.t('tms.transport_plan_detail_page.k18'), vehicle_no: 'V-002', driver_name: i18n.t('tms.transport_plan_detail_page.k17'), route_name: i18n.t('tms.transport_plan_detail_page.k16'), status: 'cancelled', freight: 5800 },
    ] as TransportPlanItem[],
  };
}
export default function TransportPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'info' | 'items'>('info');
  const plan = getMockPlan();
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
            {i18n.t('pages.transport_plan_detail_page.k0')}
          </button>
          <h1 className='text-2xl font-bold'>{plan.name}</h1>
          <p className='mt-1 text-sm text-gray-500'>
            {plan.plan_no} {id && `| ID: ${id}`}
          </p>
        </div>
        <StatusBadge fsm='route' status={plan.status} />
      </div>
      <div className='rounded-lg border p-4'>
        <p className='mb-3 text-sm font-semibold text-gray-700'>{i18n.t('tms.transport_plan_detail_page.k20')}</p>
        <FSMActionButtons
          fsm='route'
          currentStatus={plan.status}
          onAction={handleAction}
        />
      </div>
      <div className='flex gap-2 border-b'>
        {[
          { id: 'info' as const, label: i18n.t('tms.transport_plan_detail_page.k21') },
          { id: 'items' as const, label: i18n.t('tms.transport_plan_detail_page.k22') },
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
          <Field label={i18n.t('tms.transport_plan_detail_page.k23')} value={plan.plan_no} />
          <Field label={i18n.t('tms.transport_plan_detail_page.k24')} value={plan.name} />
          <Field label={i18n.t('tms.transport_plan_detail_page.k25')} value={plan.status} />
          <Field label={i18n.t('tms.transport_plan_detail_page.k26')} value={String(plan.totalShipments)} />
          <Field label={i18n.t('tms.transport_plan_detail_page.k27')} value={`¥${plan.totalFreight.toLocaleString()}`} />
          <Field label={i18n.t('tms.transport_plan_detail_page.k28')} value={plan.startDate} />
          <Field label={i18n.t('tms.transport_plan_detail_page.k29')} value={plan.endDate} />
        </div>
      )}
      {activeTab === 'items' && (
        <div className='rounded-lg border p-4'>
          <h3 className='mb-3 font-semibold'>{i18n.t('tms.transport_plan_detail_page.k30')}</h3>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b text-left text-gray-600'>
                <th className='py-2 pr-4'>{i18n.t('tms.transport_plan_detail_page.k31')}</th>
                <th className='py-2 pr-4'>{i18n.t('tms.transport_plan_detail_page.k32')}</th>
                <th className='py-2 pr-4'>{i18n.t('tms.transport_plan_detail_page.k33')}</th>
                <th className='py-2 pr-4'>{i18n.t('tms.transport_plan_detail_page.k34')}</th>
                <th className='py-2 pr-4'>{i18n.t('tms.transport_plan_detail_page.k35')}</th>
                <th className='py-2 pr-4'>{i18n.t('tms.transport_plan_detail_page.k36')}</th>
                <th className='py-2 pr-4'>{i18n.t('tms.transport_plan_detail_page.k37')}</th>
                <th className='py-2'>{i18n.t('tms.transport_plan_detail_page.k38')}</th>
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