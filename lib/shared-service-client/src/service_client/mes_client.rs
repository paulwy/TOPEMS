use super::generic::ApiResponse;

crate::define_service_client!(
    MesServiceClient,
    "MES_SERVICE_URL",
    "http://localhost:8030",
    {
        list_production_orders(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/mes/production-orders?page={}&pagesize={}"
        }
        get_production_order(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/mes/production-orders/{}"
        }
        list_work_stations(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/mes/work-stations?page={}&pagesize={}"
        }
        get_work_station(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/mes/work-stations/{}"
        }
        list_equipment(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/mes/equipment?page={}&pagesize={}"
        }
        get_equipment(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/mes/equipment/{}"
        }
        list_materials(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/mes/materials?page={}&pagesize={}"
        }
        get_wip_summary() -> ApiResponse<serde_json::Value> {
            get => "/api/mes/wip/summary"
        }
        get_quality_traceability(batch_no: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/mes/quality-traceability/{}"
        }
        get_equipment_oee(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/mes/equipment/{}/oee"
        }
        list_work_reports(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/mes/work-reports?page={}&pagesize={}"
        }
        submit_work_report() -> ApiResponse<serde_json::Value> {
            post => "/api/mes/work-reports"; body: data: &serde_json::Value
        }
    }
);

impl MesServiceClient {
    /// 获取指定操作员今日的生产合格品产量汇总（good_quantity 之和）。
    ///
    /// TODO(数据归属迁移): 该聚合当前仍在 Mobile BFF 内直连 `plugin_mobile.work_reports`
    /// 表完成（见 svc/mobile/src/modules/workbench.rs）。MES 服务自身维护的 `work_reports`
    /// 表字段不同（reporter_name / output_quantity，无 operator / good_quantity 列），
    /// 无法在 MES 侧直接提供等价聚合端点。待数据归属迁移至 MES 后，在此实现端点调用：
    /// `get => "/api/mes/work-reports/today-output?operator={}"`。
    pub async fn get_today_production_output(
        &self,
        _operator: &str,
    ) -> super::error::ServiceClientResult<i64> {
        Err(super::error::ServiceClientError::ConfigError(
            "get_today_production_output 尚未实现：待 MES 服务提供按 operator 汇总今日 good_quantity 的端点（当前数据归属 plugin_mobile.work_reports）".to_string(),
        ))
    }
}
