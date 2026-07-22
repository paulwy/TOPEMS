//! MDM 主数据变更事件
//!
//! 提供 5 大主数据域（客户/供应商/物料/组织/员工/科目）的统一事件结构。
//! 所有主数据变更都通过 MasterDataEvent 发布到 Redis 事件总线。

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// 5 大主数据域标识
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MasterDataDomain {
    Customer,
    Supplier,
    Material,
    Organization,
    Employee,
    AccountSubject,
}

impl MasterDataDomain {
    pub fn prefix(&self) -> &'static str {
        match self {
            MasterDataDomain::Customer => "cust",
            MasterDataDomain::Supplier => "supp",
            MasterDataDomain::Material => "mat",
            MasterDataDomain::Organization => "org",
            MasterDataDomain::Employee => "emp",
            MasterDataDomain::AccountSubject => "acct",
        }
    }

    pub fn table(&self) -> &'static str {
        match self {
            MasterDataDomain::Customer => "customers",
            MasterDataDomain::Supplier => "suppliers",
            MasterDataDomain::Material => "materials",
            MasterDataDomain::Organization => "organizations",
            MasterDataDomain::Employee => "employees",
            MasterDataDomain::AccountSubject => "account_subjects",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "customer" => Some(MasterDataDomain::Customer),
            "supplier" => Some(MasterDataDomain::Supplier),
            "material" => Some(MasterDataDomain::Material),
            "organization" => Some(MasterDataDomain::Organization),
            "employee" => Some(MasterDataDomain::Employee),
            "account_subject" => Some(MasterDataDomain::AccountSubject),
            _ => None,
        }
    }
}

/// 主数据变更动作
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MasterDataAction {
    Created,
    Updated,
    Deleted,
    Activated,
    Deactivated,
}

/// 主数据变更事件
///
/// 所有主数据变更必须通过此事件结构发布。消费端通过 domain + action 路由。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MasterDataEvent {
    /// 事件 ID（全局唯一）
    pub event_id: Uuid,
    /// 事件发生时间
    pub timestamp: DateTime<Utc>,
    /// 租户 ID（多租户隔离）
    pub tenant_id: Uuid,
    /// 主数据域
    pub domain: MasterDataDomain,
    /// 变更动作
    pub action: MasterDataAction,
    /// 主数据 ID（语义化 ID，如 cust-xxx）
    pub master_data_id: String,
    /// 业务编码（如 CUST001）
    pub code: String,
    /// 数据版本号
    pub version: i32,
    /// 事件来源服务（如 crm/srm/erp/hrm/finance）
    pub source_service: String,
    /// 变更字段（updated 时）
    #[serde(skip_serializing_if = "Vec::is_empty", default)]
    pub changed_fields: Vec<String>,
    /// 主数据全量快照
    pub payload: serde_json::Value,
    /// 操作人
    pub operator: Option<String>,
}

impl MasterDataEvent {
    /// 创建新事件
    pub fn new(
        tenant_id: Uuid,
        domain: MasterDataDomain,
        action: MasterDataAction,
        master_data_id: String,
        code: String,
        source_service: &str,
        payload: serde_json::Value,
    ) -> Self {
        Self {
            event_id: Uuid::new_v4(),
            timestamp: Utc::now(),
            tenant_id,
            domain,
            action,
            master_data_id,
            code,
            version: 1,
            source_service: source_service.to_string(),
            changed_fields: Vec::new(),
            payload,
            operator: None,
        }
    }

    /// 设置变更字段
    pub fn with_changed_fields(mut self, fields: Vec<String>) -> Self {
        self.changed_fields = fields;
        self
    }

    /// 设置操作人
    pub fn with_operator(mut self, operator: String) -> Self {
        self.operator = Some(operator);
        self
    }

    /// 设置版本号
    pub fn with_version(mut self, version: i32) -> Self {
        self.version = version;
        self
    }

    /// 路由键（用于 Redis Pub/Sub）
    pub fn routing_key(&self) -> String {
        format!(
            "master.{}.{}.{}",
            self.domain.prefix(),
            self.tenant_id,
            action_to_str(self.action)
        )
    }

    /// 频道名（Redis channel）
    pub fn channel(&self) -> String {
        format!("topems:master_data:{}", self.domain.prefix())
    }

    /// 发布事件到 Redis
    pub async fn publish(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let redis_url =
            std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());
        let client = redis::Client::open(redis_url)?;
        let mut con = client.get_multiplexed_async_connection().await?;

        let event_json = serde_json::to_string(self)?;
        let channel = self.channel();

        let _: () = redis::cmd("PUBLISH")
            .arg(&channel)
            .arg(&event_json)
            .query_async(&mut con)
            .await?;

        Ok(())
    }

    /// 创建事件发布者（用于批量发布）
    pub fn create_publisher() -> Result<MasterDataPublisher, redis::RedisError> {
        let redis_url =
            std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());
        let client = redis::Client::open(redis_url)?;
        Ok(MasterDataPublisher { client })
    }
}

/// MasterDataEvent 发布者（批量发布优化）
pub struct MasterDataPublisher {
    client: redis::Client,
}

impl MasterDataPublisher {
    /// 发布单个事件
    pub async fn publish(
        &self,
        event: &MasterDataEvent,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut con = self.client.get_multiplexed_async_connection().await?;
        let event_json = serde_json::to_string(event)?;
        let channel = event.channel();

        let _: () = redis::cmd("PUBLISH")
            .arg(&channel)
            .arg(&event_json)
            .query_async(&mut con)
            .await?;

        Ok(())
    }

    /// 批量发布事件
    pub async fn publish_batch(
        &self,
        events: &[MasterDataEvent],
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut con = self.client.get_multiplexed_async_connection().await?;

        for event in events {
            let event_json = serde_json::to_string(event)?;
            let channel = event.channel();

            let _: () = redis::cmd("PUBLISH")
                .arg(&channel)
                .arg(&event_json)
                .query_async(&mut con)
                .await?;
        }

        Ok(())
    }
}

fn action_to_str(action: MasterDataAction) -> &'static str {
    match action {
        MasterDataAction::Created => "created",
        MasterDataAction::Updated => "updated",
        MasterDataAction::Deleted => "deleted",
        MasterDataAction::Activated => "activated",
        MasterDataAction::Deactivated => "deactivated",
    }
}

/// 主数据引用（轻量级结构，用于跨服务引用）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MasterDataRef {
    pub master_data_id: String,
    pub code: String,
    pub name: String,
    pub version: i32,
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::StreamExt;
    use serde_json::json;

    #[test]
    fn test_event_routing_key() {
        let event = MasterDataEvent::new(
            Uuid::new_v4(),
            MasterDataDomain::Customer,
            MasterDataAction::Updated,
            "cust-001".to_string(),
            "CUST001".to_string(),
            "crm",
            json!({"id": "cust-001", "name": "测试客户"}),
        );
        let key = event.routing_key();
        assert!(key.starts_with("master.cust."));
        assert!(key.ends_with(".updated"));
    }

    #[test]
    fn test_event_serialize() {
        let event = MasterDataEvent::new(
            Uuid::new_v4(),
            MasterDataDomain::Employee,
            MasterDataAction::Created,
            "emp-001".to_string(),
            "EMP001".to_string(),
            "hrm",
            json!({"id": "emp-001", "name": "张三"}),
        )
        .with_operator("admin".to_string());

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"action\":\"created\""));
        assert!(json.contains("\"source_service\":\"hrm\""));
        assert!(json.contains("\"operator\":\"admin\""));
    }

    #[test]
    fn test_domain_prefix() {
        assert_eq!(MasterDataDomain::Customer.prefix(), "cust");
        assert_eq!(MasterDataDomain::Supplier.prefix(), "supp");
        assert_eq!(MasterDataDomain::Material.prefix(), "mat");
        assert_eq!(MasterDataDomain::Organization.prefix(), "org");
        assert_eq!(MasterDataDomain::Employee.prefix(), "emp");
        assert_eq!(MasterDataDomain::AccountSubject.prefix(), "acct");
    }

    #[tokio::test]
    async fn test_event_channel() {
        let event = MasterDataEvent::new(
            Uuid::new_v4(),
            MasterDataDomain::Customer,
            MasterDataAction::Created,
            "cust-001".to_string(),
            "CUST001".to_string(),
            "crm",
            json!({"id": "cust-001", "name": "测试客户"}),
        );
        assert_eq!(event.channel(), "topems:master_data:cust");
    }

    #[tokio::test]
    async fn test_event_publish_and_subscribe() {
        let redis_url =
            std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());
        let client = redis::Client::open(redis_url.clone()).unwrap();

        let tenant_id = Uuid::new_v4();
        let event = MasterDataEvent::new(
            tenant_id,
            MasterDataDomain::Customer,
            MasterDataAction::Created,
            "cust-test-001".to_string(),
            "CUSTTEST001".to_string(),
            "crm",
            json!({"id": "cust-test-001", "name": "测试客户", "email": "test@example.com"}),
        );

        let mut subscriber_con = client.get_async_connection().await.unwrap();
        let mut pubsub = subscriber_con.into_pubsub();
        pubsub.subscribe(&event.channel()).await.unwrap();
        let mut stream = pubsub.on_message();

        let publish_result = event.publish().await;
        assert!(publish_result.is_ok());

        let msg = tokio::time::timeout(tokio::time::Duration::from_secs(5), stream.next()).await;
        assert!(msg.is_ok());
        let msg = msg.unwrap();
        assert!(msg.is_some());

        let payload: String = msg.unwrap().get_payload().unwrap();
        let received_event: MasterDataEvent = serde_json::from_str(&payload).unwrap();

        assert_eq!(received_event.domain, MasterDataDomain::Customer);
        assert_eq!(received_event.action, MasterDataAction::Created);
        assert_eq!(received_event.master_data_id, "cust-test-001");
        assert_eq!(received_event.code, "CUSTTEST001");
        assert_eq!(received_event.source_service, "crm");
        assert_eq!(received_event.tenant_id, tenant_id);
    }

    #[tokio::test]
    async fn test_event_publisher_batch() {
        let tenant_id = Uuid::new_v4();
        let events = vec![
            MasterDataEvent::new(
                tenant_id,
                MasterDataDomain::Customer,
                MasterDataAction::Created,
                "cust-batch-001".to_string(),
                "CUSTBATCH001".to_string(),
                "crm",
                json!({"name": "客户1"}),
            ),
            MasterDataEvent::new(
                tenant_id,
                MasterDataDomain::Customer,
                MasterDataAction::Updated,
                "cust-batch-002".to_string(),
                "CUSTBATCH002".to_string(),
                "crm",
                json!({"name": "客户2"}),
            ),
        ];

        let publisher = MasterDataEvent::create_publisher().unwrap();
        let result = publisher.publish_batch(&events).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_all_domain_events_publish() {
        let domains = [
            (MasterDataDomain::Customer, "cust"),
            (MasterDataDomain::Supplier, "supp"),
            (MasterDataDomain::Material, "mat"),
            (MasterDataDomain::Organization, "org"),
            (MasterDataDomain::Employee, "emp"),
            (MasterDataDomain::AccountSubject, "acct"),
        ];

        let tenant_id = Uuid::new_v4();

        for (domain, prefix) in domains {
            let event = MasterDataEvent::new(
                tenant_id,
                domain,
                MasterDataAction::Created,
                format!("{}-test", prefix),
                format!("{}TEST", prefix.to_uppercase()),
                "test-service",
                json!({"name": "测试数据"}),
            );

            assert_eq!(event.domain.prefix(), prefix);
            assert_eq!(event.channel(), format!("topems:master_data:{}", prefix));

            let result = event.publish().await;
            assert!(result.is_ok());
        }
    }

    #[tokio::test]
    async fn test_event_with_changed_fields() {
        let event = MasterDataEvent::new(
            Uuid::new_v4(),
            MasterDataDomain::Customer,
            MasterDataAction::Updated,
            "cust-001".to_string(),
            "CUST001".to_string(),
            "crm",
            json!({"name": "更新后的名称"}),
        )
        .with_changed_fields(vec!["name".to_string(), "email".to_string()]);

        assert_eq!(event.changed_fields, vec!["name", "email"]);

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"changed_fields\":[\"name\",\"email\"]"));

        let result = event.publish().await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_event_deserialize_from_channel() {
        let redis_url =
            std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());
        let client = redis::Client::open(redis_url).unwrap();

        let tenant_id = Uuid::new_v4();
        let original_event = MasterDataEvent::new(
            tenant_id,
            MasterDataDomain::Supplier,
            MasterDataAction::Updated,
            "supp-001".to_string(),
            "SUPP001".to_string(),
            "srm",
            json!({"name": "更新供应商", "contact": "李四"}),
        )
        .with_operator("admin".to_string())
        .with_version(2);

        let mut subscriber_con = client.get_async_connection().await.unwrap();
        let mut pubsub = subscriber_con.into_pubsub();
        pubsub.subscribe(&original_event.channel()).await.unwrap();
        let mut stream = pubsub.on_message();

        let _ = original_event.publish().await;

        let msg = tokio::time::timeout(tokio::time::Duration::from_secs(5), stream.next()).await;
        assert!(msg.is_ok());

        let msg = msg.unwrap();
        assert!(msg.is_some());

        let payload: String = msg.unwrap().get_payload().unwrap();
        let received_event: MasterDataEvent = serde_json::from_str(&payload).unwrap();

        assert_eq!(received_event.event_id, original_event.event_id);
        assert_eq!(received_event.domain, original_event.domain);
        assert_eq!(received_event.action, original_event.action);
        assert_eq!(received_event.master_data_id, original_event.master_data_id);
        assert_eq!(received_event.code, original_event.code);
        assert_eq!(received_event.version, original_event.version);
        assert_eq!(received_event.source_service, original_event.source_service);
        assert_eq!(received_event.operator, original_event.operator);
    }
}
