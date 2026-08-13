//! Hazardous material management - Materials, inventory, MSDS, and warehouse records

use axum::{extract::State, http::HeaderMap, routing::*, Extension, Json, Router};
use serde::{Deserialize, Serialize};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

use uuid::Uuid;

use crate::shared::AppState;

fn get_tenant_id(claims: &Claims, headers: &HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

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
        .route(
            "/hazardous-materials/{id}",
            get(get_material)
                .put(update_material)
                .delete(delete_material),
        )
        .route(
            "/hazardous-materials/{id}/stocks",
            get(list_material_stocks),
        )
        .route(
            "/hazardous-materials/{id}/msds",
            get(get_material_msds).put(update_material_msds),
        )
        .route(
            "/hazardous-materials/stock-records",
            get(list_stock_records),
        )
        .route(
            "/hazardous-materials/stock-records/stock-in",
            post(create_stock_in),
        )
        .route(
            "/hazardous-materials/stock-records/stock-out",
            post(create_stock_out),
        )
        .route(
            "/hazardous-materials/stock-records/{id}",
            get(get_stock_record),
        )
        .route(
            "/hazardous-materials/inventory",
            get(list_materials).post(create_material),
        )
        .route("/hazardous-materials/movements", get(list_stock_records))
        .route("/hazardous-materials/msds", get(list_materials))
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
    pub alias: Option<String>,
    pub english_name: Option<String>,
    pub cas_no: Option<String>,
    pub category: String,
    pub hazard_level: Option<String>,
    pub hazard_class: Option<Vec<String>>,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub packaging: Option<String>,
    pub storage_condition: Option<String>,
    pub storage_location: Option<String>,
    pub max_stock: Option<f64>,
    pub min_stock: Option<f64>,
    pub current_stock: Option<f64>,
    pub safety_data_sheet: Option<String>,
    pub emergency_measures: Option<String>,
    pub supplier: Option<String>,
    pub status: String,
    pub remarks: Option<String>,
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
    pub alias: Option<String>,
    pub english_name: Option<String>,
    pub cas_no: Option<String>,
    pub category: String,
    pub hazard_level: Option<String>,
    pub hazard_class: Option<Vec<String>>,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub packaging: Option<String>,
    pub storage_condition: Option<String>,
    pub storage_location: Option<String>,
    pub max_stock: Option<f64>,
    pub min_stock: Option<f64>,
    pub safety_data_sheet: Option<String>,
    pub emergency_measures: Option<String>,
    pub supplier: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMaterialRequest {
    pub name: Option<String>,
    pub alias: Option<String>,
    pub english_name: Option<String>,
    pub cas_no: Option<String>,
    pub category: Option<String>,
    pub hazard_level: Option<String>,
    pub hazard_class: Option<Vec<String>>,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub packaging: Option<String>,
    pub storage_condition: Option<String>,
    pub storage_location: Option<String>,
    pub max_stock: Option<f64>,
    pub min_stock: Option<f64>,
    pub safety_data_sheet: Option<String>,
    pub emergency_measures: Option<String>,
    pub supplier: Option<String>,
    pub status: Option<String>,
    pub remarks: Option<String>,
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
    path = "/api/ehs/hazardous-materials",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_materials(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<HazardousMaterial>>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Listing hazardous materials");
    Json(ApiResponse::success(
        Vec::<HazardousMaterial>::new(),
        "获取危险品列表成功",
    ))
}

#[utoipa::path(
    post,
    path = "/api/ehs/hazardous-materials",
    request_body = CreateMaterialRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_material(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateMaterialRequest>,
) -> Json<ApiResponse<HazardousMaterial>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Creating hazardous material: {:?}", req);
    Json(ApiResponse::success(
        HazardousMaterial {
            id: uuid::Uuid::new_v4().to_string(),
            material_no: format!(
                "HM-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            name: req.name,
            alias: req.alias,
            english_name: req.english_name,
            cas_no: req.cas_no,
            category: req.category,
            hazard_level: req.hazard_level,
            hazard_class: req.hazard_class,
            specification: req.specification,
            unit: req.unit,
            packaging: req.packaging,
            storage_condition: req.storage_condition,
            storage_location: req.storage_location,
            max_stock: req.max_stock,
            min_stock: req.min_stock,
            current_stock: Some(0.0),
            safety_data_sheet: req.safety_data_sheet,
            emergency_measures: req.emergency_measures,
            supplier: req.supplier,
            status: "active".to_string(),
            remarks: req.remarks,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "危险品创建成功",
    ))
}

#[utoipa::path(
    get,
    path = "/api/ehs/hazardous-materials/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_material(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<MaterialDetail>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Getting hazardous material: {}", id);
    Json(ApiResponse::success(
        MaterialDetail {
            material: HazardousMaterial {
                id: id.clone(),
                material_no: "HM-2024001".to_string(),
                name: "浓硫酸".to_string(),
                alias: Some("硫酸".to_string()),
                english_name: Some("Sulfuric acid".to_string()),
                cas_no: Some("7664-93-9".to_string()),
                category: "corrosive".to_string(),
                hazard_level: Some("high".to_string()),
                hazard_class: Some(vec!["腐蚀性".to_string(), "强氧化性".to_string()]),
                specification: Some("98%".to_string()),
                unit: Some("kg".to_string()),
                packaging: Some("25L塑料桶".to_string()),
                storage_condition: Some("阴凉、干燥、通风处储存".to_string()),
                storage_location: Some("危险品仓库A区".to_string()),
                max_stock: Some(500.0),
                min_stock: Some(50.0),
                current_stock: Some(200.0),
                safety_data_sheet: Some("详见MSDS".to_string()),
                emergency_measures: Some("皮肤接触立即用大量清水冲洗...".to_string()),
                supplier: Some("某某化工有限公司".to_string()),
                status: "active".to_string(),
                remarks: None,
                created_at: Some(chrono::Utc::now().to_rfc3339()),
                updated_at: Some(chrono::Utc::now().to_rfc3339()),

                tenant_id,
            },
            stocks: vec![
                MaterialStock {
                    id: "stock-001".to_string(),
                    material_id: id.clone(),
                    material_name: "浓硫酸".to_string(),
                    batch_no: Some("B2024001".to_string()),
                    quantity: 100.0,
                    unit: Some("kg".to_string()),
                    storage_location: Some("危险品仓库A区".to_string()),
                    received_date: Some("2024-05-01".to_string()),
                    expiry_date: Some("2026-04-30".to_string()),
                    supplier: Some("某某化工有限公司".to_string()),
                    status: "normal".to_string(),
                    remarks: None,
                    created_at: Some(chrono::Utc::now().to_rfc3339()),
                    updated_at: Some(chrono::Utc::now().to_rfc3339()),

                    tenant_id,
                },
                MaterialStock {
                    id: "stock-002".to_string(),
                    material_id: id.clone(),
                    material_name: "浓硫酸".to_string(),
                    batch_no: Some("B2024002".to_string()),
                    quantity: 100.0,
                    unit: Some("kg".to_string()),
                    storage_location: Some("危险品仓库A区".to_string()),
                    received_date: Some("2024-06-01".to_string()),
                    expiry_date: Some("2026-05-31".to_string()),
                    supplier: Some("某某化工有限公司".to_string()),
                    status: "normal".to_string(),
                    remarks: None,
                    created_at: Some(chrono::Utc::now().to_rfc3339()),
                    updated_at: Some(chrono::Utc::now().to_rfc3339()),

                    tenant_id,
                },
            ],
            msds: Some(MsdsData {
                id: "msds-001".to_string(),
                material_id: id.clone(),
                material_name: "浓硫酸".to_string(),
                version: Some("V1.0".to_string()),
                ingredients: Some("硫酸 98%".to_string()),
                hazard_identification: Some("腐蚀性，强氧化性".to_string()),
                first_aid_measures: Some(
                    "皮肤接触：立即脱去污染的衣着，用大量流动清水冲洗至少15分钟...".to_string(),
                ),
                fire_fighting_measures: Some("消防人员必须穿全身耐酸碱消防服...".to_string()),
                accidental_release_measures: Some("迅速撤离泄漏污染区人员至安全区...".to_string()),
                handling_and_storage: Some("密闭操作，注意通风...".to_string()),
                exposure_control: Some("密闭操作，提供安全淋浴和洗眼设备...".to_string()),
                physical_chemical_properties: Some("无色透明油状液体，无臭...".to_string()),
                stability_reactivity: Some("稳定，遇水大量放热...".to_string()),
                toxicological_info: Some("具有强腐蚀性...".to_string()),
                ecological_info: Some("对环境有危害，对水体和土壤可造成污染...".to_string()),
                disposal_considerations: Some("缓慢加入碱液-石灰水中，并不断搅拌...".to_string()),
                transport_info: Some("铁路运输时应严格按照铁道部...".to_string()),
                regulatory_info: Some("化学危险物品安全管理条例...".to_string()),
                other_info: None,
                updated_at: Some(chrono::Utc::now().to_rfc3339()),

                tenant_id,
            }),
            recent_records: vec![],
            tenant_id,
        },
        "获取危险品详情成功",
    ))
}

#[utoipa::path(
    put,
    path = "/api/ehs/hazardous-materials/{id}",
    request_body = UpdateMaterialRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_material(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateMaterialRequest>,
) -> Json<ApiResponse<HazardousMaterial>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Updating hazardous material {}: {:?}", id, req);
    Json(ApiResponse::success(
        HazardousMaterial {
            id,
            material_no: "HM-2024001".to_string(),
            name: req.name.unwrap_or_else(|| "浓硫酸".to_string()),
            alias: req.alias,
            english_name: req.english_name,
            cas_no: req.cas_no,
            category: req.category.unwrap_or_else(|| "corrosive".to_string()),
            hazard_level: req.hazard_level,
            hazard_class: req.hazard_class,
            specification: req.specification,
            unit: req.unit,
            packaging: req.packaging,
            storage_condition: req.storage_condition,
            storage_location: req.storage_location,
            max_stock: req.max_stock,
            min_stock: req.min_stock,
            current_stock: Some(200.0),
            safety_data_sheet: req.safety_data_sheet,
            emergency_measures: req.emergency_measures,
            supplier: req.supplier,
            status: req.status.unwrap_or_else(|| "active".to_string()),
            remarks: req.remarks,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "危险品更新成功",
    ))
}

#[utoipa::path(
    delete,
    path = "/api/ehs/hazardous-materials/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_material(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Deleting hazardous material: {}", id);
    Json(ApiResponse::success((), "危险品删除成功"))
}

#[utoipa::path(
    get,
    path = "/api/ehs/hazardous-materials/{id}/stocks",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn list_material_stocks(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<MaterialStock>>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Listing stocks for material: {}", id);
    Json(ApiResponse::success(
        Vec::<MaterialStock>::new(),
        "获取库存列表成功",
    ))
}

#[utoipa::path(
    get,
    path = "/api/ehs/hazardous-materials/stock-records",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_stock_records(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<StockRecord>>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Listing stock records");
    Json(ApiResponse::success(
        Vec::<StockRecord>::new(),
        "获取出入库记录列表成功",
    ))
}

#[utoipa::path(
    post,
    path = "/api/ehs/hazardous-materials/stock-records/stock-in",
    request_body = CreateStockRecordRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_stock_in(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateStockRecordRequest>,
) -> Json<ApiResponse<StockRecord>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Creating stock in record: {:?}", req);
    Json(ApiResponse::success(
        StockRecord {
            id: uuid::Uuid::new_v4().to_string(),
            record_no: format!(
                "SI-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            material_id: req.material_id,
            material_name: "浓硫酸".to_string(),
            record_type: "in".to_string(),
            quantity: req.quantity,
            unit: Some("kg".to_string()),
            batch_no: req.batch_no,
            related_order: req.related_order,
            operator: req.operator,
            operation_time: Some(chrono::Utc::now().to_rfc3339()),
            from_location: req.from_location,
            to_location: req.to_location,
            recipient: req.recipient,
            remarks: req.remarks,
            created_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "入库记录创建成功",
    ))
}

#[utoipa::path(
    post,
    path = "/api/ehs/hazardous-materials/stock-records/stock-out",
    request_body = CreateStockRecordRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_stock_out(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateStockRecordRequest>,
) -> Json<ApiResponse<StockRecord>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Creating stock out record: {:?}", req);
    Json(ApiResponse::success(
        StockRecord {
            id: uuid::Uuid::new_v4().to_string(),
            record_no: format!(
                "SO-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            material_id: req.material_id,
            material_name: "浓硫酸".to_string(),
            record_type: "out".to_string(),
            quantity: req.quantity,
            unit: Some("kg".to_string()),
            batch_no: req.batch_no,
            related_order: req.related_order,
            operator: req.operator,
            operation_time: Some(chrono::Utc::now().to_rfc3339()),
            from_location: req.from_location,
            to_location: req.to_location,
            recipient: req.recipient,
            remarks: req.remarks,
            created_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "出库记录创建成功",
    ))
}

#[utoipa::path(
    get,
    path = "/api/ehs/hazardous-materials/stock-records/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_stock_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<StockRecord>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Getting stock record: {}", id);
    Json(ApiResponse::success(
        StockRecord {
            id,
            record_no: "SI-2024001".to_string(),
            material_id: "material-001".to_string(),
            material_name: "浓硫酸".to_string(),
            record_type: "in".to_string(),
            quantity: 100.0,
            unit: Some("kg".to_string()),
            batch_no: Some("B2024001".to_string()),
            related_order: Some("PO-2024001".to_string()),
            operator: Some("仓库管理员".to_string()),
            operation_time: Some(chrono::Utc::now().to_rfc3339()),
            from_location: Some("供应商".to_string()),
            to_location: Some("危险品仓库A区".to_string()),
            recipient: None,
            remarks: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "获取出入库记录详情成功",
    ))
}

#[utoipa::path(
    get,
    path = "/api/ehs/hazardous-materials/{id}/msds",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_material_msds(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<MsdsData>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Getting MSDS for material: {}", id);
    Json(ApiResponse::success(
        MsdsData {
            id: "msds-001".to_string(),
            material_id: id,
            material_name: "浓硫酸".to_string(),
            version: Some("V1.0".to_string()),
            ingredients: Some("硫酸 98%".to_string()),
            hazard_identification: Some("腐蚀性，强氧化性".to_string()),
            first_aid_measures: Some(
                "皮肤接触：立即脱去污染的衣着，用大量流动清水冲洗至少15分钟...".to_string(),
            ),
            fire_fighting_measures: Some("消防人员必须穿全身耐酸碱消防服...".to_string()),
            accidental_release_measures: Some("迅速撤离泄漏污染区人员至安全区...".to_string()),
            handling_and_storage: Some("密闭操作，注意通风...".to_string()),
            exposure_control: Some("密闭操作，提供安全淋浴和洗眼设备...".to_string()),
            physical_chemical_properties: Some("无色透明油状液体，无臭...".to_string()),
            stability_reactivity: Some("稳定，遇水大量放热...".to_string()),
            toxicological_info: Some("具有强腐蚀性...".to_string()),
            ecological_info: Some("对环境有危害，对水体和土壤可造成污染...".to_string()),
            disposal_considerations: Some("缓慢加入碱液-石灰水中，并不断搅拌...".to_string()),
            transport_info: Some("铁路运输时应严格按照铁道部...".to_string()),
            regulatory_info: Some("化学危险物品安全管理条例...".to_string()),
            other_info: None,
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "获取MSDS成功",
    ))
}

#[utoipa::path(
    put,
    path = "/api/ehs/hazardous-materials/{id}/msds",
    request_body = UpdateMsdsRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_material_msds(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateMsdsRequest>,
) -> Json<ApiResponse<MsdsData>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Updating MSDS for material {}: {:?}", id, req);
    Json(ApiResponse::success(
        MsdsData {
            id: "msds-001".to_string(),
            material_id: id,
            material_name: "浓硫酸".to_string(),
            version: req.version,
            ingredients: req.ingredients,
            hazard_identification: req.hazard_identification,
            first_aid_measures: req.first_aid_measures,
            fire_fighting_measures: req.fire_fighting_measures,
            accidental_release_measures: req.accidental_release_measures,
            handling_and_storage: req.handling_and_storage,
            exposure_control: req.exposure_control,
            physical_chemical_properties: req.physical_chemical_properties,
            stability_reactivity: req.stability_reactivity,
            toxicological_info: req.toxicological_info,
            ecological_info: req.ecological_info,
            disposal_considerations: req.disposal_considerations,
            transport_info: req.transport_info,
            regulatory_info: req.regulatory_info,
            other_info: req.other_info,
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "MSDS更新成功",
    ))
}

#[utoipa::path(
    get,
    path = "/api/ehs/hazardous-materials/statistics",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn get_material_statistics(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<MaterialStatistics>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Getting material statistics");
    Json(ApiResponse::success(
        MaterialStatistics {
            total_materials: 45,
            total_stock_value: Some(1250000.0),
            low_stock_count: 5,
            over_stock_count: 3,
            expired_count: 2,
            by_category: vec![
                serde_json::json!({ "category": "flammable", "name": "易燃", "count": 15 }),
                serde_json::json!({ "category": "explosive", "name": "易爆", "count": 5 }),
                serde_json::json!({ "category": "toxic", "name": "有毒", "count": 12 }),
                serde_json::json!({ "category": "corrosive", "name": "腐蚀", "count": 8 }),
                serde_json::json!({ "category": "oxidizing", "name": "氧化", "count": 5 }),
            ],
            by_hazard_level: vec![
                serde_json::json!({ "level": "low", "name": "低危", "count": 10 }),
                serde_json::json!({ "level": "medium", "name": "中危", "count": 25 }),
                serde_json::json!({ "level": "high", "name": "高危", "count": 10 }),
            ],
            monthly_in_out: vec![
                serde_json::json!({ "month": "1月", "in": 500, "out": 300 }),
                serde_json::json!({ "month": "2月", "in": 450, "out": 280 }),
                serde_json::json!({ "month": "3月", "in": 600, "out": 400 }),
                serde_json::json!({ "month": "4月", "in": 550, "out": 350 }),
                serde_json::json!({ "month": "5月", "in": 480, "out": 420 }),
                serde_json::json!({ "month": "6月", "in": 520, "out": 380 }),
            ],

            tenant_id,
        },
        "获取危险品统计成功",
    ))
}

#[utoipa::path(
    get,
    path = "/api/ehs/hazardous-materials/categories",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_material_categories(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Listing material categories");
    let categories = vec![
        serde_json::json!({ "code": "flammable", "name": "易燃" }),
        serde_json::json!({ "code": "explosive", "name": "易爆" }),
        serde_json::json!({ "code": "toxic", "name": "有毒" }),
        serde_json::json!({ "code": "corrosive", "name": "腐蚀" }),
        serde_json::json!({ "code": "oxidizing", "name": "氧化性" }),
        serde_json::json!({ "code": "compressed_gas", "name": "压缩气体" }),
        serde_json::json!({ "code": "radioactive", "name": "放射性" }),
        serde_json::json!({ "code": "miscellaneous", "name": "其他" }),
    ];
    Json(ApiResponse::success(categories, "获取危险品分类成功"))
}

#[utoipa::path(
    post,
    path = "/api/ehs/hazardous-materials/categories",
    tag = "ehs",
    request_body = serde_json::Value,
    responses((status = 200, description = "OK")),
)]
pub async fn create_material_category(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Creating material category: {:?}", req);
    Json(ApiResponse::success(req, "危险品分类创建成功"))
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
