# B156 · LIMS 样品 / 安全检测任务状态收口（2026-11-22）

## 枚举
新增：

- `svc/lims/src/modules/sample_status.rs`：`LabSampleStatus`，8 段生命周期 `received / registered / testing / completed / stored / retrieved / disposed / destroyed`，默认 `received`；只允许相邻下一阶段，禁止跨阶、回退和同阶空转。
- `svc/lims/src/modules/safety_task_status.rs`：`SafetyTaskStatus`，`pending / in_progress / completed / cancelled`，默认 `pending`。

两个枚举均含 `DB_VALUES / as_db_str / from_db_str` 与单测。

## 代码接入
`svc/lims/src/modules/sample.rs`：

- 列表 `status` 严格解析；`all`/空值不过滤，非法值 400，SQL 绑定规范小写。
- 登记样品不再写 `'received'` 字面量，改绑 `LabSampleStatus::DEFAULT`。
- 更新入口 `status` 严格解析，非法 400，绑定规范值。
- 生命周期事件与 `/stage/{to_stage}` 的阶段值全部经枚举解析；阶段转换由 `can_transition_to` 校验，非法/回退/跨阶返回 409，当前状态异常 409。
- 阶段展示常量保留给前端接口；FSM 只用于测试的旧边表已加 `#[cfg(test)]`，生产以枚举为准。

`svc/lims/src/event_handlers/mod.rs`：

- EHS 隐患事件创建安全检测任务不再写 `'pending'` 字面量，改绑 `SafetyTaskStatus::DEFAULT`。

## 本地 DB 应用
文件：`docs/database/lims-sample-safety-task-status-check-candidates-2026-11-22.sql`

- `public.qa_lab_samples.status` 八值 `ck_qa_lab_samples_status_standard`
- `lims.lims_safety_tasks.status` 四值 `ck_lims_safety_tasks_status_standard`
- 两个约束均 `NOT VALID`，已实际应用到本地 `topems`

本地核验：

- `qa_lab_samples` 4 行全 `received`；`lims_safety_tasks` 14 行全 `pending`
- 两表 `status='bogus'` UPDATE 均被 23514 拦截，事务回滚后行数与状态不变
- `lims.samples` 为备份表，28 行 `received`，本批不设业务入口，未加约束

## 门禁
- `cargo clippy -p topems-lims --all-targets -- -D warnings`：PASS
- `cargo test -p topems-lims --lib`：155 passed / 0 failed
- catalog：**316 条 CHECK / 5 ENUM / 406 无约束列**
- 盘点：**211 Rust 枚举 / 197 值 / 60 不在 DB CHECK / 210 前端键 / 色板缺口 0**
- 队列：**45 枚举 / 60 值全部 `internal_state`**
- 前端键不在 DB CHECK：**72**
- `request-txn` 1651 未增、`scope-api` 176/144 未增、`txn-write-non2xx` PASS、glossary/i18n PASS、web typecheck PASS

## 边界
候选只应用到本地 `topems`；生产快照只读，未应用。发布需执行候选并按窗口 `VALIDATE`。
