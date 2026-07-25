//! QMS（质量管理系统）服务 API trait 定义

use super::super::error::ServiceClientResult;
use super::super::trait_api::TypedServiceClient;
use crate::define_service_api;

define_service_api!(
    QmsApi,
    "topems-qms",
    8050,
    Some("QMS_SERVICE_URL"),
    "/api/qms"
);

// ============ TypedServiceClient<QmsApi> 业务方法 ============

impl TypedServiceClient<QmsApi> {
    /// 获取今日质量任务合格率（百分比，0.0 ~ 100.0）。
    pub async fn get_today_quality_pass_rate(&self) -> ServiceClientResult<f64> {
        let path = "/quality-tasks/today-pass-rate";
        let resp: serde_json::Value = self.get(&self.build_path(path)).await?;
        let pass_rate = resp
            .get("pass_rate")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        Ok(pass_rate)
    }

    /// 列出质检标准
    pub async fn list_quality_standards(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/quality-standards?page={}&pagesize={}", page, page_size);
        self.get(&self.build_path(&path)).await
    }

    /// 获取质检标准
    pub async fn get_quality_standard(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/quality-standards/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 列出质检记录
    pub async fn list_quality_inspections(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/quality-inspections?page={}&pagesize={}", page, page_size);
        self.get(&self.build_path(&path)).await
    }

    /// 获取质检记录
    pub async fn get_quality_inspection(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/quality-inspections/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 列出质量问题
    pub async fn list_quality_issues(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/quality-issues?page={}&pagesize={}", page, page_size);
        self.get(&self.build_path(&path)).await
    }

    /// 获取质量问题
    pub async fn get_quality_issue(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/quality-issues/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 获取仪表板统计
    pub async fn get_dashboard_stats(&self) -> ServiceClientResult<serde_json::Value> {
        self.get(&self.build_path("/dashboard/stats")).await
    }

    /// 列出质检任务
    pub async fn list_quality_tasks(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/quality-tasks?page={}&pagesize={}", page, page_size);
        self.get(&self.build_path(&path)).await
    }

    /// 获取质检任务
    pub async fn get_quality_task(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/quality-tasks/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 更新质检任务状态
    pub async fn update_quality_task_status(
        &self,
        id: &str,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/quality-tasks/{}/status", id);
        self.put(&self.build_path(&path), data).await
    }

    /// 列出缺陷记录
    pub async fn list_defect_records(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/defect-records?page={}&pagesize={}", page, page_size);
        self.get(&self.build_path(&path)).await
    }

    /// 上报缺陷
    pub async fn report_defect(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/defect-records"), data).await
    }
}
