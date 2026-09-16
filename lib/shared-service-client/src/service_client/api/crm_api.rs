//! CRM（客户关系管理）服务 API trait 定义

use super::super::error::ServiceClientResult;
use super::super::trait_api::TypedServiceClient;
use crate::define_service_api;

define_service_api!(
    CrmApi,
    "topems-crm",
    8029,
    Some("CRM_SERVICE_URL"),
    "/api/crm"
);

// ============ TypedServiceClient<CrmApi> 业务方法 ============

impl TypedServiceClient<CrmApi> {
    /// 列出客户
    pub async fn list_customers(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/customers?page={}&pagesize={}", page, page_size);
        self.get_items(&self.build_path(&path)).await
    }

    /// 获取客户
    pub async fn get_customer(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/customers/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 创建客户
    pub async fn create_customer(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/customers"), data).await
    }

    /// 更新客户
    pub async fn update_customer(
        &self,
        id: &str,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/customers/{}", id);
        self.put(&self.build_path(&path), data).await
    }

    /// 删除客户
    pub async fn delete_customer(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/customers/{}", id);
        self.delete(&self.build_path(&path)).await
    }

    /// 列出线索
    pub async fn list_leads(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/leads?page={}&pagesize={}", page, page_size);
        self.get_items(&self.build_path(&path)).await
    }

    /// 列出商机
    pub async fn list_opportunities(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/opportunities?page={}&pagesize={}", page, page_size);
        self.get_items(&self.build_path(&path)).await
    }

    /// 创建商机
    pub async fn create_opportunity(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/opportunities"), data).await
    }

    /// 获取仪表盘统计
    pub async fn get_dashboard_stats(&self) -> ServiceClientResult<serde_json::Value> {
        self.get(&self.build_path("/dashboard/stats")).await
    }
}
