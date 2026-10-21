//! 公共主数据域（P2-11）：物料目录 / UOM / 样品 —— master-data 承接
//! 租户模式与 dict 模块一致：写操作按 current_setting('app.tenant_id') 落库。

use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use serde::{Deserialize, Serialize};
use topems_shared_core::locale::Locale;
use topems_shared_core::response::{api_success, ApiResponse};
use topems_shared_core::TopemsError;
use uuid::Uuid;

use crate::shared::AppState;

fn material_columns(locale: &str) -> String {
    format!(
        "id::text, material_code, CASE WHEN '{}' = 'en' THEN COALESCE(name_en, material_name) ELSE material_name END AS material_name, material_type, specification, unit, uom_id::text, status, description, created_at::text, updated_at::text",
        locale
    )
}

fn uom_columns(locale: &str) -> String {
    format!(
        "id::text, uom_code, CASE WHEN '{}' = 'en' THEN COALESCE(name_en, uom_name) ELSE uom_name END AS uom_name, uom_type, category, status, description, created_at::text, updated_at::text",
        locale
    )
}

fn sample_columns(locale: &str) -> String {
    format!(
        "id::text, sample_code, CASE WHEN '{}' = 'en' THEN COALESCE(name_en, sample_name) ELSE sample_name END AS sample_name, sample_type, source, status, description, created_at::text, updated_at::text",
        locale
    )
}

// ==================== 物料目录 ====================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Material {
    pub id: String,
    pub material_code: String,
    pub material_name: String,
    pub material_type: Option<String>,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub uom_id: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MaterialQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub material_type: Option<String>,
    pub status: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMaterialRequest {
    pub material_code: String,
    pub material_name: String,
    pub name_en: Option<String>,
    pub material_type: Option<String>,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub uom_id: Option<Uuid>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMaterialRequest {
    pub material_name: Option<String>,
    pub name_en: Option<String>,
    pub material_type: Option<String>,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub uom_id: Option<Uuid>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct MaterialListResponse {
    pub items: Vec<Material>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

pub async fn list_materials(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<MaterialQuery>,
) -> Json<ApiResponse<MaterialListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let locale = Locale::from_headers(&headers).as_sql();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM master_data.materials
           WHERE deleted_at IS NULL
             AND ($1::text IS NULL OR material_type = $1)
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR material_code ILIKE '%' || $3 || '%' OR material_name ILIKE '%' || $3 || '%')"#,
    )
    .bind(query.material_type.clone())
    .bind(query.status.clone())
    .bind(query.search.clone())
    .fetch_one(&state.db)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询物料总数失败: {}", e);
            return Json(ApiResponse::from(TopemsError::Internal(
                "查询物料总数失败".to_string(),
            )));
        }
    };

    let sql = format!(
        r#"SELECT {} FROM master_data.materials
           WHERE deleted_at IS NULL
             AND ($1::text IS NULL OR material_type = $1)
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR material_code ILIKE '%' || $3 || '%' OR material_name ILIKE '%' || $3 || '%')
           ORDER BY created_at DESC
           LIMIT $4 OFFSET $5"#,
        material_columns(&locale)
    );

    let items: Vec<Material> = match sqlx::query_as(&sql)
        .bind(query.material_type)
        .bind(query.status)
        .bind(query.search)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询物料列表失败: {}", e);
            return Json(ApiResponse::from(TopemsError::Internal(
                "查询物料列表失败".to_string(),
            )));
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
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Material>> {
    let locale = Locale::from_headers(&headers).as_sql();
    let sql = format!(
        r#"SELECT {} FROM master_data.materials WHERE deleted_at IS NULL AND id = $1"#,
        material_columns(&locale)
    );
    let row: Option<Material> = match sqlx::query_as(&sql)
        .bind(id)
        .fetch_optional(&state.db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询物料详情失败: {}", e);
            return Json(ApiResponse::from(TopemsError::Internal(
                "查询物料详情失败".to_string(),
            )));
        }
    };
    match row {
        Some(m) => Json(api_success(m)),
        None => Json(ApiResponse::from(TopemsError::NotFound(
            "物料不存在".to_string(),
        ))),
    }
}

pub async fn create_material(
    State(state): State<AppState>,
    Json(req): Json<CreateMaterialRequest>,
) -> Json<ApiResponse<Material>> {
    let status = req.status.unwrap_or_else(|| "active".to_string());
    let row: Option<Material> = match sqlx::query_as(
        r#"INSERT INTO master_data.materials
            (material_code, material_name, name_en, material_type, specification, unit, uom_id, status, description, tenant_id, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'), '00000000-0000-0000-0000-000000000000')
           RETURNING id::text, material_code, material_name, material_type, specification, unit, uom_id::text, status, description, created_at::text, updated_at::text"#,
    )
    .bind(&req.material_code)
    .bind(&req.material_name)
    .bind(&req.name_en)
    .bind(&req.material_type)
    .bind(&req.specification)
    .bind(&req.unit)
    .bind(req.uom_id)
    .bind(&status)
    .bind(&req.description)
    .fetch_optional(&state.db)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建物料失败: {}", e);
            return Json(ApiResponse::from(TopemsError::Internal(
                "创建物料失败".to_string(),
            )));
        }
    };

    match row {
        Some(m) => Json(api_success(m)),
        None => Json(ApiResponse::from(TopemsError::Internal(
            "创建物料失败".to_string(),
        ))),
    }
}

pub async fn update_material(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateMaterialRequest>,
) -> Json<ApiResponse<Material>> {
    let row: Option<Material> = match sqlx::query_as(
        r#"UPDATE master_data.materials SET
             material_name = COALESCE($2, material_name),
             name_en = COALESCE($3, name_en),
             material_type = COALESCE($4, material_type),
             specification = COALESCE($5, specification),
             unit = COALESCE($6, unit),
             uom_id = COALESCE($7, uom_id),
             status = COALESCE($8, status),
             description = COALESCE($9, description),
             updated_at = NOW()
           WHERE id = $1 AND deleted_at IS NULL
           RETURNING id::text, material_code, material_name, material_type, specification, unit, uom_id::text, status, description, created_at::text, updated_at::text"#,
    )
    .bind(id)
    .bind(&req.material_name)
    .bind(&req.name_en)
    .bind(&req.material_type)
    .bind(&req.specification)
    .bind(&req.unit)
    .bind(req.uom_id)
    .bind(&req.status)
    .bind(&req.description)
    .fetch_optional(&state.db)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新物料失败: {}", e);
            return Json(ApiResponse::from(TopemsError::Internal(
                "更新物料失败".to_string(),
            )));
        }
    };

    match row {
        Some(m) => Json(api_success(m)),
        None => Json(ApiResponse::from(TopemsError::NotFound(
            "物料不存在".to_string(),
        ))),
    }
}

pub async fn delete_material(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    match sqlx::query(
        "UPDATE master_data.materials SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(id)
    .execute(&state.db)
    .await
    {
        Ok(r) => {
            if r.rows_affected() == 0 {
                Json(ApiResponse::from(TopemsError::NotFound(
                    "物料不存在".to_string(),
                )))
            } else {
                Json(api_success("删除成功".to_string()))
            }
        }
        Err(e) => {
            tracing::error!("删除物料失败: {}", e);
            Json(ApiResponse::from(TopemsError::Internal(
                "删除物料失败".to_string(),
            )))
        }
    }
}

// ==================== 计量单位（UOM） ====================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Uom {
    pub id: String,
    pub uom_code: String,
    pub uom_name: String,
    pub uom_type: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UomQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub uom_type: Option<String>,
    pub status: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateUomRequest {
    pub uom_code: String,
    pub uom_name: String,
    pub name_en: Option<String>,
    pub uom_type: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUomRequest {
    pub uom_name: Option<String>,
    pub name_en: Option<String>,
    pub uom_type: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct UomListResponse {
    pub items: Vec<Uom>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

pub async fn list_uoms(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<UomQuery>,
) -> Json<ApiResponse<UomListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let locale = Locale::from_headers(&headers).as_sql();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM master_data.uoms
           WHERE deleted_at IS NULL
             AND ($1::text IS NULL OR uom_type = $1)
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR uom_code ILIKE '%' || $3 || '%' OR uom_name ILIKE '%' || $3 || '%')"#,
    )
    .bind(query.uom_type.clone())
    .bind(query.status.clone())
    .bind(query.search.clone())
    .fetch_one(&state.db)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询计量单位总数失败: {}", e);
            return Json(ApiResponse::from(TopemsError::Internal(
                "查询计量单位总数失败".to_string(),
            )));
        }
    };

    let sql = format!(
        r#"SELECT {} FROM master_data.uoms
           WHERE deleted_at IS NULL
             AND ($1::text IS NULL OR uom_type = $1)
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR uom_code ILIKE '%' || $3 || '%' OR uom_name ILIKE '%' || $3 || '%')
           ORDER BY created_at DESC
           LIMIT $4 OFFSET $5"#,
        uom_columns(&locale)
    );

    let items: Vec<Uom> = match sqlx::query_as(&sql)
        .bind(query.uom_type)
        .bind(query.status)
        .bind(query.search)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询计量单位列表失败: {}", e);
            return Json(ApiResponse::from(TopemsError::Internal(
                "查询计量单位列表失败".to_string(),
            )));
        }
    };

    Json(api_success(UomListResponse {
        items,
        total,
        page,
        page_size,
    }))
}

pub async fn get_uom(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Uom>> {
    let locale = Locale::from_headers(&headers).as_sql();
    let sql = format!(
        r#"SELECT {} FROM master_data.uoms WHERE deleted_at IS NULL AND id = $1"#,
        uom_columns(&locale)
    );
    let row: Option<Uom> = match sqlx::query_as(&sql)
        .bind(id)
        .fetch_optional(&state.db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询计量单位详情失败: {}", e);
            return Json(ApiResponse::from(TopemsError::Internal(
                "查询计量单位详情失败".to_string(),
            )));
        }
    };
    match row {
        Some(m) => Json(api_success(m)),
        None => Json(ApiResponse::from(TopemsError::NotFound(
            "计量单位不存在".to_string(),
        ))),
    }
}

pub async fn create_uom(
    State(state): State<AppState>,
    Json(req): Json<CreateUomRequest>,
) -> Json<ApiResponse<Uom>> {
    let status = req.status.unwrap_or_else(|| "active".to_string());
    let row: Option<Uom> = match sqlx::query_as(
        r#"INSERT INTO master_data.uoms
            (uom_code, uom_name, name_en, uom_type, category, status, description, tenant_id, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'), '00000000-0000-0000-0000-000000000000')
           RETURNING id::text, uom_code, uom_name, uom_type, category, status, description, created_at::text, updated_at::text"#,
    )
    .bind(&req.uom_code)
    .bind(&req.uom_name)
    .bind(&req.name_en)
    .bind(&req.uom_type)
    .bind(&req.category)
    .bind(&status)
    .bind(&req.description)
    .fetch_optional(&state.db)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建计量单位失败: {}", e);
            return Json(ApiResponse::from(TopemsError::Internal(
                "创建计量单位失败".to_string(),
            )));
        }
    };

    match row {
        Some(m) => Json(api_success(m)),
        None => Json(ApiResponse::from(TopemsError::Internal(
            "创建计量单位失败".to_string(),
        ))),
    }
}

pub async fn update_uom(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateUomRequest>,
) -> Json<ApiResponse<Uom>> {
    let row: Option<Uom> = match sqlx::query_as(
        r#"UPDATE master_data.uoms SET
             uom_name = COALESCE($2, uom_name),
             name_en = COALESCE($3, name_en),
             uom_type = COALESCE($4, uom_type),
             category = COALESCE($5, category),
             status = COALESCE($6, status),
             description = COALESCE($7, description),
             updated_at = NOW()
           WHERE id = $1 AND deleted_at IS NULL
           RETURNING id::text, uom_code, uom_name, uom_type, category, status, description, created_at::text, updated_at::text"#,
    )
    .bind(id)
    .bind(&req.uom_name)
    .bind(&req.name_en)
    .bind(&req.uom_type)
    .bind(&req.category)
    .bind(&req.status)
    .bind(&req.description)
    .fetch_optional(&state.db)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新计量单位失败: {}", e);
            return Json(ApiResponse::from(TopemsError::Internal(
                "更新计量单位失败".to_string(),
            )));
        }
    };

    match row {
        Some(m) => Json(api_success(m)),
        None => Json(ApiResponse::from(TopemsError::NotFound(
            "计量单位不存在".to_string(),
        ))),
    }
}

pub async fn delete_uom(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    match sqlx::query(
        "UPDATE master_data.uoms SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(id)
    .execute(&state.db)
    .await
    {
        Ok(r) => {
            if r.rows_affected() == 0 {
                Json(ApiResponse::from(TopemsError::NotFound(
                    "计量单位不存在".to_string(),
                )))
            } else {
                Json(api_success("删除成功".to_string()))
            }
        }
        Err(e) => {
            tracing::error!("删除计量单位失败: {}", e);
            Json(ApiResponse::from(TopemsError::Internal(
                "删除计量单位失败".to_string(),
            )))
        }
    }
}

// ==================== 样品主数据 ====================

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Sample {
    pub id: String,
    pub sample_code: String,
    pub sample_name: String,
    pub sample_type: Option<String>,
    pub source: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SampleQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub sample_type: Option<String>,
    pub status: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSampleRequest {
    pub sample_code: String,
    pub sample_name: String,
    pub name_en: Option<String>,
    pub sample_type: Option<String>,
    pub source: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSampleRequest {
    pub sample_name: Option<String>,
    pub name_en: Option<String>,
    pub sample_type: Option<String>,
    pub source: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SampleListResponse {
    pub items: Vec<Sample>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

pub async fn list_samples(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<SampleQuery>,
) -> Json<ApiResponse<SampleListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let locale = Locale::from_headers(&headers).as_sql();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM master_data.samples
           WHERE deleted_at IS NULL
             AND ($1::text IS NULL OR sample_type = $1)
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR sample_code ILIKE '%' || $3 || '%' OR sample_name ILIKE '%' || $3 || '%')"#,
    )
    .bind(query.sample_type.clone())
    .bind(query.status.clone())
    .bind(query.search.clone())
    .fetch_one(&state.db)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询样品总数失败: {}", e);
            return Json(ApiResponse::from(TopemsError::Internal(
                "查询样品总数失败".to_string(),
            )));
        }
    };

    let sql = format!(
        r#"SELECT {} FROM master_data.samples
           WHERE deleted_at IS NULL
             AND ($1::text IS NULL OR sample_type = $1)
             AND ($2::text IS NULL OR status = $2)
             AND ($3::text IS NULL OR sample_code ILIKE '%' || $3 || '%' OR sample_name ILIKE '%' || $3 || '%')
           ORDER BY created_at DESC
           LIMIT $4 OFFSET $5"#,
        sample_columns(&locale)
    );

    let items: Vec<Sample> = match sqlx::query_as(&sql)
        .bind(query.sample_type)
        .bind(query.status)
        .bind(query.search)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询样品列表失败: {}", e);
            return Json(ApiResponse::from(TopemsError::Internal(
                "查询样品列表失败".to_string(),
            )));
        }
    };

    Json(api_success(SampleListResponse {
        items,
        total,
        page,
        page_size,
    }))
}

pub async fn get_sample(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Sample>> {
    let locale = Locale::from_headers(&headers).as_sql();
    let sql = format!(
        r#"SELECT {} FROM master_data.samples WHERE deleted_at IS NULL AND id = $1"#,
        sample_columns(&locale)
    );
    let row: Option<Sample> = match sqlx::query_as(&sql)
        .bind(id)
        .fetch_optional(&state.db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询样品详情失败: {}", e);
            return Json(ApiResponse::from(TopemsError::Internal(
                "查询样品详情失败".to_string(),
            )));
        }
    };
    match row {
        Some(m) => Json(api_success(m)),
        None => Json(ApiResponse::from(TopemsError::NotFound(
            "样品不存在".to_string(),
        ))),
    }
}

pub async fn create_sample(
    State(state): State<AppState>,
    Json(req): Json<CreateSampleRequest>,
) -> Json<ApiResponse<Sample>> {
    let status = req.status.unwrap_or_else(|| "active".to_string());
    let row: Option<Sample> = match sqlx::query_as(
        r#"INSERT INTO master_data.samples
            (sample_code, sample_name, name_en, sample_type, source, status, description, tenant_id, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'), '00000000-0000-0000-0000-000000000000')
           RETURNING id::text, sample_code, sample_name, sample_type, source, status, description, created_at::text, updated_at::text"#,
    )
    .bind(&req.sample_code)
    .bind(&req.sample_name)
    .bind(&req.name_en)
    .bind(&req.sample_type)
    .bind(&req.source)
    .bind(&status)
    .bind(&req.description)
    .fetch_optional(&state.db)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建样品失败: {}", e);
            return Json(ApiResponse::from(TopemsError::Internal(
                "创建样品失败".to_string(),
            )));
        }
    };

    match row {
        Some(m) => Json(api_success(m)),
        None => Json(ApiResponse::from(TopemsError::Internal(
            "创建样品失败".to_string(),
        ))),
    }
}

pub async fn update_sample(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSampleRequest>,
) -> Json<ApiResponse<Sample>> {
    let row: Option<Sample> = match sqlx::query_as(
        r#"UPDATE master_data.samples SET
             sample_name = COALESCE($2, sample_name),
             name_en = COALESCE($3, name_en),
             sample_type = COALESCE($4, sample_type),
             source = COALESCE($5, source),
             status = COALESCE($6, status),
             description = COALESCE($7, description),
             updated_at = NOW()
           WHERE id = $1 AND deleted_at IS NULL
           RETURNING id::text, sample_code, sample_name, sample_type, source, status, description, created_at::text, updated_at::text"#,
    )
    .bind(id)
    .bind(&req.sample_name)
    .bind(&req.name_en)
    .bind(&req.sample_type)
    .bind(&req.source)
    .bind(&req.status)
    .bind(&req.description)
    .fetch_optional(&state.db)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新样品失败: {}", e);
            return Json(ApiResponse::from(TopemsError::Internal(
                "更新样品失败".to_string(),
            )));
        }
    };

    match row {
        Some(m) => Json(api_success(m)),
        None => Json(ApiResponse::from(TopemsError::NotFound(
            "样品不存在".to_string(),
        ))),
    }
}

pub async fn delete_sample(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    match sqlx::query(
        "UPDATE master_data.samples SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(id)
    .execute(&state.db)
    .await
    {
        Ok(r) => {
            if r.rows_affected() == 0 {
                Json(ApiResponse::from(TopemsError::NotFound(
                    "样品不存在".to_string(),
                )))
            } else {
                Json(api_success("删除成功".to_string()))
            }
        }
        Err(e) => {
            tracing::error!("删除样品失败: {}", e);
            Json(ApiResponse::from(TopemsError::Internal(
                "删除样品失败".to_string(),
            )))
        }
    }
}
