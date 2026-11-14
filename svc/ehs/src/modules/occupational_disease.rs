//! Occupational disease prevention - Hazard factors, detection records, cases, protection, and training

use axum::{
    extract::{Query, State},
    http::HeaderMap,
    routing::*,
    Extension, Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::ApiResponse;
use utoipa::ToSchema;

use uuid::Uuid;

use crate::shared::permission::{dual_scope, open_read_scope, open_write_scope};
use crate::shared::AppState;
pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/occupational-disease/statistics",
            get(get_disease_statistics),
        )
        .route(
            "/occupational-diseases/factors",
            get(list_hazard_factors).post(create_hazard_factor),
        )
        .route(
            "/occupational-diseases/factors/{id}",
            get(get_hazard_factor)
                .put(update_hazard_factor)
                .delete(delete_hazard_factor),
        )
        .route(
            "/occupational-diseases/detection-records",
            get(list_detection_records).post(create_detection_record),
        )
        .route(
            "/occupational-diseases/detection-records/{id}",
            get(get_detection_record)
                .put(update_detection_record)
                .delete(delete_detection_record),
        )
        .route(
            "/occupational-diseases/cases",
            get(list_disease_cases).post(create_disease_case),
        )
        .route(
            "/occupational-diseases/cases/{id}",
            get(get_disease_case)
                .put(update_disease_case)
                .delete(delete_disease_case),
        )
        .route(
            "/occupational-diseases/protection-measures",
            get(list_protection_measures).post(create_protection_measure),
        )
        .route(
            "/occupational-diseases/protection-measures/{id}",
            get(get_protection_measure)
                .put(update_protection_measure)
                .delete(delete_protection_measure),
        )
}

#[derive(Debug, Deserialize)]
pub struct DiseaseQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub factor_type: Option<String>,
    pub year: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct HazardFactor {
    pub id: String,
    pub factor_no: String,
    pub name: String,
    pub factor_type: String,
    pub category: Option<String>,
    pub description: Option<String>,
    pub hazard_level: Option<String>,
    pub exposure_limit: Option<String>,
    pub unit: Option<String>,
    pub sources: Option<Vec<String>>,
    pub affected_positions: Option<Vec<String>>,
    pub affected_count: Option<i32>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct DetectionRecord {
    pub id: String,
    pub record_no: String,
    pub factor_id: Option<String>,
    pub factor_name: String,
    pub factor_type: String,
    pub detect_point: String,
    pub detect_date: Option<String>,
    pub detect_agency: Option<String>,
    pub detect_method: Option<String>,
    pub concentration: Option<String>,
    pub unit: Option<String>,
    pub standard_value: Option<String>,
    pub result: String,
    pub detector: Option<String>,
    pub status: String,
    pub remarks: Option<String>,
    pub attachments: Option<Vec<String>>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct DiseaseCase {
    pub id: String,
    pub case_no: String,
    pub employee_id: String,
    pub employee_name: String,
    pub gender: Option<String>,
    pub age: Option<i64>,
    pub department: Option<String>,
    pub position: Option<String>,
    pub disease_type: String,
    pub disease_name: String,
    pub hazard_factor: Option<String>,
    pub diagnosis_date: Option<String>,
    pub diagnosis_hospital: Option<String>,
    pub diagnosis_basis: Option<String>,
    pub work_related: bool,
    pub severity: Option<String>,
    pub status: String,
    pub treatment: Option<String>,
    pub compensation: Option<String>,
    pub attachments: Option<Vec<String>>,
    pub reported_at: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct ProtectionMeasure {
    pub id: String,
    pub measure_no: String,
    pub title: String,
    pub measure_type: String,
    pub description: Option<String>,
    pub related_factors: Option<Vec<String>>,
    pub related_positions: Option<Vec<String>>,
    pub implementation_date: Option<String>,
    pub status: String,
    pub responsible_person: Option<String>,
    pub effectiveness: Option<String>,
    pub inspection_date: Option<String>,
    pub remarks: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct HealthTraining {
    pub id: String,
    pub training_no: String,
    pub title: String,
    pub training_type: String,
    pub content: Option<String>,
    pub trainer: Option<String>,
    pub training_date: Option<String>,
    pub location: Option<String>,
    pub participants_count: Option<i32>,
    pub duration_hours: Option<i32>,
    pub status: String,
    pub pass_rate: Option<f64>,
    pub attachments: Option<Vec<String>>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct DiseaseStatistics {
    pub total_factors: i32,
    pub controlled_factors: i32,
    pub total_detections: i32,
    pub qualified_detections: i32,
    pub total_cases: i32,
    pub active_cases: i32,
    pub total_trainings: i32,
    pub total_participants: i32,
    pub by_factor_type: Vec<serde_json::Value>,
    pub by_department: Vec<serde_json::Value>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateHazardFactorRequest {
    pub name: String,
    pub factor_type: String,
    pub category: Option<String>,
    pub description: Option<String>,
    pub hazard_level: Option<String>,
    pub exposure_limit: Option<String>,
    pub unit: Option<String>,
    pub sources: Option<Vec<String>>,
    pub affected_positions: Option<Vec<String>>,
    pub affected_count: Option<i32>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateHazardFactorRequest {
    pub name: Option<String>,
    pub factor_type: Option<String>,
    pub category: Option<String>,
    pub description: Option<String>,
    pub hazard_level: Option<String>,
    pub exposure_limit: Option<String>,
    pub unit: Option<String>,
    pub sources: Option<Vec<String>>,
    pub affected_positions: Option<Vec<String>>,
    pub affected_count: Option<i32>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateDetectionRecordRequest {
    pub factor_id: Option<String>,
    pub factor_name: String,
    pub factor_type: String,
    pub detect_point: String,
    pub detect_date: Option<String>,
    pub detect_agency: Option<String>,
    pub detect_method: Option<String>,
    pub concentration: Option<String>,
    pub unit: Option<String>,
    pub standard_value: Option<String>,
    pub result: String,
    pub detector: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateDiseaseCaseRequest {
    pub employee_id: String,
    pub employee_name: String,
    pub gender: Option<String>,
    pub age: Option<i64>,
    pub department: Option<String>,
    pub position: Option<String>,
    pub disease_type: String,
    pub disease_name: String,
    pub hazard_factor: Option<String>,
    pub diagnosis_date: Option<String>,
    pub diagnosis_hospital: Option<String>,
    pub diagnosis_basis: Option<String>,
    pub work_related: Option<bool>,
    pub severity: Option<String>,
    pub status: Option<String>,
    pub treatment: Option<String>,
    pub compensation: Option<String>,
    pub attachments: Option<Vec<String>>,
    pub reported_at: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateDiseaseCaseRequest {
    pub employee_name: Option<String>,
    pub gender: Option<String>,
    pub age: Option<i64>,
    pub department: Option<String>,
    pub position: Option<String>,
    pub disease_type: Option<String>,
    pub disease_name: Option<String>,
    pub hazard_factor: Option<String>,
    pub diagnosis_date: Option<String>,
    pub diagnosis_hospital: Option<String>,
    pub diagnosis_basis: Option<String>,
    pub work_related: Option<bool>,
    pub severity: Option<String>,
    pub status: Option<String>,
    pub treatment: Option<String>,
    pub compensation: Option<String>,
    pub attachments: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateProtectionMeasureRequest {
    pub title: String,
    pub measure_type: String,
    pub description: Option<String>,
    pub related_factors: Option<Vec<String>>,
    pub related_positions: Option<Vec<String>>,
    pub implementation_date: Option<String>,
    pub responsible_person: Option<String>,
    pub effectiveness: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateHealthTrainingRequest {
    pub title: String,
    pub training_type: String,
    pub content: Option<String>,
    pub trainer: Option<String>,
    pub training_date: Option<String>,
    pub location: Option<String>,
    pub participants_count: Option<i32>,
    pub duration_hours: Option<i32>,
    pub pass_rate: Option<f64>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:hazard:read"])),
    path = "/api/ehs/occupational-diseases/factors",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_hazard_factors(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> ApiResponse<Vec<HazardFactor>> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.occupational.list_hazard_factors",
        "ehs.qa_ehs_hazard_factors",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open occupational disease scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let locale = Locale::from_headers(&headers).as_sql();
    let result = match tenant_scope.tenant_id() {
        Some(tenant) => {
            sqlx::query(
                r#"
                SELECT
                    id::text AS id, factor_no,
                    CASE WHEN $1 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
                    factor_type, category, description, hazard_level, exposure_limit, unit,
                    sources::text AS sources, affected_positions::text AS affected_positions,
                    affected_count, status, remarks,
                    created_at AS created_at, updated_at AS updated_at
                FROM ehs.qa_ehs_hazard_factors
                WHERE tenant_id = $2::uuid AND deleted_at IS NULL
                ORDER BY created_at DESC
                LIMIT 200
                "#,
            )
            .bind(locale)
            .bind(tenant)
            .fetch_all(&mut scope)
            .await
        }
        // 系统通道（超管跨租户）：SQL 里显式不含任何 tenant_id 谓词。
        None => {
            sqlx::query(
                r#"
                SELECT
                    id::text AS id, factor_no,
                    CASE WHEN $1 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
                    factor_type, category, description, hazard_level, exposure_limit, unit,
                    sources::text AS sources, affected_positions::text AS affected_positions,
                    affected_count, status, remarks,
                    created_at AS created_at, updated_at AS updated_at
                FROM ehs.qa_ehs_hazard_factors
                WHERE deleted_at IS NULL
                ORDER BY created_at DESC
                LIMIT 200
                "#,
            )
            .bind(locale)
            .fetch_all(&mut scope)
            .await
        }
    };

    let rows = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list hazard factors: {}", e);
            return ApiResponse::server_error("获取危害因素列表失败");
        }
    };

    let factors: Vec<HazardFactor> = rows
        .iter()
        .map(|r| {
            let sources = r
                .try_get::<Option<String>, _>("sources")
                .ok()
                .flatten()
                .and_then(|t| serde_json::from_str(&t).ok());
            let positions = r
                .try_get::<Option<String>, _>("affected_positions")
                .ok()
                .flatten()
                .and_then(|t| serde_json::from_str(&t).ok());
            HazardFactor {
                id: r.try_get::<String, _>("id").unwrap_or_default(),
                factor_no: r.try_get::<String, _>("factor_no").unwrap_or_default(),
                name: r.try_get::<String, _>("name").unwrap_or_default(),
                factor_type: r.try_get::<String, _>("factor_type").unwrap_or_default(),
                category: r.try_get::<Option<String>, _>("category").ok().flatten(),
                description: r.try_get::<Option<String>, _>("description").ok().flatten(),
                hazard_level: r
                    .try_get::<Option<String>, _>("hazard_level")
                    .ok()
                    .flatten(),
                exposure_limit: r
                    .try_get::<Option<String>, _>("exposure_limit")
                    .ok()
                    .flatten(),
                unit: r.try_get::<Option<String>, _>("unit").ok().flatten(),
                sources,
                affected_positions: positions,
                affected_count: r.try_get::<Option<i32>, _>("affected_count").ok().flatten(),
                status: r
                    .try_get::<Option<String>, _>("status")
                    .ok()
                    .flatten()
                    .unwrap_or_else(|| "active".to_string()),
                remarks: r.try_get::<Option<String>, _>("remarks").ok().flatten(),
                created_at: r
                    .try_get::<Option<DateTime<Utc>>, _>("created_at")
                    .ok()
                    .flatten(),
                updated_at: r
                    .try_get::<Option<DateTime<Utc>>, _>("updated_at")
                    .ok()
                    .flatten(),
                tenant_id: uuid::Uuid::nil(),
            }
        })
        .collect();

    ApiResponse::success(factors, "获取危害因素列表成功")
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:hazard:admin"])),
    path = "/api/ehs/occupational-diseases/factors",
    request_body = CreateHazardFactorRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_hazard_factor(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(_req): Json<CreateHazardFactorRequest>,
) -> ApiResponse<HazardFactor> {
    tracing::warn!("Occupational disease module not yet enabled");
    ApiResponse::not_implemented("职业危害数据源尚未启用")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:hazard:read"])),
    path = "/api/ehs/occupational-diseases/factors/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_hazard_factor(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<HazardFactor> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.occupational.get_hazard_factor",
        "ehs.qa_ehs_hazard_factors",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open occupational disease scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let locale = Locale::from_headers(&headers).as_sql();
    let result = match tenant_scope.tenant_id() {
        Some(tenant) => {
            sqlx::query(
                r#"
                SELECT
                    id::text AS id, factor_no,
                    CASE WHEN $2 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
                    factor_type, category, description, hazard_level, exposure_limit, unit,
                    sources::text AS sources, affected_positions::text AS affected_positions,
                    affected_count, status, remarks,
                    created_at AS created_at, updated_at AS updated_at
                FROM ehs.qa_ehs_hazard_factors
                WHERE id = $1::uuid AND tenant_id = $3::uuid AND deleted_at IS NULL
                "#,
            )
            .bind(&id)
            .bind(locale)
            .bind(tenant)
            .fetch_optional(&mut scope)
            .await
        }
        // 系统通道（超管跨租户）：SQL 里显式不含任何 tenant_id 谓词。
        None => {
            sqlx::query(
                r#"
                SELECT
                    id::text AS id, factor_no,
                    CASE WHEN $2 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
                    factor_type, category, description, hazard_level, exposure_limit, unit,
                    sources::text AS sources, affected_positions::text AS affected_positions,
                    affected_count, status, remarks,
                    created_at AS created_at, updated_at AS updated_at
                FROM ehs.qa_ehs_hazard_factors
                WHERE id = $1::uuid AND deleted_at IS NULL
                "#,
            )
            .bind(&id)
            .bind(locale)
            .fetch_optional(&mut scope)
            .await
        }
    };

    let row = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to get hazard factor: {}", e);
            return ApiResponse::server_error("获取危害因素详情失败");
        }
    };
    let row = match row {
        Some(r) => r,
        None => return ApiResponse::not_found("危害因素不存在"),
    };

    let sources = row
        .try_get::<Option<String>, _>("sources")
        .ok()
        .flatten()
        .and_then(|t| serde_json::from_str(&t).ok());
    let positions = row
        .try_get::<Option<String>, _>("affected_positions")
        .ok()
        .flatten()
        .and_then(|t| serde_json::from_str(&t).ok());
    let factor = HazardFactor {
        id: row.try_get::<String, _>("id").unwrap_or_default(),
        factor_no: row.try_get::<String, _>("factor_no").unwrap_or_default(),
        name: row.try_get::<String, _>("name").unwrap_or_default(),
        factor_type: row.try_get::<String, _>("factor_type").unwrap_or_default(),
        category: row.try_get::<Option<String>, _>("category").ok().flatten(),
        description: row
            .try_get::<Option<String>, _>("description")
            .ok()
            .flatten(),
        hazard_level: row
            .try_get::<Option<String>, _>("hazard_level")
            .ok()
            .flatten(),
        exposure_limit: row
            .try_get::<Option<String>, _>("exposure_limit")
            .ok()
            .flatten(),
        unit: row.try_get::<Option<String>, _>("unit").ok().flatten(),
        sources,
        affected_positions: positions,
        affected_count: row
            .try_get::<Option<i32>, _>("affected_count")
            .ok()
            .flatten(),
        status: row
            .try_get::<Option<String>, _>("status")
            .ok()
            .flatten()
            .unwrap_or_else(|| "active".to_string()),
        remarks: row.try_get::<Option<String>, _>("remarks").ok().flatten(),
        created_at: row
            .try_get::<Option<DateTime<Utc>>, _>("created_at")
            .ok()
            .flatten(),
        updated_at: row
            .try_get::<Option<DateTime<Utc>>, _>("updated_at")
            .ok()
            .flatten(),
        tenant_id: uuid::Uuid::nil(),
    };

    ApiResponse::success(factor, "获取危害因素详情成功")
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:hazard:admin"])),
    path = "/api/ehs/occupational-diseases/factors/{id}",
    request_body = UpdateHazardFactorRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_hazard_factor(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(_id): axum::extract::Path<String>,
    Json(_req): Json<UpdateHazardFactorRequest>,
) -> ApiResponse<HazardFactor> {
    tracing::warn!("Occupational disease module not yet enabled");
    ApiResponse::not_implemented("职业危害数据源尚未启用")
}

// gate: admin-only
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:hazard:admin"])),
    path = "/api/ehs/occupational-diseases/factors/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_hazard_factor(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(_id): axum::extract::Path<String>,
) -> ApiResponse<()> {
    tracing::warn!("Occupational disease module not yet enabled");
    ApiResponse::not_implemented("职业危害数据源尚未启用")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/occupational-diseases/detection-records",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_detection_records(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
) -> ApiResponse<Vec<DetectionRecord>> {
    tracing::warn!("Occupational disease module not yet enabled");
    ApiResponse::not_implemented("职业危害数据源尚未启用")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/occupational-diseases/detection-records",
    request_body = CreateDetectionRecordRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_detection_record(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(_req): Json<CreateDetectionRecordRequest>,
) -> ApiResponse<DetectionRecord> {
    tracing::warn!("Occupational disease module not yet enabled");
    ApiResponse::not_implemented("职业危害数据源尚未启用")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/occupational-diseases/detection-records/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_detection_record(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(_id): axum::extract::Path<String>,
) -> ApiResponse<DetectionRecord> {
    tracing::warn!("Occupational disease module not yet enabled");
    ApiResponse::not_implemented("职业危害数据源尚未启用")
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:delete"])),
    path = "/api/ehs/occupational-diseases/detection-records/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_detection_record(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(_id): axum::extract::Path<String>,
) -> ApiResponse<()> {
    tracing::warn!("Occupational disease module not yet enabled");
    ApiResponse::not_implemented("职业危害数据源尚未启用")
}

#[derive(Debug, Deserialize)]
pub struct DiseaseCaseQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub disease_type: Option<String>,
    pub severity: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:disease:read"])),
    path = "/api/ehs/occupational-diseases/cases",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_disease_cases(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Query(q): Query<DiseaseCaseQuery>,
) -> ApiResponse<Vec<DiseaseCase>> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.occupational.list_disease_cases",
        "ehs.qa_ehs_disease_cases",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open occupational disease scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    // 租户通道显式绑定 tenant_id；系统通道（超管跨租户）SQL 里显式不含任何 tenant_id 谓词。
    let query = match tenant_scope.tenant_id() {
        Some(tenant) => {
            let mut params: Vec<String> = Vec::new();
            let mut where_clause =
                String::from(" WHERE tenant_id = $1::uuid AND deleted_at IS NULL");
            if let Some(s) = &q.status {
                where_clause.push_str(&format!(" AND status = ${}", params.len() + 2));
                params.push(s.clone());
            }
            if let Some(d) = &q.disease_type {
                where_clause.push_str(&format!(" AND disease_type = ${}", params.len() + 2));
                params.push(d.clone());
            }
            if let Some(v) = &q.severity {
                where_clause.push_str(&format!(" AND severity = ${}", params.len() + 2));
                params.push(v.clone());
            }
            if let Some(search) = &q.search {
                where_clause.push_str(&format!(
                    " AND (employee_name ILIKE ${} OR employee_id ILIKE ${} OR case_no ILIKE ${})",
                    params.len() + 2,
                    params.len() + 3,
                    params.len() + 4
                ));
                let like = format!("%{search}%");
                params.push(like.clone());
                params.push(like.clone());
                params.push(like);
            }
            let sql = format!(
                r#"
                SELECT id::text AS id, case_no, employee_id, employee_name, gender, age,
                       department, position, disease_type, disease_name, hazard_factor,
                       diagnosed_at::text AS diagnosis_date, diagnosing_hospital AS diagnosis_hospital,
                       diagnosis_basis, work_related, severity, status, treatment_plan AS treatment,
                       compensation_status AS compensation, attachments,
                       reported_at AS reported_at, created_at AS created_at,
                       updated_at AS updated_at, tenant_id::text AS tenant_id
                FROM ehs.qa_ehs_disease_cases
                {where_clause}
                ORDER BY created_at DESC
                LIMIT {page_size} OFFSET {offset}
                "#
            );
            let mut q = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(tenant);
            for p in &params {
                q = q.bind(p);
            }
            q
        }
        None => {
            let mut params: Vec<String> = Vec::new();
            let mut where_clause = String::from(" WHERE deleted_at IS NULL");
            if let Some(s) = &q.status {
                where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
                params.push(s.clone());
            }
            if let Some(d) = &q.disease_type {
                where_clause.push_str(&format!(" AND disease_type = ${}", params.len() + 1));
                params.push(d.clone());
            }
            if let Some(v) = &q.severity {
                where_clause.push_str(&format!(" AND severity = ${}", params.len() + 1));
                params.push(v.clone());
            }
            if let Some(search) = &q.search {
                where_clause.push_str(&format!(
                    " AND (employee_name ILIKE ${} OR employee_id ILIKE ${} OR case_no ILIKE ${})",
                    params.len() + 1,
                    params.len() + 2,
                    params.len() + 3
                ));
                let like = format!("%{search}%");
                params.push(like.clone());
                params.push(like.clone());
                params.push(like);
            }
            let sql = format!(
                r#"
                SELECT id::text AS id, case_no, employee_id, employee_name, gender, age,
                       department, position, disease_type, disease_name, hazard_factor,
                       diagnosed_at::text AS diagnosis_date, diagnosing_hospital AS diagnosis_hospital,
                       diagnosis_basis, work_related, severity, status, treatment_plan AS treatment,
                       compensation_status AS compensation, attachments,
                       reported_at AS reported_at, created_at AS created_at,
                       updated_at AS updated_at, tenant_id::text AS tenant_id
                FROM ehs.qa_ehs_disease_cases
                {where_clause}
                ORDER BY created_at DESC
                LIMIT {page_size} OFFSET {offset}
                "#
            );
            let mut q = sqlx::query(sqlx::AssertSqlSafe(sql));
            for p in &params {
                q = q.bind(p);
            }
            q
        }
    };
    let rows = match query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list disease cases: {}", e);
            return ApiResponse::server_error("获取职业病案例列表失败");
        }
    };
    let list: Vec<DiseaseCase> = rows.iter().map(disease_case_from_row).collect();
    ApiResponse::success(list, "获取职业病案例列表成功")
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:disease:write"])),
    path = "/api/ehs/occupational-diseases/cases",
    request_body = CreateDiseaseCaseRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_disease_case(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateDiseaseCaseRequest>,
) -> ApiResponse<DiseaseCase> {
    let tenant = match crate::shared::permission::require_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let mut scope = match state.db.scope_for_tenant(tenant).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let tenant_id = tenant;
    let case_no = format!("DC-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let status = req
        .status
        .clone()
        .unwrap_or_else(|| "suspected".to_string());
    let attachments: serde_json::Value = req
        .attachments
        .clone()
        .map(|v| serde_json::to_value(v).unwrap_or_else(|_| serde_json::json!([])))
        .unwrap_or_else(|| serde_json::json!([]));
    let diagnosis_date = req
        .diagnosis_date
        .clone()
        .map(|d| d.split('T').next().unwrap_or(&d).to_string());
    let sql = r#"
        INSERT INTO ehs.qa_ehs_disease_cases
            (case_no, employee_id, employee_name, gender, age, department, position,
             disease_type, disease_name, hazard_factor, diagnosed_at, diagnosing_hospital,
             diagnosis_basis, work_related, severity, status, treatment_plan,
             compensation_status, attachments, reported_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::date, $12, $13, $14, $15, $16,
                $17, $18, $19, $20::timestamptz, $21)
        RETURNING id::text AS id, case_no, employee_id, employee_name, gender, age,
                  department, position, disease_type, disease_name, hazard_factor,
                  diagnosed_at::text AS diagnosis_date, diagnosing_hospital AS diagnosis_hospital,
                  diagnosis_basis, work_related, severity, status, treatment_plan AS treatment,
                  compensation_status AS compensation, attachments,
                  reported_at AS reported_at, created_at AS created_at,
                  updated_at AS updated_at, tenant_id::text AS tenant_id
    "#;
    let row = match sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(&case_no)
        .bind(&req.employee_id)
        .bind(&req.employee_name)
        .bind(&req.gender)
        .bind(req.age)
        .bind(&req.department)
        .bind(&req.position)
        .bind(&req.disease_type)
        .bind(&req.disease_name)
        .bind(&req.hazard_factor)
        .bind(&diagnosis_date)
        .bind(&req.diagnosis_hospital)
        .bind(&req.diagnosis_basis)
        .bind(req.work_related.unwrap_or(false))
        .bind(&req.severity)
        .bind(&status)
        .bind(&req.treatment)
        .bind(&req.compensation)
        .bind(attachments)
        .bind(&req.reported_at)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create disease case: {}", e);
            return ApiResponse::server_error("职业病案例创建失败");
        }
    };
    let record = disease_case_from_row(&row);
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(record, "职业病案例创建成功")
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:disease:read"])),
    path = "/api/ehs/occupational-diseases/cases/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_disease_case(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<DiseaseCase> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.occupational.get_disease_case",
        "ehs.qa_ehs_disease_cases",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open occupational disease scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let row = match tenant_scope.tenant_id() {
        Some(tenant) => {
            let sql = r#"
                SELECT id::text AS id, case_no, employee_id, employee_name, gender, age,
                       department, position, disease_type, disease_name, hazard_factor,
                       diagnosed_at::text AS diagnosis_date, diagnosing_hospital AS diagnosis_hospital,
                       diagnosis_basis, work_related, severity, status, treatment_plan AS treatment,
                       compensation_status AS compensation, attachments,
                       reported_at AS reported_at, created_at AS created_at,
                       updated_at AS updated_at, tenant_id::text AS tenant_id
                FROM ehs.qa_ehs_disease_cases
                WHERE id::text = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL
            "#;
            sqlx::query(sqlx::AssertSqlSafe(sql))
                .bind(&id)
                .bind(tenant)
                .fetch_optional(&mut scope)
                .await
        }
        // 系统通道（超管跨租户）：SQL 里显式不含任何 tenant_id 谓词。
        None => {
            let sql = r#"
                SELECT id::text AS id, case_no, employee_id, employee_name, gender, age,
                       department, position, disease_type, disease_name, hazard_factor,
                       diagnosed_at::text AS diagnosis_date, diagnosing_hospital AS diagnosis_hospital,
                       diagnosis_basis, work_related, severity, status, treatment_plan AS treatment,
                       compensation_status AS compensation, attachments,
                       reported_at AS reported_at, created_at AS created_at,
                       updated_at AS updated_at, tenant_id::text AS tenant_id
                FROM ehs.qa_ehs_disease_cases
                WHERE id::text = $1 AND deleted_at IS NULL
            "#;
            sqlx::query(sqlx::AssertSqlSafe(sql))
                .bind(&id)
                .fetch_optional(&mut scope)
                .await
        }
    };
    let row = match row {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("职业病案例不存在"),
        Err(e) => {
            tracing::error!("Failed to get disease case: {}", e);
            return ApiResponse::server_error("获取职业病案例详情失败");
        }
    };
    let record = disease_case_from_row(&row);
    ApiResponse::success(record, "获取职业病案例详情成功")
}
#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:disease:write"])),
    path = "/api/ehs/occupational-diseases/cases/{id}",
    request_body = UpdateDiseaseCaseRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_disease_case(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateDiseaseCaseRequest>,
) -> ApiResponse<DiseaseCase> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.occupational.update_disease_case",
        "ehs.qa_ehs_disease_cases",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to begin occupational disease txn: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();
    if let Some(v) = &req.employee_name {
        sets.push(format!("employee_name = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.gender {
        sets.push(format!("gender = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = req.age {
        sets.push(format!("age = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = &req.department {
        sets.push(format!("department = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.position {
        sets.push(format!("position = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.disease_type {
        sets.push(format!("disease_type = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.disease_name {
        sets.push(format!("disease_name = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.hazard_factor {
        sets.push(format!("hazard_factor = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.diagnosis_date {
        let d = v.split('T').next().unwrap_or(v).to_string();
        sets.push(format!("diagnosed_at = ${}", params.len() + 1));
        params.push(d);
    }
    if let Some(v) = &req.diagnosis_hospital {
        sets.push(format!("diagnosing_hospital = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.diagnosis_basis {
        sets.push(format!("diagnosis_basis = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = req.work_related {
        sets.push(format!("work_related = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = &req.severity {
        sets.push(format!("severity = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.status {
        sets.push(format!("status = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.treatment {
        sets.push(format!("treatment_plan = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.compensation {
        sets.push(format!("compensation_status = ${}", params.len() + 1));
        params.push(v.clone());
    }
    if let Some(v) = &req.attachments {
        sets.push(format!("attachments = ${}", params.len() + 1));
        params.push(serde_json::to_string(v).unwrap_or_else(|_| "[]".to_string()));
    }
    sets.push("updated_at = now()".to_string());
    let set_clause = sets.join(", ");
    let row = match tenant_scope.tenant_id() {
        // 租户通道：tenant_id = $N::uuid
        Some(tenant) => {
            let id_idx = params.len() + 1;
            let tenant_idx = params.len() + 2;
            let sql = format!(
                r#"
                UPDATE ehs.qa_ehs_disease_cases
                SET {set_clause}
                WHERE id::text = ${id_idx}
                  AND tenant_id = ${tenant_idx}::uuid
                  AND deleted_at IS NULL
                RETURNING id::text AS id, case_no, employee_id, employee_name, gender, age,
                          department, position, disease_type, disease_name, hazard_factor,
                          diagnosed_at::text AS diagnosis_date, diagnosing_hospital AS diagnosis_hospital,
                          diagnosis_basis, work_related, severity, status, treatment_plan AS treatment,
                          compensation_status AS compensation, attachments,
                          reported_at AS reported_at, created_at AS created_at,
                          updated_at AS updated_at, tenant_id::text AS tenant_id
                "#
            );
            let mut q = sqlx::query(sqlx::AssertSqlSafe(sql));
            for p in &params {
                q = q.bind(p);
            }
            q.bind(&id).bind(tenant).fetch_optional(&mut scope).await
        }
        // 系统通道（超管跨租户）：SQL 里显式不含任何 tenant_id 谓词。
        None => {
            let id_idx = params.len() + 1;
            let sql = format!(
                r#"
                UPDATE ehs.qa_ehs_disease_cases
                SET {set_clause}
                WHERE id::text = ${id_idx}
                  AND deleted_at IS NULL
                RETURNING id::text AS id, case_no, employee_id, employee_name, gender, age,
                          department, position, disease_type, disease_name, hazard_factor,
                          diagnosed_at::text AS diagnosis_date, diagnosing_hospital AS diagnosis_hospital,
                          diagnosis_basis, work_related, severity, status, treatment_plan AS treatment,
                          compensation_status AS compensation, attachments,
                          reported_at AS reported_at, created_at AS created_at,
                          updated_at AS updated_at, tenant_id::text AS tenant_id
                "#
            );
            let mut q = sqlx::query(sqlx::AssertSqlSafe(sql));
            for p in &params {
                q = q.bind(p);
            }
            q.bind(&id).fetch_optional(&mut scope).await
        }
    };
    let row = match row {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("职业病案例不存在"),
        Err(e) => {
            tracing::error!("Failed to update disease case: {}", e);
            return ApiResponse::server_error("职业病案例更新失败");
        }
    };
    let record = disease_case_from_row(&row);
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(record, "职业病案例更新成功")
}
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:disease:write"])),
    path = "/api/ehs/occupational-diseases/cases/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_disease_case(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<()> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.occupational.delete_disease_case",
        "ehs.qa_ehs_disease_cases",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to begin occupational disease txn: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let result = match tenant_scope.tenant_id() {
        Some(tenant) => {
            let sql = r#"
                UPDATE ehs.qa_ehs_disease_cases
                SET deleted_at = now()
                WHERE id::text = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL
            "#;
            sqlx::query(sqlx::AssertSqlSafe(sql))
                .bind(&id)
                .bind(tenant)
                .execute(&mut scope)
                .await
        }
        // 系统通道（超管跨租户）：SQL 里显式不含任何 tenant_id 谓词。
        None => {
            let sql = r#"
                UPDATE ehs.qa_ehs_disease_cases
                SET deleted_at = now()
                WHERE id::text = $1 AND deleted_at IS NULL
            "#;
            sqlx::query(sqlx::AssertSqlSafe(sql))
                .bind(&id)
                .execute(&mut scope)
                .await
        }
    };
    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete disease case: {}", e);
            return ApiResponse::server_error("职业病案例删除失败");
        }
    };
    if result.rows_affected() == 0 {
        return ApiResponse::not_found("职业病案例不存在");
    }
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success((), "职业病案例删除成功")
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/occupational-diseases/protection-measures",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_protection_measures(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
) -> ApiResponse<Vec<ProtectionMeasure>> {
    tracing::warn!("Occupational disease module not yet enabled");
    ApiResponse::not_implemented("职业危害数据源尚未启用")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/occupational-diseases/protection-measures",
    request_body = CreateProtectionMeasureRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_protection_measure(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(_req): Json<CreateProtectionMeasureRequest>,
) -> ApiResponse<ProtectionMeasure> {
    tracing::warn!("Occupational disease module not yet enabled");
    ApiResponse::not_implemented("职业危害数据源尚未启用")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/occupational-diseases/protection-measures/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_protection_measure(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(_id): axum::extract::Path<String>,
) -> ApiResponse<ProtectionMeasure> {
    tracing::warn!("Occupational disease module not yet enabled");
    ApiResponse::not_implemented("职业危害数据源尚未启用")
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:update"])),
    path = "/api/ehs/occupational-diseases/protection-measures/{id}",
    request_body = serde_json::Value,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_protection_measure(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(_id): axum::extract::Path<String>,
    Json(_req): Json<serde_json::Value>,
) -> ApiResponse<ProtectionMeasure> {
    tracing::warn!("Occupational disease module not yet enabled");
    ApiResponse::not_implemented("职业危害数据源尚未启用")
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:delete"])),
    path = "/api/ehs/occupational-diseases/protection-measures/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_protection_measure(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(_id): axum::extract::Path<String>,
) -> ApiResponse<()> {
    tracing::warn!("Occupational disease module not yet enabled");
    ApiResponse::not_implemented("职业危害数据源尚未启用")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:disease:read"])),
    path = "/api/ehs/occupational-disease/statistics",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn get_disease_statistics(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
) -> ApiResponse<DiseaseStatistics> {
    tracing::warn!("Occupational disease module not yet enabled");
    ApiResponse::not_implemented("职业危害数据源尚未启用")
}

pub async fn update_detection_record(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(_id): axum::extract::Path<String>,
    Json(_req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    tracing::warn!("Occupational disease module not yet enabled");
    ApiResponse::not_implemented("职业危害数据源尚未启用")
}

/// qa_ehs_disease_cases 行 → DiseaseCase（表列名 → 前端字段名）
fn disease_case_from_row(r: &sqlx::postgres::PgRow) -> DiseaseCase {
    let tenant_id: String = r.try_get("tenant_id").unwrap_or_default();
    let attachments: Option<serde_json::Value> = r.try_get("attachments").ok().flatten();
    let attachments = attachments.and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|e| e.as_str().map(|x| x.to_string()))
                .collect::<Vec<String>>()
        })
    });
    DiseaseCase {
        id: r.try_get("id").unwrap_or_default(),
        case_no: r.try_get("case_no").unwrap_or_default(),
        employee_id: r.try_get("employee_id").unwrap_or_default(),
        employee_name: r.try_get("employee_name").unwrap_or_default(),
        gender: r.try_get("gender").ok().flatten(),
        age: r.try_get("age").ok().flatten(),
        department: r.try_get("department").ok().flatten(),
        position: r.try_get("position").ok().flatten(),
        disease_type: r.try_get("disease_type").unwrap_or_default(),
        disease_name: r.try_get("disease_name").unwrap_or_default(),
        hazard_factor: r.try_get("hazard_factor").ok().flatten(),
        diagnosis_date: r.try_get("diagnosis_date").ok().flatten(),
        diagnosis_hospital: r.try_get("diagnosis_hospital").ok().flatten(),
        diagnosis_basis: r.try_get("diagnosis_basis").ok().flatten(),
        work_related: r.try_get("work_related").unwrap_or(false),
        severity: r.try_get("severity").ok().flatten(),
        status: r
            .try_get("status")
            .unwrap_or_else(|_| "suspected".to_string()),
        treatment: r.try_get("treatment").ok().flatten(),
        compensation: r.try_get("compensation").ok().flatten(),
        attachments,
        reported_at: r.try_get("reported_at").ok().flatten(),
        created_at: r.try_get::<DateTime<Utc>, _>("created_at").ok(),
        updated_at: r.try_get::<DateTime<Utc>, _>("updated_at").ok(),
        tenant_id: Uuid::parse_str(&tenant_id).unwrap_or_default(),
    }
}
