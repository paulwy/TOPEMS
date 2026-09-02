//! DSH AI Event → AI 触发器模块
//!
//! 提供业务事件订阅、事件规则引擎、AI 自动响应、事件处理历史记录等能力。

use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use std::time::{Duration, Instant};

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tracing::{debug, info, warn};

// ============================================================================
// 类型定义
// ============================================================================

/// 业务事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusinessEvent {
    /// 事件 ID
    pub event_id: String,
    /// 事件类型
    pub event_type: String,
    /// 事件来源（系统/模块名称）
    pub source: String,
    /// 事件标题
    pub title: String,
    /// 事件描述
    pub description: String,
    /// 事件数据
    pub data: serde_json::Value,
    /// 事件优先级
    pub priority: EventPriority,
    /// 租户 ID
    pub tenant_id: String,
    /// 触发者
    pub triggered_by: String,
    /// 事件时间
    pub event_time: String,
    /// 事件元数据
    pub metadata: HashMap<String, String>,
}

/// 事件优先级
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum EventPriority {
    /// 低优先级
    Low,
    /// 中优先级
    Medium,
    /// 高优先级
    High,
    /// 紧急
    Critical,
}

impl EventPriority {
    pub fn as_str(&self) -> &str {
        match self {
            EventPriority::Low => "low",
            EventPriority::Medium => "medium",
            EventPriority::High => "high",
            EventPriority::Critical => "critical",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "low" => EventPriority::Low,
            "medium" => EventPriority::Medium,
            "high" => EventPriority::High,
            "critical" => EventPriority::Critical,
            _ => EventPriority::Medium,
        }
    }
}

/// 触发器规则
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TriggerRule {
    /// 规则 ID
    pub rule_id: String,
    /// 规则名称
    pub name: String,
    /// 规则描述
    pub description: String,
    /// 事件类型匹配（支持通配符 *）
    pub event_type_pattern: String,
    /// 事件来源匹配（支持通配符 *）
    pub source_pattern: String,
    /// 最小优先级（低于此优先级的事件不触发）
    pub min_priority: EventPriority,
    /// 条件表达式（JSONPath 或简单表达式）
    pub condition_expression: Option<String>,
    /// AI 动作配置
    pub ai_action: AiActionConfig,
    /// 是否启用
    pub enabled: bool,
    /// 优先级（数字越大优先级越高）
    pub priority: u32,
    /// 冷却时间（秒，同一事件类型在冷却时间内只触发一次）
    pub cooldown_seconds: u64,
    /// 最大触发次数（0 表示无限制）
    pub max_trigger_count: u64,
    /// 已触发次数
    pub trigger_count: u64,
    /// 标签
    pub tags: Vec<String>,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
    /// 最后触发时间
    pub last_triggered_at: Option<String>,
}

/// AI 动作配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiActionConfig {
    /// 动作类型
    pub action_type: AiActionType,
    /// Agent ID（调用 Agent 时使用）
    pub agent_id: Option<String>,
    /// 工作流 ID（执行工作流时使用）
    pub workflow_id: Option<String>,
    /// 提示词模板（生成 AI 响应时使用）
    pub prompt_template: Option<String>,
    /// LLM 模型
    pub llm_model: Option<String>,
    /// 通知渠道（发送通知时使用）
    pub notification_channels: Vec<String>,
    /// 通知接收者
    pub notification_recipients: Vec<String>,
    /// 自动执行（是否自动执行动作，否则需要人工确认）
    pub auto_execute: bool,
    /// 动作参数
    pub parameters: HashMap<String, serde_json::Value>,
}

/// AI 动作类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AiActionType {
    /// 调用 Agent
    CallAgent,
    /// 执行工作流
    ExecuteWorkflow,
    /// 生成 AI 响应
    GenerateResponse,
    /// 发送通知
    SendNotification,
    /// 创建任务
    CreateTask,
    /// 记录日志
    LogEvent,
    /// 自定义动作
    Custom,
}

impl AiActionType {
    pub fn as_str(&self) -> &str {
        match self {
            AiActionType::CallAgent => "call_agent",
            AiActionType::ExecuteWorkflow => "execute_workflow",
            AiActionType::GenerateResponse => "generate_response",
            AiActionType::SendNotification => "send_notification",
            AiActionType::CreateTask => "create_task",
            AiActionType::LogEvent => "log_event",
            AiActionType::Custom => "custom",
        }
    }
}

/// 事件处理记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventProcessingRecord {
    /// 记录 ID
    pub record_id: String,
    /// 事件 ID
    pub event_id: String,
    /// 事件类型
    pub event_type: String,
    /// 匹配的规则 ID
    pub matched_rule_id: Option<String>,
    /// 匹配的规则名称
    pub matched_rule_name: Option<String>,
    /// 处理状态
    pub status: EventProcessingStatus,
    /// AI 动作类型
    pub action_type: Option<AiActionType>,
    /// AI 动作结果
    pub action_result: Option<serde_json::Value>,
    /// 处理时间
    pub processed_at: String,
    /// 处理耗时（毫秒）
    pub duration_ms: u64,
    /// 错误信息
    pub error_message: Option<String>,
    /// 租户 ID
    pub tenant_id: String,
}

/// 事件处理状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EventProcessingStatus {
    /// 已触发
    Triggered,
    /// 处理中
    Processing,
    /// 处理成功
    Success,
    /// 处理失败
    Failed,
    /// 已跳过（不匹配规则或冷却中）
    Skipped,
    /// 等待人工确认
    WaitingForApproval,
}

impl EventProcessingStatus {
    pub fn as_str(&self) -> &str {
        match self {
            EventProcessingStatus::Triggered => "triggered",
            EventProcessingStatus::Processing => "processing",
            EventProcessingStatus::Success => "success",
            EventProcessingStatus::Failed => "failed",
            EventProcessingStatus::Skipped => "skipped",
            EventProcessingStatus::WaitingForApproval => "waiting_for_approval",
        }
    }
}

/// 事件订阅者
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventSubscriber {
    /// 订阅者 ID
    pub subscriber_id: String,
    /// 订阅者名称
    pub name: String,
    /// 订阅者类型（agent/workflow/notification/system）
    pub subscriber_type: String,
    /// 订阅的事件类型模式
    pub event_type_patterns: Vec<String>,
    /// 回调 URL（HTTP 回调时使用）
    pub callback_url: Option<String>,
    /// 是否启用
    pub enabled: bool,
    /// 订阅时间
    pub subscribed_at: String,
    /// 最后接收事件时间
    pub last_event_received_at: Option<String>,
    /// 接收事件总数
    pub received_count: u64,
}

/// 事件触发器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventTriggerConfig {
    /// 是否启用
    pub enabled: bool,
    /// 事件队列最大长度
    pub max_event_queue: usize,
    /// 处理历史最大保留数
    pub max_processing_history: usize,
    /// 默认冷却时间（秒）
    pub default_cooldown_seconds: u64,
    /// 是否启用异步处理
    pub enable_async_processing: bool,
    /// 最大并发处理数
    pub max_concurrent_processing: usize,
    /// 是否启用事件审计
    pub enable_audit: bool,
}

impl Default for EventTriggerConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            max_event_queue: 10000,
            max_processing_history: 5000,
            default_cooldown_seconds: 60,
            enable_async_processing: true,
            max_concurrent_processing: 10,
            enable_audit: true,
        }
    }
}

/// 事件触发器统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventTriggerStats {
    /// 总事件数
    pub total_events: u64,
    /// 已处理事件数
    pub processed_events: u64,
    /// 成功处理数
    pub successful_processing: u64,
    /// 失败处理数
    pub failed_processing: u64,
    /// 跳过事件数
    pub skipped_events: u64,
    /// 规则数
    pub total_rules: u64,
    /// 启用的规则数
    pub enabled_rules: u64,
    /// 订阅者数
    pub total_subscribers: u64,
    /// 当前队列长度
    pub current_queue_length: u64,
    /// 平均处理耗时（毫秒）
    pub average_processing_ms: u64,
}

// ============================================================================
// 事件触发器引擎
// ============================================================================

/// Event → AI 触发器引擎
#[derive(Clone)]
pub struct EventTriggerEngine {
    /// 配置
    config: EventTriggerConfig,
    /// 触发器规则（规则 ID -> 规则）
    rules: Arc<Mutex<HashMap<String, TriggerRule>>>,
    /// 事件订阅者（订阅者 ID -> 订阅者）
    subscribers: Arc<Mutex<HashMap<String, EventSubscriber>>>,
    /// 事件队列
    event_queue: Arc<Mutex<VecDeque<BusinessEvent>>>,
    /// 处理历史（记录 ID -> 记录）
    processing_history: Arc<Mutex<HashMap<String, EventProcessingRecord>>>,
    /// 处理历史索引（按时间排序）
    history_index: Arc<Mutex<VecDeque<String>>>,
    /// 冷却时间记录（事件类型 -> 最后触发时间）
    cooldown_tracker: Arc<Mutex<HashMap<String, Instant>>>,
}

impl EventTriggerEngine {
    /// 创建新的事件触发器引擎
    pub fn new(config: EventTriggerConfig) -> Self {
        let engine = Self {
            config,
            rules: Arc::new(Mutex::new(HashMap::new())),
            subscribers: Arc::new(Mutex::new(HashMap::new())),
            event_queue: Arc::new(Mutex::new(VecDeque::new())),
            processing_history: Arc::new(Mutex::new(HashMap::new())),
            history_index: Arc::new(Mutex::new(VecDeque::new())),
            cooldown_tracker: Arc::new(Mutex::new(HashMap::new())),
        };

        // 初始化默认规则
        engine.init_default_rules();

        engine
    }

    /// 使用默认配置创建
    pub fn with_defaults() -> Self {
        Self::new(EventTriggerConfig::default())
    }

    /// 获取配置
    pub fn config(&self) -> &EventTriggerConfig {
        &self.config
    }

    /// 初始化默认规则
    fn init_default_rules(&self) {
        // 订单创建事件规则
        let order_created_rule = TriggerRule {
            rule_id: "default_order_created".to_string(),
            name: "订单创建自动通知".to_string(),
            description: "订单创建时自动发送通知并调用 AI 生成处理建议".to_string(),
            event_type_pattern: "order.created".to_string(),
            source_pattern: "*".to_string(),
            min_priority: EventPriority::Medium,
            condition_expression: None,
            ai_action: AiActionConfig {
                action_type: AiActionType::SendNotification,
                agent_id: None,
                workflow_id: None,
                prompt_template: None,
                llm_model: None,
                notification_channels: vec!["email".to_string(), "sms".to_string()],
                notification_recipients: vec!["admin".to_string()],
                auto_execute: true,
                parameters: HashMap::new(),
            },
            enabled: true,
            priority: 100,
            cooldown_seconds: 0,
            max_trigger_count: 0,
            trigger_count: 0,
            tags: vec!["order".to_string(), "notification".to_string()],
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            last_triggered_at: None,
        };

        self.rules
            .lock()
            .insert(order_created_rule.rule_id.clone(), order_created_rule);

        // 系统告警规则
        let alert_rule = TriggerRule {
            rule_id: "default_system_alert".to_string(),
            name: "系统告警 AI 响应".to_string(),
            description: "系统告警时自动调用 AI 进行故障诊断".to_string(),
            event_type_pattern: "system.alert".to_string(),
            source_pattern: "*".to_string(),
            min_priority: EventPriority::High,
            condition_expression: None,
            ai_action: AiActionConfig {
                action_type: AiActionType::CallAgent,
                agent_id: Some("diagnosis_agent".to_string()),
                workflow_id: None,
                prompt_template: Some("请诊断以下系统告警：{{alert_message}}".to_string()),
                llm_model: Some("gpt-4".to_string()),
                notification_channels: vec![],
                notification_recipients: vec![],
                auto_execute: true,
                parameters: HashMap::new(),
            },
            enabled: true,
            priority: 200,
            cooldown_seconds: 300,
            max_trigger_count: 0,
            trigger_count: 0,
            tags: vec!["system".to_string(), "alert".to_string()],
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            last_triggered_at: None,
        };

        self.rules
            .lock()
            .insert(alert_rule.rule_id.clone(), alert_rule);

        info!("Default event trigger rules initialized");
    }

    /// 注册触发器规则
    pub fn register_rule(&self, rule: TriggerRule) -> Result<String, String> {
        if !self.config.enabled {
            return Err("事件触发器未启用".to_string());
        }

        let rule_id = rule.rule_id.clone();
        self.rules.lock().insert(rule_id.clone(), rule);

        info!(rule_id = %rule_id, "Trigger rule registered");
        Ok(rule_id)
    }

    /// 获取触发器规则
    pub fn get_rule(&self, rule_id: &str) -> Option<TriggerRule> {
        self.rules.lock().get(rule_id).cloned()
    }

    /// 更新触发器规则
    pub fn update_rule(&self, rule_id: &str, updates: RuleUpdate) -> Result<(), String> {
        let mut rules = self.rules.lock();
        let rule = rules
            .get_mut(rule_id)
            .ok_or_else(|| format!("规则 {} 不存在", rule_id))?;

        if let Some(name) = updates.name {
            rule.name = name;
        }
        if let Some(description) = updates.description {
            rule.description = description;
        }
        if let Some(enabled) = updates.enabled {
            rule.enabled = enabled;
        }
        if let Some(priority) = updates.priority {
            rule.priority = priority;
        }
        if let Some(cooldown_seconds) = updates.cooldown_seconds {
            rule.cooldown_seconds = cooldown_seconds;
        }
        if let Some(ai_action) = updates.ai_action {
            rule.ai_action = ai_action;
        }

        rule.updated_at = chrono::Utc::now().to_rfc3339();

        info!(rule_id = %rule_id, "Trigger rule updated");
        Ok(())
    }

    /// 删除触发器规则
    pub fn delete_rule(&self, rule_id: &str) -> bool {
        let removed = self.rules.lock().remove(rule_id).is_some();
        if removed {
            info!(rule_id = %rule_id, "Trigger rule deleted");
        }
        removed
    }

    /// 列出触发器规则
    pub fn list_rules(&self, tag_filter: Option<&str>, enabled_only: bool) -> Vec<TriggerRule> {
        let rules = self.rules.lock();
        let mut result: Vec<TriggerRule> = rules
            .values()
            .filter(|r| {
                if enabled_only && !r.enabled {
                    return false;
                }
                if let Some(tag) = tag_filter {
                    if !r.tags.contains(&tag.to_string()) {
                        return false;
                    }
                }
                true
            })
            .cloned()
            .collect();

        result.sort_by(|a, b| b.priority.cmp(&a.priority));
        result
    }

    /// 发布事件
    pub fn publish_event(&self, event: BusinessEvent) -> Result<String, String> {
        if !self.config.enabled {
            return Err("事件触发器未启用".to_string());
        }

        let event_id = event.event_id.clone();

        // 添加到事件队列
        let mut queue = self.event_queue.lock();
        if queue.len() >= self.config.max_event_queue {
            queue.pop_front(); // 丢弃最旧的事件
            warn!("Event queue full, dropping oldest event");
        }
        queue.push_back(event);
        drop(queue);

        debug!(event_id = %event_id, event_type = %event_id, "Event published");
        Ok(event_id)
    }

    /// 处理事件队列（同步处理所有待处理事件）
    pub fn process_queue(&self, max_batch: usize) -> usize {
        let mut processed = 0;

        for _ in 0..max_batch {
            // 从队列取出事件
            let event = {
                let mut queue = self.event_queue.lock();
                queue.pop_front()
            };

            match event {
                Some(event) => {
                    let _ = self.process_event(event);
                    processed += 1;
                }
                None => break,
            }
        }

        if processed > 0 {
            debug!(count = processed, "Event queue processed");
        }

        processed
    }

    /// 处理单个事件
    pub fn process_event(&self, event: BusinessEvent) -> Result<EventProcessingRecord, String> {
        let start_time = Instant::now();
        let event_id = event.event_id.clone();
        let event_type = event.event_type.clone();
        let tenant_id = event.tenant_id.clone();

        // 匹配规则
        let matched_rule = self.match_rule(&event);

        let (status, action_type, action_result, error_message, matched_rule_id, matched_rule_name) =
            match matched_rule {
                Some(rule) => {
                    // 检查冷却时间
                    if rule.cooldown_seconds > 0 {
                        let mut cooldown = self.cooldown_tracker.lock();
                        if let Some(last_trigger) = cooldown.get(&event_type) {
                            if last_trigger.elapsed() < Duration::from_secs(rule.cooldown_seconds) {
                                drop(cooldown);
                                debug!(
                                    event_type = %event_type,
                                    "Event skipped due to cooldown"
                                );
                                (
                                    EventProcessingStatus::Skipped,
                                    None,
                                    None,
                                    Some("冷却时间内".to_string()),
                                    Some(rule.rule_id.clone()),
                                    Some(rule.name.clone()),
                                )
                            } else {
                                cooldown.insert(event_type.clone(), Instant::now());
                                drop(cooldown);
                                self.execute_action(&rule, &event)
                            }
                        } else {
                            cooldown.insert(event_type.clone(), Instant::now());
                            drop(cooldown);
                            self.execute_action(&rule, &event)
                        }
                    } else {
                        self.execute_action(&rule, &event)
                    }
                }
                None => {
                    debug!(event_id = %event_id, "No matching rule found for event");
                    (
                        EventProcessingStatus::Skipped,
                        None,
                        None,
                        Some("无匹配规则".to_string()),
                        None,
                        None,
                    )
                }
            };

        let record = EventProcessingRecord {
            record_id: format!("rec_{}", uuid::Uuid::new_v4()),
            event_id,
            event_type,
            matched_rule_id,
            matched_rule_name,
            status,
            action_type,
            action_result,
            processed_at: chrono::Utc::now().to_rfc3339(),
            duration_ms: start_time.elapsed().as_millis() as u64,
            error_message,
            tenant_id,
        };

        // 保存处理记录
        let record_id = record.record_id.clone();
        let mut history = self.processing_history.lock();
        history.insert(record_id.clone(), record.clone());
        drop(history);

        // 更新历史索引
        let mut index = self.history_index.lock();
        index.push_back(record_id.clone());
        if index.len() > self.config.max_processing_history {
            if let Some(old_id) = index.pop_front() {
                self.processing_history.lock().remove(&old_id);
            }
        }
        drop(index);

        // 通知订阅者
        self.notify_subscribers(&record);

        Ok(record)
    }

    /// 匹配规则
    fn match_rule(&self, event: &BusinessEvent) -> Option<TriggerRule> {
        let rules = self.rules.lock();
        let mut matched_rules: Vec<&TriggerRule> = rules
            .values()
            .filter(|r| {
                if !r.enabled {
                    return false;
                }
                // 检查事件类型匹配
                if !self.pattern_match(&r.event_type_pattern, &event.event_type) {
                    return false;
                }
                // 检查事件来源匹配
                if !self.pattern_match(&r.source_pattern, &event.source) {
                    return false;
                }
                // 检查优先级
                if event.priority < r.min_priority {
                    return false;
                }
                // 检查最大触发次数
                if r.max_trigger_count > 0 && r.trigger_count >= r.max_trigger_count {
                    return false;
                }
                true
            })
            .collect();

        matched_rules.sort_by(|a, b| b.priority.cmp(&a.priority));
        matched_rules.first().cloned().cloned()
    }

    /// 模式匹配（支持通配符 *）
    fn pattern_match(&self, pattern: &str, value: &str) -> bool {
        if pattern == "*" {
            return true;
        }
        if pattern.ends_with('*') {
            let prefix = &pattern[..pattern.len() - 1];
            return value.starts_with(prefix);
        }
        if pattern.starts_with('*') {
            let suffix = &pattern[1..];
            return value.ends_with(suffix);
        }
        pattern == value
    }

    /// 执行 AI 动作
    fn execute_action(
        &self,
        rule: &TriggerRule,
        event: &BusinessEvent,
    ) -> (
        EventProcessingStatus,
        Option<AiActionType>,
        Option<serde_json::Value>,
        Option<String>,
        Option<String>,
        Option<String>,
    ) {
        let action_type = rule.ai_action.action_type;

        // 更新规则触发计数
        {
            let mut rules = self.rules.lock();
            if let Some(r) = rules.get_mut(&rule.rule_id) {
                r.trigger_count += 1;
                r.last_triggered_at = Some(chrono::Utc::now().to_rfc3339());
            }
            drop(rules);
        }

        // 检查是否需要人工确认
        if !rule.ai_action.auto_execute {
            return (
                EventProcessingStatus::WaitingForApproval,
                Some(action_type),
                None,
                Some("需要人工确认".to_string()),
                Some(rule.rule_id.clone()),
                Some(rule.name.clone()),
            );
        }

        // 模拟执行动作（实际实现中会调用对应的 Agent/Workflow/LLM）
        let result = match action_type {
            AiActionType::CallAgent => {
                let agent_id = rule
                    .ai_action
                    .agent_id
                    .clone()
                    .unwrap_or_else(|| "default".to_string());
                serde_json::json!({
                    "agent_id": agent_id,
                    "status": "success",
                    "response": format!("Agent {} 已处理事件（模拟）", agent_id),
                    "event_id": event.event_id
                })
            }
            AiActionType::ExecuteWorkflow => {
                let workflow_id = rule
                    .ai_action
                    .workflow_id
                    .clone()
                    .unwrap_or_else(|| "default".to_string());
                serde_json::json!({
                    "workflow_id": workflow_id,
                    "status": "success",
                    "execution_id": format!("exec_{}", uuid::Uuid::new_v4()),
                    "event_id": event.event_id
                })
            }
            AiActionType::GenerateResponse => {
                let prompt = rule
                    .ai_action
                    .prompt_template
                    .clone()
                    .unwrap_or_else(|| "默认提示词".to_string());
                serde_json::json!({
                    "status": "success",
                    "response": format!("AI 响应（模拟）: {}", prompt),
                    "model": rule.ai_action.llm_model.clone().unwrap_or_else(|| "default".to_string()),
                    "event_id": event.event_id
                })
            }
            AiActionType::SendNotification => {
                serde_json::json!({
                    "status": "success",
                    "channels": rule.ai_action.notification_channels,
                    "recipients": rule.ai_action.notification_recipients,
                    "message": format!("事件通知: {}", event.title),
                    "event_id": event.event_id
                })
            }
            AiActionType::CreateTask => {
                serde_json::json!({
                    "status": "success",
                    "task_id": format!("task_{}", uuid::Uuid::new_v4()),
                    "title": format!("处理事件: {}", event.title),
                    "event_id": event.event_id
                })
            }
            AiActionType::LogEvent => {
                serde_json::json!({
                    "status": "success",
                    "logged": true,
                    "event_id": event.event_id
                })
            }
            AiActionType::Custom => {
                serde_json::json!({
                    "status": "success",
                    "custom_type": rule.ai_action.action_type.as_str(),
                    "event_id": event.event_id
                })
            }
        };

        debug!(
            rule_id = %rule.rule_id,
            action_type = %action_type.as_str(),
            "AI action executed (simulated)"
        );

        (
            EventProcessingStatus::Success,
            Some(action_type),
            Some(result),
            None,
            Some(rule.rule_id.clone()),
            Some(rule.name.clone()),
        )
    }

    /// 注册事件订阅者
    pub fn register_subscriber(&self, subscriber: EventSubscriber) -> Result<String, String> {
        let subscriber_id = subscriber.subscriber_id.clone();
        self.subscribers
            .lock()
            .insert(subscriber_id.clone(), subscriber);
        info!(subscriber_id = %subscriber_id, "Event subscriber registered");
        Ok(subscriber_id)
    }

    /// 获取事件订阅者
    pub fn get_subscriber(&self, subscriber_id: &str) -> Option<EventSubscriber> {
        self.subscribers.lock().get(subscriber_id).cloned()
    }

    /// 列出事件订阅者
    pub fn list_subscribers(&self) -> Vec<EventSubscriber> {
        let subscribers = self.subscribers.lock();
        let mut result: Vec<EventSubscriber> = subscribers.values().cloned().collect();
        result.sort_by(|a, b| b.subscribed_at.cmp(&a.subscribed_at));
        result
    }

    /// 删除事件订阅者
    pub fn delete_subscriber(&self, subscriber_id: &str) -> bool {
        let removed = self.subscribers.lock().remove(subscriber_id).is_some();
        if removed {
            info!(subscriber_id = %subscriber_id, "Event subscriber deleted");
        }
        removed
    }

    /// 通知订阅者
    fn notify_subscribers(&self, record: &EventProcessingRecord) {
        let mut subscribers = self.subscribers.lock();
        for subscriber in subscribers.values_mut() {
            if !subscriber.enabled {
                continue;
            }
            // 检查事件类型匹配
            let matched = subscriber
                .event_type_patterns
                .iter()
                .any(|pattern| self.pattern_match(pattern, &record.event_type));

            if matched {
                subscriber.received_count += 1;
                subscriber.last_event_received_at = Some(chrono::Utc::now().to_rfc3339());
                debug!(
                    subscriber_id = %subscriber.subscriber_id,
                    record_id = %record.record_id,
                    "Subscriber notified"
                );
            }
        }
    }

    /// 获取处理记录
    pub fn get_processing_record(&self, record_id: &str) -> Option<EventProcessingRecord> {
        self.processing_history.lock().get(record_id).cloned()
    }

    /// 列出处理记录
    pub fn list_processing_records(
        &self,
        event_type_filter: Option<&str>,
        status_filter: Option<EventProcessingStatus>,
        limit: Option<usize>,
    ) -> Vec<EventProcessingRecord> {
        let history = self.processing_history.lock();
        let mut result: Vec<EventProcessingRecord> = history
            .values()
            .filter(|r| {
                if let Some(event_type) = event_type_filter {
                    if r.event_type != event_type {
                        return false;
                    }
                }
                if let Some(status) = status_filter {
                    if r.status != status {
                        return false;
                    }
                }
                true
            })
            .cloned()
            .collect();

        result.sort_by(|a, b| b.processed_at.cmp(&a.processed_at));
        if let Some(lim) = limit {
            result.truncate(lim);
        }
        result
    }

    /// 获取统计信息
    pub fn get_stats(&self) -> EventTriggerStats {
        let rules = self.rules.lock();
        let subscribers = self.subscribers.lock();
        let history = self.processing_history.lock();
        let queue = self.event_queue.lock();

        let enabled_rules = rules.values().filter(|r| r.enabled).count() as u64;
        let successful = history
            .values()
            .filter(|r| r.status == EventProcessingStatus::Success)
            .count() as u64;
        let failed = history
            .values()
            .filter(|r| r.status == EventProcessingStatus::Failed)
            .count() as u64;
        let skipped = history
            .values()
            .filter(|r| r.status == EventProcessingStatus::Skipped)
            .count() as u64;

        let total_duration: u64 = history.values().map(|r| r.duration_ms).sum();
        let average_duration_ms = if !history.is_empty() {
            total_duration / history.len() as u64
        } else {
            0
        };

        EventTriggerStats {
            total_events: history.len() as u64,
            processed_events: history.len() as u64,
            successful_processing: successful,
            failed_processing: failed,
            skipped_events: skipped,
            total_rules: rules.len() as u64,
            enabled_rules,
            total_subscribers: subscribers.len() as u64,
            current_queue_length: queue.len() as u64,
            average_processing_ms: average_duration_ms,
        }
    }
}

/// 规则更新参数
#[derive(Debug, Clone, Default)]
pub struct RuleUpdate {
    pub name: Option<String>,
    pub description: Option<String>,
    pub enabled: Option<bool>,
    pub priority: Option<u32>,
    pub cooldown_seconds: Option<u64>,
    pub ai_action: Option<AiActionConfig>,
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_engine() -> EventTriggerEngine {
        EventTriggerEngine::with_defaults()
    }

    fn create_test_event(event_type: &str, priority: EventPriority) -> BusinessEvent {
        BusinessEvent {
            event_id: format!("evt_{}", uuid::Uuid::new_v4()),
            event_type: event_type.to_string(),
            source: "test_system".to_string(),
            title: format!("测试事件: {}", event_type),
            description: "这是一个测试事件".to_string(),
            data: serde_json::json!({ "test": "data" }),
            priority,
            tenant_id: "tenant1".to_string(),
            triggered_by: "test_user".to_string(),
            event_time: chrono::Utc::now().to_rfc3339(),
            metadata: HashMap::new(),
        }
    }

    #[test]
    fn test_event_priority_as_str() {
        assert_eq!(EventPriority::Low.as_str(), "low");
        assert_eq!(EventPriority::Medium.as_str(), "medium");
        assert_eq!(EventPriority::High.as_str(), "high");
        assert_eq!(EventPriority::Critical.as_str(), "critical");
    }

    #[test]
    fn test_event_priority_from_str() {
        assert_eq!(EventPriority::from_str("low"), EventPriority::Low);
        assert_eq!(EventPriority::from_str("high"), EventPriority::High);
        assert_eq!(EventPriority::from_str("unknown"), EventPriority::Medium);
    }

    #[test]
    fn test_ai_action_type_as_str() {
        assert_eq!(AiActionType::CallAgent.as_str(), "call_agent");
        assert_eq!(AiActionType::ExecuteWorkflow.as_str(), "execute_workflow");
        assert_eq!(AiActionType::SendNotification.as_str(), "send_notification");
    }

    #[test]
    fn test_event_processing_status_as_str() {
        assert_eq!(EventProcessingStatus::Success.as_str(), "success");
        assert_eq!(EventProcessingStatus::Failed.as_str(), "failed");
        assert_eq!(EventProcessingStatus::Skipped.as_str(), "skipped");
    }

    #[test]
    fn test_event_trigger_config_default() {
        let config = EventTriggerConfig::default();
        assert!(config.enabled);
        assert_eq!(config.max_event_queue, 10000);
        assert_eq!(config.default_cooldown_seconds, 60);
    }

    #[test]
    fn test_engine_creation() {
        let engine = create_test_engine();
        assert!(engine.config().enabled);
    }

    #[test]
    fn test_default_rules() {
        let engine = create_test_engine();
        let rules = engine.list_rules(None, false);
        assert!(!rules.is_empty());
    }

    #[test]
    fn test_register_rule() {
        let engine = create_test_engine();
        let rule = TriggerRule {
            rule_id: "test_rule".to_string(),
            name: "测试规则".to_string(),
            description: "测试规则描述".to_string(),
            event_type_pattern: "test.*".to_string(),
            source_pattern: "*".to_string(),
            min_priority: EventPriority::Low,
            condition_expression: None,
            ai_action: AiActionConfig {
                action_type: AiActionType::LogEvent,
                agent_id: None,
                workflow_id: None,
                prompt_template: None,
                llm_model: None,
                notification_channels: vec![],
                notification_recipients: vec![],
                auto_execute: true,
                parameters: HashMap::new(),
            },
            enabled: true,
            priority: 50,
            cooldown_seconds: 0,
            max_trigger_count: 0,
            trigger_count: 0,
            tags: vec!["test".to_string()],
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            last_triggered_at: None,
        };

        let result = engine.register_rule(rule);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "test_rule");
    }

    #[test]
    fn test_get_rule() {
        let engine = create_test_engine();
        let rule = engine.get_rule("default_order_created");
        assert!(rule.is_some());
        assert_eq!(rule.unwrap().name, "订单创建自动通知");
    }

    #[test]
    fn test_update_rule() {
        let engine = create_test_engine();
        let update = RuleUpdate {
            name: Some("更新后的规则名".to_string()),
            enabled: Some(false),
            ..Default::default()
        };

        let result = engine.update_rule("default_order_created", update);
        assert!(result.is_ok());

        let rule = engine.get_rule("default_order_created").unwrap();
        assert_eq!(rule.name, "更新后的规则名");
        assert!(!rule.enabled);
    }

    #[test]
    fn test_delete_rule() {
        let engine = create_test_engine();
        assert!(engine.delete_rule("default_order_created"));
        assert!(engine.get_rule("default_order_created").is_none());
    }

    #[test]
    fn test_list_rules_by_tag() {
        let engine = create_test_engine();
        let order_rules = engine.list_rules(Some("order"), false);
        assert!(!order_rules.is_empty());
        assert!(order_rules
            .iter()
            .all(|r| r.tags.contains(&"order".to_string())));
    }

    #[test]
    fn test_list_enabled_rules() {
        let engine = create_test_engine();
        let enabled_rules = engine.list_rules(None, true);
        assert!(enabled_rules.iter().all(|r| r.enabled));
    }

    #[test]
    fn test_publish_event() {
        let engine = create_test_engine();
        let event = create_test_event("order.created", EventPriority::High);
        let result = engine.publish_event(event);
        assert!(result.is_ok());
    }

    #[test]
    fn test_process_event() {
        let engine = create_test_engine();
        let event = create_test_event("order.created", EventPriority::High);
        let result = engine.process_event(event);
        assert!(result.is_ok());

        let record = result.unwrap();
        assert_eq!(record.status, EventProcessingStatus::Success);
        assert!(record.matched_rule_id.is_some());
    }

    #[test]
    fn test_process_event_no_match() {
        let engine = create_test_engine();
        let event = create_test_event("unknown.event", EventPriority::Low);
        let result = engine.process_event(event);
        assert!(result.is_ok());

        let record = result.unwrap();
        assert_eq!(record.status, EventProcessingStatus::Skipped);
    }

    #[test]
    fn test_process_queue() {
        let engine = create_test_engine();

        engine
            .publish_event(create_test_event("order.created", EventPriority::High))
            .unwrap();
        engine
            .publish_event(create_test_event("system.alert", EventPriority::Critical))
            .unwrap();

        let processed = engine.process_queue(10);
        assert_eq!(processed, 2);
    }

    #[test]
    fn test_register_subscriber() {
        let engine = create_test_engine();
        let subscriber = EventSubscriber {
            subscriber_id: "sub1".to_string(),
            name: "测试订阅者".to_string(),
            subscriber_type: "system".to_string(),
            event_type_patterns: vec!["order.*".to_string()],
            callback_url: None,
            enabled: true,
            subscribed_at: chrono::Utc::now().to_rfc3339(),
            last_event_received_at: None,
            received_count: 0,
        };

        let result = engine.register_subscriber(subscriber);
        assert!(result.is_ok());
    }

    #[test]
    fn test_subscriber_notification() {
        let engine = create_test_engine();
        let subscriber = EventSubscriber {
            subscriber_id: "sub1".to_string(),
            name: "测试订阅者".to_string(),
            subscriber_type: "system".to_string(),
            event_type_patterns: vec!["order.*".to_string()],
            callback_url: None,
            enabled: true,
            subscribed_at: chrono::Utc::now().to_rfc3339(),
            last_event_received_at: None,
            received_count: 0,
        };

        engine.register_subscriber(subscriber).unwrap();
        engine
            .process_event(create_test_event("order.created", EventPriority::High))
            .unwrap();

        let subscriber = engine.get_subscriber("sub1").unwrap();
        assert_eq!(subscriber.received_count, 1);
        assert!(subscriber.last_event_received_at.is_some());
    }

    #[test]
    fn test_list_processing_records() {
        let engine = create_test_engine();
        engine
            .process_event(create_test_event("order.created", EventPriority::High))
            .unwrap();
        engine
            .process_event(create_test_event("system.alert", EventPriority::Critical))
            .unwrap();

        let records = engine.list_processing_records(None, None, None);
        assert_eq!(records.len(), 2);
    }

    #[test]
    fn test_list_processing_records_by_type() {
        let engine = create_test_engine();
        engine
            .process_event(create_test_event("order.created", EventPriority::High))
            .unwrap();
        engine
            .process_event(create_test_event("system.alert", EventPriority::Critical))
            .unwrap();

        let order_records = engine.list_processing_records(Some("order.created"), None, None);
        assert_eq!(order_records.len(), 1);
    }

    #[test]
    fn test_get_stats() {
        let engine = create_test_engine();
        engine
            .process_event(create_test_event("order.created", EventPriority::High))
            .unwrap();
        engine
            .process_event(create_test_event("unknown.event", EventPriority::Low))
            .unwrap();

        let stats = engine.get_stats();
        assert!(stats.total_events >= 2);
        assert!(stats.successful_processing >= 1);
        assert!(stats.skipped_events >= 1);
        assert!(stats.total_rules > 0);
    }
}
