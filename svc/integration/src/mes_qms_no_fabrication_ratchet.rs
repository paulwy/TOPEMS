//! MES ↔ QMS 联动「禁止伪造对端数据」棘轮。
//!
//! 背景：`mes_qms_integration` 的对端调用辅助函数曾经直接 `Ok(json!({...}))` 返回编造数据
//! （"示例产品A"、随机 UUID 的工单/产品、固定 100/5 的产量与不良数、95% 合格率），
//! 上层据此把同步记录写成 `synced = true`，等于把假数据当成 MES/QMS 真实回执入库。
//! `get_mes_qms_sync_stats` 则把 SQL 失败吞成 `(0, 0, 0)`，让「链路干净」成为假象。
//!
//! 本棘轮锁住：辅助函数只能显形（`ServiceUnavailable`），不得再造假；统计查询不得吞错。
#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]

const SOURCE: &str = include_str!("mes_qms_integration.rs");
const HANDLERS: &str = include_str!("handlers/mes_qms.rs");

fn require(haystack: &str, needle: &str, file: &str) {
    assert!(haystack.contains(needle), "{file} 缺少片段：{needle}");
}

fn forbid(haystack: &str, needle: &str, file: &str) {
    assert!(!haystack.contains(needle), "{file} 不应再出现：{needle}");
}

#[test]
fn remote_helpers_refuse_to_fabricate() {
    // 七个「对端调用」辅助函数都必须显形为服务不可用
    let calls = SOURCE.matches("TopemsError::ServiceUnavailable(").count();
    assert!(
        calls >= 7,
        "ServiceUnavailable 出现 {calls} 次，少于 7 个未接线辅助函数"
    );
    // 编造数据的痕迹必须消失
    forbid(SOURCE, "示例产品A", "mes_qms_integration.rs");
    forbid(SOURCE, "PO-20260625", "mes_qms_integration.rs");
    forbid(SOURCE, "BATCH-{}", "mes_qms_integration.rs");
    forbid(SOURCE, "\"李四\"", "mes_qms_integration.rs");
    forbid(SOURCE, "let _ = production_data;", "mes_qms_integration.rs");
    forbid(SOURCE, "let _ = inspection_data;", "mes_qms_integration.rs");
}

#[test]
fn stats_do_not_swallow_query_errors() {
    forbid(SOURCE, "Err(_) => (0, 0, 0)", "mes_qms_integration.rs");
    forbid(SOURCE, "Err(_) => (0, 0),", "mes_qms_integration.rs");
    forbid(
        SOURCE,
        ".ok()\n        .and_then(|row| row.try_get",
        "mes_qms_integration.rs",
    );
}

#[test]
fn handlers_surface_service_unavailable_not_500() {
    // 四个联动端点必须把错误原样上抛（ServiceUnavailable → 503），不能压成 internal → 500
    forbid(
        HANDLERS,
        "TopemsError::internal(\n                \"Failed to sync quality result to MES\"",
        "handlers/mes_qms.rs",
    );
    forbid(
        HANDLERS,
        "TopemsError::internal(\"Failed to sync trace chain data\"",
        "handlers/mes_qms.rs",
    );
    require(HANDLERS, "ApiResponse::from(e)", "handlers/mes_qms.rs");
}
