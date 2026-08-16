use serde_json::json;
use uuid::Uuid;

use topems_shared_event::event::{
    generate_master_data_id, MasterDataAction, MasterDataDomain, MasterDataEvent,
};

/// MDM 主数据事件发布服务 - SCM 供应商领域
#[derive(Clone)]
pub struct MdmEventService;

impl MdmEventService {
    pub fn new() -> Self {
        Self
    }

    /// 发布供应商主数据变更事件
    pub async fn publish_supplier_event(
        &self,
        supplier_id: Uuid,
        code: &str,
        name: &str,
        contact_name: Option<&str>,
        contact_phone: Option<&str>,
        email: Option<&str>,
        status: &str,
        action: MasterDataAction,
        changed_fields: Option<Vec<String>>,
    ) {
        let master_data_id = generate_master_data_id(MasterDataDomain::Supplier);

        let payload = json!({
            "id": supplier_id,
            "master_data_id": master_data_id,
            "code": code,
            "name": name,
            "contact_name": contact_name,
            "contact_phone": contact_phone,
            "email": email,
            "status": status,
        });

        let mut event = MasterDataEvent::new(
            Uuid::nil(), // SCM 暂不使用租户隔离
            MasterDataDomain::Supplier,
            action,
            master_data_id.clone(),
            name.to_string(),
            "scm",
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
            tracing::warn!("[scm-mdm] 供应商事件 Redis 发布失败: {}", e);
        }

        // 发布到 RabbitMQ
        if let Err(e) = event.publish_to_rabbitmq().await {
            tracing::warn!("[scm-mdm] 供应商事件 RabbitMQ 发布失败: {}", e);
        }

        tracing::debug!(
            "[scm-mdm] 供应商主数据事件发布成功 - action={:?}, supplier_id={}, master_data_id={}",
            action,
            supplier_id,
            master_data_id
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use topems_shared_event::event::MasterDataAction;

    #[test]
    fn new_returns_service_instance() {
        let _svc = MdmEventService::new();
    }

    #[test]
    fn service_is_cloneable() {
        let svc = MdmEventService::new();
        let _cloned = svc.clone();
    }

    #[tokio::test]
    async fn publish_supplier_event_does_not_panic_on_create_action() {
        // This exercises the event-building logic. Network publishes are best-effort
        // and swallow errors, so this should not panic even without brokers.
        let svc = MdmEventService::new();
        let supplier_id = Uuid::new_v4();
        // Use a short timeout to avoid hanging the test if Redis/RabbitMQ are unreachable.
        let result = tokio::time::timeout(
            std::time::Duration::from_millis(500),
            svc.publish_supplier_event(
                supplier_id,
                "SUP-001",
                "Acme Corp",
                Some("Alice"),
                Some("13800000000"),
                Some("alice@acme.com"),
                "active",
                MasterDataAction::Created,
                None,
            ),
        )
        .await;
        // We don't assert Ok/Err because the underlying publish is best-effort;
        // the goal is to ensure the event-building code path executes without panicking.
        assert!(result.is_ok(), "publish_supplier_event should not hang");
    }

    #[test]
    fn master_data_action_variants_are_usable() {
        // Smoke test that the action enum variants referenced by the service exist.
        let _ = MasterDataAction::Created;
        let _ = MasterDataAction::Updated;
        let _ = MasterDataAction::Deleted;
        let _ = MasterDataAction::Activated;
        let _ = MasterDataAction::Deactivated;
    }
}
