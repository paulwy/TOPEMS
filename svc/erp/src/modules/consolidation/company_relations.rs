use topems_shared_auth::middleware::tenant::RlsTxnCell;
use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    Json,
};
use uuid::Uuid;

use crate::models::consolidation::*;
use topems_shared_auth::auth::Claims;
use topems_shared_core::{response::ApiResponse, TopemsError};

use super::common::{
    company_scope_error, ensure_company_scope, log_audit, CompanyAccess, ConsolidationListParams,
};
use super::ApiState;

fn viewer_id(claims: &Claims) -> Result<Option<Uuid>, ()> {
    if claims.is_superuser {
        Ok(None)
    } else {
        Uuid::parse_str(&claims.sub).map(Some).map_err(|_| ())
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/consolidation/company-relations",
    tag = "Consolidation",
    responses((status = 200, description = "获取公司关系列表成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn list_company_relations(
    State(_state): State<ApiState>,
    Query(params): Query<ConsolidationListParams>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
) -> ApiResponse<Vec<CompanyRelation>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let viewer = match viewer_id(&claims) {
        Ok(v) => v,
        Err(_) => {
            return ApiResponse::from(TopemsError::PermissionDenied {
                required: "company-scope".to_string(),
            })
        }
    };
    let result = sqlx::query_as::<_, CompanyRelation>(
        r#"
        SELECT * FROM erp.company_relations r
        WHERE r.deleted_at IS NULL AND ($1::uuid IS NULL OR r.parent_company_id = $1 OR r.child_company_id = $1)
          AND ($2::text IS NULL OR r.relation_type = $2)
          AND r.status = 'active'
          AND (
              $3::uuid IS NULL
              OR EXISTS (
                  SELECT 1 FROM public.core_user_company_scopes s
                  WHERE s.tenant_id = r.tenant_id
                    AND s.user_id = $3
                    AND s.company_id = r.child_company_id
              )
          )
        ORDER BY r.effective_date DESC
        "#,
    )
    .bind(params.scope_id)
    .bind(params.report_type)
    .bind(viewer)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(relations) => ApiResponse::success(relations, "获取公司关系列表成功"),
        Err(e) => {
            tracing::error!("获取公司关系列表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取公司关系列表失败".to_string()))
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
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
) -> ApiResponse<Vec<CompanyTreeNode>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let viewer = match viewer_id(&claims) {
        Ok(v) => v,
        Err(_) => {
            return ApiResponse::from(TopemsError::PermissionDenied {
                required: "company-scope".to_string(),
            })
        }
    };
    let relations: Vec<CompanyRelation> = sqlx::query_as::<_, CompanyRelation>(
        r#"
        SELECT * FROM erp.company_relations r
        WHERE r.deleted_at IS NULL AND r.status = 'active'
          AND (
              $1::uuid IS NULL
              OR EXISTS (
                  SELECT 1 FROM public.core_user_company_scopes s
                  WHERE s.tenant_id = r.tenant_id
                    AND s.user_id = $1
                    AND s.company_id = r.child_company_id
              )
          )
        "#,
    )
    .bind(viewer)
    .fetch_all(&mut **txn)
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
    ApiResponse::success(tree, "获取公司架构树成功")
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
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
    Json(req): Json<CreateCompanyRelationRequest>,
) -> ApiResponse<CompanyRelation> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    // 父/子都必须指向本租户真实主体，且当前用户具备 write 主体范围。
    for company_id in [req.parent_company_id, req.child_company_id] {
        if let Err(e) =
            ensure_company_scope(&mut **txn, &claims, company_id, CompanyAccess::Write).await
        {
            return company_scope_error(e);
        }
    }
    let id = Uuid::new_v4();
    let effective_date = req
        .effective_date
        .parse::<chrono::NaiveDate>()
        .unwrap_or_else(|_| chrono::Utc::now().date_naive());

    let result = sqlx::query_as::<_, CompanyRelation>(
        r#"
        INSERT INTO erp.company_relations
        (id, parent_company_id, child_company_id, relation_type, ownership_percentage, control_percentage, effective_date, expiry_date, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::UUID))
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
    .bind(req.expiry_date.as_ref().and_then(|s| s.parse::<chrono::NaiveDate>().ok()))
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(relation) => {
            log_audit(&state.db, "create", "company_relation", Some(id), &headers).await;
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(relation, "创建公司关系成功")
        }
        Err(e) => {
            tracing::error!("创建公司关系失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建公司关系失败".to_string()))
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
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
    Json(req): Json<UpdateCompanyRelationRequest>,
) -> ApiResponse<CompanyRelation> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let target: Option<(Uuid, Uuid)> = match sqlx::query_as(
        r#"
        SELECT parent_company_id, child_company_id FROM erp.company_relations
        WHERE id = $1 AND deleted_at IS NULL
          AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))
        "#,
    )
    .bind(relation_id)
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询公司关系失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询公司关系失败".to_string()));
        }
    };
    let Some((parent_id, child_id)) = target else {
        return ApiResponse::from(TopemsError::ResourceNotFound("公司关系不存在".to_string()));
    };
    for company_id in [parent_id, child_id] {
        if let Err(e) =
            ensure_company_scope(&mut **txn, &claims, company_id, CompanyAccess::Write).await
        {
            return company_scope_error(e);
        }
    }
    let result = sqlx::query_as::<_, CompanyRelation>(
        r#"
        UPDATE erp.company_relations
        SET ownership_percentage = COALESCE($2, ownership_percentage),
            control_percentage = COALESCE($3, control_percentage),
            expiry_date = COALESCE($4, expiry_date),
            status = COALESCE($5, status),
            updated_at = NOW()
        WHERE id = $1 AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))
        RETURNING *
        "#,
    )
    .bind(relation_id)
    .bind(req.ownership_percentage)
    .bind(req.control_percentage)
    .bind(
        req.expiry_date
            .as_ref()
            .and_then(|s| s.parse::<chrono::NaiveDate>().ok()),
    )
    .bind(&req.status)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(relation)) => {
            log_audit(
                &state.db,
                "update",
                "company_relation",
                Some(relation_id),
                &headers,
            )
            .await;
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(relation, "更新公司关系成功")
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("公司关系不存在".to_string())),
        Err(e) => {
            tracing::error!("更新公司关系失败: {}", e);
            ApiResponse::from(TopemsError::Internal("更新公司关系失败".to_string()))
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
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let target: Option<(Uuid, Uuid)> = match sqlx::query_as(
        r#"
        SELECT parent_company_id, child_company_id FROM erp.company_relations
        WHERE id = $1 AND deleted_at IS NULL
          AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))
        "#,
    )
    .bind(relation_id)
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询公司关系失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询公司关系失败".to_string()));
        }
    };
    let Some((parent_id, child_id)) = target else {
        return ApiResponse::from(TopemsError::ResourceNotFound("公司关系不存在".to_string()));
    };
    for company_id in [parent_id, child_id] {
        if let Err(e) =
            ensure_company_scope(&mut **txn, &claims, company_id, CompanyAccess::Write).await
        {
            return company_scope_error(e);
        }
    }
    match sqlx::query("UPDATE erp.company_relations SET deleted_at = NOW() WHERE id = $1 AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))")
        .bind(relation_id)
        .execute(&mut **txn)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                ApiResponse::from(TopemsError::ResourceNotFound(
                    "公司关系不存在".to_string(),
                ))
            } else {
                log_audit(
                    &state.db,
                    "delete",
                    "company_relation",
                    Some(relation_id),
                    &headers,
                )
                .await;
                if let Some(t) = guard.take() {
                    if let Err(e) = t.commit().await {
                        tracing::error!("事务提交失败: {}", e);
                        return ApiResponse::server_error("事务提交失败");
                    }
                }
                ApiResponse::success((), "删除公司关系成功")
            }
        }
        Err(e) => {
            tracing::error!("删除公司关系失败: {}", e);
            ApiResponse::from(TopemsError::Internal(
                "删除公司关系失败".to_string(),
            ))
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
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
    Query(_params): Query<ConsolidationListParams>,
) -> ApiResponse<CompanyFinancialData> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    // P1：先做主体范围校验（区分「主体不存在」与「无权限」），再返回未接入。
    if let Err(e) = ensure_company_scope(&mut **txn, &claims, company_id, CompanyAccess::Read).await
    {
        return company_scope_error(e);
    }
    // P0 止血：此前返回整组硬编码金额（current_assets=500000 等），会被前端当成
    // 真实子公司财务数据展示。财务总账尚无 company_id 维度，无法按主体归集。
    ApiResponse::not_implemented(
        "公司财务数据未接入：财务账簿尚无法人主体维度，无法按公司归集报表数据",
    )
}
