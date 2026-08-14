/**
 * 检验单详情页
 *
 * 包含：基本信息、检验结果项、审核日志
 * 使用 StatusBadge + FSMActionButtons 组件。
 * 数据来自 useQmsMock（按 :id 查找，未命中则取第一条）。
 */
import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQmsMock, type QmsMockShape } from '@/api/qms/_mock';
import { StatusBadge } from '@/components/qms/StatusBadge';
import { FSMActionButtons } from '@/components/qms/FSMActionButtons';
import { QMS_PATHS } from '@/modules/qms/config';
import i18n from '@/i18n';
const TABS = [
  { id: 'info', label: i18n.t('qms.qms_inspection_detail_page.k0') },
  { id: 'results', label: i18n.t('qms.qms_inspection_detail_page.k1') },
  { id: 'audit', label: i18n.t('qms.qms_inspection_detail_page.k2') },
] as const;
export default function QmsInspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data } = useQmsMock<QmsMockShape>();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('info');
  const inspection = useMemo(() => {
    const list = data.inspections ?? [];
    return list.find((i) => i.id === id) ?? list[0];
  }, [data.inspections, id]);
  if (!inspection) {
    return (
      <div className='p-4'>
        <p className='text-gray-600'>{i18n.t('qms.qms_inspection_detail_page.k3')}</p>
        <button
          onClick={() => navigate(QMS_PATHS.inspection)}
          className='mt-2 text-blue-600 underline'
        >
          {i18n.t('pages.qms_inspection_detail_page.k0')}
        </button>
      </div>
    );
  }
  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    // 实际项目应调用审批 API；此处仅占位
    void targetStatus;
    void requiresApproval;
  };
  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <div>
          <button
            onClick={() => navigate(QMS_PATHS.inspection)}
            className='mb-2 text-sm text-blue-600 hover:underline'
          >
            {i18n.t('pages.qms_inspection_detail_page.k1')}
          </button>
          <h1 className='text-2xl font-bold'>{inspection.inspection_no}</h1>
          <p className='mt-1 text-sm text-gray-500'>{inspection.product_name}</p>
        </div>
        <StatusBadge
          fsm='inspection'
          status={inspection.status}
        />
      </div>
      <div className='rounded-lg border p-4'>
        <p className='mb-3 text-sm font-semibold text-gray-700'>{i18n.t('qms.qms_inspection_detail_page.k4')}</p>
        <FSMActionButtons
          fsm='inspection'
          currentStatus={inspection.status}
          onAction={handleAction}
        />
      </div>
      <div className='flex gap-2 border-b'>
        {TABS.map((t) => (
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
          <Field
            label={i18n.t('qms.qms_inspection_detail_page.k5')}
            value={inspection.inspection_no}
          />
          <Field
            label={i18n.t('qms.qms_inspection_detail_page.k6')}
            value={inspection.inspection_type}
          />
          <Field
            label={i18n.t('qms.qms_inspection_detail_page.k7')}
            value={inspection.product_name ?? '-'}
          />
          <Field
            label={i18n.t('qms.qms_inspection_detail_page.k8')}
            value={inspection.inspector ?? '-'}
          />
          <Field
            label={i18n.t('qms.qms_inspection_detail_page.k9')}
            value={inspection.assignee ?? '-'}
          />
          <Field
            label={i18n.t('qms.qms_inspection_detail_page.k10')}
            value={String(inspection.quantity)}
          />
          <Field
            label={i18n.t('qms.qms_inspection_detail_page.k11')}
            value={String(inspection.qualified_quantity ?? 0)}
          />
          <Field
            label={i18n.t('qms.qms_inspection_detail_page.k12')}
            value={String(inspection.unqualified_quantity ?? 0)}
          />
          <Field
            label={i18n.t('qms.qms_inspection_detail_page.k13')}
            value={`${inspection.qualification_rate ?? 0}%`}
          />
          <Field
            label={i18n.t('qms.qms_inspection_detail_page.k14')}
            value={inspection.result ?? '-'}
          />
          <Field
            label={i18n.t('qms.qms_inspection_detail_page.k15')}
            value={
              inspection.inspected_at
                ? new Date(inspection.inspected_at).toLocaleString('zh-CN')
                : '-'
            }
          />
          <Field
            label={i18n.t('qms.qms_inspection_detail_page.k16')}
            value={inspection.memo ?? '-'}
          />
        </div>
      )}
      {activeTab === 'results' && (
        <div className='rounded-lg border p-4'>
          <h3 className='mb-3 font-semibold'>{i18n.t('qms.qms_inspection_detail_page.k17')}</h3>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b text-left text-gray-600'>
                <th className='py-2 pr-4'>{i18n.t('qms.qms_inspection_detail_page.k18')}</th>
                <th className='py-2 pr-4'>{i18n.t('qms.qms_inspection_detail_page.k19')}</th>
                <th className='py-2 pr-4'>{i18n.t('qms.qms_inspection_detail_page.k20')}</th>
                <th className='py-2 pr-4'>{i18n.t('qms.qms_inspection_detail_page.k21')}</th>
                <th className='py-2'>{i18n.t('qms.qms_inspection_detail_page.k22')}</th>
              </tr>
            </thead>
            <tbody>
              <tr className='border-b'>
                <td className='py-2 pr-4'>{i18n.t('qms.qms_inspection_detail_page.k23')}</td>
                <td className='py-2 pr-4'>{i18n.t('qms.qms_inspection_detail_page.k24')}</td>
                <td className='py-2 pr-4'>{i18n.t('qms.qms_inspection_detail_page.k25')}</td>
                <td className='py-2 pr-4'>
                  <span className='rounded bg-green-100 px-2 py-0.5 text-xs text-green-700'>
                    {i18n.t('pages.qms_inspection_detail_page.k2')}
                  </span>
                </td>
                <td className='py-2'>-</td>
              </tr>
              <tr className='border-b'>
                <td className='py-2 pr-4'>{i18n.t('qms.qms_inspection_detail_page.k26')}</td>
                <td className='py-2 pr-4'>±0.05mm</td>
                <td className='py-2 pr-4'>
                  {(inspection.qualification_rate ?? 0) > 95 ? '0.02mm' : '0.08mm'}
                </td>
                <td className='py-2 pr-4'>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${(inspection.qualification_rate ?? 0) > 95 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {(inspection.qualification_rate ?? 0) > 95 ? i18n.t('qms.qms_inspection_detail_page.k28') : i18n.t('qms.qms_inspection_detail_page.k27')}
                  </span>
                </td>
                <td className='py-2'>{i18n.t('qms.qms_inspection_detail_page.k29')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {activeTab === 'audit' && (
        <div className='rounded-lg border p-4'>
          <h3 className='mb-3 font-semibold'>{i18n.t('qms.qms_inspection_detail_page.k30')}</h3>
          <ul className='space-y-2 text-sm'>
            <li className='flex gap-3'>
              <span className='text-gray-500'>
                [
                {inspection.created_at
                  ? new Date(inspection.created_at).toLocaleString('zh-CN')
                  : '-'}
                ]
              </span>
              <span>{i18n.t('qms.qms_inspection_detail_page.pending_31')}</span>
            </li>
            {inspection.inspected_at && (
              <li className='flex gap-3'>
                <span className='text-gray-500'>
                  [{new Date(inspection.inspected_at).toLocaleString('zh-CN')}]
                </span>
                <span>{i18n.t('qms.qms_inspection_detail_page.k32')}</span>
              </li>
            )}
            {inspection.status === 'completed' && (
              <li className='flex gap-3'>
                <span className='text-gray-500'>[审批完成]</span>
                <span>{i18n.t('qms.qms_inspection_detail_page.completed_33')}</span>
              </li>
            )}
          </ul>
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