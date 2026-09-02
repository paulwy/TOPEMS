//! MCP Resources — 业务资源注册与读取。
//!
//! 实现 MCP 协议 `resources/list` / `resources/read` 能力：
//! - `crm://customers/{id}` — CRM 客户资源
//! - `erp://sales_orders/{id}` — ERP 销售订单资源
//! - `finance://vouchers/{id}` — Finance 凭证资源
//!
//! 每个资源通过真实 HTTP API 读取（复用 tools 模块共享 http_call），
//! API 不可达时返回 None（由调用方处理为资源不存在）。

use std::sync::Arc;

use tokio::sync::RwLock;

use topems_shared_mcp::protocol::{McpContent, McpResource};

use super::tools::{http_call, service_base_url};

/// 资源解析器：输入资源 ID，返回资源文本内容；失败返回 None
pub type ResourceResolver = Arc<dyn Fn(&str) -> Option<String> + Send + Sync>;

/// 资源条目
pub struct ResourceEntry {
    /// 资源元信息（列表返回）
    pub meta: McpResource,
    /// 读取解析器
    resolver: ResourceResolver,
}

/// 资源注册表
#[derive(Clone)]
pub struct ResourceRegistry {
    resources: Arc<RwLock<Vec<ResourceEntry>>>,
}

impl ResourceRegistry {
    /// 创建空资源注册表
    pub fn new() -> Self {
        Self {
            resources: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// 注册资源
    pub async fn register(
        &self,
        uri: impl Into<String>,
        name: impl Into<String>,
        description: impl Into<String>,
        mime_type: Option<String>,
        resolver: ResourceResolver,
    ) {
        let entry = ResourceEntry {
            meta: McpResource {
                uri: uri.into(),
                name: name.into(),
                description: description.into(),
                mime_type,
            },
            resolver,
        };
        self.resources.write().await.push(entry);
    }

    /// 资源数量
    pub async fn len(&self) -> usize {
        self.resources.read().await.len()
    }

    /// 是否为空
    pub async fn is_empty(&self) -> bool {
        self.resources.read().await.is_empty()
    }

    /// 资源列表（resources/list）
    pub async fn list(&self) -> Vec<McpResource> {
        self.resources
            .read()
            .await
            .iter()
            .map(|e| e.meta.clone())
            .collect()
    }

    /// 按 URI 读取资源（resources/read）
    /// 返回 (资源元信息, 内容块)；URI 不存在或读取失败返回 None
    pub async fn read(&self, uri: &str) -> Option<(McpResource, McpContent)> {
        let resources = self.resources.read().await;
        for entry in resources.iter() {
            if entry.meta.uri == uri {
                let id = uri.rsplit('/').next().unwrap_or("");
                if let Some(text) = (entry.resolver)(id) {
                    return Some((
                        entry.meta.clone(),
                        McpContent::Resource {
                            uri: uri.to_string(),
                            text: Some(text),
                        },
                    ));
                }
                return None;
            }
        }
        None
    }

    /// 按模板 URI 匹配并读取（支持 `crm://customers/{id}` 这类模板）
    pub async fn read_by_template(&self, uri: &str) -> Option<(McpResource, McpContent)> {
        let resources = self.resources.read().await;
        for entry in resources.iter() {
            let template = &entry.meta.uri;
            let (prefix, suffix) = match template.split_once('{') {
                Some((p, s)) => (
                    p.to_string(),
                    s.trim_start_matches('{')
                        .split_once('}')
                        .map(|(_, r)| r.to_string())
                        .unwrap_or_default(),
                ),
                None => continue,
            };
            if uri.starts_with(&prefix) && uri.ends_with(&suffix) {
                let id = uri[prefix.len()..uri.len() - suffix.len()].to_string();
                if let Some(text) = (entry.resolver)(&id) {
                    return Some((
                        entry.meta.clone(),
                        McpContent::Resource {
                            uri: uri.to_string(),
                            text: Some(text),
                        },
                    ));
                }
                return None;
            }
        }
        None
    }
}

impl Default for ResourceRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// 注册 3 个业务资源（crm / erp / finance），读取走真实 HTTP API
pub async fn register_business_resources(registry: &ResourceRegistry) {
    registry
        .register(
            "crm://customers/{id}",
            "CRM 客户",
            "按客户 ID 读取 CRM 客户信息",
            Some("application/json".to_string()),
            Arc::new(|id| {
                let base = service_base_url("CRM_SERVICE_URL", 8029);
                http_call(&base, "GET", &format!("/api/crm/customers/{}", id), None)
                    .map(|v| v.to_string())
            }),
        )
        .await;

    registry
        .register(
            "erp://sales_orders/{id}",
            "ERP 销售订单",
            "按订单 ID 读取 ERP 销售订单详情",
            Some("application/json".to_string()),
            Arc::new(|id| {
                let base = service_base_url("ERP_SERVICE_URL", 8010);
                http_call(&base, "GET", &format!("/api/erp/sales-orders/{}", id), None)
                    .map(|v| v.to_string())
            }),
        )
        .await;

    registry
        .register(
            "finance://vouchers/{id}",
            "Finance 凭证",
            "按凭证 ID 读取 Finance 会计凭证",
            Some("application/json".to_string()),
            Arc::new(|id| {
                let base = service_base_url("FINANCE_SERVICE_URL", 8011);
                http_call(&base, "GET", &format!("/api/finance/vouchers/{}", id), None)
                    .map(|v| v.to_string())
            }),
        )
        .await;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_register_and_list() {
        let registry = ResourceRegistry::new();
        register_business_resources(&registry).await;
        assert_eq!(registry.len().await, 3);
        let list = registry.list().await;
        let uris: Vec<&str> = list.iter().map(|r| r.uri.as_str()).collect();
        assert!(uris.contains(&"crm://customers/{id}"));
        assert!(uris.contains(&"erp://sales_orders/{id}"));
        assert!(uris.contains(&"finance://vouchers/{id}"));
    }

    #[tokio::test]
    async fn test_read_template_no_api() {
        // 无真实 API（未设置 *_SERVICE_URL 或服务不可达）时，read 返回 None（降级）
        let registry = ResourceRegistry::new();
        register_business_resources(&registry).await;
        let result = registry
            .read_by_template("crm://customers/not-exist-id")
            .await;
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_read_unknown_uri() {
        let registry = ResourceRegistry::new();
        register_business_resources(&registry).await;
        let result = registry.read_by_template("unknown://x/1").await;
        assert!(result.is_none());
    }
}
