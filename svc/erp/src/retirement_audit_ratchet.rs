//! 退役/回滚审计落库棘轮。
//!
//! 背景：`mdm_v49_retirement` 的 execute / rollback 处理器曾经把
//! `RetirementExecuteRequest.executed_by`、`RetirementRollbackRequest.rollback_by|reason`
//! 用 `let _ = req;` 直接丢掉，接口照样回 200「退役已执行 / 已回滚」，但审计轨迹里
//! 查不到「谁执行的、谁回滚的、为什么回滚」。
//!
//! 这个棘轮锁住三件事：请求里的操作人与原因必须写进计划记录；verb 别名接口不得
//! 在缺少 plan_id 时对「第一条计划」动手；执行前必须有状态门。
#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]

const SOURCE: &str = include_str!("modules/mdm_v49_retirement.rs");

fn require(needle: &str) {
    assert!(
        SOURCE.contains(needle),
        "mdm_v49_retirement.rs 缺少片段：{needle}"
    );
}

fn forbid(needle: &str) {
    assert!(
        !SOURCE.contains(needle),
        "mdm_v49_retirement.rs 不应再出现：{needle}"
    );
}

#[test]
fn execute_records_operator_and_guards_state() {
    require("plan.executed_by = Some(");
    // 未确认的计划不允许直接执行
    require("RetirementStatus::Confirmed | RetirementStatus::Executing");
    forbid("let _ = req;");
}

#[test]
fn rollback_records_operator_reason_and_time() {
    require("plan.rolled_back_by = Some(");
    require("plan.rollback_reason = Some(");
    require("plan.rolled_back_at = Some(");
    // verb 别名也必须落审计
    require("\"rollback_by\"");
    require("\"rollback_reason\"");
}

#[test]
fn verb_aliases_never_default_to_first_plan() {
    require("缺少 plan_id，拒绝按默认计划取消退役");
    require("缺少 plan_id，拒绝按默认计划回滚退役");
    forbid("plans.first_mut()");
}
