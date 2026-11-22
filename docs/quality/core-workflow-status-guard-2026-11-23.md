# B168 · 工作流定义状态（2026-11-23）

## 枚举
- `svc/unified-core/src/modules/flow/workflow_status.rs` → `WorkflowStatus`：`draft / published / active / inactive / deployed`，默认 `draft`。
- 值集来自 `public.core_workflows` 存量与 `flow/workflow.rs` 的五个状态流转端点；Web 侧未找到独立 workflow schema，补 `deployed` 色板满足前端统一渲染。

提供 `DB_VALUES / DEFAULT / as_db_str / from_db_str / 单测`。

## 代码收口
- 列表：`status` 过滤支持空 / `all`，非法值返回 400，计数和列表查询只绑定规范值。
- 创建：`status` 未传绑定 `WorkflowStatus::DEFAULT`，非法值返回 400，替换 `"draft"` 字面量。
- 更新：`status` 可选；传入时先枚举解析，非法值返回 400，SQL 只绑定规范值。
- 发布 / 取消发布 / 激活 / 停用 / 部署：五处 `SET status = '...'` 全部改为 `$2` 参数绑定，目标状态来自枚举。

## 本地 DB 应用
文件：`docs/database/core-workflow-status-check-candidates-2026-11-23.sql`，约束 `NOT VALID`：

- `public.core_workflows.status` → `ck_core_workflows_status_standard`（五值）

存量 21 行：19 `published` / 1 `draft` / 1 `deployed`，均在集合内。执行一次 `'bogus'` UPDATE，被标准约束拦截。

## 刷新结果
- catalog：**347 条状态 CHECK / 5 个 PG ENUM / 376 个无约束状态列**
- 盘点：**230 个 Rust 枚举 / 204 个值 / 59 个不在 DB CHECK / 215 个前端键 / 色板缺口 0**
- 缺口队列：**45 个枚举 / 59 个值，全部 `internal_state`**
- 前端键不在 DB CHECK：**70**
- 映射：共 **202 条**

## 门禁
- `cargo clippy -p topems-unified-core --lib --tests --no-default-features -- -D warnings`：PASS
- `cargo test -p topems-unified-core --lib`：567 passed / 0 failed
- `cd apps/web && npm run typecheck`：PASS
- catalog / inventory / queue 的 `--check`：PASS

## 边界
候选只应用到本地 `topems`；生产快照只读，未应用。生产发布需执行候选并按窗口 `VALIDATE`。`public.core_workflow_instances.status` 本轮未纳入，下一批单独收口实例状态机。
