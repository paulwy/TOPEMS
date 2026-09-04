//! MES（制造执行系统）服务 API trait 定义

use super::super::error::ServiceClientResult;
use super::super::trait_api::TypedServiceClient;
use crate::define_service_api;

define_service_api!(
    MesApi,
    "topems-mes",
    8030,
    Some("MES_SERVICE_URL"),
    "/api/mes"
);

// ============ TypedServiceClient<MesApi> 业务方法 ============

impl TypedServiceClient<MesApi> {
    /// 获取指定操作员今日的生产合格品产量汇总（good_quantity 之和）。
    pub async fn get_today_production_output(&self, operator: &str) -> ServiceClientResult<i64> {
        let path = format!("/work-reports/today-output?operator={}", operator);
        let resp: serde_json::Value = self.get(&self.build_path(&path)).await?;
        let output = resp.get("output").and_then(|v| v.as_i64()).unwrap_or(0);
        Ok(output)
    }

    /// 列出生产订单
    pub async fn list_production_orders(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/production-orders?page={}&pagesize={}", page, page_size);
        self.get(&self.build_path(&path)).await
    }

    /// 获取生产订单
    pub async fn get_production_order(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/production-orders/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 列出工位
    pub async fn list_work_stations(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/work-stations?page={}&pagesize={}", page, page_size);
        self.get(&self.build_path(&path)).await
    }

    /// 列出设备
    pub async fn list_equipment(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/equipment?page={}&pagesize={}", page, page_size);
        self.get(&self.build_path(&path)).await
    }

    /// 获取在制品汇总
    pub async fn get_wip_summary(&self) -> ServiceClientResult<serde_json::Value> {
        self.get(&self.build_path("/wip/summary")).await
    }

    /// 获取设备 OEE
    pub async fn get_equipment_oee(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/equipment/{}/oee", id);
        self.get(&self.build_path(&path)).await
    }

    /// 获取质量追溯
    pub async fn get_quality_traceability(
        &self,
        batch_no: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/quality-traceability/{}", batch_no);
        self.get(&self.build_path(&path)).await
    }

    /// 列出报工记录
    pub async fn list_work_reports(
        &self,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<Vec<serde_json::Value>> {
        let path = format!("/work-reports?page={}&pagesize={}", page, page_size);
        self.get(&self.build_path(&path)).await
    }

    /// 提交报工记录
    pub async fn submit_work_report(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/work-reports"), data).await
    }

    /// 获取设备详情
    pub async fn get_equipment(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/equipment/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// ERP 下达生产工单（POST /api/mes/orders/from-erp）
    /// payload: { "erp_order": ErpSalesOrderInfo, "planned_start_date": ..., "notes": ... }
    pub async fn create_from_erp(
        &self,
        data: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/orders/from-erp"), data).await
    }
}
