//! OpenAPI 文档生成器
//!
//! 合并策略：
//! - 以 docs/api/openapi.json 手工基线（31 端点/27 域）为 base（base 优先，避免注解覆盖手工精选描述）
//! - 合并各域 crate 的 utoipa ApiDoc（pm: ApiDoc / lims: LimsApiDoc，后续域接入时在此追加）
//! - 输出写回 docs/api/openapi.json（registry.rs include_str! 编译期内嵌，改后需重编译重启生效）
//!
//! 用法：cargo run -p topems-server --bin openapi-gen

use serde_json::{Map, Value};
use utoipa::OpenApi;

fn merge_paths(base: &mut Map<String, Value>, doc_paths: Option<&Map<String, Value>>) {
    if let Some(dp) = doc_paths {
        for (path, ops) in dp {
            // base 优先：同路径已有则不覆盖（保留手工精选）
            base.entry(path.clone()).or_insert_with(|| ops.clone());
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

fn merge_doc(merged_paths: &mut Map<String, Value>, merged_components: &mut Map<String, Value>, doc: &Value) {
    merge_paths(
        merged_paths,
        doc.get("paths").and_then(|v| v.as_object()),
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
    let mut merged_paths = merged
        .get("paths")
        .and_then(|v| v.as_object())
        .cloned()
        .unwrap_or_default();
    let mut merged_components = merged
        .get("components")
        .and_then(|v| v.as_object())
        .cloned()
        .unwrap_or_default();

    // 各域 ApiDoc 聚合（按需追加后续域）
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_pm::modules::openapi::ApiDoc::openapi())
            .expect("pm ApiDoc 序列化失败"),
    );
    merge_doc(
        &mut merged_paths,
        &mut merged_components,
        &serde_json::to_value(topems_lims::openapi::LimsApiDoc::openapi())
            .expect("lims ApiDoc 序列化失败"),
    );

    merged["paths"] = Value::Object(merged_paths);
    merged["components"] = Value::Object(merged_components);

    let out = serde_json::to_string_pretty(&merged).expect("输出序列化失败");
    std::fs::write(base_path, out).expect("写入 openapi.json 失败");

    let count = merged["paths"].as_object().map(|p| p.len()).unwrap_or(0);
    println!("openapi.json 合并完成：共 {} 端点（base 31 + 注解去重增量）", count);
}
