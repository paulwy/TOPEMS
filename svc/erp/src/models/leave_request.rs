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
