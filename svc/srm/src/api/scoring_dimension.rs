use anyhow::Result;
use axum::{
    extract::{Extension, Path, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{
    CreateScoringDimensionRequest, ScoringDimension, UpdateScoringDimensionRequest,
};
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route(
            "/api/srm/scoring-dimensions",
            get(list_dimensions).post(create_dimension),
        )
        .route(
            "/api/srm/scoring-dimensions/{id}",
            get(get_dimension)
                .put(update_dimension)
                .delete(delete_dimension),
        )
        .route(
            "/api/srm/scoring-dimensions/active",
            get(list_active_dimensions),
        )
        .with_state(state);

    Ok(app)
}

async fn list_dimensions(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<ScoringDimension>>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, ScoringDimension>(
        r#"
        SELECT id, name, code, weight, min_score, max_score, description, is_active, sort_order, created_by, created_at, updated_at
        FROM plugin_srm.scoring_dimensions
        ORDER BY sort_order ASC, created_at DESC
        "#,
    )
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(dimensions) => Json(ApiResponse::success(dimensions, "获取评分维度列表成功")),
        Err(e) => {
            tracing::error!("获取评分维度列表失败: {}", e);
            Json(ApiResponse::<Vec<ScoringDimension>>::error(
                500,
                "获取评分维度列表失败",
            ))
        }
    }
}

async fn list_active_dimensions(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<ScoringDimension>>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, ScoringDimension>(
        r#"
        SELECT id, name, code, weight, min_score, max_score, description, is_active, sort_order, created_by, created_at, updated_at
        FROM plugin_srm.scoring_dimensions
        WHERE is_active = true
        ORDER BY sort_order ASC
        "#,
    )
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(dimensions) => Json(ApiResponse::success(dimensions, "获取活跃评分维度成功")),
        Err(e) => {
            tracing::error!("获取活跃评分维度失败: {}", e);
            Json(ApiResponse::<Vec<ScoringDimension>>::error(
                500,
                "获取活跃评分维度失败",
            ))
        }
    }
}

async fn get_dimension(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ScoringDimension>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, ScoringDimension>(
        r#"
        SELECT id, name, code, weight, min_score, max_score, description, is_active, sort_order, created_by, created_at, updated_at
        FROM plugin_srm.scoring_dimensions WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(dimension)) => Json(ApiResponse::success(dimension, "获取评分维度成功")),
        Ok(None) => Json(ApiResponse::<ScoringDimension>::error(
            404,
            "评分维度不存在",
        )),
        Err(e) => {
            tracing::error!("获取评分维度失败: {}", e);
            Json(ApiResponse::<ScoringDimension>::error(
                500,
                "获取评分维度失败",
            ))
        }
    }
}

async fn create_dimension(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateScoringDimensionRequest>,
) -> Json<ApiResponse<ScoringDimension>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.name.is_empty() {
        return Json(ApiResponse::<ScoringDimension>::error(
            400,
            "维度名称不能为空",
        ));
    }

    if req.code.is_empty() {
        return Json(ApiResponse::<ScoringDimension>::error(
            400,
            "维度代码不能为空",
        ));
    }

    if req.weight <= 0.0 || req.weight > 1.0 {
        return Json(ApiResponse::<ScoringDimension>::error(
            400,
            "权重必须在0-1之间",
        ));
    }

    if req.min_score >= req.max_score {
        return Json(ApiResponse::<ScoringDimension>::error(
            400,
            "最小分数必须小于最大分数",
        ));
    }

    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.scoring_dimensions WHERE code = $1",
    )
    .bind(&req.code)
    .fetch_one(&state.db)
    .await;

    if existing.unwrap_or(0) > 0 {
        return Json(ApiResponse::<ScoringDimension>::error(
            400,
            "维度代码已存在",
        ));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let user_id = Uuid::parse_str(&claims.sub).ok();

    let result = sqlx::query_as::<_, ScoringDimension>(
        r#"
        INSERT INTO plugin_srm.scoring_dimensions (id, name, code, weight, min_score, max_score, description, is_active, sort_order, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, name, code, weight, min_score, max_score, description, is_active, sort_order, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(req.weight)
    .bind(req.min_score)
    .bind(req.max_score)
    .bind(&req.description)
    .bind(req.is_active)
    .bind(req.sort_order)
    .bind(user_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(dimension) => Json(ApiResponse::success(dimension, "评分维度创建成功")),
        Err(e) => {
            tracing::error!("创建评分维度失败: {}", e);
            Json(ApiResponse::<ScoringDimension>::error(
                500,
                "评分维度创建失败",
            ))
        }
    }
}

async fn update_dimension(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateScoringDimensionRequest>,
) -> Json<ApiResponse<ScoringDimension>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let existing = sqlx::query_as::<_, ScoringDimension>(
        "SELECT id, name, code, weight, min_score, max_score, description, is_active, sort_order, created_by, created_at, updated_at FROM plugin_srm.scoring_dimensions WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(e)) => e,
        Ok(None) => {
            return Json(ApiResponse::<ScoringDimension>::error(
                404,
                "评分维度不存在",
            ))
        }
        Err(e) => {
            return Json(ApiResponse::<ScoringDimension>::error(
                500,
                &format!("查询评分维度失败: {}", e),
            ))
        }
    };

    if let Some(code) = &req.code {
        if code.is_empty() {
            return Json(ApiResponse::<ScoringDimension>::error(
                400,
                "维度代码不能为空",
            ));
        }

        if code != &existing.code {
            let exists = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM plugin_srm.scoring_dimensions WHERE code = $1 AND id != $2",
            )
            .bind(code)
            .bind(id)
            .fetch_one(&state.db)
            .await;

            if exists.unwrap_or(0) > 0 {
                return Json(ApiResponse::<ScoringDimension>::error(
                    400,
                    "维度代码已存在",
                ));
            }
        }
    }

    if let Some(weight) = req.weight {
        if weight <= 0.0 || weight > 1.0 {
            return Json(ApiResponse::<ScoringDimension>::error(
                400,
                "权重必须在0-1之间",
            ));
        }
    }

    if req.min_score.is_some() && req.max_score.is_some() {
        if req.min_score.unwrap() >= req.max_score.unwrap() {
            return Json(ApiResponse::<ScoringDimension>::error(
                400,
                "最小分数必须小于最大分数",
            ));
        }
    }

    let name = req.name.unwrap_or(existing.name);
    let code = req.code.unwrap_or(existing.code);
    let weight = req.weight.unwrap_or(existing.weight);
    let min_score = req.min_score.unwrap_or(existing.min_score);
    let max_score = req.max_score.unwrap_or(existing.max_score);
    let description = req.description.or(existing.description);
    let is_active = req.is_active.unwrap_or(existing.is_active);
    let sort_order = req.sort_order.unwrap_or(existing.sort_order);
    let now = Utc::now();

    let result = sqlx::query_as::<_, ScoringDimension>(
        r#"
        UPDATE plugin_srm.scoring_dimensions SET
            name = $2, code = $3, weight = $4, min_score = $5, max_score = $6, description = $7, is_active = $8, sort_order = $9, updated_at = $10
        WHERE id = $1
        RETURNING id, name, code, weight, min_score, max_score, description, is_active, sort_order, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(name)
    .bind(code)
    .bind(weight)
    .bind(min_score)
    .bind(max_score)
    .bind(description)
    .bind(is_active)
    .bind(sort_order)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(dimension) => Json(ApiResponse::success(dimension, "评分维度更新成功")),
        Err(e) => {
            tracing::error!("更新评分维度失败: {}", e);
            Json(ApiResponse::<ScoringDimension>::error(
                500,
                "评分维度更新失败",
            ))
        }
    }
}

async fn delete_dimension(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query("DELETE FROM plugin_srm.scoring_dimensions WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "评分维度删除成功"))
        }
        Ok(_) => Json(ApiResponse::<String>::error(404, "评分维度不存在")),
        Err(e) => {
            tracing::error!("删除评分维度失败: {}", e);
            Json(ApiResponse::<String>::error(500, "评分维度删除失败"))
        }
    }
}
