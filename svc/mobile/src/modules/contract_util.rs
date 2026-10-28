//! 共享 client 透传解包工具
//!
//! mobile 通过共享 service-client（get/post/put/delete）调用后端服务时，
//! 返回的是整个 ApiResponse 的 JSON（含 code/success/data/message），
//! 透传 handler 再包一层 ApiResponse::success 会造成双层嵌套。
//! `unwrap_data` 取出内层 `data` 字段；若无（如数组 / 已解包形态）则原样返回。

use serde_json::Value;

use topems_shared_core::error::TopemsError;
use topems_shared_core::response::api_error;
use topems_shared_core::response::ApiResponse;

/// 解包共享 client 返回的 ApiResponse JSON，取 `data` 字段。
/// - `{"code":200,"data":{"items":[...]}}` → `{"items":[...]}`
/// - `[{"id":...}]`（get_items 已解包）→ 原样
/// - `{"items":[...],"total":0}`（业务 data 对象）→ 原样（无 data 键）
pub fn unwrap_data(v: Value) -> Value {
    v.get("data").cloned().unwrap_or(v)
}

/// 下游服务调用错误 → 业务信封：4xx（下游业务错误信封，S25 后映射为 HTTP 4xx）
/// 解析并透传；其余错误降级为 500。
pub fn downstream_error(e: &TopemsError, fallback: &str) -> ApiResponse<serde_json::Value> {
    if let TopemsError::ServiceError {
        status_code,
        message,
    } = e
    {
        if (400..500).contains(status_code) {
            let msg = serde_json::from_str::<serde_json::Value>(message)
                .ok()
                .and_then(|v| v.get("message").and_then(|m| m.as_str()).map(String::from))
                .unwrap_or_else(|| format!("下游服务返回错误 ({})", status_code));
            return api_error::<serde_json::Value>(*status_code, &msg);
        }
    }
    ApiResponse::server_error(fallback)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn extracts_inner_data_when_data_key_present() {
        let wrapped = json!({ "code": 200, "data": { "items": [1, 2, 3] } });
        assert_eq!(unwrap_data(wrapped), json!({ "items": [1, 2, 3] }));
    }

    #[test]
    fn returns_business_object_unchanged_when_no_data_key() {
        let biz = json!({ "items": [1, 2], "total": 0 });
        assert_eq!(unwrap_data(biz.clone()), biz);
    }

    #[test]
    fn returns_array_unchanged_when_already_unwrapped() {
        let arr = json!([{ "id": 1 }, { "id": 2 }]);
        assert_eq!(unwrap_data(arr.clone()), arr);
    }

    #[test]
    fn returns_scalar_unchanged() {
        let scalar = json!(42);
        assert_eq!(unwrap_data(scalar.clone()), scalar);
    }
}
