//! HRM（人力资源）服务 API trait 定义

use super::super::error::ServiceClientResult;
use super::super::trait_api::TypedServiceClient;
use crate::define_service_api;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

define_service_api!(
    HrmApi,
    "topems-hrm",
    8020,
    Some("HRM_SERVICE_URL"),
    "/api/hrm"
);

// ============ 业务数据类型 ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HrmEmployee {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub department_id: Option<Uuid>,
    pub company_id: Uuid,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HrmDepartment {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub company_id: Uuid,
    pub parent_id: Option<Uuid>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HrmCompany {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HrmAttendanceStats {
    pub total_days: i64,
    pub present_days: i64,
    pub absent_days: i64,
    pub late_days: i64,
    pub overtime_hours: f64,
    pub total_work_hours: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct HrmCheckInRequest {
    pub user_id: String,
    pub lat: f64,
    pub lng: f64,
    pub address: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct HrmCheckOutRequest {
    pub user_id: String,
    pub lat: f64,
    pub lng: f64,
    pub address: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct HrmCreateLeaveRequest {
    pub user_id: String,
    pub leave_type: String,
    pub start_date: String,
    pub end_date: String,
    pub reason: Option<String>,
}

// ============ TypedServiceClient<HrmApi> 业务方法 ============

impl TypedServiceClient<HrmApi> {
    /// 获取员工
    pub async fn get_employee(&self, id: Uuid) -> ServiceClientResult<HrmEmployee> {
        let path = format!("/employees/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 列出员工
    pub async fn list_employees(&self) -> ServiceClientResult<Vec<HrmEmployee>> {
        self.get(&self.build_path("/employees")).await
    }

    /// 获取部门
    pub async fn get_department(&self, id: Uuid) -> ServiceClientResult<HrmDepartment> {
        let path = format!("/departments/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 列出部门
    pub async fn list_departments(&self) -> ServiceClientResult<Vec<HrmDepartment>> {
        self.get(&self.build_path("/departments")).await
    }

    /// 获取公司
    pub async fn get_company(&self, id: Uuid) -> ServiceClientResult<HrmCompany> {
        let path = format!("/companies/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 列出公司
    pub async fn list_companies(&self) -> ServiceClientResult<Vec<HrmCompany>> {
        self.get(&self.build_path("/companies")).await
    }

    /// 获取考勤汇总
    pub async fn get_attendance_summary(
        &self,
        employee_id: Uuid,
        month: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/attendance/summary?employee_id={}&month={}", employee_id, month);
        self.get(&self.build_path(&path)).await
    }

    /// 获取指定用户今日的打卡状态，返回 "checked_out" / "checked_in" / "not_checked_in"。
    pub async fn get_today_attendance_status(
        &self,
        user_id: &str,
    ) -> ServiceClientResult<String> {
        let path = format!("/attendance/today-status?user_id={}", user_id);
        let resp: serde_json::Value = self.get(&self.build_path(&path)).await?;
        let status = resp
            .get("status")
            .and_then(|s| s.as_str())
            .unwrap_or("not_checked_in")
            .to_string();
        Ok(status)
    }

    /// 获取考勤概览
    pub async fn get_attendance_overview(
        &self,
        user_id: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/attendance/overview?user_id={}", user_id);
        self.get(&self.build_path(&path)).await
    }

    /// 获取考勤统计
    pub async fn get_attendance_stats(
        &self,
        user_id: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/attendance/stats?user_id={}", user_id);
        self.get(&self.build_path(&path)).await
    }

    /// 获取考勤记录列表
    pub async fn list_attendance_records(
        &self,
        user_id: &str,
        month: Option<&str>,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<serde_json::Value> {
        let mut path = format!(
            "/attendance/records?user_id={}&page={}&pagesize={}",
            user_id, page, page_size
        );
        if let Some(m) = month {
            path.push_str(&format!("&month={}", m));
        }
        self.get(&self.build_path(&path)).await
    }

    /// 打卡签到
    pub async fn check_in(
        &self,
        data: &HrmCheckInRequest,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = self.build_path("/attendance/check-in");
        self.post(&path, data).await
    }

    /// 打卡签退
    pub async fn check_out(
        &self,
        data: &HrmCheckOutRequest,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = self.build_path("/attendance/check-out");
        self.post(&path, data).await
    }

    /// 获取请假申请列表
    pub async fn list_leave_applications(
        &self,
        user_id: &str,
        status: Option<&str>,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<serde_json::Value> {
        let mut path = format!(
            "/leave-applications?user_id={}&page={}&pagesize={}",
            user_id, page, page_size
        );
        if let Some(s) = status {
            path.push_str(&format!("&status={}", s));
        }
        self.get(&self.build_path(&path)).await
    }

    /// 申请请假
    pub async fn apply_leave(
        &self,
        data: &HrmCreateLeaveRequest,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = self.build_path("/leave-applications");
        self.post(&path, data).await
    }
}
