//! V39.0 AC-11: 主数据质量规则引擎
//!
//! 提供质量规则的 CRUD、批量执行质量检查、查询质量报告功能。
//! 支持 6 种规则类型：必填、格式（正则）、范围（min/max）、唯一性、引用完整性、自定义 SQL。
//! 从 master_data_refs.rs 拆分。

use axum::extract::{Extension, Path, Query, State};
use axum::Json;
use serde::Deserialize;
use topems_shared::ApiResponse;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::PaginatedResponse;

use super::master_data_refs::{MasterDataRef, MasterDataRow};
use super::ApiState;

/// 规则类型枚举
#[derive(Debug, Clone, serde::Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QualityRuleType {
    /// 必填
    Required,
    /// 格式校验（正则）
    Format,
    /// 范围校验（min/max）
    Range,
    /// 唯一性
    Uniqueness,
    /// 引用完整性
    Reference,
    /// 自定义 SQL
    Custom,
}

impl QualityRuleType {
    fn from_str(s: &str) -> Self {
        match s {
            "format" => Self::Format,
            "range" => Self::Range,
            "uniqueness" => Self::Uniqueness,
            "reference" => Self::Reference,
            "custom" => Self::Custom,
            _ => Self::Required,
        }
    }
    fn as_str(&self) -> &'static str {
        match self {
            Self::Required => "required",
            Self::Format => "format",
            Self::Range => "range",
            Self::Uniqueness => "uniqueness",
            Self::Reference => "reference",
            Self::Custom => "custom",
        }
    }
}

/// 规则严重级别
#[derive(Debug, Clone, serde::Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
#[derive(Default)]
pub enum QualitySeverity {
    /// 错误（必须修复）
    #[default]
    Error,
    /// 警告
    Warning,
    /// 提示
    Info,
}

impl QualitySeverity {
    fn from_str(s: &str) -> Self {
        match s {
            "warning" => Self::Warning,
            "info" => Self::Info,
            _ => Self::Error,
        }
    }
    fn as_str(&self) -> &'static str {
        match self {
            Self::Error => "error",
            Self::Warning => "warning",
            Self::Info => "info",
        }
    }
}

/// 质量规则定义
#[derive(Debug, Clone, serde::Serialize)]
pub struct QualityRule {
    pub id: uuid::Uuid,
    pub name: String,
    pub description: String,
    pub domain: String,
    pub field_name: String,
    pub rule_type: QualityRuleType,
    pub severity: QualitySeverity,
    pub config: serde_json::Value,
    pub is_active: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// 质量检查结果
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct QualityIssue {
    pub rule_id: uuid::Uuid,
    pub rule_name: String,
    pub master_data_id: String,
    pub field_name: String,
    pub current_value: Option<String>,
    pub expected: String,
    pub severity: QualitySeverity,
    /// 自动修复建议
    pub suggestion: Option<String>,
}

/// 质量报告
#[derive(Debug, Clone, serde::Serialize)]
pub struct QualityReport {
    pub id: uuid::Uuid,
    pub domain: Option<String>,
    pub total_checked: u64,
    pub total_issues: u64,
    pub errors: u64,
    pub warnings: u64,
    pub info: u64,
    pub issues: Vec<QualityIssue>,
    pub generated_at: chrono::DateTime<chrono::Utc>,
}

// --- 请求/查询类型 ---

#[derive(Debug, Deserialize)]
pub struct CreateQualityRuleRequest {
    pub name: String,
    pub description: Option<String>,
    pub domain: String,
    pub field_name: String,
    pub rule_type: QualityRuleType,
    pub severity: Option<QualitySeverity>,
    pub config: Option<serde_json::Value>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateQualityRuleRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub domain: Option<String>,
    pub field_name: Option<String>,
    pub rule_type: Option<QualityRuleType>,
    pub severity: Option<QualitySeverity>,
    pub config: Option<serde_json::Value>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct ListQualityRulesQuery {
    pub domain: Option<String>,
    pub is_active: Option<bool>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct RunQualityCheckRequest {
    pub domain: Option<String>,
    pub rule_ids: Option<Vec<uuid::Uuid>>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct QualityReportQuery {
    pub domain: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

const QUALITY_RULE_COLUMNS: &str =
    "id, name, description, domain, field_name, rule_type, severity, config, is_active, created_at, updated_at";

// --- 内部辅助 ---

fn quality_rule_from_row(row: &sqlx::postgres::PgRow) -> Result<QualityRule, sqlx::Error> {
    use sqlx::Row;
    let rule_type_str: String = row.try_get("rule_type")?;
    let severity_str: String = row.try_get("severity")?;
    Ok(QualityRule {
        id: row.try_get("id")?,
        name: row.try_get("name")?,
        description: row.try_get("description")?,
        domain: row.try_get("domain")?,
        field_name: row.try_get("field_name")?,
        rule_type: QualityRuleType::from_str(&rule_type_str),
        severity: QualitySeverity::from_str(&severity_str),
        config: row.try_get("config")?,
        is_active: row.try_get("is_active")?,
        created_at: row.try_get("created_at")?,
        updated_at: row.try_get("updated_at")?,
    })
}

fn quality_report_from_row(row: &sqlx::postgres::PgRow) -> Result<QualityReport, sqlx::Error> {
    use sqlx::Row;
    let issues_val: serde_json::Value = row.try_get("issues")?;
    let issues: Vec<QualityIssue> = serde_json::from_value(issues_val).unwrap_or_default();
    Ok(QualityReport {
        id: row.try_get("id")?,
        domain: row.try_get("domain")?,
        total_checked: row.try_get::<i64, _>("total_checked")? as u64,
        total_issues: row.try_get::<i64, _>("total_issues")? as u64,
        errors: row.try_get::<i64, _>("errors")? as u64,
        warnings: row.try_get::<i64, _>("warnings")? as u64,
        info: row.try_get::<i64, _>("info")? as u64,
        issues,
        generated_at: row.try_get("generated_at")?,
    })
}

/// 从 MasterDataRef 中按字段名提取值
fn get_record_field(record: &MasterDataRef, field_name: &str) -> Option<String> {
    match field_name {
        "master_data_id" => Some(record.master_data_id.clone()),
        "tenant_id" => Some(record.tenant_id.clone()),
        "domain" => Some(record.domain.clone()),
        "code" => Some(record.code.clone()),
        "name" => record.name.clone(),
        "status" => Some(record.status.clone()),
        "source_service" => Some(record.source_service.clone()),
        "local_entity_type" => record.local_entity_type.clone(),
        "local_entity_id" => record.local_entity_id.clone(),
        _ => None,
    }
}

/// 校验 SQL 标识符（防注入）
fn is_valid_identifier(s: &str) -> bool {
    !s.is_empty()
        && s.chars().all(|c| c.is_alphanumeric() || c == '_')
        && !s.chars().next().map(|c| c.is_numeric()).unwrap_or(false)
}

// --- CRUD handlers ---

/// V39.0 AC-11: 创建质量规则
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/api/erp/master-data-refs/quality-rules",
    tag = "Master Data",
    operation_id = "create_quality_rule",
    responses((status = 200, description = "OK")),
)]
pub async fn create_quality_rule(
    State(_state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateQualityRuleRequest>,
) -> Json<ApiResponse<QualityRule>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let id = uuid::Uuid::new_v4();
    let now = chrono::Utc::now();
    let description = req.description.unwrap_or_default();
    let severity = req.severity.unwrap_or_default();
    let config = req.config.unwrap_or(serde_json::json!({}));
    let is_active = req.is_active.unwrap_or(true);

    let result = sqlx::query(
        only_own_schema_query!("erp", r#"INSERT INTO erp_master_data_quality_rules
           (id, name, description, domain, field_name, rule_type, severity, config, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)"#),
    )
    .bind(id)
    .bind(&req.name)
    .bind(&description)
    .bind(&req.domain)
    .bind(&req.field_name)
    .bind(req.rule_type.as_str())
    .bind(severity.as_str())
    .bind(&config)
    .bind(is_active)
    .bind(now)
    .bind(now)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(_) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Json(ApiResponse::error(500, "事务提交失败"));
                }
            }
            Json(ApiResponse::success(
                QualityRule {
                    id,
                    name: req.name,
                    description,
                    domain: req.domain,
                    field_name: req.field_name,
                    rule_type: req.rule_type,
                    severity,
                    config,
                    is_active,
                    created_at: now,
                    updated_at: now,
                },
                "质量规则创建成功",
            ))
        }
        Err(e) => {
            tracing::warn!("[erp-mdm] 创建质量规则失败: {}", e);
            Json(ApiResponse::error(500, &format!("创建质量规则失败: {}", e)))
        }
    }
}

/// V39.0 AC-11: 列出质量规则（支持 domain 过滤 + 分页）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/quality-rules",
    tag = "Master Data",
    operation_id = "list_quality_rules",
    params(ListQualityRulesQuery),
    responses((status = 200, description = "OK")),
)]
pub async fn list_quality_rules(
    State(_state): State<ApiState>,
    Query(params): Query<ListQualityRulesQuery>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PaginatedResponse<QualityRule>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let sql_base = format!(
        "SELECT {} FROM erp_master_data_quality_rules",
        QUALITY_RULE_COLUMNS
    );

    let rows = match (params.domain.as_ref(), params.is_active) {
        (Some(domain), Some(is_active)) => {
            sqlx::query(&format!(
            "{} WHERE domain = $1 AND is_active = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
            sql_base
        ))
            .bind(domain)
            .bind(is_active)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&mut **txn)
            .await
        }
        (Some(domain), None) => {
            sqlx::query(&format!(
                "{} WHERE domain = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
                sql_base
            ))
            .bind(domain)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&mut **txn)
            .await
        }
        (None, Some(is_active)) => {
            sqlx::query(&format!(
                "{} WHERE is_active = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
                sql_base
            ))
            .bind(is_active)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&mut **txn)
            .await
        }
        (None, None) => {
            sqlx::query(&format!(
                "{} ORDER BY created_at DESC LIMIT $1 OFFSET $2",
                sql_base
            ))
            .bind(page_size)
            .bind(offset)
            .fetch_all(&mut **txn)
            .await
        }
    };

    match rows {
        Ok(rows) => {
            let items: Vec<QualityRule> = rows
                .iter()
                .filter_map(|r| quality_rule_from_row(r).ok())
                .collect();
            let total = items.len() as i64;
            Json(ApiResponse::success(
                PaginatedResponse::new(items, total, page, page_size),
                "质量规则列表",
            ))
        }
        Err(e) => {
            tracing::warn!("[erp-mdm] 查询质量规则失败: {}", e);
            Json(ApiResponse::success(
                PaginatedResponse::new(vec![], 0, page, page_size),
                "质量规则列表（空）",
            ))
        }
    }
}

/// V39.0 AC-11: 获取质量规则详情
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/quality-rules/{rule_id}",
    tag = "Master Data",
    operation_id = "get_quality_rule",
    responses((status = 200, description = "OK")),
)]
pub async fn get_quality_rule(
    State(_state): State<ApiState>,
    Path(rule_id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<QualityRule>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let rid = match uuid::Uuid::parse_str(&rule_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的规则 ID")),
    };

    let sql = format!(
        "SELECT {} FROM erp_master_data_quality_rules WHERE deleted_at IS NULL AND id = $1",
        QUALITY_RULE_COLUMNS
    );
    match sqlx::query(&sql).bind(rid).fetch_optional(&mut **txn).await {
        Ok(Some(row)) => match quality_rule_from_row(&row) {
            Ok(rule) => Json(ApiResponse::success(rule, "质量规则详情")),
            Err(e) => {
                tracing::warn!("[erp-mdm] 解析质量规则失败: {}", e);
                Json(ApiResponse::error(500, &format!("解析规则失败: {}", e)))
            }
        },
        Ok(None) => Json(ApiResponse::error(404, "未找到质量规则")),
        Err(e) => {
            tracing::warn!("[erp-mdm] 查询质量规则失败: {}", e);
            Json(ApiResponse::error(500, &format!("查询失败: {}", e)))
        }
    }
}

/// V39.0 AC-11: 更新质量规则
#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/api/erp/master-data-refs/quality-rules/{rule_id}",
    tag = "Master Data",
    operation_id = "update_quality_rule",
    responses((status = 200, description = "OK")),
)]
pub async fn update_quality_rule(
    State(_state): State<ApiState>,
    Path(rule_id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateQualityRuleRequest>,
) -> Json<ApiResponse<QualityRule>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let rid = match uuid::Uuid::parse_str(&rule_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的规则 ID")),
    };

    // 先查询现有规则
    let sql_select = format!(
        "SELECT {} FROM erp_master_data_quality_rules WHERE deleted_at IS NULL AND id = $1",
        QUALITY_RULE_COLUMNS
    );
    let existing = match sqlx::query(&sql_select)
        .bind(rid)
        .fetch_optional(&mut **txn)
        .await
    {
        Ok(Some(row)) => quality_rule_from_row(&row),
        Ok(None) => return Json(ApiResponse::error(404, "未找到质量规则")),
        Err(e) => {
            tracing::warn!("[erp-mdm] 查询质量规则失败: {}", e);
            return Json(ApiResponse::error(500, &format!("查询失败: {}", e)));
        }
    };

    let existing = match existing {
        Ok(r) => r,
        Err(e) => return Json(ApiResponse::error(500, &format!("解析失败: {}", e))),
    };

    let now = chrono::Utc::now();
    let name = req.name.unwrap_or(existing.name);
    let description = req.description.unwrap_or(existing.description);
    let domain = req.domain.unwrap_or(existing.domain);
    let field_name = req.field_name.unwrap_or(existing.field_name);
    let rule_type = req.rule_type.unwrap_or(existing.rule_type);
    let severity = req.severity.unwrap_or(existing.severity);
    let config = req.config.unwrap_or(existing.config);
    let is_active = req.is_active.unwrap_or(existing.is_active);

    let result = sqlx::query(only_own_schema_query!(
        "erp",
        r#"UPDATE erp_master_data_quality_rules
           SET name = $1, description = $2, domain = $3, field_name = $4,
               rule_type = $5, severity = $6, config = $7, is_active = $8, updated_at = $9
           WHERE id = $10"#
    ))
    .bind(&name)
    .bind(&description)
    .bind(&domain)
    .bind(&field_name)
    .bind(rule_type.as_str())
    .bind(severity.as_str())
    .bind(&config)
    .bind(is_active)
    .bind(now)
    .bind(rid)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(_) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Json(ApiResponse::error(500, "事务提交失败"));
                }
            }
            Json(ApiResponse::success(
                QualityRule {
                    id: rid,
                    name,
                    description,
                    domain,
                    field_name,
                    rule_type,
                    severity,
                    config,
                    is_active,
                    created_at: existing.created_at,
                    updated_at: now,
                },
                "质量规则更新成功",
            ))
        }
        Err(e) => {
            tracing::warn!("[erp-mdm] 更新质量规则失败: {}", e);
            Json(ApiResponse::error(500, &format!("更新失败: {}", e)))
        }
    }
}

/// V39.0 AC-11: 删除质量规则
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:delete"])),
    path = "/api/erp/master-data-refs/quality-rules/{rule_id}",
    tag = "Master Data",
    operation_id = "delete_quality_rule",
    responses((status = 200, description = "OK")),
)]
pub async fn delete_quality_rule(
    State(_state): State<ApiState>,
    Path(rule_id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let rid = match uuid::Uuid::parse_str(&rule_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的规则 ID")),
    };

    let result = sqlx::query(only_own_schema_query!(
        "erp",
        "UPDATE erp_master_data_quality_rules SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(rid)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(res) => {
            if res.rows_affected() == 0 {
                Json(ApiResponse::error(404, "未找到质量规则"))
            } else {
                if let Some(t) = guard.take() {
                    if let Err(e) = t.commit().await {
                        tracing::error!("事务提交失败: {}", e);
                        return Json(ApiResponse::error(500, "事务提交失败"));
                    }
                }
                Json(ApiResponse::success(
                    serde_json::json!({ "rule_id": rule_id, "deleted": true }),
                    "质量规则删除成功",
                ))
            }
        }
        Err(e) => {
            tracing::warn!("[erp-mdm] 删除质量规则失败: {}", e);
            Json(ApiResponse::error(500, &format!("删除失败: {}", e)))
        }
    }
}

// --- 规则执行引擎 ---

/// V39.0 AC-11: 批量执行质量检查
///
/// 查询 erp_master_data_refs → 对每条记录应用匹配规则 → 收集问题 → 生成并持久化报告
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/api/erp/master-data-refs/quality-check",
    tag = "Master Data",
    operation_id = "run_quality_check",
    responses((status = 200, description = "OK")),
)]
pub async fn run_quality_check(
    State(_state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<RunQualityCheckRequest>,
) -> Json<ApiResponse<QualityReport>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    // 1. 加载规则
    let rules = load_quality_rules(txn, req.domain.as_deref(), req.rule_ids.as_deref()).await;
    if rules.is_empty() {
        return Json(ApiResponse::error(404, "未找到匹配的质量规则"));
    }

    // 2. 加载主数据记录（排除已销毁）
    let records = load_records_for_quality(txn, req.domain.as_deref()).await;

    // 3. 逐条规则执行校验
    let mut all_issues = Vec::new();
    for rule in &rules {
        if !rule.is_active {
            continue;
        }
        let issues = execute_rule(txn, rule, &records).await;
        all_issues.extend(issues);
    }

    // 4. 统计并构建报告
    let errors = all_issues
        .iter()
        .filter(|i| matches!(i.severity, QualitySeverity::Error))
        .count() as u64;
    let warnings = all_issues
        .iter()
        .filter(|i| matches!(i.severity, QualitySeverity::Warning))
        .count() as u64;
    let info = all_issues
        .iter()
        .filter(|i| matches!(i.severity, QualitySeverity::Info))
        .count() as u64;

    let report = QualityReport {
        id: uuid::Uuid::new_v4(),
        domain: req.domain.clone(),
        total_checked: records.len() as u64,
        total_issues: all_issues.len() as u64,
        errors,
        warnings,
        info,
        issues: all_issues,
        generated_at: chrono::Utc::now(),
    };

    // 5. 持久化报告
    let issues_json = serde_json::to_value(&report.issues).unwrap_or(serde_json::json!([]));
    let total_checked = records.len() as u64;
    let total_issues = report.total_issues;
    let _ = sqlx::query(only_own_schema_query!(
        "erp",
        r#"INSERT INTO erp_master_data_quality_reports
           (id, domain, total_checked, total_issues, errors, warnings, info, issues, generated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"#
    ))
    .bind(report.id)
    .bind(&report.domain)
    .bind(report.total_checked as i64)
    .bind(report.total_issues as i64)
    .bind(report.errors as i64)
    .bind(report.warnings as i64)
    .bind(report.info as i64)
    .bind(&issues_json)
    .bind(report.generated_at)
    .execute(&mut **txn)
    .await;

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("事务提交失败: {}", e);
            return Json(ApiResponse::error(500, "事务提交失败"));
        }
    }
    Json(ApiResponse::success(
        report,
        &format!(
            "质量检查完成：检查 {} 条记录，发现 {} 个问题",
            total_checked, total_issues
        ),
    ))
}

/// V39.0 AC-11: 查询质量报告（分页 + domain 过滤）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/quality-report",
    tag = "Master Data",
    operation_id = "get_quality_report",
    params(QualityReportQuery),
    responses((status = 200, description = "OK")),
)]
pub async fn get_quality_report(
    State(_state): State<ApiState>,
    Query(params): Query<QualityReportQuery>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PaginatedResponse<QualityReport>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let rows = if let Some(ref domain) = params.domain {
        sqlx::query(
            only_own_schema_query!("erp", r#"SELECT id, domain, total_checked, total_issues, errors, warnings, info, issues, generated_at
               FROM erp_master_data_quality_reports
               WHERE domain = $1
               ORDER BY generated_at DESC LIMIT $2 OFFSET $3"#),
        )
        .bind(domain)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&mut **txn)
        .await
    } else {
        sqlx::query(
            only_own_schema_query!("erp", r#"SELECT id, domain, total_checked, total_issues, errors, warnings, info, issues, generated_at
               FROM erp_master_data_quality_reports
               ORDER BY generated_at DESC LIMIT $1 OFFSET $2"#),
        )
        .bind(page_size)
        .bind(offset)
        .fetch_all(&mut **txn)
        .await
    };

    match rows {
        Ok(rows) => {
            let items: Vec<QualityReport> = rows
                .iter()
                .filter_map(|r| quality_report_from_row(r).ok())
                .collect();
            let total = items.len() as i64;
            Json(ApiResponse::success(
                PaginatedResponse::new(items, total, page, page_size),
                "质量报告列表",
            ))
        }
        Err(e) => {
            tracing::warn!("[erp-mdm] 查询质量报告失败: {}", e);
            Json(ApiResponse::success(
                PaginatedResponse::new(vec![], 0, page, page_size),
                "质量报告列表（空）",
            ))
        }
    }
}

// --- 内部执行逻辑 ---

/// 加载质量规则（按 domain 过滤，或按 rule_ids 指定）
async fn load_quality_rules(
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    domain: Option<&str>,
    rule_ids: Option<&[uuid::Uuid]>,
) -> Vec<QualityRule> {
    let sql_base = format!(
        "SELECT {} FROM erp_master_data_quality_rules WHERE deleted_at IS NULL",
        QUALITY_RULE_COLUMNS
    );

    let rows = if let Some(ids) = rule_ids {
        if ids.is_empty() {
            return vec![];
        }
        let placeholders: Vec<String> = (1..=ids.len()).map(|i| format!("${}", i)).collect();
        let sql = format!("{} WHERE id IN ({})", sql_base, placeholders.join(", "));
        let mut query = sqlx::query(&sql);
        for id in ids {
            query = query.bind(id);
        }
        query.fetch_all(&mut **txn).await
    } else if let Some(d) = domain {
        sqlx::query(&format!(
            "{} WHERE is_active = TRUE AND domain = $1",
            sql_base
        ))
        .bind(d)
        .fetch_all(&mut **txn)
        .await
    } else {
        sqlx::query(&format!("{} WHERE is_active = TRUE", sql_base))
            .fetch_all(&mut **txn)
            .await
    };

    match rows {
        Ok(rows) => rows
            .iter()
            .filter_map(|r| quality_rule_from_row(r).ok())
            .collect(),
        Err(e) => {
            tracing::warn!("[erp-mdm] 加载质量规则失败: {}", e);
            vec![]
        }
    }
}

/// 加载主数据记录用于质量检查（排除已销毁）
async fn load_records_for_quality(
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    domain: Option<&str>,
) -> Vec<MasterDataRef> {
    let rows = if let Some(d) = domain {
        sqlx::query_as::<_, MasterDataRow>(only_own_schema_query!(
            "erp",
            r#"SELECT * FROM erp.erp_master_data_refs WHERE status != 'destroyed' AND domain = $1"#
        ))
        .bind(d)
        .fetch_all(&mut **txn)
        .await
    } else {
        sqlx::query_as::<_, MasterDataRow>(only_own_schema_query!(
            "erp",
            r#"SELECT * FROM erp.erp_master_data_refs WHERE status != 'destroyed'"#
        ))
        .fetch_all(&mut **txn)
        .await
    };

    match rows {
        Ok(data) => data.into_iter().map(Into::into).collect(),
        Err(e) => {
            tracing::warn!("[erp-mdm] 加载主数据记录失败: {}", e);
            vec![]
        }
    }
}

/// 根据 rule_type 执行不同校验
async fn execute_rule(
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    rule: &QualityRule,
    records: &[MasterDataRef],
) -> Vec<QualityIssue> {
    match rule.rule_type {
        QualityRuleType::Required => check_required(rule, records),
        QualityRuleType::Format => check_format(rule, records),
        QualityRuleType::Range => check_range(rule, records),
        QualityRuleType::Uniqueness => check_uniqueness(txn, rule, records).await,
        QualityRuleType::Reference => check_reference(txn, rule, records).await,
        QualityRuleType::Custom => check_custom_sql(txn, rule, records).await,
    }
}

/// Required: 字段必填校验
pub fn check_required(rule: &QualityRule, records: &[MasterDataRef]) -> Vec<QualityIssue> {
    let default_value = rule.config.get("default_value").and_then(|v| v.as_str());
    records
        .iter()
        .filter_map(|r| {
            let val = get_record_field(r, &rule.field_name);
            let is_empty = val.as_deref().map(|s| s.is_empty()).unwrap_or(true);
            if is_empty {
                Some(QualityIssue {
                    rule_id: rule.id,
                    rule_name: rule.name.clone(),
                    master_data_id: r.master_data_id.clone(),
                    field_name: rule.field_name.clone(),
                    current_value: val,
                    expected: default_value
                        .map(|d| format!("非空值（建议默认: {}）", d))
                        .unwrap_or_else(|| "非空值".to_string()),
                    severity: rule.severity.clone(),
                    suggestion: default_value.map(|d| format!("填充默认值: {}", d)),
                })
            } else {
                None
            }
        })
        .collect()
}

/// Format: 格式校验（正则）
pub fn check_format(rule: &QualityRule, records: &[MasterDataRef]) -> Vec<QualityIssue> {
    let pattern = match rule.config.get("pattern").and_then(|v| v.as_str()) {
        Some(p) => p,
        None => return vec![],
    };
    let re = match regex::Regex::new(pattern) {
        Ok(re) => re,
        Err(e) => {
            tracing::warn!("[erp-mdm] 质量规则 {} 正则无效: {}", rule.id, e);
            return vec![];
        }
    };
    records
        .iter()
        .filter_map(|r| {
            let val = get_record_field(r, &rule.field_name);
            match &val {
                Some(v) if !v.is_empty() => {
                    if !re.is_match(v) {
                        Some(QualityIssue {
                            rule_id: rule.id,
                            rule_name: rule.name.clone(),
                            master_data_id: r.master_data_id.clone(),
                            field_name: rule.field_name.clone(),
                            current_value: val,
                            expected: format!("符合正则: {}", pattern),
                            severity: rule.severity.clone(),
                            suggestion: Some(format!("格式化以符合 {}", pattern)),
                        })
                    } else {
                        None
                    }
                }
                _ => None,
            }
        })
        .collect()
}

/// Range: 范围校验（min/max）
pub fn check_range(rule: &QualityRule, records: &[MasterDataRef]) -> Vec<QualityIssue> {
    let min = rule.config.get("min").and_then(|v| v.as_f64());
    let max = rule.config.get("max").and_then(|v| v.as_f64());
    records
        .iter()
        .filter_map(|r| {
            let val = get_record_field(r, &rule.field_name);
            let num = val.as_ref().and_then(|v| v.parse::<f64>().ok())?;
            let too_low = min.map(|m| num < m).unwrap_or(false);
            let too_high = max.map(|m| num > m).unwrap_or(false);
            if !too_low && !too_high {
                return None;
            }
            let range_str = match (min, max) {
                (Some(lo), Some(hi)) => format!("[{}, {}]", lo, hi),
                (Some(lo), None) => format!(">= {}", lo),
                (None, Some(hi)) => format!("<= {}", hi),
                _ => "范围内".to_string(),
            };
            let suggested = if too_low {
                min.map(|m| m.to_string())
            } else if too_high {
                max.map(|m| m.to_string())
            } else {
                Some(num.to_string())
            };
            Some(QualityIssue {
                rule_id: rule.id,
                rule_name: rule.name.clone(),
                master_data_id: r.master_data_id.clone(),
                field_name: rule.field_name.clone(),
                current_value: val,
                expected: range_str.clone(),
                severity: rule.severity.clone(),
                suggestion: Some(format!("调整值到 {}", range_str)),
            })
            .map(|mut issue| {
                if let Some(ref s) = suggested {
                    issue.suggestion = Some(format!("调整值到 {}（建议: {}）", issue.expected, s));
                }
                issue
            })
        })
        .collect()
}

/// Uniqueness: 唯一性校验（检查 records 集合内的重复值）
async fn check_uniqueness(
    _txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    rule: &QualityRule,
    records: &[MasterDataRef],
) -> Vec<QualityIssue> {
    use std::collections::HashMap;
    let mut value_map: HashMap<String, Vec<usize>> = HashMap::new();
    for (i, r) in records.iter().enumerate() {
        if let Some(val) = get_record_field(r, &rule.field_name) {
            if !val.is_empty() {
                value_map.entry(val).or_default().push(i);
            }
        }
    }
    let mut issues = Vec::new();
    for (val, indices) in &value_map {
        if indices.len() > 1 {
            for &i in indices {
                let r = &records[i];
                let suffix = &r.master_data_id[..r.master_data_id.len().min(8)];
                issues.push(QualityIssue {
                    rule_id: rule.id,
                    rule_name: rule.name.clone(),
                    master_data_id: r.master_data_id.clone(),
                    field_name: rule.field_name.clone(),
                    current_value: Some(val.clone()),
                    expected: "唯一值".to_string(),
                    severity: rule.severity.clone(),
                    suggestion: Some(format!("添加后缀以保持唯一性，如: {}-{}", val, suffix)),
                });
            }
        }
    }
    issues
}

/// Reference: 引用完整性校验
///
/// config 需包含 ref_table 和 ref_column，校验字段值在被引用表中是否存在
async fn check_reference(
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    rule: &QualityRule,
    records: &[MasterDataRef],
) -> Vec<QualityIssue> {
    let ref_table = match rule.config.get("ref_table").and_then(|v| v.as_str()) {
        Some(t) => t,
        None => return vec![],
    };
    let ref_column = match rule.config.get("ref_column").and_then(|v| v.as_str()) {
        Some(c) => c,
        None => return vec![],
    };
    if !is_valid_identifier(ref_table) || !is_valid_identifier(ref_column) {
        tracing::warn!("[erp-mdm] 引用规则 {} 的表/列名无效", rule.id);
        return vec![];
    }
    let sql = format!(
        "SELECT 1 FROM {} WHERE {} = $1 LIMIT 1",
        ref_table, ref_column
    );
    let mut issues = Vec::new();
    for r in records {
        let val = match get_record_field(r, &rule.field_name) {
            Some(v) if !v.is_empty() => v,
            _ => continue,
        };
        let exists: Option<i32> = sqlx::query_scalar(&sql)
            .bind(&val)
            .fetch_optional(&mut **txn)
            .await
            .ok()
            .flatten();
        if exists.is_none() {
            issues.push(QualityIssue {
                rule_id: rule.id,
                rule_name: rule.name.clone(),
                master_data_id: r.master_data_id.clone(),
                field_name: rule.field_name.clone(),
                current_value: Some(val.clone()),
                expected: format!("在 {}.{} 中存在", ref_table, ref_column),
                severity: rule.severity.clone(),
                suggestion: Some(format!(
                    "清除引用或创建 {}.{}={} 的被引用记录",
                    ref_table, ref_column, val
                )),
            });
        }
    }
    issues
}

/// Custom: 自定义 SQL 校验
///
/// config 需包含 sql，SQL 应返回 master_data_id 列（违反规则的记录 ID）
async fn check_custom_sql(
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    rule: &QualityRule,
    records: &[MasterDataRef],
) -> Vec<QualityIssue> {
    let sql_text = match rule.config.get("sql").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => return vec![],
    };
    let suggestion = rule
        .config
        .get("suggestion")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let rows = sqlx::query(sql_text).fetch_all(&mut **txn).await;
    match rows {
        Ok(rows) => {
            use sqlx::Row;
            let violating_ids: std::collections::HashSet<String> = rows
                .iter()
                .filter_map(|r| r.try_get::<String, _>("master_data_id").ok())
                .collect();
            records
                .iter()
                .filter_map(|r| {
                    if violating_ids.contains(&r.master_data_id) {
                        Some(QualityIssue {
                            rule_id: rule.id,
                            rule_name: rule.name.clone(),
                            master_data_id: r.master_data_id.clone(),
                            field_name: rule.field_name.clone(),
                            current_value: get_record_field(r, &rule.field_name),
                            expected: "满足自定义规则".to_string(),
                            severity: rule.severity.clone(),
                            suggestion: suggestion.clone(),
                        })
                    } else {
                        None
                    }
                })
                .collect()
        }
        Err(e) => {
            tracing::warn!("[erp-mdm] 自定义规则 {} SQL 执行失败: {}", rule.id, e);
            vec![]
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use uuid::Uuid;

    #[test]
    fn test_quality_rule_type_serialization() {
        let rule_type = QualityRuleType::Required;
        let json = serde_json::to_value(&rule_type).unwrap();
        assert_eq!(json, "required");
    }

    #[test]
    fn test_quality_rule_type_format() {
        let rule_type = QualityRuleType::Format;
        let json = serde_json::to_value(&rule_type).unwrap();
        assert_eq!(json, "format");
    }

    #[test]
    fn test_quality_rule_type_range() {
        let rule_type = QualityRuleType::Range;
        let json = serde_json::to_value(&rule_type).unwrap();
        assert_eq!(json, "range");
    }

    #[test]
    fn test_quality_rule_type_uniqueness() {
        let rule_type = QualityRuleType::Uniqueness;
        let json = serde_json::to_value(&rule_type).unwrap();
        assert_eq!(json, "uniqueness");
    }

    #[test]
    fn test_quality_rule_type_reference() {
        let rule_type = QualityRuleType::Reference;
        let json = serde_json::to_value(&rule_type).unwrap();
        assert_eq!(json, "reference");
    }

    #[test]
    fn test_quality_rule_type_custom() {
        let rule_type = QualityRuleType::Custom;
        let json = serde_json::to_value(&rule_type).unwrap();
        assert_eq!(json, "custom");
    }

    #[test]
    fn test_quality_rule_type_deserialize() {
        let json = r#""format""#;
        let rule_type: QualityRuleType = serde_json::from_str(json).unwrap();
        assert!(matches!(rule_type, QualityRuleType::Format));
    }

    #[test]
    fn test_quality_severity_default() {
        let severity = QualitySeverity::default();
        assert!(matches!(severity, QualitySeverity::Error));
    }

    #[test]
    fn test_quality_severity_serialization() {
        let severity = QualitySeverity::Error;
        let json = serde_json::to_value(&severity).unwrap();
        assert_eq!(json, "error");
    }

    #[test]
    fn test_quality_severity_warning() {
        let severity = QualitySeverity::Warning;
        let json = serde_json::to_value(&severity).unwrap();
        assert_eq!(json, "warning");
    }

    #[test]
    fn test_quality_severity_info() {
        let severity = QualitySeverity::Info;
        let json = serde_json::to_value(&severity).unwrap();
        assert_eq!(json, "info");
    }

    #[test]
    fn test_quality_severity_deserialize() {
        let json = r#""warning""#;
        let severity: QualitySeverity = serde_json::from_str(json).unwrap();
        assert!(matches!(severity, QualitySeverity::Warning));
    }

    #[test]
    fn test_quality_rule_serialization() {
        let rule = QualityRule {
            id: Uuid::nil(),
            name: "必填校验".to_string(),
            description: "校验名称字段必填".to_string(),
            domain: "customer".to_string(),
            field_name: "name".to_string(),
            rule_type: QualityRuleType::Required,
            severity: QualitySeverity::Error,
            config: serde_json::json!({}),
            is_active: true,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let json = serde_json::to_value(&rule).unwrap();
        assert_eq!(json["name"], "必填校验");
        assert_eq!(json["domain"], "customer");
        assert_eq!(json["field_name"], "name");
        assert_eq!(json["rule_type"], "required");
        assert_eq!(json["severity"], "error");
        assert_eq!(json["is_active"], true);
    }

    #[test]
    fn test_quality_issue_serialization() {
        let issue = QualityIssue {
            rule_id: Uuid::nil(),
            rule_name: "必填校验".to_string(),
            master_data_id: "md1".to_string(),
            field_name: "name".to_string(),
            current_value: None,
            expected: "非空".to_string(),
            severity: QualitySeverity::Error,
            suggestion: Some("请填写名称".to_string()),
        };
        let json = serde_json::to_value(&issue).unwrap();
        assert_eq!(json["rule_name"], "必填校验");
        assert_eq!(json["master_data_id"], "md1");
        assert_eq!(json["field_name"], "name");
        assert_eq!(json["expected"], "非空");
        assert_eq!(json["severity"], "error");
        assert_eq!(json["suggestion"], "请填写名称");
    }

    #[test]
    fn test_quality_issue_with_value() {
        let issue = QualityIssue {
            rule_id: Uuid::nil(),
            rule_name: "格式校验".to_string(),
            master_data_id: "md2".to_string(),
            field_name: "email".to_string(),
            current_value: Some("invalid-email".to_string()),
            expected: "有效邮箱格式".to_string(),
            severity: QualitySeverity::Warning,
            suggestion: None,
        };
        let json = serde_json::to_value(&issue).unwrap();
        assert_eq!(json["current_value"], "invalid-email");
        assert_eq!(json["severity"], "warning");
        assert!(json["suggestion"].is_null());
    }
}
