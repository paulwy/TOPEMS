use super::generic::ApiResponse;

crate::define_service_client!(
    QmsServiceClient,
    "QMS_SERVICE_URL",
    "http://localhost:8050",
    {
        list_standards(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/qms/quality-standards?page={}&pagesize={}"
        }
        get_standard(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/qms/quality-standards/{}"
        }
        list_inspections(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/qms/quality-inspections?page={}&pagesize={}"
        }
        get_inspection(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/qms/quality-inspections/{}"
        }
        list_issues(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/qms/quality-issues?page={}&pagesize={}"
        }
        get_issue(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/qms/quality-issues/{}"
        }
        get_dashboard_stats() -> ApiResponse<serde_json::Value> {
            get => "/api/qms/dashboard/stats"
        }
        list_audits(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/qms/quality-audits?page={}&pagesize={}"
        }
        list_corrective_actions(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/qms/corrective-actions?page={}&pagesize={}"
        }
        list_quality_tasks(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/qms/quality-tasks?page={}&pagesize={}"
        }
        get_quality_task(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/qms/quality-tasks/{}"
        }
        update_quality_task_status(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/qms/quality-tasks/{}/status"; body: data: &serde_json::Value
        }
        list_defect_records(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/qms/defect-records?page={}&pagesize={}"
        }
        report_defect() -> ApiResponse<serde_json::Value> {
            post => "/api/qms/defect-records"; body: data: &serde_json::Value
        }
    }
);

impl QmsServiceClient {
    /// 获取今日质量任务合格率（百分比，0.0 ~ 100.0）。
    ///
    /// TODO(数据归属迁移): 该聚合当前仍在 Mobile BFF 内直连 `plugin_mobile.quality_tasks`
    /// 表完成（见 svc/mobile/src/modules/workbench.rs）。QMS 服务目前没有 `quality_tasks`
    /// 表/路由（QMS 使用 qa_quality_inspections 等表），无法在 QMS 侧直接提供等价聚合端点。
    /// 待数据归属迁移至 QMS 后，在此实现端点调用：
    /// `get => "/api/qms/quality-tasks/today-pass-rate"`。
    pub async fn get_today_quality_pass_rate(&self) -> super::error::ServiceClientResult<f64> {
        Err(super::error::ServiceClientError::ConfigError(
            "get_today_quality_pass_rate 尚未实现：待 QMS 服务提供今日合格率聚合端点（当前数据归属 plugin_mobile.quality_tasks）".to_string(),
        ))
    }
}
