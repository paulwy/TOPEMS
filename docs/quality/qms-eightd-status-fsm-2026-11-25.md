# B277 QMS 8D 报告状态对齐 FSM（2026-11-25）

## 结论

QMS `shared/fsm::EIGHT_D` 已定义八态状态机，但 `qms.qa_eightd_reports.status` 可空、无 CHECK、默认 `new`，创建写 `new`；`update_eightd_report` 直接写任意 status，D1–D8 步骤入口全部直接改状态。本批把库内列和全部写入口统一到 EIGHT_D FSM。

## 根因与影响

- 创建状态 `new` 不在 EIGHT_D 八态内，导致新报告从非法态开始。
- `update_eightd_report` 可直接把 `closed/cancelled` 改回 `initiated/in_progress`，跳过审批。
- D1/D3/D4/D5 都写 `in_progress`，D6/D7 写 `verified`，D8 写 `closed`，步骤与 FSM 的 `containment/root_cause/permanent_action` 不一致，且不校验来源态。
- 步骤 UPDATE 无 `AND status = 当前态`，并发可互相覆盖。
- DB 列可空且无 CHECK，无法兜底。

## 处置

`svc/qms/src/modules/eight_d.rs`：

- 新增 `guard_eight_d_status`：按 `id + tenant_id + deleted_at IS NULL` 读当前态，非法/空值 409，不存在 404；目标态与当前态不同时调用 `eight_d_can_transition`，非法 400。
- 创建状态改为 `initiated`。
- `update_eightd_report`：status 先 trim/lower，非八态 400；带 `guard_eight_d_status`，UPDATE 增加 `AND status = 当前态`，并发 409。
- 步骤入口统一接入守卫，状态推进为：
  - D1 `initiated → in_progress`
  - D3 `in_progress → containment`
  - D4 `containment → root_cause`
  - D5 `root_cause → permanent_action`
  - D6 `permanent_action → verified`
  - D7 保持 `verified`（同态幂等）
  - D8 `verified → closed`
- 每个步骤 UPDATE 增加 `AND status = 当前态`。

`database/migrations/20261125006000_qms_eightd_status_standard.sql`：

1. 默认值 `new → initiated`。
2. `new`/NULL 归 `initiated`。
3. `SET NOT NULL`。
4. 新增 `ck_qa_eightd_reports_status_standard` 八态 CHECK 并 `VALIDATE`。
5. 回滚恢复 `'new'` 默认、可空并移除 CHECK。

## 验证

| 验证项 | 结果 |
| --- | --- |
| 本地应用 | `is_nullable=NO`、默认 `initiated`、约束 `convalidated=t` |
| 幂等复跑 | 第二次应用成功，`UPDATE 0` |
| 前向回填 | scratch 中 `new` 与 NULL 均回填为 `initiated` |
| 约束探针 | `bogus` 被 CHECK 拒绝；`NULL` 被 NOT NULL 拒绝；`in_progress` 可写 |
| 回滚 | 恢复 `is_nullable=YES`、默认 `new` |
| QMS 测试 | 268 + 230 + 12 + 13 + 13 passed，0 failed |
| clippy | `cargo clippy -p topems-qms --all-targets -- -D warnings` 通过 |
| 迁移校验 | 877 文件，`Checksum errors 0`、`Schema drift 0`、`Errors 0` |

## 行为提示

D3/D4/D5 现在必须按 D1→D3→D4→D5→D6→D8 顺序推进，跳步会返回 400；这是把原先“全部写 in_progress / 直接 verified”的隐式行为改为显式 FSM 语义。表内当前无存量数据影响。
