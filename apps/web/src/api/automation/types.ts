// 自动化平台核心类型定义
// 对应 src/api/automation/ 下 5 个 API 文件：rules / runs / designer / variables / dashboard
//
// 自动化 = 编排层：什么事件（trigger）触发什么动作（action），把结果写到哪里。
// 它把 workflow（流程运行时）+ integration（数据桥接）+ lowcode（UI/表单）三大能力
// 串联成统一的「自动化」视图。

// ============================================================================
// 通用分页与查询参数
// ============================================================================

export interface AutomationPaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  /** 按状态过滤 */
  status?: string;
  /** 按触发类型过滤（rules 用） */
  trigger_type?: AutomationTriggerType;
  /** 按规则 ID 过滤（runs 用） */
  rule_id?: string;
}

// ============================================================================
// 1. 自动化规则（AutomationRule）
// ============================================================================

export type AutomationTriggerType = 'cron' | 'event' | 'webhook' | 'form_submit' | 'manual';

export type AutomationActionType =
  'workflow' | 'integration' | 'api' | 'lowcode_page' | 'notification';

export type AutomationRuleStatus = 'enabled' | 'disabled' | 'draft';

/** 触发器配置：不同 trigger_type 对应不同 payload 形状 */
interface AutomationTrigger {
  type: AutomationTriggerType;
  /**
   * 触发器载荷：
   * - cron: { expression: '0 8 * * *', timezone: 'Asia/Shanghai' }
   * - event: { event_name: 'order.created', source: 'erp' }
   * - webhook: { path: '/webhook/order', secret: 'xxx' }
   * - form_submit: { form_id: 'xxx', app_id: 'xxx' }
   * - manual: {}
   */
  payload: Record<string, unknown>;
}

/** 动作配置：不同 action_type 对应不同 target */
interface AutomationAction {
  type: AutomationActionType;
  /**
   * 动作目标：
   * - workflow: workflow_definition_id
   * - integration: integration_endpoint_id
   * - api: HTTP URL
   * - lowcode_page: page_id
   * - notification: channel_id
   */
  target: string;
  /** 传入动作的变量映射 */
  variables?: Record<string, unknown>;
  /** 调用超时（毫秒） */
  timeout_ms?: number;
}

/** 成功后的副作用 */
interface AutomationOnSuccess {
  /** 通知接收人/通道列表 */
  notify?: string[];
  /** 是否回写低代码应用的记录 */
  update_lowcode_record?: boolean;
  /** 回写的应用 ID + 记录 ID 表达式 */
  lowcode_app_id?: string;
  lowcode_record_id_expr?: string;
}

/** 失败后的副作用 */
interface AutomationOnError {
  /** 通知接收人/通道列表 */
  notify?: string[];
  /** 重试次数 */
  retry?: number;
  /** 重试间隔（毫秒） */
  retry_interval_ms?: number;
}

export interface AutomationRule {
  id: string;
  name: string;
  /** 规则编码（租户内唯一） */
  code: string;
  description?: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
  onSuccess?: AutomationOnSuccess;
  onError?: AutomationOnError;
  status: AutomationRuleStatus;
  /** 最近一次运行时间 */
  last_run_at?: string;
  /** 累计运行次数 */
  run_count: number;
  /** 累计成功次数 */
  success_count: number;
  /** 累计失败次数 */
  failed_count: number;
  tenant_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAutomationRuleRequest {
  name: string;
  code: string;
  description?: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
  onSuccess?: AutomationOnSuccess;
  onError?: AutomationOnError;
  status?: AutomationRuleStatus;
}

export interface UpdateAutomationRuleRequest {
  name?: string;
  description?: string;
  trigger?: AutomationTrigger;
  action?: AutomationAction;
  onSuccess?: AutomationOnSuccess;
  onError?: AutomationOnError;
  status?: AutomationRuleStatus;
}

// ============================================================================
// 2. 自动化执行历史（AutomationRun）
// ============================================================================

export type AutomationRunStatus =
  'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'timeout';

interface AutomationRunStep {
  /** 步骤序号 */
  step: number;
  /** 步骤名（如 trigger / action / onSuccess） */
  name: string;
  /** 步骤类型 */
  type: 'trigger' | 'action' | 'success_hook' | 'error_hook';
  status: 'success' | 'failed' | 'skipped' | 'running';
  /** 步骤开始时间 */
  started_at: string;
  /** 步骤结束时间 */
  finished_at?: string;
  /** 步骤耗时（毫秒） */
  duration_ms?: number;
  /** 输入参数 */
  input?: Record<string, unknown>;
  /** 输出结果 */
  output?: Record<string, unknown>;
  /** 错误信息 */
  error?: string;
}

export interface AutomationRun {
  id: string;
  /** 关联的规则 ID */
  rule_id: string;
  /** 规则名（冗余字段，方便列表展示） */
  rule_name?: string;
  /** 规则编码 */
  rule_code?: string;
  status: AutomationRunStatus;
  /** 触发方式（manual / cron / event / webhook / form_submit） */
  trigger_type: AutomationTriggerType;
  started_at: string;
  finished_at?: string;
  /** 总耗时（毫秒） */
  duration_ms?: number;
  /** 输入变量 */
  input_variables: Record<string, unknown>;
  /** 输出结果 */
  output?: Record<string, unknown>;
  /** 错误信息（status=failed/timeout 时） */
  error?: string;
  /** 步骤明细（用于执行详情页） */
  steps?: AutomationRunStep[];
  /** 重试次数 */
  retry_count?: number;
  tenant_id?: string;
  created_at: string;
}

export interface AutomationRunListParams extends AutomationPaginationParams {
  rule_id?: string;
  status?: AutomationRunStatus;
  /** 起始时间（ISO 字符串） */
  start_time?: string;
  /** 结束时间（ISO 字符串） */
  end_time?: string;
}

// ============================================================================
// 3. 自动化编排设计器（AutomationDesigner）
// ============================================================================
//
// 设计器把 rule 的 trigger + action + onSuccess/onError 拆成可视化节点画布，
// 供用户拖拽编排。节点引用 rule 的字段，画布是 rule 的可视化表达。

export type AutomationNodeType =
  | 'trigger'
  | 'workflow_action'
  | 'integration_action'
  | 'api_action'
  | 'lowcode_action'
  | 'notification_action'
  | 'condition'
  | 'delay'
  | 'success_hook'
  | 'error_hook';

export interface AutomationDesignerNode {
  id: string;
  /** 节点类型 */
  type: AutomationNodeType;
  /** 节点显示名 */
  name: string;
  /** 节点位置（画布坐标） */
  position: { x: number; y: number };
  /** 节点配置（对应 trigger/action/onSuccess/onError 的载荷） */
  config: Record<string, unknown>;
  /** 下游节点 ID 列表 */
  next_nodes?: string[];
  /** 条件分支（type=condition 时使用） */
  branches?: Array<{
    label: string;
    condition: Record<string, unknown>;
    next_node: string;
  }>;
}

interface AutomationDesignerEdge {
  id: string;
  /** 起点节点 ID */
  source: string;
  /** 终点节点 ID */
  target: string;
  /** 边标签（如条件分支的条件名） */
  label?: string;
}

export interface AutomationDesignerCanvas {
  /** 关联的规则 ID */
  rule_id: string;
  /** 节点列表 */
  nodes: AutomationDesignerNode[];
  /** 边列表 */
  edges: AutomationDesignerEdge[];
  /** 画布缩放比例 */
  zoom?: number;
  /** 画布偏移 */
  offset?: { x: number; y: number };
  /** 最近一次保存时间 */
  updated_at: string;
}

export interface SaveAutomationCanvasRequest {
  nodes: Array<Omit<AutomationDesignerNode, 'id'> & { id?: string }>;
  edges: Array<Omit<AutomationDesignerEdge, 'id'> & { id?: string }>;
  zoom?: number;
  offset?: { x: number; y: number };
}

/** 设计器可选资源：触发器/动作候选 */
interface AutomationTriggerOption {
  type: AutomationTriggerType;
  label: string;
  description: string;
  /** payload schema（用于动态表单生成） */
  payload_schema?: Record<string, unknown>;
}

interface AutomationActionOption {
  type: AutomationActionType;
  label: string;
  description: string;
  /** 可选 target 列表（如所有 workflow_definition / integration_endpoint） */
  targets?: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
}

export interface AutomationDesignerResources {
  triggers: AutomationTriggerOption[];
  actions: AutomationActionOption[];
}

// ============================================================================
// 4. 环境变量 / 密钥（AutomationVariable）
// ============================================================================

export type AutomationVariableScope = 'global' | 'workspace' | 'rule';

export interface AutomationVariable {
  /** 变量名（key，唯一） */
  key: string;
  /** 变量值（is_secret=true 时后端返回 mask） */
  value: string;
  /** 变量范围 */
  scope: AutomationVariableScope;
  /** 是否为密钥（密钥值读取时 mask） */
  is_secret: boolean;
  /** 关联的规则 ID（scope=rule 时必填） */
  rule_id?: string;
  description?: string;
  tenant_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAutomationVariableRequest {
  key: string;
  value: string;
  scope?: AutomationVariableScope;
  is_secret?: boolean;
  rule_id?: string;
  description?: string;
}

export interface UpdateAutomationVariableRequest {
  value?: string;
  is_secret?: boolean;
  description?: string;
}

// ============================================================================
// 5. 仪表盘统计（AutomationDashboardPage 用）
// ============================================================================

export interface AutomationDashboardStats {
  /** 规则总数 */
  total_rules: number;
  /** 启用中的规则数 */
  enabled_rules: number;
  /** 禁用的规则数 */
  disabled_rules: number;
  /** 草稿规则数 */
  draft_rules: number;
  /** 最近 24 小时运行次数 */
  runs_last_24h: number;
  /** 最近 24 小时成功次数 */
  success_last_24h: number;
  /** 最近 24 小时失败次数 */
  failed_last_24h: number;
  /** 最近 24 小时成功率（0-100） */
  success_rate_24h: number;
  /** 平均执行耗时（毫秒） */
  avg_duration_ms: number;
  /** 最近 7 天每日运行统计 */
  daily_stats?: Array<{
    date: string;
    total: number;
    success: number;
    failed: number;
  }>;
  /** 最近 10 条运行记录 */
  recent_runs?: AutomationRun[];
  /** 触发类型分布 */
  trigger_type_distribution?: Array<{
    type: AutomationTriggerType;
    count: number;
  }>;
}

/** 触发一次手动运行 */
interface TriggerRunRequest {
  /** 输入变量 */
  input_variables?: Record<string, unknown>;
}
