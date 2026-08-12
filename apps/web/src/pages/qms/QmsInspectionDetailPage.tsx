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

const TABS = [
  { id: 'info', label: '基本信息' },
  { id: 'results', label: '检验结果项' },
  { id: 'audit', label: '审核日志' },
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
        <p className='text-gray-600'>未找到检验单数据。</p>
        <button
          onClick={() => navigate(QMS_PATHS.inspection)}
          className='mt-2 text-blue-600 underline'
        >
          返回列表
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
            ← 返回检验任务列表
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
        <p className='mb-3 text-sm font-semibold text-gray-700'>状态机操作</p>
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
            label='检验编号'
            value={inspection.inspection_no}
          />
          <Field
            label='检验类型'
            value={inspection.inspection_type}
          />
          <Field
            label='产品名称'
            value={inspection.product_name ?? '-'}
          />
          <Field
            label='检验员'
            value={inspection.inspector ?? '-'}
          />
          <Field
            label='分配人'
            value={inspection.assignee ?? '-'}
          />
          <Field
            label='检验数量'
            value={String(inspection.quantity)}
          />
          <Field
            label='合格数量'
            value={String(inspection.qualified_quantity ?? 0)}
          />
          <Field
            label='不合格数量'
            value={String(inspection.unqualified_quantity ?? 0)}
          />
          <Field
            label='合格率'
            value={`${inspection.qualification_rate ?? 0}%`}
          />
          <Field
            label='检验结果'
            value={inspection.result ?? '-'}
          />
          <Field
            label='检验时间'
            value={
              inspection.inspected_at
                ? new Date(inspection.inspected_at).toLocaleString('zh-CN')
                : '-'
            }
          />
          <Field
            label='备注'
            value={inspection.memo ?? '-'}
          />
        </div>
      )}

      {activeTab === 'results' && (
        <div className='rounded-lg border p-4'>
          <h3 className='mb-3 font-semibold'>检验结果项明细</h3>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b text-left text-gray-600'>
                <th className='py-2 pr-4'>项目</th>
                <th className='py-2 pr-4'>标准值</th>
                <th className='py-2 pr-4'>实测值</th>
                <th className='py-2 pr-4'>判定</th>
                <th className='py-2'>备注</th>
              </tr>
            </thead>
            <tbody>
              <tr className='border-b'>
                <td className='py-2 pr-4'>外观检查</td>
                <td className='py-2 pr-4'>无划痕</td>
                <td className='py-2 pr-4'>合格</td>
                <td className='py-2 pr-4'>
                  <span className='rounded bg-green-100 px-2 py-0.5 text-xs text-green-700'>
                    合格
                  </span>
                </td>
                <td className='py-2'>-</td>
              </tr>
              <tr className='border-b'>
                <td className='py-2 pr-4'>尺寸测量</td>
                <td className='py-2 pr-4'>±0.05mm</td>
                <td className='py-2 pr-4'>
                  {(inspection.qualification_rate ?? 0) > 95 ? '0.02mm' : '0.08mm'}
                </td>
                <td className='py-2 pr-4'>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${(inspection.qualification_rate ?? 0) > 95 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {(inspection.qualification_rate ?? 0) > 95 ? '合格' : '不合格'}
                  </span>
                </td>
                <td className='py-2'>关键尺寸</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className='rounded-lg border p-4'>
          <h3 className='mb-3 font-semibold'>审核日志</h3>
          <ul className='space-y-2 text-sm'>
            <li className='flex gap-3'>
              <span className='text-gray-500'>
                [
                {inspection.created_at
                  ? new Date(inspection.created_at).toLocaleString('zh-CN')
                  : '-'}
                ]
              </span>
              <span>创建检验单，状态：pending</span>
            </li>
            {inspection.inspected_at && (
              <li className='flex gap-3'>
                <span className='text-gray-500'>
                  [{new Date(inspection.inspected_at).toLocaleString('zh-CN')}]
                </span>
                <span>提交检验结果，状态：pending_audit</span>
              </li>
            )}
            {inspection.status === 'completed' && (
              <li className='flex gap-3'>
                <span className='text-gray-500'>[审批完成]</span>
                <span>审核通过，状态：completed</span>
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
