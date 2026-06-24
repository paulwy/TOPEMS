/**
 * 统一中文标签常量
 * 用于替代代码中的硬编码中文字符串
 * 使用方法：import { LABELS, MESSAGES } from "@/constants/labels";
 */

// ========== 通用标签 ==========
export const LABELS = {
  // 操作
  ADD: '添加',
  EDIT: '编辑',
  DELETE: '删除',
  VIEW: '查看',
  CREATE: '创建',
  UPDATE: '更新',
  SAVE: '保存',
  CANCEL: '取消',
  CONFIRM: '确认',
  CLOSE: '关闭',
  SUBMIT: '提交',
  RESET: '重置',
  SEARCH: '搜索',
  QUERY: '查询',
  REFRESH: '刷新',
  EXPORT: '导出',
  IMPORT: '导入',
  UPLOAD: '上传',
  DOWNLOAD: '下载',
  PRINT: '打印',
  BACK: '返回',
  NEXT: '下一步',
  PREVIOUS: '上一步',
  FINISH: '完成',

  // 状态
  STATUS: '状态',
  PENDING: '待处理',
  PROCESSING: '处理中',
  IN_PROGRESS: '进行中',
  COMPLETED: '已完成',
  SUCCESS: '成功',
  FAILED: '失败',
  ERROR: '错误',
  WARNING: '警告',
  CANCELLED: '已取消',
  ACTIVE: '激活',
  INACTIVE: '未激活',
  ENABLED: '已启用',
  DISABLED: '已禁用',
  ALL: '全部',
  ALL_STATUS: '全部状态',

  // 字段
  NAME: '名称',
  TITLE: '标题',
  DESCRIPTION: '描述',
  REMARK: '备注',
  NOTE: '备注',
  TYPE: '类型',
  CATEGORY: '分类',
  CODE: '编码',
  NO: '编号',
  DATE: '日期',
  TIME: '时间',
  DATETIME: '日期时间',
  AMOUNT: '金额',
  QUANTITY: '数量',
  PRICE: '价格',
  TOTAL: '合计',
  REMAINING: '剩余',
  USED: '已用',
  AVAILABLE: '可用',

  // 人员
  CREATE_BY: '创建人',
  UPDATE_BY: '更新人',
  CREATE_TIME: '创建时间',
  UPDATE_TIME: '更新时间',
  CREATE_DATE: '创建日期',
  UPDATE_DATE: '更新日期',
  AUDITOR: '审核人',
  APPROVER: '审批人',
  ASSIGNEE: '负责人',
  MANAGER: '管理员',
  OWNER: '所有者',
  USER: '用户',
  EMPLOYEE: '员工',
  DEPARTMENT: '部门',
  COMPANY: '公司',
  ORGANIZATION: '组织',

  // 操作相关
  OPERATE: '操作',
  ACTION: '操作',
  DETAIL: '详情',
  LIST: '列表',
  FORM: '表单',
  TABLE: '表格',
  CHART: '图表',
  MAP: '地图',

  // 通用提示
  LOADING: '加载中...',
  NO_DATA: '暂无数据',
  PLEASE_SELECT: '请选择',
  PLEASE_INPUT: '请输入',
  PLEASE_UPLOAD: '请上传',
  CONFIRM_DELETE: '确认删除',
  DELETE_CONFIRM: '确定要删除吗？',
  DELETE_SUCCESS: '删除成功',
  DELETE_FAILED: '删除失败',
  SAVE_SUCCESS: '保存成功',
  SAVE_FAILED: '保存失败',
  UPDATE_SUCCESS: '更新成功',
  UPDATE_FAILED: '更新失败',
  CREATE_SUCCESS: '创建成功',
  CREATE_FAILED: '创建失败',
  OPERATE_SUCCESS: '操作成功',
  OPERATE_FAILED: '操作失败',
  REQUEST_FAILED: '请求失败',
  NETWORK_ERROR: '网络错误',
  SYSTEM_ERROR: '系统错误',
  UNKNOWN_ERROR: '未知错误',
} as const;

// ========== 模块标签 ==========
export const MODULE_LABELS = {
  // 通用模块
  DASHBOARD: '仪表盘',
  SETTINGS: '设置',
  PROFILE: '个人中心',
  HELP: '帮助',
  DOCUMENT: '文档',

  // HRM 模块
  HRM: '人力资源',
  EMPLOYEE: '员工管理',
  DEPARTMENT: '部门管理',
  POSITION: '岗位管理',
  ATTENDANCE: '考勤管理',
  LEAVE: '请假管理',
  RECRUITMENT: '招聘管理',
  TRAINING: '培训管理',
  PERFORMANCE: '绩效管理',
  PAYROLL: '薪资管理',

  // CRM 模块
  CRM: '客户管理',
  CUSTOMER: '客户',
  CONTACT: '联系人',
  OPPORTUNITY: '商机',
  CONTRACT: '合同',

  // PM 模块
  PM: '项目管理',
  PROJECT: '项目',
  PM_CONTRACT: '合同',
  RESOURCE: '资源',
  REPORT: '报表',

  // Finance 模块
  FINANCE: '财务管理',
  VOUCHER: '凭证',
  LEDGER: '账簿',
  BUDGET: '预算',
  EXPENSE: '费用',
  INVOICE: '发票',

  // GIS 模块
  GIS: '地理信息',
  MAP: '地图',
  TRACK: '轨迹',
  HEATMAP: '热力图',
  LAYER: '图层',

  // EHS 模块
  EHS: '安全环保',
  PLAN: '应急预案',
  DRILL: '应急演练',
  HAZARD: '危险源',
  ACCIDENT: '事故',
  CHECK: '安全检查',
  INCIDENT: '事件',

  // 其他模块
  LIMS: '实验室',
  MES: '生产制造',
  WMS: '仓储管理',
  SCM: '供应链',
  SRM: '供应商',
  QMS: '质量管理',
  PDM: '产品数据',
  RS: '研发',
  FLOW: '工作流',
} as const;

// ========== 操作消息 ==========
export const MESSAGES = {
  // 成功消息
  SUCCESS: {
    SAVE: '保存成功',
    DELETE: '删除成功',
    UPDATE: '更新成功',
    CREATE: '创建成功',
    SUBMIT: '提交成功',
    APPROVE: '审批通过',
    REJECT: '审批拒绝',
    EXPORT: '导出成功',
    IMPORT: '导入成功',
    UPLOAD: '上传成功',
    DOWNLOAD: '下载成功',
    COPY: '复制成功',
    SEND: '发送成功',
    RECEIVE: '接收成功',
    SYNC: '同步成功',
    REFRESH: '刷新成功',
  },

  // 错误消息
  ERROR: {
    SAVE: '保存失败',
    DELETE: '删除失败',
    UPDATE: '更新失败',
    CREATE: '创建失败',
    SUBMIT: '提交失败',
    APPROVE: '审批失败',
    REJECT: '审批拒绝失败',
    EXPORT: '导出失败',
    IMPORT: '导入失败',
    UPLOAD: '上传失败',
    DOWNLOAD: '下载失败',
    COPY: '复制失败',
    SEND: '发送失败',
    RECEIVE: '接收失败',
    SYNC: '同步失败',
    REFRESH: '刷新失败',
    NETWORK: '网络错误，请检查网络连接',
    SERVER: '服务器错误，请稍后重试',
    UNKNOWN: '未知错误，请联系管理员',
  },

  // 确认消息
  CONFIRM: {
    DELETE: '确定要删除吗？删除后无法恢复。',
    CANCEL: '确定要取消吗？未保存的内容将丢失。',
    SUBMIT: '确定要提交吗？提交后将无法修改。',
    APPROVE: '确定要审批通过吗？',
    REJECT: '确定要审批拒绝吗？',
    RESET: '确定要重置吗？所有修改将丢失。',
    LOGOUT: '确定要退出登录吗？',
  },

  // 提示消息
  TIPS: {
    REQUIRED: '此字段为必填项',
    INVALID_FORMAT: '格式不正确',
    MIN_LENGTH: '长度不能少于 {min} 个字符',
    MAX_LENGTH: '长度不能超过 {max} 个字符',
    SELECT_DATE: '请选择日期',
    SELECT_TIME: '请选择时间',
    SELECT_FILE: '请选择文件',
    DRAG_FILE: '将文件拖到此处，或点击上传',
    LOADING: '加载中，请稍候...',
    NO_DATA: '暂无数据',
    SEARCH_HINT: '输入关键词搜索',
  },
} as const;

// ========== 表单验证消息 ==========
export const VALIDATION_MESSAGES = {
  REQUIRED: '{field}不能为空',
  EMAIL: '请输入有效的邮箱地址',
  PHONE: '请输入有效的手机号码',
  URL: '请输入有效的网址',
  NUMBER: '请输入有效的数字',
  INTEGER: '请输入整数',
  POSITIVE: '请输入正数',
  MIN: '{field}不能小于{min}',
  MAX: '{field}不能大于{max}',
  MIN_LENGTH: '{field}长度不能少于{min}个字符',
  MAX_LENGTH: '{field}长度不能超过{max}个字符',
  PATTERN: '{field}格式不正确',
  EQUAL: '{field}必须与{equal}相同',
  NOT_EQUAL: '{field}不能与{notEqual}相同',
} as const;

// ========== 辅助函数 ==========

/**
 * 获取带参数的验证消息
 */
export function getValidationMessage(
  template: string,
  params: Record<string, string | number>
): string {
  return Object.entries(params).reduce(
    (msg, [key, value]) => msg.replace(`{${key}}`, String(value)),
    template
  );
}

/**
 * 获取字段的中文标签
 */
export function getFieldLabel(field: string): string {
  const labelMap: Record<string, string> = {
    name: LABELS.NAME,
    title: LABELS.TITLE,
    description: LABELS.DESCRIPTION,
    status: LABELS.STATUS,
    type: LABELS.TYPE,
    date: LABELS.DATE,
    time: LABELS.TIME,
    amount: LABELS.AMOUNT,
    // 添加更多字段映射
  };

  return labelMap[field.toLowerCase()] || field;
}
