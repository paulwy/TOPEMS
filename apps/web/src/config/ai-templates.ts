import type { AITemplate } from '@/types/ai';
import i18n from '@/i18n';

export function getAITemplates(): Record<string, AITemplate> {
  return {
  'meeting-minutes': {
    id: 'meeting-minutes',
    name: i18n.t('shared.ai-templates.k0'),
    description: i18n.t('shared.ai-templates.k1'),
    category: i18n.t('shared.ai-templates.k2'),
    fields: [
      { name: 'title', type: 'text', label: i18n.t('shared.ai-templates.k3'), required: true },
      { name: 'time', type: 'text', label: i18n.t('shared.ai-templates.k4'), required: true },
      { name: 'location', type: 'text', label: i18n.t('shared.ai-templates.k5'), required: false },
      {
        name: 'attendees',
        type: 'textarea',
        label: i18n.t('shared.ai-templates.k6'),
        required: true,
      },
      { name: 'agenda', type: 'textarea', label: i18n.t('shared.ai-templates.k7'), required: true },
      {
        name: 'resolutions',
        type: 'textarea',
        label: i18n.t('shared.ai-templates.k8'),
        required: true,
      },
    ],
    promptTemplate: `你是一位专业的会议记录员，请根据以下信息生成一份专业、清晰的会议纪要：

# 会议基本信息
会议标题：{title}
会议时间：{time}
会议地点：{location}
参会人员：{attendees}

# 会议内容
会议议程：{agenda}
会议决议：{resolutions}

请生成一份结构清晰、内容完整的会议纪要，包括：
1. 会议概况
2. 议题讨论要点
3. 决议事项与责任人
4. 下一步行动与时间节点
`,
  },
  'job-description': {
    id: 'job-description',
    name: i18n.t('shared.ai-templates.k9'),
    description: i18n.t('shared.ai-templates.k10'),
    category: 'HR',
    fields: [
      { name: 'position', type: 'text', label: i18n.t('shared.ai-templates.k11'), required: true },
      {
        name: 'department',
        type: 'text',
        label: i18n.t('shared.ai-templates.k12'),
        required: true,
      },
      {
        name: 'responsibilities',
        type: 'textarea',
        label: i18n.t('shared.ai-templates.k13'),
        required: true,
      },
      {
        name: 'requirements',
        type: 'textarea',
        label: i18n.t('shared.ai-templates.k14'),
        required: true,
      },
    ],
    promptTemplate: `你是一位资深的HR，请根据以下信息生成一份专业的岗位描述：

岗位名称：{position}
所属部门：{department}
主要职责：{responsibilities}
任职要求：{requirements}

请生成一份专业、清晰、规范的岗位描述，包括：
1. 岗位概述
2. 主要职责（分点列出）
3. 任职要求（分点列出）
4. 发展方向
`,
  },
  'project-charter': {
    id: 'project-charter',
    name: i18n.t('shared.ai-templates.k15'),
    description: i18n.t('shared.ai-templates.k16'),
    category: i18n.t('shared.ai-templates.k17'),
    fields: [
      {
        name: 'projectName',
        type: 'text',
        label: i18n.t('shared.ai-templates.k18'),
        required: true,
      },
      {
        name: 'objective',
        type: 'textarea',
        label: i18n.t('shared.ai-templates.k19'),
        required: true,
      },
      { name: 'scope', type: 'textarea', label: i18n.t('shared.ai-templates.k20'), required: true },
      {
        name: 'timeline',
        type: 'textarea',
        label: i18n.t('shared.ai-templates.k21'),
        required: true,
      },
    ],
    promptTemplate: `你是一位资深的项目经理，请根据以下信息生成一份完整的项目立项书：

项目名称：{projectName}
项目目标：{objective}
项目范围：{scope}
时间计划：{timeline}

请生成一份专业的项目立项书，包括：
1. 项目背景
2. 项目目标与成功标准
3. 项目范围与交付物
4. 项目时间计划
5. 项目风险评估
`,
  },
  'contract-template': {
    id: 'contract-template',
    name: i18n.t('shared.ai-templates.k22'),
    description: i18n.t('shared.ai-templates.k23'),
    category: i18n.t('shared.ai-templates.k24'),
    fields: [
      { name: 'partyA', type: 'text', label: i18n.t('shared.ai-templates.k25'), required: true },
      { name: 'partyB', type: 'text', label: i18n.t('shared.ai-templates.k26'), required: true },
      {
        name: 'contractType',
        type: 'text',
        label: i18n.t('shared.ai-templates.k27'),
        required: true,
      },
      {
        name: 'effectiveDate',
        type: 'text',
        label: i18n.t('shared.ai-templates.k28'),
        required: true,
      },
      {
        name: 'contractContent',
        type: 'textarea',
        label: i18n.t('shared.ai-templates.k29'),
        required: true,
      },
    ],
    promptTemplate: `你是一位专业的合同起草专家，请根据以下信息生成一份规范的合同文本：

甲方：{partyA}
乙方：{partyB}
合同类型：{contractType}
生效日期：{effectiveDate}
合同内容：{contractContent}

请生成一份结构完整、条款清晰的合同文本，包括：
1. 合同双方基本信息
2. 合同目的与标的
3. 双方权利与义务
4. 合同期限与终止条款
5. 违约责任
6. 争议解决方式
7. 其他约定事项
`,
  },
  'recruitment-post': {
    id: 'recruitment-post',
    name: i18n.t('shared.ai-templates.k30'),
    description: i18n.t('shared.ai-templates.k31'),
    category: 'HR',
    fields: [
      {
        name: 'companyName',
        type: 'text',
        label: i18n.t('shared.ai-templates.k32'),
        required: true,
      },
      { name: 'position', type: 'text', label: i18n.t('shared.ai-templates.k33'), required: true },
      {
        name: 'department',
        type: 'text',
        label: i18n.t('shared.ai-templates.k34'),
        required: true,
      },
      {
        name: 'jobRequirements',
        type: 'textarea',
        label: i18n.t('shared.ai-templates.k35'),
        required: true,
      },
      {
        name: 'benefits',
        type: 'textarea',
        label: i18n.t('shared.ai-templates.k36'),
        required: true,
      },
      {
        name: 'contactInfo',
        type: 'text',
        label: i18n.t('shared.ai-templates.k37'),
        required: true,
      },
    ],
    promptTemplate: `你是一位专业的招聘专家，请根据以下信息生成一份吸引人的招聘启事：

公司名称：{companyName}
招聘职位：{position}
所属部门：{department}
职位要求：{jobRequirements}
福利待遇：{benefits}
联系方式：{contactInfo}

请生成一份专业、清晰、有吸引力的招聘启事，包括：
1. 公司简介
2. 职位描述与职责
3. 任职要求
4. 福利待遇
5. 应聘方式与联系信息
`,
  },
  'project-report': {
    id: 'project-report',
    name: i18n.t('shared.ai-templates.k38'),
    description: i18n.t('shared.ai-templates.k39'),
    category: i18n.t('shared.ai-templates.k40'),
    fields: [
      {
        name: 'projectName',
        type: 'text',
        label: i18n.t('shared.ai-templates.k41'),
        required: true,
      },
      {
        name: 'reportPeriod',
        type: 'text',
        label: i18n.t('shared.ai-templates.k42'),
        required: true,
      },
      {
        name: 'progressSummary',
        type: 'textarea',
        label: i18n.t('shared.ai-templates.k43'),
        required: true,
      },
      {
        name: 'problems',
        type: 'textarea',
        label: i18n.t('shared.ai-templates.k44'),
        required: true,
      },
      {
        name: 'nextPlan',
        type: 'textarea',
        label: i18n.t('shared.ai-templates.k45'),
        required: true,
      },
    ],
    promptTemplate: `你是一位专业的项目经理，请根据以下信息生成一份清晰完整的项目周报：

项目名称：{projectName}
报告周期：{reportPeriod}
本周工作总结：{progressSummary}
存在问题：{problems}
下周计划：{nextPlan}

请生成一份专业、清晰的项目周报，包括：
1. 本周工作完成情况
2. 当前项目进度
3. 遇到的问题与风险
4. 下周工作安排
5. 需要协调的事项
`,
  },
  'employee-evaluation': {
    id: 'employee-evaluation',
    name: i18n.t('shared.ai-templates.k46'),
    description: i18n.t('shared.ai-templates.k47'),
    category: 'HR',
    fields: [
      {
        name: 'employeeName',
        type: 'text',
        label: i18n.t('shared.ai-templates.k48'),
        required: true,
      },
      { name: 'position', type: 'text', label: i18n.t('shared.ai-templates.k49'), required: true },
      { name: 'period', type: 'text', label: i18n.t('shared.ai-templates.k50'), required: true },
      {
        name: 'strengths',
        type: 'textarea',
        label: i18n.t('shared.ai-templates.k51'),
        required: true,
      },
      {
        name: 'improvements',
        type: 'textarea',
        label: i18n.t('shared.ai-templates.k52'),
        required: true,
      },
    ],
    promptTemplate: `你是一位资深的HR管理者，请根据以下信息生成一份专业的员工绩效评价建议：

员工姓名：{employeeName}
岗位：{position}
评价周期：{period}
主要优点：{strengths}
改进建议：{improvements}

请生成一份客观、专业的员工绩效评价，包括：
1. 工作表现总结
2. 主要优点与贡献
3. 待改进之处
4. 发展建议
5. 下一步行动计划
`,
  },
  'business-plan': {
    id: 'business-plan',
    name: i18n.t('shared.ai-templates.k53'),
    description: i18n.t('shared.ai-templates.k54'),
    category: i18n.t('shared.ai-templates.k55'),
    fields: [
      {
        name: 'companyName',
        type: 'text',
        label: i18n.t('shared.ai-templates.k56'),
        required: true,
      },
      {
        name: 'businessModel',
        type: 'textarea',
        label: i18n.t('shared.ai-templates.k57'),
        required: true,
      },
      {
        name: 'marketAnalysis',
        type: 'textarea',
        label: i18n.t('shared.ai-templates.k58'),
        required: true,
      },
      {
        name: 'financialPlan',
        type: 'textarea',
        label: i18n.t('shared.ai-templates.k59'),
        required: true,
      },
    ],
    promptTemplate: `你是一位专业的商业顾问，请根据以下信息生成一份完整的商业计划书：

公司名称：{companyName}
商业模式：{businessModel}
市场分析：{marketAnalysis}
财务计划：{financialPlan}

请生成一份专业的商业计划书，包括：
1. 执行摘要
2. 公司介绍与愿景
3. 产品与服务
4. 市场分析
5. 商业模式与盈利方式
6. 运营计划
7. 财务规划
`,
  },
  'training-plan': {
    id: 'training-plan',
    name: i18n.t('shared.ai-templates.k60'),
    description: i18n.t('shared.ai-templates.k61'),
    category: 'HR',
    fields: [
      {
        name: 'trainingName',
        type: 'text',
        label: i18n.t('shared.ai-templates.k62'),
        required: true,
      },
      {
        name: 'targetAudience',
        type: 'text',
        label: i18n.t('shared.ai-templates.k63'),
        required: true,
      },
      {
        name: 'trainingObjectives',
        type: 'textarea',
        label: i18n.t('shared.ai-templates.k64'),
        required: true,
      },
      {
        name: 'trainingContent',
        type: 'textarea',
        label: i18n.t('shared.ai-templates.k65'),
        required: true,
      },
      { name: 'duration', type: 'text', label: i18n.t('shared.ai-templates.k66'), required: true },
    ],
    promptTemplate: `你是一位专业的培训师，请根据以下信息生成一份完整的培训计划：

培训名称：{trainingName}
培训对象：{targetAudience}
培训目标：{trainingObjectives}
培训内容：{trainingContent}
培训时长：{duration}

请生成一份专业的培训计划，包括：
1. 培训目标与预期成果
2. 培训对象与需求分析
3. 培训内容与课程安排
4. 培训方式与方法
5. 培训评估与考核
6. 培训资源需求
`,
  },
};
}

export function getAITemplatesList(): AITemplate[] {
  return Object.values(getAITemplates());
}
