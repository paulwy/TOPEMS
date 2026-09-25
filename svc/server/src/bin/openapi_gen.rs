//! OpenAPI 文档生成器
//!
//! 合并策略：
//! - 以 docs/api/openapi.json 手工基线（31 端点/27 域）为 base（base 优先，避免注解覆盖手工精选描述）
//! - 合并各域 crate 的 utoipa ApiDoc（pm / lims / crm / erp / finance，后续域接入时在此追加）
//! - 路径规范化：注解 path 若缺 /api/<域> 前缀，按来源域自动补齐（/finance/... → /api/finance/...，
//!   相对路径 /projects/... → /api/pm/projects/...；已带 /api/ 前缀的保留原样）
//! - 输出写回 docs/api/openapi.json（registry.rs include_str! 编译期内嵌，改后需重编译重启生效）
//!
//! 用法：cargo run -p topems-server --bin openapi-gen

use serde_json::{Map, Value};
use utoipa::OpenApi;

fn normalize_path(path: &str, domain: &str) -> String {
    // 已带完整前缀（/api/... 或非域路径如 /mcp）保留
    if path.starts_with("/api/") || !path.starts_with('/') {
        return path.to_string();
    }
    // 域前缀匹配：/finance/vouchers → /api/finance/vouchers；/finance-v59/alerts → /api/finance-v59/alerts
    if let Some(rest) = path.strip_prefix(&format!("/{domain}")) {
        if rest.is_empty() {
            format!("/api/{domain}")
        } else {
            format!("/api/{domain}{rest}")
        }
    } else {
        // 相对路径：/projects/... → /api/pm/projects/...
        format!("/api/{domain}{path}")
    }
}

fn merge_paths(
    base: &mut Map<String, Value>,
    doc_paths: Option<&Map<String, Value>>,
    domain: &str,
) {
    if let Some(dp) = doc_paths {
        for (path, ops) in dp {
            let final_path = normalize_path(path, domain);
            // 同路径按 method 合并（base 已有 method 保留，新增 method 并入）：
            // 此前"base 优先整体跳过"会吞掉给已有路径补的新 method（如 POST /tickets/{id}/sla）
            base.entry(final_path)
                .and_modify(|v| {
                    if let (Some(b), Some(d)) = (v.as_object_mut(), ops.as_object()) {
                        for (m, op) in d {
                            b.entry(m.clone()).or_insert_with(|| op.clone());
                        }
                    }
                })
                .or_insert_with(|| ops.clone());
        }
    }
}

fn merge_components(base: &mut Map<String, Value>, doc_components: Option<&Map<String, Value>>) {
    if let Some(dc) = doc_components {
        for (comp_key, comp_val) in dc {
            let entry = base
                .entry(comp_key.clone())
                .or_insert_with(|| Value::Object(Map::new()));
            if let (Some(base_obj), Some(doc_obj)) = (entry.as_object_mut(), comp_val.as_object()) {
                // schemas / securitySchemes 等子对象逐 key 合并（base 优先）
                for (sub_key, sub_val) in doc_obj {
                    base_obj
                        .entry(sub_key.clone())
                        .or_insert_with(|| sub_val.clone());
                }
            } else if !base.contains_key(comp_key) {
                base.insert(comp_key.clone(), comp_val.clone());
            }
        }
    }
}

fn merge_doc(
    merged_paths: &mut Map<String, Value>,
    merged_components: &mut Map<String, Value>,
    doc: &Value,
    domain: &str,
) {
    merge_paths(
        merged_paths,
        doc.get("paths").and_then(|v| v.as_object()),
        domain,
    );
    merge_components(
        merged_components,
        doc.get("components").and_then(|v| v.as_object()),
    );
}

fn main() {
    let base_path = "docs/api/openapi.json";
    let base: Value =
        serde_json::from_str(&std::fs::read_to_string(base_path).expect("读取 base openapi.json 失败"))
            .expect("base openapi.json 非法 JSON");

    let mut merged = base.clone();
    // 重建 paths：仅保留既有 /api/ 前缀 key（手工精选 + 历史规范化），丢弃相对路径旧 key 防重复膨胀
    let mut merged_paths: Map<String, Value> = merged
        .get("paths")
        .and_then(|v| v.as_object())
        .map(|m| {
            m.iter()
                .filter(|(k, _)| k.starts_with("/api/"))
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect()
        })
        .unwrap_or_default();
    let mut merged_components = merged
        .get("components")
        .and_then(|v| v.as_object())
        .cloned()
        .unwrap_or_default();

    // 各域 ApiDoc 聚合（按需追加后续域；domain 用于路径前缀规范化）
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_pm::modules::openapi::ApiDoc::openapi())
            .expect("pm ApiDoc 序列化失败"),
        "pm",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_lims::openapi::LimsApiDoc::openapi())
            .expect("lims ApiDoc 序列化失败"),
        "lims",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_crm::modules::openapi::CrmApiDoc::openapi())
            .expect("crm ApiDoc 序列化失败"),
        "crm",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_erp::modules::openapi::ErpApiDoc::openapi())
            .expect("erp ApiDoc 序列化失败"),
        "erp",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_finance::openapi::ApiDoc::openapi())
            .expect("finance ApiDoc 序列化失败"),
        "finance",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_qms::openapi::QmsApiDoc::openapi())
            .expect("qms ApiDoc 序列化失败"),
        "qms",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_scm::modules::openapi::ScmApiDoc::openapi())
            .expect("scm ApiDoc 序列化失败"),
        "scm",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_wms::modules::openapi::WmsApiDoc::openapi())
            .expect("wms ApiDoc 序列化失败"),
        "wms",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_hrm::modules::openapi::ApiDoc::openapi())
            .expect("hrm ApiDoc 序列化失败"),
        "hrm",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_mes::modules::openapi::MesApiDoc::openapi())
            .expect("mes ApiDoc 序列化失败"),
        "mes",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_tms::modules::openapi::TmsApiDoc::openapi())
            .expect("tms ApiDoc 序列化失败"),
        "tms",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_ticket::openapi::TicketApiDoc::openapi())
            .expect("ticket ApiDoc 序列化失败"),
        "ticket",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_rd::modules::openapi::ApiDoc::openapi())
            .expect("rd ApiDoc 序列化失败"),
        "rd",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_srm::modules::openapi::SrmApiDoc::openapi())
            .expect("srm ApiDoc 序列化失败"),
        "srm",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_gis::modules::openapi::GisApiDoc::openapi())
            .expect("gis ApiDoc 序列化失败"),
        "gis",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_portal::openapi::ApiDoc::openapi())
            .expect("portal ApiDoc 序列化失败"),
        "portal",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_analytics::openapi::ApiDoc::openapi())
            .expect("analytics ApiDoc 序列化失败"),
        "bi",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_ehs::modules::openapi::ApiDoc::openapi())
            .expect("ehs ApiDoc 序列化失败"),
        "ehs",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_pdm::modules::openapi::ApiDoc::openapi())
            .expect("pdm ApiDoc 序列化失败"),
        "pdm",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_monitor::openapi::MonitorApiDoc::openapi())
            .expect("monitor ApiDoc 序列化失败"),
        "monitor",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_search::openapi::SearchApiDoc::openapi())
            .expect("search ApiDoc 序列化失败"),
        "search",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_communication::openapi::CommunicationApiDoc::openapi())
            .expect("communication ApiDoc 序列化失败"),
        "communication",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_integration::openapi::ApiDoc::openapi())
            .expect("integration ApiDoc 序列化失败"),
        "integration",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_master_data::openapi::MasterDataApiDoc::openapi())
            .expect("master-data ApiDoc 序列化失败"),
        "master-data",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_ai::modules::openapi::ApiDoc::openapi())
            .expect("ai ApiDoc 序列化失败"),
        "ai",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_plugin_registry::openapi::PluginRegistryApiDoc::openapi())
            .expect("plugin-registry ApiDoc 序列化失败"),
        "plugins",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_mobile::services::openapi::MobileApiDoc::openapi())
            .expect("mobile ApiDoc 序列化失败"),
        "mobile",
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_unified_core::ApiDoc::openapi())
            .expect("unified-core ApiDoc 序列化失败"),
        "core",
    );


    merged["paths"] = Value::Object(merged_paths);
    merged["components"] = Value::Object(merged_components);

    let out = serde_json::to_string(&merged).expect("输出序列化失败");
    std::fs::write(base_path, out).expect("写入 openapi.json 失败");

    let count = merged["paths"].as_object().map(|p| p.len()).unwrap_or(0);
    let full = merged["paths"]
        .as_object()
        .map(|p| p.keys().filter(|k| k.starts_with("/api/")).count())
        .unwrap_or(0);
    println!(
        "openapi.json 合并完成：共 {} 端点（完整前缀 {} 个）",
        count, full
    );
}
