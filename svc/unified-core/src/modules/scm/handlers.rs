//! SCM API 处理器

use axum::{
    extract::{Query, State},
    Json,
};
use serde::Deserialize;
use sqlx::{PgPool, Row};

use super::models::*;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct ListParams {
    #[serde(default)]
    pub page: Option<u32>,
    #[serde(default)]
    pub page_size: Option<u32>,
}

/// 获取供应商列表（真实数据库查询）
pub async fn list_suppliers(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询供应商列表（使用sqlx::query避免离线缓存问题）
    let suppliers = sqlx::query(
        r#"
        SELECT id, supplier_no, name, contact_person, phone, email, status, created_at
        FROM scm.suppliers
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM scm.suppliers
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match suppliers {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "supplier_code": r.get::<Option<String>, _>("supplier_no"),
                        "supplier_name": r.get::<String, _>("name"),
                        "contact_person": r.get::<Option<String>, _>("contact_person"),
                        "contact_phone": r.get::<Option<String>, _>("phone"),
                        "email": r.get::<Option<String>, _>("email"),
                        "status": r.get::<String, _>("status"),
                        "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "data": data,
                "total": total,
                "page": page,
                "page_size": page_size,
            }))
        }
        Err(e) => {
            tracing::error!("Failed to query suppliers: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取供应商列表失败"
            }))
        }
    }
}

/// 获取 MRP 计划列表
pub async fn list_mrp_plans(
    State(_state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);

    let plans = vec![
        MrpPlan {
            id: "1".to_string(),
            plan_no: "MRP-2026-001".to_string(),
            product_name: "工业机器人手臂".to_string(),
            quantity: 50.0,
            unit: "台".to_string(),
            required_date: "2026-10-01".to_string(),
            status: "待审批".to_string(),
            supplier: Some("华为技术".to_string()),
        },
        MrpPlan {
            id: "2".to_string(),
            plan_no: "MRP-2026-002".to_string(),
            product_name: "伺服电机".to_string(),
            quantity: 200.0,
            unit: "台".to_string(),
            required_date: "2026-10-15".to_string(),
            status: "已确认".to_string(),
            supplier: Some("西门子".to_string()),
        },
        MrpPlan {
            id: "3".to_string(),
            plan_no: "MRP-2026-003".to_string(),
            product_name: "PLC 控制器".to_string(),
            quantity: 100.0,
            unit: "套".to_string(),
            required_date: "2026-11-01".to_string(),
            status: "进行中".to_string(),
            supplier: None,
        },
    ];

    Json(serde_json::json!({
        "data": plans,
        "total": 3,
        "page": page,
        "page_size": page_size,
    }))
}

/// 获取价格对比列表
pub async fn list_price_comparisons(
    State(_state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);

    let comparisons = vec![
        PriceComparison {
            id: "1".to_string(),
            material_name: "不锈钢板 304".to_string(),
            supplier: "宝钢股份".to_string(),
            price: 15.5,
            currency: "CNY".to_string(),
            delivery_days: 7,
            quality_score: 4.8,
        },
        PriceComparison {
            id: "2".to_string(),
            material_name: "不锈钢板 304".to_string(),
            supplier: "鞍钢股份".to_string(),
            price: 14.8,
            currency: "CNY".to_string(),
            delivery_days: 10,
            quality_score: 4.5,
        },
        PriceComparison {
            id: "3".to_string(),
            material_name: "铝合金型材".to_string(),
            supplier: "中国铝业".to_string(),
            price: 22.0,
            currency: "CNY".to_string(),
            delivery_days: 5,
            quality_score: 4.9,
        },
    ];

    Json(serde_json::json!({
        "data": comparisons,
        "total": 3,
        "page": page,
        "page_size": page_size,
    }))
}

/// 获取 SCM 概览
pub async fn get_scm_overview(State(_state): State<AppState>) -> Json<ScmOverview> {
    Json(ScmOverview {
        total_suppliers: 156,
        total_purchase_orders: 342,
        pending_approvals: 12,
        mrp_plans: 28,
        price_comparisons: 45,
    })
}

/// 获取采购申请列表（真实数据库查询）
pub async fn list_purchase_requisitions(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询采购申请列表
    let requisitions = sqlx::query(
        r#"
        SELECT id, requisition_no, title, applicant_name, department_name, 
               request_date, required_date, total_amount, status, priority, supplier_name
        FROM scm.purchase_requisitions
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM scm.purchase_requisitions
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match requisitions {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "requisition_no": r.get::<String, _>("requisition_no"),
                        "title": r.get::<String, _>("title"),
                        "applicant_name": r.get::<Option<String>, _>("applicant_name"),
                        "department_name": r.get::<Option<String>, _>("department_name"),
                        "request_date": r.get::<chrono::DateTime<chrono::Utc>, _>("request_date"),
                        "required_date": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("required_date"),
                        "total_amount": r.get::<Option<rust_decimal::Decimal>, _>("total_amount").map(|d| d.to_string().parse::<f64>().unwrap_or(0.0)),
                        "status": r.get::<String, _>("status"),
                        "priority": r.get::<Option<String>, _>("priority"),
                        "supplier_name": r.get::<Option<String>, _>("supplier_name"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "data": data,
                "total": total,
                "page": page,
                "page_size": page_size,
            }))
        }
        Err(e) => {
            tracing::error!("Failed to query purchase requisitions: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取采购申请列表失败"
            }))
        }
    }
}

/// 获取采购合同列表（真实数据库查询）
pub async fn list_purchase_contracts(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询采购合同列表
    let contracts = sqlx::query(
        r#"
        SELECT id, contract_no, title, contract_type, supplier_name, 
               sign_date, effective_date, expiry_date, total_amount, status
        FROM scm.purchase_contracts
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM scm.purchase_contracts
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match contracts {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "contract_no": r.get::<String, _>("contract_no"),
                        "title": r.get::<String, _>("title"),
                        "contract_type": r.get::<String, _>("contract_type"),
                        "supplier_name": r.get::<Option<String>, _>("supplier_name"),
                        "sign_date": r.get::<Option<chrono::NaiveDate>, _>("sign_date"),
                        "effective_date": r.get::<Option<chrono::NaiveDate>, _>("effective_date"),
                        "expiry_date": r.get::<Option<chrono::NaiveDate>, _>("expiry_date"),
                        "total_amount": r.get::<Option<rust_decimal::Decimal>, _>("total_amount").map(|d| d.to_string().parse::<f64>().unwrap_or(0.0)),
                        "status": r.get::<String, _>("status"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "data": data,
                "total": total,
                "page": page,
                "page_size": page_size,
            }))
        }
        Err(e) => {
            tracing::error!("Failed to query purchase contracts: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取采购合同列表失败"
            }))
        }
    }
}
