use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

use super::models::{
    CreateOpportunityRequest, Opportunity, OpportunityListResponse, OpportunityQuery,
    UpdateOpportunityRequest, UpdateStageRequest,
};

fn default_tenant_id() -> Uuid {
    Uuid::parse_str("00000000-0000-0000-0000-000000000001").expect("hardcoded default UUID should always be valid")
}

pub async fn list_opportunities(
    State(state): State<AppState>,
    Query(query): Query<OpportunityQuery>,
) -> Json<ApiResponse<OpportunityListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let tenant_id = default_tenant_id();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_crm_opportunities
           WHERE tenant_id = $1
             AND ($2::uuid IS NULL OR customer_id = $2)
             AND ($3::text IS NULL OR stage = $3)
             AND ($4::text IS NULL OR title ILIKE '%' || $4 || '%')"#,
    )
    .bind(tenant_id)
    .bind(query.customer_id)
    .bind(query.stage.clone())
    .bind(query.search.clone())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询商机总数失败: {}", e);
            return Json(api_error(500, "查询商机总数失败"));
        }
    };

    let items: Vec<Opportunity> = match sqlx::query_as(
        r#"SELECT id, tenant_id, customer_id, title, amount, stage, expected_close_date,
                  probability, owner_id, description, created_at, updated_at
           FROM core_crm_opportunities
           WHERE tenant_id = $1
             AND ($2::uuid IS NULL OR customer_id = $2)
             AND ($3::text IS NULL OR stage = $3)
             AND ($4::text IS NULL OR title ILIKE '%' || $4 || '%')
           ORDER BY created_at DESC
           LIMIT $5 OFFSET $6"#,
    )
    .bind(tenant_id)
    .bind(query.customer_id)
    .bind(query.stage.clone())
    .bind(query.search.clone())
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询商机列表失败: {}", e);
            return Json(api_error(500, "查询商机列表失败"));
        }
    };

    Json(api_success(OpportunityListResponse {
        items,
        total,
        page,
        page_size,
    }))
}

pub async fn get_opportunity(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Opportunity>> {
    let tenant_id = default_tenant_id();

    let opp: Option<Opportunity> = match sqlx::query_as(
        r#"SELECT id, tenant_id, customer_id, title, amount, stage, expected_close_date,
                  probability, owner_id, description, created_at, updated_at
           FROM core_crm_opportunities WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询商机详情失败: {}", e);
            return Json(api_error(500, "查询商机详情失败"));
        }
    };

    match opp {
        Some(opp) => Json(api_success(opp)),
        None => Json(api_error(404, "商机不存在")),
    }
}

pub async fn create_opportunity(
    State(state): State<AppState>,
    Json(req): Json<CreateOpportunityRequest>,
) -> Json<ApiResponse<Opportunity>> {
    if req.title.trim().is_empty() {
        return Json(api_error(400, "商机标题不能为空"));
    }

    let tenant_id = default_tenant_id();

    let opp: Opportunity = match sqlx::query_as(
        r#"INSERT INTO core_crm_opportunities
               (tenant_id, customer_id, title, amount, stage, expected_close_date,
                probability, owner_id, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, tenant_id, customer_id, title, amount, stage, expected_close_date,
                     probability, owner_id, description, created_at, updated_at"#,
    )
    .bind(tenant_id)
    .bind(req.customer_id)
    .bind(req.title)
    .bind(req.amount.unwrap_or_default())
    .bind(req.stage.clone().unwrap_or_else(|| "lead".to_string()))
    .bind(req.expected_close_date)
    .bind(req.probability.unwrap_or(0))
    .bind(req.owner_id)
    .bind(req.description)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建商机失败: {}", e);
            return Json(api_error(500, "创建商机失败"));
        }
    };

    Json(api_success(opp))
}

pub async fn update_opportunity(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateOpportunityRequest>,
) -> Json<ApiResponse<Opportunity>> {
    let tenant_id = default_tenant_id();

    let opp: Option<Opportunity> = match sqlx::query_as(
        r#"UPDATE core_crm_opportunities
           SET customer_id = COALESCE($1, customer_id),
               title = COALESCE($2, title),
               amount = COALESCE($3, amount),
               stage = COALESCE($4, stage),
               expected_close_date = COALESCE($5, expected_close_date),
               probability = COALESCE($6, probability),
               owner_id = COALESCE($7, owner_id),
               description = COALESCE($8, description),
               updated_at = NOW()
           WHERE id = $9 AND tenant_id = $10
           RETURNING id, tenant_id, customer_id, title, amount, stage, expected_close_date,
                     probability, owner_id, description, created_at, updated_at"#,
    )
    .bind(req.customer_id)
    .bind(req.title)
    .bind(req.amount)
    .bind(req.stage)
    .bind(req.expected_close_date)
    .bind(req.probability)
    .bind(req.owner_id)
    .bind(req.description)
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新商机失败: {}", e);
            return Json(api_error(500, "更新商机失败"));
        }
    };

    match opp {
        Some(opp) => Json(api_success(opp)),
        None => Json(api_error(404, "商机不存在")),
    }
}

pub async fn delete_opportunity(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();

    let result =
        sqlx::query(r#"DELETE FROM core_crm_opportunities WHERE id = $1 AND tenant_id = $2"#)
            .bind(id)
            .bind(tenant_id)
            .execute(&state.pool)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "商机不存在")),
        Err(e) => {
            tracing::error!("删除商机失败: {}", e);
            Json(api_error(500, "删除商机失败"))
        }
    }
}

pub async fn update_opportunity_stage(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateStageRequest>,
) -> Json<ApiResponse<Opportunity>> {
    let tenant_id = default_tenant_id();

    let opp: Option<Opportunity> = match sqlx::query_as(
        r#"UPDATE core_crm_opportunities
           SET stage = $1, probability = COALESCE($2, probability), updated_at = NOW()
           WHERE id = $3 AND tenant_id = $4
           RETURNING id, tenant_id, customer_id, title, amount, stage, expected_close_date,
                     probability, owner_id, description, created_at, updated_at"#,
    )
    .bind(req.stage)
    .bind(req.probability)
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新商机阶段失败: {}", e);
            return Json(api_error(500, "更新商机阶段失败"));
        }
    };

    match opp {
        Some(opp) => Json(api_success(opp)),
        None => Json(api_error(404, "商机不存在")),
    }
}
