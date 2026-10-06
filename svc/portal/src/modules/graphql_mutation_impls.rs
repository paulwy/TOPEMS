// ==================== graphql_mutation_impls：根类型字段实现（批次5 委托式拆分） ====================
// 拆分自 graphql_schema.rs：字段函数体搬移至此（pub async fn impl_*），主文件保留委托壳。

#![allow(ambiguous_glob_reexports, unused)]
#![allow(
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap,
    clippy::cast_sign_loss,
    clippy::as_conversions,
    clippy::indexing_slicing,
    clippy::cast_lossless
)]

use async_graphql::dataloader::DataLoader;
use async_graphql::Context;
use futures_util::future::join_all;

use crate::modules::graphql_dataloader::*;
use crate::modules::graphql_helpers::*;
use crate::modules::graphql_types::*;
use crate::shared::AppState;

use crate::modules::adaptive_execution::*;
use crate::modules::aggregation::*;
use crate::modules::ai_ops::*;
use crate::modules::announcements::*;
use crate::modules::dashboard::*;
use crate::modules::deep_federation::*;
use crate::modules::deployment_manager::*;
use crate::modules::edge_computing::*;
use crate::modules::federation_gateway::*;
use crate::modules::gateway_monitoring::*;
use crate::modules::gateway_security::*;
use crate::modules::graphql_ai_assist::*;
use crate::modules::graphql_cache::*;
use crate::modules::graphql_dataloader::*;
use crate::modules::graphql_edge_computing::*;
use crate::modules::graphql_edge_v2::*;
use crate::modules::graphql_enterprise_security::MaskingRule;
use crate::modules::graphql_enterprise_security::*;
use crate::modules::graphql_entities::*;
use crate::modules::graphql_event_bus::SubscriptionChannel;
use crate::modules::graphql_event_bus::*;
use crate::modules::graphql_federation::reset_circuit_breaker;
use crate::modules::graphql_federation::*;
use crate::modules::graphql_federation_runtime::*;
use crate::modules::graphql_federation_sdl::*;
use crate::modules::graphql_federation_v4::*;
use crate::modules::graphql_gateway_security::*;
use crate::modules::graphql_governance::*;
use crate::modules::graphql_helpers::*;
use crate::modules::graphql_monitoring::acknowledge_alert;
use crate::modules::graphql_monitoring::*;
use crate::modules::graphql_persisted_queries::*;
use crate::modules::graphql_query_business::*;
use crate::modules::graphql_query_impls::*;
use crate::modules::graphql_realtime_stream::*;
use crate::modules::graphql_redis_pubsub::*;
use crate::modules::graphql_schema::{
    decrement_subscriptions, get_active_subscriptions, get_cache_version, increment_subscriptions,
    invalidate_cache,
};
use crate::modules::graphql_security::*;
use crate::modules::graphql_semantic_cache::*;
use crate::modules::graphql_subscription_enhanced::*;
use crate::modules::graphql_types::*;
use crate::modules::help::*;
use crate::modules::intelligent_gateway::*;
use crate::modules::monitoring::*;
use crate::modules::navigation::*;
use crate::modules::notifications::*;
use crate::modules::orchestration::*;
use crate::modules::persisted_query::*;
use crate::modules::portal_plugin::*;
use crate::modules::query_governance::*;
use crate::modules::query_optimizer::*;
use crate::modules::quick_actions::*;
use crate::modules::rate_limiting::*;
use crate::modules::realtime_processing::*;
use crate::modules::schema_versioning::*;
use crate::modules::search::*;
use crate::modules::security_v1::*;
use crate::modules::services::*;
use crate::modules::settings::*;
use crate::modules::smart_gateway::*;
use crate::modules::streaming_processing::*;
use crate::modules::subscription_manager::*;
use crate::modules::todos::*;
use crate::modules::user::*;
use crate::modules::version_control::*;

pub async fn impl_create_todo(
    ctx: &Context<'_>,
    title: String,
    user_id: Option<String>,
) -> async_graphql::Result<UnifiedTodoGql> {
    let state = ctx.data::<AppState>()?;
    let uid = user_id.unwrap_or_else(|| "system".to_string());

    let row = sqlx::query(
        r#"INSERT INTO portal.portal_todos
           (user_id, title, service_code, service_name, priority, todo_type)
           VALUES ($1, $2, 'portal', '门户中心', 'medium', 'personal')
           RETURNING id, title, created_at"#,
    )
    .bind(&uid)
    .bind(&title)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| async_graphql::Error::new(format!("创建待办失败: {}", e)))?;

    use sqlx::Row;
    let id: uuid::Uuid = row.try_get("id")?;
    let title: String = row.try_get("title")?;
    let created_at: chrono::DateTime<chrono::Utc> = row
        .try_get("created_at")
        .unwrap_or_else(|_| chrono::Utc::now());

    Ok(UnifiedTodoGql {
        id: id.to_string(),
        title,
        source: "portal".into(),
        priority: 0,
        status: "pending".into(),
        created_at: created_at.to_rfc3339(),
    })
}

pub async fn impl_complete_todo(ctx: &Context<'_>, id: String) -> async_graphql::Result<bool> {
    let state = ctx.data::<AppState>()?;
    let uuid = uuid::Uuid::parse_str(&id)
        .map_err(|e| async_graphql::Error::new(format!("无效的 ID: {}", e)))?;

    let result = sqlx::query(
        r#"UPDATE portal.portal_todos
           SET completed = TRUE, completed_at = NOW(), updated_at = NOW()
           WHERE id = $1 AND deleted_at IS NULL"#,
    )
    .bind(uuid)
    .execute(&state.pool)
    .await
    .map_err(|e| async_graphql::Error::new(format!("更新待办失败: {}", e)))?;

    Ok(result.rows_affected() > 0)
}

pub async fn impl_delete_todo(ctx: &Context<'_>, id: String) -> async_graphql::Result<bool> {
    let state = ctx.data::<AppState>()?;
    let uuid = uuid::Uuid::parse_str(&id)
        .map_err(|e| async_graphql::Error::new(format!("无效的 ID: {}", e)))?;

    let result = sqlx::query(
        r#"UPDATE portal.portal_todos
           SET deleted_at = NOW(), updated_at = NOW()
           WHERE id = $1 AND deleted_at IS NULL"#,
    )
    .bind(uuid)
    .execute(&state.pool)
    .await
    .map_err(|e| async_graphql::Error::new(format!("删除待办失败: {}", e)))?;

    Ok(result.rows_affected() > 0)
}

pub async fn impl_create_entity(
    _ctx: &Context<'_>,
    service: String,
    entity_type: String,
    data: serde_json::Value,
) -> async_graphql::Result<serde_json::Value> {
    let base_url = service_url(&service);
    let path = match (service.as_str(), entity_type.as_str()) {
        ("erp", "customers") => "/api/erp/customers",
        ("erp", "suppliers") => "/api/erp/suppliers",
        ("erp", "materials") => "/api/erp/materials",
        ("crm", "contacts") => "/api/crm/contacts",
        ("crm", "leads") => "/api/crm/leads",
        ("hrm", "employees") => "/api/hrm/employees",
        ("hrm", "departments") => "/api/hrm/departments",
        ("finance", "accounts") => "/api/finance/accounts",
        ("finance", "vouchers") => "/api/finance/vouchers",
        ("finance", "expenses") => "/api/finance/expenses",
        ("mes", "work-orders") => "/api/mes/work-orders",
        _ => {
            return Err(async_graphql::Error::new(format!(
                "不支持的服务或实体类型: {}/{}",
                service, entity_type
            )))
        }
    };

    let url = format!("{}{}", base_url, path);
    let client = service_request(reqwest::Method::POST, &url, FEDERATION_WRITE_PERMS);

    match tokio::time::timeout(
        std::time::Duration::from_secs(10),
        client.json(&data).send(),
    )
    .await
    {
        Ok(Ok(resp)) if resp.status().is_success() => {
            let result: serde_json::Value = resp
                .json()
                .await
                .unwrap_or(serde_json::json!({"success": true}));
            Ok(result)
        }
        Ok(Ok(resp)) => {
            let status = resp.status();
            let error_body = resp.text().await.unwrap_or_default();
            Err(async_graphql::Error::new(format!(
                "创建实体失败 ({}): {}",
                status, error_body
            )))
        }
        Ok(Err(e)) => Err(async_graphql::Error::new(format!("HTTP 请求失败: {}", e))),
        Err(_) => Err(async_graphql::Error::new("创建实体超时")),
    }
}

pub async fn impl_update_entity(
    _ctx: &Context<'_>,
    service: String,
    entity_type: String,
    id: String,
    data: serde_json::Value,
) -> async_graphql::Result<serde_json::Value> {
    let base_url = service_url(&service);
    let path = match (service.as_str(), entity_type.as_str()) {
        ("erp", "customers") => format!("/api/erp/customers/{}", id),
        ("erp", "suppliers") => format!("/api/erp/suppliers/{}", id),
        ("erp", "materials") => format!("/api/erp/materials/{}", id),
        ("crm", "contacts") => format!("/api/crm/contacts/{}", id),
        ("crm", "leads") => format!("/api/crm/leads/{}", id),
        ("hrm", "employees") => format!("/api/hrm/employees/{}", id),
        ("hrm", "departments") => format!("/api/hrm/departments/{}", id),
        ("finance", "accounts") => format!("/api/finance/accounts/{}", id),
        ("finance", "vouchers") => format!("/api/finance/vouchers/{}", id),
        ("finance", "expenses") => format!("/api/finance/expenses/{}", id),
        ("mes", "work-orders") => format!("/api/mes/work-orders/{}", id),
        _ => {
            return Err(async_graphql::Error::new(format!(
                "不支持的服务或实体类型: {}/{}",
                service, entity_type
            )))
        }
    };

    let url = format!("{}{}", base_url, path);
    let client = service_request(reqwest::Method::PUT, &url, FEDERATION_WRITE_PERMS);

    match tokio::time::timeout(
        std::time::Duration::from_secs(10),
        client.json(&data).send(),
    )
    .await
    {
        Ok(Ok(resp)) if resp.status().is_success() => {
            let result: serde_json::Value = resp
                .json()
                .await
                .unwrap_or(serde_json::json!({"success": true}));
            Ok(result)
        }
        Ok(Ok(resp)) => {
            let status = resp.status();
            let error_body = resp.text().await.unwrap_or_default();
            Err(async_graphql::Error::new(format!(
                "更新实体失败 ({}): {}",
                status, error_body
            )))
        }
        Ok(Err(e)) => Err(async_graphql::Error::new(format!("HTTP 请求失败: {}", e))),
        Err(_) => Err(async_graphql::Error::new("更新实体超时")),
    }
}

pub async fn impl_delete_entity(
    _ctx: &Context<'_>,
    service: String,
    entity_type: String,
    id: String,
) -> async_graphql::Result<bool> {
    let base_url = service_url(&service);
    let path = match (service.as_str(), entity_type.as_str()) {
        ("erp", "customers") => format!("/api/erp/customers/{}", id),
        ("erp", "suppliers") => format!("/api/erp/suppliers/{}", id),
        ("erp", "materials") => format!("/api/erp/materials/{}", id),
        ("crm", "contacts") => format!("/api/crm/contacts/{}", id),
        ("crm", "leads") => format!("/api/crm/leads/{}", id),
        ("hrm", "employees") => format!("/api/hrm/employees/{}", id),
        ("hrm", "departments") => format!("/api/hrm/departments/{}", id),
        ("finance", "accounts") => format!("/api/finance/accounts/{}", id),
        ("finance", "vouchers") => format!("/api/finance/vouchers/{}", id),
        ("finance", "expenses") => format!("/api/finance/expenses/{}", id),
        ("mes", "work-orders") => format!("/api/mes/work-orders/{}", id),
        _ => {
            return Err(async_graphql::Error::new(format!(
                "不支持的服务或实体类型: {}/{}",
                service, entity_type
            )))
        }
    };

    let url = format!("{}{}", base_url, path);
    let client = service_request(reqwest::Method::DELETE, &url, FEDERATION_WRITE_PERMS);

    match tokio::time::timeout(std::time::Duration::from_secs(10), client.send()).await {
        Ok(Ok(resp)) if resp.status().is_success() => Ok(true),
        Ok(Ok(_)) => Ok(false),
        Ok(Err(_)) => Ok(false),
        Err(_) => Err(async_graphql::Error::new("删除实体超时")),
    }
}

pub async fn impl_publish_master_data_event(
    ctx: &Context<'_>,
    domain: String,
    action: String,
    master_data_id: String,
    source_service: String,
) -> async_graphql::Result<MasterDataEventGql> {
    let event = MasterDataEventGql {
        domain: domain.clone(),
        action: action.clone(),
        master_data_id: master_data_id.clone(),
        source_service: source_service.clone(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    };

    // 发布到本地 EventBus
    global_event_bus().publish(
        SubscriptionChannel::MasterDataChanged,
        serde_json::to_value(&event).unwrap_or_default(),
    );

    // 如果 Redis 可用，同时发布到 Redis（多实例广播）
    let state = ctx.data::<AppState>()?;
    if let Some(publisher) = &state.event_publisher {
        let _ = publisher
            .publish_event(
                topems_shared_event::event::EventType::HealthCheck,
                serde_json::to_value(&event).unwrap_or_default(),
            )
            .await;
    }

    invalidate_cache();
    Ok(event)
}

pub async fn impl_publish_notification(
    ctx: &Context<'_>,
    user_id: String,
    title: String,
    content: String,
    notification_type: String,
) -> async_graphql::Result<NotificationEventGql> {
    let event = NotificationEventGql {
        id: uuid::Uuid::new_v4().to_string(),
        user_id: user_id.clone(),
        title: title.clone(),
        content: content.clone(),
        notification_type: notification_type.clone(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    };

    global_event_bus().publish(
        SubscriptionChannel::NotificationReceived,
        serde_json::to_value(&event).unwrap_or_default(),
    );

    let state = ctx.data::<AppState>()?;
    if let Some(publisher) = &state.event_publisher {
        let _ = publisher
            .publish_event(
                topems_shared_event::event::EventType::PortalNotificationPublished,
                serde_json::to_value(&event).unwrap_or_default(),
            )
            .await;
    }

    invalidate_cache();
    Ok(event)
}

pub async fn impl_publish_workflow_task(
    ctx: &Context<'_>,
    task_id: String,
    assignee_id: String,
    instance_title: String,
    priority: String,
    status: String,
) -> async_graphql::Result<WorkflowTaskEventGql> {
    let event = WorkflowTaskEventGql {
        task_id: task_id.clone(),
        assignee_id: assignee_id.clone(),
        instance_title: instance_title.clone(),
        priority: priority.clone(),
        status: status.clone(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    };

    global_event_bus().publish(
        SubscriptionChannel::WorkflowTaskAssigned,
        serde_json::to_value(&event).unwrap_or_default(),
    );

    let state = ctx.data::<AppState>()?;
    if let Some(publisher) = &state.event_publisher {
        let _ = publisher
            .publish_event(
                topems_shared_event::event::EventType::WorkflowStarted,
                serde_json::to_value(&event).unwrap_or_default(),
            )
            .await;
    }

    invalidate_cache();
    Ok(event)
}

pub async fn impl_publish_order_status(
    ctx: &Context<'_>,
    order_id: String,
    order_type: String,
    old_status: String,
    new_status: String,
) -> async_graphql::Result<OrderStatusEventGql> {
    let event = OrderStatusEventGql {
        order_id: order_id.clone(),
        order_type: order_type.clone(),
        old_status: old_status.clone(),
        new_status: new_status.clone(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    };

    global_event_bus().publish(
        SubscriptionChannel::OrderStatusChanged,
        serde_json::to_value(&event).unwrap_or_default(),
    );

    let state = ctx.data::<AppState>()?;
    if let Some(publisher) = &state.event_publisher {
        let _ = publisher
            .publish_event(
                topems_shared_event::event::EventType::SalesOrderApproved,
                serde_json::to_value(&event).unwrap_or_default(),
            )
            .await;
    }

    invalidate_cache();
    Ok(event)
}

pub async fn impl_cache_invalidate(
    _ctx: &Context<'_>,
    pattern: String,
) -> async_graphql::Result<bool> {
    let count = cache_invalidate_pattern(&pattern);
    tracing::debug!("[cache] 手动失效模式 '{}'，共 {} 条", pattern, count);
    Ok(true)
}

pub async fn impl_cache_clear(_ctx: &Context<'_>) -> async_graphql::Result<bool> {
    cache_clear_all();
    tracing::debug!("[cache] 所有缓存已清空");
    Ok(true)
}

pub async fn impl_prefetch_trigger(
    _ctx: &Context<'_>,
    query_name: String,
) -> async_graphql::Result<bool> {
    let triggered = trigger_prefetch(&query_name);
    Ok(triggered)
}

pub async fn impl_approve_discovered_query(
    _ctx: &Context<'_>,
    hash: String,
) -> async_graphql::Result<bool> {
    Ok(approve_discovered_query(&hash, Some("admin")))
}

pub async fn impl_reject_discovered_query(
    _ctx: &Context<'_>,
    hash: String,
) -> async_graphql::Result<bool> {
    Ok(reject_discovered_query(&hash, Some("admin")))
}

pub async fn impl_update_auto_approval_policy(
    _ctx: &Context<'_>,
    policy: AutoApprovalPolicyInput,
) -> async_graphql::Result<bool> {
    Ok(update_auto_approval_policy(policy))
}

pub async fn impl_run_auto_approval_scan(_ctx: &Context<'_>) -> async_graphql::Result<i32> {
    Ok(run_auto_approval_scan() as i32)
}

pub async fn impl_set_field_permission(
    _ctx: &Context<'_>,
    permission: FieldPermissionInput,
) -> async_graphql::Result<FieldPermission> {
    let perm: FieldPermission = permission.into();
    set_field_permission(perm.clone());
    Ok(perm)
}

pub async fn impl_remove_field_permission(
    _ctx: &Context<'_>,
    entity_type: String,
    field_name: String,
) -> async_graphql::Result<bool> {
    Ok(remove_field_permission(&entity_type, &field_name))
}

pub async fn impl_set_masking_rule(
    _ctx: &Context<'_>,
    rule: MaskingRuleInput,
) -> async_graphql::Result<MaskingRule> {
    let r: MaskingRule = rule.into();
    set_masking_rule(r.clone());
    Ok(r)
}

pub async fn impl_remove_masking_rule(
    _ctx: &Context<'_>,
    entity_type: String,
    field_name: String,
) -> async_graphql::Result<bool> {
    Ok(remove_masking_rule(&entity_type, &field_name))
}

pub async fn impl_update_security_config(
    _ctx: &Context<'_>,
    config: SecurityConfigInput,
) -> async_graphql::Result<SecurityConfig> {
    let current = get_security_config();
    let new_config = SecurityConfig {
        field_permissions_enabled: config
            .field_permissions_enabled
            .unwrap_or(current.field_permissions_enabled),
        data_masking_enabled: config
            .data_masking_enabled
            .unwrap_or(current.data_masking_enabled),
        field_audit_enabled: config
            .field_audit_enabled
            .unwrap_or(current.field_audit_enabled),
        data_change_audit_enabled: config
            .data_change_audit_enabled
            .unwrap_or(current.data_change_audit_enabled),
        default_deny: config.default_deny.unwrap_or(current.default_deny),
        audit_sensitive_fields_only: config
            .audit_sensitive_fields_only
            .unwrap_or(current.audit_sensitive_fields_only),
    };
    Ok(update_security_config(new_config))
}

pub async fn impl_cancel_subscription(
    _ctx: &Context<'_>,
    id: String,
) -> async_graphql::Result<bool> {
    Ok(cancel_subscription_by_id(&id))
}

pub async fn impl_cancel_all_subscriptions(
    _ctx: &Context<'_>,
    connection_id: String,
) -> async_graphql::Result<u64> {
    Ok(cancel_all_subscriptions_by_connection(&connection_id))
}

pub async fn impl_apply_optimization(
    _ctx: &Context<'_>,
    query_hash: String,
    suggestion_id: String,
) -> async_graphql::Result<bool> {
    Ok(apply_optimization_suggestion(&query_hash, &suggestion_id))
}

pub async fn impl_generate_cache_recommendations(_ctx: &Context<'_>) -> async_graphql::Result<u32> {
    Ok(generate_cache_recommendations())
}

pub async fn impl_accept_cache_recommendation(
    _ctx: &Context<'_>,
    query_hash: String,
) -> async_graphql::Result<bool> {
    Ok(accept_cache_recommendation(&query_hash))
}

pub async fn impl_federation_reset_circuit_breaker(
    _ctx: &Context<'_>,
    service: String,
) -> async_graphql::Result<bool> {
    Ok(reset_circuit_breaker(&service))
}

pub async fn impl_federation_cache_invalidate(
    _ctx: &Context<'_>,
    query_hash: Option<String>,
) -> async_graphql::Result<bool> {
    if let Some(hash) = query_hash {
        Ok(FederatedCacheManager::invalidate_query_cache(&hash))
    } else {
        Ok(FederatedCacheManager::clear_all_cache())
    }
}

pub async fn impl_federation_cache_clear(_ctx: &Context<'_>) -> async_graphql::Result<bool> {
    Ok(FederatedCacheManager::clear_all_cache())
}

pub async fn impl_federation_set_circuit_breaker_config(
    _ctx: &Context<'_>,
    service: String,
    config: CircuitBreakerConfigInputGql,
) -> async_graphql::Result<bool> {
    Ok(set_circuit_breaker_config(&service, config))
}

pub async fn impl_add_alert_rule(
    _ctx: &Context<'_>,
    input: AlertRuleInput,
) -> async_graphql::Result<String> {
    Ok(add_alert_rule(input))
}

pub async fn impl_update_alert_rule(
    _ctx: &Context<'_>,
    id: String,
    input: AlertRuleInput,
) -> async_graphql::Result<bool> {
    Ok(update_alert_rule(&id, input))
}

pub async fn impl_delete_alert_rule(_ctx: &Context<'_>, id: String) -> async_graphql::Result<bool> {
    Ok(delete_alert_rule(&id))
}

pub async fn impl_acknowledge_alert(_ctx: &Context<'_>, id: String) -> async_graphql::Result<bool> {
    Ok(acknowledge_alert(&id))
}

pub async fn impl_resolve_alert(_ctx: &Context<'_>, id: String) -> async_graphql::Result<bool> {
    Ok(resolve_alert(&id))
}

pub async fn impl_test_alert(
    _ctx: &Context<'_>,
    alert_type: AlertType,
    level: AlertLevel,
) -> async_graphql::Result<String> {
    Ok(test_alert(alert_type, level))
}

pub async fn impl_reset_graphql_metrics(_ctx: &Context<'_>) -> async_graphql::Result<bool> {
    reset_metrics();
    Ok(true)
}

pub async fn impl_deploy_edge_function(
    _ctx: &Context<'_>,
    name: String,
    handler: String,
    route_pattern: String,
    cache_ttl_ms: i64,
) -> async_graphql::Result<String> {
    Ok(EdgeComputeManager::deploy_function(
        &name,
        &handler,
        &route_pattern,
        cache_ttl_ms,
    ))
}

pub async fn impl_execute_at_edge(
    _ctx: &Context<'_>,
    function_name: String,
    input: serde_json::Value,
    region: Option<String>,
) -> async_graphql::Result<serde_json::Value> {
    Ok(EdgeComputeManager::execute_at_edge(
        &function_name,
        &input,
        region.as_deref(),
    ))
}

pub async fn impl_cdn_cache_warm(
    _ctx: &Context<'_>,
    query_hashes: Vec<String>,
) -> async_graphql::Result<u32> {
    Ok(CdnCacheManager::warm_cache(&query_hashes))
}

pub async fn impl_cdn_cache_prefetch(
    _ctx: &Context<'_>,
    query_hashes: Vec<String>,
) -> async_graphql::Result<u32> {
    Ok(CdnCacheManager::prefetch(&query_hashes))
}

pub async fn impl_cdn_cache_invalidate_by_tag(
    _ctx: &Context<'_>,
    tags: Vec<String>,
) -> async_graphql::Result<u32> {
    Ok(CdnCacheManager::invalidate_by_tag(&tags))
}

pub async fn impl_cdn_cache_purge_all(_ctx: &Context<'_>) -> async_graphql::Result<bool> {
    Ok(CdnCacheManager::purge_all())
}

pub async fn impl_update_stream_config(
    _ctx: &Context<'_>,
    config: StreamConfigInput,
) -> async_graphql::Result<bool> {
    Ok(StreamingResponseManager::update_config(config))
}

pub async fn impl_register_schema(
    _ctx: &Context<'_>,
    service: String,
    version: String,
    sdl: String,
) -> async_graphql::Result<String> {
    let entry = {
        let mut registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
        registry.register(&service, &version, &sdl, "user")
    };
    let mut manager = schema_version_manager()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    manager.publish(&service, &version, "", &sdl);
    Ok(entry.version)
}

pub async fn impl_deprecate_schema_version(
    _ctx: &Context<'_>,
    service: String,
    version: String,
) -> async_graphql::Result<bool> {
    let mut registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
    Ok(registry.deprecate(&service, &version))
}

pub async fn impl_retire_schema_version(
    _ctx: &Context<'_>,
    service: String,
    version: String,
) -> async_graphql::Result<bool> {
    let mut registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
    Ok(registry.retire(&service, &version))
}

pub async fn impl_add_contract_test(
    _ctx: &Context<'_>,
    input: ContractTestInput,
) -> async_graphql::Result<String> {
    let mut runner = contract_test_runner()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    Ok(runner.add_test(input))
}

pub async fn impl_update_contract_test(
    _ctx: &Context<'_>,
    id: String,
    input: ContractTestInput,
) -> async_graphql::Result<bool> {
    let mut runner = contract_test_runner()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    Ok(runner.update_test(&id, input))
}

pub async fn impl_delete_contract_test(
    _ctx: &Context<'_>,
    id: String,
) -> async_graphql::Result<bool> {
    let mut runner = contract_test_runner()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    Ok(runner.remove_test(&id))
}

pub async fn impl_run_contract_test(
    _ctx: &Context<'_>,
    id: String,
) -> async_graphql::Result<ContractTestResultGql> {
    let mut runner = contract_test_runner()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    runner
        .run_test(&id)
        .ok_or_else(|| async_graphql::Error::new(format!("Contract test '{}' not found", id)))
}

pub async fn impl_run_all_contract_tests(
    _ctx: &Context<'_>,
    service: Option<String>,
) -> async_graphql::Result<u32> {
    let mut runner = contract_test_runner()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    Ok(runner.run_all(service.as_deref()))
}

pub async fn impl_publish_schema_version(
    _ctx: &Context<'_>,
    service: String,
    version: String,
    changelog: String,
) -> async_graphql::Result<String> {
    let sdl = {
        let registry = schema_registry().lock().unwrap_or_else(|e| e.into_inner());
        registry
            .get_version(&service, &version)
            .map(|v| v.sdl)
            .unwrap_or_default()
    };
    let mut manager = schema_version_manager()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    Ok(manager.publish(&service, &version, &changelog, &sdl))
}

pub async fn impl_promote_schema_version(
    _ctx: &Context<'_>,
    service: String,
    version: String,
) -> async_graphql::Result<bool> {
    let mut manager = schema_version_manager()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    Ok(manager.promote(&service, &version))
}
