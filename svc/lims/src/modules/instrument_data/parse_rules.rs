use axum::{extract::State, Extension, Json};
use sqlx::types::Uuid;
use sqlx::Row;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::middleware::tenant::TenantContext;
use topems_shared_core::response::ApiResponse;

use super::models::{CreateParseRuleRequest, ParseRule, ParseRuleQuery, UpdateParseRuleRequest};

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:instrument_data/parse_rules:read"])),
    path = "/parse-rules",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "instrument_data/parse_rules"
)]
pub async fn list_parse_rules(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    axum::extract::Query(query): axum::extract::Query<ParseRuleQuery>,
) -> ApiResponse<Vec<ParseRule>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 解析规则列表读作用域创建失败: {}", e);
            return ApiResponse::server_error("获取解析规则列表失败");
        }
    };

    let sql = match (query.status.as_ref(), query.protocol.as_ref()) {
        (Some(_), Some(_)) => {
            "SELECT id::TEXT, rule_no, rule_name, protocol, instrument_type, \
             parse_config, quality_rules, status, version, description, \
             created_by, created_at, updated_at, tenant_id::TEXT \
             FROM lims.qa_lims_parse_rules \
             WHERE status = $1 AND protocol = $2 \
             ORDER BY created_at DESC LIMIT $3 OFFSET $4"
        }
        (Some(_), None) => {
            "SELECT id::TEXT, rule_no, rule_name, protocol, instrument_type, \
             parse_config, quality_rules, status, version, description, \
             created_by, created_at, updated_at, tenant_id::TEXT \
             FROM lims.qa_lims_parse_rules \
             WHERE status = $1 \
             ORDER BY created_at DESC LIMIT $2 OFFSET $3"
        }
        (None, Some(_)) => {
            "SELECT id::TEXT, rule_no, rule_name, protocol, instrument_type, \
             parse_config, quality_rules, status, version, description, \
             created_by, created_at, updated_at, tenant_id::TEXT \
             FROM lims.qa_lims_parse_rules \
             WHERE protocol = $1 \
             ORDER BY created_at DESC LIMIT $2 OFFSET $3"
        }
        (None, None) => {
            "SELECT id::TEXT, rule_no, rule_name, protocol, instrument_type, \
             parse_config, quality_rules, status, version, description, \
             created_by, created_at, updated_at, tenant_id::TEXT \
             FROM lims.qa_lims_parse_rules \
             ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        }
    };

    let mut query_builder = sqlx::query(sqlx::AssertSqlSafe(sql));
    match (query.status.as_ref(), query.protocol.as_ref()) {
        (Some(st), Some(pr)) => {
            query_builder = query_builder.bind(st).bind(pr).bind(page_size).bind(offset);
        }
        (Some(st), None) => {
            query_builder = query_builder.bind(st).bind(page_size).bind(offset);
        }
        (None, Some(pr)) => {
            query_builder = query_builder.bind(pr).bind(page_size).bind(offset);
        }
        (None, None) => {
            query_builder = query_builder.bind(page_size).bind(offset);
        }
    }

    let rules = query_builder.fetch_all(&mut scope).await.map(|rows| {
        rows.into_iter()
            .map(|row| ParseRule {
                id: row.get("id"),
                tenant_id: row.get("tenant_id"),
                rule_no: row.get("rule_no"),
                rule_name: row.get("rule_name"),
                protocol: row.get("protocol"),
                instrument_type: row.get("instrument_type"),
                parse_config: row.get("parse_config"),
                quality_rules: row.get("quality_rules"),
                status: row.get("status"),
                version: row.get("version"),
                description: row.get("description"),
                created_by: row.get("created_by"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect()
    });

    let _ = scope.commit().await;

    match rules {
        Ok(data) => ApiResponse::success(data, "获取解析规则列表成功"),
        Err(e) => {
            tracing::error!("Failed to fetch parse rules: {}", e);
            ApiResponse::server_error("获取解析规则列表失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:instrument_data/parse_rules:read"])),
    path = "/parse-rules/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "instrument_data/parse_rules"
)]
pub async fn get_parse_rule(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<ParseRule> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的规则ID"),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 解析规则详情读作用域创建失败: {}", e);
            return ApiResponse::server_error("获取解析规则失败");
        }
    };

    let row = sqlx::query(
        r#"
        SELECT id::TEXT, rule_no, rule_name, protocol, instrument_type,
               parse_config, quality_rules, status, version, description,
               created_by, created_at, updated_at, tenant_id::TEXT
        FROM lims.qa_lims_parse_rules
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&mut scope)
    .await;

    let _ = scope.commit().await;

    match row {
        Ok(Some(r)) => ApiResponse::success(
            ParseRule {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
                rule_no: r.get("rule_no"),
                rule_name: r.get("rule_name"),
                protocol: r.get("protocol"),
                instrument_type: r.get("instrument_type"),
                parse_config: r.get("parse_config"),
                quality_rules: r.get("quality_rules"),
                status: r.get("status"),
                version: r.get("version"),
                description: r.get("description"),
                created_by: r.get("created_by"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "获取解析规则成功",
        ),
        Ok(None) => ApiResponse::not_found("解析规则不存在"),
        Err(e) => {
            tracing::error!("Failed to fetch parse rule: {}", e);
            ApiResponse::server_error("获取解析规则失败")
        }
    }
}

#[utoipa::path(

    post,

    security(("BearerAuth" = [])),

    path = "/api/lims/parse-rules",

    responses(

        (status = 200, description = "OK", body = serde_json::Value),

        (status = 500, description = "Internal server error")

    ),

    tag = "LIMS"

)]

pub async fn create_parse_rule(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    Json(req): Json<CreateParseRuleRequest>,
) -> ApiResponse<ParseRule> {
    let rule_id = Uuid::new_v4();
    let rule_no = format!("PR-{}", chrono::Utc::now().format("%Y%m%d%H%M%S"));

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 解析规则创建写作用域创建失败: {}", e);
            return ApiResponse::server_error("创建解析规则失败");
        }
    };

    let row = sqlx::query(
        r#"
        INSERT INTO lims.qa_lims_parse_rules
            (id, rule_no, rule_name, protocol, instrument_type,
             parse_config, quality_rules, status, version, description, created_by, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', '1.0', $8, 'system', $9)
        RETURNING id::TEXT, rule_no, rule_name, protocol, instrument_type,
                  parse_config, quality_rules, status, version, description,
                  created_by, created_at, updated_at, tenant_id::TEXT
        "#,
    )
    .bind(rule_id)
    .bind(&rule_no)
    .bind(&req.rule_name)
    .bind(&req.protocol)
    .bind(&req.instrument_type)
    .bind(&req.parse_config)
    .bind(&req.quality_rules)
    .bind(&req.description)
    .bind(ctx.tenant_id)
    .fetch_one(&mut scope)
    .await;

    match row {
        Ok(r) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 解析规则创建事务提交失败: {}", e);
                return ApiResponse::server_error("创建解析规则失败");
            }
            ApiResponse::success(
                ParseRule {
                    id: r.get("id"),
                    tenant_id: r.get("tenant_id"),
                    rule_no: r.get("rule_no"),
                    rule_name: r.get("rule_name"),
                    protocol: r.get("protocol"),
                    instrument_type: r.get("instrument_type"),
                    parse_config: r.get("parse_config"),
                    quality_rules: r.get("quality_rules"),
                    status: r.get("status"),
                    version: r.get("version"),
                    description: r.get("description"),
                    created_by: r.get("created_by"),
                    created_at: r.get("created_at"),
                    updated_at: r.get("updated_at"),
                },
                "解析规则创建成功",
            )
        }
        Err(e) => {
            tracing::error!("Failed to create parse rule: {}", e);
            ApiResponse::server_error("创建解析规则失败")
        }
    }
}

#[utoipa::path(

    put,

    security(("BearerAuth" = [])),

    path = "/api/lims/parse-rules/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses(

        (status = 200, description = "OK", body = serde_json::Value),

        (status = 500, description = "Internal server error")

    ),

    tag = "LIMS"

)]

pub async fn update_parse_rule(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateParseRuleRequest>,
) -> ApiResponse<ParseRule> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的规则ID"),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 解析规则更新写作用域创建失败: {}", e);
            return ApiResponse::server_error("更新解析规则失败");
        }
    };

    let row = sqlx::query(
        r#"
        UPDATE lims.qa_lims_parse_rules 
        SET rule_name = COALESCE($2, rule_name),
            status = COALESCE($3, status),
            parse_config = COALESCE($4, parse_config),
            quality_rules = COALESCE($5, quality_rules),
            description = COALESCE($6, description),
            version = (version::numeric + 0.1)::varchar,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id::TEXT, rule_no, rule_name, protocol, instrument_type,
                  parse_config, quality_rules, status, version, description,
                  created_by, created_at, updated_at, tenant_id::TEXT
        "#,
    )
    .bind(id)
    .bind(&req.rule_name)
    .bind(&req.status)
    .bind(&req.parse_config)
    .bind(&req.quality_rules)
    .bind(&req.description)
    .fetch_optional(&mut scope)
    .await;

    match row {
        Ok(Some(r)) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 解析规则更新事务提交失败: {}", e);
                return ApiResponse::server_error("更新解析规则失败");
            }
            ApiResponse::success(
                ParseRule {
                    id: r.get("id"),
                    tenant_id: r.get("tenant_id"),
                    rule_no: r.get("rule_no"),
                    rule_name: r.get("rule_name"),
                    protocol: r.get("protocol"),
                    instrument_type: r.get("instrument_type"),
                    parse_config: r.get("parse_config"),
                    quality_rules: r.get("quality_rules"),
                    status: r.get("status"),
                    version: r.get("version"),
                    description: r.get("description"),
                    created_by: r.get("created_by"),
                    created_at: r.get("created_at"),
                    updated_at: r.get("updated_at"),
                },
                "解析规则更新成功",
            )
        }
        Ok(None) => ApiResponse::not_found("解析规则不存在"),
        Err(e) => {
            tracing::error!("Failed to update parse rule: {}", e);
            ApiResponse::server_error("更新解析规则失败")
        }
    }
}

#[utoipa::path(

    delete,

    security(("BearerAuth" = [])),

    path = "/api/lims/parse-rules/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses(

        (status = 200, description = "OK", body = serde_json::Value),

        (status = 500, description = "Internal server error")

    ),

    tag = "LIMS"

)]

pub async fn delete_parse_rule(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<bool> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的规则ID"),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 解析规则删除写作用域创建失败: {}", e);
            return ApiResponse::server_error("删除解析规则失败");
        }
    };

    let result =
        sqlx::query("UPDATE lims.qa_lims_parse_rules SET deleted_at = NOW() WHERE id = $1")
            .bind(id)
            .execute(&mut scope)
            .await;

    match result {
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 解析规则删除事务提交失败: {}", e);
                return ApiResponse::server_error("删除解析规则失败");
            }
            ApiResponse::success(true, "解析规则删除成功")
        }
        Err(e) => {
            tracing::error!("Failed to delete parse rule: {}", e);
            ApiResponse::server_error("删除解析规则失败")
        }
    }
}
