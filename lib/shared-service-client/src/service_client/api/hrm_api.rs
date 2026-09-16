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
    pub email: Option<String>,
    pub phone: Option<String>,
    pub department_id: Option<Uuid>,
    pub company_id: Option<Uuid>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HrmDepartment {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub company_id: Option<Uuid>,
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
        self.get_items(&self.build_path("/employees")).await
    }

    /// 获取部门
    pub async fn get_department(&self, id: Uuid) -> ServiceClientResult<HrmDepartment> {
        let path = format!("/departments/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 列出部门
    pub async fn list_departments(&self) -> ServiceClientResult<Vec<HrmDepartment>> {
        self.get_items(&self.build_path("/departments")).await
    }

    /// 获取公司
    pub async fn get_company(&self, id: Uuid) -> ServiceClientResult<HrmCompany> {
        let path = format!("/companies/{}", id);
        self.get(&self.build_path(&path)).await
    }

    /// 列出公司
    pub async fn list_companies(&self) -> ServiceClientResult<Vec<HrmCompany>> {
        self.get_items(&self.build_path("/companies")).await
    }

    /// 获取考勤汇总
    pub async fn get_attendance_summary(
        &self,
        employee_id: Uuid,
        month: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!(
            "/attendance/summary?employee_id={}&month={}",
            employee_id, month
        );
        self.get(&self.build_path(&path)).await
    }

    /// 获取指定用户今日的打卡状态，返回 "checked_out" / "checked_in" / "not_checked_in"。
    pub async fn get_today_attendance_status(&self, user_id: &str) -> ServiceClientResult<String> {
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

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{TimeZone, Utc};

    fn rt<T: Serialize + serde::de::DeserializeOwned>(val: &T) -> T {
        let s = serde_json::to_string(val).unwrap();
        serde_json::from_str(&s).unwrap()
    }

    fn ts() -> chrono::DateTime<chrono::Utc> {
        Utc.with_ymd_and_hms(2026, 8, 15, 10, 30, 0).unwrap()
    }

    #[test]
    fn hrm_employee_roundtrip() {
        let e = HrmEmployee {
            id: Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap(),
            name: "Alice Smith".into(),
            email: "alice@company.com".into(),
            phone: Some("+86-138-0000-1111".into()),
            department_id: Some(Uuid::parse_str("22222222-2222-2222-2222-222222222222").unwrap()),
            company_id: Uuid::parse_str("33333333-3333-3333-3333-333333333333").unwrap(),
            status: "active".into(),
            created_at: ts(),
            updated_at: ts(),
        };
        let back = rt(&e);
        assert_eq!(back.name, "Alice Smith");
        assert_eq!(back.email, "alice@company.com");
        assert_eq!(back.phone.as_deref(), Some("+86-138-0000-1111"));
        assert_eq!(back.status, "active");
    }

    #[test]
    fn hrm_employee_minimal_optionals_none() {
        let e = HrmEmployee {
            id: Uuid::new_v4(),
            name: "Bob".into(),
            email: "bob@c.com".into(),
            phone: None,
            department_id: None,
            company_id: Uuid::new_v4(),
            status: "active".into(),
            created_at: ts(),
            updated_at: ts(),
        };
        let back = rt(&e);
        assert!(back.phone.is_none());
        assert!(back.department_id.is_none());
    }

    #[test]
    fn hrm_department_roundtrip() {
        let d = HrmDepartment {
            id: Uuid::parse_str("44444444-4444-4444-4444-444444444444").unwrap(),
            name: "Engineering".into(),
            description: Some("Dev team".into()),
            company_id: Uuid::parse_str("33333333-3333-3333-3333-333333333333").unwrap(),
            parent_id: None,
            created_at: ts(),
            updated_at: ts(),
        };
        let back = rt(&d);
        assert_eq!(back.name, "Engineering");
        assert_eq!(back.description.as_deref(), Some("Dev team"));
        assert!(back.parent_id.is_none());
    }

    #[test]
    fn hrm_company_roundtrip() {
        let c = HrmCompany {
            id: Uuid::parse_str("33333333-3333-3333-3333-333333333333").unwrap(),
            name: "TOPEMS Inc.".into(),
            code: "TOPEMS".into(),
            description: None,
            created_at: ts(),
            updated_at: ts(),
        };
        let back = rt(&c);
        assert_eq!(back.name, "TOPEMS Inc.");
        assert_eq!(back.code, "TOPEMS");
        assert!(back.description.is_none());
    }

    #[test]
    fn hrm_attendance_stats_roundtrip() {
        let s = HrmAttendanceStats {
            total_days: 22,
            present_days: 20,
            absent_days: 1,
            late_days: 1,
            overtime_hours: 8.5,
            total_work_hours: 176.0,
        };
        let back = rt(&s);
        assert_eq!(back.total_days, 22);
        assert_eq!(back.present_days, 20);
        assert_eq!(back.absent_days, 1);
        assert_eq!(back.late_days, 1);
        assert!((back.overtime_hours - 8.5).abs() < 0.001);
        assert!((back.total_work_hours - 176.0).abs() < 0.001);
    }
}
