/**
 * 8D 报告详情页
 *
 * 包含：8 步骤时间线（D1-D8）+ 每步骤内容展示 + 审计日志
 * 使用 StatusBadge + FSMActionButtons 组件。
 * 数据来自 useQmsMock。
 */
import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQmsMock, type QmsMockShape } from '@/api/qms/_mock';
import { StatusBadge } from '@/components/qms/StatusBadge';
import { FSMActionButtons } from '@/components/qms/FSMActionButtons';
import { QMS_PATHS } from '@/modules/qms/config';
import i18n from '@/i18n';
const STEPS = [
  { id: 'd1', label: i18n.t('pages.qms_eight_d_detail_page.d1_0'), field: 'd1Content', done: 'd1TeamEstablished' },
  { id: 'd2', label: i18n.t('pages.qms_eight_d_detail_page.d2_1'), field: 'd2Content', done: 'd2ProblemDescribed' },
  { id: 'd3', label: i18n.t('pages.qms_eight_d_detail_page.d3_2'), field: 'd3Content', done: 'd3ContainmentImplemented' },
  { id: 'd4', label: i18n.t('pages.qms_eight_d_detail_page.d4_3'), field: 'd4Content', done: 'd4RootCauseIdentified' },
  { id: 'd5', label: i18n.t('pages.qms_eight_d_detail_page.d5_4'), field: 'd5Content', done: 'd5PermanentActionSelected' },
  { id: 'd6', label: i18n.t('pages.qms_eight_d_detail_page.d6_5'), field: 'd6Content', done: 'd6ActionVerified' },
  { id: 'd7', label: i18n.t('pages.qms_eight_d_detail_page.d7_6'), field: 'd7Content', done: 'd7PreventiveImplemented' },
  { id: 'd8', label: i18n.t('pages.qms_eight_d_detail_page.d8_7'), field: 'd8Content', done: 'd8TeamRecognized' },
] as const;
const SEVERITY_LABELS: Record<string, string> = {
  critical: i18n.t('qms.qms_eight_d_detail_page.k0'),
  major: i18n.t('qms.qms_eight_d_detail_page.k1'),
  minor: i18n.t('qms.qms_eight_d_detail_page.k2'),
};
export default function QmsEightDDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data } = useQmsMock<QmsMockShape>();
  const report = useMemo(() => {
    const list = data.eightDReports ?? [];
    return list.find((r) => r.id === id) ?? list[0];
  }, [data.eightDReports, id]);
  if (!report) {
    return (
      <div className='p-4'>
        <p className='text-gray-600'>{i18n.t('qms.qms_eight_d_detail_page.8d_3')}</p>
        <button
          onClick={() => navigate(QMS_PATHS.eightd)}
          className='mt-2 text-blue-600 underline'
        >
          {i18n.t('pages.qms_eight_d_detail_page.8d_0')}
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
            onClick={() => navigate(QMS_PATHS.eightd)}
            className='mb-2 text-sm text-blue-600 hover:underline'
          >
            {i18n.t('pages.qms_eight_d_detail_page.8d_1')}
          </button>
          <h1 className='text-2xl font-bold'>{report.reportNo}</h1>
          <p className='mt-1 text-sm text-gray-500'>{report.title}</p>
        </div>
        <StatusBadge
          fsm='eight_d'
          status={report.status}
        />
      </div>
      <div className='rounded-lg border p-4'>
        <p className='mb-3 text-sm font-semibold text-gray-700'>{i18n.t('qms.qms_eight_d_detail_page.k4')}</p>
        <FSMActionButtons
          fsm='eight_d'
          currentStatus={report.status}
          onAction={handleAction}
        />
      </div>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <Field
          label={i18n.t('qms.qms_eight_d_detail_page.k5')}
          value={`D${report.currentStage}`}
        />
        <Field
          label={i18n.t('qms.qms_eight_d_detail_page.k6')}
          value={SEVERITY_LABELS[report.severity] ?? report.severity}
        />
        <Field
          label={i18n.t('qms.qms_eight_d_detail_page.k7')}
          value={report.teamLeader ?? '-'}
        />
        <Field
          label={i18n.t('qms.qms_eight_d_detail_page.k8')}
          value={report.customer ?? '-'}
        />
        <Field
          label={i18n.t('qms.qms_eight_d_detail_page.k9')}
          value={report.productName ?? '-'}
        />
        <Field
          label={i18n.t('qms.qms_eight_d_detail_page.k10')}
          value={report.source ?? '-'}
        />
        <Field
          label={i18n.t('qms.qms_eight_d_detail_page.k11')}
          value={report.dueDate ? new Date(report.dueDate).toLocaleDateString('zh-CN') : '-'}
        />
        <Field
          label={i18n.t('qms.qms_eight_d_detail_page.k12')}
          value={report.closedAt ? new Date(report.closedAt).toLocaleString('zh-CN') : '-'}
        />
      </div>
      <div className='rounded-lg border p-4'>
        <p className='text-xs text-gray-500'>{i18n.t('qms.qms_eight_d_detail_page.k13')}</p>
        <p className='mt-1 text-sm leading-relaxed'>{report.problemDescription}</p>
      </div>
      <div className='rounded-lg border p-4'>
        <h3 className='mb-4 font-semibold'>{i18n.t('qms:qms_eight_d_detail_page.8d_2')}</h3>
        <ol className='relative space-y-4 border-l-2 border-blue-200 pl-6'>
          {STEPS.map((step, idx) => {
            const isDone = report[step.done as keyof typeof report] as boolean;
            const content = report[step.field as keyof typeof report] as string | undefined;
            const isCurrent = report.currentStage === idx + 1;
            return (
              <li
                key={step.id}
                className='relative'
              >
                <span
                  className={`absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                    isDone ? 'bg-green-500' : isCurrent ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  {idx + 1}
                </span>
                <div
                  className={`rounded-lg border p-3 ${isCurrent ? 'border-blue-400 bg-blue-50' : ''}`}
                >
                  <div className='flex items-center justify-between'>
                    <p className='text-sm font-semibold'>{step.label}</p>
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        isDone
                          ? 'bg-green-100 text-green-700'
                          : isCurrent
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {isDone ? i18n.t('qms.qms_eight_d_detail_page.k16') : isCurrent ? i18n.t('qms.qms_eight_d_detail_page.k15') : i18n.t('qms.qms_eight_d_detail_page.k14')}
                    </span>
                  </div>
                  {content && <p className='mt-2 text-sm text-gray-700'>{content}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <div className='rounded-lg border p-4'>
        <h3 className='mb-3 font-semibold'>{i18n.t('qms.qms_eight_d_detail_page.k17')}</h3>
        <ul className='space-y-2 text-sm'>
          <li className='flex gap-3'>
            <span className='text-gray-500'>
              [{report.createdAt ? new Date(report.createdAt).toLocaleString('zh-CN') : '-'}]
            </span>
            <span>{i18n.t('qms.qms_eight_d_detail_page.8dd1_18')}</span>
          </li>
          {report.currentStage >= 4 && (
            <li className='flex gap-3'>
              <span className='text-gray-500'>{i18n.t('qms:qms_eight_d_detail_page.k1')}</span>
              <span>{i18n.t('qms.qms_eight_d_detail_page.d4_19')}</span>
            </li>
          )}
          {report.closedAt && (
            <li className='flex gap-3'>
              <span className='text-gray-500'>
                [{new Date(report.closedAt).toLocaleString('zh-CN')}]
              </span>
              <span>{i18n.t('qms:qms_eight_d_detail_page.8d_0')}</span>
            </li>
          )}
        </ul>
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