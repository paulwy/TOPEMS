//! SCM API 处理器

use axum::{
    extract::{Query, State},
    Json,
};
use serde::Deserialize;

use super::models::*;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct ListParams {
    #[serde(default)]
    pub page: Option<u32>,
    #[serde(default)]
    pub pagesize: Option<u32>,
}

/// 获取 MRP 计划列表
pub async fn list_mrp_plans(
    State(_state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let pagesize = params.pagesize.unwrap_or(10);

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
        "pagesize": pagesize,
    }))
}

/// 获取价格对比列表
pub async fn list_price_comparisons(
    State(_state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let pagesize = params.pagesize.unwrap_or(10);

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
        "pagesize": pagesize,
    }))
}

/// 获取 SCM 概览
pub async fn get_scm_overview(
    State(_state): State<AppState>,
) -> Json<ScmOverview> {
    Json(ScmOverview {
        total_suppliers: 156,
        total_purchase_orders: 342,
        pending_approvals: 12,
        mrp_plans: 28,
        price_comparisons: 45,
    })
}
