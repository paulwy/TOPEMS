use super::error::EventResult;
use super::event_types::{
    EhsAccidentReportedPayload, EhsHazardReportedPayload, Event, EventType,
    HrmDepartmentCreatedPayload, HrmDepartmentDeletedPayload, HrmDepartmentUpdatedPayload,
    HrmEmployeeCreatedPayload, LimsInspectionAbnormalDetectedPayload,
    LimsInspectionResultSubmittedPayload, LimsSampleRegisteredPayload, PmProjectCreatedPayload,
    PmProjectUpdatedPayload, PmTaskCreatedPayload, PmTaskDeletedPayload, PmTaskUpdatedPayload,
    QmsCorrectiveActionCreatedPayload, QmsInspectionCompletedPayload,
};
use redis::Client;
use serde::Serialize;
use std::env;
use tracing::info;

/// Redis 事件发布者
pub struct EventPublisher {
    redis_client: Client,
    service_name: String,
}

impl EventPublisher {
    /// 创建新的事件发布者
    pub fn new(service_name: &str) -> EventResult<Self> {
        let redis_url =
            env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());

        let redis_client = Client::open(redis_url)?;

        Ok(Self {
            redis_client,
            service_name: service_name.to_string(),
        })
    }

    /// 发布事件（自动携带当前 trace context）
    pub async fn publish_event(
        &self,
        event_type: EventType,
        payload: impl Serialize,
    ) -> EventResult<()> {
        let payload_json = serde_json::to_value(&payload)?;
        let (trace_id, _) = crate::telemetry::get_current_trace_context();
        let event =
            Event::new(event_type, &self.service_name, payload_json).with_trace_id(trace_id);

        let channel_name = format!("topems:events:{}", event_type);
        let event_json = serde_json::to_string(&event)?;

        let mut con = self.redis_client.get_multiplexed_async_connection().await?;

        let _: () = redis::cmd("PUBLISH")
            .arg(&channel_name)
            .arg(&event_json)
            .query_async(&mut con)
            .await?;

        info!(
            "事件发布成功 - 类型: {:?}, 事件ID: {}, 频道: {}",
            event_type, event.event_id, channel_name
        );

        Ok(())
    }

    /// 发布 HRM 员工创建事件
    pub async fn publish_hrm_employee_created(
        &self,
        employee_id: uuid::Uuid,
        name: &str,
        email: &str,
        department_id: Option<uuid::Uuid>,
    ) -> EventResult<()> {
        let payload = HrmEmployeeCreatedPayload {
            employee_id,
            name: name.to_string(),
            email: email.to_string(),
            department_id,
        };
        self.publish_event(EventType::HrmEmployeeCreated, payload)
            .await
    }

    /// 发布 PM 项目创建事件
    pub async fn publish_pm_project_created(
        &self,
        project_id: uuid::Uuid,
        project_name: &str,
        owner_id: uuid::Uuid,
    ) -> EventResult<()> {
        let payload = PmProjectCreatedPayload {
            project_id,
            project_name: project_name.to_string(),
            owner_id,
        };
        self.publish_event(EventType::PmProjectCreated, payload)
            .await
    }

    pub async fn publish_pm_project_updated(
        &self,
        project_id: uuid::Uuid,
        updated_fields: Vec<String>,
        old_data: Option<serde_json::Value>,
        new_data: Option<serde_json::Value>,
    ) -> EventResult<()> {
        let payload = PmProjectUpdatedPayload {
            project_id,
            updated_fields,
            old_data,
            new_data,
        };
        self.publish_event(EventType::PmProjectUpdated, payload)
            .await
    }

    pub async fn publish_pm_task_created(
        &self,
        task_id: uuid::Uuid,
        project_id: uuid::Uuid,
        task_name: &str,
    ) -> EventResult<()> {
        let payload = PmTaskCreatedPayload {
            task_id,
            project_id,
            task_name: task_name.to_string(),
        };
        self.publish_event(EventType::PmTaskCreated, payload).await
    }

    pub async fn publish_pm_task_updated(
        &self,
        task_id: uuid::Uuid,
        project_id: uuid::Uuid,
        updated_fields: Vec<String>,
        old_data: Option<serde_json::Value>,
        new_data: Option<serde_json::Value>,
    ) -> EventResult<()> {
        let payload = PmTaskUpdatedPayload {
            task_id,
            project_id,
            updated_fields,
            old_data,
            new_data,
        };
        self.publish_event(EventType::PmTaskUpdated, payload).await
    }

    pub async fn publish_pm_task_deleted(
        &self,
        task_id: uuid::Uuid,
        project_id: uuid::Uuid,
        deleted_by: Option<uuid::Uuid>,
    ) -> EventResult<()> {
        let payload = PmTaskDeletedPayload {
            task_id,
            project_id,
            deleted_by,
        };
        self.publish_event(EventType::PmTaskDeleted, payload).await
    }

    pub async fn publish_hrm_department_created(
        &self,
        department_id: uuid::Uuid,
        department_name: &str,
        parent_id: Option<uuid::Uuid>,
    ) -> EventResult<()> {
        let payload = HrmDepartmentCreatedPayload {
            department_id,
            department_name: department_name.to_string(),
            parent_id,
        };
        self.publish_event(EventType::HrmDepartmentCreated, payload)
            .await
    }

    pub async fn publish_hrm_department_updated(
        &self,
        department_id: uuid::Uuid,
        updated_fields: Vec<String>,
        old_data: Option<serde_json::Value>,
        new_data: Option<serde_json::Value>,
    ) -> EventResult<()> {
        let payload = HrmDepartmentUpdatedPayload {
            department_id,
            updated_fields,
            old_data,
            new_data,
        };
        self.publish_event(EventType::HrmDepartmentUpdated, payload)
            .await
    }

    pub async fn publish_hrm_department_deleted(
        &self,
        department_id: uuid::Uuid,
        department_name: &str,
        deleted_by: Option<uuid::Uuid>,
    ) -> EventResult<()> {
        let payload = HrmDepartmentDeletedPayload {
            department_id,
            department_name: department_name.to_string(),
            deleted_by,
        };
        self.publish_event(EventType::HrmDepartmentDeleted, payload)
            .await
    }

    // --- LIMS Events ---

    pub async fn publish_lims_sample_registered(
        &self,
        sample_id: uuid::Uuid,
        sample_no: &str,
        sample_name: &str,
        sample_type: Option<&str>,
        source: Option<&str>,
    ) -> EventResult<()> {
        let payload = LimsSampleRegisteredPayload {
            sample_id,
            sample_no: sample_no.to_string(),
            sample_name: sample_name.to_string(),
            sample_type: sample_type.map(|s| s.to_string()),
            source: source.map(|s| s.to_string()),
        };
        self.publish_event(EventType::LimsSampleRegistered, payload)
            .await
    }

    pub async fn publish_lims_inspection_result_submitted(
        &self,
        payload: LimsInspectionResultSubmittedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::LimsInspectionResultSubmitted, payload)
            .await
    }

    pub async fn publish_lims_inspection_abnormal_detected(
        &self,
        payload: LimsInspectionAbnormalDetectedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::LimsInspectionAbnormalDetected, payload)
            .await
    }

    // --- QMS Events ---

    pub async fn publish_qms_inspection_completed(
        &self,
        payload: QmsInspectionCompletedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::QmsInspectionCompleted, payload)
            .await
    }

    pub async fn publish_qms_corrective_action_created(
        &self,
        action_id: uuid::Uuid,
        issue_id: uuid::Uuid,
        title: &str,
        description: Option<&str>,
        assigned_to: &str,
    ) -> EventResult<()> {
        let payload = QmsCorrectiveActionCreatedPayload {
            action_id,
            issue_id,
            title: title.to_string(),
            description: description.map(|s| s.to_string()),
            assigned_to: assigned_to.to_string(),
        };
        self.publish_event(EventType::QmsCorrectiveActionCreated, payload)
            .await
    }

    // --- EHS Events ---

    pub async fn publish_ehs_hazard_reported(
        &self,
        payload: EhsHazardReportedPayload,
    ) -> EventResult<()> {
        self.publish_event(EventType::EhsHazardReported, payload)
            .await
    }

    pub async fn publish_ehs_accident_reported(
        &self,
        accident_id: uuid::Uuid,
        accident_no: &str,
        title: &str,
        severity: &str,
        location: Option<&str>,
        occurred_at: Option<&str>,
    ) -> EventResult<()> {
        let payload = EhsAccidentReportedPayload {
            accident_id,
            accident_no: accident_no.to_string(),
            title: title.to_string(),
            severity: severity.to_string(),
            location: location.map(|s| s.to_string()),
            occurred_at: occurred_at.map(|s| s.to_string()),
        };
        self.publish_event(EventType::EhsAccidentReported, payload)
            .await
    }
}
