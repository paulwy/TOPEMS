use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct AttendanceRecord {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub employee_id: Uuid,
    pub date: DateTime<Utc>,
    pub check_in: Option<DateTime<Utc>>,
    pub check_out: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub work_hours: Option<f64>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateAttendanceRequest {
    pub employee_id: Uuid,
    pub date: DateTime<Utc>,
    pub check_in: Option<DateTime<Utc>>,
    pub check_out: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub work_hours: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateAttendanceRequest {
    pub check_in: Option<DateTime<Utc>>,
    pub check_out: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub work_hours: Option<f64>,
    pub notes: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_attendance_record_creation() {
        let id = Uuid::new_v4();
        let tenant_id = Uuid::new_v4();
        let employee_id = Uuid::new_v4();
        let now = Utc::now();

        let record = AttendanceRecord {
            id,
            tenant_id,
            employee_id,
            date: now,
            check_in: Some(now),
            check_out: None,
            status: Some("present".to_string()),
            work_hours: Some(8.0),
            notes: Some("正常打卡".to_string()),
            created_at: now,
            updated_at: now,
        };

        assert_eq!(record.id, id);
        assert_eq!(record.tenant_id, tenant_id);
        assert_eq!(record.employee_id, employee_id);
        assert_eq!(record.status, Some("present".to_string()));
        assert_eq!(record.work_hours, Some(8.0));
    }

    #[test]
    fn test_attendance_record_defaults() {
        let id = Uuid::new_v4();
        let tenant_id = Uuid::new_v4();
        let employee_id = Uuid::new_v4();
        let now = Utc::now();

        let record = AttendanceRecord {
            id,
            tenant_id,
            employee_id,
            date: now,
            check_in: None,
            check_out: None,
            status: None,
            work_hours: None,
            notes: None,
            created_at: now,
            updated_at: now,
        };

        assert!(record.check_in.is_none());
        assert!(record.check_out.is_none());
        assert!(record.status.is_none());
        assert!(record.work_hours.is_none());
    }

    #[test]
    fn test_create_attendance_request() {
        let employee_id = Uuid::new_v4();
        let now = Utc::now();

        let req = CreateAttendanceRequest {
            employee_id,
            date: now,
            check_in: Some(now),
            check_out: None,
            status: Some("late".to_string()),
            work_hours: Some(7.5),
            notes: Some("迟到10分钟".to_string()),
        };

        assert_eq!(req.employee_id, employee_id);
        assert_eq!(req.status, Some("late".to_string()));
        assert_eq!(req.work_hours, Some(7.5));
    }

    #[test]
    fn test_update_attendance_request_partial() {
        let req = UpdateAttendanceRequest {
            check_in: None,
            check_out: Some(Utc::now()),
            status: Some("left_early".to_string()),
            work_hours: None,
            notes: None,
        };

        assert!(req.check_in.is_none());
        assert!(req.check_out.is_some());
        assert_eq!(req.status, Some("left_early".to_string()));
    }

    #[test]
    fn test_attendance_clone_and_debug() {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let record = AttendanceRecord {
            id,
            tenant_id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            date: now,
            check_in: None,
            check_out: None,
            status: Some("absent".to_string()),
            work_hours: None,
            notes: None,
            created_at: now,
            updated_at: now,
        };

        let cloned = record.clone();
        assert_eq!(record.id, cloned.id);
        assert_eq!(record.status, cloned.status);

        let debug_str = format!("{:?}", record);
        assert!(!debug_str.is_empty());
    }
}
