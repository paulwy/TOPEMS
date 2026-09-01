use axum::{
    extract::{Extension, State},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::service::issue_service_token;
use topems_shared_core::response::ApiResponse;

use super::ApiState;

/// 调用 WMS 服务库存统计 API（GET /api/wms/inventory/statistics）
/// 返回 (总库存量, 低库存项数)；认证失败或服务不可达时降级为 (0, 0)。
/// 服务间认证：用共享 JWT 密钥签发最小权限 service token（仅 wms:admin），
/// 而非转发前端用户 token（前端用户无 wms:admin 权限会 401 → 库存降级 0）。
async fn fetch_wms_inventory_stats(jwt_secret: &str) -> (i64, i64) {
    let base = std::env::var("WMS_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8041".to_string());
    let url = format!("{}/api/wms/inventory/statistics", base);

    // 服务身份 Claims：仅声明 wms:admin（最小权限），5 分钟有效
    let token = match issue_service_token(jwt_secret, "erp-service", &["wms:admin"], None) {
        Ok(t) => t,
        Err(_) => return (0, 0),
    };

    match reqwest::Client::new()
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
    {
        Ok(resp) if resp.status().is_success() => {
            let v: serde_json::Value =
                resp.json().await.unwrap_or_else(|_| serde_json::json!({}));
            let data = v.get("data").unwrap_or(&v);
            let total = data
                .get("total_quantity")
                .and_then(|x| x.as_f64())
                .unwrap_or(0.0) as i64;
            let low = data
                .get("low_stock_count")
                .and_then(|x| x.as_i64())
                .unwrap_or(0);
            (total, low)
        }
        _ => (0, 0),
    }
}

const ALLOWED_TABLES: &[&str] = &[
    "assets",
    "production_orders",
    "inventory_items",
    "suppliers",
    "customers",
    "vouchers",
];

fn validate_table(table: &str) -> Option<&'static str> {
    ALLOWED_TABLES.iter().find(|&&t| t == table).copied()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpDashboardStats {
    pub total_assets: i64,
    pub active_assets: i64,
    pub total_orders: i64,
    pub pending_orders: i64,
    pub total_inventory: i64,
    pub low_stock_items: i64,
    pub total_suppliers: i64,
    pub active_suppliers: i64,
    pub total_customers: i64,
    pub active_customers: i64,
    pub total_vouchers: i64,
    pub pending_vouchers: i64,
}

async fn count_table(pool: &sqlx::PgPool, table: &str) -> i64 {
    let Some(table) = validate_table(table) else {
        return 0;
    };
    match sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM {} WHERE deleted_at IS NULL",
        table
    ))
    .fetch_one(pool)
    .await
    {
        Ok(v) => v,
        Err(_) => {
            match sqlx::query_scalar(&format!("SELECT COUNT(*) FROM {}", table))
                .fetch_one(pool)
                .await
            {
                Ok(v) => v,
                Err(_) => 0,
            }
        }
    }
}

async fn count_table_with_status(pool: &sqlx::PgPool, table: &str, status: &str) -> i64 {
    let Some(table) = validate_table(table) else {
        return 0;
    };
    match sqlx::query_scalar(&format!(
        "SELECT COUNT(*) FROM {} WHERE status = $1 AND deleted_at IS NULL",
        table
    ))
    .bind(status)
    .fetch_one(pool)
    .await
    {
        Ok(v) => v,
        Err(_) => {
            match sqlx::query_scalar(&format!("SELECT COUNT(*) FROM {} WHERE status = $1", table))
                .bind(status)
                .fetch_one(pool)
                .await
            {
                Ok(v) => v,
                Err(_) => 0,
            }
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/dashboard",
    tag = "ERP",
    responses((status = 200, description = "获取 ERP 仪表盘统计成功"))
)]
pub async fn get_dashboard(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<ErpDashboardStats>> {
    let total_assets = count_table(&state.db, "assets").await;
    let active_assets = count_table_with_status(&state.db, "assets", "active").await;

    let total_orders = count_table(&state.db, "production_orders").await;
    let pending_orders = count_table_with_status(&state.db, "production_orders", "pending").await;

    // 库存统计改走 WMS 服务 API（public.inventory_items 已废弃，真实库存源为 wms.inventory）
    let (total_inventory, low_stock_items) =
        fetch_wms_inventory_stats(&state.auth_state.jwt_secret).await;

    let total_suppliers = count_table(&state.db, "suppliers").await;
    let active_suppliers = count_table_with_status(&state.db, "suppliers", "active").await;

    let total_customers = count_table(&state.db, "customers").await;
    let active_customers = count_table_with_status(&state.db, "customers", "active").await;

    let total_vouchers = count_table(&state.db, "vouchers").await;
    let pending_vouchers = count_table_with_status(&state.db, "vouchers", "draft").await;

    let stats = ErpDashboardStats {
        total_assets,
        active_assets,
        total_orders,
        pending_orders,
        total_inventory,
        low_stock_items,
        total_suppliers,
        active_suppliers,
        total_customers,
        active_customers,
        total_vouchers,
        pending_vouchers,
    };

    Json(ApiResponse::success(stats, "查询成功"))
}

pub fn create_routes() -> Router<ApiState> {
    Router::new().route("/dashboard", axum::routing::get(get_dashboard))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_erp_dashboard_stats_serialization() {
        let stats = ErpDashboardStats {
            total_assets: 1000,
            active_assets: 950,
            total_orders: 500,
            pending_orders: 50,
            total_inventory: 10000,
            low_stock_items: 20,
            total_suppliers: 100,
            active_suppliers: 80,
            total_customers: 2000,
            active_customers: 1800,
            total_vouchers: 300,
            pending_vouchers: 30,
        };
        let json = serde_json::to_value(&stats).unwrap();
        assert_eq!(json["total_assets"], 1000);
        assert_eq!(json["active_assets"], 950);
        assert_eq!(json["total_orders"], 500);
        assert_eq!(json["pending_orders"], 50);
        assert_eq!(json["total_inventory"], 10000);
        assert_eq!(json["low_stock_items"], 20);
        assert_eq!(json["total_suppliers"], 100);
        assert_eq!(json["active_suppliers"], 80);
        assert_eq!(json["total_customers"], 2000);
        assert_eq!(json["active_customers"], 1800);
        assert_eq!(json["total_vouchers"], 300);
        assert_eq!(json["pending_vouchers"], 30);
    }

    #[test]
    fn test_erp_dashboard_stats_deserialize() {
        let json = r#"{
            "total_assets": 500,
            "active_assets": 450,
            "total_orders": 200,
            "pending_orders": 20,
            "total_inventory": 5000,
            "low_stock_items": 10,
            "total_suppliers": 50,
            "active_suppliers": 40,
            "total_customers": 1000,
            "active_customers": 900,
            "total_vouchers": 150,
            "pending_vouchers": 15
        }"#;
        let stats: ErpDashboardStats = serde_json::from_str(json).unwrap();
        assert_eq!(stats.total_assets, 500);
        assert_eq!(stats.active_assets, 450);
        assert_eq!(stats.total_orders, 200);
        assert_eq!(stats.pending_orders, 20);
        assert_eq!(stats.total_inventory, 5000);
        assert_eq!(stats.low_stock_items, 10);
        assert_eq!(stats.total_suppliers, 50);
        assert_eq!(stats.active_suppliers, 40);
        assert_eq!(stats.total_customers, 1000);
        assert_eq!(stats.active_customers, 900);
        assert_eq!(stats.total_vouchers, 150);
        assert_eq!(stats.pending_vouchers, 15);
    }

    #[test]
    fn test_erp_dashboard_stats_zero() {
        let stats = ErpDashboardStats {
            total_assets: 0,
            active_assets: 0,
            total_orders: 0,
            pending_orders: 0,
            total_inventory: 0,
            low_stock_items: 0,
            total_suppliers: 0,
            active_suppliers: 0,
            total_customers: 0,
            active_customers: 0,
            total_vouchers: 0,
            pending_vouchers: 0,
        };
        let json = serde_json::to_value(&stats).unwrap();
        assert_eq!(json["total_assets"], 0);
        assert_eq!(json["active_assets"], 0);
        assert_eq!(json["total_orders"], 0);
    }
}
