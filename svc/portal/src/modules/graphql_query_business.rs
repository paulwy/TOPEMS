// ==================== graphql_query_business：根类型字段实现（批次5 委托式拆分） ====================
// 拆分自 graphql_schema.rs：字段函数体搬移至此（pub async fn impl_*），主文件保留委托壳。

#![allow(ambiguous_glob_reexports, unused_imports)]
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

pub use crate::modules::graphql_ai_assist::*;
pub use crate::modules::graphql_cache::*;
pub use crate::modules::graphql_enterprise_security::*;
pub use crate::modules::graphql_entities::*;
pub use crate::modules::graphql_federation::*;
pub use crate::modules::graphql_federation_runtime::*;
pub use crate::modules::graphql_federation_sdl::*;
pub use crate::modules::graphql_federation_v4::*;
pub use crate::modules::graphql_governance::*;
pub use crate::modules::graphql_monitoring::*;
pub use crate::modules::graphql_persisted_queries::*;
use crate::modules::graphql_schema::get_active_subscriptions;
pub use crate::modules::graphql_security::*;
pub use crate::modules::graphql_semantic_cache::*;
pub use crate::modules::graphql_subscription_enhanced::*;

pub async fn impl_module_stats(_ctx: &Context<'_>) -> async_graphql::Result<Vec<ModuleStatGql>> {
    let modules = [
        (
            "qms",
            "http://localhost:8050",
            "/api/qms/standards?page=1&page_size=1",
        ),
        (
            "srm",
            "http://localhost:8042",
            "/api/srm/suppliers?page=1&page_size=1",
        ),
        (
            "lims",
            "http://localhost:8051",
            "/api/lims/samples?page=1&page_size=1",
        ),
        (
            "rd",
            "http://localhost:8053",
            "/api/rd/projects?page=1&page_size=1",
        ),
        (
            "ehs",
            "http://localhost:8052",
            "/api/ehs/hazards?page=1&page_size=1",
        ),
    ];

    let futures = modules.iter().map(|(name, base, path)| async move {
        let url = format!("{}{}", base, path);
        match service_auth_get(&url, FEDERATION_READ_PERMS).await {
            Ok(resp) if resp.status().is_success() => {
                let json: serde_json::Value = match resp.json().await {
                    Ok(j) => j,
                    Err(e) => {
                        tracing::warn!("Failed to parse {} stats response JSON: {}", name, e);
                        serde_json::Value::Null
                    }
                };
                let total = json
                    .get("data")
                    .and_then(|d| d.get("total"))
                    .and_then(|t| t.as_u64())
                    .unwrap_or(0);
                ModuleStatGql {
                    service: (*name).to_string(),
                    total,
                    available: true,
                }
            }
            _ => ModuleStatGql {
                service: (*name).to_string(),
                total: 0,
                available: false,
            },
        }
    });
    let results = join_all(futures).await;
    Ok(results)
}

pub async fn impl_federated_services(
    _ctx: &Context<'_>,
) -> async_graphql::Result<Vec<FederatedServiceGql>> {
    let registry = [
        (
            "erp",
            "http://localhost:8010",
            vec!["customers", "suppliers", "materials", "orders"],
        ),
        (
            "crm",
            "http://localhost:8029",
            vec!["contacts", "leads", "opportunities"],
        ),
        (
            "hrm",
            "http://localhost:8020",
            vec!["employees", "departments", "positions"],
        ),
        (
            "finance",
            "http://localhost:8011",
            vec!["accounts", "vouchers", "expenses"],
        ),
        (
            "mes",
            "http://localhost:8030",
            vec!["work_orders", "production_lines"],
        ),
    ];

    let futures = registry.iter().map(|(name, url, entities)| async move {
        let healthy = probe_service_health(name, url).await;
        FederatedServiceGql {
            service: (*name).to_string(),
            url: (*url).to_string(),
            available: healthy,
            entities: entities.iter().map(|e| (*e).to_string()).collect(),
        }
    });
    let results = join_all(futures).await;
    Ok(results)
}

pub async fn impl_federated_entity(
    _ctx: &Context<'_>,
    service: String,
    entity_type: String,
    id: String,
) -> async_graphql::Result<FederatedEntityGql> {
    let base_url = service_url(&service);
    let path = match entity_type.as_str() {
        "customers" => format!("/api/erp/customers/{}", id),
        "suppliers" => format!("/api/erp/suppliers/{}", id),
        "materials" => format!("/api/erp/materials/{}", id),
        "contacts" => format!("/api/crm/contacts/{}", id),
        "leads" => format!("/api/crm/leads/{}", id),
        "employees" => format!("/api/hrm/employees/{}", id),
        "departments" => format!("/api/hrm/departments/{}", id),
        "accounts" => format!("/api/finance/accounts/{}", id),
        "vouchers" => format!("/api/finance/vouchers/{}", id),
        "expenses" => format!("/api/finance/expenses/{}", id),
        "work_orders" => format!("/api/mes/work-orders/{}", id),
        _ => format!("/api/{}/{}/{}", service, entity_type, id),
    };

    let url = format!("{}{}", base_url, path);
    let data = match service_auth_get(&url, FEDERATION_READ_PERMS).await {
        Ok(resp) if resp.status().is_success() => match resp.json::<serde_json::Value>().await {
            Ok(j) => j,
            Err(e) => {
                tracing::warn!(
                    "Failed to parse federation entity JSON for {}/{}: {}",
                    service,
                    id,
                    e
                );
                serde_json::Value::Null
            }
        },
        _ => {
            serde_json::json!({"error": "entity not found", "service": service, "entity_type": entity_type, "id": id})
        }
    };

    Ok(FederatedEntityGql {
        service,
        entity_type,
        id,
        data,
    })
}

pub async fn impl_federation_sdl(_ctx: &Context<'_>) -> async_graphql::Result<String> {
    Ok(compose_federation_sdl())
}

pub async fn impl_federation_service_sdls(
    _ctx: &Context<'_>,
) -> async_graphql::Result<Vec<FederationServiceSdlGql>> {
    let services = [
        ("erp", "http://localhost:8010"),
        ("crm", "http://localhost:8029"),
        ("hrm", "http://localhost:8020"),
        ("finance", "http://localhost:8011"),
        ("mes", "http://localhost:8030"),
    ];

    let futures = services.iter().map(|(name, url)| async move {
        let sdl = service_sdl_fragment(name);
        let healthy = probe_service_health(name, url).await;
        FederationServiceSdlGql {
            service: (*name).to_string(),
            sdl,
            available: healthy,
        }
    });
    Ok(join_all(futures).await)
}

pub async fn impl_federation_entities(
    _ctx: &Context<'_>,
    representations: Vec<serde_json::Value>,
) -> async_graphql::Result<Vec<FederationRepresentationGql>> {
    use std::collections::HashMap;

    let mut by_service: HashMap<String, Vec<(String, String, usize)>> = HashMap::new();
    let mut results: Vec<Option<FederationRepresentationGql>> = vec![None; representations.len()];

    for (idx, rep) in representations.iter().enumerate() {
        let typename = rep
            .get("__typename")
            .and_then(|t| t.as_str())
            .unwrap_or("Unknown");
        let id = rep.get("id").and_then(|i| i.as_str()).unwrap_or("");
        let service = service_for_typename(typename);
        by_service.entry(service.to_string()).or_default().push((
            typename.to_string(),
            id.to_string(),
            idx,
        ));
    }

    let futures = by_service.into_values().map(|items| async move {
        let mut local_results = Vec::new();
        for (typename, id, idx) in items {
            let entity = tokio::time::timeout(
                std::time::Duration::from_secs(5),
                resolve_federated_entity(&typename, &id),
            )
            .await
            .unwrap_or_else(|_| {
                serde_json::json!({
                    "error": "timeout",
                    "__typename": typename,
                    "id": id,
                    "message": "Entity resolution timed out after 5 seconds"
                })
            });
            local_results.push((
                idx,
                FederationRepresentationGql {
                    __typename: typename,
                    entity,
                },
            ));
        }
        local_results
    });

    let all_results = join_all(futures).await;
    for batch in all_results {
        for (idx, rep) in batch {
            results[idx] = Some(rep);
        }
    }

    Ok(results.into_iter().flatten().collect())
}

pub async fn impl_federation_entity_list(
    _ctx: &Context<'_>,
    service: String,
    entity_type: String,
    ids: Vec<String>,
) -> async_graphql::Result<Vec<FederatedEntityGql>> {
    let base_url = service_url(&service);
    let path = match (service.as_str(), entity_type.as_str()) {
        ("erp", "customers") => "/api/erp/customers/batch",
        ("erp", "suppliers") => "/api/erp/suppliers/batch",
        ("erp", "materials") => "/api/erp/materials/batch",
        ("crm", "contacts") => "/api/crm/contacts/batch",
        ("crm", "leads") => "/api/crm/leads/batch",
        ("hrm", "employees") => "/api/hrm/employees/batch",
        ("hrm", "departments") => "/api/hrm/departments/batch",
        ("finance", "accounts") => "/api/finance/accounts/batch",
        ("finance", "vouchers") => "/api/finance/vouchers/batch",
        ("finance", "expenses") => "/api/finance/expenses/batch",
        ("mes", "work-orders") => "/api/mes/work-orders/batch",
        _ => {
            let mut results = Vec::new();
            for id in &ids {
                results.push(FederatedEntityGql {
                    service: service.clone(),
                    entity_type: entity_type.clone(),
                    id: id.clone(),
                    data: serde_json::json!({"error": "unsupported entity type", "service": service, "entity_type": entity_type}),
                });
            }
            return Ok(results);
        }
    };

    let url = format!("{}{}", base_url, path);
    let client = service_request(reqwest::Method::POST, &url, FEDERATION_READ_PERMS);

    match tokio::time::timeout(
        std::time::Duration::from_secs(5),
        client.json(&serde_json::json!({ "ids": ids })).send(),
    )
    .await
    {
        Ok(Ok(resp)) if resp.status().is_success() => {
            match resp.json::<serde_json::Value>().await {
                Ok(json) => {
                    let data_list = json
                        .get("data")
                        .and_then(|d| d.as_array())
                        .unwrap_or(&Vec::new())
                        .clone();
                    let mut results = Vec::new();
                    for item in data_list {
                        let id = item
                            .get("id")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        results.push(FederatedEntityGql {
                            service: service.clone(),
                            entity_type: entity_type.clone(),
                            id,
                            data: item,
                        });
                    }
                    if results.is_empty() {
                        for id in &ids {
                            results.push(FederatedEntityGql {
                                service: service.clone(),
                                entity_type: entity_type.clone(),
                                id: id.clone(),
                                data: serde_json::json!({"error": "entity not found", "id": id}),
                            });
                        }
                    }
                    Ok(results)
                }
                Err(_) => {
                    let mut results = Vec::new();
                    for id in &ids {
                        results.push(FederatedEntityGql {
                            service: service.clone(),
                            entity_type: entity_type.clone(),
                            id: id.clone(),
                            data: serde_json::json!({"error": "failed to parse response"}),
                        });
                    }
                    Ok(results)
                }
            }
        }
        _ => {
            let service_clone = service.clone();
            let entity_type_clone = entity_type.clone();
            let base_url_clone = base_url.to_string();
            let futures = ids.iter().map(move |id| {
                let service = service_clone.clone();
                let entity_type = entity_type_clone.clone();
                let base_url = base_url_clone.clone();
                let id = id.clone();
                async move {
                    let single_path = match entity_type.as_str() {
                        "customers" => format!("/api/erp/customers/{}", id),
                        "suppliers" => format!("/api/erp/suppliers/{}", id),
                        "materials" => format!("/api/erp/materials/{}", id),
                        "contacts" => format!("/api/crm/contacts/{}", id),
                        "leads" => format!("/api/crm/leads/{}", id),
                        "employees" => format!("/api/hrm/employees/{}", id),
                        "departments" => format!("/api/hrm/departments/{}", id),
                        "accounts" => format!("/api/finance/accounts/{}", id),
                        "vouchers" => format!("/api/finance/vouchers/{}", id),
                        "expenses" => format!("/api/finance/expenses/{}", id),
                        "work-orders" => format!("/api/mes/work-orders/{}", id),
                        _ => format!("/api/{}/{}/{}", service, entity_type, id),
                    };
                    let single_url = format!("{}{}", base_url, single_path);
                    let data = match service_auth_get(&single_url, FEDERATION_READ_PERMS).await {
                        Ok(resp) if resp.status().is_success() => {
                            resp.json::<serde_json::Value>().await.unwrap_or(serde_json::json!({"error": "parse error"}))
                        }
                        _ => serde_json::json!({"error": "entity not found", "service": service, "entity_type": entity_type, "id": id}),
                    };
                    FederatedEntityGql {
                        service: service.clone(),
                        entity_type: entity_type.clone(),
                        id,
                        data,
                    }
                }
            });
            Ok(join_all(futures).await)
        }
    }
}

pub async fn impl_customer_entity(
    _ctx: &Context<'_>,
    id: String,
) -> async_graphql::Result<Option<CustomerEntityGql>> {
    let url = format!("http://localhost:8010/api/erp/customers/{}", id);
    match service_auth_get(&url, FEDERATION_READ_PERMS).await {
        Ok(resp) if resp.status().is_success() => {
            let json: serde_json::Value = match resp.json().await {
                Ok(j) => j,
                Err(e) => {
                    tracing::warn!("Failed to parse customer_entity {} JSON: {}", id, e);
                    serde_json::Value::Null
                }
            };
            let data = json.get("data").unwrap_or(&json);
            Ok(Some(CustomerEntityGql {
                id: data
                    .get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or(&id)
                    .to_string(),
                name: data
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                code: data
                    .get("code")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                status: data
                    .get("status")
                    .and_then(|v| v.as_str())
                    .unwrap_or("active")
                    .to_string(),
                phone: data
                    .get("phone")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                industry: data
                    .get("industry")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                contact_person: data
                    .get("contact_person")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
            }))
        }
        _ => Ok(None),
    }
}

pub async fn impl_employee_entity(
    _ctx: &Context<'_>,
    id: String,
) -> async_graphql::Result<Option<EmployeeEntityGql>> {
    let url = format!("http://localhost:8020/api/hrm/employees/{}", id);
    match service_auth_get(&url, FEDERATION_READ_PERMS).await {
        Ok(resp) if resp.status().is_success() => {
            let json: serde_json::Value = match resp.json().await {
                Ok(j) => j,
                Err(e) => {
                    tracing::warn!("Failed to parse employee_entity {} JSON: {}", id, e);
                    serde_json::Value::Null
                }
            };
            let data = json.get("data").unwrap_or(&json);
            Ok(Some(EmployeeEntityGql {
                id: data
                    .get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or(&id)
                    .to_string(),
                name: data
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                department: data
                    .get("department_name")
                    .and_then(|v| v.as_str())
                    .or_else(|| data.get("department").and_then(|v| v.as_str()))
                    .unwrap_or("")
                    .to_string(),
                position: data
                    .get("position_name")
                    .and_then(|v| v.as_str())
                    .or_else(|| data.get("position").and_then(|v| v.as_str()))
                    .unwrap_or("")
                    .to_string(),
                email: data
                    .get("email")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                phone: data
                    .get("phone")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                status: data
                    .get("status")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
            }))
        }
        _ => Ok(None),
    }
}

pub async fn impl_voucher_entity(
    _ctx: &Context<'_>,
    id: String,
) -> async_graphql::Result<Option<VoucherEntityGql>> {
    let url = format!("http://localhost:8011/api/finance/vouchers/{}", id);
    match service_auth_get(&url, FEDERATION_READ_PERMS).await {
        Ok(resp) if resp.status().is_success() => {
            let json: serde_json::Value = match resp.json().await {
                Ok(j) => j,
                Err(e) => {
                    tracing::warn!("Failed to parse voucher_entity {} JSON: {}", id, e);
                    serde_json::Value::Null
                }
            };
            let data = json.get("data").unwrap_or(&json);
            Ok(Some(VoucherEntityGql {
                id: data
                    .get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or(&id)
                    .to_string(),
                voucher_number: data
                    .get("voucher_number")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                total_debit: data
                    .get("total_debit")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0),
                total_credit: data
                    .get("total_credit")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0),
                status: data
                    .get("status")
                    .and_then(|v| v.as_str())
                    .unwrap_or("draft")
                    .to_string(),
                voucher_date: data
                    .get("voucher_date")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                created_by: data
                    .get("created_by")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
            }))
        }
        _ => Ok(None),
    }
}

pub async fn impl_subscription_count(_ctx: &Context<'_>) -> async_graphql::Result<i32> {
    Ok(get_active_subscriptions() as i32)
}

pub async fn impl_entity_relationship_graph(
    _ctx: &Context<'_>,
) -> async_graphql::Result<EntityRelationshipGraphGql> {
    let entities = vec![
        "CustomerEntity".to_string(),
        "SupplierEntity".to_string(),
        "MaterialEntity".to_string(),
        "EmployeeEntity".to_string(),
        "VoucherEntity".to_string(),
        "ContactEntity".to_string(),
        "OrderEntity".to_string(),
        "AccountSubjectEntity".to_string(),
        "DepartmentEntity".to_string(),
    ];

    let relations = vec![
        EntityRelationGql {
            from_type: "CustomerEntity".to_string(),
            to_type: "OrderEntity".to_string(),
            relation_type: "one-to-many".to_string(),
            from_field: "orders".to_string(),
            to_field: "customer_id".to_string(),
            service: "erp".to_string(),
        },
        EntityRelationGql {
            from_type: "CustomerEntity".to_string(),
            to_type: "ContactEntity".to_string(),
            relation_type: "one-to-many".to_string(),
            from_field: "contacts".to_string(),
            to_field: "customer_id".to_string(),
            service: "crm".to_string(),
        },
        EntityRelationGql {
            from_type: "VoucherEntity".to_string(),
            to_type: "AccountSubjectEntity".to_string(),
            relation_type: "many-to-one".to_string(),
            from_field: "account_subject".to_string(),
            to_field: "id".to_string(),
            service: "finance".to_string(),
        },
        EntityRelationGql {
            from_type: "EmployeeEntity".to_string(),
            to_type: "DepartmentEntity".to_string(),
            relation_type: "many-to-one".to_string(),
            from_field: "department_info".to_string(),
            to_field: "name".to_string(),
            service: "hrm".to_string(),
        },
        EntityRelationGql {
            from_type: "ContactEntity".to_string(),
            to_type: "CustomerEntity".to_string(),
            relation_type: "many-to-one".to_string(),
            from_field: "customer_id".to_string(),
            to_field: "id".to_string(),
            service: "crm".to_string(),
        },
        EntityRelationGql {
            from_type: "OrderEntity".to_string(),
            to_type: "CustomerEntity".to_string(),
            relation_type: "many-to-one".to_string(),
            from_field: "customer_id".to_string(),
            to_field: "id".to_string(),
            service: "erp".to_string(),
        },
    ];

    Ok(EntityRelationshipGraphGql {
        entities,
        relations,
    })
}

pub async fn impl_federation_stats(
    _ctx: &Context<'_>,
) -> async_graphql::Result<FederationStatsGql> {
    Ok(get_federation_stats())
}

pub async fn impl_federation_entity_list_cached(
    _ctx: &Context<'_>,
    service: String,
    entity_type: String,
    ids: Vec<String>,
) -> async_graphql::Result<Vec<FederatedEntityGql>> {
    record_federation_request();
    let results = batch_resolve_entities(&service, &entity_type, &ids).await;
    Ok(results
        .into_iter()
        .map(|(id, data)| FederatedEntityGql {
            service: service.clone(),
            entity_type: entity_type.clone(),
            id,
            data,
        })
        .collect())
}

pub async fn impl_cache_stats(_ctx: &Context<'_>) -> async_graphql::Result<CacheStatsV41Gql> {
    Ok(get_cache_stats())
}

pub async fn impl_cache_optimization_suggestions(
    _ctx: &Context<'_>,
) -> async_graphql::Result<Vec<CacheOptimizationSuggestionGql>> {
    Ok(get_cache_optimization_suggestions())
}

pub async fn impl_prefetch_rules(
    _ctx: &Context<'_>,
) -> async_graphql::Result<Vec<QueryPrefetchRuleGql>> {
    Ok(prefetch_rules().clone())
}

pub async fn impl_cache_invalidation_rules(
    _ctx: &Context<'_>,
) -> async_graphql::Result<Vec<CacheInvalidationRuleGql>> {
    Ok(cache_invalidation_rules().clone())
}

pub async fn impl_discovered_queries(
    _ctx: &Context<'_>,
    status: Option<String>,
) -> async_graphql::Result<Vec<DiscoveredQueryGql>> {
    let status_enum = status.as_deref().and_then(|s| match s {
        "new" => Some(DiscoveryStatus::New),
        "under_review" => Some(DiscoveryStatus::UnderReview),
        "approved" => Some(DiscoveryStatus::Approved),
        "rejected" => Some(DiscoveryStatus::Rejected),
        _ => None,
    });
    Ok(get_discovered_queries(status_enum))
}

pub async fn impl_auto_approval_policy(
    _ctx: &Context<'_>,
) -> async_graphql::Result<AutoApprovalPolicyGql> {
    Ok(get_auto_approval_policy())
}

pub async fn impl_security_audit_report(
    _ctx: &Context<'_>,
    period: String,
) -> async_graphql::Result<SecurityAuditReportGql> {
    Ok(generate_security_report(&period))
}

pub async fn impl_performance_tuning_suggestions(
    _ctx: &Context<'_>,
) -> async_graphql::Result<Vec<PerformanceTuningSuggestionGql>> {
    Ok(get_performance_tuning_suggestions())
}

pub async fn impl_performance_analysis(
    _ctx: &Context<'_>,
) -> async_graphql::Result<PerformanceAnalysisGql> {
    Ok(get_performance_analysis())
}

pub async fn impl_white_list_health(
    _ctx: &Context<'_>,
) -> async_graphql::Result<WhitelistHealthGql> {
    Ok(get_whitelist_health())
}

pub async fn impl_field_permissions(
    _ctx: &Context<'_>,
    entity_type: Option<String>,
) -> async_graphql::Result<Vec<FieldPermission>> {
    Ok(get_field_permissions(entity_type.as_deref()))
}

pub async fn impl_masking_rules(
    _ctx: &Context<'_>,
    entity_type: Option<String>,
) -> async_graphql::Result<Vec<MaskingRule>> {
    Ok(get_masking_rules(entity_type.as_deref()))
}

pub async fn impl_field_access_audits(
    _ctx: &Context<'_>,
    limit: Option<i32>,
    entity_type: Option<String>,
) -> async_graphql::Result<Vec<FieldAccessAudit>> {
    let limit = limit.unwrap_or(100).max(0) as usize;
    Ok(get_field_access_audits(limit, entity_type.as_deref()))
}

pub async fn impl_data_change_audits(
    _ctx: &Context<'_>,
    limit: Option<i32>,
    entity_type: Option<String>,
) -> async_graphql::Result<Vec<DataChangeAudit>> {
    let limit = limit.unwrap_or(100).max(0) as usize;
    Ok(get_data_change_audits(limit, entity_type.as_deref()))
}

pub async fn impl_security_config(_ctx: &Context<'_>) -> async_graphql::Result<SecurityConfig> {
    Ok(get_security_config())
}

pub async fn impl_federation_v2_plan(
    _ctx: &Context<'_>,
    query: String,
    variables: String,
) -> async_graphql::Result<FederationQueryPlanGql> {
    record_federation_v2_request();
    let vars = serde_json::from_str(&variables).unwrap_or(serde_json::Value::Null);
    let plan_start = std::time::Instant::now();
    let plan = plan_federation_query(&query, &vars);
    let plan_duration = plan_start.elapsed().as_millis() as u64;
    record_federation_v2_plan_time(plan_duration);
    cache_federation_v2_plan(&plan.query_hash, &plan);
    Ok(plan.to_gql())
}

pub async fn impl_federation_v2_execute(
    _ctx: &Context<'_>,
    query: String,
    variables: String,
) -> async_graphql::Result<serde_json::Value> {
    record_federation_v2_request();
    let vars = serde_json::from_str(&variables).unwrap_or(serde_json::Value::Null);
    let query_hash = federation_v2_query_hash(&query);
    let plan_start = std::time::Instant::now();
    let plan = match get_cached_federation_v2_plan(&query_hash) {
        Some(p) => {
            record_federation_v2_plan_cache_hit();
            p
        }
        None => {
            let p = plan_federation_query(&query, &vars);
            cache_federation_v2_plan(&query_hash, &p);
            record_federation_v2_plan_cache_miss();
            p
        }
    };
    let plan_duration = plan_start.elapsed().as_millis() as u64;
    record_federation_v2_plan_time(plan_duration);
    let exec_start = std::time::Instant::now();
    let result = execute_federation_plan(&plan).await;
    let exec_duration = exec_start.elapsed().as_millis() as u64;
    record_federation_v2_execute_time(exec_duration);
    Ok(result.unwrap_or_else(|e| serde_json::json!({"error": e})))
}

pub async fn impl_federation_v2_stats(
    _ctx: &Context<'_>,
) -> async_graphql::Result<FederationV2StatsGql> {
    Ok(get_federation_v2_stats())
}

pub async fn impl_registered_services(
    _ctx: &Context<'_>,
) -> async_graphql::Result<Vec<ServiceMetadata>> {
    Ok(list_services())
}

pub async fn impl_entity_metadata(
    _ctx: &Context<'_>,
    entity_name: String,
) -> async_graphql::Result<Option<EntityMetadata>> {
    Ok(get_entity_metadata(&entity_name))
}

pub async fn impl_federation_v2_sdl(_ctx: &Context<'_>) -> async_graphql::Result<String> {
    Ok(compose_federation_sdl_v2())
}

pub async fn impl_subscription_sessions(
    _ctx: &Context<'_>,
) -> async_graphql::Result<Vec<SubscriptionSessionGql>> {
    let sessions = list_sessions();
    Ok(sessions.into_iter().map(|s| s.into()).collect())
}

pub async fn impl_subscription_stats(
    _ctx: &Context<'_>,
) -> async_graphql::Result<SubscriptionStatsGql> {
    Ok(get_subscription_stats().into())
}

pub async fn impl_active_subscriptions(
    _ctx: &Context<'_>,
) -> async_graphql::Result<Vec<SubscriptionInfoGql>> {
    let sessions = list_sessions();
    let mut subs = Vec::new();
    for session in sessions {
        for sub in session.subscriptions.values() {
            subs.push(sub.clone().into());
        }
    }
    Ok(subs)
}

pub async fn impl_query_optimization_suggestions(
    _ctx: &Context<'_>,
    query_hash: Option<String>,
) -> async_graphql::Result<Vec<QueryOptimizationSuggestionGql>> {
    if let Some(hash) = query_hash {
        Ok(get_query_optimization_suggestions(&hash))
    } else {
        Ok(get_all_optimization_suggestions())
    }
}

pub async fn impl_query_health_score(
    _ctx: &Context<'_>,
    query_hash: String,
) -> async_graphql::Result<Option<QueryHealthScoreGql>> {
    Ok(get_query_health_score(&query_hash))
}

pub async fn impl_optimization_roadmap(
    _ctx: &Context<'_>,
) -> async_graphql::Result<OptimizationRoadmapGql> {
    Ok(generate_optimization_roadmap())
}

pub async fn impl_nl2graphql(
    _ctx: &Context<'_>,
    natural_language: String,
) -> async_graphql::Result<Nl2GraphqlResultGql> {
    let result = Nl2GraphqlParser::parse(&natural_language);
    record_nl2graphql_query(result.confidence);
    Ok(result)
}

pub async fn impl_cache_recommendations(
    _ctx: &Context<'_>,
) -> async_graphql::Result<CacheRecommendationReportGql> {
    Ok(get_cache_recommendations())
}

pub async fn impl_ai_optimization_stats(
    _ctx: &Context<'_>,
) -> async_graphql::Result<AiOptimizationStatsGql> {
    Ok(get_ai_optimization_stats())
}

pub async fn impl_federation_v3_plan(
    _ctx: &Context<'_>,
    query: String,
) -> async_graphql::Result<FederationV3PlanGql> {
    let vars = serde_json::Value::Null;
    let plan_start = std::time::Instant::now();
    let plan = FederationV3Planner::build_plan_v3(&query, &vars);
    let plan_duration = plan_start.elapsed().as_millis() as u64;
    let mut stats = federation_v3_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    stats.plan_count += 1;
    stats.total_plan_time_ms += plan_duration;
    let mut plan_cache = federation_v3_plan_cache()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    plan_cache.put(plan.query_hash.clone(), plan.clone());
    Ok(plan_to_gql(&plan))
}
