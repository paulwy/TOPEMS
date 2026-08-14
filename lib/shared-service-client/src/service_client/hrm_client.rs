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

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_dt() -> chrono::DateTime<chrono::Utc> {
        "2024-01-01T00:00:00Z".parse().unwrap()
    }

    // ========== Employee serde tests ==========

    #[test]
    fn employee_serde_roundtrip_full() {
        let original = Employee {
            id: Uuid::nil(),
            name: "Alice".to_string(),
            email: "alice@example.com".to_string(),
            phone: Some("13800000000".to_string()),
            department_id: Some(Uuid::nil()),
            company_id: Uuid::nil(),
            status: "active".to_string(),
            created_at: sample_dt(),
            updated_at: sample_dt(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: Employee = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn employee_serde_roundtrip_with_none_fields() {
        let original = Employee {
            id: Uuid::nil(),
            name: "Bob".to_string(),
            email: "bob@example.com".to_string(),
            phone: None,
            department_id: None,
            company_id: Uuid::nil(),
            status: "inactive".to_string(),
            created_at: sample_dt(),
            updated_at: sample_dt(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: Employee = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn employee_deserialize_from_json() {
        let json = r#"{
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "Charlie",
            "email": "charlie@test.com",
            "phone": "13900000000",
            "department_id": "660e8400-e29b-41d4-a716-446655440000",
            "company_id": "770e8400-e29b-41d4-a716-446655440000",
            "status": "active",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-02T00:00:00Z"
        }"#;
        let emp: Employee = serde_json::from_str(json).unwrap();
        assert_eq!(emp.name, "Charlie");
        assert_eq!(emp.phone, Some("13900000000".to_string()));
        assert!(emp.department_id.is_some());
    }

    // ========== Department serde tests ==========

    #[test]
    fn department_serde_roundtrip_full() {
        let original = Department {
            id: Uuid::nil(),
            name: "Engineering".to_string(),
            description: Some("Engineering department".to_string()),
            company_id: Uuid::nil(),
            parent_id: Some(Uuid::nil()),
            created_at: sample_dt(),
            updated_at: sample_dt(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: Department = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn department_serde_roundtrip_without_optional_fields() {
        let original = Department {
            id: Uuid::nil(),
            name: "Sales".to_string(),
            description: None,
            company_id: Uuid::nil(),
            parent_id: None,
            created_at: sample_dt(),
            updated_at: sample_dt(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: Department = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    // ========== Company serde tests ==========

    #[test]
    fn company_serde_roundtrip_with_description() {
        let original = Company {
            id: Uuid::nil(),
            name: "Acme Corp".to_string(),
            code: "ACME".to_string(),
            description: Some("A company".to_string()),
            created_at: sample_dt(),
            updated_at: sample_dt(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: Company = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn company_serde_roundtrip_without_description() {
        let original = Company {
            id: Uuid::nil(),
            name: "Test Co".to_string(),
            code: "TEST".to_string(),
            description: None,
            created_at: sample_dt(),
            updated_at: sample_dt(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: Company = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    // ========== AttendanceRecord serde tests ==========

    #[test]
    fn attendance_record_serde_roundtrip_full() {
        let original = AttendanceRecord {
            id: "rec-001".to_string(),
            user_id: "user-001".to_string(),
            date: "2024-01-15".to_string(),
            check_in_time: Some("09:00:00".to_string()),
            check_out_time: Some("18:00:00".to_string()),
            status: "present".to_string(),
            created_at: "2024-01-15T09:00:00Z".to_string(),
            updated_at: "2024-01-15T18:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: AttendanceRecord = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn attendance_record_serde_roundtrip_without_times() {
        let original = AttendanceRecord {
            id: "rec-002".to_string(),
            user_id: "user-002".to_string(),
            date: "2024-01-16".to_string(),
            check_in_time: None,
            check_out_time: None,
            status: "absent".to_string(),
            created_at: "2024-01-16T00:00:00Z".to_string(),
            updated_at: "2024-01-16T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: AttendanceRecord = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    // ========== AttendanceStats serde tests ==========

    #[test]
    fn attendance_stats_serde_roundtrip() {
        let original = AttendanceStats {
            total_days: 30,
            present_days: 25,
            absent_days: 5,
            late_days: 3,
            overtime_hours: 10.5,
            total_work_hours: 200.0,
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: AttendanceStats = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn attendance_stats_deserialize_from_json() {
        let json = r#"{
            "total_days": 22,
            "present_days": 20,
            "absent_days": 2,
            "late_days": 1,
            "overtime_hours": 5.0,
            "total_work_hours": 160.0
        }"#;
        let stats: AttendanceStats = serde_json::from_str(json).unwrap();
        assert_eq!(stats.total_days, 22);
        assert_eq!(stats.present_days, 20);
        assert_eq!(stats.overtime_hours, 5.0);
    }

    // ========== LeaveApplication serde tests ==========

    #[test]
    fn leave_application_serde_roundtrip_with_reason() {
        let original = LeaveApplication {
            id: "leave-001".to_string(),
            user_id: "user-001".to_string(),
            leave_type: "annual".to_string(),
            start_date: "2024-02-01".to_string(),
            end_date: "2024-02-05".to_string(),
            duration_days: 5.0,
            reason: Some("Vacation".to_string()),
            status: "approved".to_string(),
            created_at: "2024-01-20T00:00:00Z".to_string(),
            updated_at: "2024-01-21T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: LeaveApplication = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn leave_application_serde_roundtrip_without_reason() {
        let original = LeaveApplication {
            id: "leave-002".to_string(),
            user_id: "user-002".to_string(),
            leave_type: "sick".to_string(),
            start_date: "2024-03-01".to_string(),
            end_date: "2024-03-02".to_string(),
            duration_days: 2.0,
            reason: None,
            status: "pending".to_string(),
            created_at: "2024-02-28T00:00:00Z".to_string(),
            updated_at: "2024-02-28T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: LeaveApplication = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    // ========== CheckInRequest serde tests ==========

    #[test]
    fn check_in_request_serde_roundtrip_with_address() {
        let original = CheckInRequest {
            user_id: "user-001".to_string(),
            lat: 39.9042,
            lng: 116.4074,
            address: Some("Beijing, China".to_string()),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: CheckInRequest = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn check_in_request_serde_roundtrip_without_address() {
        let original = CheckInRequest {
            user_id: "user-002".to_string(),
            lat: 31.2304,
            lng: 121.4737,
            address: None,
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: CheckInRequest = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    // ========== CheckOutRequest serde tests ==========

    #[test]
    fn check_out_request_serde_roundtrip() {
        let original = CheckOutRequest {
            user_id: "user-001".to_string(),
            lat: 39.9042,
            lng: 116.4074,
            address: Some("Office".to_string()),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: CheckOutRequest = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    // ========== CreateLeaveRequest serde tests ==========

    #[test]
    fn create_leave_request_serde_roundtrip_with_reason() {
        let original = CreateLeaveRequest {
            user_id: "user-001".to_string(),
            leave_type: "personal".to_string(),
            start_date: "2024-04-01".to_string(),
            end_date: "2024-04-03".to_string(),
            reason: Some("Personal matter".to_string()),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: CreateLeaveRequest = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn create_leave_request_serde_roundtrip_without_reason() {
        let original = CreateLeaveRequest {
            user_id: "user-002".to_string(),
            leave_type: "annual".to_string(),
            start_date: "2024-05-01".to_string(),
            end_date: "2024-05-07".to_string(),
            reason: None,
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: CreateLeaveRequest = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    // ========== HrmServiceClient construction tests ==========

    #[test]
    fn hrm_client_new_succeeds() {
        let client = HrmServiceClient::new("http://localhost:8020");
        assert!(client.is_ok());
    }

    #[test]
    fn hrm_client_new_with_empty_url_fails() {
        let result = HrmServiceClient::new("");
        assert!(result.is_err());
    }

    #[test]
    fn hrm_client_from_env_succeeds() {
        let client = HrmServiceClient::from_env();
        assert!(client.is_ok());
    }

    #[test]
    fn hrm_client_set_auth_token_does_not_panic() {
        let mut client = HrmServiceClient::new("http://localhost:8020").unwrap();
        client.set_auth_token("token-abc");
    }

    #[test]
    fn hrm_client_with_auth_token_returns_self() {
        let client = HrmServiceClient::new("http://localhost:8020").unwrap();
        let _client = client.with_auth_token("token-xyz");
    }

    #[test]
    fn hrm_client_add_header_does_not_panic() {
        let mut client = HrmServiceClient::new("http://localhost:8020").unwrap();
        client.add_header("X-Tenant-Id", "tenant-001");
    }

    #[tokio::test]
    async fn hrm_client_get_health_unreachable_returns_false() {
        let client = HrmServiceClient::new("http://127.0.0.1:1").unwrap();
        let result = client.get_health().await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), false);
    }

    #[tokio::test]
    async fn hrm_client_proxy_get_unreachable_returns_error() {
        let client = HrmServiceClient::new("http://127.0.0.1:1").unwrap();
        let result = client.proxy_get("/api/test", None, None).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn hrm_client_proxy_get_with_tenant_id_unreachable_returns_error() {
        let client = HrmServiceClient::new("http://127.0.0.1:1").unwrap();
        let result = client
            .proxy_get("/api/test", Some(&[("page", "1")]), Some("tenant-001"))
            .await;
        assert!(result.is_err());
    }
}
