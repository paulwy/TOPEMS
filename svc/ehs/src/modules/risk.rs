//! Risk handlers

use axum::{extract::{Query, State}, http::HeaderMap, routing::*, Extension, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

use uuid::Uuid;

use crate::shared::AppState;
pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/hazards", get(list_risks).post(create_risk))
        .route(
            "/hazards/{id}",
            get(get_risk).put(update_risk).delete(delete_risk),
        )
        .route("/hazards/{id}/assessments", post(assess_risk))
        .route(
            "/hazards/{id}/controls",
            get(list_control_measures).post(create_control_measure),
        )
        .route(
            "/hazards/{id}/controls/{measure_id}",
            put(update_control_measure).delete(delete_control_measure),
        )
}

#[derive(Debug, Deserialize)]
pub struct RiskQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub risk_level: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Risk {
    pub id: String,
    pub risk_no: String,
    pub title: String,
    pub description: Option<String>,
    pub risk_type: Option<String>,
    pub hazard_factor: Option<String>,
    pub likelihood: Option<i32>,
    pub severity: Option<i32>,
    pub risk_level: Option<String>,
    pub control_measures: Option<String>,
    pub status: String,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RiskControlMeasure {
    pub id: String,
    pub risk_id: String,
    pub title: String,
    pub description: Option<String>,
    pub measure_type: Option<String>,
    pub status: String,
    pub created_at: String,

    pub tenant_id: Uuid,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:risk:read"])),
    path = "/api/ehs/hazards",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_risks(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Query(query): Query<RiskQuery>,
) -> Json<ApiResponse<Vec<Risk>>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
        let tenant_bind: String = if claims.is_superuser {
        uuid::Uuid::nil().to_string()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
            .to_string()
    };
    let tenant_id = if claims.is_superuser {{
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    }} else {{
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
    }};
    let rls_tenant = if claims.is_superuser {{
        uuid::Uuid::nil()
    }} else {{
        tenant_id
    }};

    let mut params: Vec<String> = vec![tenant_bind];
    let mut where_clause = String::from(" WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL");

    if let Some(status) = &query.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
        params.push(status.clone());
    }
    if let Some(level) = &query.risk_level {
        where_clause.push_str(&format!(" AND risk_level = ${}", params.len() + 1));
        params.push(level.clone());
    }

    let fetch_sql = format!(
        r#"
        SELECT
            id::text AS id, risk_no, title, description, risk_type, hazard_factor,
            likelihood, severity, risk_level, control_measures, status,
            assessed_by, assessed_at::TEXT AS assessed_at,
            created_at::TEXT AS created_at, updated_at::TEXT AS updated_at
        FROM ehs.qa_ehs_risks
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#,
        where_clause = where_clause,
    );

    let mut fetch_query = sqlx::query(&fetch_sql);
    for p in &params {
        fetch_query = fetch_query.bind(p);
    }

    let rows = match fetch_query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list risks: {}", e);
            return Json(ApiResponse::error(500, "获取风险列表失败"));
        }
    };

    let risks: Vec<Risk> = rows
        .iter()
        .map(|r| Risk {
            id: r.try_get::<String, _>("id").unwrap_or_default(),
            risk_no: r.try_get::<String, _>("risk_no").unwrap_or_default(),
            title: r.try_get::<String, _>("title").unwrap_or_default(),
            description: r.try_get::<Option<String>, _>("description").ok().flatten(),
            risk_type: r.try_get::<Option<String>, _>("risk_type").ok().flatten(),
            hazard_factor: r.try_get::<Option<String>, _>("hazard_factor").ok().flatten(),
            likelihood: r.try_get::<Option<i32>, _>("likelihood").ok().flatten(),
            severity: r.try_get::<Option<i32>, _>("severity").ok().flatten(),
            risk_level: r.try_get::<Option<String>, _>("risk_level").ok().flatten(),
            control_measures: r.try_get::<Option<String>, _>("control_measures").ok().flatten(),
            status: r.try_get::<Option<String>, _>("status").ok().flatten().unwrap_or_else(|| "identified".to_string()),
            tenant_id: uuid::Uuid::nil(),
        })
        .collect();

    Json(ApiResponse::success(risks, "获取风险列表成功"))
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:risk:write"])),
    path = "/api/ehs/hazards",
    request_body = serde_json::Value,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_risk(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<Risk>> {
        let tenant_bind: String = if claims.is_superuser {
        uuid::Uuid::nil().to_string()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
            .to_string()
    };
    let tenant_id = if claims.is_superuser {{
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    }} else {{
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
    }};
    let rls_tenant = if claims.is_superuser {{
        uuid::Uuid::nil()
    }} else {{
        tenant_id
    }};
    tracing::debug!("Creating risk: {:?}", req);

    let risk_id = uuid::Uuid::new_v4();
    let risk_no = format!("RSK-{}", uuid::Uuid::new_v4().to_string()[..8].to_uppercase());
    let now = chrono::Utc::now().to_rfc3339();
    let title = req.get("title").and_then(|v| v.as_str()).unwrap_or("未命名风险").to_string();

    let mut txn = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin risk txn: {}", e);
            return Json(ApiResponse::error(500, "创建风险失败"));
        }
    };
    if let Err(e) = sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
        .bind(rls_tenant.to_string())
        .execute(&mut *txn)
        .await
    {
        tracing::error!("Failed to set RLS context for risk create: {}", e);
        return Json(ApiResponse::error(500, "创建风险失败"));
    }
    let result = sqlx::query(
        r#"
        INSERT INTO ehs.qa_ehs_risks (id, risk_no, title, description, risk_type, hazard_factor,
            likelihood, severity, risk_level, control_measures, status, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id::text AS id, risk_no, title, description, risk_type, hazard_factor,
            likelihood, severity, risk_level, control_measures, status, tenant_id::text AS tenant_id,
            created_at::TEXT AS created_at, updated_at::TEXT AS updated_at
        "#,
    )
    .bind(risk_id)
    .bind(&risk_no)
    .bind(&title)
    .bind(req.get("description").and_then(|v| v.as_str()).map(|s| s.to_string()))
    .bind(req.get("risk_type").and_then(|v| v.as_str()).map(|s| s.to_string()))
    .bind(req.get("hazard_factor").and_then(|v| v.as_str()).map(|s| s.to_string()))
    .bind(req.get("likelihood").and_then(|v| v.as_i64()).map(|i| i as i32))
    .bind(req.get("severity").and_then(|v| v.as_i64()).map(|i| i as i32))
    .bind(req.get("risk_level").and_then(|v| v.as_str()).map(|s| s.to_string()))
    .bind(req.get("control_measures").and_then(|v| v.as_str()).map(|s| s.to_string()))
    .bind(req.get("status").and_then(|v| v.as_str()).unwrap_or("identified").to_string())
    .bind(tenant_id)
    .fetch_one(&mut *txn)
    .await;

    let row = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create risk: {}", e);
            return Json(ApiResponse::error(500, "创建风险失败"));
        }
    };
    if let Err(e) = txn.commit().await {
        tracing::error!("Failed to commit risk create: {}", e);
        return Json(ApiResponse::error(500, "创建风险失败"));
    }

    Json(ApiResponse::success(
        Risk {
            id: row.try_get::<String, _>("id").unwrap_or_default(),
            risk_no: row.try_get::<String, _>("risk_no").unwrap_or_default(),
            title: row.try_get::<String, _>("title").unwrap_or_default(),
            description: row.try_get::<Option<String>, _>("description").ok().flatten(),
            risk_type: row.try_get::<Option<String>, _>("risk_type").ok().flatten(),
            hazard_factor: row.try_get::<Option<String>, _>("hazard_factor").ok().flatten(),
            likelihood: row.try_get::<Option<i32>, _>("likelihood").ok().flatten(),
            severity: row.try_get::<Option<i32>, _>("severity").ok().flatten(),
            risk_level: row.try_get::<Option<String>, _>("risk_level").ok().flatten(),
            control_measures: row.try_get::<Option<String>, _>("control_measures").ok().flatten(),
            status: row.try_get::<Option<String>, _>("status").ok().flatten().unwrap_or_else(|| "identified".to_string()),
            tenant_id: uuid::Uuid::nil(),
        },
        "风险创建成功",
    ))
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:risk:read"])),
    path = "/api/ehs/hazards/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_risk(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Risk>> {
        let tenant_bind: String = if claims.is_superuser {
        uuid::Uuid::nil().to_string()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
            .to_string()
    };
    let tenant_id = if claims.is_superuser {{
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    }} else {{
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
    }};
    let rls_tenant = if claims.is_superuser {{
        uuid::Uuid::nil()
    }} else {{
        tenant_id
    }};
    tracing::debug!("Getting risk: {}", id);

    let result = sqlx::query(
        r#"
        SELECT
            id::text AS id, risk_no, title, description, risk_type, hazard_factor,
            likelihood, severity, risk_level, control_measures, status,
            assessed_by, assessed_at::TEXT AS assessed_at,
            created_at::TEXT AS created_at, updated_at::TEXT AS updated_at
        FROM ehs.qa_ehs_risks
        WHERE ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2) AND id = $1::uuid AND deleted_at IS NULL
        "#,
    )
    .bind(&id)
    .bind(&tenant_bind)
    .fetch_optional(&state.pool)
    .await;

    let row = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to get risk: {}", e);
            return Json(ApiResponse::error(500, "获取风险详情失败"));
        }
    };
    let row = match row {
        Some(r) => r,
        None => return Json(ApiResponse::error(404, "风险不存在")),
    };

    Json(ApiResponse::success(
        Risk {
            id: row.try_get::<String, _>("id").unwrap_or_default(),
            risk_no: row.try_get::<String, _>("risk_no").unwrap_or_default(),
            title: row.try_get::<String, _>("title").unwrap_or_default(),
            description: row.try_get::<Option<String>, _>("description").ok().flatten(),
            risk_type: row.try_get::<Option<String>, _>("risk_type").ok().flatten(),
            hazard_factor: row.try_get::<Option<String>, _>("hazard_factor").ok().flatten(),
            likelihood: row.try_get::<Option<i32>, _>("likelihood").ok().flatten(),
            severity: row.try_get::<Option<i32>, _>("severity").ok().flatten(),
            risk_level: row.try_get::<Option<String>, _>("risk_level").ok().flatten(),
            control_measures: row.try_get::<Option<String>, _>("control_measures").ok().flatten(),
            status: row.try_get::<Option<String>, _>("status").ok().flatten().unwrap_or_else(|| "identified".to_string()),
            tenant_id: uuid::Uuid::nil(),
        },
        "获取风险成功",
    ))
}
#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:risk:write"])),
    path = "/api/ehs/hazards/{id}",
    request_body = serde_json::Value,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_risk(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<Risk>> {
        let tenant_bind: String = if claims.is_superuser {
        uuid::Uuid::nil().to_string()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
            .to_string()
    };
    let tenant_id = if claims.is_superuser {{
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    }} else {{
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
    }};
    let rls_tenant = if claims.is_superuser {{
        uuid::Uuid::nil()
    }} else {{
        tenant_id
    }};
    tracing::debug!("Updating risk {}: {:?}", id, req);

    let mut txn = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin risk txn: {}", e);
            return Json(ApiResponse::error(500, "风险操作失败"));
        }
    };
    if let Err(e) = sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
        .bind(rls_tenant.to_string())
        .execute(&mut *txn)
        .await
    {
        tracing::error!("Failed to set RLS context for risk op: {}", e);
        return Json(ApiResponse::error(500, "风险操作失败"));
    }
    let result = sqlx::query(
        r#"
        UPDATE ehs.qa_ehs_risks SET
            title = COALESCE($3, title),
            description = COALESCE($4, description),
            risk_type = COALESCE($5, risk_type),
            hazard_factor = COALESCE($6, hazard_factor),
            likelihood = COALESCE($7, likelihood),
            severity = COALESCE($8, severity),
            risk_level = COALESCE($9, risk_level),
            control_measures = COALESCE($10, control_measures),
            status = COALESCE($11, status),
            updated_at = NOW()
        WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND id = $2::uuid AND deleted_at IS NULL
        RETURNING id::text AS id, risk_no, title, description, risk_type, hazard_factor,
            likelihood, severity, risk_level, control_measures, status,
            created_at::TEXT AS created_at, updated_at::TEXT AS updated_at
        "#,
    )
    .bind(&tenant_bind)
    .bind(&id)
    .bind(req.get("title").and_then(|v| v.as_str()).map(|s| s.to_string()))
    .bind(req.get("description").and_then(|v| v.as_str()).map(|s| s.to_string()))
    .bind(req.get("risk_type").and_then(|v| v.as_str()).map(|s| s.to_string()))
    .bind(req.get("hazard_factor").and_then(|v| v.as_str()).map(|s| s.to_string()))
    .bind(req.get("likelihood").and_then(|v| v.as_i64()).map(|i| i as i32))
    .bind(req.get("severity").and_then(|v| v.as_i64()).map(|i| i as i32))
    .bind(req.get("risk_level").and_then(|v| v.as_str()).map(|s| s.to_string()))
    .bind(req.get("control_measures").and_then(|v| v.as_str()).map(|s| s.to_string()))
    .bind(req.get("status").and_then(|v| v.as_str()).map(|s| s.to_string()))
    .fetch_optional(&mut *txn)
    .await;

    let row = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to update risk: {}", e);
            return Json(ApiResponse::error(500, "更新风险失败"));
        }
    };
    let row = match row {
        Some(r) => r,
        None => return Json(ApiResponse::error(404, "风险不存在或无权访问")),
    };
    if let Err(e) = txn.commit().await {
        tracing::error!("Failed to commit risk update: {}", e);
        return Json(ApiResponse::error(500, "更新风险失败"));
    }

    Json(ApiResponse::success(
        Risk {
            id: row.try_get::<String, _>("id").unwrap_or_default(),
            risk_no: row.try_get::<String, _>("risk_no").unwrap_or_default(),
            title: row.try_get::<String, _>("title").unwrap_or_default(),
            description: row.try_get::<Option<String>, _>("description").ok().flatten(),
            risk_type: row.try_get::<Option<String>, _>("risk_type").ok().flatten(),
            hazard_factor: row.try_get::<Option<String>, _>("hazard_factor").ok().flatten(),
            likelihood: row.try_get::<Option<i32>, _>("likelihood").ok().flatten(),
            severity: row.try_get::<Option<i32>, _>("severity").ok().flatten(),
            risk_level: row.try_get::<Option<String>, _>("risk_level").ok().flatten(),
            control_measures: row.try_get::<Option<String>, _>("control_measures").ok().flatten(),
            status: row.try_get::<Option<String>, _>("status").ok().flatten().unwrap_or_else(|| "identified".to_string()),
            tenant_id: uuid::Uuid::nil(),
        },
        "风险更新成功",
    ))
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:risk:write"])),
    path = "/api/ehs/hazards/{id}/assessments",
    request_body = serde_json::Value,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn assess_risk(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<Risk>> {
        let tenant_bind: String = if claims.is_superuser {
        uuid::Uuid::nil().to_string()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
            .to_string()
    };
    let tenant_id = if claims.is_superuser {{
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    }} else {{
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
    }};
    let rls_tenant = if claims.is_superuser {{
        uuid::Uuid::nil()
    }} else {{
        tenant_id
    }};
    tracing::debug!("Assessing risk {}: {:?}", id, req);
    let assessed_by = claims.username.clone();

    let mut txn = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin risk txn: {}", e);
            return Json(ApiResponse::error(500, "风险操作失败"));
        }
    };
    if let Err(e) = sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
        .bind(rls_tenant.to_string())
        .execute(&mut *txn)
        .await
    {
        tracing::error!("Failed to set RLS context for risk op: {}", e);
        return Json(ApiResponse::error(500, "风险操作失败"));
    }
    let result = sqlx::query(
        r#"
        UPDATE ehs.qa_ehs_risks SET
            likelihood = COALESCE($3, likelihood),
            severity = COALESCE($4, severity),
            risk_level = COALESCE($5, risk_level),
            control_measures = COALESCE($6, control_measures),
            status = COALESCE($7, status),
            assessed_by = $8,
            assessed_at = NOW(),
            updated_at = NOW()
        WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND id = $2::uuid AND deleted_at IS NULL
        RETURNING id::text AS id, risk_no, title, description, risk_type, hazard_factor,
            likelihood, severity, risk_level, control_measures, status,
            assessed_by, assessed_at::TEXT AS assessed_at,
            created_at::TEXT AS created_at, updated_at::TEXT AS updated_at
        "#,
    )
    .bind(&tenant_bind)
    .bind(&id)
    .bind(req.get("likelihood").and_then(|v| v.as_i64()).map(|i| i as i32))
    .bind(req.get("severity").and_then(|v| v.as_i64()).map(|i| i as i32))
    .bind(req.get("risk_level").and_then(|v| v.as_str()).map(|s| s.to_string()))
    .bind(req.get("control_measures").and_then(|v| v.as_str()).map(|s| s.to_string()))
    .bind(req.get("status").and_then(|v| v.as_str()).map(|s| s.to_string()))
    .bind(assessed_by)
    .fetch_optional(&mut *txn)
    .await;

    let row = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to assess risk: {}", e);
            return Json(ApiResponse::error(500, "风险评估失败"));
        }
    };
    let row = match row {
        Some(r) => r,
        None => return Json(ApiResponse::error(404, "风险不存在或无权访问")),
    };
    if let Err(e) = txn.commit().await {
        tracing::error!("Failed to commit risk assess: {}", e);
        return Json(ApiResponse::error(500, "风险评估失败"));
    }

    Json(ApiResponse::success(
        Risk {
            id: row.try_get::<String, _>("id").unwrap_or_default(),
            risk_no: row.try_get::<String, _>("risk_no").unwrap_or_default(),
            title: row.try_get::<String, _>("title").unwrap_or_default(),
            description: row.try_get::<Option<String>, _>("description").ok().flatten(),
            risk_type: row.try_get::<Option<String>, _>("risk_type").ok().flatten(),
            hazard_factor: row.try_get::<Option<String>, _>("hazard_factor").ok().flatten(),
            likelihood: row.try_get::<Option<i32>, _>("likelihood").ok().flatten(),
            severity: row.try_get::<Option<i32>, _>("severity").ok().flatten(),
            risk_level: row.try_get::<Option<String>, _>("risk_level").ok().flatten(),
            control_measures: row.try_get::<Option<String>, _>("control_measures").ok().flatten(),
            status: row.try_get::<Option<String>, _>("status").ok().flatten().unwrap_or_else(|| "identified".to_string()),
            tenant_id: uuid::Uuid::nil(),
        },
        "风险评估成功",
    ))
}
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:risk:write"])),
    path = "/api/ehs/hazards/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_risk(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
        let tenant_bind: String = if claims.is_superuser {
        uuid::Uuid::nil().to_string()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
            .to_string()
    };
    let tenant_id = if claims.is_superuser {{
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    }} else {{
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
    }};
    let rls_tenant = if claims.is_superuser {{
        uuid::Uuid::nil()
    }} else {{
        tenant_id
    }};
    tracing::debug!("Deleting risk: {}", id);

    let mut txn = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin risk txn: {}", e);
            return Json(ApiResponse::error(500, "风险操作失败"));
        }
    };
    if let Err(e) = sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
        .bind(rls_tenant.to_string())
        .execute(&mut *txn)
        .await
    {
        tracing::error!("Failed to set RLS context for risk op: {}", e);
        return Json(ApiResponse::error(500, "风险操作失败"));
    }
    let result = sqlx::query(
        r#"
        UPDATE ehs.qa_ehs_risks SET deleted_at = NOW(), updated_at = NOW()
        WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND id = $2::uuid AND deleted_at IS NULL
        RETURNING id
        "#,
    )
    .bind(&tenant_bind)
    .bind(&id)
    .fetch_optional(&mut *txn)
    .await;

    match result {
        Ok(Some(_)) => {}
        Ok(None) => return Json(ApiResponse::error(404, "风险不存在或无权访问")),
        Err(e) => {
            tracing::error!("Failed to delete risk: {}", e);
            return Json(ApiResponse::error(500, "删除风险失败"));
        }
    }
    if let Err(e) = txn.commit().await {
        tracing::error!("Failed to commit risk delete: {}", e);
        return Json(ApiResponse::error(500, "删除风险失败"));
    }

    Json(ApiResponse::success((), "风险删除成功"))
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/hazards/{id}/controls",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn list_control_measures(    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<RiskControlMeasure>>> {
    let tenant_bind: String = if claims.is_superuser {
        uuid::Uuid::nil().to_string()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
            .to_string()
    };
    let tenant_id = if claims.is_superuser {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
    };
    let rls_tenant = if claims.is_superuser {
        uuid::Uuid::nil()
    } else {
        tenant_id
    };
    tracing::debug!("Listing control measures for risk: {}", id);

    let result = sqlx::query(
        r#"
        SELECT id::text AS id, risk_id::text AS risk_id, title, description, measure_type, status, created_at
        FROM ehs.qa_ehs_risk_controls
        WHERE risk_id = $1::uuid AND deleted_at IS NULL
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
        ORDER BY created_at DESC
        "#,
    )
    .bind(&id)
    .bind(&tenant_bind)
    .fetch_all(&state.pool)
    .await;

    let rows = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list control measures: {}", e);
            return Json(ApiResponse::error(500, "获取控制措施列表失败"));
        }
    };
    let measures = rows
        .iter()
        .map(|r| RiskControlMeasure {
            id: r.try_get::<String, _>("id").unwrap_or_default(),
            risk_id: r.try_get::<String, _>("risk_id").unwrap_or_default(),
            title: r.try_get::<String, _>("title").unwrap_or_default(),
            description: r.try_get::<Option<String>, _>("description").ok().flatten(),
            measure_type: r.try_get::<Option<String>, _>("measure_type").ok().flatten(),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "active".to_string()),
            created_at: r
                .try_get::<Option<String>, _>("created_at")
                .ok()
                .flatten()
                .unwrap_or_default(),
            tenant_id: uuid::Uuid::nil(),
        })
        .collect();

    Json(ApiResponse::success(measures, "获取控制措施列表成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/hazards/{id}/controls",
    request_body = serde_json::Value,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn create_control_measure(    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<RiskControlMeasure>> {
    let tenant_bind: String = if claims.is_superuser {
        uuid::Uuid::nil().to_string()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
            .to_string()
    };
    let tenant_id = if claims.is_superuser {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
    };
    let rls_tenant = if claims.is_superuser {
        uuid::Uuid::nil()
    } else {
        tenant_id
    };
    let title = req
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("未命名措施")
        .to_string();
    let measure_no = format!("CM-{}", uuid::Uuid::new_v4().to_string()[..8].to_uppercase());
    tracing::debug!("Creating control measure for risk {}: {:?}", id, req);

    let mut txn = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin control measure txn: {}", e);
            return Json(ApiResponse::error(500, "创建控制措施失败"));
        }
    };
    if let Err(e) = sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
        .bind(rls_tenant.to_string())
        .execute(&mut *txn)
        .await
    {
        tracing::error!("Failed to set RLS context for control create: {}", e);
        return Json(ApiResponse::error(500, "创建控制措施失败"));
    }

    let owned = sqlx::query_as::<_, (String,)>(
        r#"
        SELECT id::text FROM ehs.qa_ehs_risks
        WHERE id = $1::uuid AND deleted_at IS NULL
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
        "#,
    )
    .bind(&id)
    .bind(&tenant_bind)
    .fetch_optional(&mut *txn)
    .await;

    let owned = match owned {
        Ok(o) => o,
        Err(e) => {
            tracing::error!("Failed to verify risk ownership: {}", e);
            return Json(ApiResponse::error(500, "创建控制措施失败"));
        }
    };
    if owned.is_none() {
        return Json(ApiResponse::error(404, "风险不存在或无权访问"));
    }

    let result = sqlx::query(
        r#"
        INSERT INTO ehs.qa_ehs_risk_controls (risk_id, measure_no, title, description, measure_type, status, tenant_id)
        VALUES ($1::uuid, $2, $3, $4, $5, 'active', $6::uuid)
        RETURNING id::text AS id, risk_id::text AS risk_id, title, description, measure_type, status, created_at
        "#,
    )
    .bind(&id)
    .bind(&measure_no)
    .bind(&title)
    .bind(req.get("description").and_then(|v| v.as_str()).map(|s| s.to_string()))
    .bind(req.get("measure_type").and_then(|v| v.as_str()).map(|s| s.to_string()))
    .bind(tenant_id.to_string())
    .fetch_optional(&mut *txn)
    .await;

    let row = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create control measure: {}", e);
            return Json(ApiResponse::error(500, "创建控制措施失败"));
        }
    };
    let row = match row {
        Some(r) => r,
        None => return Json(ApiResponse::error(500, "创建控制措施失败")),
    };
    if let Err(e) = txn.commit().await {
        tracing::error!("Failed to commit control create: {}", e);
        return Json(ApiResponse::error(500, "创建控制措施失败"));
    }

    Json(ApiResponse::success(
        RiskControlMeasure {
            id: row.try_get::<String, _>("id").unwrap_or_default(),
            risk_id: row.try_get::<String, _>("risk_id").unwrap_or_default(),
            title: row.try_get::<String, _>("title").unwrap_or_default(),
            description: row.try_get::<Option<String>, _>("description").ok().flatten(),
            measure_type: row.try_get::<Option<String>, _>("measure_type").ok().flatten(),
            status: row.try_get::<Option<String>, _>("status").ok().flatten().unwrap_or_else(|| "active".to_string()),
            created_at: row.try_get::<Option<String>, _>("created_at").ok().flatten().unwrap_or_default(),
            tenant_id,
        },
        "控制措施创建成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:update"])),
    path = "/api/ehs/hazards/{id}/controls/{measure_id}",
    request_body = serde_json::Value,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id"),
        ("measure_id" = String, Path, description = "measure_id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_control_measure(    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path((id, measure_id)): axum::extract::Path<(String, String)>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<RiskControlMeasure>> {
    let tenant_bind: String = if claims.is_superuser {
        uuid::Uuid::nil().to_string()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
            .to_string()
    };
    let tenant_id = if claims.is_superuser {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
    };
    let rls_tenant = if claims.is_superuser {
        uuid::Uuid::nil()
    } else {
        tenant_id
    };
    tracing::debug!(
        "Updating control measure {} for risk {}: {:?}",
        measure_id,
        id,
        req
    );

    let mut txn = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin control update txn: {}", e);
            return Json(ApiResponse::error(500, "更新控制措施失败"));
        }
    };
    if let Err(e) = sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
        .bind(rls_tenant.to_string())
        .execute(&mut *txn)
        .await
    {
        tracing::error!("Failed to set RLS context for control update: {}", e);
        return Json(ApiResponse::error(500, "更新控制措施失败"));
    }

    let result = sqlx::query(
        r#"
        UPDATE ehs.qa_ehs_risk_controls SET
            title = COALESCE($3, title),
            description = COALESCE($4, description),
            measure_type = COALESCE($5, measure_type),
            status = COALESCE($6, status),
            updated_at = NOW()
        WHERE risk_id = $1::uuid AND id = $2::uuid AND deleted_at IS NULL
          AND ($7 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $7)
        RETURNING id::text AS id, risk_id::text AS risk_id, title, description, measure_type, status, created_at
        "#,
    )
    .bind(&id)
    .bind(&measure_id)
    .bind(req.get("title").and_then(|v| v.as_str()).map(|s| s.to_string()))
    .bind(req.get("description").and_then(|v| v.as_str()).map(|s| s.to_string()))
    .bind(req.get("measure_type").and_then(|v| v.as_str()).map(|s| s.to_string()))
    .bind(req.get("status").and_then(|v| v.as_str()).map(|s| s.to_string()))
    .bind(&tenant_bind)
    .fetch_optional(&mut *txn)
    .await;

    let row = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to update control measure: {}", e);
            return Json(ApiResponse::error(500, "更新控制措施失败"));
        }
    };
    let row = match row {
        Some(r) => r,
        None => return Json(ApiResponse::error(404, "控制措施不存在或无权访问")),
    };
    if let Err(e) = txn.commit().await {
        tracing::error!("Failed to commit control update: {}", e);
        return Json(ApiResponse::error(500, "更新控制措施失败"));
    }

    Json(ApiResponse::success(
        RiskControlMeasure {
            id: row.try_get::<String, _>("id").unwrap_or_default(),
            risk_id: row.try_get::<String, _>("risk_id").unwrap_or_default(),
            title: row.try_get::<String, _>("title").unwrap_or_default(),
            description: row.try_get::<Option<String>, _>("description").ok().flatten(),
            measure_type: row.try_get::<Option<String>, _>("measure_type").ok().flatten(),
            status: row.try_get::<Option<String>, _>("status").ok().flatten().unwrap_or_else(|| "active".to_string()),
            created_at: row.try_get::<Option<String>, _>("created_at").ok().flatten().unwrap_or_default(),
            tenant_id,
        },
        "控制措施更新成功",
    ))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:delete"])),
    path = "/api/ehs/hazards/{id}/controls/{measure_id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id"),
        ("measure_id" = String, Path, description = "measure_id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_control_measure(    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path((id, measure_id)): axum::extract::Path<(String, String)>,
) -> Json<ApiResponse<()>> {
    let tenant_bind: String = if claims.is_superuser {
        uuid::Uuid::nil().to_string()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
            .to_string()
    };
    let tenant_id = if claims.is_superuser {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
    };
    let rls_tenant = if claims.is_superuser {
        uuid::Uuid::nil()
    } else {
        tenant_id
    };
    tracing::debug!("Deleting control measure {} for risk {}", measure_id, id);

    let mut txn = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin control delete txn: {}", e);
            return Json(ApiResponse::error(500, "删除控制措施失败"));
        }
    };
    if let Err(e) = sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
        .bind(rls_tenant.to_string())
        .execute(&mut *txn)
        .await
    {
        tracing::error!("Failed to set RLS context for control delete: {}", e);
        return Json(ApiResponse::error(500, "删除控制措施失败"));
    }

    let result = sqlx::query(
        r#"
        UPDATE ehs.qa_ehs_risk_controls SET deleted_at = NOW(), updated_at = NOW()
        WHERE risk_id = $1::uuid AND id = $2::uuid AND deleted_at IS NULL
          AND ($3 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $3)
        RETURNING id
        "#,
    )
    .bind(&id)
    .bind(&measure_id)
    .bind(&tenant_bind)
    .fetch_optional(&mut *txn)
    .await;

    match result {
        Ok(Some(_)) => {}
        Ok(None) => return Json(ApiResponse::error(404, "控制措施不存在或无权访问")),
        Err(e) => {
            tracing::error!("Failed to delete control measure: {}", e);
            return Json(ApiResponse::error(500, "删除控制措施失败"));
        }
    }
    if let Err(e) = txn.commit().await {
        tracing::error!("Failed to commit control delete: {}", e);
        return Json(ApiResponse::error(500, "删除控制措施失败"));
    }

    Json(ApiResponse::success((), "控制措施删除成功"))
}

pub fn risk_matrix_score(likelihood: u8, severity: u8) -> u8 {
    let l = likelihood.min(5).max(1);
    let s = severity.min(5).max(1);
    l * s
}

pub fn matrix_classify(score: u8) -> &'static str {
    match score {
        1..=2 => "low",
        3..=6 => "medium",
        7..=12 => "high",
        13..=25 => "critical",
        _ => "low",
    }
}

pub fn lec_score(l: u8, e: u8, c: u8) -> u32 {
    let lv = l.min(10).max(1) as u32;
    let ev = e.min(10).max(1) as u32;
    let cv = c.min(100).max(1) as u32;
    lv * ev * cv
}

pub fn lec_classify(lec: u32) -> &'static str {
    match lec {
        0..=20 => "轻微风险",
        21..=70 => "一般风险",
        71..=160 => "显著风险",
        161..=320 => "高度风险",
        _ => "极其危险",
    }
}

pub fn residual_risk(inherent: u8, control_effectiveness: f64) -> u8 {
    let ce = control_effectiveness.clamp(0.0, 1.0);
    let reduced = inherent as f64 * (1.0 - ce);
    reduced.round() as u8
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_matrix_score_basic() {
        assert_eq!(risk_matrix_score(1, 1), 1);
        assert_eq!(risk_matrix_score(5, 5), 25);
        assert_eq!(risk_matrix_score(3, 3), 9);
    }

    #[test]
    fn test_matrix_score_clamping() {
        assert_eq!(risk_matrix_score(0, 3), 3);
        assert_eq!(risk_matrix_score(3, 0), 3);
        assert_eq!(risk_matrix_score(10, 3), 15);
        assert_eq!(risk_matrix_score(3, 10), 15);
    }

    #[test]
    fn test_matrix_classify_low() {
        assert_eq!(matrix_classify(1), "low");
        assert_eq!(matrix_classify(2), "low");
        assert_eq!(matrix_classify(0), "low");
    }

    #[test]
    fn test_matrix_classify_medium() {
        assert_eq!(matrix_classify(3), "medium");
        assert_eq!(matrix_classify(4), "medium");
        assert_eq!(matrix_classify(6), "medium");
    }

    #[test]
    fn test_matrix_classify_high() {
        assert_eq!(matrix_classify(7), "high");
        assert_eq!(matrix_classify(9), "high");
        assert_eq!(matrix_classify(12), "high");
    }

    #[test]
    fn test_matrix_classify_critical() {
        assert_eq!(matrix_classify(13), "critical");
        assert_eq!(matrix_classify(20), "critical");
        assert_eq!(matrix_classify(25), "critical");
        assert_eq!(matrix_classify(100), "low");
    }

    #[test]
    fn test_lec_score_basic() {
        assert_eq!(lec_score(1, 1, 1), 1);
        assert_eq!(lec_score(6, 6, 15), 540);
        assert_eq!(lec_score(3, 4, 10), 120);
    }

    #[test]
    fn test_lec_score_clamping() {
        assert_eq!(lec_score(0, 5, 5), 25);
        assert_eq!(lec_score(20, 5, 5), 250);
        assert_eq!(lec_score(5, 0, 5), 25);
        assert_eq!(lec_score(5, 20, 5), 250);
        assert_eq!(lec_score(5, 5, 0), 25);
        assert_eq!(lec_score(5, 5, 200), 2500);
    }

    #[test]
    fn test_lec_classify_all_levels() {
        assert_eq!(lec_classify(10), "轻微风险");
        assert_eq!(lec_classify(20), "轻微风险");
        assert_eq!(lec_classify(21), "一般风险");
        assert_eq!(lec_classify(70), "一般风险");
        assert_eq!(lec_classify(71), "显著风险");
        assert_eq!(lec_classify(160), "显著风险");
        assert_eq!(lec_classify(161), "高度风险");
        assert_eq!(lec_classify(320), "高度风险");
        assert_eq!(lec_classify(321), "极其危险");
        assert_eq!(lec_classify(1000), "极其危险");
    }

    #[test]
    fn test_residual_risk_no_control() {
        assert_eq!(residual_risk(10, 0.0), 10);
    }

    #[test]
    fn test_residual_risk_full_control() {
        assert_eq!(residual_risk(10, 1.0), 0);
    }

    #[test]
    fn test_residual_risk_half_control() {
        assert_eq!(residual_risk(10, 0.5), 5);
    }

    #[test]
    fn test_residual_risk_70pct() {
        assert_eq!(residual_risk(10, 0.7), 3);
    }

    #[test]
    fn test_residual_risk_clamping() {
        assert_eq!(residual_risk(10, -0.5), 10);
        assert_eq!(residual_risk(10, 2.0), 0);
    }

    #[test]
    fn test_risk_struct_serde_roundtrip() {
        use serde_json;
        let tenant_id = Uuid::new_v4();
        let risk = Risk {
            id: "risk-001".to_string(),
            risk_no: "RSK-2024-001".to_string(),
            title: "Test Risk".to_string(),
            description: Some("Test description".to_string()),
            risk_type: Some("safety".to_string()),
            hazard_factor: Some("坠落".to_string()),
            likelihood: Some(3),
            severity: Some(4),
            risk_level: Some("high".to_string()),
            control_measures: Some("防护栏".to_string()),
            status: "identified".to_string(),
            tenant_id,
        };
        let json = serde_json::to_string(&risk).unwrap();
        let deserialized: Risk = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.id, risk.id);
        assert_eq!(deserialized.risk_no, risk.risk_no);
        assert_eq!(deserialized.title, risk.title);
        assert_eq!(deserialized.tenant_id, risk.tenant_id);
    }

    #[test]
    fn test_risk_struct_clone() {
        let tenant_id = Uuid::new_v4();
        let risk = Risk {
            id: "1".to_string(),
            risk_no: "RSK-001".to_string(),
            title: "Risk".to_string(),
            description: None,
            risk_type: None,
            hazard_factor: None,
            likelihood: None,
            severity: None,
            risk_level: None,
            control_measures: None,
            status: "open".to_string(),
            tenant_id,
        };
        let cloned = risk.clone();
        assert_eq!(cloned.id, risk.id);
        assert_eq!(cloned.tenant_id, risk.tenant_id);
    }

    #[test]
    fn test_risk_control_measure_serde() {
        use serde_json;
        let tenant_id = Uuid::new_v4();
        let measure = RiskControlMeasure {
            id: "m-001".to_string(),
            risk_id: "r-001".to_string(),
            title: "安装防护栏".to_string(),
            description: Some("在平台边缘安装1.2m高防护栏".to_string()),
            measure_type: Some("engineering".to_string()),
            status: "active".to_string(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
            tenant_id,
        };
        let json = serde_json::to_string(&measure).unwrap();
        let de: RiskControlMeasure = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, measure.id);
        assert_eq!(de.risk_id, measure.risk_id);
        assert_eq!(de.title, measure.title);
    }

    #[test]
    fn test_risk_query_defaults() {
        let q: RiskQuery = serde_json::from_str("{}").unwrap();
        assert!(q.page.is_none());
        assert!(q.page_size.is_none());
        assert!(q.status.is_none());
        assert!(q.risk_level.is_none());
    }

    #[test]
    fn test_risk_query_with_values() {
        let q: RiskQuery = serde_json::from_str(
            r#"{"page":1,"page_size":20,"status":"open","risk_level":"high"}"#,
        )
        .unwrap();
        assert_eq!(q.page, Some(1));
        assert_eq!(q.page_size, Some(20));
        assert_eq!(q.status.as_deref(), Some("open"));
        assert_eq!(q.risk_level.as_deref(), Some("high"));
    }
}
