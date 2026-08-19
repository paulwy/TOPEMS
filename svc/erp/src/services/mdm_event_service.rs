#![allow(dead_code)]

use serde_json::json;
use uuid::Uuid;

use topems_shared_event::event::{
    generate_master_data_id, MasterDataAction, MasterDataDomain, MasterDataEvent,
};

/// MDM 主数据事件发布服务 - ERP 会计科目领域
#[derive(Clone)]
pub struct MdmEventService;

impl Default for MdmEventService {
    fn default() -> Self {
        Self::new()
    }
}

impl MdmEventService {
    /// Construct a new default instance. Prefer [`Default::default`] where semantically clear.
    pub fn new() -> Self {
        Self
    }

    /// 发布会计科目主数据变更事件
    pub async fn publish_account_subject_event(
        &self,
        tenant_id: Uuid,
        subject_id: Uuid,
        code: &str,
        name: &str,
        category: &str,
        parent_code: Option<&str>,
        status: &str,
        action: MasterDataAction,
        changed_fields: Option<Vec<String>>,
    ) {
        let master_data_id = generate_master_data_id(MasterDataDomain::AccountSubject);

        let payload = json!({
            "id": subject_id,
            "master_data_id": master_data_id,
            "code": code,
            "name": name,
            "category": category,
            "parent_code": parent_code,
            "status": status,
        });

        let mut event = MasterDataEvent::new(
            tenant_id,
            MasterDataDomain::AccountSubject,
            action,
            master_data_id.clone(),
            name.to_string(),
            "erp",
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
            tracing::warn!("[erp-mdm] 会计科目事件 Redis 发布失败: {}", e);
        }

        // 发布到 RabbitMQ
        if let Err(e) = event.publish_to_rabbitmq().await {
            tracing::warn!("[erp-mdm] 会计科目事件 RabbitMQ 发布失败: {}", e);
        }

        tracing::info!(
            "[erp-mdm] 会计科目主数据事件发布成功 - action={:?}, subject_id={}, master_data_id={}",
            action,
            subject_id,
            master_data_id
        );
    }
}
