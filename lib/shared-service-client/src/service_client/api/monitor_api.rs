//! Monitor（监控）服务 API trait 定义

use super::super::error::ServiceClientResult;
use super::super::trait_api::TypedServiceClient;
use crate::define_service_api;

define_service_api!(
    MonitorApi,
    "unified-core",
    8000,
    Some("MONITOR_SERVICE_URL"),
    "/api/core/monitor"
);

// ============ TypedServiceClient<MonitorApi> 业务方法 ============

impl TypedServiceClient<MonitorApi> {
    /// 获取服务状态
    pub async fn get_service_status(&self) -> ServiceClientResult<serde_json::Value> {
        self.get(&self.build_path("/services/status")).await
    }

    /// 列出告警
    pub async fn list_alerts(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/alerts?page={}&pagesize={}", page, page_size);
        self.get(&self.build_path(&path)).await
    }

    /// 获取告警
    pub async fn get_alert(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/alerts/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 列出指标
    pub async fn list_metrics(&self) -> ServiceClientResult<Vec<serde_json::Value>> {
        self.get(&self.build_path("/metrics")).await
    }

    /// 获取指标数据
    pub async fn get_metric_data(
        &self,
        metric_name: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/metrics/{}/data", metric_name);
        self.get(&self.build_path(&path)).await
    }

    /// 获取仪表盘统计
    pub async fn get_dashboard_stats(&self) -> ServiceClientResult<serde_json::Value> {
        self.get(&self.build_path("/dashboard/stats")).await
    }

    /// 确认告警
    pub async fn acknowledge_alert(
        &self,
        id: &str,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/alerts/{}/acknowledge", id);
        self.put(&self.build_path(&path), data).await
    }
}
