//! Finance（财务）服务 API trait 定义

use super::super::error::ServiceClientResult;
use super::super::trait_api::TypedServiceClient;
use crate::define_service_api;

define_service_api!(
    FinanceApi,
    "topems-finance",
    8011,
    Some("FINANCE_SERVICE_URL"),
    "/api/finance"
);

// ============ TypedServiceClient<FinanceApi> 业务方法 ============

impl TypedServiceClient<FinanceApi> {
    /// 列出科目
    pub async fn list_accounts(&self) -> ServiceClientResult<Vec<serde_json::Value>> {
        self.get(&self.build_path("/accounts")).await
    }

    /// 获取科目
    pub async fn get_account(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/accounts/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 列出凭证
    pub async fn list_vouchers(
        &self,
        status: &str,
        period: &str,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/vouchers?status={}&period={}", status, period);
        self.get(&self.build_path(&path)).await
    }

    /// 创建凭证
    pub async fn create_voucher(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/vouchers"), data).await
    }

    /// 获取试算平衡表
    pub async fn get_trial_balance(&self, period: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/trial-balance/{}", period);
        self.get(&self.build_path(&path)).await
    }

    /// 获取资产负债表
    pub async fn get_balance_sheet(&self, period: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/balance-sheet/{}", period);
        self.get(&self.build_path(&path)).await
    }

    /// 获取利润表
    pub async fn get_income_statement(
        &self,
        period: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/income-statement/{}", period);
        self.get(&self.build_path(&path)).await
    }

    /// 获取仪表盘统计
    pub async fn get_dashboard_stats(&self) -> ServiceClientResult<serde_json::Value> {
        self.get(&self.build_path("/dashboard")).await
    }

    /// 提交审批
    pub async fn submit_approval(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/approvals/submit"), data).await
    }

    /// 审批通过
    pub async fn approve_approval(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/approvals/approve"), data)
            .await
    }

    /// 审批驳回
    pub async fn reject_approval(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/approvals/reject"), data).await
    }

    /// 取消审批
    pub async fn cancel_approval(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/approvals/cancel"), data).await
    }
}
