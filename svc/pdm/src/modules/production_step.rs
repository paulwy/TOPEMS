use axum::{extract::Path, extract::Query, extract::State, routing::get, Extension, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::types::BigDecimal;
use sqlx::FromRow;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/production-steps", get(list_steps).post(create_step))
        .route(
            "/production-steps/{id}",
            get(get_step).put(update_step).delete(delete_step),
        )
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ProductionStep {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub process_id: Uuid,
    pub step_no: i32,
    pub name: String,
    pub description: Option<String>,
    pub standard_time: Option<BigDecimal>,
    pub equipment_requirement: Option<String>,
    pub quality_check: Option<String>,
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateStepRequest {
    pub process_id: Uuid,
    pub step_no: i32,
    pub name: String,
    pub description: Option<String>,
    pub standard_time: Option<BigDecimal>,
    pub equipment_requirement: Option<String>,
    pub quality_check: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateStepRequest {
    pub process_id: Option<Uuid>,
    pub step_no: Option<i32>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub standard_time: Option<BigDecimal>,
    pub equipment_requirement: Option<String>,
    pub quality_check: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct StepQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub process_id: Option<Uuid>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:read"])),
    path = "/api/pdm/production-steps",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn list_steps(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<StepQuery>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok()).unwrap_or_default())
    };
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, ProductionStep>(
        r#"
        SELECT id, tenant_id, process_id, step_no, name, description, standard_time, equipment_requirement, quality_check, status
        FROM pdm_production_steps
        WHERE (1::uuid IS NULL OR tenant_id = $1)
          AND ($2::uuid IS NULL OR process_id = $2)
        ORDER BY process_id, step_no
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(tenant_id)
    .bind(query.process_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(steps) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM pdm_production_steps
                WHERE deleted_at IS NULL AND (1::uuid IS NULL OR tenant_id = $1)
                  AND ($2::uuid IS NULL OR process_id = $2)
                "#,
            )
            .bind(tenant_id)
            .bind(query.process_id)
            .fetch_one(&state.pool)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "steps": steps,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取工步列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取工步列表失败: {}", e);
            Json(ApiResponse::error(500, "获取工步列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pdm:bom:write"])),
    path = "/api/pdm/production-steps",
    request_body = CreateStepRequest,
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn create_step(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    Json(req): Json<CreateStepRequest>,
) -> Json<ApiResponse<ProductionStep>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

    if req.name.is_empty() {
        return Json(ApiResponse::error(400, "工步名称不能为空"));
    }

    let status = req.status.unwrap_or_else(|| "active".to_string());

    let result = sqlx::query_as::<_, ProductionStep>(
        r#"
        INSERT INTO pdm_production_steps (tenant_id, process_id, step_no, name, description, standard_time, equipment_requirement, quality_check, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, tenant_id, process_id, step_no, name, description, standard_time, equipment_requirement, quality_check, status
        "#,
    )
    .bind(tenant_id)
    .bind(req.process_id)
    .bind(req.step_no)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.standard_time)
    .bind(&req.equipment_requirement)
    .bind(&req.quality_check)
    .bind(&status)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(step) => Json(ApiResponse::success(step, "工步创建成功")),
        Err(e) => {
            tracing::error!("创建工步失败: {}", e);
            Json(ApiResponse::error(500, "创建工步失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:read"])),
    path = "/api/pdm/production-steps/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_step(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<ProductionStep>> {
    let tenant_id: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok()).unwrap_or_default())
    };

    let result = sqlx::query_as::<_, ProductionStep>(
        r#"
        SELECT id, tenant_id, process_id, step_no, name, description, standard_time, equipment_requirement, quality_check, status
        FROM pdm_production_steps WHERE id = $1 AND (2::uuid IS NULL OR tenant_id = $2)
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(step)) => Json(ApiResponse::success(step, "获取工步成功")),
        Ok(None) => Json(ApiResponse::error(404, "工步不存在")),
        Err(e) => {
            tracing::error!("获取工步失败: {}", e);
            Json(ApiResponse::error(500, "获取工步失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pdm:update"])),
    path = "/api/pdm/production-steps/{id}",
    request_body = UpdateStepRequest,
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_step(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Json(req): Json<UpdateStepRequest>,
) -> Json<ApiResponse<ProductionStep>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

    let result = sqlx::query_as::<_, ProductionStep>(
        r#"
        UPDATE pdm_production_steps SET
            process_id = COALESCE($2, process_id),
            step_no = COALESCE($3, step_no),
            name = COALESCE($4, name),
            description = COALESCE($5, description),
            standard_time = COALESCE($6, standard_time),
            equipment_requirement = COALESCE($7, equipment_requirement),
            quality_check = COALESCE($8, quality_check),
            status = COALESCE($9, status)
        WHERE id = $1 AND tenant_id = $10
        RETURNING id, tenant_id, process_id, step_no, name, description, standard_time, equipment_requirement, quality_check, status
        "#,
    )
    .bind(id)
    .bind(req.process_id)
    .bind(req.step_no)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.standard_time)
    .bind(&req.equipment_requirement)
    .bind(&req.quality_check)
    .bind(&req.status)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(step)) => Json(ApiResponse::success(step, "工步更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "工步不存在")),
        Err(e) => {
            tracing::error!("更新工步失败: {}", e);
            Json(ApiResponse::error(500, "更新工步失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["pdm:delete"])),
    path = "/api/pdm/production-steps/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_step(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    });

    let result = sqlx::query(
        "UPDATE pdm_production_steps SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "工步删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "工步不存在")),
        Err(e) => {
            tracing::error!("删除工步失败: {}", e);
            Json(ApiResponse::error(500, "删除工步失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use sqlx::types::BigDecimal;

    #[test]
    fn test_create_routes_smoke() {
        let _router = create_routes();
    }

    #[test]
    fn test_production_step_serde_roundtrip() {
        let step = ProductionStep {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            process_id: Uuid::new_v4(),
            step_no: 1,
            name: "Cutting".to_string(),
            description: Some("Cut metal sheet".to_string()),
            standard_time: Some(BigDecimal::from(5)),
            equipment_requirement: Some("Laser cutter".to_string()),
            quality_check: Some("Visual inspection".to_string()),
            status: "active".to_string(),
        };
        let serialized = serde_json::to_string(&step).unwrap();
        let d: ProductionStep = serde_json::from_str(&serialized).unwrap();
        assert_eq!(d.id, step.id);
        assert_eq!(d.process_id, step.process_id);
        assert_eq!(d.step_no, 1);
        assert_eq!(d.name, "Cutting");
        assert_eq!(d.description.as_deref(), Some("Cut metal sheet"));
        assert_eq!(d.equipment_requirement.as_deref(), Some("Laser cutter"));
        assert_eq!(d.quality_check.as_deref(), Some("Visual inspection"));
        assert_eq!(d.status, "active");
    }

    #[test]
    fn test_production_step_serde_all_none() {
        let step = ProductionStep {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            process_id: Uuid::new_v4(),
            step_no: 2,
            name: "Step".to_string(),
            description: None,
            standard_time: None,
            equipment_requirement: None,
            quality_check: None,
            status: "inactive".to_string(),
        };
        let v = serde_json::to_value(&step).unwrap();
        assert!(v["description"].is_null());
        assert!(v["standard_time"].is_null());
        assert!(v["equipment_requirement"].is_null());
        assert!(v["quality_check"].is_null());
    }

    #[test]
    fn test_create_step_request_deserialize_full() {
        let pid = Uuid::new_v4();
        let j = json!({
            "process_id": pid.to_string(),
            "step_no": 3,
            "name": "Welding",
            "description": "Weld parts",
            "standard_time": "12.5",
            "equipment_requirement": "Welder",
            "quality_check": "NDT",
            "status": "active"
        });
        let req: CreateStepRequest = serde_json::from_value(j).unwrap();
        assert_eq!(req.process_id, pid);
        assert_eq!(req.step_no, 3);
        assert_eq!(req.name, "Welding");
        assert_eq!(req.description.as_deref(), Some("Weld parts"));
        assert!(req.standard_time.is_some());
        assert_eq!(req.equipment_requirement.as_deref(), Some("Welder"));
        assert_eq!(req.quality_check.as_deref(), Some("NDT"));
        assert_eq!(req.status.as_deref(), Some("active"));
    }

    #[test]
    fn test_create_step_request_deserialize_minimal() {
        let pid = Uuid::new_v4();
        let j = json!({
            "process_id": pid.to_string(),
            "step_no": 1,
            "name": "Step1"
        });
        let req: CreateStepRequest = serde_json::from_value(j).unwrap();
        assert_eq!(req.step_no, 1);
        assert_eq!(req.name, "Step1");
        assert!(req.description.is_none());
        assert!(req.standard_time.is_none());
        assert!(req.equipment_requirement.is_none());
        assert!(req.quality_check.is_none());
        assert!(req.status.is_none());
    }

    #[test]
    fn test_update_step_request_deserialize_empty() {
        let j = json!({});
        let req: UpdateStepRequest = serde_json::from_value(j).unwrap();
        assert!(req.process_id.is_none());
        assert!(req.step_no.is_none());
        assert!(req.name.is_none());
        assert!(req.description.is_none());
        assert!(req.standard_time.is_none());
        assert!(req.equipment_requirement.is_none());
        assert!(req.quality_check.is_none());
        assert!(req.status.is_none());
    }

    #[test]
    fn test_update_step_request_deserialize_partial() {
        let j = json!({
            "name": "Updated Step",
            "status": "inactive"
        });
        let req: UpdateStepRequest = serde_json::from_value(j).unwrap();
        assert_eq!(req.name.as_deref(), Some("Updated Step"));
        assert_eq!(req.status.as_deref(), Some("inactive"));
        assert!(req.step_no.is_none());
    }

    #[test]
    fn test_step_query_deserialize_empty() {
        let j = json!({});
        let q: StepQuery = serde_json::from_value(j).unwrap();
        assert!(q.page.is_none());
        assert!(q.page_size.is_none());
        assert!(q.process_id.is_none());
    }

    #[test]
    fn test_step_query_deserialize_filled() {
        let pid = Uuid::new_v4();
        let j = json!({
            "page": 1,
            "page_size": 25,
            "process_id": pid.to_string()
        });
        let q: StepQuery = serde_json::from_value(j).unwrap();
        assert_eq!(q.page, Some(1));
        assert_eq!(q.page_size, Some(25));
        assert_eq!(q.process_id, Some(pid));
    }

    #[test]
    fn test_step_query_invalid_uuid() {
        let j = json!({ "process_id": "not-a-uuid" });
        let res: Result<StepQuery, _> = serde_json::from_value(j);
        assert!(res.is_err());
    }
}
