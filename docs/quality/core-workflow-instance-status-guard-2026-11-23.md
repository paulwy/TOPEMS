# B169 · 工作流实例状态（2026-11-23）

## 枚举
- `svc/unified-core/src/modules/flow/workflow_instance_status.rs` → `WorkflowInstanceStatus`：`pending / running / approved / rejected / cancelled / suspended / completed / error`，默认 `running`。
- 值集来源：实例创建、审批发起创建、启动/通过/驳回/取消/恢复/暂停/重试端点；`completed`、`error` 为监控统计使用的终态与异常态，必须保留。

提供 `DB_VALUES / DEFAULT / as_db_str / from_db_str / 单测`。

## 代码收口
- 列表：`status` 过滤支持空 / `all`，非法值返回 400，计数与列表查询只绑定规范值。
- 实例创建：`instance.rs` 与 `approval.rs` 两处硬编码 `'running'` 改为绑定 `WorkflowInstanceStatus::DEFAULT`。
- 状态流转：启动、通过、驳回、取消、恢复、暂停、重试七处 `SET status = '...'` 全部改为参数绑定；重试因已有 `$2` 节点参数，状态使用 `$3` 并同步重排。

## 本地 DB 应用
文件：`docs/database/core-workflow-instance-status-check-candidates-2026-11-23.sql`，约束 `NOT VALID`：

- `public.core_workflow_instances.status` → `ck_core_workflow_instances_status_standard`（八值）

存量 2 行：1 `cancelled` / 1 `approved`，均在集合内。执行一次 `'bogus'` UPDATE，被标准约束拦截。

## 刷新结果
- catalog：**348 条状态 CHECK / 5 个 PG ENUM / 375 个无约束状态列**
- 盘点：**231 个 Rust 枚举 / 204 个值 / 59 个不在 DB CHECK / 215 个前端键 / 色板缺口 0**
- 缺口队列：**45 个枚举 / 59 个值，全部 `internal_state`**
- 前端键不在 DB CHECK：**70**
- 映射：共 **203 条**

## 门禁
- `cargo clippy -p topems-unified-core --lib --tests --no-default-features -- -D warnings`：PASS
- `cargo test -p topems-unified-core --lib`：568 passed / 0 failed
- catalog / inventory / queue 的 `--check`：PASS

## 边界
候选只应用到本地 `topems`；生产快照只读，未应用。生产发布需执行候选并按窗口 `VALIDATE`。`public.core_workflow_tasks.status` 属于任务状态机，下一批单独收口。
