//! 共享 client 透传解包工具
//!
//! mobile 通过共享 service-client（get/post/put/delete）调用后端服务时，
//! 返回的是整个 ApiResponse 的 JSON（含 code/success/data/message），
//! 透传 handler 再包一层 ApiResponse::success 会造成双层嵌套。
//! `unwrap_data` 取出内层 `data` 字段；若无（如数组 / 已解包形态）则原样返回。

use serde_json::Value;

/// 解包共享 client 返回的 ApiResponse JSON，取 `data` 字段。
/// - `{"code":200,"data":{"items":[...]}}` → `{"items":[...]}`
/// - `[{"id":...}]`（get_items 已解包）→ 原样
/// - `{"items":[...],"total":0}`（业务 data 对象）→ 原样（无 data 键）
pub fn unwrap_data(v: Value) -> Value {
    v.get("data").cloned().unwrap_or(v)
}
