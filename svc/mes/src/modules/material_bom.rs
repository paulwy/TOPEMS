//! Material BOM handlers

use axum::{
    extract::Extension, extract::Path, extract::Query, extract::State, routing::get, Json, Router,
};
use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};
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

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/mes/boms",
            get(list_material_boms).post(create_material_bom),
        )
        .route(
            "/api/mes/boms/{id}",
            get(get_material_bom)
                .put(update_material_bom)
                .delete(delete_material_bom),
        )
        .route(
            "/api/mes/material-issues",
            get(list_material_issues).post(create_material_issue),
        )
        .route(
            "/api/mes/material-issues/{id}",
            get(get_material_issue)
                .put(update_material_issue)
                .delete(delete_material_issue),
        )
        .route(
            "/api/mes/material-returns",
            get(list_material_returns).post(create_material_return),
        )
        .route(
            "/api/mes/material-returns/{id}",
            get(get_material_return)
                .put(update_material_return)
                .delete(delete_material_return),
        )
}

// ==================== Data Types ====================

#[derive(Debug, Clone, Deserialize)]
pub struct ListMaterialBomsQuery {
    page: Option<i32>,
    pagesize: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ListMaterialIssuesQuery {
    page: Option<i32>,
    pagesize: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ListMaterialReturnsQuery {
    page: Option<i32>,
    pagesize: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MaterialBomResponse {
    pub id: String,
    pub bom_no: String,
    pub product_id: Option<String>,
    pub product_name: String,
    pub product_code: String,
    pub version: String,
    pub status: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct BomItemResponse {
    pub id: String,
    pub bom_id: String,
    pub material_id: Option<String>,
    pub material_code: String,
    pub material_name: String,
    pub specification: Option<String>,
    pub unit: String,
    pub quantity: f64,
    pub loss_rate: f64,
    pub sequence: i32,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BomDetailResponse {
    pub bom: MaterialBomResponse,
    pub items: Vec<BomItemResponse>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ListMaterialBomsResponse {
    pub boms: Vec<MaterialBomResponse>,
    pub total: i64,
    pub page: i64,
    pub pagesize: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct MaterialIssueResponse {
    pub id: String,
    pub issue_no: String,
    pub order_id: Option<String>,
    pub order_no: Option<String>,
    pub bom_id: Option<String>,
    pub status: String,
    pub warehouse_id: Option<String>,
    pub operator_id: Option<String>,
    pub issue_time: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ListMaterialIssuesResponse {
    pub issues: Vec<MaterialIssueResponse>,
    pub total: i64,
    pub page: i64,
    pub pagesize: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct MaterialIssueItemResponse {
    pub id: String,
    pub issue_id: String,
    pub material_id: Option<String>,
    pub material_code: String,
    pub material_name: String,
    pub unit: String,
    pub planned_quantity: f64,
    pub actual_quantity: f64,
    pub batch_no: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MaterialReturnResponse {
    pub id: String,
    pub return_no: String,
    pub order_id: Option<String>,
    pub order_no: Option<String>,
    pub status: String,
    pub warehouse_id: Option<String>,
    pub operator_id: Option<String>,
    pub return_time: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ListMaterialReturnsResponse {
    pub returns: Vec<MaterialReturnResponse>,
    pub total: i64,
    pub page: i64,
    pub pagesize: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateMaterialBomRequest {
    pub product_id: Option<Uuid>,
    pub product_name: String,
    pub product_code: String,
    pub version: Option<String>,
    pub description: Option<String>,
    pub items: Vec<CreateBomItemRequest>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateBomItemRequest {
    pub material_id: Option<Uuid>,
    pub material_code: String,
    pub material_name: String,
    pub specification: Option<String>,
    pub unit: String,
    pub quantity: f64,
    pub loss_rate: Option<f64>,
    pub sequence: Option<i32>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateMaterialBomRequest {
    pub version: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
    pub items: Option<Vec<CreateBomItemRequest>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateMaterialIssueRequest {
    pub order_id: Option<Uuid>,
    pub bom_id: Option<Uuid>,
    pub warehouse_id: Option<Uuid>,
    pub operator_id: Option<Uuid>,
    pub notes: Option<String>,
    pub items: Vec<CreateIssueItemRequest>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateIssueItemRequest {
    pub material_id: Option<Uuid>,
    pub material_code: String,
    pub material_name: String,
    pub unit: String,
    pub planned_quantity: f64,
    pub actual_quantity: f64,
    pub batch_no: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateMaterialReturnRequest {
    pub order_id: Option<Uuid>,
    pub warehouse_id: Option<Uuid>,
    pub operator_id: Option<Uuid>,
    pub notes: Option<String>,
    pub items: Vec<CreateReturnItemRequest>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateMaterialIssueRequest {
    pub status: Option<String>,
    pub warehouse_id: Option<Uuid>,
    pub operator_id: Option<Uuid>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateMaterialReturnRequest {
    pub status: Option<String>,
    pub warehouse_id: Option<Uuid>,
    pub operator_id: Option<Uuid>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateReturnItemRequest {
    pub material_id: Option<Uuid>,
    pub material_code: String,
    pub material_name: String,
    pub unit: String,
    pub quantity: f64,
    pub reason: Option<String>,
    pub batch_no: Option<String>,
    pub notes: Option<String>,
}

fn naive_to_utc(dt: Option<NaiveDateTime>) -> DateTime<Utc> {
    dt.map(|d| Utc.from_utc_datetime(&d))
        .unwrap_or_else(Utc::now)
}

fn opt_naive_to_utc(dt: Option<NaiveDateTime>) -> Option<DateTime<Utc>> {
    dt.map(|d| Utc.from_utc_datetime(&d))
}

fn datetime_to_string(dt: Option<NaiveDateTime>) -> String {
    naive_to_utc(dt).to_rfc3339()
}

fn opt_datetime_to_string(dt: Option<NaiveDateTime>) -> Option<String> {
    opt_naive_to_utc(dt).map(|d| d.to_rfc3339())
}

fn big_decimal_to_f64(bd: Option<BigDecimal>) -> f64 {
    bd.and_then(|d| d.to_string().parse::<f64>().ok())
        .unwrap_or(0.0)
}

// ==================== Material BOM Handlers ====================

pub async fn list_material_boms(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListMaterialBomsQuery>,
) -> Json<ApiResponse<ListMaterialBomsResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MaterialBomRead).await
    {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let pagesize = query.pagesize.unwrap_or(10) as i64;
    let offset = (page - 1) * pagesize;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    if let Some(status) = query.status {
        where_clause.push_str(" WHERE status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(
                " WHERE (bom_no ILIKE $1 OR product_name ILIKE $1 OR product_code ILIKE $1)",
            );
        } else {
            where_clause.push_str(&format!(
                " AND (bom_no ILIKE ${} OR product_name ILIKE ${} OR product_code ILIKE ${})",
                params.len() + 1,
                params.len() + 1,
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM material_boms{}",
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
            tracing::error!("Failed to count material BOMs: {}", e);
            return Json(ApiResponse::error(500, "获取物料BOM列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            id, bom_no, product_id, product_name, product_code,
            version, status, description, created_at, updated_at
        FROM material_boms
        {}
        ORDER BY created_at DESC
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

    let boms = match fetch_query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch material BOMs: {}", e);
            return Json(ApiResponse::error(500, "获取物料BOM列表失败"));
        }
    };

    let boms_list: Vec<MaterialBomResponse> = boms
        .into_iter()
        .map(|r| MaterialBomResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
            bom_no: r.try_get::<String, _>("bom_no").unwrap_or_default(),
            product_id: r
                .try_get::<Option<Uuid>, _>("product_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            product_name: r.try_get::<String, _>("product_name").unwrap_or_default(),
            product_code: r.try_get::<String, _>("product_code").unwrap_or_default(),
            version: r
                .try_get::<Option<String>, _>("version")
                .ok()
                .flatten()
                .unwrap_or_else(|| "1.0".to_string()),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "draft".to_string()),
            description: r.try_get::<Option<String>, _>("description").ok().flatten(),
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
        ListMaterialBomsResponse {
            boms: boms_list,
            total: total.unwrap_or(0),
            page,
            pagesize,
        },
        "获取物料BOM列表成功",
    ))
}

pub async fn create_material_bom(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateMaterialBomRequest>,
) -> Json<ApiResponse<BomDetailResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MaterialBomWrite).await
    {
        return e;
    }

    let now = Utc::now();
    let bom_no = format!(
        "BOM{}{:04}",
        now.format("%Y%m%d"),
        rand::random::<u16>() % 10000
    );

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin transaction: {}", e);
            return Json(ApiResponse::error(500, "创建物料BOM失败"));
        }
    };

    let bom_result = sqlx::query!(
        r#"
        INSERT INTO material_boms (
            bom_no, product_id, product_name, product_code,
            version, status, description, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $7)
        RETURNING 
            id, bom_no, product_id, product_name, product_code,
            version, status, description, created_at, updated_at
        "#,
        bom_no,
        req.product_id,
        req.product_name,
        req.product_code,
        req.version.unwrap_or_else(|| "1.0".to_string()),
        req.description,
        now.naive_utc(),
    )
    .fetch_one(&mut *tx)
    .await;

    let bom = match bom_result {
        Ok(b) => b,
        Err(e) => {
            tracing::error!("Failed to create material BOM: {}", e);
            let _ = tx.rollback().await;
            return Json(ApiResponse::error(500, "创建物料BOM失败"));
        }
    };

    let mut item_responses = Vec::new();
    for (idx, item) in req.items.iter().enumerate() {
        let item_result = sqlx::query!(
            r#"
            INSERT INTO bom_items (
                bom_id, material_id, material_code, material_name,
                specification, unit, quantity, loss_rate, sequence, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING 
                id, bom_id, material_id, material_code, material_name,
                specification, unit, quantity, loss_rate, sequence, notes
            "#,
            bom.id,
            item.material_id,
            item.material_code.clone(),
            item.material_name.clone(),
            item.specification.clone(),
            item.unit.clone(),
            BigDecimal::from_str(&item.quantity.to_string()).unwrap_or_default(),
            BigDecimal::from_str(&item.loss_rate.unwrap_or(0.0).to_string()).unwrap_or_default(),
            item.sequence.unwrap_or(idx as i32),
            item.notes.clone(),
        )
        .fetch_one(&mut *tx)
        .await;

        match item_result {
            Ok(i) => {
                item_responses.push(BomItemResponse {
                    id: i.id.to_string(),
                    bom_id: i.bom_id.to_string(),
                    material_id: i.material_id.map(|u| u.to_string()),
                    material_code: i.material_code,
                    material_name: i.material_name,
                    specification: i.specification,
                    unit: i.unit,
                    quantity: big_decimal_to_f64(Some(i.quantity)),
                    loss_rate: big_decimal_to_f64(i.loss_rate),
                    sequence: i.sequence.unwrap_or(0),
                    notes: i.notes,
                });
            }
            Err(e) => {
                tracing::error!("Failed to create BOM item: {}", e);
                let _ = tx.rollback().await;
                return Json(ApiResponse::error(500, "创建BOM明细失败"));
            }
        }
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return Json(ApiResponse::error(500, "创建物料BOM失败"));
    }

    let bom_response = MaterialBomResponse {
        id: bom.id.to_string(),
        bom_no: bom.bom_no,
        product_id: bom.product_id.map(|u| u.to_string()),
        product_name: bom.product_name,
        product_code: bom.product_code,
        version: bom.version.unwrap_or_else(|| "1.0".to_string()),
        status: bom.status.unwrap_or_else(|| "draft".to_string()),
        description: bom.description,
        created_at: datetime_to_string(bom.created_at),
        updated_at: datetime_to_string(bom.updated_at),
    };

    Json(ApiResponse::success(
        BomDetailResponse {
            bom: bom_response,
            items: item_responses,
        },
        "物料BOM创建成功",
    ))
}

pub async fn get_material_bom(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<BomDetailResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MaterialBomRead).await
    {
        return e;
    }

    let bom_result = sqlx::query!(
        r#"
        SELECT 
            id, bom_no, product_id, product_name, product_code,
            version, status, description, created_at, updated_at
        FROM material_boms
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    let bom = match bom_result {
        Ok(Some(b)) => b,
        Ok(None) => return Json(ApiResponse::error(404, "物料BOM不存在")),
        Err(e) => {
            tracing::error!("Failed to fetch material BOM: {}", e);
            return Json(ApiResponse::error(500, "获取物料BOM失败"));
        }
    };

    let items_result = sqlx::query!(
        r#"
        SELECT 
            id, bom_id, material_id, material_code, material_name,
            specification, unit, quantity, loss_rate, sequence, notes
        FROM bom_items
        WHERE bom_id = $1
        ORDER BY sequence ASC
        "#,
        id,
    )
    .fetch_all(&state.pool)
    .await;

    let items = match items_result {
        Ok(i) => i,
        Err(e) => {
            tracing::error!("Failed to fetch BOM items: {}", e);
            return Json(ApiResponse::error(500, "获取BOM明细失败"));
        }
    };

    let bom_response = MaterialBomResponse {
        id: bom.id.to_string(),
        bom_no: bom.bom_no,
        product_id: bom.product_id.map(|u| u.to_string()),
        product_name: bom.product_name,
        product_code: bom.product_code,
        version: bom.version.unwrap_or_else(|| "1.0".to_string()),
        status: bom.status.unwrap_or_else(|| "draft".to_string()),
        description: bom.description,
        created_at: datetime_to_string(bom.created_at),
        updated_at: datetime_to_string(bom.updated_at),
    };

    let item_responses: Vec<BomItemResponse> = items
        .into_iter()
        .map(|i| BomItemResponse {
            id: i.id.to_string(),
            bom_id: i.bom_id.to_string(),
            material_id: i.material_id.map(|u| u.to_string()),
            material_code: i.material_code,
            material_name: i.material_name,
            specification: i.specification,
            unit: i.unit,
            quantity: big_decimal_to_f64(Some(i.quantity)),
            loss_rate: big_decimal_to_f64(i.loss_rate),
            sequence: i.sequence.unwrap_or(0),
            notes: i.notes,
        })
        .collect();

    Json(ApiResponse::success(
        BomDetailResponse {
            bom: bom_response,
            items: item_responses,
        },
        "获取物料BOM成功",
    ))
}

pub async fn update_material_bom(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateMaterialBomRequest>,
) -> Json<ApiResponse<BomDetailResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MaterialBomWrite).await
    {
        return e;
    }

    let now = Utc::now().naive_utc();

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin transaction: {}", e);
            return Json(ApiResponse::error(500, "更新物料BOM失败"));
        }
    };

    let bom_result = sqlx::query!(
        r#"
        UPDATE material_boms SET
            version = COALESCE($2, version),
            status = COALESCE($3, status),
            description = COALESCE($4, description),
            updated_at = $5
        WHERE id = $1
        RETURNING 
            id, bom_no, product_id, product_name, product_code,
            version, status, description, created_at, updated_at
        "#,
        id,
        req.version,
        req.status,
        req.description,
        now,
    )
    .fetch_optional(&mut *tx)
    .await;

    let _bom = match bom_result {
        Ok(Some(b)) => b,
        Ok(None) => {
            let _ = tx.rollback().await;
            return Json(ApiResponse::error(404, "物料BOM不存在"));
        }
        Err(e) => {
            tracing::error!("Failed to update material BOM: {}", e);
            let _ = tx.rollback().await;
            return Json(ApiResponse::error(500, "更新物料BOM失败"));
        }
    };

    if let Some(items) = req.items {
        let _ = sqlx::query!("DELETE FROM bom_items WHERE bom_id = $1", id)
            .execute(&mut *tx)
            .await;

        for (idx, item) in items.iter().enumerate() {
            let _ = sqlx::query!(
                r#"
                INSERT INTO bom_items (
                    bom_id, material_id, material_code, material_name,
                    specification, unit, quantity, loss_rate, sequence, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                "#,
                id,
                item.material_id,
                item.material_code.clone(),
                item.material_name.clone(),
                item.specification.clone(),
                item.unit.clone(),
                BigDecimal::from_str(&item.quantity.to_string()).unwrap_or_default(),
                BigDecimal::from_str(&item.loss_rate.unwrap_or(0.0).to_string())
                    .unwrap_or_default(),
                item.sequence.unwrap_or(idx as i32),
                item.notes.clone(),
            )
            .execute(&mut *tx)
            .await;
        }
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return Json(ApiResponse::error(500, "更新物料BOM失败"));
    }

    get_material_bom(
        State(AppState {
            auth_state: state.auth_state.clone(),
            pool: state.pool.clone(),
            health_config: state.health_config.clone(),
        }),
        Extension(claims),
        Path(id),
    )
    .await
}

pub async fn delete_material_bom(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MaterialBomWrite).await
    {
        return e;
    }

    let result = sqlx::query!(
        r#"
        DELETE FROM material_boms
        WHERE id = $1 AND status = 'draft'
        "#,
        id,
    )
    .execute(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete material BOM: {}", e);
            return Json(ApiResponse::error(500, "删除物料BOM失败"));
        }
    };

    if result.rows_affected() > 0 {
        Json(ApiResponse::success("".to_string(), "物料BOM删除成功"))
    } else {
        Json(ApiResponse::error(404, "物料BOM不存在或状态不允许删除"))
    }
}

// ==================== Material Issue Handlers ====================

pub async fn create_material_issue(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateMaterialIssueRequest>,
) -> Json<ApiResponse<MaterialIssueResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MaterialBomIssue).await
    {
        return e;
    }

    let now = Utc::now();
    let issue_no = format!(
        "MI{}{:04}",
        now.format("%Y%m%d"),
        rand::random::<u16>() % 10000
    );

    let order_no = if let Some(order_id) = req.order_id {
        let order = sqlx::query!(
            r#"SELECT order_no FROM production_orders WHERE id = $1"#,
            order_id
        )
        .fetch_optional(&state.pool)
        .await
        .ok()
        .flatten();
        order.map(|o| o.order_no)
    } else {
        None
    };

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin transaction: {}", e);
            return Json(ApiResponse::error(500, "创建物料领用单失败"));
        }
    };

    let issue_result = sqlx::query!(
        r#"
        INSERT INTO material_issues (
            issue_no, order_id, order_no, bom_id, status,
            warehouse_id, operator_id, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $8)
        RETURNING 
            id, issue_no, order_id, order_no, bom_id, status,
            warehouse_id, operator_id, issue_time, notes,
            created_at, updated_at
        "#,
        issue_no,
        req.order_id,
        order_no,
        req.bom_id,
        req.warehouse_id,
        req.operator_id,
        req.notes,
        now.naive_utc(),
    )
    .fetch_one(&mut *tx)
    .await;

    let issue = match issue_result {
        Ok(i) => i,
        Err(e) => {
            tracing::error!("Failed to create material issue: {}", e);
            let _ = tx.rollback().await;
            return Json(ApiResponse::error(500, "创建物料领用单失败"));
        }
    };

    for item in &req.items {
        let _ = sqlx::query!(
            r#"
            INSERT INTO material_issue_items (
                issue_id, material_id, material_code, material_name,
                unit, planned_quantity, actual_quantity, batch_no, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            "#,
            issue.id,
            item.material_id,
            item.material_code.clone(),
            item.material_name.clone(),
            item.unit.clone(),
            BigDecimal::from_str(&item.planned_quantity.to_string()).unwrap_or_default(),
            BigDecimal::from_str(&item.actual_quantity.to_string()).unwrap_or_default(),
            item.batch_no.clone(),
            item.notes.clone(),
        )
        .execute(&mut *tx)
        .await;
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return Json(ApiResponse::error(500, "创建物料领用单失败"));
    }

    let response = MaterialIssueResponse {
        id: issue.id.to_string(),
        issue_no: issue.issue_no,
        order_id: issue.order_id.map(|u| u.to_string()),
        order_no: issue.order_no,
        bom_id: issue.bom_id.map(|u| u.to_string()),
        status: issue.status.unwrap_or_else(|| "pending".to_string()),
        warehouse_id: issue.warehouse_id.map(|u| u.to_string()),
        operator_id: issue.operator_id.map(|u| u.to_string()),
        issue_time: opt_datetime_to_string(issue.issue_time),
        notes: issue.notes,
        created_at: datetime_to_string(issue.created_at),
        updated_at: datetime_to_string(issue.updated_at),
    };

    Json(ApiResponse::success(response, "物料领用单创建成功"))
}

pub async fn list_material_issues(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListMaterialIssuesQuery>,
) -> Json<ApiResponse<ListMaterialIssuesResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MaterialBomRead).await
    {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let pagesize = query.pagesize.unwrap_or(10) as i64;
    let offset = (page - 1) * pagesize;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    if let Some(status) = query.status {
        where_clause.push_str(" WHERE status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(" WHERE (issue_no ILIKE $1 OR order_no ILIKE $1)");
        } else {
            where_clause.push_str(&format!(
                " AND (issue_no ILIKE ${} OR order_no ILIKE ${})",
                params.len() + 1,
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM material_issues{}",
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
            tracing::error!("Failed to count material issues: {}", e);
            return Json(ApiResponse::error(500, "获取物料领用单列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            id, issue_no, order_id, order_no, bom_id, status,
            warehouse_id, operator_id, issue_time, notes,
            created_at, updated_at
        FROM material_issues
        {}
        ORDER BY created_at DESC
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

    let issues = match fetch_query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch material issues: {}", e);
            return Json(ApiResponse::error(500, "获取物料领用单列表失败"));
        }
    };

    let issue_list: Vec<MaterialIssueResponse> = issues
        .into_iter()
        .map(|r| MaterialIssueResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
            issue_no: r.try_get::<String, _>("issue_no").unwrap_or_default(),
            order_id: r
                .try_get::<Option<Uuid>, _>("order_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            order_no: r.try_get::<Option<String>, _>("order_no").ok().flatten(),
            bom_id: r
                .try_get::<Option<Uuid>, _>("bom_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "pending".to_string()),
            warehouse_id: r
                .try_get::<Option<Uuid>, _>("warehouse_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            operator_id: r
                .try_get::<Option<Uuid>, _>("operator_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            issue_time: opt_datetime_to_string(
                r.try_get::<Option<NaiveDateTime>, _>("issue_time")
                    .ok()
                    .flatten(),
            ),
            notes: r.try_get::<Option<String>, _>("notes").ok().flatten(),
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
        ListMaterialIssuesResponse {
            issues: issue_list,
            total: total.unwrap_or(0),
            page,
            pagesize,
        },
        "获取物料领用单列表成功",
    ))
}

// ==================== Material Return Handlers ====================

pub async fn create_material_return(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateMaterialReturnRequest>,
) -> Json<ApiResponse<MaterialReturnResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MaterialBomReturn).await
    {
        return e;
    }

    let now = Utc::now();
    let return_no = format!(
        "MR{}{:04}",
        now.format("%Y%m%d"),
        rand::random::<u16>() % 10000
    );

    let order_no = if let Some(order_id) = req.order_id {
        let order = sqlx::query!(
            r#"SELECT order_no FROM production_orders WHERE id = $1"#,
            order_id
        )
        .fetch_optional(&state.pool)
        .await
        .ok()
        .flatten();
        order.map(|o| o.order_no)
    } else {
        None
    };

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin transaction: {}", e);
            return Json(ApiResponse::error(500, "创建物料退库单失败"));
        }
    };

    let return_result = sqlx::query!(
        r#"
        INSERT INTO material_returns (
            return_no, order_id, order_no, status,
            warehouse_id, operator_id, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $7)
        RETURNING 
            id, return_no, order_id, order_no, status,
            warehouse_id, operator_id, return_time, notes,
            created_at, updated_at
        "#,
        return_no,
        req.order_id,
        order_no,
        req.warehouse_id,
        req.operator_id,
        req.notes,
        now.naive_utc(),
    )
    .fetch_one(&mut *tx)
    .await;

    let return_record = match return_result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create material return: {}", e);
            let _ = tx.rollback().await;
            return Json(ApiResponse::error(500, "创建物料退库单失败"));
        }
    };

    for item in &req.items {
        let _ = sqlx::query!(
            r#"
            INSERT INTO material_return_items (
                return_id, material_id, material_code, material_name,
                unit, quantity, reason, batch_no, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            "#,
            return_record.id,
            item.material_id,
            item.material_code.clone(),
            item.material_name.clone(),
            item.unit.clone(),
            BigDecimal::from_str(&item.quantity.to_string()).unwrap_or_default(),
            item.reason.clone(),
            item.batch_no.clone(),
            item.notes.clone(),
        )
        .execute(&mut *tx)
        .await;
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return Json(ApiResponse::error(500, "创建物料退库单失败"));
    }

    let response = MaterialReturnResponse {
        id: return_record.id.to_string(),
        return_no: return_record.return_no,
        order_id: return_record.order_id.map(|u| u.to_string()),
        order_no: return_record.order_no,
        status: return_record
            .status
            .unwrap_or_else(|| "pending".to_string()),
        warehouse_id: return_record.warehouse_id.map(|u| u.to_string()),
        operator_id: return_record.operator_id.map(|u| u.to_string()),
        return_time: opt_datetime_to_string(return_record.return_time),
        notes: return_record.notes,
        created_at: datetime_to_string(return_record.created_at),
        updated_at: datetime_to_string(return_record.updated_at),
    };

    Json(ApiResponse::success(response, "物料退库单创建成功"))
}

pub async fn list_material_returns(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListMaterialReturnsQuery>,
) -> Json<ApiResponse<ListMaterialReturnsResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MaterialBomRead).await
    {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let pagesize = query.pagesize.unwrap_or(10) as i64;
    let offset = (page - 1) * pagesize;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    if let Some(status) = query.status {
        where_clause.push_str(" WHERE status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(" WHERE (return_no ILIKE $1 OR order_no ILIKE $1)");
        } else {
            where_clause.push_str(&format!(
                " AND (return_no ILIKE ${} OR order_no ILIKE ${})",
                params.len() + 1,
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM material_returns{}",
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
            tracing::error!("Failed to count material returns: {}", e);
            return Json(ApiResponse::error(500, "获取物料退库单列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            id, return_no, order_id, order_no, status,
            warehouse_id, operator_id, return_time, notes,
            created_at, updated_at
        FROM material_returns
        {}
        ORDER BY created_at DESC
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

    let returns = match fetch_query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch material returns: {}", e);
            return Json(ApiResponse::error(500, "获取物料退库单列表失败"));
        }
    };

    let return_list: Vec<MaterialReturnResponse> = returns
        .into_iter()
        .map(|r| MaterialReturnResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
            return_no: r.try_get::<String, _>("return_no").unwrap_or_default(),
            order_id: r
                .try_get::<Option<Uuid>, _>("order_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            order_no: r.try_get::<Option<String>, _>("order_no").ok().flatten(),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "pending".to_string()),
            warehouse_id: r
                .try_get::<Option<Uuid>, _>("warehouse_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            operator_id: r
                .try_get::<Option<Uuid>, _>("operator_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            return_time: opt_datetime_to_string(
                r.try_get::<Option<NaiveDateTime>, _>("return_time")
                    .ok()
                    .flatten(),
            ),
            notes: r.try_get::<Option<String>, _>("notes").ok().flatten(),
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
        ListMaterialReturnsResponse {
            returns: return_list,
            total: total.unwrap_or(0),
            page,
            pagesize,
        },
        "获取物料退库单列表成功",
    ))
}

// ==================== Material Issue RUD Handlers ====================

pub async fn get_material_issue(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MaterialBomRead).await
    {
        return e;
    }

    let issue_result = sqlx::query!(
        r#"
        SELECT id, issue_no, order_id, order_no, bom_id, status,
            warehouse_id, operator_id, issue_time, notes,
            created_at, updated_at
        FROM material_issues
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    let issue = match issue_result {
        Ok(Some(i)) => i,
        Ok(None) => return Json(ApiResponse::error(404, "物料领用单不存在")),
        Err(e) => {
            tracing::error!("Failed to fetch material issue: {}", e);
            return Json(ApiResponse::error(500, "获取物料领用单失败"));
        }
    };

    let items_result = sqlx::query!(
        r#"
        SELECT id, issue_id, material_id, material_code, material_name,
            unit, planned_quantity, actual_quantity, batch_no, notes
        FROM material_issue_items
        WHERE issue_id = $1
        ORDER BY id ASC
        "#,
        id,
    )
    .fetch_all(&state.pool)
    .await;

    let items = match items_result {
        Ok(i) => i,
        Err(e) => {
            tracing::error!("Failed to fetch issue items: {}", e);
            return Json(ApiResponse::error(500, "获取领用单明细失败"));
        }
    };

    let issue_json = serde_json::json!({
        "id": issue.id.to_string(),
        "issue_no": issue.issue_no,
        "order_id": issue.order_id.map(|u| u.to_string()),
        "order_no": issue.order_no,
        "bom_id": issue.bom_id.map(|u| u.to_string()),
        "status": issue.status.unwrap_or_else(|| "pending".to_string()),
        "warehouse_id": issue.warehouse_id.map(|u| u.to_string()),
        "operator_id": issue.operator_id.map(|u| u.to_string()),
        "issue_time": opt_datetime_to_string(issue.issue_time),
        "notes": issue.notes,
        "created_at": datetime_to_string(issue.created_at),
        "updated_at": datetime_to_string(issue.updated_at),
        "items": items.iter().map(|i| serde_json::json!({
            "id": i.id.to_string(),
            "issue_id": i.issue_id.to_string(),
            "material_id": i.material_id.map(|u| u.to_string()),
            "material_code": i.material_code,
            "material_name": i.material_name,
            "unit": i.unit,
            "planned_quantity": big_decimal_to_f64(Some(i.planned_quantity.clone())),
            "actual_quantity": big_decimal_to_f64(Some(i.actual_quantity.clone())),
            "batch_no": i.batch_no,
            "notes": i.notes,
        })).collect::<Vec<_>>(),
    });

    Json(ApiResponse::success(issue_json, "获取物料领用单成功"))
}

pub async fn update_material_issue(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateMaterialIssueRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MaterialBomIssue).await
    {
        return e;
    }

    let now = Utc::now().naive_utc();

    let result = sqlx::query!(
        r#"
        UPDATE material_issues SET
            status = COALESCE($2, status),
            warehouse_id = COALESCE($3, warehouse_id),
            operator_id = COALESCE($4, operator_id),
            notes = COALESCE($5, notes),
            issue_time = CASE WHEN $2 = 'completed' AND issue_time IS NULL THEN $6 ELSE issue_time END,
            updated_at = $6
        WHERE id = $1
        RETURNING id, issue_no, order_id, order_no, bom_id, status,
            warehouse_id, operator_id, issue_time, notes,
            created_at, updated_at
        "#,
        id,
        req.status,
        req.warehouse_id,
        req.operator_id,
        req.notes,
        now,
    )
    .fetch_optional(&state.pool)
    .await;

    let issue = match result {
        Ok(Some(i)) => i,
        Ok(None) => return Json(ApiResponse::error(404, "物料领用单不存在")),
        Err(e) => {
            tracing::error!("Failed to update material issue: {}", e);
            return Json(ApiResponse::error(500, "更新物料领用单失败"));
        }
    };

    let issue_json = serde_json::json!({
        "id": issue.id.to_string(),
        "issue_no": issue.issue_no,
        "order_id": issue.order_id.map(|u| u.to_string()),
        "order_no": issue.order_no,
        "bom_id": issue.bom_id.map(|u| u.to_string()),
        "status": issue.status.unwrap_or_else(|| "pending".to_string()),
        "warehouse_id": issue.warehouse_id.map(|u| u.to_string()),
        "operator_id": issue.operator_id.map(|u| u.to_string()),
        "issue_time": opt_datetime_to_string(issue.issue_time),
        "notes": issue.notes,
        "created_at": datetime_to_string(issue.created_at),
        "updated_at": datetime_to_string(issue.updated_at),
    });

    Json(ApiResponse::success(issue_json, "物料领用单更新成功"))
}

pub async fn delete_material_issue(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MaterialBomIssue).await
    {
        return e;
    }

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin transaction: {}", e);
            return Json(ApiResponse::error(500, "删除物料领用单失败"));
        }
    };

    let _ = sqlx::query!("DELETE FROM material_issue_items WHERE issue_id = $1", id)
        .execute(&mut *tx)
        .await;

    let result = sqlx::query!(
        "DELETE FROM material_issues WHERE id = $1 AND status = 'pending'",
        id
    )
    .execute(&mut *tx)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            let _ = tx.rollback().await;
            tracing::error!("Failed to delete material issue: {}", e);
            return Json(ApiResponse::error(500, "删除物料领用单失败"));
        }
    };

    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return Json(ApiResponse::error(500, "删除物料领用单失败"));
    }

    if result.rows_affected() > 0 {
        Json(ApiResponse::success("".to_string(), "物料领用单删除成功"))
    } else {
        Json(ApiResponse::error(404, "物料领用单不存在或状态不允许删除"))
    }
}

// ==================== Material Return RUD Handlers ====================

pub async fn get_material_return(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MaterialBomRead).await
    {
        return e;
    }

    let return_result = sqlx::query!(
        r#"
        SELECT id, return_no, order_id, order_no, status,
            warehouse_id, operator_id, return_time, notes,
            created_at, updated_at
        FROM material_returns
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    let return_record = match return_result {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "物料退库单不存在")),
        Err(e) => {
            tracing::error!("Failed to fetch material return: {}", e);
            return Json(ApiResponse::error(500, "获取物料退库单失败"));
        }
    };

    let items_result = sqlx::query!(
        r#"
        SELECT id, return_id, material_id, material_code, material_name,
            unit, quantity, reason, batch_no, notes
        FROM material_return_items
        WHERE return_id = $1
        ORDER BY id ASC
        "#,
        id,
    )
    .fetch_all(&state.pool)
    .await;

    let items = match items_result {
        Ok(i) => i,
        Err(e) => {
            tracing::error!("Failed to fetch return items: {}", e);
            return Json(ApiResponse::error(500, "获取退库单明细失败"));
        }
    };

    let return_json = serde_json::json!({
        "id": return_record.id.to_string(),
        "return_no": return_record.return_no,
        "order_id": return_record.order_id.map(|u| u.to_string()),
        "order_no": return_record.order_no,
        "status": return_record.status.unwrap_or_else(|| "pending".to_string()),
        "warehouse_id": return_record.warehouse_id.map(|u| u.to_string()),
        "operator_id": return_record.operator_id.map(|u| u.to_string()),
        "return_time": opt_datetime_to_string(return_record.return_time),
        "notes": return_record.notes,
        "created_at": datetime_to_string(return_record.created_at),
        "updated_at": datetime_to_string(return_record.updated_at),
        "items": items.iter().map(|i| serde_json::json!({
            "id": i.id.to_string(),
            "return_id": i.return_id.to_string(),
            "material_id": i.material_id.map(|u| u.to_string()),
            "material_code": i.material_code,
            "material_name": i.material_name,
            "unit": i.unit,
            "quantity": big_decimal_to_f64(Some(i.quantity.clone())),
            "reason": i.reason,
            "batch_no": i.batch_no,
            "notes": i.notes,
        })).collect::<Vec<_>>(),
    });

    Json(ApiResponse::success(return_json, "获取物料退库单成功"))
}

pub async fn update_material_return(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateMaterialReturnRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MaterialBomReturn).await
    {
        return e;
    }

    let now = Utc::now().naive_utc();

    let result = sqlx::query!(
        r#"
        UPDATE material_returns SET
            status = COALESCE($2, status),
            warehouse_id = COALESCE($3, warehouse_id),
            operator_id = COALESCE($4, operator_id),
            notes = COALESCE($5, notes),
            return_time = CASE WHEN $2 = 'completed' AND return_time IS NULL THEN $6 ELSE return_time END,
            updated_at = $6
        WHERE id = $1
        RETURNING id, return_no, order_id, order_no, status,
            warehouse_id, operator_id, return_time, notes,
            created_at, updated_at
        "#,
        id,
        req.status,
        req.warehouse_id,
        req.operator_id,
        req.notes,
        now,
    )
    .fetch_optional(&state.pool)
    .await;

    let return_record = match result {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "物料退库单不存在")),
        Err(e) => {
            tracing::error!("Failed to update material return: {}", e);
            return Json(ApiResponse::error(500, "更新物料退库单失败"));
        }
    };

    let return_json = serde_json::json!({
        "id": return_record.id.to_string(),
        "return_no": return_record.return_no,
        "order_id": return_record.order_id.map(|u| u.to_string()),
        "order_no": return_record.order_no,
        "status": return_record.status.unwrap_or_else(|| "pending".to_string()),
        "warehouse_id": return_record.warehouse_id.map(|u| u.to_string()),
        "operator_id": return_record.operator_id.map(|u| u.to_string()),
        "return_time": opt_datetime_to_string(return_record.return_time),
        "notes": return_record.notes,
        "created_at": datetime_to_string(return_record.created_at),
        "updated_at": datetime_to_string(return_record.updated_at),
    });

    Json(ApiResponse::success(return_json, "物料退库单更新成功"))
}

pub async fn delete_material_return(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MaterialBomReturn).await
    {
        return e;
    }

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin transaction: {}", e);
            return Json(ApiResponse::error(500, "删除物料退库单失败"));
        }
    };

    let _ = sqlx::query!("DELETE FROM material_return_items WHERE return_id = $1", id)
        .execute(&mut *tx)
        .await;

    let result = sqlx::query!(
        "DELETE FROM material_returns WHERE id = $1 AND status = 'pending'",
        id
    )
    .execute(&mut *tx)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            let _ = tx.rollback().await;
            tracing::error!("Failed to delete material return: {}", e);
            return Json(ApiResponse::error(500, "删除物料退库单失败"));
        }
    };

    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return Json(ApiResponse::error(500, "删除物料退库单失败"));
    }

    if result.rows_affected() > 0 {
        Json(ApiResponse::success("".to_string(), "物料退库单删除成功"))
    } else {
        Json(ApiResponse::error(404, "物料退库单不存在或状态不允许删除"))
    }
}
