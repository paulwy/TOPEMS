/**
 * 质量问题详情页
 *
 * 包含：基本信息 + 纠正措施列表（含 8D 关联提示）
 * 使用 StatusBadge + FSMActionButtons 组件。
 * 数据来自 useQmsMock。
 */
import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQmsMock, type QmsMockShape } from '@/api/qms/_mock';
import { StatusBadge } from '@/components/qms/StatusBadge';
import { FSMActionButtons } from '@/components/qms/FSMActionButtons';
import { QMS_PATHS } from '@/modules/qms/config';

const SEVERITY_LABELS: Record<string, string> = {
  critical: '严重',
  major: '重大',
  minor: '一般',
  low: '轻微',
};

const TABS = [
  { id: 'info', label: '基本信息' },
  { id: 'actions', label: '纠正措施' },
] as const;

export default function QmsIssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data } = useQmsMock<QmsMockShape>();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('info');

  const issue = useMemo(() => {
    const list = data.issues ?? [];
    return list.find((i) => i.id === id) ?? list[0];
  }, [data.issues, id]);

  const improvements = useMemo(() => data.improvements ?? [], [data.improvements]);
  const eightDReports = useMemo(() => data.eightDReports ?? [], [data.eightDReports]);

  if (!issue) {
    return (
      <div className='p-4'>
        <p className='text-gray-600'>未找到质量问题数据。</p>
        <button
          onClick={() => navigate(QMS_PATHS.nonconformance)}
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
            onClick={() => navigate(QMS_PATHS.nonconformance)}
            className='mb-2 text-sm text-blue-600 hover:underline'
          >
            ← 返回质量问题列表
          </button>
          <h1 className='text-2xl font-bold'>{issue.issue_no}</h1>
          <p className='mt-1 text-sm text-gray-500'>{issue.title}</p>
        </div>
        <StatusBadge
          fsm='issue'
          status={issue.status}
        />
      </div>

      <div className='rounded-lg border p-4'>
        <p className='mb-3 text-sm font-semibold text-gray-700'>状态机操作</p>
        <FSMActionButtons
          fsm='issue'
          currentStatus={issue.status}
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
        <div className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <Field
              label='问题编号'
              value={issue.issue_no}
            />
            <Field
              label='严重度'
              value={SEVERITY_LABELS[issue.severity] ?? issue.severity}
            />
            <Field
              label='分类'
              value={issue.category}
            />
            <Field
              label='负责人'
              value={issue.assignee}
            />
            <Field
              label='截止日期'
              value={issue.due_date ? new Date(issue.due_date).toLocaleDateString('zh-CN') : '-'}
            />
            <Field
              label='关闭时间'
              value={issue.closed_at ? new Date(issue.closed_at).toLocaleString('zh-CN') : '-'}
            />
          </div>
          <div className='rounded-lg border p-4'>
            <p className='text-xs text-gray-500'>问题描述</p>
            <p className='mt-1 text-sm leading-relaxed'>{issue.description}</p>
          </div>
          {issue.resolution && (
            <div className='rounded-lg border border-green-200 bg-green-50 p-4'>
              <p className='text-xs text-green-700'>解决方案</p>
              <p className='mt-1 text-sm leading-relaxed text-green-800'>{issue.resolution}</p>
            </div>
          )}
          {eightDReports.length > 0 && (
            <div className='rounded-lg border p-4'>
              <p className='mb-2 text-sm font-semibold text-gray-700'>关联 8D 报告</p>
              <p className='text-sm text-gray-600'>
                共 {eightDReports.length} 个 8D 报告，可在 8D 报告列表中查看详情。
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'actions' && (
        <div className='rounded-lg border p-4'>
          <h3 className='mb-3 font-semibold'>纠正措施列表</h3>
          {improvements.length === 0 ? (
            <p className='text-sm text-gray-500'>暂无纠正措施</p>
          ) : (
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b text-left text-gray-600'>
                  <th className='py-2 pr-4'>编号</th>
                  <th className='py-2 pr-4'>标题</th>
                  <th className='py-2 pr-4'>负责人</th>
                  <th className='py-2 pr-4'>状态</th>
                </tr>
              </thead>
              <tbody>
                {improvements.map((im) => (
                  <tr
                    key={im.id}
                    className='border-b'
                  >
                    <td className='py-2 pr-4 font-medium'>{im.improvement_no}</td>
                    <td className='py-2 pr-4'>{im.title}</td>
                    <td className='py-2 pr-4'>{im.assignee}</td>
                    <td className='py-2 pr-4'>{im.status}</td>
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
