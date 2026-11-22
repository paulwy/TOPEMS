# B167 · 应急预案状态（2026-11-23）

## 枚举
- `svc/ehs/src/modules/emergency_plan_status.rs` → `EmergencyPlanStatus`：`draft / planned / ongoing / completed / cancelled`，默认 `planned`。
- 与前端 `apps/web/src/schemas/ehs/emergency.ts` 完全一致。

提供 `DB_VALUES / DEFAULT / as_db_str / from_db_str / 单测`。

## 代码收口
- 列表 `status` 过滤：空值不过滤；非法值返回 400；SQL 只绑定规范值。
- 创建：未传状态绑定 `EmergencyPlanStatus::DEFAULT`，非法值返回 400，替换原有 `planned` 字面量。
- 更新：动态 SET 的 `status` 先枚举解析，非法值返回 400，只写规范值。

## 本地 DB 应用
文件：`docs/database/ehs-emergency-plan-status-check-candidates-2026-11-23.sql`，约束 `NOT VALID`：

- `ehs.qa_ehs_emergency_plans.status` → `ck_qa_ehs_emergency_plans_status_standard`（五值）

存量 39 行全 `draft`，在集合内。执行一次 `'bogus'` UPDATE，被标准约束拦截。

## 刷新结果
- catalog：**346 条状态 CHECK / 5 个 PG ENUM / 377 个无约束状态列**
- 盘点：**229 个 Rust 枚举 / 203 个值 / 59 个不在 DB CHECK / 214 个前端键 / 色板缺口 0**
- 缺口队列：**45 个枚举 / 59 个值，全部 `internal_state`**
- 前端键不在 DB CHECK：**70**
- 映射：共 **201 条**

## 门禁
- `cargo clippy -p topems-ehs --all-targets -- -D warnings`：PASS
- `cargo test -p topems-ehs --lib`：255 passed / 0 failed
- catalog / inventory / queue 的 `--check`：PASS

## 边界
候选只应用到本地 `topems`；生产快照只读，未应用。生产发布需执行候选并按窗口 `VALIDATE`。`ehs.risk_assessments` / `ehs.safety_incidents` 虽有存量数据，但仓库未找到对应写入方，本轮不纳入。
