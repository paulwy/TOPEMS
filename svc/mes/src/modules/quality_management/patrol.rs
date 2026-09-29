use axum::{extract::Extension, extract::Path, extract::Query, extract::State, Json};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared_auth::auth::Claims;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, Deserialize)]
pub struct ListPatrolsQuery {
    page: Option<i32>,
    page_size: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreatePatrolRequest {
    pub production_line: Option<String>,
    pub workstation_id: Option<String>,
    pub workstation_name: Option<String>,
    pub inspector: String,
    pub patrol_time: Option<String>,
    pub status: Option<String>,
    pub result: Option<String>,
    pub findings: Option<String>,
    pub memo: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdatePatrolRequest {
    pub production_line: Option<String>,
    pub workstation_id: Option<String>,
    pub workstation_name: Option<String>,
    pub inspector: Option<String>,
    pub patrol_time: Option<String>,
    pub status: Option<String>,
    pub result: Option<String>,
    pub findings: Option<String>,
    pub memo: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PatrolResponse {
    pub id: String,
    pub patrol_no: String,
    pub production_line: Option<String>,
    pub workstation_id: Option<String>,
    pub workstation_name: Option<String>,
    pub inspector: String,
    pub patrol_time: String,
    pub status: String,
    pub result: Option<String>,
    pub findings: Option<String>,
    pub memo: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:quality:read"])),
    path = "/quality/patrols",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Quality"
)]
pub async fn list_patrols(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListPatrolsQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let page_size = query.page_size.unwrap_or(10) as i64;
    let offset = (page - 1) * page_size;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    if let Some(status) = query.status {
        where_clause.push_str(" WHERE qp.status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        let idx = params.len() + 1;
        if where_clause.is_empty() {
            where_clause.push_str(&format!(
                " WHERE (qp.patrol_no ILIKE ${} OR qp.inspector ILIKE ${} OR qp.production_line ILIKE ${})",
                idx, idx, idx
            ));
        } else {
            where_clause.push_str(&format!(
                " AND (qp.patrol_no ILIKE ${} OR qp.inspector ILIKE ${} OR qp.production_line ILIKE ${})",
                idx, idx, idx
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM quality_patrols qp{}",
        where_clause
    );
    let mut count_query = sqlx::query_scalar(&count_sql);
    for p in &params {
        count_query = count_query.bind(p.clone());
    }
    let count_result = count_query.fetch_one(&state.pool).await;
    let total: Option<i64> = match count_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count quality patrols: {}", e);
            return Json(ApiResponse::error(500, "获取巡检记录列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT
            qp.id, qp.patrol_no, qp.production_line, qp.workstation_id,
            qp.workstation_name, qp.inspector, qp.patrol_time,
            qp.status, qp.result, qp.findings, qp.memo,
            qp.created_at, qp.updated_at
        FROM quality_patrols qp
        {}
        ORDER BY qp.created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        params.len() + 1,
        params.len() + 2
    );
    let mut fetch_query = sqlx::query(&fetch_sql);
    for p in &params {
        fetch_query = fetch_query.bind(p.clone());
    }
    fetch_query = fetch_query.bind(page_size).bind(offset);

    let rows = match fetch_query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch quality patrols: {}", e);
            return Json(ApiResponse::error(500, "获取巡检记录列表失败"));
        }
    };

    let patrols: Vec<PatrolResponse> = rows
        .into_iter()
        .map(|r| PatrolResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
            patrol_no: r.try_get::<String, _>("patrol_no").unwrap_or_default(),
            production_line: r
                .try_get::<Option<String>, _>("production_line")
                .ok()
                .flatten(),
            workstation_id: r
                .try_get::<Option<Uuid>, _>("workstation_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            workstation_name: r
                .try_get::<Option<String>, _>("workstation_name")
                .ok()
                .flatten(),
            inspector: r.try_get::<String, _>("inspector").unwrap_or_default(),
            patrol_time: r
                .try_get::<Option<String>, _>("patrol_time")
                .ok()
                .flatten()
                .unwrap_or_default(),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "pending".to_string()),
            result: r.try_get::<Option<String>, _>("result").ok().flatten(),
            findings: r.try_get::<Option<String>, _>("findings").ok().flatten(),
            memo: r.try_get::<Option<String>, _>("memo").ok().flatten(),
            created_at: (r
                .try_get::<Option<DateTime<Utc>>, _>("created_at")
                .ok()
                .flatten()
                )
            .unwrap_or_default(),
            updated_at: (r
                .try_get::<Option<DateTime<Utc>>, _>("updated_at")
                .ok()
                .flatten()
                )
            .unwrap_or_default(),
        })
        .collect();

    Json(ApiResponse::success(
        serde_json::json!({
            "patrols": patrols,
            "total": total.unwrap_or(0),
            "page": page,
            "page_size": page_size,
        }),
        "获取巡检记录列表成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:quality:read"])),
    path = "/quality/patrols/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Quality"
)]
pub async fn get_patrol(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<PatrolResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的巡检记录ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        SELECT
            qp.id, qp.patrol_no, qp.production_line, qp.workstation_id,
            qp.workstation_name, qp.inspector, qp.patrol_time,
            qp.status, qp.result, qp.findings, qp.memo,
            qp.created_at, qp.updated_at
        FROM quality_patrols qp
        WHERE qp.id = $1
        "#,
        uuid,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            PatrolResponse {
                id: r.id.to_string(),
                patrol_no: r.patrol_no,
                production_line: r.production_line,
                workstation_id: r.workstation_id.map(|u| u.to_string()),
                workstation_name: r.workstation_name,
                inspector: r.inspector,
                patrol_time: r.patrol_time.map(|d| d.to_string()).unwrap_or_default(),
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                result: r.result,
                findings: r.findings,
                memo: r.memo,
                created_at: r.created_at.unwrap_or_else(Utc::now),
                updated_at: r.updated_at.unwrap_or_else(Utc::now),
            },
            "获取巡检记录成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "巡检记录不存在")),
        Err(e) => {
            tracing::error!("Failed to get quality patrol: {}", e);
            Json(ApiResponse::error(500, "获取巡检记录失败"))
        }
    }
}

pub async fn create_patrol(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreatePatrolRequest>,
) -> Json<ApiResponse<PatrolResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let now = Utc::now();
    let patrol_no = format!(
        "PT{}{:04}",
        now.format("%Y%m%d"),
        rand::random::<u16>() % 10000
    );

    let workstation_id = body
        .workstation_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());
    let result = sqlx::query_unchecked!(
        r#"
        INSERT INTO quality_patrols (
            patrol_no, production_line, workstation_id, workstation_name,
            inspector, patrol_time, status, result, findings, memo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING
            id, patrol_no, production_line, workstation_id,
            workstation_name, inspector, patrol_time,
            status: status.unwrap_or_default(), result, findings, memo,
            created_at: created_at.unwrap_or_default(), updated_at
        "#,
        patrol_no,
        body.production_line,
        workstation_id,
        body.workstation_name,
        body.inspector,
        body.patrol_time.as_ref().and_then(|s| {
            DateTime::<Utc>::parse_from_str(s, "%Y-%m-%d %H:%M:%S")
                .ok()
                .or_else(|| {
                    chrono::DateTime::parse_from_rfc3339(s)
                        .ok()
                        .map(|dt| dt)
                })
                .or_else(|| {
                    s.parse::<chrono::NaiveDate>()
                        .ok()
                        .and_then(|d| d.and_hms_opt(0, 0, 0))
                })
        }),
        body.status.unwrap_or_else(|| "pending".to_string()),
        body.result,
        body.findings,
        body.memo,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            PatrolResponse {
                id: r.id.to_string(),
                patrol_no: r.patrol_no,
                production_line: r.production_line,
                workstation_id: r.workstation_id.map(|u| u.to_string()),
                workstation_name: r.workstation_name,
                inspector: r.inspector,
                patrol_time: r.patrol_time.map(|d| d.to_string()).unwrap_or_default(),
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                result: r.result,
                findings: r.findings,
                memo: r.memo,
                created_at: r.created_at.unwrap_or_else(Utc::now),
                updated_at: r.updated_at.unwrap_or_else(Utc::now),
            },
            "创建巡检记录成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create quality patrol: {}", e);
            Json(ApiResponse::error(500, "创建巡检记录失败"))
        }
    }
}

pub async fn update_patrol(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<UpdatePatrolRequest>,
) -> Json<ApiResponse<PatrolResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的巡检记录ID"));
        }
    };

    let workstation_id = body
        .workstation_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());
    let result = sqlx::query_unchecked!(
        r#"
        UPDATE quality_patrols
        SET
            production_line = COALESCE($1, production_line),
            workstation_id = COALESCE($2, workstation_id),
            workstation_name = COALESCE($3, workstation_name),
            inspector = COALESCE($4, inspector),
            patrol_time = COALESCE($5, patrol_time),
            status = COALESCE($6, status),
            result = COALESCE($7, result),
            findings = COALESCE($8, findings),
            memo = COALESCE($9, memo),
            updated_at = NOW()
        WHERE id = $10
        RETURNING
            id, patrol_no, production_line, workstation_id,
            workstation_name, inspector, patrol_time,
            status: status.unwrap_or_default(), result, findings, memo,
            created_at: created_at.unwrap_or_default(), updated_at
        "#,
        body.production_line,
        workstation_id,
        body.workstation_name,
        body.inspector,
        body.patrol_time.as_ref().and_then(|s| {
            DateTime::<Utc>::parse_from_str(s, "%Y-%m-%d %H:%M:%S")
                .ok()
                .or_else(|| {
                    chrono::DateTime::parse_from_rfc3339(s)
                        .ok()
                        .map(|dt| dt)
                })
                .or_else(|| {
                    s.parse::<chrono::NaiveDate>()
                        .ok()
                        .and_then(|d| d.and_hms_opt(0, 0, 0))
                })
        }),
        body.status,
        body.result,
        body.findings,
        body.memo,
        uuid,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            PatrolResponse {
                id: r.id.to_string(),
                patrol_no: r.patrol_no,
                production_line: r.production_line,
                workstation_id: r.workstation_id.map(|u| u.to_string()),
                workstation_name: r.workstation_name,
                inspector: r.inspector,
                patrol_time: r.patrol_time.map(|d| d.to_string()).unwrap_or_default(),
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                result: r.result,
                findings: r.findings,
                memo: r.memo,
                created_at: r.created_at.unwrap_or_else(Utc::now),
                updated_at: r.updated_at.unwrap_or_else(Utc::now),
            },
            "更新巡检记录成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "巡检记录不存在")),
        Err(e) => {
            tracing::error!("Failed to update quality patrol: {}", e);
            Json(ApiResponse::error(500, "更新巡检记录失败"))
        }
    }
}

pub async fn delete_patrol(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<String>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的巡检记录ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        UPDATE quality_patrols SET deleted_at = NOW() WHERE id = $1
        "#,
        uuid,
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(id, "删除巡检记录成功")),
        Err(e) => {
            tracing::error!("Failed to delete quality patrol: {}", e);
            Json(ApiResponse::error(500, "删除巡检记录失败"))
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AddPatrolItemRequest {
    pub item_name: String,
    pub standard: Option<String>,
    pub actual_value: Option<String>,
    pub status: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PatrolItemResponse {
    pub id: String,
    pub patrol_id: String,
    pub item_name: String,
    pub standard: Option<String>,
    pub actual_value: Option<String>,
    pub status: String,
    pub remark: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:quality:read"])),
    path = "/quality/patrols/{patrol_id}/items",
    params(
("patrol_id" = String, Path, description = "patrol_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Quality"
)]
pub async fn list_patrol_items(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(patrol_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let patrol_uuid = match Uuid::parse_str(&patrol_id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的巡检记录ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        SELECT
            qpi.id, qpi.patrol_id, qpi.item_name, qpi.standard,
            qpi.actual_value, qpi.status, qpi.remark
        FROM quality_patrol_items qpi
        WHERE qpi.patrol_id = $1
        ORDER BY qpi.created_at ASC
        "#,
        patrol_uuid,
    )
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(rows) => {
            let items: Vec<PatrolItemResponse> = rows
                .into_iter()
                .map(|r| PatrolItemResponse {
                    id: r.id.to_string(),
                    patrol_id: r.patrol_id.to_string(),
                    item_name: r.item_name,
                    standard: r.standard,
                    actual_value: r.actual_value.map(|b| b.to_string()),
                    status: r.status.unwrap_or_else(|| "pending".to_string()),
                    remark: r.remark,
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::json!({ "items": items }),
                "获取巡检项目列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("Failed to list patrol items: {}", e);
            Json(ApiResponse::error(500, "获取巡检项目列表失败"))
        }
    }
}

pub async fn add_patrol_item(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(patrol_id): Path<String>,
    Json(body): Json<AddPatrolItemRequest>,
) -> Json<ApiResponse<PatrolItemResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let patrol_uuid = match Uuid::parse_str(&patrol_id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的巡检记录ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        INSERT INTO quality_patrol_items (
            patrol_id, item_name, standard, actual_value, status, remark
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, patrol_id, item_name, standard, actual_value, status, remark
        "#,
        patrol_uuid,
        body.item_name,
        body.standard,
        body.actual_value.as_deref(),
        body.status.clone().unwrap_or_else(|| "pending".to_string()),
        body.remark,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            PatrolItemResponse {
                id: r.id.to_string(),
                patrol_id: r.patrol_id.to_string(),
                item_name: r.item_name,
                standard: r.standard,
                actual_value: r.actual_value.map(|b| b.to_string()),
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                remark: r.remark,
            },
            "添加巡检项目成功",
        )),
        Err(e) => {
            tracing::error!("Failed to add patrol item: {}", e);
            Json(ApiResponse::error(500, "添加巡检项目失败"))
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdatePatrolItemRequest {
    pub item_name: Option<String>,
    pub standard: Option<String>,
    pub actual_value: Option<String>,
    pub status: Option<String>,
    pub remark: Option<String>,
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:quality:write"])),
    path = "/quality/patrol-items/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Quality"
)]
pub async fn update_patrol_item(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<UpdatePatrolItemRequest>,
) -> Json<ApiResponse<PatrolItemResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的巡检项目ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        UPDATE quality_patrol_items
        SET
            item_name = COALESCE($1, item_name),
            standard = COALESCE($2, standard),
            actual_value = COALESCE($3, actual_value),
            status = COALESCE($4, status),
            remark = COALESCE($5, remark)
        WHERE id = $6
        RETURNING id, patrol_id, item_name, standard, actual_value, status, remark
        "#,
        body.item_name,
        body.standard,
        body.actual_value.as_deref(),
        body.status,
        body.remark,
        uuid,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            PatrolItemResponse {
                id: r.id.to_string(),
                patrol_id: r.patrol_id.to_string(),
                item_name: r.item_name,
                standard: r.standard,
                actual_value: r.actual_value.map(|b| b.to_string()),
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                remark: r.remark,
            },
            "更新巡检项目成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "巡检项目不存在")),
        Err(e) => {
            tracing::error!("Failed to update patrol item: {}", e);
            Json(ApiResponse::error(500, "更新巡检项目失败"))
        }
    }
}

pub async fn delete_patrol_item(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<String>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的巡检项目ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        UPDATE quality_patrol_items SET deleted_at = NOW() WHERE id = $1
        "#,
        uuid,
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(id, "删除巡检项目成功")),
        Err(e) => {
            tracing::error!("Failed to delete patrol item: {}", e);
            Json(ApiResponse::error(500, "删除巡检项目失败"))
        }
    }
}
