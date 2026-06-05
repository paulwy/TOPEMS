import type { AITemplate } from '../types/ai';

export const AI_TEMPLATES: Record<string, AITemplate> = {
  'meeting-minutes': {
    id: 'meeting-minutes',
    name: '会议纪要',
    description: '自动生成专业的会议纪要',
    category: '文档',
    fields: [
      { name: 'title', type: 'text', label: '会议标题', required: true },
      { name: 'time', type: 'text', label: '会议时间', required: true },
      { name: 'location', type: 'text', label: '会议地点', required: false },
      { name: 'attendees', type: 'textarea', label: '参会人员', required: true },
      { name: 'agenda', type: 'textarea', label: '会议议程', required: true },
      { name: 'resolutions', type: 'textarea', label: '会议决议', required: true },
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
`
  },
  'job-description': {
    id: 'job-description',
    name: '岗位描述',
    description: '生成标准化的岗位描述',
    category: 'HR',
    fields: [
      { name: 'position', type: 'text', label: '岗位名称', required: true },
      { name: 'department', type: 'text', label: '所属部门', required: true },
      { name: 'responsibilities', type: 'textarea', label: '主要职责', required: true },
      { name: 'requirements', type: 'textarea', label: '任职要求', required: true },
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
`
  },
  'project-charter': {
    id: 'project-charter',
    name: '项目立项书',
    description: '生成完整的项目立项文档',
    category: '项目管理',
    fields: [
      { name: 'projectName', type: 'text', label: '项目名称', required: true },
      { name: 'objective', type: 'textarea', label: '项目目标', required: true },
      { name: 'scope', type: 'textarea', label: '项目范围', required: true },
      { name: 'timeline', type: 'textarea', label: '时间计划', required: true },
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
`
  },
  'contract-template': {
    id: 'contract-template',
    name: '合同模板',
    description: '生成规范的合同文本',
    category: '法务',
    fields: [
      { name: 'partyA', type: 'text', label: '甲方名称', required: true },
      { name: 'partyB', type: 'text', label: '乙方名称', required: true },
      { name: 'contractType', type: 'text', label: '合同类型', required: true },
      { name: 'effectiveDate', type: 'text', label: '生效日期', required: true },
      { name: 'contractContent', type: 'textarea', label: '合同主要内容', required: true },
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
`
  },
  'recruitment-post': {
    id: 'recruitment-post',
    name: '招聘启事',
    description: '生成专业的招聘公告',
    category: 'HR',
    fields: [
      { name: 'companyName', type: 'text', label: '公司名称', required: true },
      { name: 'position', type: 'text', label: '招聘职位', required: true },
      { name: 'department', type: 'text', label: '所属部门', required: true },
      { name: 'jobRequirements', type: 'textarea', label: '职位要求', required: true },
      { name: 'benefits', type: 'textarea', label: '福利待遇', required: true },
      { name: 'contactInfo', type: 'text', label: '联系方式', required: true },
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
`
  },
  'project-report': {
    id: 'project-report',
    name: '项目周报',
    description: '生成项目进度周报',
    category: '项目管理',
    fields: [
      { name: 'projectName', type: 'text', label: '项目名称', required: true },
      { name: 'reportPeriod', type: 'text', label: '报告周期', required: true },
      { name: 'progressSummary', type: 'textarea', label: '本周工作总结', required: true },
      { name: 'problems', type: 'textarea', label: '存在问题', required: true },
      { name: 'nextPlan', type: 'textarea', label: '下周计划', required: true },
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
`
  },
  'employee-evaluation': {
    id: 'employee-evaluation',
    name: '员工评价',
    description: '生成员工绩效评价建议',
    category: 'HR',
    fields: [
      { name: 'employeeName', type: 'text', label: '员工姓名', required: true },
      { name: 'position', type: 'text', label: '岗位', required: true },
      { name: 'period', type: 'text', label: '评价周期', required: true },
      { name: 'strengths', type: 'textarea', label: '主要优点', required: true },
      { name: 'improvements', type: 'textarea', label: '改进建议', required: true },
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
`
  },
  'business-plan': {
    id: 'business-plan',
    name: '商业计划',
    description: '生成商业计划书',
    category: '业务',
    fields: [
      { name: 'companyName', type: 'text', label: '公司名称', required: true },
      { name: 'businessModel', type: 'textarea', label: '商业模式', required: true },
      { name: 'marketAnalysis', type: 'textarea', label: '市场分析', required: true },
      { name: 'financialPlan', type: 'textarea', label: '财务计划', required: true },
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
`
  },
  'training-plan': {
    id: 'training-plan',
    name: '培训计划',
    description: '生成培训计划文档',
    category: 'HR',
    fields: [
      { name: 'trainingName', type: 'text', label: '培训名称', required: true },
      { name: 'targetAudience', type: 'text', label: '培训对象', required: true },
      { name: 'trainingObjectives', type: 'textarea', label: '培训目标', required: true },
      { name: 'trainingContent', type: 'textarea', label: '培训内容', required: true },
      { name: 'duration', type: 'text', label: '培训时长', required: true },
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
`
  },
};

export const getAITemplatesList = Object.values(AI_TEMPLATES);
