use axum::{extract::Extension, extract::Path, extract::Query, extract::State, Json};
use chrono::{NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{
    types::{BigDecimal, Uuid},
    Row,
};
use std::str::FromStr;
use topems_shared::auth::Claims;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared::response::ApiResponse;

use super::{big_decimal_to_f64, datetime_to_string};

#[derive(Debug, Clone, Deserialize)]
pub struct ListInspectionsQuery {
    page: Option<i32>,
    pagesize: Option<i32>,
    search: Option<String>,
    status: Option<String>,
    inspection_type: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateInspectionRequest {
    pub order_id: Option<String>,
    pub order_number: Option<String>,
    pub product_code: String,
    pub product_name: String,
    pub process_id: Option<String>,
    pub process_name: Option<String>,
    pub inspection_type: String,
    pub quantity: f64,
    pub qualified_quantity: Option<f64>,
    pub unqualified_quantity: Option<f64>,
    pub inspector: Option<String>,
    pub inspection_time: Option<String>,
    pub status: Option<String>,
    pub result: Option<String>,
    pub memo: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateInspectionRequest {
    pub qualified_quantity: Option<f64>,
    pub unqualified_quantity: Option<f64>,
    pub inspector: Option<String>,
    pub inspection_time: Option<String>,
    pub status: Option<String>,
    pub result: Option<String>,
    pub memo: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct InspectionResponse {
    pub id: String,
    pub inspection_no: String,
    pub order_id: Option<String>,
    pub order_number: Option<String>,
    pub product_code: String,
    pub product_name: String,
    pub process_id: Option<String>,
    pub process_name: Option<String>,
    pub inspection_type: String,
    pub quantity: f64,
    pub qualified_quantity: f64,
    pub unqualified_quantity: f64,
    pub qualification_rate: f64,
    pub inspector: Option<String>,
    pub inspection_time: String,
    pub status: String,
    pub result: Option<String>,
    pub memo: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub async fn list_inspections(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListInspectionsQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let pagesize = query.pagesize.unwrap_or(10) as i64;
    let offset = (page - 1) * pagesize;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    if let Some(status) = query.status {
        where_clause.push_str(" WHERE qi.status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(inspection_type) = query.inspection_type {
        let idx = params.len() + 1;
        if where_clause.is_empty() {
            where_clause.push_str(&format!(" WHERE qi.inspection_type = ${}", idx));
        } else {
            where_clause.push_str(&format!(" AND qi.inspection_type = ${}", idx));
        }
        params.push(serde_json::Value::String(inspection_type));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        let idx = params.len() + 1;
        if where_clause.is_empty() {
            where_clause.push_str(&format!(
                " WHERE (qi.inspection_no ILIKE ${} OR qi.product_code ILIKE ${} OR qi.product_name ILIKE ${})",
                idx, idx, idx
            ));
        } else {
            where_clause.push_str(&format!(
                " AND (qi.inspection_no ILIKE ${} OR qi.product_code ILIKE ${} OR qi.product_name ILIKE ${})",
                idx, idx, idx
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM quality_inspections qi{}",
        where_clause
    );
    let mut count_query = sqlx::query_scalar(&count_sql);
    for p in &params {
        count_query = count_query.bind(p.clone());
    }
    let count_result = count_query.fetch_one(&state.pool).await;
    let total: Option<i64> = match count_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count quality inspections: {}", e);
            return Json(ApiResponse::error(500, "获取检验记录列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT
            qi.id, qi.inspection_no, qi.order_id, qi.order_number,
            qi.product_code, qi.product_name, qi.process_id, qi.process_name,
            qi.inspection_type, qi.quantity, qi.qualified_quantity,
            qi.unqualified_quantity, qi.qualification_rate,
            qi.inspector, qi.inspection_time, qi.status, qi.result, qi.memo,
            qi.created_at, qi.updated_at
        FROM quality_inspections qi
        {}
        ORDER BY qi.created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        params.len() + 1,
        params.len() + 2
    );
    let mut fetch_query = sqlx::query(&fetch_sql);
    for p in &params {
        fetch_query = fetch_query.bind(p.clone());
    }
    fetch_query = fetch_query.bind(pagesize).bind(offset);

    let rows = match fetch_query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch quality inspections: {}", e);
            return Json(ApiResponse::error(500, "获取检验记录列表失败"));
        }
    };

    let inspections: Vec<InspectionResponse> = rows
        .into_iter()
        .map(|r| InspectionResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
            inspection_no: r.try_get::<String, _>("inspection_no").unwrap_or_default(),
            order_id: r
                .try_get::<Option<Uuid>, _>("order_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            order_number: r
                .try_get::<Option<String>, _>("order_number")
                .ok()
                .flatten(),
            product_code: r.try_get::<String, _>("product_code").unwrap_or_default(),
            product_name: r.try_get::<String, _>("product_name").unwrap_or_default(),
            process_id: r
                .try_get::<Option<Uuid>, _>("process_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            process_name: r
                .try_get::<Option<String>, _>("process_name")
                .ok()
                .flatten(),
            inspection_type: r
                .try_get::<String, _>("inspection_type")
                .unwrap_or_default(),
            quantity: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("quantity")
                    .ok()
                    .flatten(),
            ),
            qualified_quantity: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("qualified_quantity")
                    .ok()
                    .flatten(),
            ),
            unqualified_quantity: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("unqualified_quantity")
                    .ok()
                    .flatten(),
            ),
            qualification_rate: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("qualification_rate")
                    .ok()
                    .flatten(),
            ),
            inspector: r.try_get::<Option<String>, _>("inspector").ok().flatten(),
            inspection_time: r
                .try_get::<Option<String>, _>("inspection_time")
                .ok()
                .flatten()
                .unwrap_or_default(),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "pending".to_string()),
            result: r.try_get::<Option<String>, _>("result").ok().flatten(),
            memo: r.try_get::<Option<String>, _>("memo").ok().flatten(),
            created_at: datetime_to_string(
                r.try_get::<Option<NaiveDateTime>, _>("created_at")
                    .ok()
                    .flatten(),
            ),
            updated_at: datetime_to_string(
                r.try_get::<Option<NaiveDateTime>, _>("updated_at")
                    .ok()
                    .flatten(),
            ),
        })
        .collect();

    Json(ApiResponse::success(
        serde_json::json!({
            "inspections": inspections,
            "total": total.unwrap_or(0),
            "page": page,
            "pagesize": pagesize,
        }),
        "获取检验记录列表成功",
    ))
}

pub async fn get_inspection(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<InspectionResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的检验记录ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        SELECT
            qi.id, qi.inspection_no, qi.order_id, qi.order_number,
            qi.product_code, qi.product_name, qi.process_id, qi.process_name,
            qi.inspection_type, qi.quantity, qi.qualified_quantity,
            qi.unqualified_quantity, qi.qualification_rate,
            qi.inspector, qi.inspection_time, qi.status, qi.result, qi.memo,
            qi.created_at, qi.updated_at
        FROM quality_inspections qi
        WHERE qi.id = $1
        "#,
        uuid,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            InspectionResponse {
                id: r.id.to_string(),
                inspection_no: r.inspection_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_number: r.order_number,
                product_code: r.product_code,
                product_name: r.product_name,
                process_id: r.process_id.map(|u| u.to_string()),
                process_name: r.process_name,
                inspection_type: r.inspection_type,
                quantity: big_decimal_to_f64(Some(r.quantity)),
                qualified_quantity: big_decimal_to_f64(Some(r.qualified_quantity)),
                unqualified_quantity: big_decimal_to_f64(Some(r.unqualified_quantity)),
                qualification_rate: big_decimal_to_f64(r.qualification_rate),
                inspector: r.inspector,
                inspection_time: r.inspection_time.map(|t| t.to_string()).unwrap_or_default(),
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                result: r.result,
                memo: r.memo,
                created_at: datetime_to_string(r.created_at),
                updated_at: datetime_to_string(r.updated_at),
            },
            "获取检验记录成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "检验记录不存在")),
        Err(e) => {
            tracing::error!("Failed to get quality inspection: {}", e);
            Json(ApiResponse::error(500, "获取检验记录失败"))
        }
    }
}

pub async fn create_inspection(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreateInspectionRequest>,
) -> Json<ApiResponse<InspectionResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let now = Utc::now();
    let inspection_no = format!(
        "QI{}{:04}",
        now.format("%Y%m%d"),
        rand::random::<u16>() % 10000
    );

    let order_id = body
        .order_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());
    let process_id = body
        .process_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());
    let quantity = BigDecimal::from_str(&body.quantity.to_string()).unwrap_or_default();
    let qualified_quantity = body
        .qualified_quantity
        .and_then(|v| BigDecimal::from_str(&v.to_string()).ok());
    let unqualified_quantity = body
        .unqualified_quantity
        .and_then(|v| BigDecimal::from_str(&v.to_string()).ok());
    let result = sqlx::query_unchecked!(
        r#"
            INSERT INTO quality_inspections (
            inspection_no, order_id, order_number, product_code, product_name,
            process_id, process_name, inspection_type, quantity,
            qualified_quantity, unqualified_quantity, qualification_rate,
            inspector, inspection_time, status, result, memo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING
            id, inspection_no, order_id, order_number,
            product_code, product_name, process_id, process_name,
            inspection_type, quantity, qualified_quantity,
            unqualified_quantity, qualification_rate,
            inspector, inspection_time, status, result, memo,
            created_at, updated_at
        "#,
        inspection_no,
        order_id,
        body.order_number,
        body.product_code,
        body.product_name,
        process_id,
        body.process_name,
        body.inspection_type,
        quantity,
        qualified_quantity,
        unqualified_quantity,
        BigDecimal::from_str("0").unwrap_or_default(),
        body.inspector,
        body.inspection_time.as_ref().and_then(|s| {
            NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S")
                .ok()
                .or_else(|| {
                    chrono::DateTime::parse_from_rfc3339(s)
                        .ok()
                        .map(|dt| dt.with_timezone(&Utc).naive_utc())
                })
                .or_else(|| {
                    chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d")
                        .ok()
                        .map(|d| d.and_hms_opt(0, 0, 0).unwrap())
                })
        }),
        body.status.unwrap_or_else(|| "pending".to_string()),
        body.result,
        body.memo,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            InspectionResponse {
                id: r.id.to_string(),
                inspection_no: r.inspection_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_number: r.order_number,
                product_code: r.product_code,
                product_name: r.product_name,
                process_id: r.process_id.map(|u| u.to_string()),
                process_name: r.process_name,
                inspection_type: r.inspection_type,
                quantity: big_decimal_to_f64(Some(r.quantity)),
                qualified_quantity: big_decimal_to_f64(Some(r.qualified_quantity)),
                unqualified_quantity: big_decimal_to_f64(Some(r.unqualified_quantity)),
                qualification_rate: big_decimal_to_f64(r.qualification_rate),
                inspector: r.inspector,
                inspection_time: r.inspection_time.map(|t| t.to_string()).unwrap_or_default(),
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                result: r.result,
                memo: r.memo,
                created_at: datetime_to_string(r.created_at),
                updated_at: datetime_to_string(r.updated_at),
            },
            "创建检验记录成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create quality inspection: {}", e);
            Json(ApiResponse::error(500, "创建检验记录失败"))
        }
    }
}

pub async fn update_inspection(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<UpdateInspectionRequest>,
) -> Json<ApiResponse<InspectionResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的检验记录ID"));
        }
    };

    let qualified_quantity = body
        .qualified_quantity
        .and_then(|v| BigDecimal::from_str(&v.to_string()).ok());
    let unqualified_quantity = body
        .unqualified_quantity
        .and_then(|v| BigDecimal::from_str(&v.to_string()).ok());
    let result = sqlx::query_unchecked!(
        r#"
            UPDATE quality_inspections
        SET
            qualified_quantity = COALESCE($1, qualified_quantity),
            unqualified_quantity = COALESCE($2, unqualified_quantity),
            qualification_rate = CASE
                WHEN quantity > 0 THEN (COALESCE($1, qualified_quantity) / quantity * 100)
                ELSE 0
            END,
            inspector = COALESCE($3, inspector),
            inspection_time = COALESCE($4, inspection_time),
            status = COALESCE($5, status),
            result = COALESCE($6, result),
            memo = COALESCE($7, memo),
            updated_at = NOW()
        WHERE id = $8
        RETURNING
            id, inspection_no, order_id, order_number,
            product_code, product_name, process_id, process_name,
            inspection_type, quantity, qualified_quantity,
            unqualified_quantity, qualification_rate,
            inspector, inspection_time, status, result, memo,
            created_at, updated_at
        "#,
        qualified_quantity,
        unqualified_quantity,
        body.inspector,
        body.inspection_time.as_ref().and_then(|s| {
            NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S")
                .ok()
                .or_else(|| {
                    chrono::DateTime::parse_from_rfc3339(s)
                        .ok()
                        .map(|dt| dt.with_timezone(&Utc).naive_utc())
                })
                .or_else(|| {
                    chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d")
                        .ok()
                        .map(|d| d.and_hms_opt(0, 0, 0).unwrap())
                })
        }),
        body.status,
        body.result,
        body.memo,
        uuid,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            InspectionResponse {
                id: r.id.to_string(),
                inspection_no: r.inspection_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_number: r.order_number,
                product_code: r.product_code,
                product_name: r.product_name,
                process_id: r.process_id.map(|u| u.to_string()),
                process_name: r.process_name,
                inspection_type: r.inspection_type,
                quantity: big_decimal_to_f64(Some(r.quantity)),
                qualified_quantity: big_decimal_to_f64(Some(r.qualified_quantity)),
                unqualified_quantity: big_decimal_to_f64(Some(r.unqualified_quantity)),
                qualification_rate: big_decimal_to_f64(r.qualification_rate),
                inspector: r.inspector,
                inspection_time: r.inspection_time.map(|t| t.to_string()).unwrap_or_default(),
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                result: r.result,
                memo: r.memo,
                created_at: datetime_to_string(r.created_at),
                updated_at: datetime_to_string(r.updated_at),
            },
            "更新检验记录成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "检验记录不存在")),
        Err(e) => {
            tracing::error!("Failed to update quality inspection: {}", e);
            Json(ApiResponse::error(500, "更新检验记录失败"))
        }
    }
}

pub async fn delete_inspection(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<String>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的检验记录ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        DELETE FROM quality_inspections WHERE id = $1
        "#,
        uuid,
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(id, "删除检验记录成功")),
        Err(e) => {
            tracing::error!("Failed to delete quality inspection: {}", e);
            Json(ApiResponse::error(500, "删除检验记录失败"))
        }
    }
}
