use serde_json::json;
use uuid::Uuid;

use topems_shared_event::event::{
    generate_master_data_id, MasterDataAction, MasterDataDomain, MasterDataEvent,
};

/// MDM 主数据事件发布服务 - PDM 物料领域
#[derive(Clone)]
pub struct MdmEventService;

impl MdmEventService {
    pub fn new() -> Self {
        Self
    }

    /// 发布物料主数据变更事件
    pub async fn publish_material_event(
        &self,
        tenant_id: Uuid,
        material_id: Uuid,
        material_no: &str,
        name: &str,
        spec: Option<&str>,
        unit: Option<&str>,
        status: &str,
        action: MasterDataAction,
        changed_fields: Option<Vec<String>>,
    ) {
        let master_data_id = generate_master_data_id(MasterDataDomain::Material);

        let payload = json!({
            "id": material_id,
            "master_data_id": master_data_id,
            "material_no": material_no,
            "name": name,
            "spec": spec,
            "unit": unit,
            "status": status,
        });

        let mut event = MasterDataEvent::new(
            tenant_id,
            MasterDataDomain::Material,
            action,
            master_data_id.clone(),
            name.to_string(),
            "pdm",
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
            tracing::warn!("[pdm-mdm] 物料事件 Redis 发布失败: {}", e);
        }

        // 发布到 RabbitMQ
        if let Err(e) = event.publish_to_rabbitmq().await {
            tracing::warn!("[pdm-mdm] 物料事件 RabbitMQ 发布失败: {}", e);
        }

        tracing::info!(
            "[pdm-mdm] 物料主数据事件发布成功 - action={:?}, material_id={}, master_data_id={}",
            action,
            material_id,
            master_data_id
        );
    }
}
