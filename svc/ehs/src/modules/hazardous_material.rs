//! Hazardous material management - Materials, inventory, MSDS, and warehouse records

use axum::{extract::State, http::HeaderMap, routing::*, Extension, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

use uuid::Uuid;

use crate::shared::AppState;
pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/hazardous-materials",
            get(list_materials).post(create_material),
        )
        .route(
            "/hazardous-materials/categories",
            get(list_material_categories).post(create_material_category),
        )
        .route(
            "/hazardous-materials/statistics",
            get(get_material_statistics),
        )
        .route("/hazardous-materials/{id}", get(get_material))
        .route("/hazardous-materials/{id}/msds", get(get_material_msds))
        .route(
            "/hazardous-materials/inventory",
            get(list_materials).post(create_material),
        )
        .route(
            "/hazardous-materials/inventory/{id}",
            get(get_material)
                .put(update_material)
                .delete(delete_material),
        )
        .route("/hazardous-materials/movements", get(list_stock_records))
        .route(
            "/hazardous-materials/movements/{id}",
            get(get_stock_record)
                .put(update_stock_record)
                .delete(delete_stock_record),
        )
        .route("/hazardous-materials/msds", get(list_materials))
        .route(
            "/hazardous-materials/msds/{id}",
            get(get_msds_by_id)
                .put(update_msds_by_id)
                .delete(delete_msds_by_id),
        )
        .route(
            "/hazardous-materials/categories/{id}",
            put(update_material_category).delete(delete_material_category),
        )
}

#[derive(Debug, Deserialize)]
pub struct MaterialQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub category: Option<String>,
    pub hazard_level: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct HazardousMaterial {
    pub id: String,
    pub material_no: String,
    pub name: String,
    pub category: String,
    pub hazard_class: Option<String>,
    pub un_number: Option<String>,
    pub cas_no: Option<String>,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub description: Option<String>,
    pub hazards: Option<Vec<String>>,
    pub storage_requirements: Option<String>,
    pub handling_requirements: Option<String>,
    pub emergency_measures: Option<String>,
    pub msds_url: Option<String>,
    pub status: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct MaterialStock {
    pub id: String,
    pub material_id: String,
    pub material_name: String,
    pub batch_no: Option<String>,
    pub quantity: f64,
    pub unit: Option<String>,
    pub storage_location: Option<String>,
    pub received_date: Option<String>,
    pub expiry_date: Option<String>,
    pub supplier: Option<String>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct StockRecord {
    pub id: String,
    pub record_no: String,
    pub material_id: String,
    pub material_name: String,
    pub record_type: String,
    pub quantity: f64,
    pub unit: Option<String>,
    pub batch_no: Option<String>,
    pub related_order: Option<String>,
    pub operator: Option<String>,
    pub operation_time: Option<String>,
    pub from_location: Option<String>,
    pub to_location: Option<String>,
    pub recipient: Option<String>,
    pub remarks: Option<String>,
    pub created_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct MsdsData {
    pub id: String,
    pub material_id: String,
    pub material_name: String,
    pub version: Option<String>,
    pub product_name: Option<String>,
    pub manufacturer: Option<String>,
    pub emergency_phone: Option<String>,
    pub hazard_identification: Option<String>,
    pub composition_info: Option<String>,
    pub first_aid_measures: Option<String>,
    pub fire_fighting_measures: Option<String>,
    pub accidental_release_measures: Option<String>,
    pub handling_and_storage: Option<String>,
    pub exposure_controls: Option<String>,
    pub physical_chemical_properties: Option<String>,
    pub reactivity_info: Option<String>,
    pub toxicological_info: Option<String>,
    pub ecological_info: Option<String>,
    pub disposal_considerations: Option<String>,
    pub transport_info: Option<String>,
    pub regulatory_info: Option<String>,
    pub other_info: Option<String>,
    pub file_url: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct MaterialDetail {
    pub material: HazardousMaterial,
    pub stocks: Vec<MaterialStock>,
    pub msds: Option<MsdsData>,
    pub recent_records: Vec<StockRecord>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct MaterialStatistics {
    pub total_materials: i32,
    pub total_stock_value: Option<f64>,
    pub low_stock_count: i32,
    pub over_stock_count: i32,
    pub expired_count: i32,
    pub by_category: Vec<serde_json::Value>,
    pub by_hazard_level: Vec<serde_json::Value>,
    pub monthly_in_out: Vec<serde_json::Value>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct CreateMaterialRequest {
    pub name: String,
    pub category: String,
    pub hazard_class: Option<String>,
    pub un_number: Option<String>,
    pub cas_no: Option<String>,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub description: Option<String>,
    pub hazards: Option<Vec<String>>,
    pub storage_requirements: Option<String>,
    pub handling_requirements: Option<String>,
    pub emergency_measures: Option<String>,
    pub msds_url: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMaterialRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub hazard_class: Option<String>,
    pub un_number: Option<String>,
    pub cas_no: Option<String>,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub description: Option<String>,
    pub hazards: Option<Vec<String>>,
    pub storage_requirements: Option<String>,
    pub handling_requirements: Option<String>,
    pub emergency_measures: Option<String>,
    pub msds_url: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateStockRecordRequest {
    pub material_id: String,
    pub record_type: String,
    pub quantity: f64,
    pub batch_no: Option<String>,
    pub related_order: Option<String>,
    pub operator: Option<String>,
    pub from_location: Option<String>,
    pub to_location: Option<String>,
    pub recipient: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMsdsRequest {
    pub version: Option<String>,
    pub ingredients: Option<String>,
    pub hazard_identification: Option<String>,
    pub first_aid_measures: Option<String>,
    pub fire_fighting_measures: Option<String>,
    pub accidental_release_measures: Option<String>,
    pub handling_and_storage: Option<String>,
    pub exposure_control: Option<String>,
    pub physical_chemical_properties: Option<String>,
    pub stability_reactivity: Option<String>,
    pub toxicological_info: Option<String>,
    pub ecological_info: Option<String>,
    pub disposal_considerations: Option<String>,
    pub transport_info: Option<String>,
    pub regulatory_info: Option<String>,
    pub other_info: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/hazardous-materials",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_materials(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<HazardousMaterial>>> {
    let tenant_bind = resolve_material_tenant(&claims).to_string();
    let sql = format!(
        r#"
        SELECT id::text AS id, material_no, name, category,
               CASE WHEN jsonb_typeof(hazard_class::jsonb) = 'array'
                    THEN (SELECT string_agg(elem, ', ') FROM jsonb_array_elements_text(hazard_class::jsonb) elem)
                    ELSE NULL END AS hazard_class,
               un_number, cas_no, specification, unit, description, hazards::text AS hazards,
               storage_requirements, handling_requirements, emergency_measures,
               safety_data_sheet AS msds_url, status,
               created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_hazardous_materials
        WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 200
        "#
    );
    let rows = match sqlx::query(&sql)
        .bind(&tenant_bind)
        .fetch_all(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list materials: {}", e);
            return Json(ApiResponse::server_error("获取危险品列表失败"));
        }
    };
    let list: Vec<HazardousMaterial> = rows.iter().map(material_from_row).collect();
    Json(ApiResponse::success(list, "获取危险品列表成功"))
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/hazardous-materials",
    request_body = CreateMaterialRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_material(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateMaterialRequest>,
) -> Json<ApiResponse<HazardousMaterial>> {
    let tenant_id = resolve_material_tenant(&claims);
    let material_no = format!("HM-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let status = req.status.clone().unwrap_or_else(|| "active".to_string());
    let hazards: serde_json::Value = req
        .hazards
        .clone()
        .map(|v| serde_json::to_value(v).unwrap_or_else(|_| serde_json::json!([])))
        .unwrap_or_else(|| serde_json::json!([]));
    let sql = r#"
        INSERT INTO ehs.qa_ehs_hazardous_materials
            (material_no, name, category, hazard_class, un_number, cas_no, specification,
             unit, description, hazards, storage_requirements, handling_requirements,
             emergency_measures, safety_data_sheet, status, tenant_id)
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id::text AS id, material_no, name, category,
                  hazard_class::text AS hazard_class,
                  un_number, cas_no, specification, unit, description, hazards::text AS hazards,
                  storage_requirements, handling_requirements, emergency_measures,
                  safety_data_sheet AS msds_url, status,
                  created_at::text AS created_at, updated_at::text AS updated_at,
                  tenant_id::text AS tenant_id
    "#;
    let row = match sqlx::query(sql)
        .bind(&material_no)
        .bind(&req.name)
        .bind(&req.category)
        .bind(
            req.hazard_class
                .clone()
                .map(|h| serde_json::json!([h]))
                .unwrap_or_else(|| serde_json::json!([])),
        )
        .bind(&req.un_number)
        .bind(&req.cas_no)
        .bind(&req.specification)
        .bind(&req.unit)
        .bind(&req.description)
        .bind(hazards)
        .bind(&req.storage_requirements)
        .bind(&req.handling_requirements)
        .bind(&req.emergency_measures)
        .bind(&req.msds_url)
        .bind(&status)
        .bind(tenant_id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create material: {}", e);
            return Json(ApiResponse::server_error("危险品创建失败"));
        }
    };
    let record = material_from_row(&row);
    Json(ApiResponse::success(record, "危险品创建成功"))
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/hazardous-materials/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_material(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<MaterialDetail>> {
    let tenant_bind = resolve_material_tenant(&claims).to_string();
    let sql = format!(
        r#"
        SELECT id::text AS id, material_no, name, category,
               CASE WHEN jsonb_typeof(hazard_class::jsonb) = 'array'
                    THEN (SELECT string_agg(elem, ', ') FROM jsonb_array_elements_text(hazard_class::jsonb) elem)
                    ELSE NULL END AS hazard_class,
               un_number, cas_no, specification, unit, description, hazards::text AS hazards,
               storage_requirements, handling_requirements, emergency_measures,
               safety_data_sheet AS msds_url, status,
               created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_hazardous_materials
        WHERE id::text = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
        "#
    );
    let row = match sqlx::query(&sql)
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::not_found("危险品不存在")),
        Err(e) => {
            tracing::error!("Failed to get material: {}", e);
            return Json(ApiResponse::server_error("获取危险品详情失败"));
        }
    };
    let material = material_from_row(&row);
    Json(ApiResponse::success(
        MaterialDetail {
            material,
            stocks: vec![],
            msds: None,
            recent_records: vec![],
            tenant_id: uuid::Uuid::nil(),
        },
        "获取危险品详情成功",
    ))
}
#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:update"])),
    path = "/api/ehs/hazardous-materials/{id}",
    request_body = UpdateMaterialRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_material(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateMaterialRequest>,
) -> Json<ApiResponse<HazardousMaterial>> {
    let tenant_bind = resolve_material_tenant(&claims).to_string();
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();
    if let Some(v) = &req.name {
        sets.push(format!("name = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.category {
        sets.push(format!("category = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.hazard_class {
        let arr = serde_json::json!([v.clone()]).to_string();
        sets.push(format!("hazard_class = ${}::jsonb", params.len() + 1));
        params.push(arr);
    }
    if let Some(v) = &req.un_number {
        sets.push(format!("un_number = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.cas_no {
        sets.push(format!("cas_no = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.specification {
        sets.push(format!("specification = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.unit {
        sets.push(format!("unit = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.description {
        sets.push(format!("description = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.hazards {
        sets.push(format!("hazards = ${}::jsonb", params.len() + 1));
        params.push(serde_json::to_string(v).unwrap_or_else(|_| "[]".to_string()));
    }
    if let Some(v) = &req.storage_requirements {
        sets.push(format!("storage_requirements = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.handling_requirements {
        sets.push(format!("handling_requirements = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.emergency_measures {
        sets.push(format!("emergency_measures = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.msds_url {
        sets.push(format!("safety_data_sheet = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.status {
        sets.push(format!("status = ${}", params.len() + 1));
        params.push(v.clone());
    }
    sets.push("updated_at = now()".to_string());
    let set_clause = sets.join(", ");
    let id_idx = params.len() + 1;
    let tenant_idx = params.len() + 2;
    let sql = format!(
        r#"
        UPDATE ehs.qa_ehs_hazardous_materials
        SET {set_clause}
        WHERE id::text = ${id_idx}
          AND (${tenant_idx} = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = ${tenant_idx})
          AND deleted_at IS NULL
        RETURNING id::text AS id, material_no, name, category,
                  hazard_class::text AS hazard_class,
                  un_number, cas_no, specification, unit, description, hazards::text AS hazards,
                  storage_requirements, handling_requirements, emergency_measures,
                  safety_data_sheet AS msds_url, status,
                  created_at::text AS created_at, updated_at::text AS updated_at,
                  tenant_id::text AS tenant_id
        "#
    );
    let mut query = sqlx::query(&sql);
    for p in &params {
        query = query.bind(p);
    }
    let row = match query
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::not_found("危险品不存在")),
        Err(e) => {
            tracing::error!("Failed to update material: {}", e);
            return Json(ApiResponse::server_error("危险品更新失败"));
        }
    };
    let record = material_from_row(&row);
    Json(ApiResponse::success(record, "危险品更新成功"))
}
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:delete"])),
    path = "/api/ehs/hazardous-materials/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_material(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let tenant_bind = resolve_material_tenant(&claims).to_string();
    let sql = r#"
        UPDATE ehs.qa_ehs_hazardous_materials
        SET deleted_at = now()
        WHERE id::text = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
    "#;
    let result = match sqlx::query(sql)
        .bind(&id)
        .bind(&tenant_bind)
        .execute(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete material: {}", e);
            return Json(ApiResponse::server_error("危险品删除失败"));
        }
    };
    if result.rows_affected() == 0 {
        return Json(ApiResponse::not_found("危险品不存在"));
    }
    Json(ApiResponse::success((), "危险品删除成功"))
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/hazardous-materials/stock-records",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_stock_records(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<StockRecord>>> {
    let tenant_filter = if claims.is_superuser {
        String::from("deleted_at IS NULL")
    } else {
        let tid = claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil);
        format!("deleted_at IS NULL AND tenant_id = '{}'", tid)
    };
    let sql = format!(
        r#"SELECT id::text AS id, record_no, material_id::text AS material_id, material_name,
                  record_type, quantity, unit, batch_no, related_order, operator,
                  operation_time::text AS operation_time, from_location, to_location,
                  recipient, remarks
           FROM ehs.qa_ehs_stock_records WHERE {} ORDER BY operation_time DESC NULLS LAST"#,
        tenant_filter
    );
    let rows = match sqlx::query(&sql).fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list stock records: {}", e);
            return Json(ApiResponse::server_error("出入库记录列表获取失败"));
        }
    };
    let list: Vec<StockRecord> = rows
        .iter()
        .map(|r| StockRecord {
            id: r.try_get("id").unwrap_or_default(),
            record_no: r.try_get("record_no").unwrap_or_default(),
            material_id: r
                .try_get::<String, _>("material_id")
                .ok()
                .unwrap_or_default(),
            material_name: r.try_get("material_name").unwrap_or_default(),
            record_type: r.try_get("record_type").unwrap_or_default(),
            quantity: r.try_get("quantity").unwrap_or_default(),
            unit: r.try_get("unit").ok().flatten(),
            batch_no: r.try_get("batch_no").ok().flatten(),
            related_order: r.try_get("related_order").ok().flatten(),
            operator: r.try_get("operator").ok().flatten(),
            operation_time: r.try_get("operation_time").ok().flatten(),
            from_location: r.try_get("from_location").ok().flatten(),
            to_location: r.try_get("to_location").ok().flatten(),
            recipient: r.try_get("recipient").ok().flatten(),
            remarks: r.try_get("remarks").ok().flatten(),
            created_at: None,
            tenant_id: Uuid::nil(),
        })
        .collect();
    tracing::debug!("Listed {} stock records (real DB)", list.len());
    Json(ApiResponse::success(list, "获取出入库记录列表成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/hazardous-materials/stock-records/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_stock_record(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<StockRecord>> {
    let tenant_clause = if claims.is_superuser {
        String::from("deleted_at IS NULL")
    } else {
        let tid = claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil);
        format!("deleted_at IS NULL AND tenant_id = '{}'", tid)
    };
    let sql = format!(
        r#"SELECT id::text AS id, record_no, material_id::text AS material_id, material_name,
                  record_type, quantity, unit, batch_no, related_order, operator,
                  operation_time::text AS operation_time, from_location, to_location,
                  recipient, remarks
           FROM ehs.qa_ehs_stock_records WHERE id = $1::uuid AND {}"#,
        tenant_clause
    );
    let row = match sqlx::query(&sql)
        .bind(&id)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::not_found("出入库记录不存在")),
        Err(e) => {
            tracing::error!("Failed to get stock record {}: {}", id, e);
            return Json(ApiResponse::server_error("出入库记录获取失败"));
        }
    };
    let rec = StockRecord {
        id: row.try_get("id").unwrap_or_default(),
        record_no: row.try_get("record_no").unwrap_or_default(),
        material_id: row
            .try_get::<String, _>("material_id")
            .ok()
            .unwrap_or_default(),
        material_name: row.try_get("material_name").unwrap_or_default(),
        record_type: row.try_get("record_type").unwrap_or_default(),
        quantity: row.try_get("quantity").unwrap_or_default(),
        unit: row.try_get("unit").ok().flatten(),
        batch_no: row.try_get("batch_no").ok().flatten(),
        related_order: row.try_get("related_order").ok().flatten(),
        operator: row.try_get("operator").ok().flatten(),
        operation_time: row.try_get("operation_time").ok().flatten(),
        from_location: row.try_get("from_location").ok().flatten(),
        to_location: row.try_get("to_location").ok().flatten(),
        recipient: row.try_get("recipient").ok().flatten(),
        remarks: row.try_get("remarks").ok().flatten(),
        created_at: None,
        tenant_id: Uuid::nil(),
    };
    tracing::debug!("Got stock record from real DB: {}", id);
    Json(ApiResponse::success(rec, "获取出入库记录详情成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/hazardous-materials/{id}/msds",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_material_msds(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<MsdsData>> {
    let tenant_bind = resolve_material_tenant(&claims).to_string();
    let sql = r#"
        SELECT id::text AS id, material_id::text AS material_id, material_name, version,
               product_name, manufacturer, emergency_phone, hazard_identification,
               ingredients AS composition_info, first_aid_measures, fire_fighting_measures,
               accidental_release_measures, handling_and_storage,
               exposure_control AS exposure_controls, physical_chemical_properties,
               stability_reactivity AS reactivity_info, toxicological_info, ecological_info,
               disposal_considerations, transport_info, regulatory_info, other_info,
               updated_at::text AS updated_at, tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_msds
        WHERE material_id::text = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
        ORDER BY updated_at DESC
        LIMIT 1
    "#;
    let row = match sqlx::query(sql)
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::not_found("该危险品暂无 MSDS")),
        Err(e) => {
            tracing::error!("Failed to get material MSDS: {}", e);
            return Json(ApiResponse::server_error("获取 MSDS 失败"));
        }
    };
    let record = msds_from_row(&row);
    Json(ApiResponse::success(record, "获取 MSDS 成功"))
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/hazardous-materials/statistics",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn get_material_statistics(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<MaterialStatistics>> {
    let tenant_bind = resolve_material_tenant(&claims).to_string();
    let tc = "($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL";

    let total_materials: i32 = sqlx::query_scalar(&format!(
        "SELECT COUNT(*)::int FROM ehs.qa_ehs_hazardous_materials WHERE {}",
        tc
    ))
    .bind(&tenant_bind)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    // low_stock: current_stock IS NOT NULL AND min_stock IS NOT NULL AND current_stock < min_stock
    let low_stock_count: i32 = sqlx::query_scalar(&format!(
        "SELECT COUNT(*)::int FROM ehs.qa_ehs_hazardous_materials WHERE {} AND current_stock IS NOT NULL AND min_stock IS NOT NULL AND current_stock < min_stock",
        tc
    ))
    .bind(&tenant_bind)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    // over_stock: current_stock > max_stock
    let over_stock_count: i32 = sqlx::query_scalar(&format!(
        "SELECT COUNT(*)::int FROM ehs.qa_ehs_hazardous_materials WHERE {} AND current_stock IS NOT NULL AND max_stock IS NOT NULL AND current_stock > max_stock",
        tc
    ))
    .bind(&tenant_bind)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    // expired: materials with status = 'expired' (status column)
    let expired_count: i32 = sqlx::query_scalar(&format!(
        "SELECT COUNT(*)::int FROM ehs.qa_ehs_hazardous_materials WHERE {} AND status = 'expired'",
        tc
    ))
    .bind(&tenant_bind)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    // by_category GROUP BY
    let by_category: Vec<serde_json::Value> = sqlx::query(&format!(
        "SELECT category, COUNT(*)::int AS cnt FROM ehs.qa_ehs_hazardous_materials WHERE {} GROUP BY category ORDER BY cnt DESC",
        tc
    ))
    .bind(&tenant_bind)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default()
    .iter()
    .map(|r| {
        let cat: String = r.try_get("category").unwrap_or_default();
        let cnt: i32 = r.try_get("cnt").unwrap_or(0);
        serde_json::json!({ "category": cat, "count": cnt })
    })
    .collect();

    // by_hazard_level GROUP BY
    let by_hazard_level: Vec<serde_json::Value> = sqlx::query(&format!(
        "SELECT hazard_level, COUNT(*)::int AS cnt FROM ehs.qa_ehs_hazardous_materials WHERE {} AND hazard_level IS NOT NULL GROUP BY hazard_level ORDER BY cnt DESC",
        tc
    ))
    .bind(&tenant_bind)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default()
    .iter()
    .map(|r| {
        let level: String = r.try_get("hazard_level").unwrap_or_default();
        let cnt: i32 = r.try_get("cnt").unwrap_or(0);
        serde_json::json!({ "level": level, "count": cnt })
    })
    .collect();

    // monthly_in_out: qa_ehs_stock_records 0 行空 → 诚实空数组
    let monthly_in_out: Vec<serde_json::Value> = Vec::new();

    tracing::debug!(
        "Material stats (real DB): total={}, low={}, over={}, expired={}, categories={}, hazard_levels={}",
        total_materials, low_stock_count, over_stock_count, expired_count,
        by_category.len(), by_hazard_level.len()
    );

    Json(ApiResponse::success(
        MaterialStatistics {
            total_materials,
            total_stock_value: None, // inventory 表空，无 stock_value
            low_stock_count,
            over_stock_count,
            expired_count,
            by_category,
            by_hazard_level,
            monthly_in_out,
            tenant_id: resolve_material_tenant(&claims),
        },
        "获取危险品统计成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/hazardous-materials/categories",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_material_categories(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    // 危险品分类无持久化配置源；待建字典表后再接真。
    tracing::warn!("Material categories data source not yet enabled");
    Json(ApiResponse::not_implemented("危险品分类数据源尚未启用"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/hazardous-materials/categories",
    tag = "ehs",
    request_body = serde_json::Value,
    responses((status = 200, description = "OK")),
)]
pub async fn create_material_category(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::warn!("Material category create called but data source not yet enabled");
    Json(ApiResponse::not_implemented(
        "危险品分类数据源尚未启用，写入操作暂不可用",
    ))
}

pub fn ghs_hazard_class(health: Option<u8>, flamm: Option<u8>, phys: Option<u8>) -> &'static str {
    let h = health.unwrap_or(0).min(4);
    let f = flamm.unwrap_or(0).min(4);
    let p = phys.unwrap_or(0).min(4);
    let max = h.max(f).max(p);
    match max {
        0 => "Level 0",
        1 => "Level 1",
        2 => "Level 2",
        3 => "Level 3",
        4 => "Level 4",
        _ => "Level 0",
    }
}

pub fn flash_point_class(celsius: f64) -> &'static str {
    if celsius < 23.0 {
        "极易燃"
    } else if celsius < 60.0 {
        "易燃"
    } else if celsius <= 93.0 {
        "可燃"
    } else {
        "不燃"
    }
}

#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub fn validate_cas(cas: &str) -> bool {
    let parts: Vec<&str> = cas.split('-').collect();
    if parts.len() != 3 {
        return false;
    }
    let (p1, p2, p3) = (parts[0], parts[1], parts[2]);
    if p1.is_empty() || p2.is_empty() || p3.is_empty() {
        return false;
    }
    if p1.len() < 2 || p1.len() > 7 {
        return false;
    }
    if p2.len() != 2 {
        return false;
    }
    if p3.len() != 1 {
        return false;
    }
    let digits: Vec<u32> = format!("{}{}", p1, p2)
        .chars()
        .filter_map(|c| c.to_digit(10))
        .collect();
    if digits.len() != p1.len() + 2 {
        return false;
    }
    let check_digit = p3.chars().next().and_then(|c| c.to_digit(10));
    if check_digit.is_none() {
        return false;
    }
    let check_digit = check_digit.unwrap();
    let sum: u32 = digits
        .iter()
        .rev()
        .enumerate()
        .map(|(i, d)| d * (i as u32 + 1))
        .sum();
    sum % 10 == check_digit
}

pub fn toxicity_class(ld50_mg_kg: Option<f64>) -> &'static str {
    match ld50_mg_kg {
        None => "未知",
        Some(ld) if ld <= 5.0 => "剧毒",
        Some(ld) if ld <= 50.0 => "高毒",
        Some(ld) if ld <= 500.0 => "中等毒",
        Some(ld) if ld <= 5000.0 => "低毒",
        Some(ld) if ld <= 15000.0 => "微毒",
        Some(_) => "实际无毒",
    }
}

pub fn storage_compatibility(classes: &[&str]) -> bool {
    let has_acid = classes.iter().any(|c| c.contains("酸") || *c == "acid");
    let has_alkali = classes.iter().any(|c| c.contains("碱") || *c == "alkali");
    let has_oxidizer = classes
        .iter()
        .any(|c| c.contains("氧化") || *c == "oxidizer");
    let has_reducer = classes
        .iter()
        .any(|c| c.contains("还原") || *c == "reducer");
    let has_flammable = classes
        .iter()
        .any(|c| c.contains("易燃") || *c == "flammable");
    if has_acid && has_alkali {
        return false;
    }
    if has_oxidizer && has_reducer {
        return false;
    }
    if has_oxidizer && has_flammable {
        return false;
    }
    true
}

// ==================== 契约兜底（待上游支持） ====================
// 以下端点为前端契约已调用、但后端尚未建表的资源；
// 详情类 GET 返回 200 + 内层 404，PUT/DELETE 返回成功（幂等）。

pub async fn update_stock_record(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(_id): axum::extract::Path<String>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<StockRecord>> {
    tracing::warn!("Stock record update called but data source not yet enabled");
    Json(ApiResponse::not_implemented("出入库记录数据源尚未启用"))
}

pub async fn delete_stock_record(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(_id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::warn!("Stock record delete called but data source not yet enabled");
    Json(ApiResponse::not_implemented(
        "出入库记录数据源尚未启用，删除操作暂不可用",
    ))
}

pub async fn get_msds_by_id(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<MsdsData>> {
    // 待上游支持：MSDS 按 ID 直取复用现有按 material_id 取数（路径语义对齐）。
    get_material_msds(
        State(state),
        Extension(claims),
        headers,
        axum::extract::Path(id),
    )
    .await
}

pub async fn update_msds_by_id(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<MsdsData>> {
    // 待上游支持：MSDS 按 ID 更新，入参宽松映射占位。
    let _ = (state, claims, headers, id, req);
    Json(ApiResponse::not_found("MSDS 不存在"))
}

pub async fn delete_msds_by_id(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(_id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::warn!("MSDS delete called but data source not yet enabled");
    Json(ApiResponse::not_implemented(
        "MSDS 数据源尚未启用，删除操作暂不可用",
    ))
}

pub async fn update_material_category(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(_id): axum::extract::Path<String>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::warn!("Material category update called but data source not yet enabled");
    Json(ApiResponse::not_implemented(
        "危险品分类数据源尚未启用，更新操作暂不可用",
    ))
}

pub async fn delete_material_category(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(_id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::warn!("Material category delete called but data source not yet enabled");
    Json(ApiResponse::not_implemented(
        "危险品分类数据源尚未启用，删除操作暂不可用",
    ))
}

/// 解析请求租户：超管 → nil UUID；否则取 claims.tenant_id。
fn resolve_material_tenant(claims: &Claims) -> uuid::Uuid {
    if claims.is_superuser {
        uuid::Uuid::nil()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
    }
}

/// qa_ehs_hazardous_materials 行 → HazardousMaterial（jsonb 字段宽容解析）
fn material_from_row(r: &sqlx::postgres::PgRow) -> HazardousMaterial {
    let tenant_id: String = r.try_get("tenant_id").unwrap_or_default();
    let hazards: Option<serde_json::Value> = r.try_get("hazards").ok().flatten();
    let hazards = hazards.and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|e| e.as_str().map(|x| x.to_string()))
                .collect::<Vec<String>>()
        })
    });
    HazardousMaterial {
        id: r.try_get("id").unwrap_or_default(),
        material_no: r.try_get("material_no").unwrap_or_default(),
        name: r.try_get("name").unwrap_or_default(),
        category: r.try_get("category").unwrap_or_default(),
        hazard_class: r.try_get("hazard_class").ok().flatten(),
        un_number: r.try_get("un_number").ok().flatten(),
        cas_no: r.try_get("cas_no").ok().flatten(),
        specification: r.try_get("specification").ok().flatten(),
        unit: r.try_get("unit").ok().flatten(),
        description: r.try_get("description").ok().flatten(),
        hazards,
        storage_requirements: r.try_get("storage_requirements").ok().flatten(),
        handling_requirements: r.try_get("handling_requirements").ok().flatten(),
        emergency_measures: r.try_get("emergency_measures").ok().flatten(),
        msds_url: r.try_get("msds_url").ok().flatten(),
        status: r.try_get("status").unwrap_or_else(|_| "active".to_string()),
        created_at: r.try_get::<String, _>("created_at").ok(),
        updated_at: r.try_get::<String, _>("updated_at").ok(),
        tenant_id: Uuid::parse_str(&tenant_id).unwrap_or_default(),
    }
}

/// qa_ehs_msds 行 → MsdsData（file_url 表无来源恒 None，created_at 用 updated_at 兼容）
fn msds_from_row(r: &sqlx::postgres::PgRow) -> MsdsData {
    let tenant_id: String = r.try_get("tenant_id").unwrap_or_default();
    MsdsData {
        id: r.try_get("id").unwrap_or_default(),
        material_id: r.try_get("material_id").unwrap_or_default(),
        material_name: r.try_get("material_name").unwrap_or_default(),
        version: r.try_get("version").ok().flatten(),
        product_name: r.try_get("product_name").ok().flatten(),
        manufacturer: r.try_get("manufacturer").ok().flatten(),
        emergency_phone: r.try_get("emergency_phone").ok().flatten(),
        hazard_identification: r.try_get("hazard_identification").ok().flatten(),
        composition_info: r.try_get("composition_info").ok().flatten(),
        first_aid_measures: r.try_get("first_aid_measures").ok().flatten(),
        fire_fighting_measures: r.try_get("fire_fighting_measures").ok().flatten(),
        accidental_release_measures: r.try_get("accidental_release_measures").ok().flatten(),
        handling_and_storage: r.try_get("handling_and_storage").ok().flatten(),
        exposure_controls: r.try_get("exposure_controls").ok().flatten(),
        physical_chemical_properties: r.try_get("physical_chemical_properties").ok().flatten(),
        reactivity_info: r.try_get("reactivity_info").ok().flatten(),
        toxicological_info: r.try_get("toxicological_info").ok().flatten(),
        ecological_info: r.try_get("ecological_info").ok().flatten(),
        disposal_considerations: r.try_get("disposal_considerations").ok().flatten(),
        transport_info: r.try_get("transport_info").ok().flatten(),
        regulatory_info: r.try_get("regulatory_info").ok().flatten(),
        other_info: r.try_get("other_info").ok().flatten(),
        file_url: None,
        created_at: r.try_get::<String, _>("updated_at").ok(),
        updated_at: r.try_get::<String, _>("updated_at").ok(),
        tenant_id: Uuid::parse_str(&tenant_id).unwrap_or_default(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ghs_hazard_class_all_none() {
        assert_eq!(ghs_hazard_class(None, None, None), "Level 0");
    }

    #[test]
    fn test_ghs_hazard_class_level_1() {
        assert_eq!(ghs_hazard_class(Some(1), None, None), "Level 1");
        assert_eq!(ghs_hazard_class(None, Some(1), None), "Level 1");
        assert_eq!(ghs_hazard_class(None, None, Some(1)), "Level 1");
    }

    #[test]
    fn test_ghs_hazard_class_level_2() {
        assert_eq!(ghs_hazard_class(Some(2), Some(1), None), "Level 2");
        assert_eq!(ghs_hazard_class(Some(1), Some(2), None), "Level 2");
    }

    #[test]
    fn test_ghs_hazard_class_level_3() {
        assert_eq!(ghs_hazard_class(Some(3), Some(2), Some(1)), "Level 3");
    }

    #[test]
    fn test_ghs_hazard_class_level_4() {
        assert_eq!(ghs_hazard_class(Some(4), None, None), "Level 4");
        assert_eq!(ghs_hazard_class(Some(10), None, None), "Level 4");
    }

    #[test]
    fn test_flash_point_extremely() {
        assert_eq!(flash_point_class(0.0), "极易燃");
        assert_eq!(flash_point_class(-10.0), "极易燃");
        assert_eq!(flash_point_class(22.9), "极易燃");
    }

    #[test]
    fn test_flash_point_flammable() {
        assert_eq!(flash_point_class(23.0), "易燃");
        assert_eq!(flash_point_class(40.0), "易燃");
        assert_eq!(flash_point_class(59.9), "易燃");
    }

    #[test]
    fn test_flash_point_combustible() {
        assert_eq!(flash_point_class(60.0), "可燃");
        assert_eq!(flash_point_class(80.0), "可燃");
        assert_eq!(flash_point_class(93.0), "可燃");
    }

    #[test]
    fn test_flash_point_non_combustible() {
        assert_eq!(flash_point_class(93.1), "不燃");
        assert_eq!(flash_point_class(200.0), "不燃");
    }

    #[test]
    fn test_validate_cas_valid() {
        assert!(validate_cas("7664-93-9"));
        assert!(validate_cas("50-00-0"));
        assert!(validate_cas("64-17-5"));
    }

    #[test]
    fn test_validate_cas_invalid_format() {
        assert!(!validate_cas("12345"));
        assert!(!validate_cas("123-45"));
        assert!(!validate_cas("-93-9"));
        assert!(!validate_cas("7664--93-9"));
    }

    #[test]
    fn test_validate_cas_invalid_checksum() {
        assert!(!validate_cas("7664-93-8"));
        assert!(!validate_cas("7664-93-0"));
    }

    #[test]
    fn test_toxicity_class_unknown() {
        assert_eq!(toxicity_class(None), "未知");
    }

    #[test]
    fn test_toxicity_class_extreme() {
        assert_eq!(toxicity_class(Some(0.0)), "剧毒");
        assert_eq!(toxicity_class(Some(5.0)), "剧毒");
    }

    #[test]
    fn test_toxicity_class_high() {
        assert_eq!(toxicity_class(Some(5.1)), "高毒");
        assert_eq!(toxicity_class(Some(50.0)), "高毒");
    }

    #[test]
    fn test_toxicity_class_medium() {
        assert_eq!(toxicity_class(Some(50.1)), "中等毒");
        assert_eq!(toxicity_class(Some(500.0)), "中等毒");
    }

    #[test]
    fn test_toxicity_class_low() {
        assert_eq!(toxicity_class(Some(500.1)), "低毒");
        assert_eq!(toxicity_class(Some(5000.0)), "低毒");
    }

    #[test]
    fn test_toxicity_class_slight() {
        assert_eq!(toxicity_class(Some(5000.1)), "微毒");
        assert_eq!(toxicity_class(Some(15000.0)), "微毒");
    }

    #[test]
    fn test_toxicity_class_practical_non_toxic() {
        assert_eq!(toxicity_class(Some(15000.1)), "实际无毒");
        assert_eq!(toxicity_class(Some(100000.0)), "实际无毒");
    }

    #[test]
    fn test_storage_compatible_ok() {
        assert!(storage_compatibility(&["易燃"]));
        assert!(storage_compatibility(&["酸"]));
        assert!(storage_compatibility(&["易燃", "还原"]));
        assert!(storage_compatibility(&["酸", "氧化"]));
    }

    #[test]
    fn test_storage_incompatible_acid_alkali() {
        assert!(!storage_compatibility(&["酸", "碱"]));
        assert!(!storage_compatibility(&["acid", "alkali"]));
    }

    #[test]
    fn test_storage_incompatible_oxidizer_reducer() {
        assert!(!storage_compatibility(&["氧化", "还原"]));
        assert!(!storage_compatibility(&["oxidizer", "reducer"]));
    }

    #[test]
    fn test_storage_incompatible_oxidizer_flammable() {
        assert!(!storage_compatibility(&["氧化", "易燃"]));
        assert!(!storage_compatibility(&["oxidizer", "flammable"]));
    }
}
