// ==================== V37.0 Phase 7: Apollo Federation v2 实体类型 ====================
// 拆分自 graphql_schema.rs：Portal BFF 联邦网关跨服务实体类型 + __resolveReference。

use async_graphql::{ComplexObject, Context, SimpleObject};

use crate::modules::graphql_federation_runtime::record_cross_service_join;
use crate::modules::graphql_helpers::service_auth_get;

// ==================== V37.0 Phase 7: Apollo Federation v2 实体类型 ====================
//
// Portal BFF 作为联邦网关，定义所有跨服务实体类型。
// 每个实体的 @key 指令通过 federation_sdl 查询暴露在组合后的 SDL 中，
// 实体解析通过 federation_entities 查询的 __resolveReference 逻辑实现。
// 当下游服务后续启用 GraphQL 端点时，这些实体可迁移到各服务。

/// ERP Customer 联邦实体
#[derive(SimpleObject, Clone)]
#[graphql(complex)]
pub struct CustomerEntityGql {
    pub id: String,
    pub name: String,
    pub code: String,
    pub status: String,
    pub phone: Option<String>,
    pub industry: Option<String>,
    pub contact_person: Option<String>,
}

#[ComplexObject]
impl CustomerEntityGql {
    async fn orders(&self, _ctx: &Context<'_>) -> Vec<OrderEntityGql> {
        record_cross_service_join();
        let url = format!(
            "http://localhost:8010/api/erp/orders?customer_id={}",
            self.id
        );
        match service_auth_get(&url, &["erp:read"]).await {
            Ok(resp) if resp.status().is_success() => {
                let json: serde_json::Value = match resp.json().await {
                    Ok(j) => j,
                    Err(e) => {
                        tracing::warn!("Failed to parse ERP orders response JSON: {}", e);
                        serde_json::Value::Null
                    }
                };
                let items = json
                    .get("data")
                    .and_then(|d| d.get("items"))
                    .or_else(|| json.get("items"))
                    .and_then(|v| v.as_array())
                    .cloned()
                    .unwrap_or_default();
                items
                    .iter()
                    .map(|item| OrderEntityGql {
                        id: item
                            .get("id")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string(),
                        order_number: item
                            .get("order_number")
                            .or_else(|| item.get("code"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string(),
                        customer_id: item
                            .get("customer_id")
                            .and_then(|v| v.as_str())
                            .unwrap_or(&self.id)
                            .to_string(),
                        total_amount: item
                            .get("total_amount")
                            .or_else(|| item.get("amount"))
                            .and_then(|v| v.as_f64())
                            .unwrap_or(0.0),
                        status: item
                            .get("status")
                            .and_then(|v| v.as_str())
                            .unwrap_or("unknown")
                            .to_string(),
                        order_date: item
                            .get("order_date")
                            .or_else(|| item.get("created_at"))
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string()),
                    })
                    .collect()
            }
            _ => Vec::new(),
        }
    }

    async fn contacts(&self, _ctx: &Context<'_>) -> Vec<ContactEntityGql> {
        record_cross_service_join();
        let url = format!(
            "http://localhost:8029/api/crm/contacts?customer_id={}",
            self.id
        );
        match service_auth_get(&url, &["crm:read"]).await {
            Ok(resp) if resp.status().is_success() => {
                let json: serde_json::Value = match resp.json().await {
                    Ok(j) => j,
                    Err(e) => {
                        tracing::warn!("Failed to parse CRM contacts response JSON: {}", e);
                        serde_json::Value::Null
                    }
                };
                let items = json
                    .get("data")
                    .and_then(|d| d.get("items"))
                    .or_else(|| json.get("items"))
                    .and_then(|v| v.as_array())
                    .cloned()
                    .unwrap_or_default();
                items
                    .iter()
                    .map(|item| ContactEntityGql {
                        id: item
                            .get("id")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string(),
                        name: item
                            .get("name")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string(),
                        customer_id: item
                            .get("customer_id")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string()),
                        email: item
                            .get("email")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string()),
                    })
                    .collect()
            }
            _ => Vec::new(),
        }
    }
}

/// ERP Supplier 联邦实体
#[derive(SimpleObject)]
pub struct SupplierEntityGql {
    pub id: String,
    pub name: String,
    pub code: String,
    pub status: String,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
}

/// PDM/ERP Material 联邦实体
#[derive(SimpleObject)]
pub struct MaterialEntityGql {
    pub id: String,
    pub name: String,
    pub code: String,
    pub category: String,
    pub unit: Option<String>,
    pub spec: Option<String>,
    pub price: Option<f64>,
}

/// HRM Employee 联邦实体
#[derive(SimpleObject, Clone)]
#[graphql(complex)]
pub struct EmployeeEntityGql {
    pub id: String,
    pub name: String,
    pub department: String,
    pub position: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub status: Option<String>,
}

#[ComplexObject]
impl EmployeeEntityGql {
    async fn department_info(&self, _ctx: &Context<'_>) -> Option<DepartmentEntityGql> {
        record_cross_service_join();
        let url = format!(
            "http://localhost:8020/api/hrm/departments?name={}",
            self.department
        );
        match service_auth_get(&url, &["hrm:read"]).await {
            Ok(resp) if resp.status().is_success() => {
                let json: serde_json::Value = match resp.json().await {
                    Ok(j) => j,
                    Err(e) => {
                        tracing::warn!("Failed to parse HRM departments response JSON: {}", e);
                        serde_json::Value::Null
                    }
                };
                let item = json
                    .get("data")
                    .and_then(|d| d.get("items"))
                    .or_else(|| json.get("items"))
                    .and_then(|v| v.as_array())
                    .and_then(|arr| arr.first())
                    .cloned();
                item.map(|item| DepartmentEntityGql {
                    id: item
                        .get("id")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    name: item
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or(&self.department)
                        .to_string(),
                    code: item
                        .get("code")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    manager_id: item
                        .get("manager_id")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                    parent_id: item
                        .get("parent_id")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                })
            }
            _ => None,
        }
    }
}

/// Finance Voucher 联邦实体
#[derive(SimpleObject, Clone)]
#[graphql(complex)]
pub struct VoucherEntityGql {
    pub id: String,
    pub voucher_number: String,
    pub total_debit: f64,
    pub total_credit: f64,
    pub status: String,
    pub voucher_date: Option<String>,
    pub created_by: Option<String>,
}

#[ComplexObject]
impl VoucherEntityGql {
    async fn account_subject(&self, _ctx: &Context<'_>) -> Option<AccountSubjectEntityGql> {
        record_cross_service_join();
        let url = format!(
            "http://localhost:8011/api/finance/accounts?voucher_id={}",
            self.id
        );
        match service_auth_get(&url, &["finance:read"]).await {
            Ok(resp) if resp.status().is_success() => {
                let json: serde_json::Value = match resp.json().await {
                    Ok(j) => j,
                    Err(e) => {
                        tracing::warn!("Failed to parse finance accounts response JSON: {}", e);
                        serde_json::Value::Null
                    }
                };
                let item = json
                    .get("data")
                    .and_then(|d| d.get("items"))
                    .or_else(|| json.get("items"))
                    .and_then(|v| v.as_array())
                    .and_then(|arr| arr.first())
                    .cloned();
                item.map(|item| AccountSubjectEntityGql {
                    id: item
                        .get("id")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    code: item
                        .get("code")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    name: item
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    category: item
                        .get("category")
                        .or_else(|| item.get("type"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    balance: item.get("balance").and_then(|v| v.as_f64()),
                })
            }
            _ => None,
        }
    }
}

/// CRM Contact 联邦实体
#[derive(SimpleObject, Clone)]
pub struct ContactEntityGql {
    pub id: String,
    pub name: String,
    pub customer_id: Option<String>,
    pub email: Option<String>,
}

/// ERP Order 联邦实体（跨服务 Join 用）
#[derive(SimpleObject, Clone)]
pub struct OrderEntityGql {
    pub id: String,
    pub order_number: String,
    pub customer_id: String,
    pub total_amount: f64,
    pub status: String,
    pub order_date: Option<String>,
}

/// Finance AccountSubject 联邦实体（跨服务 Join 用）
#[derive(SimpleObject, Clone)]
pub struct AccountSubjectEntityGql {
    pub id: String,
    pub code: String,
    pub name: String,
    pub category: String,
    pub balance: Option<f64>,
}

/// HRM Department 联邦实体（跨服务 Join 用）
#[derive(SimpleObject, Clone)]
pub struct DepartmentEntityGql {
    pub id: String,
    pub name: String,
    pub code: String,
    pub manager_id: Option<String>,
    pub parent_id: Option<String>,
}

/// 联邦实体表示（用于 _entities 批量解析）
#[derive(SimpleObject, Clone)]
pub struct FederationRepresentationGql {
    pub __typename: String,
    pub entity: serde_json::Value,
}

/// 联邦服务 SDL 片段
#[derive(SimpleObject)]
pub struct FederationServiceSdlGql {
    pub service: String,
    pub sdl: String,
    pub available: bool,
}
