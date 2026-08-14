use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// 请假申请记录
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct LeaveRequest {
    pub id: Uuid,
    pub employee_id: Uuid,
    pub employee_name: String,
    /// 请假类型：annual(年假) / personal(事假) / sick(病假) / marriage(婚假) / maternity(产假) / bereavement(丧假) / comp_off(调休)
    pub leave_type: String,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    /// 开始日期是否为半天
    pub start_half_day: bool,
    /// 结束日期是否为半天
    pub end_half_day: bool,
    /// 请假天数（支持半天粒度，如 0.5 / 1.0 / 2.5）
    pub days: f64,
    pub reason: String,
    /// 状态：draft(草稿) / pending(待审批) / approved(已批准) / rejected(已驳回) / cancelled(已撤销)
    pub status: String,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub rejected_reason: Option<String>,
    pub tenant_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 创建请假申请请求
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateLeaveRequestRequest {
    pub employee_id: Uuid,
    pub employee_name: String,
    pub leave_type: String,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    #[serde(default)]
    pub start_half_day: bool,
    #[serde(default)]
    pub end_half_day: bool,
    pub reason: String,
}

/// 更新请假申请请求（仅 draft 状态可更新）
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateLeaveRequestRequest {
    pub leave_type: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub start_half_day: Option<bool>,
    pub end_half_day: Option<bool>,
    pub reason: Option<String>,
}

/// 审批操作请求（驳回时需填写 reason）
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ApproveLeaveRequestRequest {
    pub approved_by: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RejectLeaveRequestRequest {
    pub approved_by: String,
    pub rejected_reason: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{NaiveDate, Utc};

    fn sample_uuid() -> Uuid {
        Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
    }

    #[test]
    fn test_leave_request_full() {
        let lr = LeaveRequest {
            id: sample_uuid(),
            employee_id: sample_uuid(),
            employee_name: "张三".into(),
            leave_type: "annual".into(),
            start_date: NaiveDate::from_ymd_opt(2025, 6, 1).unwrap(),
            end_date: NaiveDate::from_ymd_opt(2025, 6, 5).unwrap(),
            start_half_day: false,
            end_half_day: false,
            days: 5.0,
            reason: "年假休息".into(),
            status: "pending".into(),
            approved_by: None,
            approved_at: None,
            rejected_reason: None,
            tenant_id: "T-001".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&lr).unwrap();
        let lr2: LeaveRequest = serde_json::from_value(v).unwrap();
        assert_eq!(lr.employee_name, lr2.employee_name);
        assert_eq!(lr.leave_type, lr2.leave_type);
        assert_eq!(lr.start_date, lr2.start_date);
        assert_eq!(lr.end_date, lr2.end_date);
        assert_eq!(lr.days, lr2.days);
        assert_eq!(lr.status, lr2.status);
    }

    #[test]
    fn test_leave_request_half_day() {
        let lr = LeaveRequest {
            id: sample_uuid(),
            employee_id: sample_uuid(),
            employee_name: "李四".into(),
            leave_type: "sick".into(),
            start_date: NaiveDate::from_ymd_opt(2025, 7, 10).unwrap(),
            end_date: NaiveDate::from_ymd_opt(2025, 7, 10).unwrap(),
            start_half_day: true,
            end_half_day: true,
            days: 0.5,
            reason: "看病".into(),
            status: "approved".into(),
            approved_by: Some("王经理".into()),
            approved_at: Some(Utc::now()),
            rejected_reason: None,
            tenant_id: "T1".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let s = serde_json::to_string(&lr).unwrap();
        let lr2: LeaveRequest = serde_json::from_str(&s).unwrap();
        assert!(lr2.start_half_day);
        assert!(lr2.end_half_day);
        assert_eq!(lr2.days, 0.5);
        assert_eq!(lr2.approved_by, Some("王经理".into()));
    }

    #[test]
    fn test_leave_request_all_types() {
        let types = vec![
            "annual",
            "personal",
            "sick",
            "marriage",
            "maternity",
            "bereavement",
            "comp_off",
        ];
        for t in types {
            let lr = LeaveRequest {
                id: sample_uuid(),
                employee_id: sample_uuid(),
                employee_name: "测试".into(),
                leave_type: t.into(),
                start_date: NaiveDate::from_ymd_opt(2025, 1, 1).unwrap(),
                end_date: NaiveDate::from_ymd_opt(2025, 1, 1).unwrap(),
                start_half_day: false,
                end_half_day: false,
                days: 1.0,
                reason: t.into(),
                status: "draft".into(),
                approved_by: None,
                approved_at: None,
                rejected_reason: None,
                tenant_id: "X".into(),
                created_at: Utc::now(),
                updated_at: Utc::now(),
            };
            let v = serde_json::to_value(&lr).unwrap();
            let lr2: LeaveRequest = serde_json::from_value(v).unwrap();
            assert_eq!(lr2.leave_type, t);
        }
    }

    #[test]
    fn test_leave_request_all_statuses() {
        let statuses = vec!["draft", "pending", "approved", "rejected", "cancelled"];
        for s in statuses {
            let lr = LeaveRequest {
                id: sample_uuid(),
                employee_id: sample_uuid(),
                employee_name: "X".into(),
                leave_type: "personal".into(),
                start_date: NaiveDate::from_ymd_opt(2024, 12, 25).unwrap(),
                end_date: NaiveDate::from_ymd_opt(2024, 12, 25).unwrap(),
                start_half_day: false,
                end_half_day: false,
                days: 1.0,
                reason: "x".into(),
                status: s.into(),
                approved_by: if s == "rejected" {
                    Some("审批人".into())
                } else {
                    None
                },
                approved_at: if s == "approved" {
                    Some(Utc::now())
                } else {
                    None
                },
                rejected_reason: if s == "rejected" {
                    Some("理由不充分".into())
                } else {
                    None
                },
                tenant_id: "T".into(),
                created_at: Utc::now(),
                updated_at: Utc::now(),
            };
            let j = serde_json::to_value(&lr).unwrap();
            let lr2: LeaveRequest = serde_json::from_value(j).unwrap();
            assert_eq!(lr2.status, s);
        }
    }

    #[test]
    fn test_leave_request_fractional_days() {
        let lr = LeaveRequest {
            id: sample_uuid(),
            employee_id: sample_uuid(),
            employee_name: "王五".into(),
            leave_type: "personal".into(),
            start_date: NaiveDate::from_ymd_opt(2025, 8, 1).unwrap(),
            end_date: NaiveDate::from_ymd_opt(2025, 8, 3).unwrap(),
            start_half_day: true,
            end_half_day: false,
            days: 2.5,
            reason: "有事".into(),
            status: "pending".into(),
            approved_by: None,
            approved_at: None,
            rejected_reason: None,
            tenant_id: "T".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&lr).unwrap();
        let lr2: LeaveRequest = serde_json::from_value(v).unwrap();
        assert_eq!(lr2.days, 2.5);
        assert!(lr2.start_half_day);
        assert!(!lr2.end_half_day);
    }

    #[test]
    fn test_create_leave_request_request() {
        let r = CreateLeaveRequestRequest {
            employee_id: sample_uuid(),
            employee_name: "赵六".into(),
            leave_type: "marriage".into(),
            start_date: NaiveDate::from_ymd_opt(2025, 10, 1).unwrap(),
            end_date: NaiveDate::from_ymd_opt(2025, 10, 10).unwrap(),
            start_half_day: false,
            end_half_day: false,
            reason: "结婚".into(),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: CreateLeaveRequestRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.leave_type, "marriage");
        assert_eq!(r2.reason, "结婚");
    }

    #[test]
    fn test_update_leave_request_request() {
        let r = UpdateLeaveRequestRequest {
            leave_type: Some("comp_off".into()),
            start_date: Some(NaiveDate::from_ymd_opt(2025, 5, 1).unwrap()),
            end_date: None,
            start_half_day: Some(true),
            end_half_day: None,
            reason: Some("调休".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: UpdateLeaveRequestRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.leave_type, Some("comp_off".into()));
        assert_eq!(r2.start_half_day, Some(true));
    }

    #[test]
    fn test_approve_leave_request_request() {
        let r = ApproveLeaveRequestRequest {
            approved_by: "审批人001".into(),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: ApproveLeaveRequestRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.approved_by, "审批人001");
    }

    #[test]
    fn test_reject_leave_request_request() {
        let r = RejectLeaveRequestRequest {
            approved_by: "经理A".into(),
            rejected_reason: "人手不足，不予批准".into(),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: RejectLeaveRequestRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.approved_by, "经理A");
        assert_eq!(r2.rejected_reason, "人手不足，不予批准");
    }
}
