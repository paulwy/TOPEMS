//! DSH 业务 Copilot 基础框架模块
//!
//! 提供业务 Copilot 的通用框架、上下文管理、意图识别、工具调用等能力。

use std::collections::HashMap;
use std::sync::Arc;

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tracing::info;

// ============================================================================
// 类型定义
// ============================================================================

/// 业务模块类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum BusinessModule {
    /// ERP - 企业资源规划
    ERP,
    /// Finance - 财务
    Finance,
    /// CRM - 客户关系管理
    CRM,
    /// WMS - 仓库管理
    WMS,
    /// HR - 人力资源
    HR,
    /// OA - 办公自动化
    OA,
    /// QMS - 质量管理
    QMS,
    /// SCM - 供应链管理
    SCM,
    /// APS - 高级计划排程
    APS,
    /// EHS - 环境健康安全
    EHS,
    /// BI - 商业智能
    BI,
    /// 通用
    General,
}

impl BusinessModule {
    pub fn as_str(&self) -> &str {
        match self {
            BusinessModule::ERP => "erp",
            BusinessModule::Finance => "finance",
            BusinessModule::CRM => "crm",
            BusinessModule::WMS => "wms",
            BusinessModule::HR => "hr",
            BusinessModule::OA => "oa",
            BusinessModule::QMS => "qms",
            BusinessModule::SCM => "scm",
            BusinessModule::APS => "aps",
            BusinessModule::EHS => "ehs",
            BusinessModule::BI => "bi",
            BusinessModule::General => "general",
        }
    }

    pub fn display_name(&self) -> &str {
        match self {
            BusinessModule::ERP => "企业资源规划",
            BusinessModule::Finance => "财务管理",
            BusinessModule::CRM => "客户关系管理",
            BusinessModule::WMS => "仓库管理",
            BusinessModule::HR => "人力资源",
            BusinessModule::OA => "办公自动化",
            BusinessModule::QMS => "质量管理",
            BusinessModule::SCM => "供应链管理",
            BusinessModule::APS => "高级计划排程",
            BusinessModule::EHS => "环境健康安全",
            BusinessModule::BI => "商业智能",
            BusinessModule::General => "通用助手",
        }
    }
}

/// Copilot 意图类型
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum CopilotIntent {
    /// 查询数据
    Query,
    /// 创建记录
    Create,
    /// 更新记录
    Update,
    /// 删除记录
    Delete,
    /// 数据分析
    Analyze,
    /// 生成报告
    Report,
    /// 流程审批
    Approve,
    /// 任务提醒
    Reminder,
    /// 知识问答
    Knowledge,
    /// 操作指导
    Guidance,
    /// 其他
    Other(String),
}

impl CopilotIntent {
    pub fn as_str(&self) -> &str {
        match self {
            CopilotIntent::Query => "query",
            CopilotIntent::Create => "create",
            CopilotIntent::Update => "update",
            CopilotIntent::Delete => "delete",
            CopilotIntent::Analyze => "analyze",
            CopilotIntent::Report => "report",
            CopilotIntent::Approve => "approve",
            CopilotIntent::Reminder => "reminder",
            CopilotIntent::Knowledge => "knowledge",
            CopilotIntent::Guidance => "guidance",
            CopilotIntent::Other(_) => "other",
        }
    }
}

/// Copilot 上下文
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CopilotContext {
    /// 会话 ID
    pub session_id: String,
    /// 用户 ID
    pub user_id: String,
    /// 租户 ID
    pub tenant_id: String,
    /// 业务模块
    pub module: BusinessModule,
    /// 当前页面/场景
    pub current_page: Option<String>,
    /// 选中的记录
    pub selected_records: Vec<SelectedRecord>,
    /// 对话历史
    pub conversation_history: Vec<ConversationMessage>,
    /// 上下文数据
    pub context_data: HashMap<String, serde_json::Value>,
    /// 创建时间
    pub created_at: String,
    /// 最后更新时间
    pub updated_at: String,
}

/// 选中的记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectedRecord {
    /// 记录类型
    pub record_type: String,
    /// 记录 ID
    pub record_id: String,
    /// 记录名称
    pub record_name: Option<String>,
    /// 记录数据
    pub data: Option<serde_json::Value>,
}

/// 对话消息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationMessage {
    /// 消息 ID
    pub message_id: String,
    /// 角色（user/assistant/system）
    pub role: String,
    /// 消息内容
    pub content: String,
    /// 时间戳
    pub timestamp: String,
    /// 关联的工具调用
    pub tool_calls: Vec<ToolCall>,
}

/// 工具调用
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    /// 调用 ID
    pub call_id: String,
    /// 工具名称
    pub tool_name: String,
    /// 工具参数
    pub parameters: serde_json::Value,
    /// 调用结果
    pub result: Option<serde_json::Value>,
    /// 调用状态
    pub status: ToolCallStatus,
}

/// 工具调用状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ToolCallStatus {
    /// 待执行
    Pending,
    /// 执行中
    Running,
    /// 成功
    Success,
    /// 失败
    Failed,
    /// 已取消
    Cancelled,
}

/// Copilot 请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CopilotRequest {
    /// 会话 ID
    pub session_id: String,
    /// 用户输入
    pub user_input: String,
    /// 业务模块
    pub module: BusinessModule,
    /// 当前页面
    pub current_page: Option<String>,
    /// 选中的记录
    pub selected_records: Vec<SelectedRecord>,
    /// 附加上下文
    pub additional_context: Option<HashMap<String, serde_json::Value>>,
    /// 是否流式响应
    pub stream: bool,
}

/// Copilot 响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CopilotResponse {
    /// 会话 ID
    pub session_id: String,
    /// 回复内容
    pub reply: String,
    /// 识别的意图
    pub intent: CopilotIntent,
    /// 置信度（0-1）
    pub confidence: f64,
    /// 工具调用
    pub tool_calls: Vec<ToolCall>,
    /// 建议的后续操作
    pub suggested_actions: Vec<SuggestedAction>,
    /// 引用的数据
    pub referenced_data: Vec<ReferencedData>,
    /// 是否需要用户确认
    pub needs_confirmation: bool,
    /// 确认提示
    pub confirmation_prompt: Option<String>,
    /// 处理耗时（毫秒）
    pub processing_time_ms: u64,
}

/// 建议的操作
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuggestedAction {
    /// 操作 ID
    pub action_id: String,
    /// 操作类型
    pub action_type: String,
    /// 操作标签
    pub label: String,
    /// 操作描述
    pub description: Option<String>,
    /// 操作参数
    pub parameters: Option<serde_json::Value>,
    /// 优先级
    pub priority: u32,
}

/// 引用的数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReferencedData {
    /// 数据类型
    pub data_type: String,
    /// 数据 ID
    pub data_id: String,
    /// 数据名称
    pub data_name: Option<String>,
    /// 数据摘要
    pub summary: Option<String>,
    /// 数据链接
    pub link: Option<String>,
}

/// Copilot 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CopilotConfig {
    /// 是否启用
    pub enabled: bool,
    /// 默认业务模块
    pub default_module: BusinessModule,
    /// 最大对话历史长度
    pub max_conversation_history: usize,
    /// 最大上下文数据大小
    pub max_context_data_size: usize,
    /// 意图识别置信度阈值
    pub intent_confidence_threshold: f64,
    /// 是否启用工具调用
    pub enable_tool_calls: bool,
    /// 是否启用建议操作
    pub enable_suggestions: bool,
    /// 是否需要确认敏感操作
    pub require_confirmation_for_sensitive: bool,
    /// 敏感操作类型
    pub sensitive_operations: Vec<String>,
    /// 流式响应启用
    pub enable_streaming: bool,
}

impl Default for CopilotConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            default_module: BusinessModule::General,
            max_conversation_history: 50,
            max_context_data_size: 100,
            intent_confidence_threshold: 0.7,
            enable_tool_calls: true,
            enable_suggestions: true,
            require_confirmation_for_sensitive: true,
            sensitive_operations: vec![
                "delete".to_string(),
                "update".to_string(),
                "approve".to_string(),
            ],
            enable_streaming: true,
        }
    }
}

// ============================================================================
// 意图识别器
// ============================================================================

/// 意图识别器
#[derive(Clone)]
pub struct IntentRecognizer {
    /// 意图关键词映射
    intent_keywords: HashMap<CopilotIntent, Vec<String>>,
}

impl IntentRecognizer {
    /// 创建新的意图识别器
    pub fn new() -> Self {
        let mut intent_keywords = HashMap::new();

        intent_keywords.insert(
            CopilotIntent::Query,
            vec![
                "查询".to_string(),
                "查看".to_string(),
                "搜索".to_string(),
                "查找".to_string(),
                "获取".to_string(),
                "显示".to_string(),
                "列表".to_string(),
                "详情".to_string(),
                "多少".to_string(),
                "query".to_string(),
                "search".to_string(),
                "find".to_string(),
                "list".to_string(),
                "show".to_string(),
                "get".to_string(),
            ],
        );

        intent_keywords.insert(
            CopilotIntent::Create,
            vec![
                "创建".to_string(),
                "新增".to_string(),
                "添加".to_string(),
                "录入".to_string(),
                "登记".to_string(),
                "新建".to_string(),
                "create".to_string(),
                "add".to_string(),
                "new".to_string(),
            ],
        );

        intent_keywords.insert(
            CopilotIntent::Update,
            vec![
                "更新".to_string(),
                "修改".to_string(),
                "编辑".to_string(),
                "变更".to_string(),
                "调整".to_string(),
                "设置".to_string(),
                "update".to_string(),
                "edit".to_string(),
                "modify".to_string(),
                "change".to_string(),
            ],
        );

        intent_keywords.insert(
            CopilotIntent::Delete,
            vec![
                "删除".to_string(),
                "移除".to_string(),
                "取消".to_string(),
                "作废".to_string(),
                "清除".to_string(),
                "delete".to_string(),
                "remove".to_string(),
                "cancel".to_string(),
            ],
        );

        intent_keywords.insert(
            CopilotIntent::Analyze,
            vec![
                "分析".to_string(),
                "统计".to_string(),
                "对比".to_string(),
                "趋势".to_string(),
                "占比".to_string(),
                "排名".to_string(),
                "analyze".to_string(),
                "statistics".to_string(),
                "compare".to_string(),
                "trend".to_string(),
            ],
        );

        intent_keywords.insert(
            CopilotIntent::Report,
            vec![
                "报告".to_string(),
                "报表".to_string(),
                "导出".to_string(),
                "生成".to_string(),
                "汇总".to_string(),
                "report".to_string(),
                "export".to_string(),
                "generate".to_string(),
                "summary".to_string(),
            ],
        );

        intent_keywords.insert(
            CopilotIntent::Approve,
            vec![
                "审批".to_string(),
                "审核".to_string(),
                "通过".to_string(),
                "驳回".to_string(),
                "同意".to_string(),
                "拒绝".to_string(),
                "approve".to_string(),
                "review".to_string(),
                "reject".to_string(),
            ],
        );

        intent_keywords.insert(
            CopilotIntent::Reminder,
            vec![
                "提醒".to_string(),
                "通知".to_string(),
                "待办".to_string(),
                "任务".to_string(),
                "日程".to_string(),
                "reminder".to_string(),
                "notify".to_string(),
                "todo".to_string(),
                "task".to_string(),
            ],
        );

        intent_keywords.insert(
            CopilotIntent::Knowledge,
            vec![
                "什么是".to_string(),
                "如何".to_string(),
                "为什么".to_string(),
                "解释".to_string(),
                "说明".to_string(),
                "帮助".to_string(),
                "what".to_string(),
                "how".to_string(),
                "why".to_string(),
                "explain".to_string(),
                "help".to_string(),
            ],
        );

        intent_keywords.insert(
            CopilotIntent::Guidance,
            vec![
                "操作".to_string(),
                "步骤".to_string(),
                "流程".to_string(),
                "指导".to_string(),
                "教程".to_string(),
                "operation".to_string(),
                "steps".to_string(),
                "guide".to_string(),
                "tutorial".to_string(),
            ],
        );

        Self { intent_keywords }
    }

    /// 识别意图
    pub fn recognize(&self, text: &str) -> (CopilotIntent, f64) {
        let text_lower = text.to_lowercase();
        let mut best_intent = CopilotIntent::Other("unknown".to_string());
        let mut best_score: f64 = 0.0;

        for (intent, keywords) in &self.intent_keywords {
            let mut score: f64 = 0.0;
            for keyword in keywords {
                if text_lower.contains(&keyword.to_lowercase()) {
                    score += 1.0;
                }
            }
            if score > best_score {
                best_score = score;
                best_intent = intent.clone();
            }
        }

        // 归一化置信度
        let confidence = if best_score > 0.0 {
            (best_score / 3.0).min(1.0_f64)
        } else {
            0.3
        };

        (best_intent, confidence)
    }
}

impl Default for IntentRecognizer {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// Copilot 会话管理器
// ============================================================================

/// Copilot 会话管理器
#[derive(Clone)]
pub struct CopilotSessionManager {
    /// 配置
    config: CopilotConfig,
    /// 会话存储（session_id -> context）
    sessions: Arc<Mutex<HashMap<String, CopilotContext>>>,
    /// 意图识别器
    intent_recognizer: IntentRecognizer,
    /// LLM Provider（3.2a：真实 API 联调，可选；未配置时降级规则回复）
    llm_provider: Option<Arc<dyn crate::dsh::provider::LlmProvider>>,
}

impl CopilotSessionManager {
    /// 创建新的会话管理器
    pub fn new(config: CopilotConfig) -> Self {
        Self {
            config,
            sessions: Arc::new(Mutex::new(HashMap::new())),
            intent_recognizer: IntentRecognizer::new(),
            llm_provider: None,
        }
    }

    /// 注入 LLM Provider（启用真实 API 联调；未注入时降级规则回复）
    pub fn with_llm_provider(
        mut self,
        provider: Arc<dyn crate::dsh::provider::LlmProvider>,
    ) -> Self {
        self.llm_provider = Some(provider);
        self
    }

    /// 使用默认配置创建
    pub fn with_defaults() -> Self {
        Self::new(CopilotConfig::default())
    }

    /// 获取配置
    pub fn config(&self) -> &CopilotConfig {
        &self.config
    }

    /// 创建新会话
    pub fn create_session(
        &self,
        user_id: &str,
        tenant_id: &str,
        module: BusinessModule,
    ) -> CopilotContext {
        let session_id = format!("copilot_{}", uuid::Uuid::new_v4());
        let now = chrono::Utc::now().to_rfc3339();

        let context = CopilotContext {
            session_id: session_id.clone(),
            user_id: user_id.to_string(),
            tenant_id: tenant_id.to_string(),
            module,
            current_page: None,
            selected_records: Vec::new(),
            conversation_history: Vec::new(),
            context_data: HashMap::new(),
            created_at: now.clone(),
            updated_at: now,
        };

        self.sessions
            .lock()
            .insert(session_id.clone(), context.clone());
        info!(session_id = %session_id, user_id = %user_id, "Copilot session created");

        context
    }

    /// 获取会话
    pub fn get_session(&self, session_id: &str) -> Option<CopilotContext> {
        self.sessions.lock().get(session_id).cloned()
    }

    /// 更新会话
    pub fn update_session(&self, context: CopilotContext) -> Option<CopilotContext> {
        let mut sessions = self.sessions.lock();
        if sessions.contains_key(&context.session_id) {
            let mut updated = context;
            updated.updated_at = chrono::Utc::now().to_rfc3339();
            sessions.insert(updated.session_id.clone(), updated.clone());
            Some(updated)
        } else {
            None
        }
    }

    /// 删除会话
    pub fn delete_session(&self, session_id: &str) -> bool {
        self.sessions.lock().remove(session_id).is_some()
    }

    /// 添加对话消息
    pub fn add_message(
        &self,
        session_id: &str,
        message: ConversationMessage,
    ) -> Result<(), String> {
        let mut sessions = self.sessions.lock();
        let context = sessions
            .get_mut(session_id)
            .ok_or_else(|| format!("会话 {} 不存在", session_id))?;

        context.conversation_history.push(message);

        // 限制历史长度
        if context.conversation_history.len() > self.config.max_conversation_history {
            let excess = context.conversation_history.len() - self.config.max_conversation_history;
            context.conversation_history.drain(0..excess);
        }

        context.updated_at = chrono::Utc::now().to_rfc3339();
        Ok(())
    }

    /// 更新选中记录
    pub fn update_selected_records(
        &self,
        session_id: &str,
        records: Vec<SelectedRecord>,
    ) -> Result<(), String> {
        let mut sessions = self.sessions.lock();
        let context = sessions
            .get_mut(session_id)
            .ok_or_else(|| format!("会话 {} 不存在", session_id))?;

        context.selected_records = records;
        context.updated_at = chrono::Utc::now().to_rfc3339();
        Ok(())
    }

    /// 设置上下文数据
    pub fn set_context_data(
        &self,
        session_id: &str,
        key: &str,
        value: serde_json::Value,
    ) -> Result<(), String> {
        let mut sessions = self.sessions.lock();
        let context = sessions
            .get_mut(session_id)
            .ok_or_else(|| format!("会话 {} 不存在", session_id))?;

        context.context_data.insert(key.to_string(), value);
        context.updated_at = chrono::Utc::now().to_rfc3339();
        Ok(())
    }

    /// 处理 Copilot 请求
    pub async fn process_request(
        &self,
        request: CopilotRequest,
    ) -> Result<CopilotResponse, String> {
        if !self.config.enabled {
            return Err("Copilot 未启用".to_string());
        }

        let start_time = std::time::Instant::now();

        // 获取或创建会话
        let mut context = match self.get_session(&request.session_id) {
            Some(ctx) => ctx,
            None => {
                // 自动创建会话
                self.create_session("unknown", "unknown", request.module)
            }
        };

        // 更新上下文
        if let Some(page) = &request.current_page {
            context.current_page = Some(page.clone());
        }
        if !request.selected_records.is_empty() {
            context.selected_records = request.selected_records.clone();
        }
        if let Some(additional) = &request.additional_context {
            for (k, v) in additional {
                context.context_data.insert(k.clone(), v.clone());
            }
        }

        // 识别意图
        let (intent, confidence) = self.intent_recognizer.recognize(&request.user_input);

        // 添加用户消息
        let user_message = ConversationMessage {
            message_id: format!("msg_{}", uuid::Uuid::new_v4()),
            role: "user".to_string(),
            content: request.user_input.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            tool_calls: Vec::new(),
        };
        self.add_message(&request.session_id, user_message)?;

        // 生成回复（3.2a：优先调用真实 LLM API，失败/未配置时降级规则模板）
        let reply = match self
            .generate_reply_with_llm(&request.user_input, &intent, &context)
            .await
        {
            Some(llm_reply) => llm_reply,
            None => self.generate_reply(&request.user_input, &intent, &context),
        };

        // 生成建议操作
        let suggested_actions = if self.config.enable_suggestions {
            self.generate_suggestions(&intent, &context)
        } else {
            Vec::new()
        };

        // 检查是否需要确认
        let (needs_confirmation, confirmation_prompt) = self.check_confirmation(&intent);

        let processing_time_ms = start_time.elapsed().as_millis() as u64;

        let response = CopilotResponse {
            session_id: request.session_id.clone(),
            reply,
            intent,
            confidence,
            tool_calls: Vec::new(),
            suggested_actions,
            referenced_data: Vec::new(),
            needs_confirmation,
            confirmation_prompt,
            processing_time_ms,
        };

        // 添加助手消息
        let assistant_message = ConversationMessage {
            message_id: format!("msg_{}", uuid::Uuid::new_v4()),
            role: "assistant".to_string(),
            content: response.reply.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            tool_calls: response.tool_calls.clone(),
        };
        self.add_message(&request.session_id, assistant_message)?;

        Ok(response)
    }

    /// 生成回复（简化版）
    /// 通过 LLM Provider 生成回复（3.2a 真实 API 联调）
    ///
    /// - 未注入 Provider → 返回 None（调用方降级规则模板）
    /// - Provider 调用失败 → 记录并返回 None
    /// - 成功 → 返回模型生成的回复文本
    async fn generate_reply_with_llm(
        &self,
        input: &str,
        intent: &CopilotIntent,
        context: &CopilotContext,
    ) -> Option<String> {
        let provider = self.llm_provider.as_ref()?;

        let system_prompt = format!(
            "你是 TOPEMS {} 模块的业务 Copilot 助手。\n\
             用户请求的意图：{}\n\
             请用简洁、专业的中文回答用户。如涉及数据查询，说明将进行的操作；\
             如涉及创建/更新/删除，列出将要执行的字段与值并请求确认。",
            context.module.display_name(),
            intent.as_str(),
        );

        let request =
            crate::dsh::provider::LlmRequest::with_system(system_prompt, input.to_string());

        match provider.ask(request).await {
            Ok(resp) => Some(resp.content),
            Err(e) => {
                tracing::warn!(
                    "Copilot LLM reply failed ({}), falling back to rule template",
                    e
                );
                None
            }
        }
    }

    fn generate_reply(
        &self,
        input: &str,
        intent: &CopilotIntent,
        context: &CopilotContext,
    ) -> String {
        match intent {
            CopilotIntent::Query => {
                format!(
                    "好的，我来帮您查询相关信息。您询问的是：「{}」\n\n正在为您检索{}模块的数据...",
                    input,
                    context.module.display_name()
                )
            }
            CopilotIntent::Create => {
                format!("好的，我来帮您创建新记录。请确认以下信息：\n\n您的需求是：「{}」\n\n我将在{}模块中创建相应记录。", input, context.module.display_name())
            }
            CopilotIntent::Update => {
                format!(
                    "好的，我来帮您更新记录。您希望更新的内容是：「{}」\n\n请确认要更新哪些字段。",
                    input
                )
            }
            CopilotIntent::Delete => {
                format!(
                    "您确定要删除记录吗？删除操作不可恢复。\n\n您的请求是：「{}」",
                    input
                )
            }
            CopilotIntent::Analyze => {
                format!(
                    "好的，我来帮您分析数据。您希望分析的是：「{}」\n\n正在为您生成分析报告...",
                    input
                )
            }
            CopilotIntent::Report => {
                format!("好的，我来帮您生成报告。您需要的报告内容是：「{}」\n\n正在为您整理数据并生成报表...", input)
            }
            CopilotIntent::Approve => {
                format!(
                    "好的，我来帮您处理审批。您的审批请求是：「{}」\n\n请确认审批意见。",
                    input
                )
            }
            CopilotIntent::Knowledge => {
                format!("关于您的问题「{}」，我来为您解答：\n\n根据系统知识库，这是一个关于{}的常见问题。建议您查看相关文档或联系管理员获取更详细的信息。", input, context.module.display_name())
            }
            CopilotIntent::Guidance => {
                format!("好的，我来为您提供操作指导。您需要了解的操作是：「{}」\n\n操作步骤：\n1. 进入相应功能页面\n2. 找到对应操作按钮\n3. 按照提示完成操作\n\n如有疑问，请随时告诉我。", input)
            }
            _ => {
                format!("您好！我是{}助手，我可以帮您：\n\n- 查询和分析数据\n- 创建、编辑、删除记录\n- 生成报表和报告\n- 处理审批流程\n- 解答业务问题\n\n请告诉我您需要什么帮助？", context.module.display_name())
            }
        }
    }

    /// 生成建议操作
    fn generate_suggestions(
        &self,
        intent: &CopilotIntent,
        _context: &CopilotContext,
    ) -> Vec<SuggestedAction> {
        let mut actions = Vec::new();

        match intent {
            CopilotIntent::Query => {
                actions.push(SuggestedAction {
                    action_id: "view_list".to_string(),
                    action_type: "navigate".to_string(),
                    label: "查看完整列表".to_string(),
                    description: Some("跳转到列表页面查看所有数据".to_string()),
                    parameters: None,
                    priority: 1,
                });
                actions.push(SuggestedAction {
                    action_id: "export_data".to_string(),
                    action_type: "export".to_string(),
                    label: "导出数据".to_string(),
                    description: Some("将查询结果导出为 Excel".to_string()),
                    parameters: None,
                    priority: 2,
                });
            }
            CopilotIntent::Create => {
                actions.push(SuggestedAction {
                    action_id: "open_form".to_string(),
                    action_type: "navigate".to_string(),
                    label: "打开创建表单".to_string(),
                    description: Some("跳转到新建记录页面".to_string()),
                    parameters: None,
                    priority: 1,
                });
            }
            CopilotIntent::Analyze | CopilotIntent::Report => {
                actions.push(SuggestedAction {
                    action_id: "view_chart".to_string(),
                    action_type: "navigate".to_string(),
                    label: "查看图表".to_string(),
                    description: Some("查看可视化分析图表".to_string()),
                    parameters: None,
                    priority: 1,
                });
                actions.push(SuggestedAction {
                    action_id: "export_report".to_string(),
                    action_type: "export".to_string(),
                    label: "导出报告".to_string(),
                    description: Some("导出分析报告为 PDF".to_string()),
                    parameters: None,
                    priority: 2,
                });
            }
            _ => {}
        }

        // 通用建议
        actions.push(SuggestedAction {
            action_id: "clear_context".to_string(),
            action_type: "action".to_string(),
            label: "开始新对话".to_string(),
            description: Some("清除当前上下文，开始新的对话".to_string()),
            parameters: None,
            priority: 10,
        });

        actions
    }

    /// 检查是否需要确认
    fn check_confirmation(&self, intent: &CopilotIntent) -> (bool, Option<String>) {
        if !self.config.require_confirmation_for_sensitive {
            return (false, None);
        }

        match intent {
            CopilotIntent::Delete => (true, Some("删除操作不可恢复，您确定要继续吗？".to_string())),
            CopilotIntent::Update => (
                true,
                Some("修改操作会覆盖原有数据，您确定要继续吗？".to_string()),
            ),
            CopilotIntent::Approve => (
                true,
                Some("审批操作具有法律效力，您确认审批意见吗？".to_string()),
            ),
            _ => (false, None),
        }
    }

    /// 获取活跃会话数
    pub fn active_session_count(&self) -> usize {
        self.sessions.lock().len()
    }

    /// 清理过期会话
    pub fn cleanup_expired_sessions(&self, max_age_hours: u64) -> usize {
        let mut sessions = self.sessions.lock();
        let now = chrono::Utc::now();
        let before = sessions.len();

        sessions.retain(|_, context| {
            if let Ok(updated) = chrono::DateTime::parse_from_rfc3339(&context.updated_at) {
                let age = now.signed_duration_since(updated).num_hours();
                age < max_age_hours as i64
            } else {
                true
            }
        });

        let cleaned = before - sessions.len();
        if cleaned > 0 {
            info!(cleaned = cleaned, "Expired copilot sessions cleaned");
        }
        cleaned
    }
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_business_module_as_str() {
        assert_eq!(BusinessModule::ERP.as_str(), "erp");
        assert_eq!(BusinessModule::Finance.as_str(), "finance");
        assert_eq!(BusinessModule::CRM.as_str(), "crm");
        assert_eq!(BusinessModule::WMS.as_str(), "wms");
    }

    #[test]
    fn test_business_module_display_name() {
        assert_eq!(BusinessModule::ERP.display_name(), "企业资源规划");
        assert_eq!(BusinessModule::Finance.display_name(), "财务管理");
    }

    #[test]
    fn test_copilot_intent_as_str() {
        assert_eq!(CopilotIntent::Query.as_str(), "query");
        assert_eq!(CopilotIntent::Create.as_str(), "create");
        assert_eq!(CopilotIntent::Delete.as_str(), "delete");
    }

    #[test]
    fn test_copilot_config_default() {
        let config = CopilotConfig::default();
        assert!(config.enabled);
        assert_eq!(config.default_module, BusinessModule::General);
        assert_eq!(config.max_conversation_history, 50);
        assert!(config.enable_tool_calls);
    }

    #[test]
    fn test_intent_recognizer_new() {
        let recognizer = IntentRecognizer::new();
        let (intent, confidence) = recognizer.recognize("查询今天的销售数据");
        assert_eq!(intent, CopilotIntent::Query);
        assert!(confidence > 0.0);
    }

    #[test]
    fn test_intent_recognizer_create() {
        let recognizer = IntentRecognizer::new();
        let (intent, _) = recognizer.recognize("帮我创建一个新客户");
        assert_eq!(intent, CopilotIntent::Create);
    }

    #[test]
    fn test_intent_recognizer_delete() {
        let recognizer = IntentRecognizer::new();
        let (intent, _) = recognizer.recognize("删除这条记录");
        assert_eq!(intent, CopilotIntent::Delete);
    }

    #[test]
    fn test_intent_recognizer_analyze() {
        let recognizer = IntentRecognizer::new();
        let (intent, _) = recognizer.recognize("分析本月的销售趋势");
        assert_eq!(intent, CopilotIntent::Analyze);
    }

    #[test]
    fn test_intent_recognizer_unknown() {
        let recognizer = IntentRecognizer::new();
        let (_intent, confidence) = recognizer.recognize("今天天气怎么样");
        assert!(confidence < 0.5);
    }

    #[test]
    fn test_session_manager_create() {
        let manager = CopilotSessionManager::with_defaults();
        let context = manager.create_session("user1", "tenant1", BusinessModule::ERP);

        assert!(!context.session_id.is_empty());
        assert_eq!(context.user_id, "user1");
        assert_eq!(context.tenant_id, "tenant1");
        assert_eq!(context.module, BusinessModule::ERP);
    }

    #[test]
    fn test_session_manager_get() {
        let manager = CopilotSessionManager::with_defaults();
        let context = manager.create_session("user1", "tenant1", BusinessModule::ERP);

        let retrieved = manager.get_session(&context.session_id);
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().user_id, "user1");
    }

    #[test]
    fn test_session_manager_get_not_found() {
        let manager = CopilotSessionManager::with_defaults();
        let retrieved = manager.get_session("nonexistent");
        assert!(retrieved.is_none());
    }

    #[test]
    fn test_session_manager_update() {
        let manager = CopilotSessionManager::with_defaults();
        let mut context = manager.create_session("user1", "tenant1", BusinessModule::ERP);
        context.current_page = Some("/dashboard".to_string());

        let updated = manager.update_session(context.clone());
        assert!(updated.is_some());
        assert_eq!(
            updated.unwrap().current_page,
            Some("/dashboard".to_string())
        );
    }

    #[test]
    fn test_session_manager_delete() {
        let manager = CopilotSessionManager::with_defaults();
        let context = manager.create_session("user1", "tenant1", BusinessModule::ERP);

        assert!(manager.delete_session(&context.session_id));
        assert!(manager.get_session(&context.session_id).is_none());
    }

    #[test]
    fn test_session_manager_add_message() {
        let manager = CopilotSessionManager::with_defaults();
        let context = manager.create_session("user1", "tenant1", BusinessModule::ERP);

        let message = ConversationMessage {
            message_id: "msg1".to_string(),
            role: "user".to_string(),
            content: "你好".to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            tool_calls: Vec::new(),
        };

        assert!(manager.add_message(&context.session_id, message).is_ok());

        let updated = manager.get_session(&context.session_id).unwrap();
        assert_eq!(updated.conversation_history.len(), 1);
    }

    #[test]
    fn test_session_manager_update_selected_records() {
        let manager = CopilotSessionManager::with_defaults();
        let context = manager.create_session("user1", "tenant1", BusinessModule::ERP);

        let records = vec![SelectedRecord {
            record_type: "order".to_string(),
            record_id: "123".to_string(),
            record_name: Some("订单001".to_string()),
            data: None,
        }];

        assert!(manager
            .update_selected_records(&context.session_id, records)
            .is_ok());

        let updated = manager.get_session(&context.session_id).unwrap();
        assert_eq!(updated.selected_records.len(), 1);
    }

    #[test]
    fn test_session_manager_set_context_data() {
        let manager = CopilotSessionManager::with_defaults();
        let context = manager.create_session("user1", "tenant1", BusinessModule::ERP);

        assert!(manager
            .set_context_data(
                &context.session_id,
                "department",
                serde_json::json!("sales")
            )
            .is_ok());

        let updated = manager.get_session(&context.session_id).unwrap();
        assert_eq!(updated.context_data.get("department").unwrap(), "sales");
    }

    #[tokio::test]
    async fn test_session_manager_process_request() {
        let manager = CopilotSessionManager::with_defaults();
        let context = manager.create_session("user1", "tenant1", BusinessModule::Finance);

        let request = CopilotRequest {
            session_id: context.session_id.clone(),
            user_input: "查询本月的财务数据".to_string(),
            module: BusinessModule::Finance,
            current_page: Some("/finance/reports".to_string()),
            selected_records: Vec::new(),
            additional_context: None,
            stream: false,
        };

        let response = manager.process_request(request).await.unwrap();
        assert_eq!(response.session_id, context.session_id);
        assert!(!response.reply.is_empty());
        assert_eq!(response.intent, CopilotIntent::Query);
        assert!(response.confidence > 0.0);
    }

    #[tokio::test]
    async fn test_session_manager_process_delete_needs_confirmation() {
        let manager = CopilotSessionManager::with_defaults();
        let context = manager.create_session("user1", "tenant1", BusinessModule::ERP);

        let request = CopilotRequest {
            session_id: context.session_id.clone(),
            user_input: "删除这个订单".to_string(),
            module: BusinessModule::ERP,
            current_page: None,
            selected_records: Vec::new(),
            additional_context: None,
            stream: false,
        };

        let response = manager.process_request(request).await.unwrap();
        assert!(response.needs_confirmation);
        assert!(response.confirmation_prompt.is_some());
    }

    #[test]
    fn test_session_manager_active_count() {
        let manager = CopilotSessionManager::with_defaults();
        assert_eq!(manager.active_session_count(), 0);

        manager.create_session("user1", "tenant1", BusinessModule::ERP);
        manager.create_session("user2", "tenant1", BusinessModule::Finance);

        assert_eq!(manager.active_session_count(), 2);
    }

    #[test]
    fn test_generate_trace_id() {
        let trace_id = super::super::standardization::generate_trace_id();
        assert!(trace_id.starts_with("trace_"));
    }

    #[test]
    fn test_tool_call_status() {
        assert_eq!(ToolCallStatus::Pending as u8, 0);
        assert_eq!(ToolCallStatus::Success as u8, 2);
    }

    #[test]
    fn test_suggested_action_structure() {
        let action = SuggestedAction {
            action_id: "test".to_string(),
            action_type: "navigate".to_string(),
            label: "测试".to_string(),
            description: None,
            parameters: None,
            priority: 1,
        };

        assert_eq!(action.action_id, "test");
        assert_eq!(action.priority, 1);
    }
}
