use super::base_client::BaseServiceClient;
use super::error::ServiceClientResult;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Employee {
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
pub struct Department {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub company_id: Uuid,
    pub parent_id: Option<Uuid>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Company {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttendanceRecord {
    pub id: String,
    pub user_id: String,
    pub date: String,
    pub check_in_time: Option<String>,
    pub check_out_time: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttendanceStats {
    pub total_days: i64,
    pub present_days: i64,
    pub absent_days: i64,
    pub late_days: i64,
    pub overtime_hours: f64,
    pub total_work_hours: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaveApplication {
    pub id: String,
    pub user_id: String,
    pub leave_type: String,
    pub start_date: String,
    pub end_date: String,
    pub duration_days: f64,
    pub reason: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckInRequest {
    pub user_id: String,
    pub lat: f64,
    pub lng: f64,
    pub address: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckOutRequest {
    pub user_id: String,
    pub lat: f64,
    pub lng: f64,
    pub address: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateLeaveRequest {
    pub user_id: String,
    pub leave_type: String,
    pub start_date: String,
    pub end_date: String,
    pub reason: Option<String>,
}

#[derive(Clone)]
pub struct HrmServiceClient {
    base_client: BaseServiceClient,
}

impl HrmServiceClient {
    pub fn new(base_url: impl Into<String>) -> ServiceClientResult<Self> {
        Ok(Self {
            base_client: BaseServiceClient::new(base_url)?,
        })
    }

    pub fn from_env() -> ServiceClientResult<Self> {
        let base_url =
            std::env::var("HRM_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8020".into());
        Self::new(base_url)
    }

    pub async fn get_health(&self) -> ServiceClientResult<bool> {
        match self.base_client.get_without_response("/health").await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    pub async fn get_employee(&self, id: Uuid) -> ServiceClientResult<Employee> {
        self.base_client
            .get(&format!("/api/employees/{}", id))
            .await
    }

    pub async fn get_department(&self, id: Uuid) -> ServiceClientResult<Department> {
        self.base_client
            .get(&format!("/api/departments/{}", id))
            .await
    }

    pub async fn get_company(&self, id: Uuid) -> ServiceClientResult<Company> {
        self.base_client
            .get(&format!("/api/companies/{}", id))
            .await
    }

    pub async fn list_employees(&self) -> ServiceClientResult<Vec<Employee>> {
        self.base_client.get("/api/employees").await
    }

    pub async fn list_departments(&self) -> ServiceClientResult<Vec<Department>> {
        self.base_client.get("/api/departments").await
    }

    pub async fn list_companies(&self) -> ServiceClientResult<Vec<Company>> {
        self.base_client.get("/api/companies").await
    }

    pub async fn get_attendance_overview(
        &self,
        user_id: &str,
    ) -> ServiceClientResult<serde_json::Value> {
        self.base_client
            .get(&format!("/api/hrm/attendance/overview?user_id={}", user_id))
            .await
    }

    pub async fn get_attendance_stats(
        &self,
        user_id: &str,
    ) -> ServiceClientResult<AttendanceStats> {
        self.base_client
            .get(&format!("/api/hrm/attendance/stats?user_id={}", user_id))
            .await
    }

    pub async fn list_attendance_records(
        &self,
        user_id: &str,
        month: Option<&str>,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<serde_json::Value> {
        let mut path = format!(
            "/api/hrm/attendance/records?user_id={}&page={}&pagesize={}",
            user_id, page, page_size
        );
        if let Some(m) = month {
            path.push_str(&format!("&month={}", m));
        }
        self.base_client.get(&path).await
    }

    pub async fn check_in(&self, data: &CheckInRequest) -> ServiceClientResult<AttendanceRecord> {
        self.base_client
            .post("/api/hrm/attendance/check-in", data)
            .await
    }

    pub async fn check_out(&self, data: &CheckOutRequest) -> ServiceClientResult<AttendanceRecord> {
        self.base_client
            .post("/api/hrm/attendance/check-out", data)
            .await
    }

    pub async fn list_leave_applications(
        &self,
        user_id: &str,
        status: Option<&str>,
        page: i32,
        page_size: i32,
    ) -> ServiceClientResult<serde_json::Value> {
        let mut path = format!(
            "/api/hrm/leave-applications?user_id={}&page={}&pagesize={}",
            user_id, page, page_size
        );
        if let Some(s) = status {
            path.push_str(&format!("&status={}", s));
        }
        self.base_client.get(&path).await
    }

    pub async fn apply_leave(
        &self,
        data: &CreateLeaveRequest,
    ) -> ServiceClientResult<LeaveApplication> {
        self.base_client
            .post("/api/hrm/leave-applications", data)
            .await
    }

    /// 获取指定用户今日的打卡状态，返回 "checked_out" / "checked_in" / "not_checked_in"。
    pub async fn get_today_attendance_status(&self, user_id: &str) -> ServiceClientResult<String> {
        let path = format!("/api/hrm/attendance/today-status?user_id={}", user_id);
        let resp: serde_json::Value = self.base_client.get(&path).await?;
        let status = resp
            .get("status")
            .and_then(|s| s.as_str())
            .unwrap_or("not_checked_in")
            .to_string();
        Ok(status)
    }

    pub fn set_auth_token(&mut self, token: impl Into<String>) {
        self.base_client.set_auth_token(token);
    }

    pub fn with_auth_token(mut self, token: impl Into<String>) -> Self {
        self.base_client.set_auth_token(token);
        self
    }

    pub fn add_header(&mut self, key: impl Into<String>, value: impl Into<String>) {
        self.base_client.add_header(key, value);
    }

    pub async fn proxy_get(
        &self,
        path: &str,
        query: Option<&[(&str, &str)]>,
        tenant_id: Option<&str>,
    ) -> Result<reqwest::Response, reqwest::Error> {
        let extra_headers: Vec<(&str, &str)> = if let Some(tid) = tenant_id {
            vec![("x-tenant-id", tid)]
        } else {
            vec![]
        };
        self.base_client
            .get_raw_response(path, query, &extra_headers)
            .await
    }
}
