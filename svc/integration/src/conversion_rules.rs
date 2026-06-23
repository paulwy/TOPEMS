//! Data Conversion Rules Module
//!
//! 实现模块间的数据自动流转规则

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
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
            self.default_value.as_ref().unwrap_or(&serde_json::Value::Null)
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
    pub rule_id: Uuid,
    pub rule_code: String,
    pub source_record_id: String,
    pub target_record_id: Option<String>,
    pub source_data: Option<serde_json::Value>,
    pub target_data: Option<serde_json::Value>,
    pub status: String,  // pending, running, completed, failed
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
pub fn get_predefined_rules() -> Vec<ConversionRule> {
    vec![
        // ERP 订单 → MES 工单
        ConversionRule {
            id: Uuid::new_v4(),
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
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS conversion_rules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code VARCHAR(64) NOT NULL UNIQUE,
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
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS conversion_executions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
        "#,
    )
    .execute(pool)
    .await?;

    // 创建索引
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_conversion_rules_code ON conversion_rules(code)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_conversion_rules_source ON conversion_rules(source_system, source_entity)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_conversion_executions_rule ON conversion_executions(rule_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_conversion_executions_status ON conversion_executions(status)")
        .execute(pool)
        .await?;

    Ok(())
}

/// 获取所有转换规则
pub async fn list_conversion_rules(pool: &PgPool) -> Result<Vec<ConversionRule>, sqlx::Error> {
    sqlx::query_as::<_, ConversionRule>(
        "SELECT * FROM conversion_rules ORDER BY priority ASC, created_at DESC"
    )
    .fetch_all(pool)
    .await
}

/// 获取指定规则的转换执行记录
pub async fn get_rule_executions(
    pool: &PgPool, 
    rule_id: Uuid, 
    limit: i64
) -> Result<Vec<ConversionExecution>, sqlx::Error> {
    sqlx::query_as::<_, ConversionExecution>(
        "SELECT * FROM conversion_executions WHERE rule_id = $1 ORDER BY created_at DESC LIMIT $2"
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
        r#"
        INSERT INTO conversion_rules (
            id, code, name, description, source_system, source_entity,
            target_system, target_entity, trigger_type, trigger_condition,
            field_mappings, transform_script, status, priority, is_enabled,
            max_retries, retry_interval_secs, stop_on_failure, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        "#,
    )
    .bind(rule.id)
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