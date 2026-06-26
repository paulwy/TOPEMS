//! Material BOM handlers

use axum::{extract::Path, extract::State, extract::Extension, routing::{delete, get, post, put}, Json, Router};
use chrono::{DateTime, NaiveDate, NaiveDateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::{BigDecimal, Uuid}, PgPool};
use std::str::FromStr;
use topems_shared::auth::Claims;

use crate::AppState;
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/mes/boms", get(list_material_boms).post(create_material_bom))
        .route("/api/mes/boms/{id}", get(get_material_bom).put(update_material_bom).delete(delete_material_bom))
        .route("/api/mes/material-issues", get(list_material_issues).post(create_material_issue))
        .route("/api/mes/material-returns", get(list_material_returns).post(create_material_return))
}

// ==================== Data Types ====================

#[derive(Debug, Clone, Serialize)]
pub struct MaterialBomResponse {
    pub id: Uuid,
    pub bom_no: String,
    pub product_id: Option<Uuid>,
    pub product_name: String,
    pub product_code: String,
    pub version: String,
    pub status: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BomItemResponse {
    pub id: Uuid,
    pub bom_id: Uuid,
    pub material_id: Option<Uuid>,
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
}

#[derive(Debug, Clone, Serialize)]
pub struct MaterialIssueResponse {
    pub id: Uuid,
    pub issue_no: String,
    pub order_id: Option<Uuid>,
    pub order_no: Option<String>,
    pub bom_id: Option<Uuid>,
    pub status: String,
    pub warehouse_id: Option<Uuid>,
    pub operator_id: Option<Uuid>,
    pub issue_time: Option<DateTime<Utc>>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MaterialIssueItemResponse {
    pub id: Uuid,
    pub issue_id: Uuid,
    pub material_id: Option<Uuid>,
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
    pub id: Uuid,
    pub return_no: String,
    pub order_id: Option<Uuid>,
    pub order_no: Option<String>,
    pub status: String,
    pub warehouse_id: Option<Uuid>,
    pub operator_id: Option<Uuid>,
    pub return_time: Option<DateTime<Utc>>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MaterialReturnItemResponse {
    pub id: Uuid,
    pub return_id: Uuid,
    pub material_id: Option<Uuid>,
    pub material_code: String,
    pub material_name: String,
    pub unit: String,
    pub quantity: f64,
    pub reason: Option<String>,
    pub batch_no: Option<String>,
    pub notes: Option<String>,
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
    dt.map(|d| Utc.from_utc_datetime(&d)).unwrap_or_else(Utc::now)
}

fn opt_naive_to_utc(dt: Option<NaiveDateTime>) -> Option<DateTime<Utc>> {
    dt.map(|d| Utc.from_utc_datetime(&d))
}

fn big_decimal_to_f64(bd: Option<BigDecimal>) -> f64 {
    bd.and_then(|d| d.to_string().parse::<f64>().ok()).unwrap_or(0.0)
}

// ==================== Material BOM Handlers ====================

pub async fn list_material_boms(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<ListMaterialBomsResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MaterialBomRead).await {
        return e;
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            id, bom_no, product_id, product_name, product_code,
            version, status, description, created_at, updated_at
        FROM material_boms
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&state.pool)
    .await;

    let boms = match result {
        Ok(b) => b,
        Err(e) => {
            tracing::error!("Failed to fetch material BOMs: {}", e);
            return Json(ApiResponse::error(500, "获取物料BOM列表失败"));
        }
    };

    let boms_list: Vec<MaterialBomResponse> = boms.into_iter().map(|r| MaterialBomResponse {
        id: r.id,
        bom_no: r.bom_no,
        product_id: r.product_id,
        product_name: r.product_name,
        product_code: r.product_code,
        version: r.version.unwrap_or_else(|| "1.0".to_string()),
        status: r.status.unwrap_or_else(|| "draft".to_string()),
        description: r.description,
        created_at: naive_to_utc(r.created_at),
        updated_at: naive_to_utc(r.updated_at),
    }).collect();

    let total = boms_list.len() as i64;

    Json(ApiResponse::success(
        ListMaterialBomsResponse {
            boms: boms_list,
            total,
        },
        "获取物料BOM列表成功",
    ))
}

pub async fn create_material_bom(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateMaterialBomRequest>,
) -> Json<ApiResponse<BomDetailResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MaterialBomWrite).await {
        return e;
    }

    let now = Utc::now();
    let bom_no = format!("BOM{}{:04}", now.format("%Y%m%d"), rand::random::<u16>() % 10000);

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
                    id: i.id,
                    bom_id: i.bom_id,
                    material_id: i.material_id,
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
        id: bom.id,
        bom_no: bom.bom_no,
        product_id: bom.product_id,
        product_name: bom.product_name,
        product_code: bom.product_code,
        version: bom.version.unwrap_or_else(|| "1.0".to_string()),
        status: bom.status.unwrap_or_else(|| "draft".to_string()),
        description: bom.description,
        created_at: naive_to_utc(bom.created_at),
        updated_at: naive_to_utc(bom.updated_at),
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
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MaterialBomRead).await {
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
        id: bom.id,
        bom_no: bom.bom_no,
        product_id: bom.product_id,
        product_name: bom.product_name,
        product_code: bom.product_code,
        version: bom.version.unwrap_or_else(|| "1.0".to_string()),
        status: bom.status.unwrap_or_else(|| "draft".to_string()),
        description: bom.description,
        created_at: naive_to_utc(bom.created_at),
        updated_at: naive_to_utc(bom.updated_at),
    };

    let item_responses: Vec<BomItemResponse> = items.into_iter().map(|i| BomItemResponse {
        id: i.id,
        bom_id: i.bom_id,
        material_id: i.material_id,
        material_code: i.material_code,
        material_name: i.material_name,
        specification: i.specification,
        unit: i.unit,
        quantity: big_decimal_to_f64(Some(i.quantity)),
        loss_rate: big_decimal_to_f64(i.loss_rate),
        sequence: i.sequence.unwrap_or(0),
        notes: i.notes,
    }).collect();

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
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MaterialBomWrite).await {
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
                BigDecimal::from_str(&item.loss_rate.unwrap_or(0.0).to_string()).unwrap_or_default(),
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

    get_material_bom(State(AppState { 
        auth_state: state.auth_state.clone(), 
        pool: state.pool.clone(),
        health_config: state.health_config.clone(),
    }), Extension(claims), Path(id)).await
}

pub async fn delete_material_bom(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MaterialBomWrite).await {
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
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MaterialBomIssue).await {
        return e;
    }

    let now = Utc::now();
    let issue_no = format!("MI{}{:04}", now.format("%Y%m%d"), rand::random::<u16>() % 10000);

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
        id: issue.id,
        issue_no: issue.issue_no,
        order_id: issue.order_id,
        order_no: issue.order_no,
        bom_id: issue.bom_id,
        status: issue.status.unwrap_or_else(|| "pending".to_string()),
        warehouse_id: issue.warehouse_id,
        operator_id: issue.operator_id,
        issue_time: opt_naive_to_utc(issue.issue_time),
        notes: issue.notes,
        created_at: naive_to_utc(issue.created_at),
        updated_at: naive_to_utc(issue.updated_at),
    };

    Json(ApiResponse::success(response, "物料领用单创建成功"))
}

pub async fn list_material_issues(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<MaterialIssueResponse>>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MaterialBomRead).await {
        return e;
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            id, issue_no, order_id, order_no, bom_id, status,
            warehouse_id, operator_id, issue_time, notes,
            created_at, updated_at
        FROM material_issues
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&state.pool)
    .await;

    let issues = match result {
        Ok(i) => i,
        Err(e) => {
            tracing::error!("Failed to fetch material issues: {}", e);
            return Json(ApiResponse::error(500, "获取物料领用单列表失败"));
        }
    };

    let issue_list: Vec<MaterialIssueResponse> = issues.into_iter().map(|r| MaterialIssueResponse {
        id: r.id,
        issue_no: r.issue_no,
        order_id: r.order_id,
        order_no: r.order_no,
        bom_id: r.bom_id,
        status: r.status.unwrap_or_else(|| "pending".to_string()),
        warehouse_id: r.warehouse_id,
        operator_id: r.operator_id,
        issue_time: opt_naive_to_utc(r.issue_time),
        notes: r.notes,
        created_at: naive_to_utc(r.created_at),
        updated_at: naive_to_utc(r.updated_at),
    }).collect();

    Json(ApiResponse::success(issue_list, "获取物料领用单列表成功"))
}

// ==================== Material Return Handlers ====================

pub async fn create_material_return(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateMaterialReturnRequest>,
) -> Json<ApiResponse<MaterialReturnResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MaterialBomReturn).await {
        return e;
    }

    let now = Utc::now();
    let return_no = format!("MR{}{:04}", now.format("%Y%m%d"), rand::random::<u16>() % 10000);

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
        id: return_record.id,
        return_no: return_record.return_no,
        order_id: return_record.order_id,
        order_no: return_record.order_no,
        status: return_record.status.unwrap_or_else(|| "pending".to_string()),
        warehouse_id: return_record.warehouse_id,
        operator_id: return_record.operator_id,
        return_time: opt_naive_to_utc(return_record.return_time),
        notes: return_record.notes,
        created_at: naive_to_utc(return_record.created_at),
        updated_at: naive_to_utc(return_record.updated_at),
    };

    Json(ApiResponse::success(response, "物料退库单创建成功"))
}

pub async fn list_material_returns(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<MaterialReturnResponse>>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MaterialBomRead).await {
        return e;
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            id, return_no, order_id, order_no, status,
            warehouse_id, operator_id, return_time, notes,
            created_at, updated_at
        FROM material_returns
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&state.pool)
    .await;

    let returns = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch material returns: {}", e);
            return Json(ApiResponse::error(500, "获取物料退库单列表失败"));
        }
    };

    let return_list: Vec<MaterialReturnResponse> = returns.into_iter().map(|r| MaterialReturnResponse {
        id: r.id,
        return_no: r.return_no,
        order_id: r.order_id,
        order_no: r.order_no,
        status: r.status.unwrap_or_else(|| "pending".to_string()),
        warehouse_id: r.warehouse_id,
        operator_id: r.operator_id,
        return_time: opt_naive_to_utc(r.return_time),
        notes: r.notes,
        created_at: naive_to_utc(r.created_at),
        updated_at: naive_to_utc(r.updated_at),
    }).collect();

    Json(ApiResponse::success(return_list, "获取物料退库单列表成功"))
}
