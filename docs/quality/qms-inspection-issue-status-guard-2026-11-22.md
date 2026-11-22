# B157 · QMS 质检单 / 质量问题状态收口（2026-11-22）

## 枚举
新增 `svc/qms/src/modules/qms_status.rs`：

- `QmsInspectionStatus`：`pending / in_progress / pending_audit / completed / rejected / cancelled`，默认 `pending`
- `QmsIssueStatus`：`open / in_progress / resolved / closed / approved / rejected / cancelled`，默认 `open`

两个枚举均含 `DB_VALUES / as_db_str / from_db_str` 与 roundtrip 单测。

## 代码接入
`svc/qms/src/modules/quality_inspection.rs`：

- 列表 `status` 严格解析，非法 400，SQL 绑定规范小写；`all`/空值不过滤
- 创建质检单不再写 `'pending'` 字面量，改绑 `QmsInspectionStatus::DEFAULT`
- 原 `STATUS_*` 常量继续供审批/流转 FSM 使用，值集与枚举一致

`svc/qms/src/modules/quality_issue.rs`：

- 列表 `status` 严格解析，非法 400，SQL 绑定规范小写
- 创建质量问题不再写 `'open'` 字面量，改绑 `QmsIssueStatus::DEFAULT`
- 更新入口 `status` 严格解析，非法 400，绑定规范值
- 审批/关闭/解决等动作仍走既有 FSM 常量，值集与枚举一致

## 本地 DB 应用
文件：`docs/database/qms-inspection-issue-status-check-candidates-2026-11-22.sql`

- `qms.qa_quality_inspections.status` 六值
- `qms.quality_inspections.status` 六值（历史表，43 行 pending）
- `qms.qa_quality_issues.status` 七值

三个约束均 `NOT VALID`，已实际应用到本地 `topems`。

本地核验：

- `qa_quality_inspections`：pending 1 / pending_audit 1
- `quality_inspections`：pending 43
- `qa_quality_issues`：open 15
- 三表 `status='bogus'` UPDATE 均被 23514 拦截，事务回滚后数据不变

## 门禁
- `cargo clippy -p topems-qms --all-targets -- -D warnings`：PASS
- `cargo test -p topems-qms --lib`：264 passed / 0 failed
- catalog：**319 条 CHECK / 5 ENUM / 403 无约束列**
- 盘点：**213 Rust 枚举 / 198 值 / 60 不在 DB CHECK / 211 前端键 / 色板缺口 0**
- 队列：**45 枚举 / 60 值全部 `internal_state`**
- 前端键不在 DB CHECK：**72**
- `request-txn`/`scope-api` 未增、`txn-write-non2xx` PASS、glossary/i18n PASS、web typecheck PASS

## 边界
候选只应用到本地 `topems`；生产快照只读，未应用。发布需执行候选并按窗口 `VALIDATE`。
