//! WMS（仓储管理）服务 API trait 定义

use super::super::error::ServiceClientResult;
use super::super::trait_api::TypedServiceClient;
use crate::define_service_api;

define_service_api!(
    WmsApi,
    "topems-wms",
    8041,
    Some("WMS_SERVICE_URL"),
    "/api/wms"
);

// ============ TypedServiceClient<WmsApi> 业务方法 ============

impl TypedServiceClient<WmsApi> {
    /// 列出仓库
    pub async fn list_warehouses(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/warehouses?page={}&pagesize={}", page, page_size);
        self.get(&self.build_path(&path)).await
    }

    /// 获取仓库
    pub async fn get_warehouse(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/warehouses/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 获取库存汇总
    pub async fn get_inventory_summary(&self) -> ServiceClientResult<serde_json::Value> {
        self.get(&self.build_path("/inventory/summary")).await
    }

    /// 列出入库单
    pub async fn list_inbound_orders(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/inbound-orders?page={}&pagesize={}", page, page_size);
        self.get(&self.build_path(&path)).await
    }

    /// 列出出库单
    pub async fn list_outbound_orders(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/outbound-orders?page={}&pagesize={}", page, page_size);
        self.get(&self.build_path(&path)).await
    }

    /// 更新库存
    pub async fn update_inventory(
        &self,
        material_id: &str,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/inventory/{}", material_id);
        self.put(&self.build_path(&path), data).await
    }
}
