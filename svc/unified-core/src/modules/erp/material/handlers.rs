use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

use super::models::{
    CreateMaterialRequest, Material, MaterialListResponse, MaterialQuery, UpdateMaterialRequest,
};

fn default_tenant_id() -> Uuid {
    Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
}

pub async fn list_materials(
    State(state): State<AppState>,
    Query(query): Query<MaterialQuery>,
) -> Json<ApiResponse<MaterialListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let tenant_id = default_tenant_id();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_erp_materials
           WHERE tenant_id = $1
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR category = $3)
             AND ($4::text IS NULL OR code ILIKE '%' || $4 || '%' OR name ILIKE '%' || $4 || '%')"#,
    )
    .bind(tenant_id)
    .bind(query.status.clone())
    .bind(query.category.clone())
    .bind(query.search.clone())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询物料总数失败: {}", e);
            return Json(api_error(500, "查询物料总数失败"));
        }
    };

    let items: Vec<Material> = match sqlx::query_as(
        r#"SELECT id, tenant_id, code, name, specification, unit, category, price,
                  status, created_at, updated_at
           FROM core_erp_materials
           WHERE tenant_id = $1
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR category = $3)
             AND ($4::text IS NULL OR code ILIKE '%' || $4 || '%' OR name ILIKE '%' || $4 || '%')
           ORDER BY created_at DESC
           LIMIT $5 OFFSET $6"#,
    )
    .bind(tenant_id)
    .bind(query.status.clone())
    .bind(query.category.clone())
    .bind(query.search.clone())
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询物料列表失败: {}", e);
            return Json(api_error(500, "查询物料列表失败"));
        }
    };

    Json(api_success(MaterialListResponse {
        items,
        total,
        page,
        page_size,
    }))
}

pub async fn get_material(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Material>> {
    let tenant_id = default_tenant_id();

    let material: Option<Material> = match sqlx::query_as(
        r#"SELECT id, tenant_id, code, name, specification, unit, category, price,
                  status, created_at, updated_at
           FROM core_erp_materials WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询物料详情失败: {}", e);
            return Json(api_error(500, "查询物料详情失败"));
        }
    };

    match material {
        Some(material) => Json(api_success(material)),
        None => Json(api_error(404, "物料不存在")),
    }
}

pub async fn create_material(
    State(state): State<AppState>,
    Json(req): Json<CreateMaterialRequest>,
) -> Json<ApiResponse<Material>> {
    if req.code.trim().is_empty() {
        return Json(api_error(400, "物料编码不能为空"));
    }
    if req.name.trim().is_empty() {
        return Json(api_error(400, "物料名称不能为空"));
    }

    let tenant_id = default_tenant_id();

    let material: Material = match sqlx::query_as(
        r#"INSERT INTO core_erp_materials
               (tenant_id, code, name, specification, unit, category, price, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
           RETURNING id, tenant_id, code, name, specification, unit, category, price,
                     status, created_at, updated_at"#,
    )
    .bind(tenant_id)
    .bind(req.code)
    .bind(req.name)
    .bind(req.specification)
    .bind(req.unit)
    .bind(req.category)
    .bind(req.price.unwrap_or_default())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建物料失败: {}", e);
            return Json(api_error(500, "创建物料失败"));
        }
    };

    Json(api_success(material))
}

pub async fn update_material(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateMaterialRequest>,
) -> Json<ApiResponse<Material>> {
    let tenant_id = default_tenant_id();

    let material: Option<Material> = match sqlx::query_as(
        r#"UPDATE core_erp_materials
           SET code = COALESCE($1, code),
               name = COALESCE($2, name),
               specification = COALESCE($3, specification),
               unit = COALESCE($4, unit),
               category = COALESCE($5, category),
               price = COALESCE($6, price),
               status = COALESCE($7, status),
               updated_at = NOW()
           WHERE id = $8 AND tenant_id = $9
           RETURNING id, tenant_id, code, name, specification, unit, category, price,
                     status, created_at, updated_at"#,
    )
    .bind(req.code)
    .bind(req.name)
    .bind(req.specification)
    .bind(req.unit)
    .bind(req.category)
    .bind(req.price)
    .bind(req.status)
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新物料失败: {}", e);
            return Json(api_error(500, "更新物料失败"));
        }
    };

    match material {
        Some(material) => Json(api_success(material)),
        None => Json(api_error(404, "物料不存在")),
    }
}

pub async fn delete_material(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();

    let result = sqlx::query(r#"DELETE FROM core_erp_materials WHERE id = $1 AND tenant_id = $2"#)
        .bind(id)
        .bind(tenant_id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "物料不存在")),
        Err(e) => {
            tracing::error!("删除物料失败: {}", e);
            Json(api_error(500, "删除物料失败"))
        }
    }
}
