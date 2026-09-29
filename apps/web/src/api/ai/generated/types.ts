/**
 * AI 业务智能模块 - 自动生成的 TypeScript 类型
 *
 * 此文件由 scripts/generate-ai-api.sh 自动生成
 * 请勿手动修改
 */

/** 业务模块类型 */
export type BusinessModuleType = 'erp' | 'finance' | 'crm' | 'wms' | 'hr' | 'oa' | 'general';

/** Copilot 意图类型 */
export type CopilotIntentType =
  | 'query'
  | 'create'
  | 'update'
  | 'delete'
  | 'analyze'
  | 'report'
  | 'approve'
  | 'reminder'
  | 'knowledge'
  | 'guidance'
  | 'other';

/** 工具调用状态 */
export type ToolCallStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

/** 表单字段类型 */
export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'integer'
  | 'decimal'
  | 'date'
  | 'time'
  | 'datetime'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'image'
  | 'email'
  | 'phone'
  | 'url'
  | 'password'
  | 'color'
  | 'range'
  | 'richtext'
  | 'tags'
  | 'reference'
  | 'subform'
  | 'calculated'
  | 'signature'
  | 'other';

/** 文档类型 */
export type DocumentType =
  | 'pdf'
  | 'word'
  | 'excel'
  | 'powerpoint'
  | 'text'
  | 'markdown'
  | 'html'
  | 'json'
  | 'csv'
  | 'image'
  | 'other';

/** 文档处理状态 */
export type DocumentProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** 摘要类型 */
export type SummaryType = 'brief' | 'standard' | 'detailed' | 'section';

/** 时间范围 */
export type TimeRange = '1h' | '24h' | '7d' | '30d' | 'custom';

/** 治理等级 */
export type GovernanceLevel = 'excellent' | 'good' | 'fair' | 'needs_improvement' | 'poor';

/** 风险等级 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** 性能等级 */
export type PerformanceLevel = 'excellent' | 'good' | 'fair' | 'poor';

/** 建议优先级 */
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';

/** 合规框架状态 */
export type ComplianceFrameworkStatus =
  'compliant' | 'partially_compliant' | 'non_compliant' | 'under_assessment';

/** ErrorResponse */
export interface ErrorResponse {
  /** 错误码 */
  code: number;
  /** 错误信息 */
  message: string;
  details?: Record<string, unknown>;
}

/** CreateSessionRequest */
export interface CreateSessionRequest {
  module: BusinessModuleType;
  user_id?: string;
  tenant_id?: string;
}

/** SelectedRecord */
export interface SelectedRecord {
  record_type: string;
  record_id: string;
  record_name?: string;
  data?: Record<string, unknown>;
}

/** ConversationMessage */
export interface ConversationMessage {
  message_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  tool_calls?: ToolCall[];
}

/** ToolCall */
export interface ToolCall {
  call_id: string;
  tool_name: string;
  parameters: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: ToolCallStatus;
}

/** SuggestedAction */
export interface SuggestedAction {
  action_id: string;
  action_type: string;
  label: string;
  description?: string;
  parameters?: Record<string, unknown>;
  priority: number;
}

/** ReferencedData */
export interface ReferencedData {
  data_type: string;
  data_id: string;
  data_name?: string;
  summary?: string;
  link?: string;
}

/** CopilotSession */
export interface CopilotSession {
  session_id: string;
  user_id?: string;
  tenant_id?: string;
  module: BusinessModuleType;
  current_page?: string;
  selected_records?: SelectedRecord[];
  conversation_history: ConversationMessage[];
  context_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** CopilotRequest */
export interface CopilotRequest {
  session_id?: string;
  user_input: string;
  module: BusinessModuleType;
  current_page?: string;
  selected_records?: SelectedRecord[];
  additional_context?: Record<string, unknown>;
  stream?: boolean;
}

/** CopilotResponse */
export interface CopilotResponse {
  session_id: string;
  reply: string;
  intent: CopilotIntentType;
  confidence: number;
  tool_calls: ToolCall[];
  suggested_actions: SuggestedAction[];
  referenced_data: ReferencedData[];
  needs_confirmation: boolean;
  confirmation_prompt?: string;
  processing_time_ms: number;
}

/** IntentRecognitionResult */
export interface IntentRecognitionResult {
  intent: CopilotIntentType;
  confidence: number;
}

/** ToolParameter */
export interface ToolParameter {
  name: string;
  param_type: string;
  description: string;
  required: boolean;
  default_value?: Record<string, unknown>;
  enum_values?: string[];
}

/** BusinessToolDefinition */
export interface BusinessToolDefinition {
  tool_id: string;
  name: string;
  description: string;
  category: string;
  parameters: ToolParameter[];
  requires_confirmation: boolean;
  use_cases: string[];
}

/** FAQItem */
export interface FAQItem {
  question: string;
  answer: string;
  keywords: string[];
  category: string;
}

/** QuickActionItem */
export interface QuickActionItem {
  action_id: string;
  label: string;
  description: string;
  icon: string;
  intent: CopilotIntentType;
  preset_prompt: string;
}

/** BusinessModuleConfig */
export interface BusinessModuleConfig {
  module: BusinessModuleType;
  name: string;
  description: string;
  system_prompt: string;
  welcome_message: string;
  supported_intents: CopilotIntentType[];
  available_tools: BusinessToolDefinition[];
  faqs: FAQItem[];
  quick_actions: QuickActionItem[];
}

/** FormFieldDefinition */
export interface FormFieldDefinition {
  field_id: string;
  name: string;
  label: string;
  field_type: FormFieldType;
  description?: string;
  placeholder?: string;
  default_value?: Record<string, unknown>;
  required?: boolean;
  read_only?: boolean;
  hidden?: boolean;
  options?: object[];
  group?: string;
  order?: number;
  validation?: Record<string, unknown>;
}

/** FormDefinition */
export interface FormDefinition {
  form_id: string;
  name: string;
  description?: string;
  category?: string;
  fields: FormFieldDefinition[];
  version?: string;
  enabled?: boolean;
}

/** FormData */
export interface FormData {
  form_id: string;
  record_id?: string;
  values: Record<string, unknown>;
  status:
    'draft' | 'in_progress' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'archived';
  created_at: string;
  updated_at: string;
}

/** FieldError */
export interface FieldError {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

/** FormValidationResult */
export interface FormValidationResult {
  is_valid: boolean;
  field_errors: Record<string, unknown>;
  form_errors: object[];
  warnings: object[];
  validated_at: string;
}

/** DocumentInfo */
export interface DocumentInfo {
  document_id: string;
  name: string;
  document_type: DocumentType;
  /** 文件大小（字节） */
  file_size: number;
  content?: string;
  metadata?: Record<string, unknown>;
  uploaded_at: string;
  processing_status: DocumentProcessingStatus;
}

/** DocumentSummary */
export interface DocumentSummary {
  document_id: string;
  summary_type: SummaryType;
  content: string;
  length: number;
  key_sentences: string[];
  keywords: object[];
  generated_at: string;
}

/** DocumentParseResult */
export interface DocumentParseResult {
  document_id: string;
  success: boolean;
  text?: string;
  tables?: object[];
  images?: object[];
  structure?: Record<string, unknown>;
  error?: string;
  parsed_at: string;
}

/** DocumentGenerationRequest */
export interface DocumentGenerationRequest {
  document_type: DocumentType;
  title: string;
  template?: string;
  content: Record<string, unknown>;
  style?: Record<string, unknown>;
}

/** KeyMetrics */
export interface KeyMetrics {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  success_rate: number;
  total_tokens: number;
  average_response_ms: number;
  p95_response_ms: number;
  active_users: number;
  active_agents: number;
  total_tool_calls: number;
  cache_hit_rate: number;
}

/** RiskDimension */
export interface RiskDimension {
  level: RiskLevel;
  score: number;
  description: string;
  factors: string[];
}

/** RiskItem */
export interface RiskItem {
  risk_id: string;
  category: string;
  description: string;
  level: RiskLevel;
  impact: string;
  recommendation: string;
  detected_at: string;
}

/** RiskAssessment */
export interface RiskAssessment {
  overall_risk_level: RiskLevel;
  risk_score: number;
  security_risk: RiskDimension;
  compliance_risk: RiskDimension;
  cost_risk: RiskDimension;
  performance_risk: RiskDimension;
  data_risk: RiskDimension;
  high_risk_items: RiskItem[];
}

/** ComplianceFramework */
export interface ComplianceFramework {
  name: string;
  description: string;
  compliance_rate: number;
  status: ComplianceFrameworkStatus;
}

/** NonCompliantItem */
export interface NonCompliantItem {
  item_id: string;
  framework: string;
  control: string;
  description: string;
  severity: RiskLevel;
  remediation: string;
  due_date?: string;
  status: string;
}

/** ComplianceStatus */
export interface ComplianceStatus {
  overall_compliance_rate: number;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  pending_checks: number;
  frameworks: ComplianceFramework[];
  non_compliant_items: NonCompliantItem[];
}

/** BudgetUsage */
export interface BudgetUsage {
  total_budget: number;
  used_amount: number;
  usage_percent: number;
  budget_period: string;
  is_over_budget: boolean;
  projected_overage: number;
}

/** CostResource */
export interface CostResource {
  resource_id: string;
  name: string;
  resource_type: string;
  cost: number;
  call_count: number;
  cost_percent: number;
}

/** CostAnalysis */
export interface CostAnalysis {
  total_cost: number;
  currency: string;
  llm_cost: number;
  tool_cost: number;
  storage_cost: number;
  network_cost: number;
  other_cost: number;
  average_cost_per_request: number;
  cost_trend_percent: number;
  budget_usage: BudgetUsage;
  top_cost_resources: CostResource[];
}

/** PerformanceMetrics */
export interface PerformanceMetrics {
  average_response_ms: number;
  p50_response_ms: number;
  p90_response_ms: number;
  p95_response_ms: number;
  p99_response_ms: number;
  throughput: number;
  concurrency: number;
  error_rate: number;
  timeout_rate: number;
  retry_rate: number;
  performance_level: PerformanceLevel;
}

/** SecurityEventSummary */
export interface SecurityEventSummary {
  event_id: string;
  event_type: string;
  severity: RiskLevel;
  description: string;
  occurred_at: string;
  affected_resource: string;
  status: string;
}

/** AuditSummary */
export interface AuditSummary {
  total_audit_logs: number;
  by_operation: Record<string, unknown>;
  by_user_top10: string[][];
  by_resource_type: Record<string, unknown>;
  anomalous_operations: number;
  unauthorized_attempts: number;
}

/** TrendDataPoint */
export interface TrendDataPoint {
  timestamp: string;
  requests: number;
  errors: number;
  avg_response_ms: number;
  tokens: number;
  cost: number;
}

/** Recommendation */
export interface Recommendation {
  recommendation_id: string;
  category: string;
  priority: RecommendationPriority;
  title: string;
  description: string;
  expected_benefit: string;
  implementation_effort: string;
  related_metrics: string[];
}

/** GovernanceDashboardData */
export interface GovernanceDashboardData {
  generated_at: string;
  time_range: TimeRange;
  overall_score: number;
  governance_level: GovernanceLevel;
  key_metrics: KeyMetrics;
  risk_assessment: RiskAssessment;
  compliance_status: ComplianceStatus;
  cost_analysis: CostAnalysis;
  performance_metrics: PerformanceMetrics;
  security_events: SecurityEventSummary[];
  audit_summary: AuditSummary;
  trends: TrendDataPoint[];
  recommendations: Recommendation[];
}
