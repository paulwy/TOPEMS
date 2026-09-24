//! ERP 服务 API trait 定义
//!
//! 展示如何用 `define_service_api!` 宏声明服务元数据，
//! 并在 `TypedServiceClient<ErpApi>` 上实现业务方法。

use super::super::error::ServiceClientResult;
use super::super::trait_api::TypedServiceClient;
use crate::define_service_api;
use serde::{Deserialize, Serialize};

define_service_api!(
    ErpApi,
    "topems-erp",
    8010,
    Some("ERP_SERVICE_URL"),
    "/api/erp"
);

// ============ 业务数据类型 ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpAsset {
    pub id: String,
    pub name: String,
    pub asset_code: String,
    pub status: String,
}

// ============ TypedServiceClient<ErpApi> 业务方法 ============

impl TypedServiceClient<ErpApi> {
    /// 列出资产
    pub async fn list_assets(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/assets?page={}&pagesize={}", page, page_size);
        self.get_items(&self.build_path(&path)).await
    }

    /// 获取单个资产
    pub async fn get_asset(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/assets/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 列出凭证
    pub async fn list_vouchers(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/vouchers?page={}&pagesize={}", page, page_size);
        self.get_items(&self.build_path(&path)).await
    }

    /// 创建凭证
    pub async fn create_voucher(
        &self,
        data: &serde_json::Value,
        accept_language: Option<&str>,
    ) -> ServiceClientResult<serde_json::Value> {
        match accept_language {
            Some(lang) => {
                self.post_with_headers(
                    &self.build_path("/vouchers"),
                    data,
                    &[("accept-language", lang)],
                )
                .await
            }
            None => self.post(&self.build_path("/vouchers"), data).await,
        }
    }

    /// 获取库存汇总
    /// 服务端路由为 GET /inventory（list_inventory 分页列表，data.total 为库存条目数）
    pub async fn get_inventory_summary(&self) -> ServiceClientResult<serde_json::Value> {
        self.get(&self.build_path("/inventory")).await
    }

    /// 列出客户
    pub async fn list_customers(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/customers?page={}&pagesize={}", page, page_size);
        self.get_items(&self.build_path(&path)).await
    }

    /// 获取财务汇总
    pub async fn get_finance_summary(&self) -> ServiceClientResult<serde_json::Value> {
        self.get(&self.build_path("/finance/summary")).await
    }

    /// 获取单个客户
    pub async fn get_customer(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/customers/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 列出供应商
    pub async fn list_suppliers(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/suppliers?page={}&pagesize={}", page, page_size);
        self.get_items(&self.build_path(&path)).await
    }

    /// 获取单个供应商
    pub async fn get_supplier(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/suppliers/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 列出物料
    pub async fn list_materials(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/materials?page={}&pagesize={}", page, page_size);
        self.get_items(&self.build_path(&path)).await
    }

    /// 列出采购订单
    pub async fn list_purchase_orders(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/purchase-orders?page={}&pagesize={}", page, page_size);
        self.get_items(&self.build_path(&path)).await
    }

    /// 采购订单总数（分页响应 data.total，dashboard stats 口径）
    pub async fn count_purchase_orders(&self) -> ServiceClientResult<u64> {
        let v: serde_json::Value = self
            .get(&self.build_path("/purchase-orders?page=1&pagesize=1"))
            .await?;
        Ok(v.get("data")
            .and_then(|d| d.get("total"))
            .and_then(|x| x.as_u64())
            .unwrap_or(0))
    }

    /// 列出销售订单
    pub async fn list_sales_orders(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/sales-orders?page={}&pagesize={}", page, page_size);
        self.get_items(&self.build_path(&path)).await
    }

    /// 获取销售订单详情
    pub async fn get_sales_order(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/sales-orders/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 创建采购订单
    pub async fn create_purchase_order(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/purchase-orders"), data).await
    }

    /// 创建对账记录
    pub async fn create_reconciliation(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/finance/reconciliation"), data)
            .await
    }

    /// 按关联标识列出对账记录
    pub async fn list_reconciliations_by_ref(
        &self,
        ref_id: &str,
        ref_type: &str,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!(
            "/finance/reconciliation?ref_id={}&ref_type={}",
            ref_id, ref_type
        );
        self.get_items(&self.build_path(&path)).await
    }

    /// MES 回传生产进度（POST /api/erp/production-orders/sync/mes-progress）
    /// payload: { "mes_order_id": Uuid, "erp_order_id": Option<Uuid>,
    ///            "completed_quantity": Option<f64>, "status": Option<String>,
    ///            "actual_start_date": ..., "actual_end_date": ... }
    pub async fn sync_mes_progress(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(
            &self.build_path("/production-orders/sync/mes-progress"),
            data,
        )
        .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rt<T: Serialize + serde::de::DeserializeOwned>(val: &T) -> T {
        let s = serde_json::to_string(val).unwrap();
        serde_json::from_str(&s).unwrap()
    }

    #[test]
    fn erp_asset_roundtrip() {
        let a = ErpAsset {
            id: "ast-001".into(),
            name: "CNC Machine A".into(),
            asset_code: "EQ-2024-0001".into(),
            status: "active".into(),
        };
        let back = rt(&a);
        assert_eq!(back.id, a.id);
        assert_eq!(back.name, a.name);
        assert_eq!(back.asset_code, a.asset_code);
        assert_eq!(back.status, a.status);
    }
}
