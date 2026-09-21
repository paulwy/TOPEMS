use anyhow::Result;
use axum::{
    extract::{Extension, Path, State},
    routing::get,
    Json, Router,
};
use chrono::Utc;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use crate::models::{
    CreateScoringDimensionRequest, ScoringDimension, UpdateScoringDimensionRequest,
};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route(
            "/scoring-dimensions",
            get(list_dimensions).post(create_dimension),
        )
        .route(
            "/scoring-dimensions/{id}",
            get(get_dimension)
                .put(update_dimension)
                .delete(delete_dimension),
        )
        .route("/scoring-dimensions/active", get(list_active_dimensions))
        .with_state(state);

    Ok(app)
}

pub async fn list_dimensions(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vec<ScoringDimension>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    let result = sqlx::query_as::<_, ScoringDimension>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, name, code, weight, min_score, max_score, description, is_active, sort_order, created_by, created_at, updated_at
        FROM srm.scoring_dimensions
        WHERE ($1::uuid IS NULL OR tenant_id = $1)
        ORDER BY sort_order ASC, created_at DESC
        "#, "srm"),
    )
    .bind(tenant_opt)
    .fetch_all(&mut **txn)
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

pub async fn list_active_dimensions(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vec<ScoringDimension>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    let result = sqlx::query_as::<_, ScoringDimension>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, name, code, weight, min_score, max_score, description, is_active, sort_order, created_by, created_at, updated_at
        FROM srm.scoring_dimensions
        WHERE ($1::uuid IS NULL OR tenant_id = $1) AND is_active = true
        ORDER BY sort_order ASC
        "#, "srm"),
    )
    .bind(tenant_opt)
    .fetch_all(&mut **txn)
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

pub async fn get_dimension(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<ScoringDimension>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    let result = sqlx::query_as::<_, ScoringDimension>(
        only_own_schema_query!("srm", r#"
        SELECT id, tenant_id, name, code, weight, min_score, max_score, description, is_active, sort_order, created_by, created_at, updated_at
        FROM srm.scoring_dimensions WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)
        "#, "srm"),
    )
    .bind(id)
    .bind(tenant_opt)
    .fetch_optional(&mut **txn)
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

pub async fn create_dimension(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateScoringDimensionRequest>,
) -> Json<ApiResponse<ScoringDimension>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
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

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    let existing = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.scoring_dimensions WHERE deleted_at IS NULL AND code = $1 AND ($2::uuid IS NULL OR tenant_id = $2)", "srm"),
    )
    .bind(&req.code)
    .bind(tenant_opt)
    .fetch_one(&mut **txn)
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
        only_own_schema_query!("srm", r#"
        INSERT INTO srm.scoring_dimensions (id, tenant_id, name, code, weight, min_score, max_score, description, is_active, sort_order, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, tenant_id, name, code, weight, min_score, max_score, description, is_active, sort_order, created_by, created_at, updated_at
        "#, "srm"),
    )
    .bind(id)
    .bind(tenant_id)
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
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(dimension) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(dimension, "评分维度创建成功"))
        }
        Err(e) => {
            tracing::error!("创建评分维度失败: {}", e);
            Json(ApiResponse::<ScoringDimension>::error(
                500,
                "评分维度创建失败",
            ))
        }
    }
}

pub async fn update_dimension(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateScoringDimensionRequest>,
) -> Json<ApiResponse<ScoringDimension>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    let existing = sqlx::query_as::<_, ScoringDimension>(
        only_own_schema_query!("srm", "SELECT id, tenant_id, name, code, weight, min_score, max_score, description, is_active, sort_order, created_by, created_at, updated_at FROM srm.scoring_dimensions WHERE deleted_at IS NULL AND id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)", "srm"),
    )
    .bind(id)
    .bind(tenant_opt)
    .fetch_optional(&mut **txn)
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
                only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.scoring_dimensions WHERE deleted_at IS NULL AND code = $1 AND id != $2 AND ($3::uuid IS NULL OR tenant_id = $3)", "srm"),
            )
            .bind(code)
            .bind(id)
            .bind(tenant_opt)
            .fetch_one(&mut **txn)
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

    if let (Some(min_score), Some(max_score)) = (req.min_score, req.max_score) {
        if min_score >= max_score {
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
        only_own_schema_query!("srm", r#"
        UPDATE srm.scoring_dimensions SET
            name = $2, code = $3, weight = $4, min_score = $5, max_score = $6, description = $7, is_active = $8, sort_order = $9, updated_at = $10
        WHERE id = $1 AND tenant_id = $11
        RETURNING id, tenant_id, name, code, weight, min_score, max_score, description, is_active, sort_order, created_by, created_at, updated_at
        "#, "srm"),
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
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(dimension) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(dimension, "评分维度更新成功"))
        }
        Err(e) => {
            tracing::error!("更新评分维度失败: {}", e);
            Json(ApiResponse::<ScoringDimension>::error(
                500,
                "评分维度更新失败",
            ))
        }
    }
}

pub async fn delete_dimension(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::VendorAssessmentWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    let result = sqlx::query(only_own_schema_query!(
        "srm",
        "UPDATE srm.scoring_dimensions SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
        "srm"
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&mut **txn)
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

pub fn normalize_dimension_score(raw: f64, floor: f64, ceil: f64) -> f64 {
    if ceil <= floor {
        return 0.0_f64;
    }
    let clamped = raw.clamp(floor, ceil);
    (clamped - floor) / (ceil - floor) * 100.0_f64
}

pub fn weighted_score(dims: &[(f64, f64)]) -> Result<f64, String> {
    if dims.is_empty() {
        return Err("维度列表不能为空".to_string());
    }

    let mut total_weight = 0.0_f64;
    for (score, weight) in dims.iter() {
        if *score < 0.0_f64 {
            return Err("存在负的维度分数".to_string());
        }
        if *weight <= 0.0_f64 {
            return Err("所有权重必须大于0".to_string());
        }
        total_weight += *weight;
    }

    if total_weight <= 0.0_f64 {
        return Err("权重总和必须大于0".to_string());
    }

    let mut weighted_sum = 0.0_f64;
    for (score, weight) in dims.iter() {
        weighted_sum += *score * (*weight / total_weight);
    }

    Ok(weighted_sum.clamp(0.0_f64, 100.0_f64))
}

pub fn score_consistency(dims: &[f64]) -> f64 {
    if dims.is_empty() {
        return 0.0_f64;
    }

    let n = dims.len() as f64;
    let mean = dims.iter().sum::<f64>() / n;

    if mean.abs() < 0.0001_f64 {
        return 0.0_f64;
    }

    let variance = dims.iter().map(|x| (*x - mean).powi(2)).sum::<f64>() / n;
    let std_dev = variance.sqrt();

    std_dev / mean
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_dimension_score_normal() {
        let result = normalize_dimension_score(60.0_f64, 0.0_f64, 100.0_f64);
        assert!((result - 60.0_f64).abs() < 0.01_f64, "标准归一化计算错误");
    }

    #[test]
    fn test_normalize_dimension_score_clamp_below_floor() {
        let result = normalize_dimension_score(-10.0_f64, 0.0_f64, 100.0_f64);
        assert_eq!(result, 0.0_f64, "低于floor应clamp到floor");
    }

    #[test]
    fn test_normalize_dimension_score_clamp_above_ceil() {
        let result = normalize_dimension_score(150.0_f64, 0.0_f64, 100.0_f64);
        assert_eq!(result, 100.0_f64, "高于ceil应clamp到ceil");
    }

    #[test]
    fn test_normalize_dimension_score_invalid_range() {
        let result = normalize_dimension_score(50.0_f64, 100.0_f64, 50.0_f64);
        assert_eq!(result, 0.0_f64, "floor>=ceil时返回0");
    }

    #[test]
    fn test_weighted_score_basic() {
        let dims = vec![(80.0_f64, 40.0_f64), (90.0_f64, 60.0_f64)];
        let result = weighted_score(&dims).unwrap();
        assert!((result - 86.0_f64).abs() < 0.01_f64, "加权分计算错误");
    }

    #[test]
    fn test_weighted_score_empty_error() {
        let dims: Vec<(f64, f64)> = vec![];
        assert!(weighted_score(&dims).is_err(), "空列表应返回Err");
    }

    #[test]
    fn test_weighted_score_negative_score_error() {
        let dims = vec![(-5.0_f64, 50.0_f64), (90.0_f64, 50.0_f64)];
        assert!(weighted_score(&dims).is_err(), "负分数应返回Err");
    }

    #[test]
    fn test_weighted_score_zero_weight_error() {
        let dims = vec![(80.0_f64, 0.0_f64), (90.0_f64, 50.0_f64)];
        assert!(weighted_score(&dims).is_err(), "零权重应返回Err");
    }

    #[test]
    fn test_score_consistency_high_consistency() {
        let dims = vec![80.0_f64, 81.0_f64, 79.0_f64, 80.0_f64];
        let cv = score_consistency(&dims);
        assert!(cv < 0.1_f64, "高度一致的数据变异系数应很小");
    }

    #[test]
    fn test_score_consistency_low_consistency() {
        let dims = vec![10.0_f64, 90.0_f64, 50.0_f64, 20.0_f64];
        let cv = score_consistency(&dims);
        assert!(cv > 0.5_f64, "差异大的数据变异系数应较大");
    }

    #[test]
    fn test_score_consistency_zero_mean() {
        let dims = vec![0.0_f64, 0.0_f64, 0.0_f64];
        assert_eq!(score_consistency(&dims), 0.0_f64, "均值为0时返回0");
    }

    #[test]
    fn test_score_consistency_empty() {
        let dims: Vec<f64> = vec![];
        assert_eq!(score_consistency(&dims), 0.0_f64, "空列表返回0");
    }

    #[test]
    fn test_normalize_dimension_score_arbitrary_range() {
        let result = normalize_dimension_score(60.0_f64, 20.0_f64, 80.0_f64);
        assert!(
            (result - 66.666_f64).abs() < 0.1_f64,
            "任意区间归一化计算错误"
        );
    }

    #[test]
    fn test_weighted_score_non_100_total_weight() {
        let dims = vec![(80.0_f64, 3.0_f64), (90.0_f64, 1.0_f64)];
        let result = weighted_score(&dims).unwrap();
        assert!(
            (result - 82.5_f64).abs() < 0.01_f64,
            "权重非100总和应按比例归一化"
        );
    }

    #[test]
    fn test_weighted_score_single_dim() {
        let dims = vec![(88.0_f64, 50.0_f64)];
        let result = weighted_score(&dims).unwrap();
        assert!((result - 88.0_f64).abs() < 0.01_f64, "单维度应返回原分数");
    }
}
