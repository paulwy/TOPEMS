//! MDM 主数据处理器
//!
//! 提供 5 大主数据域的 CRUD API 和事件发布。
//! 所有变更操作都会通过 Redis Pub/Sub 发布 MasterDataEvent。

use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Extension, Json, Router,
};
use chrono::{DateTime, Duration, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::AppState;
use topems_shared::{
    event::{MasterDataAction, MasterDataDomain, MasterDataEvent},
    id::generate_master_data_id,
    ApiResponse, Claims,
};

use super::models::{
    CreateMasterDataRefRequest, DomainStats, MasterDataChangeLog, MasterDataListResponse,
    MasterDataQuery, MasterDataRef, MdmOverallStats, SyncStatus, UpdateMasterDataRefRequest,
};

/// MDM 服务
pub struct MasterDataService {
    pool: PgPool,
}

impl MasterDataService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// 创建主数据引用
    pub async fn create_ref(
        &self,
        tenant_id: Uuid,
        req: CreateMasterDataRefRequest,
        operator: Option<String>,
    ) -> Result<MasterDataRef, sqlx::Error> {
        let domain = MasterDataDomain::from_str(&req.domain)
            .ok_or_else(|| sqlx::Error::Decode(format!("Invalid domain: {}", req.domain).into()))?;

        let master_data_id = generate_master_data_id(domain);
        let ref_data = MasterDataRef::from_request(tenant_id, &req, master_data_id.clone());

        sqlx::query(
            r#"
            INSERT INTO core_master_data_refs
                (master_data_id, tenant_id, domain, code, name, status, version, source_service, last_synced_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, 1, $7, NOW(), NOW(), NOW())
            "#,
        )
        .bind(&ref_data.master_data_id)
        .bind(ref_data.tenant_id)
        .bind(&ref_data.domain)
        .bind(&ref_data.code)
        .bind(&ref_data.name)
        .bind(&ref_data.status)
        .bind(&ref_data.source_service)
        .execute(&self.pool)
        .await?;

        // 记录变更日志
        self.log_change(
            &ref_data,
            MasterDataAction::Created,
            operator.clone(),
            req.attributes.clone(),
        )
        .await?;

        // 发布事件
        let _ = publish_master_data_event(
            &ref_data,
            MasterDataAction::Created,
            operator,
            req.attributes,
        )
        .await;

        Ok(ref_data)
    }

    /// 更新主数据引用
    pub async fn update_ref(
        &self,
        tenant_id: Uuid,
        master_data_id: &str,
        req: UpdateMasterDataRefRequest,
        operator: Option<String>,
    ) -> Result<MasterDataRef, sqlx::Error> {
        let existing = self
            .get_ref(tenant_id, master_data_id)
            .await?
            .ok_or_else(|| sqlx::Error::RowNotFound)?;

        let mut changed_fields = Vec::new();
        let mut new_name = existing.name.clone();
        let mut new_status = existing.status.clone();

        if let Some(name) = &req.name {
            if name != &existing.name {
                changed_fields.push("name".to_string());
                new_name = name.clone();
            }
        }
        if let Some(status) = &req.status {
            if status != &existing.status {
                changed_fields.push("status".to_string());
                new_status = status.clone();
            }
        }

        let updated = sqlx::query_as::<_, MasterDataRef>(
            r#"
            UPDATE core_master_data_refs
            SET name = $1, status = $2, version = version + 1, updated_at = NOW(), last_synced_at = NOW()
            WHERE master_data_id = $3 AND tenant_id = $4
            RETURNING *
            "#,
        )
        .bind(&new_name)
        .bind(&new_status)
        .bind(master_data_id)
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await?;

        let action = if changed_fields.contains(&"status".to_string()) {
            if new_status == "active" {
                MasterDataAction::Activated
            } else {
                MasterDataAction::Deactivated
            }
        } else {
            MasterDataAction::Updated
        };

        self.log_change(&updated, action, operator.clone(), req.attributes.clone())
            .await?;
        let _ = publish_master_data_event(&updated, action, operator, req.attributes).await;

        Ok(updated)
    }

    /// 删除主数据引用（软删除）
    pub async fn delete_ref(
        &self,
        tenant_id: Uuid,
        master_data_id: &str,
        operator: Option<String>,
    ) -> Result<bool, sqlx::Error> {
        let existing = self
            .get_ref(tenant_id, master_data_id)
            .await?
            .ok_or_else(|| sqlx::Error::RowNotFound)?;

        sqlx::query(
            r#"
            UPDATE core_master_data_refs
            SET status = 'deleted', updated_at = NOW()
            WHERE master_data_id = $1 AND tenant_id = $2
            "#,
        )
        .bind(master_data_id)
        .bind(tenant_id)
        .execute(&self.pool)
        .await?;

        let op_clone = operator.clone();
        self.log_change(&existing, MasterDataAction::Deleted, operator, None)
            .await?;
        let _ =
            publish_master_data_event(&existing, MasterDataAction::Deleted, op_clone, None).await;

        Ok(true)
    }

    /// 按 ID 查询
    pub async fn get_ref(
        &self,
        tenant_id: Uuid,
        master_data_id: &str,
    ) -> Result<Option<MasterDataRef>, sqlx::Error> {
        let result = sqlx::query_as::<_, MasterDataRef>(
            "SELECT * FROM core_master_data_refs WHERE master_data_id = $1 AND tenant_id = $2",
        )
        .bind(master_data_id)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(result)
    }

    /// 按业务编码查询
    pub async fn get_ref_by_code(
        &self,
        tenant_id: Uuid,
        domain: &str,
        code: &str,
    ) -> Result<Option<MasterDataRef>, sqlx::Error> {
        let result = sqlx::query_as::<_, MasterDataRef>(
            "SELECT * FROM core_master_data_refs WHERE tenant_id = $1 AND domain = $2 AND code = $3",
        )
        .bind(tenant_id)
        .bind(domain)
        .bind(code)
        .fetch_optional(&self.pool)
        .await?;
        Ok(result)
    }

    /// 列表查询
    pub async fn list_refs(
        &self,
        tenant_id: Uuid,
        query: MasterDataQuery,
    ) -> Result<(Vec<MasterDataRef>, i64), sqlx::Error> {
        let page = query.page.unwrap_or(1).max(1);
        let page_size = query.page_size.unwrap_or(20).min(100);
        let offset = (page - 1) * page_size;

        let mut where_clause = String::from("tenant_id = $1");
        let mut bind_count = 1;

        if query.domain.is_some() {
            bind_count += 1;
            where_clause.push_str(&format!(" AND domain = ${}", bind_count));
        }
        if query.code.is_some() {
            bind_count += 1;
            where_clause.push_str(&format!(" AND code ILIKE '%' || ${} || '%'", bind_count));
        }
        if query.name.is_some() {
            bind_count += 1;
            where_clause.push_str(&format!(" AND name ILIKE '%' || ${} || '%'", bind_count));
        }
        if query.status.is_some() {
            bind_count += 1;
            where_clause.push_str(&format!(" AND status = ${}", bind_count));
        }

        let count_sql = format!(
            "SELECT COUNT(*) FROM core_master_data_refs WHERE {}",
            where_clause
        );
        let list_sql = format!(
            "SELECT * FROM core_master_data_refs WHERE {} ORDER BY updated_at DESC LIMIT {} OFFSET {}",
            where_clause, page_size, offset
        );

        let mut count_query = sqlx::query_scalar::<_, i64>(&count_sql).bind(tenant_id);
        let mut list_query = sqlx::query_as::<_, MasterDataRef>(&list_sql).bind(tenant_id);

        if let Some(d) = &query.domain {
            count_query = count_query.bind(d);
            list_query = list_query.bind(d);
        }
        if let Some(c) = &query.code {
            count_query = count_query.bind(c);
            list_query = list_query.bind(c);
        }
        if let Some(n) = &query.name {
            count_query = count_query.bind(n);
            list_query = list_query.bind(n);
        }
        if let Some(s) = &query.status {
            count_query = count_query.bind(s);
            list_query = list_query.bind(s);
        }

        let total: i64 = count_query.fetch_one(&self.pool).await?;
        let items = list_query.fetch_all(&self.pool).await?;

        Ok((items, total))
    }

    /// 变更历史
    pub async fn list_changes(
        &self,
        tenant_id: Uuid,
        master_data_id: &str,
        limit: i64,
    ) -> Result<Vec<MasterDataChangeLog>, sqlx::Error> {
        let items = sqlx::query_as::<_, MasterDataChangeLog>(
            r#"
            SELECT id, master_data_id, tenant_id, action, source_service, operator, changed_fields, payload, created_at
            FROM core_master_data_change_log
            WHERE tenant_id = $1 AND master_data_id = $2
            ORDER BY created_at DESC
            LIMIT $3
            "#,
        )
        .bind(tenant_id)
        .bind(master_data_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;
        Ok(items)
    }

    /// 整体统计
    pub async fn get_overall_stats(&self, tenant_id: Uuid) -> Result<MdmOverallStats, sqlx::Error> {
        let total: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM core_master_data_refs WHERE tenant_id = $1")
                .bind(tenant_id)
                .fetch_one(&self.pool)
                .await?;

        let since = Utc::now() - Duration::hours(24);
        let recent: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM core_master_data_change_log WHERE tenant_id = $1 AND created_at >= $2",
        )
        .bind(tenant_id)
        .bind(since)
        .fetch_one(&self.pool)
        .await?;

        let mut by_domain = Vec::new();
        for domain_str in [
            "customer",
            "supplier",
            "material",
            "organization",
            "employee",
            "account_subject",
        ] {
            let count: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM core_master_data_refs WHERE tenant_id = $1 AND domain = $2",
            )
            .bind(tenant_id)
            .bind(domain_str)
            .fetch_one(&self.pool)
            .await?;

            let active: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM core_master_data_refs WHERE tenant_id = $1 AND domain = $2 AND status = 'active'",
            )
            .bind(tenant_id)
            .bind(domain_str)
            .fetch_one(&self.pool)
            .await?;

            let last_updated: Option<DateTime<Utc>> = sqlx::query_scalar(
                "SELECT MAX(updated_at) FROM core_master_data_refs WHERE tenant_id = $1 AND domain = $2",
            )
            .bind(tenant_id)
            .bind(domain_str)
            .fetch_optional(&self.pool)
            .await?
            .flatten();

            by_domain.push(DomainStats {
                domain: domain_str.to_string(),
                total: count,
                active,
                inactive: count - active,
                last_updated,
            });
        }

        Ok(MdmOverallStats {
            total_master_data: total,
            by_domain,
            recent_changes_24h: recent,
        })
    }

    /// 同步状态
    pub async fn get_sync_status(&self, tenant_id: Uuid) -> Result<Vec<SyncStatus>, sqlx::Error> {
        let mut statuses = Vec::new();
        for (domain, source) in [
            ("customer", "crm"),
            ("supplier", "srm"),
            ("material", "erp"),
            ("organization", "hrm"),
            ("employee", "hrm"),
            ("account_subject", "finance"),
        ] {
            let last_sync: Option<DateTime<Utc>> = sqlx::query_scalar(
                "SELECT MAX(last_synced_at) FROM core_master_data_refs WHERE tenant_id = $1 AND domain = $2",
            )
            .bind(tenant_id)
            .bind(domain)
            .fetch_optional(&self.pool)
            .await?
            .flatten();

            let pending: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM core_master_data_refs WHERE tenant_id = $1 AND domain = $2 AND status = 'pending_sync'",
            )
            .bind(tenant_id)
            .bind(domain)
            .fetch_one(&self.pool)
            .await
            .unwrap_or(0);

            let status = if pending > 0 {
                "degraded"
            } else if last_sync.is_some() {
                "healthy"
            } else {
                "unknown"
            };

            statuses.push(SyncStatus {
                domain: domain.to_string(),
                source_service: source.to_string(),
                last_sync_at: last_sync,
                pending_count: pending,
                failed_count: 0,
                status: status.to_string(),
            });
        }
        Ok(statuses)
    }

    /// 记录变更日志
    async fn log_change(
        &self,
        ref_data: &MasterDataRef,
        action: MasterDataAction,
        operator: Option<String>,
        payload: Option<serde_json::Value>,
    ) -> Result<(), sqlx::Error> {
        let action_str = format!("{:?}", action).to_lowercase();
        sqlx::query(
            r#"
            INSERT INTO core_master_data_change_log
                (master_data_id, tenant_id, action, source_service, operator, payload, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            "#,
        )
        .bind(&ref_data.master_data_id)
        .bind(ref_data.tenant_id)
        .bind(&action_str)
        .bind(&ref_data.source_service)
        .bind(operator)
        .bind(payload)
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}

/// 发布主数据事件到事件总线
async fn publish_master_data_event(
    ref_data: &MasterDataRef,
    action: MasterDataAction,
    operator: Option<String>,
    payload: Option<serde_json::Value>,
) -> Result<(), String> {
    let domain = match MasterDataDomain::from_str(&ref_data.domain) {
        Some(d) => d,
        None => return Err(format!("Invalid domain: {}", ref_data.domain)),
    };

    let event_payload = payload.unwrap_or_else(|| {
        serde_json::json!({
            "master_data_id": ref_data.master_data_id,
            "code": ref_data.code,
            "name": ref_data.name,
            "status": ref_data.status,
            "version": ref_data.version,
        })
    });

    let mut event = MasterDataEvent::new(
        ref_data.tenant_id,
        domain,
        action,
        ref_data.master_data_id.clone(),
        ref_data.code.clone(),
        &ref_data.source_service,
        event_payload,
    )
    .with_version(ref_data.version);

    if let Some(op) = operator {
        event = event.with_operator(op);
    }

    // 通过事件总线发布（容错：失败仅记录日志，不影响主流程）
    let channel = event.channel();
    let event_clone = event.clone();
    tokio::spawn(async move {
        let redis_url =
            std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());
        let client = match redis::Client::open(redis_url) {
            Ok(c) => c,
            Err(e) => {
                tracing::warn!("[MDM] Redis 连接失败: {}，事件丢弃", e);
                return;
            }
        };
        let mut conn = match client.get_multiplexed_async_connection().await {
            Ok(c) => c,
            Err(e) => {
                tracing::warn!("[MDM] Redis 复用连接失败: {}，事件丢弃", e);
                return;
            }
        };
        let event_json = match serde_json::to_string(&event_clone) {
            Ok(j) => j,
            Err(e) => {
                tracing::warn!("[MDM] 事件序列化失败: {}", e);
                return;
            }
        };
        let _: Result<i64, _> = redis::cmd("PUBLISH")
            .arg(&channel)
            .arg(&event_json)
            .query_async(&mut conn)
            .await;
    });

    Ok(())
}

// ==================== HTTP Handlers ====================

/// 创建主数据引用
pub async fn create_ref_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateMasterDataRefRequest>,
) -> Json<ApiResponse<MasterDataRef>> {
    let tenant_id = get_tenant_id(&claims);
    let operator = claims.username.clone();
    let service = MasterDataService::new(state.pool.clone());

    match service.create_ref(tenant_id, req, Some(operator)).await {
        Ok(r) => Json(ApiResponse::success(r, "主数据引用创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 更新主数据引用
pub async fn update_ref_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(master_data_id): Path<String>,
    Json(req): Json<UpdateMasterDataRefRequest>,
) -> Json<ApiResponse<MasterDataRef>> {
    let tenant_id = get_tenant_id(&claims);
    let operator = claims.username.clone();
    let service = MasterDataService::new(state.pool.clone());

    match service
        .update_ref(tenant_id, &master_data_id, req, Some(operator))
        .await
    {
        Ok(r) => Json(ApiResponse::success(r, "主数据引用更新成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 删除主数据引用
pub async fn delete_ref_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(master_data_id): Path<String>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims);
    let operator = claims.username.clone();
    let service = MasterDataService::new(state.pool.clone());

    match service
        .delete_ref(tenant_id, &master_data_id, Some(operator))
        .await
    {
        Ok(b) => Json(ApiResponse::success(b, "主数据引用已删除")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 查询主数据引用（按 ID）
pub async fn get_ref_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(master_data_id): Path<String>,
) -> Json<ApiResponse<MasterDataRef>> {
    let tenant_id = get_tenant_id(&claims);
    let service = MasterDataService::new(state.pool.clone());

    match service.get_ref(tenant_id, &master_data_id).await {
        Ok(Some(r)) => Json(ApiResponse::success(r, "查询成功")),
        Ok(None) => Json(ApiResponse::error(404, "主数据引用不存在")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 按业务编码查询
pub async fn get_ref_by_code_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((domain, code)): Path<(String, String)>,
) -> Json<ApiResponse<MasterDataRef>> {
    let tenant_id = get_tenant_id(&claims);
    let service = MasterDataService::new(state.pool.clone());

    match service.get_ref_by_code(tenant_id, &domain, &code).await {
        Ok(Some(r)) => Json(ApiResponse::success(r, "查询成功")),
        Ok(None) => Json(ApiResponse::error(404, "主数据引用不存在")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 列表查询
pub async fn list_refs_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<MasterDataQuery>,
) -> Json<ApiResponse<MasterDataListResponse>> {
    let tenant_id = get_tenant_id(&claims);
    let service = MasterDataService::new(state.pool.clone());

    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);

    match service.list_refs(tenant_id, query).await {
        Ok((items, total)) => Json(ApiResponse::success(
            MasterDataListResponse {
                items,
                total,
                page,
                page_size,
            },
            "查询成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 变更历史
pub async fn list_changes_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(master_data_id): Path<String>,
) -> Json<ApiResponse<Vec<MasterDataChangeLog>>> {
    let tenant_id = get_tenant_id(&claims);
    let service = MasterDataService::new(state.pool.clone());

    match service.list_changes(tenant_id, &master_data_id, 50).await {
        Ok(changes) => Json(ApiResponse::success(changes, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 整体统计
pub async fn get_overall_stats_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<MdmOverallStats>> {
    let tenant_id = get_tenant_id(&claims);
    let service = MasterDataService::new(state.pool.clone());

    match service.get_overall_stats(tenant_id).await {
        Ok(stats) => Json(ApiResponse::success(stats, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 同步状态
pub async fn get_sync_status_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<SyncStatus>>> {
    let tenant_id = get_tenant_id(&claims);
    let service = MasterDataService::new(state.pool.clone());

    match service.get_sync_status(tenant_id).await {
        Ok(status) => Json(ApiResponse::success(status, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 主数据模块路由
pub fn master_data_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/master/refs",
            post(create_ref_handler).get(list_refs_handler),
        )
        .route("/master/refs/stats", get(get_overall_stats_handler))
        .route("/master/refs/sync-status", get(get_sync_status_handler))
        .route(
            "/master/refs/{master_data_id}",
            get(get_ref_handler)
                .put(update_ref_handler)
                .delete(delete_ref_handler),
        )
        .route(
            "/master/refs/{master_data_id}/changes",
            get(list_changes_handler),
        )
        .route(
            "/master/refs/by-code/{domain}/{code}",
            get(get_ref_by_code_handler),
        )
}

fn get_tenant_id(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_default()
}

/// 初始化 MDM 数据库表
pub async fn init_mdm_tables(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_master_data_refs (
            master_data_id TEXT PRIMARY KEY,
            tenant_id UUID NOT NULL,
            domain TEXT NOT NULL,
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            version INTEGER NOT NULL DEFAULT 1,
            source_service TEXT NOT NULL,
            last_synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            UNIQUE(tenant_id, domain, code)
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_mdm_refs_tenant_domain
            ON core_master_data_refs(tenant_id, domain)
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_mdm_refs_tenant_code
            ON core_master_data_refs(tenant_id, code)
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_master_data_change_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            master_data_id TEXT NOT NULL,
            tenant_id UUID NOT NULL,
            action TEXT NOT NULL,
            source_service TEXT NOT NULL,
            operator TEXT,
            changed_fields JSONB,
            payload JSONB,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_mdm_change_log_tenant_md
            ON core_master_data_change_log(tenant_id, master_data_id, created_at DESC)
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_master_data_event_outbox (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_id UUID NOT NULL,
            tenant_id UUID NOT NULL,
            domain TEXT NOT NULL,
            action TEXT NOT NULL,
            master_data_id TEXT NOT NULL,
            payload JSONB NOT NULL,
            published_at TIMESTAMP,
            retry_count INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}
