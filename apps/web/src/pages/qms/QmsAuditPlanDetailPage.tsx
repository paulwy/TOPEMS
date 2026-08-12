/**
 * 审核计划详情页
 *
 * 包含：基本信息 + 审核任务列表 + 发现项列表
 * 使用 StatusBadge + FSMActionButtons 组件。
 * 数据来自 useQmsMock。
 */
import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQmsMock, type QmsMockShape } from '@/api/qms/_mock';
import { StatusBadge } from '@/components/qms/StatusBadge';
import { FSMActionButtons } from '@/components/qms/FSMActionButtons';
import { QMS_PATHS } from '@/modules/qms/config';

const TABS = [
  { id: 'info', label: '基本信息' },
  { id: 'tasks', label: '审核任务' },
  { id: 'findings', label: '发现项' },
] as const;

export default function QmsAuditPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data } = useQmsMock<QmsMockShape>();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('info');

  const plan = useMemo(() => {
    const list = data.auditPlans ?? [];
    return list.find((p) => p.id === id) ?? list[0];
  }, [data.auditPlans, id]);

  const tasks = useMemo(() => {
    if (!plan) return [];
    return (data.auditTasks ?? []).filter((t) => t.plan_id === plan.id);
  }, [data.auditTasks, plan]);

  const findings = useMemo(() => {
    if (!plan) return [];
    const taskIds = new Set(tasks.map((t) => t.id));
    return (data.auditFindings ?? []).filter((f) => taskIds.has(f.task_id));
  }, [data.auditFindings, tasks, plan]);

  if (!plan) {
    return (
      <div className='p-4'>
        <p className='text-gray-600'>未找到审核计划数据。</p>
        <button
          onClick={() => navigate(QMS_PATHS.auditManagement)}
          className='mt-2 text-blue-600 underline'
        >
          返回列表
        </button>
      </div>
    );
  }

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    void targetStatus;
    void requiresApproval;
  };

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <div>
          <button
            onClick={() => navigate(QMS_PATHS.auditManagement)}
            className='mb-2 text-sm text-blue-600 hover:underline'
          >
            ← 返回审核管理
          </button>
          <h1 className='text-2xl font-bold'>{plan.plan_no}</h1>
          <p className='mt-1 text-sm text-gray-500'>{plan.title}</p>
        </div>
        <StatusBadge
          fsm='audit_plan'
          status={plan.status}
        />
      </div>

      <div className='rounded-lg border p-4'>
        <p className='mb-3 text-sm font-semibold text-gray-700'>状态机操作</p>
        <FSMActionButtons
          fsm='audit_plan'
          currentStatus={plan.status}
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
            {t.id === 'tasks' && tasks.length > 0 && (
              <span className='ml-1 rounded bg-gray-100 px-1.5 text-xs'>{tasks.length}</span>
            )}
            {t.id === 'findings' && findings.length > 0 && (
              <span className='ml-1 rounded bg-gray-100 px-1.5 text-xs'>{findings.length}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <Field
            label='计划编号'
            value={plan.plan_no}
          />
          <Field
            label='审核类型'
            value={plan.audit_type}
          />
          <Field
            label='主审核员'
            value={plan.auditor}
          />
          <Field
            label='审核范围'
            value={plan.scope ?? '-'}
          />
          <Field
            label='涉及部门'
            value={plan.departments.join('、') || '-'}
          />
          <Field
            label='审核组成员'
            value={plan.auditors.join('、') || '-'}
          />
          <Field
            label='开始日期'
            value={plan.start_date ? new Date(plan.start_date).toLocaleDateString('zh-CN') : '-'}
          />
          <Field
            label='结束日期'
            value={plan.end_date ? new Date(plan.end_date).toLocaleDateString('zh-CN') : '-'}
          />
          <div className='rounded-lg border p-3 md:col-span-2'>
            <p className='text-xs text-gray-500'>计划描述</p>
            <p className='mt-1 text-sm leading-relaxed'>{plan.description ?? '-'}</p>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className='rounded-lg border p-4'>
          <h3 className='mb-3 font-semibold'>审核任务列表</h3>
          {tasks.length === 0 ? (
            <p className='text-sm text-gray-500'>暂无审核任务</p>
          ) : (
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b text-left text-gray-600'>
                  <th className='py-2 pr-4'>任务编号</th>
                  <th className='py-2 pr-4'>标题</th>
                  <th className='py-2 pr-4'>负责人</th>
                  <th className='py-2 pr-4'>优先级</th>
                  <th className='py-2 pr-4'>发现项数</th>
                  <th className='py-2'>状态</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr
                    key={t.id}
                    className='border-b'
                  >
                    <td className='py-2 pr-4 font-medium'>{t.task_no}</td>
                    <td className='py-2 pr-4'>{t.title}</td>
                    <td className='py-2 pr-4'>{t.assignee}</td>
                    <td className='py-2 pr-4'>{t.priority}</td>
                    <td className='py-2 pr-4'>{t.findings_count}</td>
                    <td className='py-2'>{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'findings' && (
        <div className='rounded-lg border p-4'>
          <h3 className='mb-3 font-semibold'>审核发现项列表</h3>
          {findings.length === 0 ? (
            <p className='text-sm text-gray-500'>暂无发现项</p>
          ) : (
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b text-left text-gray-600'>
                  <th className='py-2 pr-4'>编号</th>
                  <th className='py-2 pr-4'>标题</th>
                  <th className='py-2 pr-4'>严重度</th>
                  <th className='py-2 pr-4'>类别</th>
                  <th className='py-2'>状态</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f) => (
                  <tr
                    key={f.id}
                    className='border-b'
                  >
                    <td className='py-2 pr-4 font-medium'>{f.finding_no}</td>
                    <td className='py-2 pr-4'>{f.title}</td>
                    <td className='py-2 pr-4'>{f.severity}</td>
                    <td className='py-2 pr-4'>{f.category}</td>
                    <td className='py-2'>{f.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
