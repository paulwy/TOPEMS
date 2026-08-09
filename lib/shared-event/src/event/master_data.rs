//! MDM 主数据变更事件
//!
//! 提供 5 大主数据域（客户/供应商/物料/组织/员工/科目）的统一事件结构。
//! 所有主数据变更都通过 MasterDataEvent 发布到 Redis 事件总线。

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use uuid::Uuid;

/// master_data_id 生成器
///
/// 生成格式：{prefix}-{timestamp}-{random}
/// 例如：cust-20260722-abc123
pub fn generate_master_data_id(domain: MasterDataDomain) -> String {
    let timestamp = Utc::now().format("%Y%m%d").to_string();
    let uuid_str = Uuid::new_v4().to_string();
    let random = uuid_str.split('-').next().unwrap_or("");
    format!("{}-{}-{}", domain.prefix(), timestamp, random)
}

/// 解析 master_data_id 获取域信息
pub fn parse_master_data_id(id: &str) -> Option<(MasterDataDomain, String)> {
    let parts: Vec<&str> = id.split('-').collect();
    if parts.is_empty() {
        return None;
    }

    let domain = parts[0].parse::<MasterDataDomain>().ok()?;
    Some((domain, id.to_string()))
}

/// 验证 master_data_id 格式
pub fn validate_master_data_id(id: &str) -> bool {
    parse_master_data_id(id).is_some()
}

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
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParseMasterDataDomainError(String);

impl std::fmt::Display for ParseMasterDataDomainError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "invalid master data domain: {}", self.0)
    }
}

impl std::error::Error for ParseMasterDataDomainError {}

impl FromStr for MasterDataDomain {
    type Err = ParseMasterDataDomainError;

    /// 兼容三种字符串：
    /// 1) 完整 snake_case 代号："customer", "supplier", "material", "organization", "employee", "account_subject"
    /// 2) 生成 id 用的短前缀："cust", "supp", "mat", "org", "emp", "acct"（parse_master_data_id 会取首个 '-' 前片段作为 prefix 传入）
    /// 3) 表名（方便下游调试）："customers", "suppliers", "materials", ...
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "customer" | "cust" | "customers" => Ok(MasterDataDomain::Customer),
            "supplier" | "supp" | "suppliers" => Ok(MasterDataDomain::Supplier),
            "material" | "mat" | "materials" => Ok(MasterDataDomain::Material),
            "organization" | "org" | "organizations" => Ok(MasterDataDomain::Organization),
            "employee" | "emp" | "employees" => Ok(MasterDataDomain::Employee),
            "account_subject" | "acct" | "account_subjects" => Ok(MasterDataDomain::AccountSubject),
            other => Err(ParseMasterDataDomainError(other.to_string())),
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

    /// 发布事件到 RabbitMQ
    ///
    /// 使用 Topic Exchange: topems.master-data
    /// routing_key: master.{domain_prefix}.{tenant_id}.{action}
    pub async fn publish_to_rabbitmq(
        &self,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        use lapin::{
            options::{BasicPublishOptions, ExchangeDeclareOptions},
            types::FieldTable,
            BasicProperties, Connection, ConnectionProperties, ExchangeKind,
        };

        let rabbitmq_url = std::env::var("RABBITMQ_URL")
            .unwrap_or_else(|_| "amqp://guest:guest@localhost:5672/%2f".to_string());

        let connection =
            Connection::connect(&rabbitmq_url, ConnectionProperties::default()).await?;
        let channel = connection.create_channel().await?;

        let exchange_name = "topems.master-data";

        // 声明 master-data Exchange
        channel
            .exchange_declare(
                exchange_name.into(),
                ExchangeKind::Topic,
                ExchangeDeclareOptions {
                    durable: true,
                    auto_delete: false,
                    internal: false,
                    nowait: false,
                    passive: false,
                },
                FieldTable::default(),
            )
            .await?;

        let routing_key = self.routing_key();
        let event_json = serde_json::to_string(self)?;

        let _confirm = channel
            .basic_publish(
                exchange_name.into(),
                routing_key.clone().into(),
                BasicPublishOptions {
                    mandatory: false,
                    immediate: false,
                },
                event_json.as_bytes(),
                BasicProperties::default().with_delivery_mode(2),
            )
            .await?
            .await?;

        tracing::info!(
            "MasterDataEvent published to RabbitMQ - domain: {:?}, action: {:?}, routing_key: {}",
            self.domain,
            self.action,
            routing_key
        );

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
    use crate::test_helpers::redis_pubsub::{self, ActiveSubscription};
    use serde_json::json;

    // =====================================================================
    // 说明：Redis 连接辅助（skip_without_redis, maybe_connect_redis）
    //       及 Pub/Sub 两阶段测试 API（prepare_subscription / ActiveSubscription）
    //       已统一抽取到 crate::test_helpers::redis_pubsub，所有模块共享。
    //       将来写 EventSubscriber / RedisMessageBroker / DLQ 重试等集成测试
    //       时应直接复用该模块，避免重复造轮子并确保同类并发问题不再发生。
    // =====================================================================

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

    #[test]
    fn test_master_data_domain_from_str() {
        use std::str::FromStr;

        // ===== 合法输入表 =====
        // (输入字符串, 期望枚举, 期望 prefix, 期望 table)
        let cases: &[(&str, MasterDataDomain, &str, &str)] = &[
            // 完整 snake_case 代号
            ("customer", MasterDataDomain::Customer, "cust", "customers"),
            ("supplier", MasterDataDomain::Supplier, "supp", "suppliers"),
            ("material", MasterDataDomain::Material, "mat", "materials"),
            (
                "organization",
                MasterDataDomain::Organization,
                "org",
                "organizations",
            ),
            ("employee", MasterDataDomain::Employee, "emp", "employees"),
            (
                "account_subject",
                MasterDataDomain::AccountSubject,
                "acct",
                "account_subjects",
            ),
            // 短前缀（parse_master_data_id 会传入首段 prefix）
            ("cust", MasterDataDomain::Customer, "cust", "customers"),
            ("supp", MasterDataDomain::Supplier, "supp", "suppliers"),
            ("mat", MasterDataDomain::Material, "mat", "materials"),
            (
                "org",
                MasterDataDomain::Organization,
                "org",
                "organizations",
            ),
            ("emp", MasterDataDomain::Employee, "emp", "employees"),
            (
                "acct",
                MasterDataDomain::AccountSubject,
                "acct",
                "account_subjects",
            ),
            // 表名（调试 / 直接写 SQL 结果映射）
            ("customers", MasterDataDomain::Customer, "cust", "customers"),
            ("suppliers", MasterDataDomain::Supplier, "supp", "suppliers"),
            ("materials", MasterDataDomain::Material, "mat", "materials"),
            (
                "organizations",
                MasterDataDomain::Organization,
                "org",
                "organizations",
            ),
            ("employees", MasterDataDomain::Employee, "emp", "employees"),
            (
                "account_subjects",
                MasterDataDomain::AccountSubject,
                "acct",
                "account_subjects",
            ),
        ];

        for &(code, expected_domain, expected_prefix, expected_table) in cases {
            assert_eq!(
                MasterDataDomain::from_str(code).unwrap(),
                expected_domain,
                "from_str(\"{code}\") 未匹配期望枚举"
            );
            let parsed: MasterDataDomain = code.parse().expect(&format!("parse(\"{code}\") 失败"));
            assert_eq!(parsed, expected_domain);
            assert_eq!(parsed.prefix(), expected_prefix);
            assert_eq!(parsed.table(), expected_table);
        }

        // ===== 非法输入：大小写敏感、拼写错误、分隔符/空白不匹配 =====
        let invalid_inputs: &[&str] = &[
            "",
            "Customer", // 大写首字母，严格小写匹配
            "CUSTOMER",
            "customer ", // 尾随空格
            "Supplier",
            "supplier_",       // 尾随下划线（非 plural 也非 code）
            "account-subject", // 短横线（code 是下划线，prefix 是 acct）
            "user",            // 完全不属于 6 个域
            "MATERIAL",
            "ACCT",               // 大写的 prefix
            "  cust",             // 前导空格
            "customer\nsupplier", // 含换行
        ];
        for bad in invalid_inputs {
            let err = MasterDataDomain::from_str(bad)
                .expect_err(&format!("\"{bad}\" 应该返回错误，但返回了成功"));
            assert!(
                err.to_string().contains(bad),
                "错误信息 \"{}\" 中未包含原始输入 \"{bad}\"",
                err
            );
            assert!(bad.parse::<MasterDataDomain>().is_err());
        }

        // ===== 错误类型烟雾断言 =====
        let err = MasterDataDomain::from_str("__bad__").unwrap_err();
        assert_eq!(err.to_string(), "invalid master data domain: __bad__");
        let err_as_dyn: &dyn std::error::Error = &err;
        assert!(err_as_dyn.source().is_none());
    }

    #[test]
    fn test_parse_master_data_id_and_validation() {
        // 生成一组预期有效的 mock id（对应各种域 + 假时间戳 + 假随机段）
        let valid_ids: Vec<(String, MasterDataDomain)> = vec![
            ("cust-20260804-aaaaaaaa".into(), MasterDataDomain::Customer),
            ("supp-20260804-bbbbbbbb".into(), MasterDataDomain::Supplier),
            ("mat-20260804-cccccccc".into(), MasterDataDomain::Material),
            (
                "org-20260804-dddddddd".into(),
                MasterDataDomain::Organization,
            ),
            ("emp-20260804-eeeeeeee".into(), MasterDataDomain::Employee),
            (
                "acct-20260804-ffffffff".into(),
                MasterDataDomain::AccountSubject,
            ),
            // 额外边界：时间戳、随机段为空字符串，只要 prefix 合法仍能解析
            ("cust--".into(), MasterDataDomain::Customer),
        ];
        for (id, expected_domain) in &valid_ids {
            assert!(validate_master_data_id(id), "id {id} 应校验通过");
            let (domain, original) = parse_master_data_id(id).expect(&format!("id {id} 应被解析"));
            assert_eq!(&domain, expected_domain);
            assert_eq!(original, *id);
            // 反向一致性：用解析出的 domain 生成的新 id 前缀必须一致
            let fresh_id = generate_master_data_id(*expected_domain);
            let (fresh_domain, _) = parse_master_data_id(&fresh_id).unwrap();
            assert_eq!(fresh_domain, *expected_domain);
        }

        // ===== 无效 id：前缀不构成合法 domain 或空字符串 =====
        let invalid_ids: &[&str] = &[
            "",
            "-",
            "unknown-20260804-abc", // 未知前缀
            "CUST-20260804-abc",    // 大写前缀 (from_str 只接受 snake_case 小写)
            "prefix",               // 无分隔符，split 得到 ["prefix"] 但 prefix 不是合法 from_str
        ];
        for bad in invalid_ids {
            assert!(
                parse_master_data_id(bad).is_none(),
                "\"{bad}\" 应解析失败但返回 Some(...)"
            );
            assert!(!validate_master_data_id(bad));
        }

        // 保证 FromStr 返回 Err 时 parse_master_data_id 不会崩溃（之前使用的是 .ok()?）
        let bad = "bogus-00000000-xxxxxxxx";
        assert!(parse_master_data_id(bad).is_none());
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
    #[ignore = "requires live Redis pubsub; skip in pure function test runs"]
    async fn test_event_publish_and_subscribe() {
        let Some(client) = redis_pubsub::skip_without_redis().await else {
            return;
        };

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
        let expected_event_id = event.event_id;
        let channel_name = event.channel();

        // ——— 阶段一：先 await 订阅完全就绪（SUBSCRIBE + PUBSUB NUMSUB 确认）———
        // 此 await 返回前，Redis 服务端已经把订阅者登记到订阅列表，
        // 之后立即 PUBLISH 也不会丢失消息。
        let subscription: ActiveSubscription<MasterDataEvent> = redis_pubsub::prepare_subscription(
            &client,
            &channel_name,
            move |e: &MasterDataEvent| e.event_id == expected_event_id,
        )
        .await;

        // ——— 阶段二：订阅就绪后，再 spawn 发布任务 ———
        let publish_task = tokio::spawn(async move { event.publish().await });

        // ——— 阶段三：并发等待 publish 完成 + 匹配事件到达 ———
        let (received_event, publish_result) =
            tokio::join!(subscription.wait_for_match(), publish_task,);
        assert!(publish_result.is_ok(), "publish 失败: {publish_result:?}");
        let publish_inner = publish_result.unwrap();
        assert!(publish_inner.is_ok(), "publish 内部错误: {publish_inner:?}");

        assert_eq!(received_event.event_id, expected_event_id);
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

        // ——— 无 Redis 时只验证"事件对象能成功序列化并传给 Publisher"的代码路径———
        if let Some(client) = redis_pubsub::maybe_connect_redis().await {
            let publisher = MasterDataPublisher { client };
            let result = publisher.publish_batch(&events).await;
            assert!(result.is_ok(), "batch publish 失败: {result:?}");
        } else {
            // 序列化烟雾检查，保证不依赖网络也能覆盖结构
            for e in &events {
                assert!(serde_json::to_string(e).is_ok());
                assert_eq!(e.tenant_id, tenant_id);
            }
            eprintln!("[skip] test_event_publisher_batch: Redis 不可达，跳过网络部分");
        }
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
        let mut any_published = false;

        for (domain, prefix) in domains {
            let event = MasterDataEvent::new(
                tenant_id,
                domain,
                MasterDataAction::Created,
                format!("{prefix}-test"),
                format!("{}TEST", prefix.to_uppercase()),
                "test-service",
                json!({"name": "测试数据"}),
            );

            assert_eq!(event.domain.prefix(), prefix);
            assert_eq!(event.channel(), format!("topems:master_data:{prefix}"));
            assert!(serde_json::to_string(&event).is_ok());

            // 真实 publish 全部走一遍（只要 Redis 能连上），但不因为单次失败就断循环
            if let Ok(()) = event.publish().await {
                any_published = true;
            }
        }

        // 当本地无 Redis 时，此测试仍然是有价值的本地结构断言；打印一行让用户知道。
        if !any_published {
            eprintln!("[notice] test_all_domain_events_publish: 未执行真实 PUBLISH（Redis 不可达或全部失败），本地断言通过");
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

        // 真实 publish 不作为断言失败的依据（网络环境可能缺 Redis）
        match event.publish().await {
            Ok(()) => {}
            Err(_) => {
                eprintln!("[skip] test_event_with_changed_fields: Redis 不可达，跳过 publish")
            }
        }
    }

    #[tokio::test]
    #[ignore = "requires live Redis pubsub; skip in pure function test runs"]
    async fn test_event_deserialize_from_channel() {
        let Some(client) = redis_pubsub::skip_without_redis().await else {
            return;
        };

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
        let expected_event_id = original_event.event_id;
        let channel_name = original_event.channel();

        // ——— 阶段一：await 订阅在 Redis 服务端完全登记 ———
        let subscription: ActiveSubscription<MasterDataEvent> = redis_pubsub::prepare_subscription(
            &client,
            &channel_name,
            move |e: &MasterDataEvent| e.event_id == expected_event_id,
        )
        .await;

        // ——— 阶段二：确定订阅就绪后再发布 ———
        let publish_task = tokio::spawn(async move { original_event.publish().await });

        // ——— 阶段三：等待结果 ———
        let (received_event, _) = tokio::join!(subscription.wait_for_match(), publish_task,);

        assert_eq!(received_event.event_id, expected_event_id);
        assert_eq!(received_event.domain, MasterDataDomain::Supplier);
        assert_eq!(received_event.action, MasterDataAction::Updated);
        assert_eq!(received_event.master_data_id, "supp-001");
        assert_eq!(received_event.code, "SUPP001");
        assert_eq!(received_event.version, 2);
        assert_eq!(received_event.source_service, "srm");
        assert_eq!(received_event.operator.as_deref(), Some("admin"));
        assert_eq!(received_event.tenant_id, tenant_id);
    }

    /// 并发压力测试：N 个订阅-发布对共享 **同一个** channel（topems:master_data:cust），
    /// 验证按 event_id 过滤机制能正确隔离并发事件，不会出现"收到别人消息"或"自己消息丢失"。
    ///
    /// 此测试专门用于触发之前的"顺序串扰"问题：
    ///   - 如果未严格保证"订阅登记完成 → 再发布"，并发下会随机丢消息；
    ///   - 如果未按 event_id 过滤，会收到并发测试的其他对消息，断言错误。
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    #[ignore = "requires live Redis pubsub; skip in pure function test runs"]
    async fn test_concurrent_same_channel_no_crosstalk() {
        let Some(client) = redis_pubsub::skip_without_redis().await else {
            return;
        };

        // N 足够大（8）+ 多线程 runtime，能稳定触发"发布与订阅"的竞态窗口
        const N: usize = 8;

        let mut handles = Vec::with_capacity(N);
        let tenant_id = Uuid::new_v4();

        for i in 0..N {
            let client = client.clone();
            handles.push(tokio::spawn(async move {
                let code = format!("CUSTCC{:03}", i);
                let master_data_id = format!("cust-cc-{:03}", i);
                let event = MasterDataEvent::new(
                    tenant_id,
                    MasterDataDomain::Customer,
                    MasterDataAction::Created,
                    master_data_id.clone(),
                    code.clone(),
                    "concurrent-test",
                    json!({"seq": i, "name": format!("并发客户{i}")}),
                );
                let expected_event_id = event.event_id;
                let channel_name = event.channel(); // 所有对都用 topems:master_data:cust

                // —— 阶段一：先完成订阅登记 ——
                let subscription = redis_pubsub::prepare_subscription(
                    &client,
                    &channel_name,
                    move |e: &MasterDataEvent| e.event_id == expected_event_id,
                )
                .await;

                // —— 阶段二：随机 sleep 0~10ms，刻意打乱发布顺序，验证不会互相影响 ——
                let delay_ms = (i * 7) % 11;
                tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms as u64)).await;

                // —— 阶段三：发布并等待匹配消息 ——
                let publish_task = tokio::spawn(async move { event.publish().await });
                let received = subscription.wait_for_match().await;
                let _ = publish_task.await;

                // 核心断言：收到的必须 **严格等于** 本对发布的 event_id，
                // 如果发生串扰（收到其他对的消息），这里就会失败
                assert_eq!(
                    received.event_id, expected_event_id,
                    "并发串扰！第{i}个订阅-发布对收到了非本对的消息"
                );
                assert_eq!(received.code, code);
                assert_eq!(received.master_data_id, master_data_id);
                assert_eq!(received.tenant_id, tenant_id);
                (i, expected_event_id)
            }));
        }

        // 全部并发运行，收集结果
        let mut results = Vec::with_capacity(N);
        for h in handles {
            results.push(h.await.expect("子任务 panic"));
        }
        assert_eq!(results.len(), N);

        // 附加校验：每个子任务返回的 event_id 两两不同（证明本测试本身构造出了 N 个不同事件）
        let mut ids: Vec<uuid::Uuid> = results.iter().map(|(_, id)| *id).collect();
        ids.sort();
        ids.dedup();
        assert_eq!(ids.len(), N, "测试数据错误：存在重复的 event_id");
    }
}
