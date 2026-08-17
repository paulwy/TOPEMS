/**
 * APQP 项目详情页
 *
 * 包含：5 阶段进度 + 任务列表 + 风险登记 + 审批记录
 * 使用 StatusBadge + FSMActionButtons 组件。
 * 数据来自 useQmsMock。
 */
import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { useQmsMock, type QmsMockShape } from '@/api/qms/_mock';
import { StatusBadge } from '@/components/qms/StatusBadge';
import { FSMActionButtons } from '@/components/qms/FSMActionButtons';
import { QMS_PATHS } from '@/modules/qms/config';
import { designTokens, semanticTokens } from '@topems/tokens';
import i18n from '@/i18n';

const TABS = [
  { id: 'phases', label: i18n.t('qms.qms_apqp_project_detail_page.k0') },
  { id: 'tasks', label: i18n.t('qms.qms_apqp_project_detail_page.k1') },
  { id: 'risks', label: i18n.t('qms.qms_apqp_project_detail_page.k2') },
  { id: 'approvals', label: i18n.t('qms.qms_apqp_project_detail_page.k3') },
] as const;
export default function QmsApqpProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data } = useQmsMock<QmsMockShape>();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('phases');
  const project = useMemo(() => {
    const list = data.apqpProjects ?? [];
    return list.find((p) => p.id === id) ?? list[0];
  }, [data.apqpProjects, id]);
  const phases = useMemo(() => {
    if (!project) return [];
    return (data.apqpPhases ?? [])
      .filter((p) => p.project_id === project.id)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [data.apqpPhases, project]);
  const tasks = useMemo(() => {
    if (!project) return [];
    return (data.apqpTasks ?? []).filter((t) => t.project_id === project.id);
  }, [data.apqpTasks, project]);
  const risks = useMemo(() => {
    if (!project) return [];
    return (data.apqpRisks ?? []).filter((r) => r.project_id === project.id);
  }, [data.apqpRisks, project]);
  const approvals = useMemo(() => {
    if (!project) return [];
    return (data.apqpApprovals ?? []).filter((a) => a.project_id === project.id);
  }, [data.apqpApprovals, project]);
  const radarData = useMemo(
    () =>
      phases.map((p) => ({
        phase: p.phase_name,
        progress: p.progress ?? 0,
      })),
    [phases]
  );
  if (!project) {
    return (
      <div className='p-4'>
        <p className='text-gray-600'>{i18n.t('qms.qms_apqp_project_detail_page.apqp_4')}</p>
        <button
          onClick={() => navigate(QMS_PATHS.apqp)}
          className='mt-2 text-blue-600 underline'
        >
          {i18n.t('pages.qms_apqp_project_detail_page.apqp_0')}
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
            onClick={() => navigate(QMS_PATHS.apqp)}
            className='mb-2 text-sm text-blue-600 hover:underline'
          >
            {i18n.t('pages.qms_apqp_project_detail_page.apqp_1')}
          </button>
          <h1 className='text-2xl font-bold'>{project.project_no}</h1>
          <p className='mt-1 text-sm text-gray-500'>{project.project_name}</p>
        </div>
        <StatusBadge
          fsm='apqp'
          status={project.status ?? 'planning'}
        />
      </div>
      <div className='rounded-lg border p-4'>
        <p className='mb-3 text-sm font-semibold text-gray-700'>
          {i18n.t('qms.qms_apqp_project_detail_page.k5')}
        </p>
        <FSMActionButtons
          fsm='apqp'
          currentStatus={project.status ?? 'planning'}
          onAction={handleAction}
        />
      </div>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <Field
          label={i18n.t('qms.qms_apqp_project_detail_page.k6')}
          value={project.project_no}
        />
        <Field
          label={i18n.t('qms.qms_apqp_project_detail_page.k7')}
          value={project.product_name ?? '-'}
        />
        <Field
          label={i18n.t('qms.qms_apqp_project_detail_page.k8')}
          value={project.customer ?? '-'}
        />
        <Field
          label={i18n.t('qms.qms_apqp_project_detail_page.k9')}
          value={project.leader ?? '-'}
        />
        <Field
          label={i18n.t('qms.qms_apqp_project_detail_page.k10')}
          value={project.current_phase ?? '-'}
        />
        <Field
          label={i18n.t('qms.qms_apqp_project_detail_page.k11')}
          value={`${project.progress ?? 0}%`}
        />
        <Field
          label={i18n.t('qms.qms_apqp_project_detail_page.k12')}
          value={project.risklevel ?? '-'}
        />
        <Field
          label={i18n.t('qms.qms_apqp_project_detail_page.k13')}
          value={
            project.target_date ? new Date(project.target_date).toLocaleDateString('zh-CN') : '-'
          }
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
      {activeTab === 'phases' && (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div className='rounded-lg border p-4'>
            <h3 className='mb-3 font-semibold'>{i18n.t('qms.qms_apqp_project_detail_page.k14')}</h3>
            <ResponsiveContainer
              width='100%'
              height={280}
            >
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis
                  dataKey='phase'
                  fontSize={10}
                />
                <Radar
                  dataKey='progress'
                  stroke={designTokens.colors.secondary.dark}
                  fill={designTokens.colors.secondary.dark}
                  fillOpacity={0.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className='rounded-lg border p-4'>
            <h3 className='mb-3 font-semibold'>{i18n.t('qms.qms_apqp_project_detail_page.k15')}</h3>
            <div className='space-y-3'>
              {phases.map((p) => (
                <div
                  key={p.id}
                  className='rounded border p-3'
                >
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-medium'>
                      {p.phase_code} {p.phase_name}
                    </span>
                    <span className='text-xs text-gray-500'>{p.status}</span>
                  </div>
                  <div className='mt-2 h-2 w-full overflow-hidden rounded bg-gray-200'>
                    <div
                      className='h-full bg-blue-500'
                      style={{ width: `${p.progress ?? 0}%` }}
                    />
                  </div>
                  <p className='mt-1 text-xs text-gray-500'>
                    {i18n.t('pages.qms_apqp_project_detail_page.k0')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {activeTab === 'tasks' && (
        <div className='rounded-lg border p-4'>
          <h3 className='mb-3 font-semibold'>{i18n.t('qms.qms_apqp_project_detail_page.k16')}</h3>
          {tasks.length === 0 ? (
            <p className='text-sm text-gray-500'>
              {i18n.t('qms.qms_apqp_project_detail_page.k17')}
            </p>
          ) : (
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b text-left text-gray-600'>
                  <th className='py-2 pr-4'>{i18n.t('qms.qms_apqp_project_detail_page.k18')}</th>
                  <th className='py-2 pr-4'>{i18n.t('qms.qms_apqp_project_detail_page.k19')}</th>
                  <th className='py-2 pr-4'>{i18n.t('qms.qms_apqp_project_detail_page.k20')}</th>
                  <th className='py-2 pr-4'>{i18n.t('qms.qms_apqp_project_detail_page.k21')}</th>
                  <th className='py-2'>{i18n.t('qms.qms_apqp_project_detail_page.k22')}</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr
                    key={t.id}
                    className='border-b'
                  >
                    <td className='py-2 pr-4 font-medium'>{t.task_name}</td>
                    <td className='py-2 pr-4'>{t.deliverable ?? '-'}</td>
                    <td className='py-2 pr-4'>{t.assignee ?? '-'}</td>
                    <td className='py-2 pr-4'>
                      {t.due_date ? new Date(t.due_date).toLocaleDateString('zh-CN') : '-'}
                    </td>
                    <td className='py-2'>{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {activeTab === 'risks' && (
        <div className='rounded-lg border p-4'>
          <h3 className='mb-3 font-semibold'>{i18n.t('qms.qms_apqp_project_detail_page.k23')}</h3>
          {risks.length === 0 ? (
            <p className='text-sm text-gray-500'>
              {i18n.t('qms.qms_apqp_project_detail_page.k24')}
            </p>
          ) : (
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b text-left text-gray-600'>
                  <th className='py-2 pr-4'>{i18n.t('qms.qms_apqp_project_detail_page.k25')}</th>
                  <th className='py-2 pr-4'>{i18n.t('qms.qms_apqp_project_detail_page.k26')}</th>
                  <th className='py-2 pr-4'>S</th>
                  <th className='py-2 pr-4'>O</th>
                  <th className='py-2 pr-4'>D</th>
                  <th className='py-2 pr-4'>RPN</th>
                  <th className='py-2'>{i18n.t('qms.qms_apqp_project_detail_page.k27')}</th>
                </tr>
              </thead>
              <tbody>
                {risks.map((r) => (
                  <tr
                    key={r.id}
                    className='border-b'
                  >
                    <td className='py-2 pr-4 font-medium'>{r.risk_name}</td>
                    <td className='py-2 pr-4'>{r.risk_category ?? '-'}</td>
                    <td className='py-2 pr-4'>{r.severity ?? '-'}</td>
                    <td className='py-2 pr-4'>{r.occurrence ?? '-'}</td>
                    <td className='py-2 pr-4'>{r.detection ?? '-'}</td>
                    <td className='py-2 pr-4 font-bold'>{r.rpn ?? '-'}</td>
                    <td className='py-2'>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {activeTab === 'approvals' && (
        <div className='rounded-lg border p-4'>
          <h3 className='mb-3 font-semibold'>{i18n.t('qms.qms_apqp_project_detail_page.k28')}</h3>
          {approvals.length === 0 ? (
            <p className='text-sm text-gray-500'>
              {i18n.t('qms.qms_apqp_project_detail_page.k29')}
            </p>
          ) : (
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b text-left text-gray-600'>
                  <th className='py-2 pr-4'>{i18n.t('qms.qms_apqp_project_detail_page.k30')}</th>
                  <th className='py-2 pr-4'>{i18n.t('qms.qms_apqp_project_detail_page.k31')}</th>
                  <th className='py-2 pr-4'>{i18n.t('qms.qms_apqp_project_detail_page.k32')}</th>
                  <th className='py-2 pr-4'>{i18n.t('qms.qms_apqp_project_detail_page.k33')}</th>
                  <th className='py-2 pr-4'>{i18n.t('qms.qms_apqp_project_detail_page.k34')}</th>
                  <th className='py-2'>{i18n.t('qms.qms_apqp_project_detail_page.k35')}</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((a) => (
                  <tr
                    key={a.id}
                    className='border-b'
                  >
                    <td className='py-2 pr-4 font-medium'>{a.approval_type}</td>
                    <td className='py-2 pr-4'>{a.applicant ?? '-'}</td>
                    <td className='py-2 pr-4'>{a.approver ?? '-'}</td>
                    <td className='py-2 pr-4'>
                      {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('zh-CN') : '-'}
                    </td>
                    <td className='py-2 pr-4'>
                      {a.approved_at ? new Date(a.approved_at).toLocaleDateString('zh-CN') : '-'}
                    </td>
                    <td className='py-2'>{a.status ?? '-'}</td>
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
