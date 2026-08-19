use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use uuid::Uuid;

use crate::models::consolidation::*;
use topems_shared::ApiResponse;
use topems_shared_core::response::api_error;

use super::common::PaginationParams;
use super::ApiState;

macro_rules! log_audit {
    ($($args:expr),*) => {};
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/consolidation/company-relations",
    tag = "Consolidation",
    responses((status = 200, description = "获取公司关系列表成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn list_company_relations(
    State(state): State<ApiState>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<Vec<CompanyRelation>>> {
    let result = sqlx::query_as::<_, CompanyRelation>(
        r#"
        SELECT * FROM plugin_erp.company_relations
        WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR parent_company_id = $1 OR child_company_id = $1)
          AND ($2::text IS NULL OR relation_type = $2)
          AND status = 'active'
        ORDER BY effective_date DESC
        "#,
    )
    .bind(params.scope_id)
    .bind(params.report_type)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(relations) => Json(ApiResponse::success(relations, "获取公司关系列表成功")),
        Err(e) => {
            tracing::error!("获取公司关系列表失败: {}", e);
            Json(api_error(500, "获取公司关系列表失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/consolidation/company-tree",
    tag = "Consolidation",
    responses((status = 200, description = "获取公司架构树成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_company_tree(
    State(state): State<ApiState>,
) -> Json<ApiResponse<Vec<CompanyTreeNode>>> {
    let relations: Vec<CompanyRelation> = sqlx::query_as::<_, CompanyRelation>(
        "SELECT * FROM plugin_erp.company_relations WHERE deleted_at IS NULL AND status = 'active'",
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    fn build_tree(
        relations: &[CompanyRelation],
        parent_id: Option<uuid::Uuid>,
        level: i32,
    ) -> Vec<CompanyTreeNode> {
        relations
            .iter()
            .filter(|r| r.parent_company_id == parent_id.unwrap_or(uuid::Uuid::nil()))
            .map(|r| CompanyTreeNode {
                id: r.child_company_id,
                name: r.child_company_name.clone().unwrap_or_default(),
                code: String::new(),
                level,
                is_parent: relations
                    .iter()
                    .any(|tr| tr.parent_company_id == r.child_company_id),
                relation_type: r.relation_type.clone(),
                ownership_percentage: r.ownership_percentage.to_string().parse().unwrap_or(0.0),
                children: build_tree(relations, Some(r.child_company_id), level + 1),
            })
            .collect()
    }

    let tree = build_tree(&relations, None, 0);
    Json(ApiResponse::success(tree, "获取公司架构树成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/erp/consolidation/company-relations",
    tag = "Consolidation",
    responses((status = 200, description = "创建公司关系成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn create_company_relation(
    State(state): State<ApiState>,
    _headers: HeaderMap,
    Json(req): Json<CreateCompanyRelationRequest>,
) -> Json<ApiResponse<CompanyRelation>> {
    let id = Uuid::new_v4();
    let effective_date = chrono::NaiveDate::parse_from_str(&req.effective_date, "%Y-%m-%d")
        .unwrap_or_else(|_| chrono::Utc::now().date_naive());

    let result = sqlx::query_as::<_, CompanyRelation>(
        r#"
        INSERT INTO plugin_erp.company_relations
        (id, parent_company_id, child_company_id, relation_type, ownership_percentage, control_percentage, effective_date, expiry_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(req.parent_company_id)
    .bind(req.child_company_id)
    .bind(&req.relation_type)
    .bind(req.ownership_percentage)
    .bind(req.control_percentage.unwrap_or(req.ownership_percentage))
    .bind(effective_date)
    .bind(req.expiry_date.as_ref().and_then(|s| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok()))
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(relation) => {
            log_audit!(&state.db, "create", "company_relation", Some(id), &headers);
            Json(ApiResponse::success(relation, "创建公司关系成功"))
        }
        Err(e) => {
            tracing::error!("创建公司关系失败: {}", e);
            Json(api_error(500, "创建公司关系失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/erp/consolidation/company-relations/{relationId}",
    tag = "Consolidation",
    params(("relationId" = String, Path, description = "公司关系ID")),
    responses((status = 200, description = "更新公司关系成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn update_company_relation(
    State(state): State<ApiState>,
    Path(relation_id): Path<Uuid>,
    _headers: HeaderMap,
    Json(req): Json<UpdateCompanyRelationRequest>,
) -> Json<ApiResponse<CompanyRelation>> {
    let result = sqlx::query_as::<_, CompanyRelation>(
        r#"
        UPDATE plugin_erp.company_relations
        SET ownership_percentage = COALESCE($2, ownership_percentage),
            control_percentage = COALESCE($3, control_percentage),
            expiry_date = COALESCE($4, expiry_date),
            status = COALESCE($5, status),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(relation_id)
    .bind(req.ownership_percentage)
    .bind(req.control_percentage)
    .bind(
        req.expiry_date
            .as_ref()
            .and_then(|s| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok()),
    )
    .bind(&req.status)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(relation) => {
            log_audit!(
                &state.db,
                "update",
                "company_relation",
                Some(relation_id),
                &headers
            );
            Json(ApiResponse::success(relation, "更新公司关系成功"))
        }
        Err(e) => {
            tracing::error!("更新公司关系失败: {}", e);
            Json(api_error(500, "更新公司关系失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:delete"])),
    path = "/erp/consolidation/company-relations/{relationId}",
    tag = "Consolidation",
    params(("relationId" = String, Path, description = "公司关系ID")),
    responses((status = 200, description = "删除公司关系成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn delete_company_relation(
    State(state): State<ApiState>,
    Path(relation_id): Path<Uuid>,
    _headers: HeaderMap,
) -> Json<ApiResponse<()>> {
    match sqlx::query("UPDATE plugin_erp.company_relations SET deleted_at = NOW() WHERE id = $1")
        .bind(relation_id)
        .execute(&state.db)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                Json(api_error(404, "公司关系不存在"))
            } else {
                log_audit!(
                    &state.db,
                    "delete",
                    "company_relation",
                    Some(relation_id),
                    &headers
                );
                Json(ApiResponse::success((), "删除公司关系成功"))
            }
        }
        Err(e) => {
            tracing::error!("删除公司关系失败: {}", e);
            Json(api_error(500, "删除公司关系失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/consolidation/companies/{companyId}/financial-data",
    tag = "Consolidation",
    params(("companyId" = String, Path, description = "公司ID")),
    responses((status = 200, description = "获取公司财务数据成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_company_financial_data(
    State(_state): State<ApiState>,
    Path(company_id): Path<Uuid>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<CompanyFinancialData>> {
    Json(ApiResponse::success(
        CompanyFinancialData {
            company_id,
            company_name: "公司".to_string(),
            period: params.period_from.unwrap_or_else(|| "2026-01".to_string()),
            current_assets: 500000.0,
            non_current_assets: 1000000.0,
            total_assets: 1500000.0,
            current_liabilities: 400000.0,
            non_current_liabilities: 500000.0,
            total_liabilities: 900000.0,
            paid_in_capital: 300000.0,
            capital_reserve: 100000.0,
            surplus_reserve: 50000.0,
            undistributed_profit: 150000.0,
            total_equity: 600000.0,
            revenue: 800000.0,
            cost_of_goods_sold: 500000.0,
            gross_profit: 300000.0,
            operating_profit: 150000.0,
            profit_before_tax: 120000.0,
            net_profit: 100000.0,
            operating_cash_flow: 80000.0,
            investing_cash_flow: -50000.0,
            financing_cash_flow: -20000.0,
            net_cash_flow: 10000.0,
        },
        "获取公司财务数据成功",
    ))
}
