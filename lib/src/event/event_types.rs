use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// 事件类型枚举
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum EventType {
    /// HRM 相关事件
    HrmEmployeeCreated,
    HrmEmployeeUpdated,
    HrmEmployeeDeleted,
    HrmDepartmentCreated,
    HrmDepartmentUpdated,
    HrmDepartmentDeleted,

    /// PM 相关事件
    PmProjectCreated,
    PmProjectUpdated,
    PmTaskCreated,
    PmTaskUpdated,
    PmTaskDeleted,

    /// 通用事件
    HealthCheck,
}

/// 事件实体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    /// 事件唯一标识
    pub event_id: Uuid,
    /// 事件类型
    pub event_type: EventType,
    /// 事件源模块
    pub source: String,
    /// 事件数据（JSON 格式）
    pub payload: serde_json::Value,
    /// 发生时间
    pub occurred_at: DateTime<Utc>,
}

impl Event {
    /// 创建新事件
    pub fn new(event_type: EventType, source: &str, payload: serde_json::Value) -> Self {
        Self {
            event_id: Uuid::new_v4(),
            event_type,
            source: source.to_string(),
            payload,
            occurred_at: Utc::now(),
        }
    }
}

// --- HRM 事件专用 ---

/// HRM 员工创建事件 Payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HrmEmployeeCreatedPayload {
    pub employee_id: Uuid,
    pub name: String,
    pub email: String,
    pub department_id: Option<Uuid>,
}

/// HRM 员工更新事件 Payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HrmEmployeeUpdatedPayload {
    pub employee_id: Uuid,
    pub updated_fields: Vec<String>,
    pub old_data: Option<serde_json::Value>,
    pub new_data: Option<serde_json::Value>,
}

// --- PM 事件专用 ---

/// PM 项目创建事件 Payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PmProjectCreatedPayload {
    pub project_id: Uuid,
    pub project_name: String,
    pub owner_id: Uuid,
}

/// PM 任务创建事件 Payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PmTaskCreatedPayload {
    pub task_id: Uuid,
    pub project_id: Uuid,
    pub task_name: String,
}

/// PM 项目更新事件 Payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PmProjectUpdatedPayload {
    pub project_id: Uuid,
    pub updated_fields: Vec<String>,
    pub old_data: Option<serde_json::Value>,
    pub new_data: Option<serde_json::Value>,
}

/// PM 任务更新事件 Payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PmTaskUpdatedPayload {
    pub task_id: Uuid,
    pub project_id: Uuid,
    pub updated_fields: Vec<String>,
    pub old_data: Option<serde_json::Value>,
    pub new_data: Option<serde_json::Value>,
}

/// PM 任务删除事件 Payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PmTaskDeletedPayload {
    pub task_id: Uuid,
    pub project_id: Uuid,
    pub deleted_by: Option<Uuid>,
}

// --- HRM 部门事件专用 ---

/// HRM 部门创建事件 Payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HrmDepartmentCreatedPayload {
    pub department_id: Uuid,
    pub department_name: String,
    pub parent_id: Option<Uuid>,
}

/// HRM 部门更新事件 Payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HrmDepartmentUpdatedPayload {
    pub department_id: Uuid,
    pub updated_fields: Vec<String>,
    pub old_data: Option<serde_json::Value>,
    pub new_data: Option<serde_json::Value>,
}

/// HRM 部门删除事件 Payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HrmDepartmentDeletedPayload {
    pub department_id: Uuid,
    pub department_name: String,
    pub deleted_by: Option<Uuid>,
}

impl std::fmt::Display for EventType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}
