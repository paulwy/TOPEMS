use serde_json::json;
use uuid::Uuid;

use topems_shared::event::{
    generate_master_data_id, MasterDataAction, MasterDataDomain, MasterDataEvent,
};

/// MDM 主数据事件发布服务
#[derive(Clone)]
pub struct MdmEventService;

impl MdmEventService {
    pub fn new() -> Self {
        Self
    }

    /// 发布员工主数据变更事件
    pub async fn publish_employee_event(
        &self,
        tenant_id: Uuid,
        employee_id: Uuid,
        employee_number: &str,
        name: &str,
        email: Option<&str>,
        phone: Option<&str>,
        department_id: Option<Uuid>,
        status: &str,
        action: MasterDataAction,
        changed_fields: Option<Vec<String>>,
    ) {
        let master_data_id = generate_master_data_id(MasterDataDomain::Employee);

        let payload = json!({
            "id": employee_id,
            "master_data_id": master_data_id,
            "employee_number": employee_number,
            "name": name,
            "email": email,
            "phone": phone,
            "department_id": department_id,
            "status": status,
        });

        let mut event = MasterDataEvent::new(
            tenant_id,
            MasterDataDomain::Employee,
            action,
            master_data_id.clone(),
            employee_number.to_string(),
            "hrm",
            payload,
        );

        if let Some(fields) = changed_fields {
            event = event.with_changed_fields(fields);
        }

        // 根据状态判断是否需要发布激活/停用事件
        if action == MasterDataAction::Updated {
            if status == "active" {
                let mut activate_event = event.clone();
                activate_event.action = MasterDataAction::Activated;
                let _ = activate_event.publish_to_rabbitmq().await;
            } else if status == "inactive" {
                let mut deactivate_event = event.clone();
                deactivate_event.action = MasterDataAction::Deactivated;
                let _ = deactivate_event.publish_to_rabbitmq().await;
            }
        }

        // 发布到 Redis
        if let Err(e) = event.publish().await {
            tracing::warn!("[hrm-mdm] 员工事件 Redis 发布失败: {}", e);
        }

        // 发布到 RabbitMQ
        if let Err(e) = event.publish_to_rabbitmq().await {
            tracing::warn!("[hrm-mdm] 员工事件 RabbitMQ 发布失败: {}", e);
        }

        tracing::info!(
            "[hrm-mdm] 员工主数据事件发布成功 - action={:?}, employee_id={}, master_data_id={}",
            action,
            employee_id,
            master_data_id
        );
    }

    /// 发布部门主数据变更事件
    pub async fn publish_department_event(
        &self,
        tenant_id: Uuid,
        department_id: Uuid,
        code: Option<&str>,
        name: &str,
        parent_id: Option<Uuid>,
        manager_id: Option<Uuid>,
        company_id: Option<Uuid>,
        status: &str,
        action: MasterDataAction,
        changed_fields: Option<Vec<String>>,
    ) {
        let master_data_id = generate_master_data_id(MasterDataDomain::Organization);

        let payload = json!({
            "id": department_id,
            "master_data_id": master_data_id,
            "code": code,
            "name": name,
            "parent_id": parent_id,
            "manager_id": manager_id,
            "company_id": company_id,
            "status": status,
        });

        let mut event = MasterDataEvent::new(
            tenant_id,
            MasterDataDomain::Organization,
            action,
            master_data_id.clone(),
            name.to_string(),
            "hrm",
            payload,
        );

        if let Some(fields) = changed_fields {
            event = event.with_changed_fields(fields);
        }

        // 根据状态判断是否需要发布激活/停用事件
        if action == MasterDataAction::Updated {
            if status == "active" {
                let mut activate_event = event.clone();
                activate_event.action = MasterDataAction::Activated;
                let _ = activate_event.publish_to_rabbitmq().await;
            } else if status == "inactive" {
                let mut deactivate_event = event.clone();
                deactivate_event.action = MasterDataAction::Deactivated;
                let _ = deactivate_event.publish_to_rabbitmq().await;
            }
        }

        // 发布到 Redis
        if let Err(e) = event.publish().await {
            tracing::warn!("[hrm-mdm] 部门事件 Redis 发布失败: {}", e);
        }

        // 发布到 RabbitMQ
        if let Err(e) = event.publish_to_rabbitmq().await {
            tracing::warn!("[hrm-mdm] 部门事件 RabbitMQ 发布失败: {}", e);
        }

        tracing::info!(
            "[hrm-mdm] 部门主数据事件发布成功 - action={:?}, department_id={}, master_data_id={}",
            action,
            department_id,
            master_data_id
        );
    }

    /// 发布公司主数据变更事件
    pub async fn publish_company_event(
        &self,
        tenant_id: Uuid,
        company_id: Uuid,
        code: &str,
        name: &str,
        status: &str,
        action: MasterDataAction,
    ) {
        let master_data_id = generate_master_data_id(MasterDataDomain::Organization);

        let payload = json!({
            "id": company_id,
            "master_data_id": master_data_id,
            "code": code,
            "name": name,
            "status": status,
        });

        let event = MasterDataEvent::new(
            tenant_id,
            MasterDataDomain::Organization,
            action,
            master_data_id.clone(),
            name.to_string(),
            "hrm",
            payload,
        );

        // 发布到 Redis
        if let Err(e) = event.publish().await {
            tracing::warn!("[hrm-mdm] 公司事件 Redis 发布失败: {}", e);
        }

        // 发布到 RabbitMQ
        if let Err(e) = event.publish_to_rabbitmq().await {
            tracing::warn!("[hrm-mdm] 公司事件 RabbitMQ 发布失败: {}", e);
        }

        tracing::info!(
            "[hrm-mdm] 公司主数据事件发布成功 - action={:?}, company_id={}, master_data_id={}",
            action,
            company_id,
            master_data_id
        );
    }
}
