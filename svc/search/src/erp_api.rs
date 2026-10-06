//! 内部服务调用：search → erp HTTP API（B1/F-37：撤销 search 直读 erp.*）
//!
//! 背景：search 聚合检索此前直接以 SQL 直读 erp.customers / erp.sales_orders /
//! erp.purchase_orders（schema 越界，T3 临时白名单登记）。本模块改为调用 erp 服务
//! 现有 list API（GET /api/erp/customers?search=、/sales-orders、/purchase-orders），
//! 以 service token（JWT_SECRET 同源签发）完成服务间鉴权。

use serde_json::Value;
use topems_shared_auth::service::issue_service_token;
use tracing::warn;
use uuid::Uuid;

/// erp 服务基础地址（monolith 聚合网关；独立部署时经 ERP_BASE_URL 覆盖）
fn erp_base_url() -> String {
    std::env::var("ERP_BASE_URL").unwrap_or_else(|_| "http://localhost:8099".to_string())
}

/// 签发 search 服务身份 token（与 erp 同 JWT_SECRET；nil UUID sub + role=service）
fn service_token() -> Option<String> {
    let secret = std::env::var("JWT_SECRET").ok()?;
    issue_service_token(&secret, "search-service", &["erp:read"], None).ok()
}

/// 客户搜索结果行（erp list API data.items 字段映射）
#[derive(Debug, Clone)]
pub struct CustomerHit {
    pub id: Uuid,
    pub code: Option<String>,
    pub name: String,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
}

/// 订单搜索结果行（erp list API data.items 字段映射）
#[derive(Debug, Clone)]
pub struct OrderHit {
    pub id: Uuid,
    pub order_no: String,
    pub status: Option<String>,
    pub remark: Option<String>,
}

/// 通用请求：GET {base}/api/erp/<path>?search=<kw>&page_size=<limit>&page=1
async fn get_items(path: &str, keyword: &str, limit: i64) -> Option<Vec<Value>> {
    let Some(token) = service_token() else {
        warn!("search: service_token 签发失败（JWT_SECRET 缺失？），erp 检索降级为空");
        return None;
    };
    let url = format!("{}/api/erp/{}", erp_base_url(), path);
    let client = reqwest::Client::new();
    let resp = match client
        .get(&url)
        .bearer_auth(&token)
        .query(&[
            ("search", keyword),
            ("page_size", &limit.to_string()),
            ("page", "1"),
        ])
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            warn!("search: erp API 调用失败 {}: {}", url, e);
            return None;
        }
    };
    if !resp.status().is_success() {
        warn!("search: erp API {} 返回 HTTP {}", url, resp.status());
        return None;
    }
    let body: Value = match resp.json().await {
        Ok(v) => v,
        Err(e) => {
            warn!("search: erp API 响应解析失败 {}: {}", url, e);
            return None;
        }
    };
    body.get("data")?.get("items")?.as_array().cloned()
}

/// 按关键字检索客户（走 erp GET /api/erp/customers）
pub async fn search_customers_via_api(keyword: &str, limit: i64) -> Vec<CustomerHit> {
    let Some(items) = get_items("customers", keyword, limit).await else {
        return Vec::new();
    };
    items
        .into_iter()
        .filter_map(|v| {
            let id = Uuid::parse_str(v.get("id")?.as_str()?).ok()?;
            let name = v.get("name")?.as_str()?.to_string();
            Some(CustomerHit {
                id,
                code: v.get("code").and_then(|x| x.as_str()).map(String::from),
                name,
                contact_person: v
                    .get("contact_person")
                    .and_then(|x| x.as_str())
                    .map(String::from),
                contact_phone: v
                    .get("contact_phone")
                    .and_then(|x| x.as_str())
                    .map(String::from),
                email: v.get("email").and_then(|x| x.as_str()).map(String::from),
                address: v.get("address").and_then(|x| x.as_str()).map(String::from),
            })
        })
        .collect()
}

/// 按关键字检索销售订单（走 erp GET /api/erp/sales-orders）
pub async fn search_sales_orders_via_api(keyword: &str, limit: i64) -> Vec<OrderHit> {
    let Some(items) = get_items("sales-orders", keyword, limit).await else {
        return Vec::new();
    };
    items
        .into_iter()
        .filter_map(|v| {
            let id = Uuid::parse_str(v.get("id")?.as_str()?).ok()?;
            Some(OrderHit {
                id,
                order_no: v.get("order_no")?.as_str()?.to_string(),
                status: v.get("status").and_then(|x| x.as_str()).map(String::from),
                remark: v.get("remark").and_then(|x| x.as_str()).map(String::from),
            })
        })
        .collect()
}

/// 按关键字检索采购订单（走 erp GET /api/erp/purchase-orders）
pub async fn search_purchase_orders_via_api(keyword: &str, limit: i64) -> Vec<OrderHit> {
    let Some(items) = get_items("purchase-orders", keyword, limit).await else {
        return Vec::new();
    };
    items
        .into_iter()
        .filter_map(|v| {
            let id = Uuid::parse_str(v.get("id")?.as_str()?).ok()?;
            Some(OrderHit {
                id,
                order_no: v.get("order_no")?.as_str()?.to_string(),
                status: v.get("status").and_then(|x| x.as_str()).map(String::from),
                remark: v.get("remark").and_then(|x| x.as_str()).map(String::from),
            })
        })
        .collect()
}
