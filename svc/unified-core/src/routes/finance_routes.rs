//! Finance 路由注册

use axum::routing::get;
use axum::Router;

use crate::modules::finance::handlers::*;
use crate::AppState;

/// 创建 Finance 业务路由
pub fn finance_routes() -> Router<AppState> {
    Router::new()
        // 应收列表（真实数据库查询）
        .route("/api/finance/receivables", get(list_receivables))
        // 应付列表（真实数据库查询）
        .route("/api/finance/payables", get(list_payables))
        // 凭证列表（真实数据库查询）
        .route("/api/finance/vouchers", get(list_vouchers))
}
