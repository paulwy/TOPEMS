use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use uuid::Uuid;

use crate::models::consolidation::*;
use topems_shared::ApiResponse;
use topems_shared_core::response::api_error;

use super::ApiState;

macro_rules! log_audit {
    ($($args:expr),*) => {};
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/consolidation/scopes/{scopeId}/companies",
    tag = "Consolidation",
    params(("scopeId" = String, Path, description = "合并范围ID")),
    responses((status = 200, description = "获取合并范围公司成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn list_scope_companies(
    State(state): State<ApiState>,
    Path(scope_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ConsolidationScopeCompany>>> {
    match sqlx::query_as::<_, ConsolidationScopeCompany>(
        r#"
        SELECT * FROM plugin_erp.consolidation_scope_companies
        WHERE deleted_at IS NULL AND scope_id = $1
        ORDER BY is_parent DESC, company_name ASC
        "#,
    )
    .bind(scope_id)
    .fetch_all(&state.db)
    .await
    {
        Ok(companies) => Json(ApiResponse::success(companies, "获取合并范围公司列表成功")),
        Err(e) => {
            tracing::error!("获取合并范围公司列表失败: {}", e);
            Json(api_error(500, "获取合并范围公司列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/consolidation/scopes/companies",
    tag = "Consolidation",
    responses((status = 200, description = "添加合并范围公司成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn add_scope_company(
    State(state): State<ApiState>,
    _headers: HeaderMap,
    Json(req): Json<AddScopeCompanyRequest>,
) -> Json<ApiResponse<ConsolidationScopeCompany>> {
    let id = Uuid::new_v4();
    let result = sqlx::query_as::<_, ConsolidationScopeCompany>(
        r#"
        INSERT INTO plugin_erp.consolidation_scope_companies
        (id, scope_id, company_id, is_parent, control_type, ownership_percentage, consolidation_percentage, minority_interest, effective_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(req.scope_id)
    .bind(req.company_id)
    .bind(req.is_parent.unwrap_or(false))
    .bind(&req.control_type)
    .bind(req.ownership_percentage)
    .bind(req.consolidation_percentage.unwrap_or(100.0))
    .bind(req.minority_interest.unwrap_or(0.0))
    .bind(&req.effective_date)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(company) => {
            log_audit!(
                &state.db,
                "add_company",
                "consolidation_scope",
                Some(req.scope_id),
                &headers
            );
            Json(ApiResponse::success(company, "添加公司到合并范围成功"))
        }
        Err(e) => {
            tracing::error!("添加公司到合并范围失败: {}", e);
            Json(api_error(500, "添加公司到合并范围失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/erp/consolidation/scopes/companies/{companyId}",
    tag = "Consolidation",
    params(("companyId" = String, Path, description = "公司ID")),
    responses((status = 200, description = "更新合并范围公司成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn update_scope_company(
    State(state): State<ApiState>,
    Path(company_id): Path<Uuid>,
    _headers: HeaderMap,
    Json(req): Json<UpdateScopeCompanyRequest>,
) -> Json<ApiResponse<ConsolidationScopeCompany>> {
    let result = sqlx::query_as::<_, ConsolidationScopeCompany>(
        r#"
        UPDATE plugin_erp.consolidation_scope_companies
        SET control_type = COALESCE($2, control_type),
            ownership_percentage = COALESCE($3, ownership_percentage),
            consolidation_percentage = COALESCE($4, consolidation_percentage),
            minority_interest = COALESCE($5, minority_interest),
            expiry_date = COALESCE($6, expiry_date)
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(company_id)
    .bind(&req.control_type)
    .bind(req.ownership_percentage)
    .bind(req.consolidation_percentage)
    .bind(req.minority_interest)
    .bind(&req.expiry_date)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(company) => {
            log_audit!(
                &state.db,
                "update",
                "consolidation_scope_company",
                Some(company_id),
                &headers
            );
            Json(ApiResponse::success(company, "更新合并范围公司成功"))
        }
        Err(e) => {
            tracing::error!("更新合并范围公司失败: {}", e);
            Json(api_error(500, "更新合并范围公司失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:delete"])),
    path = "/erp/consolidation/scopes/companies/{companyId}",
    tag = "Consolidation",
    params(("companyId" = String, Path, description = "公司ID")),
    responses((status = 200, description = "移除合并范围公司成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn remove_scope_company(
    State(state): State<ApiState>,
    Path(company_id): Path<Uuid>,
    _headers: HeaderMap,
) -> Json<ApiResponse<()>> {
    match sqlx::query(
        "UPDATE plugin_erp.consolidation_scope_companies SET deleted_at = NOW() WHERE id = $1",
    )
    .bind(company_id)
    .execute(&state.db)
    .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                Json(api_error(404, "合并范围公司不存在"))
            } else {
                log_audit!(
                    &state.db,
                    "remove_company",
                    "consolidation_scope",
                    Some(company_id),
                    &headers
                );
                Json(ApiResponse::success((), "从合并范围移除公司成功"))
            }
        }
        Err(e) => {
            tracing::error!("从合并范围移除公司失败: {}", e);
            Json(api_error(500, "从合并范围移除公司失败"))
        }
    }
}
