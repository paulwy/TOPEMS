//! Data Conversion Rules Module
//!
//! 实现模块间的数据自动流转规则

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

// ==================== Conversion Rule Types ====================

/// 转换规则状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum RuleStatus {
    Active,
    Inactive,
    Draft,
}

impl RuleStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            RuleStatus::Active => "active",
            RuleStatus::Inactive => "inactive",
            RuleStatus::Draft => "draft",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "active" => RuleStatus::Active,
            "inactive" => RuleStatus::Inactive,
            "draft" => RuleStatus::Draft,
            _ => RuleStatus::Draft,
        }
    }
}

/// 转换规则触发时机
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TriggerType {
    /// 事件触发（如订单创建后）
    Event,
    /// 定时触发（如每天定时同步）
    Scheduled,
    /// 手动触发
    Manual,
}

impl TriggerType {
    pub fn as_str(&self) -> &'static str {
        match self {
            TriggerType::Event => "event",
            TriggerType::Scheduled => "scheduled",
            TriggerType::Manual => "manual",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "event" => TriggerType::Event,
            "scheduled" => TriggerType::Scheduled,
            "manual" => TriggerType::Manual,
            _ => TriggerType::Event,
        }
    }
}

/// 转换规则
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversionRule {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,

    /// 源系统 (erp, hrm, mes, pm, etc.)
    pub source_system: String,

    /// 源实体类型 (sales_order, employee, production_order, etc.)
    pub source_entity: String,

    /// 目标系统
    pub target_system: String,

    /// 目标实体类型
    pub target_entity: String,

    /// 触发类型
    pub trigger_type: TriggerType,

    /// 触发条件 (JSON 条件表达式)
    pub trigger_condition: Option<serde_json::Value>,

    /// 字段映射规则 (JSON)
    pub field_mappings: serde_json::Value,

    /// 转换脚本 (可选，JavaScript 表达式)
    pub transform_script: Option<String>,

    /// 状态
    pub status: RuleStatus,

    /// 优先级 (数字越小优先级越高)
    pub priority: i32,

    /// 是否启用
    pub is_enabled: bool,

    /// 最大重试次数
    pub max_retries: i32,

    /// 重试间隔(秒)
    pub retry_interval_secs: i32,

    /// 失败后是否停止
    pub stop_on_failure: bool,

    /// 创建时间
    pub created_at: DateTime<Utc>,

    /// 更新时间
    pub updated_at: DateTime<Utc>,
}

/// 值映射表
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValueMap {
    /// 值映射关系
    pub mappings: std::collections::HashMap<String, serde_json::Value>,
    /// 默认值 (当找不到映射时使用)
    pub default_value: Option<serde_json::Value>,
}

impl ValueMap {
    /// 根据源值获取目标值
    pub fn get(&self, key: &str) -> &serde_json::Value {
        self.mappings.get(key).unwrap_or_else(|| {
            self.default_value
                .as_ref()
                .unwrap_or(&serde_json::Value::Null)
        })
    }
}

/// 条件映射
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConditionalMapping {
    /// 条件表达式
    pub condition: serde_json::Value,
    /// 满足条件时的结果值
    pub result: serde_json::Value,
}

/// 字段映射
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldMapping {
    /// 源字段
    pub source_field: String,
    /// 目标字段
    pub target_field: String,
    /// 默认值 (当源字段为空时使用)
    pub default_value: Option<serde_json::Value>,
    /// 转换表达式 (可选)
    pub transform: Option<String>,
    /// 值映射表 (可选，用于枚举值转换)
    pub value_map: Option<ValueMap>,
    /// 条件映射列表 (可选，按顺序匹配第一个满足条件的)
    pub conditional_mappings: Option<Vec<ConditionalMapping>>,
}

/// 创建转换规则请求
#[derive(Debug, Clone, Deserialize)]
pub struct CreateConversionRuleRequest {
    pub tenant_id: Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub source_system: String,
    pub source_entity: String,
    pub target_system: String,
    pub target_entity: String,
    pub trigger_type: TriggerType,
    pub trigger_condition: Option<serde_json::Value>,
    pub field_mappings: Vec<FieldMapping>,
    pub transform_script: Option<String>,
    pub priority: Option<i32>,
    pub max_retries: Option<i32>,
    pub retry_interval_secs: Option<i32>,
    pub stop_on_failure: Option<bool>,
}

/// 更新转换规则请求
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateConversionRuleRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub trigger_type: Option<TriggerType>,
    pub trigger_condition: Option<serde_json::Value>,
    pub field_mappings: Option<Vec<FieldMapping>>,
    pub transform_script: Option<String>,
    pub status: Option<RuleStatus>,
    pub priority: Option<i32>,
    pub is_enabled: Option<bool>,
    pub max_retries: Option<i32>,
    pub retry_interval_secs: Option<i32>,
    pub stop_on_failure: Option<bool>,
}

/// 转换执行记录
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ConversionExecution {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub rule_id: Uuid,
    pub rule_code: String,
    pub source_record_id: String,
    pub target_record_id: Option<String>,
    pub source_data: Option<serde_json::Value>,
    pub target_data: Option<serde_json::Value>,
    pub status: String, // pending, running, completed, failed
    pub retry_count: i32,
    pub error_message: Option<String>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// 转换执行请求
#[derive(Debug, Clone, Deserialize)]
pub struct ExecuteConversionRequest {
    pub rule_code: String,
    pub source_record_id: String,
    pub source_data: serde_json::Value,
}

/// 转换执行响应
#[derive(Debug, Clone, Serialize)]
pub struct ExecuteConversionResponse {
    pub execution_id: Uuid,
    pub success: bool,
    pub target_record_id: Option<String>,
    pub target_data: Option<serde_json::Value>,
    pub message: String,
    pub error_message: Option<String>,
}

// ==================== Predefined Rules ====================

/// 预定义的转换规则
pub fn get_predefined_rules(tenant_id: Uuid) -> Vec<ConversionRule> {
    vec![
        // ERP 订单 → MES 工单
        ConversionRule {
            id: Uuid::new_v4(),
            tenant_id,
            code: "order_to_workorder".to_string(),
            name: "销售订单转生产工单".to_string(),
            description: Some("销售订单确认后自动生成生产工单".to_string()),
            source_system: "erp".to_string(),
            source_entity: "sales_order".to_string(),
            target_system: "mes".to_string(),
            target_entity: "production_order".to_string(),
            trigger_type: TriggerType::Event,
            trigger_condition: Some(serde_json::json!({
                "field": "status",
                "operator": "eq",
                "value": "confirmed"
            })),
            field_mappings: serde_json::json!([
                {"source_field": "order_number", "target_field": "source_order_number"},
                {"source_field": "customer_name", "target_field": "customer_name"},
                {"source_field": "product_name", "target_field": "product_name"},
                {"source_field": "product_code", "target_field": "product_code"},
                {"source_field": "quantity", "target_field": "quantity"},
                {"source_field": "unit", "target_field": "unit"},
                {"source_field": "delivery_date", "target_field": "planned_completion_date"}
            ]),
            transform_script: None,
            status: RuleStatus::Active,
            priority: 10,
            is_enabled: true,
            max_retries: 3,
            retry_interval_secs: 60,
            stop_on_failure: false,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        },
        // ERP 采购 → SRM 合同
        ConversionRule {
            id: Uuid::new_v4(),
            tenant_id,
            code: "purchase_to_contract".to_string(),
            name: "采购订单转供应合同".to_string(),
            description: Some("采购订单审批后自动生成供应合同".to_string()),
            source_system: "erp".to_string(),
            source_entity: "purchase_order".to_string(),
            target_system: "srm".to_string(),
            target_entity: "supplier_contract".to_string(),
            trigger_type: TriggerType::Event,
            trigger_condition: Some(serde_json::json!({
                "field": "status",
                "operator": "eq",
                "value": "approved"
            })),
            field_mappings: serde_json::json!([
                {"source_field": "order_number", "target_field": "contract_number"},
                {"source_field": "supplier_name", "target_field": "supplier_name"},
                {"source_field": "total_amount", "target_field": "contract_amount"},
                {"source_field": "order_date", "target_field": "signing_date"}
            ]),
            transform_script: None,
            status: RuleStatus::Active,
            priority: 20,
            is_enabled: true,
            max_retries: 3,
            retry_interval_secs: 60,
            stop_on_failure: false,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        },
        // HRM 员工 → IAM 账号
        ConversionRule {
            id: Uuid::new_v4(),
            tenant_id,
            code: "employee_to_account".to_string(),
            name: "员工入职自动创建账号".to_string(),
            description: Some("新员工入职自动创建系统登录账号".to_string()),
            source_system: "hrm".to_string(),
            source_entity: "employee".to_string(),
            target_system: "iam".to_string(),
            target_entity: "account".to_string(),
            trigger_type: TriggerType::Event,
            trigger_condition: Some(serde_json::json!({
                "field": "status",
                "operator": "eq",
                "value": "active"
            })),
            field_mappings: serde_json::json!([
                {"source_field": "employee_number", "target_field": "username"},
                {"source_field": "name", "target_field": "display_name"},
                {"source_field": "email", "target_field": "email"},
                {"source_field": "department_name", "target_field": "department"},
                {"source_field": "position_name", "target_field": "role"}
            ]),
            transform_script: Some("username: employee_number.toLowerCase()".to_string()),
            status: RuleStatus::Active,
            priority: 5,
            is_enabled: true,
            max_retries: 5,
            retry_interval_secs: 30,
            stop_on_failure: true,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        },
        // Project 项目 → MES 项目
        ConversionRule {
            id: Uuid::new_v4(),
            tenant_id,
            code: "project_to_mes".to_string(),
            name: "项目立项同步到MES".to_string(),
            description: Some("项目立项后自动同步到MES系统".to_string()),
            source_system: "pm".to_string(),
            source_entity: "project".to_string(),
            target_system: "mes".to_string(),
            target_entity: "mes_project".to_string(),
            trigger_type: TriggerType::Event,
            trigger_condition: Some(serde_json::json!({
                "field": "status",
                "operator": "eq",
                "value": "active"
            })),
            field_mappings: serde_json::json!([
                {"source_field": "project_name", "target_field": "name"},
                {"source_field": "project_code", "target_field": "code"},
                {"source_field": "start_date", "target_field": "planned_start_date"},
                {"source_field": "end_date", "target_field": "planned_end_date"},
                {"source_field": "description", "target_field": "description"}
            ]),
            transform_script: None,
            status: RuleStatus::Active,
            priority: 15,
            is_enabled: true,
            max_retries: 3,
            retry_interval_secs: 60,
            stop_on_failure: false,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        },
    ]
}

// ==================== Database Operations ====================

/// 初始化转换规则表
pub async fn init_conversion_rules_table(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(only_own_schema_query!(
        "integration",
        r#"
        CREATE TABLE IF NOT EXISTS conversion_rules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            code VARCHAR(64) NOT NULL,
            name VARCHAR(128) NOT NULL,
            description TEXT,
            source_system VARCHAR(32) NOT NULL,
            source_entity VARCHAR(64) NOT NULL,
            target_system VARCHAR(32) NOT NULL,
            target_entity VARCHAR(64) NOT NULL,
            trigger_type VARCHAR(32) NOT NULL DEFAULT 'event',
            trigger_condition JSONB,
            field_mappings JSONB NOT NULL,
            transform_script TEXT,
            status VARCHAR(32) NOT NULL DEFAULT 'draft',
            priority INT NOT NULL DEFAULT 100,
            is_enabled BOOLEAN NOT NULL DEFAULT true,
            max_retries INT NOT NULL DEFAULT 3,
            retry_interval_secs INT NOT NULL DEFAULT 60,
            stop_on_failure BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_conversion_rules_tenant_code UNIQUE (tenant_id, code),
                deleted_at TIMESTAMP
        )
        "#
    ))
    .execute(pool)
    .await?;

    sqlx::query(only_own_schema_query!(
        "integration",
        r#"
        CREATE TABLE IF NOT EXISTS conversion_executions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            rule_id UUID NOT NULL REFERENCES conversion_rules(id),
            rule_code VARCHAR(64) NOT NULL,
            source_record_id VARCHAR(128) NOT NULL,
            target_record_id VARCHAR(128),
            source_data JSONB,
            target_data JSONB,
            status VARCHAR(32) NOT NULL DEFAULT 'pending',
            retry_count INT NOT NULL DEFAULT 0,
            error_message TEXT,
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    // 创建索引
    sqlx::query(only_own_schema_query!(
        "integration",
        "CREATE INDEX IF NOT EXISTS idx_conversion_rules_code ON conversion_rules(code)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!(
        "integration",
        "CREATE INDEX IF NOT EXISTS idx_conversion_rules_tenant ON conversion_rules(tenant_id)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!("integration", "CREATE INDEX IF NOT EXISTS idx_conversion_rules_source ON conversion_rules(source_system, source_entity)"))
        .execute(pool)
        .await?;
    sqlx::query(only_own_schema_query!("integration", "CREATE INDEX IF NOT EXISTS idx_conversion_executions_rule ON conversion_executions(rule_id)"))
        .execute(pool)
        .await?;
    sqlx::query(only_own_schema_query!("integration", "CREATE INDEX IF NOT EXISTS idx_conversion_executions_tenant ON conversion_executions(tenant_id)"))
        .execute(pool)
        .await?;
    sqlx::query(only_own_schema_query!("integration", "CREATE INDEX IF NOT EXISTS idx_conversion_executions_status ON conversion_executions(status)"))
        .execute(pool)
        .await?;

    Ok(())
}

/// 获取所有转换规则
pub async fn list_conversion_rules(pool: &PgPool) -> Result<Vec<ConversionRule>, sqlx::Error> {
    sqlx::query_as::<_, ConversionRule>(
        only_own_schema_query!("integration", "SELECT id, source_system, target_system, rule_type, source_field, target_field, transformation_type, transformation_config, priority, is_active, created_at, updated_at, deleted_at FROM integration.conversion_rules ORDER BY priority ASC, created_at DESC"),
    )
    .fetch_all(pool)
    .await
}

/// 获取指定规则的转换执行记录
pub async fn get_rule_executions(
    pool: &PgPool,
    rule_id: Uuid,
    limit: i64,
) -> Result<Vec<ConversionExecution>, sqlx::Error> {
    sqlx::query_as::<_, ConversionExecution>(
        only_own_schema_query!("integration", "SELECT id, rule_id, source_value, target_value, status, error_message, executed_at FROM integration.conversion_executions WHERE rule_id = $1 ORDER BY created_at DESC LIMIT $2"),
    )
    .bind(rule_id)
    .bind(limit)
    .fetch_all(pool)
    .await
}

/// 插入转换规则
pub async fn insert_conversion_rule(
    pool: &PgPool,
    rule: &ConversionRule,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        only_own_schema_query!("integration", r#"
        INSERT INTO integration.conversion_rules (
            id, tenant_id, code, name, description, source_system, source_entity,
            target_system, target_entity, trigger_type, trigger_condition,
            field_mappings, transform_script, status, priority, is_enabled,
            max_retries, retry_interval_secs, stop_on_failure, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        "#),
    )
    .bind(rule.id)
    .bind(rule.tenant_id)
    .bind(&rule.code)
    .bind(&rule.name)
    .bind(&rule.description)
    .bind(&rule.source_system)
    .bind(&rule.source_entity)
    .bind(&rule.target_system)
    .bind(&rule.target_entity)
    .bind(serde_json::to_string(&rule.trigger_type).unwrap_or_default())
    .bind(&rule.trigger_condition)
    .bind(&rule.field_mappings)
    .bind(&rule.transform_script)
    .bind(serde_json::to_string(&rule.status).unwrap_or_default())
    .bind(rule.priority)
    .bind(rule.is_enabled)
    .bind(rule.max_retries)
    .bind(rule.retry_interval_secs)
    .bind(rule.stop_on_failure)
    .bind(rule.created_at)
    .bind(rule.updated_at)
    .execute(pool)
    .await?;

    Ok(())
}

/// 实现 sqlx::FromRow 为 ConversionRule
impl<'r> sqlx::FromRow<'r, sqlx::postgres::PgRow> for ConversionRule {
    fn from_row(row: &'r sqlx::postgres::PgRow) -> Result<Self, sqlx::Error> {
        use sqlx::Row;
        Ok(ConversionRule {
            id: row.try_get("id")?,
            tenant_id: row.try_get("tenant_id")?,
            code: row.try_get("code")?,
            name: row.try_get("name")?,
            description: row.try_get("description")?,
            source_system: row.try_get("source_system")?,
            source_entity: row.try_get("source_entity")?,
            target_system: row.try_get("target_system")?,
            target_entity: row.try_get("target_entity")?,
            trigger_type: {
                let s: String = row.try_get("trigger_type")?;
                TriggerType::from_str(&s)
            },
            trigger_condition: row.try_get("trigger_condition")?,
            field_mappings: row.try_get("field_mappings")?,
            transform_script: row.try_get("transform_script")?,
            status: {
                let s: String = row.try_get("status")?;
                RuleStatus::from_str(&s)
            },
            priority: row.try_get("priority")?,
            is_enabled: row.try_get("is_enabled")?,
            max_retries: row.try_get("max_retries")?,
            retry_interval_secs: row.try_get("retry_interval_secs")?,
            stop_on_failure: row.try_get("stop_on_failure")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}

// ============================================================================
// 转换执行引擎
// ============================================================================

/// 执行转换规则，将源数据转换为目标数据
///
/// # 参数
/// - `rule`: 转换规则
/// - `source`: 源数据（JSON 对象）
///
/// # 返回
/// - `Ok(serde_json::Value)`: 转换后的目标数据
/// - `Err(String)`: 转换错误信息
pub fn execute_conversion(
    rule: &ConversionRule,
    source: &serde_json::Value,
) -> Result<serde_json::Value, String> {
    if !rule.is_enabled {
        return Err(format!("转换规则 '{}' 未启用", rule.code));
    }

    // 解析字段映射
    let field_mappings: Vec<FieldMapping> = match serde_json::from_value(rule.field_mappings.clone()) {
        Ok(mappings) => mappings,
        Err(e) => return Err(format!("解析字段映射失败: {}", e)),
    };

    if field_mappings.is_empty() {
        return Ok(serde_json::json!({}));
    }

    let mut target = serde_json::Map::new();

    for mapping in &field_mappings {
        match apply_field_mapping(mapping, source) {
            Ok(value) => {
                set_nested_value(&mut target, &mapping.target_field, value);
            }
            Err(e) => {
                tracing::warn!(
                    "字段映射失败: {} -> {}, 错误: {}",
                    mapping.source_field,
                    mapping.target_field,
                    e
                );
                // 如果有默认值，使用默认值
                if let Some(default) = &mapping.default_value {
                    set_nested_value(&mut target, &mapping.target_field, default.clone());
                }
            }
        }
    }

    Ok(serde_json::Value::Object(target))
}

/// 应用单个字段映射
fn apply_field_mapping(
    mapping: &FieldMapping,
    source: &serde_json::Value,
) -> Result<serde_json::Value, String> {
    // 1. 从源数据获取值
    let mut value = get_nested_value(source, &mapping.source_field);

    // 2. 如果值为空，使用默认值
    if value.is_null() {
        if let Some(default) = &mapping.default_value {
            return Ok(default.clone());
        }
        return Ok(serde_json::Value::Null);
    }

    // 3. 应用值映射（枚举转换）
    if let Some(value_map) = &mapping.value_map {
        let key = value.as_str().unwrap_or("");
        value = value_map.get(key).clone();
    }

    // 4. 应用条件映射
    if let Some(conditional_mappings) = &mapping.conditional_mappings {
        for cond_mapping in conditional_mappings {
            if evaluate_condition(&cond_mapping.condition, source) {
                value = cond_mapping.result.clone();
                break;
            }
        }
    }

    // 5. 应用转换表达式
    if let Some(transform) = &mapping.transform {
        value = evaluate_simple_transform(transform, &value)?;
    }

    Ok(value)
}

/// 获取嵌套字段值（支持 a.b.c 格式）
fn get_nested_value(source: &serde_json::Value, path: &str) -> serde_json::Value {
    let parts: Vec<&str> = path.split('.').collect();
    let mut current = source;

    for part in parts {
        match current {
            serde_json::Value::Object(map) => {
                if let Some(next) = map.get(part) {
                    current = next;
                } else {
                    return serde_json::Value::Null;
                }
            }
            _ => return serde_json::Value::Null,
        }
    }

    current.clone()
}

/// 设置嵌套字段值（支持 a.b.c 格式）
fn set_nested_value(target: &mut serde_json::Map<String, serde_json::Value>, path: &str, value: serde_json::Value) {
    let parts: Vec<&str> = path.split('.').collect();

    if parts.len() == 1 {
        target.insert(parts[0].to_string(), value);
        return;
    }

    // 递归创建嵌套对象
    let first = parts[0];
    let remaining = &parts[1..].join(".");

    let nested = target
        .entry(first.to_string())
        .or_insert_with(|| serde_json::Value::Object(serde_json::Map::new()));

    if let serde_json::Value::Object(map) = nested {
        set_nested_value(map, remaining, value);
    }
}

/// 评估条件表达式（简单实现：支持字段比较）
///
/// 支持的条件格式：
/// - `{"field": "status", "op": "eq", "value": "active"}`
/// - `{"field": "quantity", "op": "gt", "value": 100}`
/// - `{"and": [cond1, cond2]}`
/// - `{"or": [cond1, cond2]}`
fn evaluate_condition(condition: &serde_json::Value, source: &serde_json::Value) -> bool {
    match condition {
        serde_json::Value::Object(map) => {
            // AND 条件
            if let Some(and_conds) = map.get("and") {
                if let serde_json::Value::Array(conds) = and_conds {
                    return conds.iter().all(|c| evaluate_condition(c, source));
                }
            }

            // OR 条件
            if let Some(or_conds) = map.get("or") {
                if let serde_json::Value::Array(conds) = or_conds {
                    return conds.iter().any(|c| evaluate_condition(c, source));
                }
            }

            // 简单比较
            let field = match map.get("field").and_then(|v| v.as_str()) {
                Some(f) => f,
                None => return false,
            };

            let op = map.get("op").and_then(|v| v.as_str()).unwrap_or("eq");
            let expected = map.get("value");
            let actual = get_nested_value(source, field);

            match op {
                "eq" => Some(&actual) == expected,
                "ne" => Some(&actual) != expected,
                "gt" => compare_values(&actual, &expected.cloned().unwrap_or(serde_json::Value::Null)) == Some(std::cmp::Ordering::Greater),
                "gte" => {
                    matches!(
                        compare_values(&actual, &expected.cloned().unwrap_or(serde_json::Value::Null)),
                        Some(std::cmp::Ordering::Greater) | Some(std::cmp::Ordering::Equal)
                    )
                }
                "lt" => compare_values(&actual, &expected.cloned().unwrap_or(serde_json::Value::Null)) == Some(std::cmp::Ordering::Less),
                "lte" => {
                    matches!(
                        compare_values(&actual, &expected.cloned().unwrap_or(serde_json::Value::Null)),
                        Some(std::cmp::Ordering::Less) | Some(std::cmp::Ordering::Equal)
                    )
                }
                "contains" => actual
                    .as_str()
                    .map(|s| expected.and_then(|e| e.as_str()).map(|e| s.contains(e)).unwrap_or(false))
                    .unwrap_or(false),
                "exists" => !actual.is_null(),
                _ => false,
            }
        }
        _ => false,
    }
}

/// 比较两个 JSON 值（仅支持数字和字符串）
fn compare_values(a: &serde_json::Value, b: &serde_json::Value) -> Option<std::cmp::Ordering> {
    // 数字比较
    if let (Some(a_num), Some(b_num)) = (a.as_f64(), b.as_f64()) {
        return a_num.partial_cmp(&b_num);
    }

    // 字符串比较
    if let (Some(a_str), Some(b_str)) = (a.as_str(), b.as_str()) {
        return Some(a_str.cmp(b_str));
    }

    None
}

/// 评估简单转换表达式
///
/// 支持的转换：
/// - `toUpperCase`: 转大写
/// - `toLowerCase`: 转小写
/// - `trim`: 去空格
/// - `toString`: 转字符串
/// - `toNumber`: 转数字
/// - `toBoolean`: 转布尔
/// - `prefix:xxx`: 添加前缀
/// - `suffix:xxx`: 添加后缀
fn evaluate_simple_transform(
    transform: &str,
    value: &serde_json::Value,
) -> Result<serde_json::Value, String> {
    match transform {
        "toUpperCase" => {
            let s = value.as_str().unwrap_or("");
            Ok(serde_json::Value::String(s.to_uppercase()))
        }
        "toLowerCase" => {
            let s = value.as_str().unwrap_or("");
            Ok(serde_json::Value::String(s.to_lowercase()))
        }
        "trim" => {
            let s = value.as_str().unwrap_or("");
            Ok(serde_json::Value::String(s.trim().to_string()))
        }
        "toString" => {
            let s = match value {
                serde_json::Value::String(s) => s.clone(),
                serde_json::Value::Number(n) => n.to_string(),
                serde_json::Value::Bool(b) => b.to_string(),
                _ => value.to_string(),
            };
            Ok(serde_json::Value::String(s))
        }
        "toNumber" => {
            let n = match value {
                serde_json::Value::Number(n) => n.as_f64().unwrap_or(0.0),
                serde_json::Value::String(s) => s.parse::<f64>().unwrap_or(0.0),
                _ => 0.0,
            };
            Ok(serde_json::json!(n))
        }
        "toBoolean" => {
            let b = match value {
                serde_json::Value::Bool(b) => *b,
                serde_json::Value::String(s) => s.eq_ignore_ascii_case("true") || s == "1",
                serde_json::Value::Number(n) => n.as_f64().unwrap_or(0.0) != 0.0,
                _ => false,
            };
            Ok(serde_json::Value::Bool(b))
        }
        _ if transform.starts_with("prefix:") => {
            let prefix = &transform["prefix:".len()..];
            let s = value.as_str().unwrap_or("");
            Ok(serde_json::Value::String(format!("{}{}", prefix, s)))
        }
        _ if transform.starts_with("suffix:") => {
            let suffix = &transform["suffix:".len()..];
            let s = value.as_str().unwrap_or("");
            Ok(serde_json::Value::String(format!("{}{}", s, suffix)))
        }
        _ => Err(format!("不支持的转换表达式: {}", transform)),
    }
}

/// 批量执行转换规则（按优先级排序）
pub fn execute_conversions(
    rules: &[ConversionRule],
    source: &serde_json::Value,
) -> Result<serde_json::Value, String> {
    let mut sorted_rules: Vec<&ConversionRule> = rules
        .iter()
        .filter(|r| r.is_enabled && matches!(r.status, RuleStatus::Active))
        .collect();

    sorted_rules.sort_by_key(|r| r.priority);

    let mut result = source.clone();

    for rule in sorted_rules {
        result = execute_conversion(rule, &result)?;
    }

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- RuleStatus serde roundtrip (3 tests) ----

    #[test]
    fn test_rule_status_active_serde_roundtrip() {
        let original = RuleStatus::Active;
        let json = serde_json::to_string(&original).expect("serialize Active");
        let back: RuleStatus = serde_json::from_str(&json).expect("deserialize Active");
        assert_eq!(original, back);
        assert_eq!(original.as_str(), "active");
    }

    #[test]
    fn test_rule_status_inactive_serde_roundtrip() {
        let original = RuleStatus::Inactive;
        let json = serde_json::to_string(&original).expect("serialize Inactive");
        let back: RuleStatus = serde_json::from_str(&json).expect("deserialize Inactive");
        assert_eq!(original, back);
        assert_eq!(original.as_str(), "inactive");
    }

    #[test]
    fn test_rule_status_draft_serde_roundtrip() {
        let original = RuleStatus::Draft;
        let json = serde_json::to_string(&original).expect("serialize Draft");
        let back: RuleStatus = serde_json::from_str(&json).expect("deserialize Draft");
        assert_eq!(original, back);
        assert_eq!(original.as_str(), "draft");
    }

    // ---- RuleStatus from_str (2 tests) ----

    #[test]
    fn test_rule_status_from_str_known_values() {
        assert_eq!(RuleStatus::from_str("active"), RuleStatus::Active);
        assert_eq!(RuleStatus::from_str("inactive"), RuleStatus::Inactive);
        assert_eq!(RuleStatus::from_str("draft"), RuleStatus::Draft);
    }

    #[test]
    fn test_rule_status_from_str_unknown_defaults_to_draft() {
        assert_eq!(RuleStatus::from_str("bogus"), RuleStatus::Draft);
    }

    // ---- TriggerType serde roundtrip (3 tests) ----

    #[test]
    fn test_trigger_type_event_serde_roundtrip() {
        let original = TriggerType::Event;
        let json = serde_json::to_string(&original).expect("serialize Event");
        let back: TriggerType = serde_json::from_str(&json).expect("deserialize Event");
        assert_eq!(original.as_str(), back.as_str());
        assert_eq!(original.as_str(), "event");
    }

    #[test]
    fn test_trigger_type_scheduled_serde_roundtrip() {
        let original = TriggerType::Scheduled;
        let json = serde_json::to_string(&original).expect("serialize Scheduled");
        let back: TriggerType = serde_json::from_str(&json).expect("deserialize Scheduled");
        assert_eq!(original.as_str(), back.as_str());
        assert_eq!(original.as_str(), "scheduled");
    }

    #[test]
    fn test_trigger_type_manual_serde_roundtrip() {
        let original = TriggerType::Manual;
        let json = serde_json::to_string(&original).expect("serialize Manual");
        let back: TriggerType = serde_json::from_str(&json).expect("deserialize Manual");
        assert_eq!(original.as_str(), back.as_str());
        assert_eq!(original.as_str(), "manual");
    }

    // ---- TriggerType from_str (1 test) ----

    #[test]
    fn test_trigger_type_from_str_known_and_unknown() {
        assert_eq!(TriggerType::from_str("event").as_str(), "event");
        assert_eq!(TriggerType::from_str("scheduled").as_str(), "scheduled");
        assert_eq!(TriggerType::from_str("manual").as_str(), "manual");
        assert_eq!(TriggerType::from_str("unknown").as_str(), "event");
    }

    // ---- Struct serde roundtrips (5 tests) ----

    #[test]
    fn test_field_mapping_serde_roundtrip() {
        let mapping = FieldMapping {
            source_field: "order_number".to_string(),
            target_field: "source_order_number".to_string(),
            default_value: Some(serde_json::json!("N/A")),
            transform: Some("lower".to_string()),
            value_map: None,
            conditional_mappings: None,
        };
        let json = serde_json::to_string(&mapping).expect("serialize FieldMapping");
        let back: FieldMapping = serde_json::from_str(&json).expect("deserialize FieldMapping");
        assert_eq!(back.source_field, "order_number");
        assert_eq!(back.target_field, "source_order_number");
        assert_eq!(back.transform, Some("lower".to_string()));
        assert!(back.value_map.is_none());
    }

    #[test]
    fn test_value_map_serde_roundtrip() {
        let mut mappings = std::collections::HashMap::new();
        mappings.insert("active".to_string(), serde_json::json!(1));
        mappings.insert("inactive".to_string(), serde_json::json!(0));
        let value_map = ValueMap {
            mappings,
            default_value: Some(serde_json::json!(-1)),
        };
        let json = serde_json::to_string(&value_map).expect("serialize ValueMap");
        let back: ValueMap = serde_json::from_str(&json).expect("deserialize ValueMap");
        assert_eq!(back.mappings.len(), 2);
        assert_eq!(back.get("active"), &serde_json::json!(1));
        assert_eq!(back.get("inactive"), &serde_json::json!(0));
        assert_eq!(back.get("missing"), &serde_json::json!(-1));
    }

    #[test]
    fn test_value_map_returns_null_when_no_default() {
        let value_map = ValueMap {
            mappings: std::collections::HashMap::new(),
            default_value: None,
        };
        assert_eq!(value_map.get("anything"), &serde_json::Value::Null);
    }

    #[test]
    fn test_conditional_mapping_serde_roundtrip() {
        let cm = ConditionalMapping {
            condition: serde_json::json!({"field": "status", "op": "eq", "value": "active"}),
            result: serde_json::json!({"enabled": true}),
        };
        let json = serde_json::to_string(&cm).expect("serialize ConditionalMapping");
        let back: ConditionalMapping =
            serde_json::from_str(&json).expect("deserialize ConditionalMapping");
        assert_eq!(back.condition, cm.condition);
        assert_eq!(back.result, cm.result);
    }

    #[test]
    fn test_conversion_rule_serde_roundtrip() {
        let rule = ConversionRule {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            code: "test_rule".to_string(),
            name: "Test Rule".to_string(),
            description: Some("desc".to_string()),
            source_system: "erp".to_string(),
            source_entity: "sales_order".to_string(),
            target_system: "mes".to_string(),
            target_entity: "production_order".to_string(),
            trigger_type: TriggerType::Event,
            trigger_condition: None,
            field_mappings: serde_json::json!([{"source_field": "a", "target_field": "b"}]),
            transform_script: None,
            status: RuleStatus::Active,
            priority: 10,
            is_enabled: true,
            max_retries: 3,
            retry_interval_secs: 60,
            stop_on_failure: false,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let json = serde_json::to_string(&rule).expect("serialize ConversionRule");
        let back: ConversionRule = serde_json::from_str(&json).expect("deserialize ConversionRule");
        assert_eq!(back.code, "test_rule");
        assert_eq!(back.source_system, "erp");
        assert_eq!(back.trigger_type.as_str(), "event");
        assert_eq!(back.status, RuleStatus::Active);
    }

    // ---- get_predefined_rules (2 tests) ----

    #[test]
    fn test_get_predefined_rules_returns_four_rules() {
        let tenant = Uuid::new_v4();
        let rules = get_predefined_rules(tenant);
        assert_eq!(rules.len(), 4);
        for rule in &rules {
            assert_eq!(rule.tenant_id, tenant);
            assert!(matches!(rule.status, RuleStatus::Active));
            assert!(rule.is_enabled);
        }
    }

    #[test]
    fn test_get_predefined_rules_codes_are_unique() {
        let tenant = Uuid::new_v4();
        let rules = get_predefined_rules(tenant);
        let codes: Vec<&str> = rules.iter().map(|r| r.code.as_str()).collect();
        let mut deduped = codes.clone();
        deduped.sort();
        deduped.dedup();
        assert_eq!(codes.len(), deduped.len(), "rule codes must be unique");
        assert!(codes.contains(&"order_to_workorder"));
        assert!(codes.contains(&"purchase_to_contract"));
        assert!(codes.contains(&"employee_to_account"));
        assert!(codes.contains(&"project_to_mes"));
    }

    // ---- 转换执行引擎测试 ----

    fn make_test_rule(field_mappings: Vec<FieldMapping>) -> ConversionRule {
        ConversionRule {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            code: "test_rule".to_string(),
            name: "Test Rule".to_string(),
            description: None,
            source_system: "erp".to_string(),
            source_entity: "order".to_string(),
            target_system: "wms".to_string(),
            target_entity: "outbound".to_string(),
            trigger_type: TriggerType::Manual,
            trigger_condition: None,
            field_mappings: serde_json::to_value(&field_mappings).unwrap(),
            transform_script: None,
            status: RuleStatus::Active,
            priority: 1,
            is_enabled: true,
            max_retries: 3,
            retry_interval_secs: 60,
            stop_on_failure: false,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn test_execute_conversion_basic_field_mapping() {
        let mappings = vec![FieldMapping {
            source_field: "order_no".to_string(),
            target_field: "source_order_no".to_string(),
            default_value: None,
            transform: None,
            value_map: None,
            conditional_mappings: None,
        }];
        let rule = make_test_rule(mappings);
        let source = serde_json::json!({"order_no": "ORD-001", "status": "active"});

        let result = execute_conversion(&rule, &source).unwrap();
        assert_eq!(result["source_order_no"], "ORD-001");
    }

    #[test]
    fn test_execute_conversion_default_value() {
        let mappings = vec![FieldMapping {
            source_field: "missing_field".to_string(),
            target_field: "target_field".to_string(),
            default_value: Some(serde_json::json!("default")),
            transform: None,
            value_map: None,
            conditional_mappings: None,
        }];
        let rule = make_test_rule(mappings);
        let source = serde_json::json!({"order_no": "ORD-001"});

        let result = execute_conversion(&rule, &source).unwrap();
        assert_eq!(result["target_field"], "default");
    }

    #[test]
    fn test_execute_conversion_transform_to_upper() {
        let mappings = vec![FieldMapping {
            source_field: "name".to_string(),
            target_field: "name_upper".to_string(),
            default_value: None,
            transform: Some("toUpperCase".to_string()),
            value_map: None,
            conditional_mappings: None,
        }];
        let rule = make_test_rule(mappings);
        let source = serde_json::json!({"name": "hello"});

        let result = execute_conversion(&rule, &source).unwrap();
        assert_eq!(result["name_upper"], "HELLO");
    }

    #[test]
    fn test_execute_conversion_value_map() {
        let mut mappings_hash = std::collections::HashMap::new();
        mappings_hash.insert("active".to_string(), serde_json::json!(1));
        mappings_hash.insert("inactive".to_string(), serde_json::json!(0));

        let mappings = vec![FieldMapping {
            source_field: "status".to_string(),
            target_field: "status_code".to_string(),
            default_value: Some(serde_json::json!(-1)),
            transform: None,
            value_map: Some(ValueMap {
                mappings: mappings_hash,
                default_value: Some(serde_json::json!(-1)),
            }),
            conditional_mappings: None,
        }];
        let rule = make_test_rule(mappings);
        let source = serde_json::json!({"status": "active"});

        let result = execute_conversion(&rule, &source).unwrap();
        assert_eq!(result["status_code"], 1);
    }

    #[test]
    fn test_execute_conversion_nested_fields() {
        let mappings = vec![FieldMapping {
            source_field: "customer.name".to_string(),
            target_field: "customer_name".to_string(),
            default_value: None,
            transform: None,
            value_map: None,
            conditional_mappings: None,
        }];
        let rule = make_test_rule(mappings);
        let source = serde_json::json!({"customer": {"name": "John", "email": "john@test.com"}});

        let result = execute_conversion(&rule, &source).unwrap();
        assert_eq!(result["customer_name"], "John");
    }

    #[test]
    fn test_execute_conversion_disabled_rule() {
        let mut rule = make_test_rule(vec![]);
        rule.is_enabled = false;
        let source = serde_json::json!({});

        let result = execute_conversion(&rule, &source);
        assert!(result.is_err());
    }

    #[test]
    fn test_execute_conversion_prefix_suffix() {
        let mappings = vec![
            FieldMapping {
                source_field: "code".to_string(),
                target_field: "prefixed".to_string(),
                default_value: None,
                transform: Some("prefix:PRE-".to_string()),
                value_map: None,
                conditional_mappings: None,
            },
            FieldMapping {
                source_field: "code".to_string(),
                target_field: "suffixed".to_string(),
                default_value: None,
                transform: Some("suffix:-SUF".to_string()),
                value_map: None,
                conditional_mappings: None,
            },
        ];
        let rule = make_test_rule(mappings);
        let source = serde_json::json!({"code": "123"});

        let result = execute_conversion(&rule, &source).unwrap();
        assert_eq!(result["prefixed"], "PRE-123");
        assert_eq!(result["suffixed"], "123-SUF");
    }
}
