// ==================== 核心 CRUD 类型定义 ====================

use axum::extract::{Json, Path, Query, State};
use serde::Deserialize;
use std::fmt::{Display, Formatter, Result as FmtResult};
use topems_shared_boundary::only_own_schema_query;

use topems_shared::ApiResponse;
use topems_shared_core::response::PaginatedResponse;

use super::ApiState;

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct MasterDataRefQuery {
    pub domain: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

// V38.0 AC-10: 主数据生命周期状态枚举
/// 主数据生命周期状态
/// - Active: 活跃状态，正常使用
/// - Archived: 已归档，不可编辑但可查询
/// - PendingDestruction: 待销毁，已安排销毁计划
/// - Destroyed: 已销毁（软删除），数据保留但标记为已销毁
#[derive(Debug, Clone, serde::Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LifecycleStatus {
    Active,
    Archived,
    PendingDestruction,
    Destroyed,
}

impl Display for LifecycleStatus {
    fn fmt(&self, f: &mut Formatter<'_>) -> FmtResult {
        match self {
            LifecycleStatus::Active => f.write_str("active"),
            LifecycleStatus::Archived => f.write_str("archived"),
            LifecycleStatus::PendingDestruction => f.write_str("pending_destruction"),
            LifecycleStatus::Destroyed => f.write_str("destroyed"),
        }
    }
}

#[derive(Debug, serde::Serialize)]
pub struct MasterDataRef {
    pub master_data_id: String,
    pub tenant_id: String,
    pub domain: String,
    pub code: String,
    pub name: Option<String>,
    pub status: String,
    pub source_service: String,
    pub local_entity_type: Option<String>,
    pub local_entity_id: Option<String>,
    pub last_synced_at: String,
    pub created_at: String,
    pub updated_at: String,
    // V38.0 AC-10: 生命周期管理字段
    /// 归档时间
    pub archived_at: Option<String>,
    /// 归档操作人
    pub archived_by: Option<String>,
    /// 归档原因
    pub archive_reason: Option<String>,
    /// 销毁计划时间
    pub destroy_scheduled_at: Option<String>,
    /// 销毁原因
    pub destroy_reason: Option<String>,
    /// 销毁计划制定人
    pub destroy_scheduled_by: Option<String>,
    /// 实际销毁时间（软删除）
    pub destroyed_at: Option<String>,
    /// 销毁操作人
    pub destroyed_by: Option<String>,
}

// ==================== 内部行映射 ====================

pub struct MasterDataRow {
    pub master_data_id: String,
    pub tenant_id: uuid::Uuid,
    pub domain: String,
    pub code: String,
    pub name: Option<String>,
    pub status: String,
    pub source_service: String,
    pub local_entity_type: Option<String>,
    pub local_entity_id: Option<uuid::Uuid>,
    pub last_synced_at: chrono::DateTime<chrono::Utc>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    // V38.0 AC-10: 生命周期管理字段
    pub archived_at: Option<chrono::DateTime<chrono::Utc>>,
    pub archived_by: Option<String>,
    pub archive_reason: Option<String>,
    pub destroy_scheduled_at: Option<chrono::DateTime<chrono::Utc>>,
    pub destroy_reason: Option<String>,
    pub destroy_scheduled_by: Option<String>,
    pub destroyed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub destroyed_by: Option<String>,
}

impl From<MasterDataRow> for MasterDataRef {
    fn from(row: MasterDataRow) -> Self {
        Self {
            master_data_id: row.master_data_id,
            tenant_id: row.tenant_id.to_string(),
            domain: row.domain,
            code: row.code,
            name: row.name,
            status: row.status,
            source_service: row.source_service,
            local_entity_type: row.local_entity_type,
            local_entity_id: row.local_entity_id.map(|id| id.to_string()),
            last_synced_at: row.last_synced_at.to_rfc3339(),
            created_at: row.created_at.to_rfc3339(),
            updated_at: row.updated_at.to_rfc3339(),
            archived_at: row.archived_at.map(|t| t.to_rfc3339()),
            archived_by: row.archived_by,
            archive_reason: row.archive_reason,
            destroy_scheduled_at: row.destroy_scheduled_at.map(|t| t.to_rfc3339()),
            destroy_reason: row.destroy_reason,
            destroy_scheduled_by: row.destroy_scheduled_by,
            destroyed_at: row.destroyed_at.map(|t| t.to_rfc3339()),
            destroyed_by: row.destroyed_by,
        }
    }
}

impl<'r> sqlx::FromRow<'r, sqlx::postgres::PgRow> for MasterDataRow {
    fn from_row(row: &'r sqlx::postgres::PgRow) -> Result<Self, sqlx::Error> {
        use sqlx::Row;
        Ok(Self {
            master_data_id: row.try_get("master_data_id")?,
            tenant_id: row.try_get("tenant_id")?,
            domain: row.try_get("domain")?,
            code: row.try_get("code")?,
            name: row.try_get("name")?,
            status: row.try_get("status")?,
            source_service: row.try_get("source_service")?,
            local_entity_type: row.try_get("local_entity_type")?,
            local_entity_id: row.try_get("local_entity_id")?,
            last_synced_at: row.try_get("last_synced_at")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
            archived_at: row.try_get("archived_at").ok().flatten(),
            archived_by: row.try_get("archived_by").ok().flatten(),
            archive_reason: row.try_get("archive_reason").ok().flatten(),
            destroy_scheduled_at: row.try_get("destroy_scheduled_at").ok().flatten(),
            destroy_reason: row.try_get("destroy_reason").ok().flatten(),
            destroy_scheduled_by: row.try_get("destroy_scheduled_by").ok().flatten(),
            destroyed_at: row.try_get("destroyed_at").ok().flatten(),
            destroyed_by: row.try_get("destroyed_by").ok().flatten(),
        })
    }
}

// ==================== 核心 CRUD Handlers ====================

/// 列出本地主数据引用
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:master-data:read"])),
    path = "/api/erp/master-data-refs",
    tag = "Master Data",
    operation_id = "list_master_data_refs",
    params(MasterDataRefQuery),
    responses((status = 200, description = "OK")),
)]
pub async fn list_master_data_refs(
    State(state): State<ApiState>,
    Query(params): Query<MasterDataRefQuery>,
) -> Json<ApiResponse<PaginatedResponse<MasterDataRef>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let rows = if let Some(ref domain) = params.domain {
        sqlx::query_as::<_, MasterDataRow>(only_own_schema_query!(
            "erp",
            r#"SELECT master_data_id, tenant_id, domain, code, name, status,
                      source_service, local_entity_type, local_entity_id,
                      last_synced_at, created_at, updated_at
               FROM erp.erp_master_data_refs
               WHERE domain = $1
               ORDER BY updated_at DESC
               LIMIT $2 OFFSET $3"#
        ))
        .bind(domain)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await
    } else {
        sqlx::query_as::<_, MasterDataRow>(only_own_schema_query!(
            "erp",
            r#"SELECT master_data_id, tenant_id, domain, code, name, status,
                      source_service, local_entity_type, local_entity_id,
                      last_synced_at, created_at, updated_at
               FROM erp.erp_master_data_refs
               ORDER BY updated_at DESC
               LIMIT $1 OFFSET $2"#
        ))
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await
    };

    match rows {
        Ok(data) => {
            let total = data.len() as i64;
            let items: Vec<MasterDataRef> = data.into_iter().map(Into::into).collect();
            Json(ApiResponse::success(
                PaginatedResponse::new(items, total, page, page_size),
                "本地主数据引用列表",
            ))
        }
        Err(e) => {
            tracing::warn!("[erp-mdm] 查询本地主数据引用失败: {}", e);
            Json(ApiResponse::success(
                PaginatedResponse::new(vec![], 0, page, page_size),
                "本地主数据引用列表（空）",
            ))
        }
    }
}

/// 通过 master_data_id 查找本地主数据引用
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:master-data:read"])),
    path = "/api/erp/master-data-refs/{master_data_id}",
    tag = "Master Data",
    operation_id = "get_master_data_ref",
    responses((status = 200, description = "OK")),
)]
pub async fn get_master_data_ref(
    State(state): State<ApiState>,
    Path(master_data_id): Path<String>,
) -> Json<ApiResponse<MasterDataRef>> {
    match sqlx::query_as::<_, MasterDataRow>(only_own_schema_query!(
        "erp",
        r#"SELECT master_data_id, tenant_id, domain, code, name, status,
                  source_service, local_entity_type, local_entity_id,
                  last_synced_at, created_at, updated_at
           FROM erp.erp_master_data_refs
           WHERE master_data_id = $1"#
    ))
    .bind(&master_data_id)
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(row)) => Json(ApiResponse::success(row.into(), "本地主数据引用")),
        Ok(None) => Json(ApiResponse::error(404, "未找到主数据引用")),
        Err(e) => {
            tracing::warn!("[erp-mdm] 查询主数据引用失败: {}", e);
            Json(ApiResponse::error(500, &format!("查询失败: {}", e)))
        }
    }
}

/// 通过 domain + code 查找本地主数据引用
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:master-data:read"])),
    path = "/api/erp/master-data-refs/by-code/{domain}/{code}",
    tag = "Master Data",
    operation_id = "get_master_data_ref_by_code",
    responses((status = 200, description = "OK")),
)]
pub async fn get_master_data_ref_by_code(
    State(state): State<ApiState>,
    Path((domain, code)): Path<(String, String)>,
) -> Json<ApiResponse<MasterDataRef>> {
    match sqlx::query_as::<_, MasterDataRow>(only_own_schema_query!(
        "erp",
        r#"SELECT master_data_id, tenant_id, domain, code, name, status,
                  source_service, local_entity_type, local_entity_id,
                  last_synced_at, created_at, updated_at
           FROM erp.erp_master_data_refs
           WHERE domain = $1 AND code = $2"#
    ))
    .bind(&domain)
    .bind(&code)
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(row)) => Json(ApiResponse::success(row.into(), "本地主数据引用")),
        Ok(None) => Json(ApiResponse::error(404, "未找到主数据引用")),
        Err(e) => {
            tracing::warn!("[erp-mdm] 按编码查询主数据引用失败: {}", e);
            Json(ApiResponse::error(500, &format!("查询失败: {}", e)))
        }
    }
}
