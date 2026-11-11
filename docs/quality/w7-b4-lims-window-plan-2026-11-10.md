# W7 · B4 LIMS 落地：本地证据 + 预演 + 开窗方案

- 日期：2026-11-10
- 状态：**代码改完、本地验证通过、预演通过；生产未执行任何 DDL/DML/重启**
- 关联：
  - [跨请求租户上下文范式](w7-cross-request-tenant-context-2026-11-10.md)
  - [LIMS 表清单冻结](w7-b4-lims-rls-freeze-2026-11-10.md)
  - 迁移：[20261110210000_w7_b4_lims_rls_policies.sql](../../database/migrations/20261110210000_w7_b4_lims_rls_policies.sql)
  - 验证：[w7_b4_lims_verify.sql](../../scripts/ops/w7_b4_lims_verify.sql)

---

## 1. 代码改造清单（已完成）

| 项 | 文件 | 结果 |
| --- | --- | --- |
| 取租户 helper | `lib/shared-event/src/event/tenant_context.rs` | 新增 `require_event_tenant` / `EventTenant` / 三种错误码 + 单测 4 例 |
| 逐租户扫描 helper | `lib/shared-db/src/tenant_sweep.rs` | 新增 `enumerate_tenants` / `sweep_tenants` / `TenantSweepReport` |
| nil 守卫单测 | `lib/shared-db/src/scope.rs` | `scope_for_tenant(nil)` 必须 `Protocol`，1 例 |
| 事件 payload 契约 | `lib/shared-event/src/event/event_types.rs` | `QmsInspectionCompletedPayload` / `EhsHazardReportedPayload` 增加必填 `tenant_id` |
| 生产端 | `svc/qms/src/modules/quality_inspection.rs`、`svc/ehs/src/modules/hazard.rs` | 发布时写入当前租户 |
| LIMS 事件处理器 | `svc/lims/src/event_handlers/mod.rs` | 裸池 → `Db`；硬编码全 0 租户 → payload 租户；失败不再吞（返回 Err 进重试/DLQ） |
| LIMS 缓存预热 | `svc/lims/src/main.rs` | 全局键 `lims:sample:list:warmup` → 逐租户 `lims:sample:list:<tenant>…`；任务同 |
| 裸池清零 | `svc/lims/src/modules/**`（23 文件） | 208 处查询改为 `scope_read()` / `scope()`；`&state.pool` 归零；`set_config('app.tenant_id')` 块全部移除 |
| 状态注入 | `svc/lims/src/shared/mod.rs` | `AppState.db: Db`；`FromRef<AppState> for Db`；删除 `FromRef<AppState> for PgPool` |
| 单体内嵌 LIMS | `svc/server/src/modules/lims_real_module.rs` | 同步构造 `Db` |

门禁：`cargo fmt`、`cargo clippy -p topems-lims -p topems-shared-db -p topems-shared-event -p topems-qms -p topems-ehs --all-targets -- -D warnings`、`cargo check --workspace` 全绿。

---

## 2. 本地三条证据

环境：本地 clone 库 `w7_b4_lims_ab`（`CREATE DATABASE … TEMPLATE topems`），迁移前灌 A/B 双租户数据；
租户 A = `00000000-0000-0000-0000-000000000001`，B = `…0002`；验证角色 `topems_app`（非超户）。

### E1. 跨租户 0 行

```
=== B. 双身份（基线=系统通道）===
 tables | total_rows | rows_tenant_a | rows_tenant_b
     76 |         60 |            14 |             3
NOTICE:  B1. tenant=...0001 逐表可见性 通过
NOTICE:  B2. tenant=...0002 逐表可见性 通过（跨租户 0 行）
NOTICE:  B3. 无上下文 fail-closed 通过（76 张全 0）
NOTICE:  C1. 跨租户改写 0 行 通过
NOTICE:  C3. 无上下文写 0 行 通过
```

- A 可见 14 行、B 可见 3 行，互不重叠；
- 系统通道基线 60 行 = A+B+其他历史租户，证明“看得到全量”只发生在系统通道；
- 76 张表逐表比对，无一张越界。

### E2. 缓存不串

```
test modules::sample::tests::test_sample_cache_keys_are_tenant_scoped ... ok
```

- 列表键：`lims:sample:list:{tenant}:p:1:ps:10:s:all:no:all:nm:all`；
- 详情键：`lims:sample:{tenant}:{id}`；任务键：`lims:task:list:{tenant}`；
- 预热改为 `sweep_tenants` 逐租户读取并写各自键，彻底移除 `…:warmup` 全局键。

### E3. nil 上下文报错

```
test event::tenant_context::tests::rejects_null_empty_and_nil ... ok
test scope::tenant_guard_tests::explicit_tenant_scopes_reject_nil ... ok
```

- 事件：`payload.tenant_id` 缺失/`null`/空串/全 0 → `[tenant_ctx:missing|nil|malformed]` → `ValidationFailed` → 重试上限 → DLQ；
- 后台/脚本：`scope_for_tenant(nil)` 直接返回 `Protocol("RLS context missing: …")`，不降级为系统通道。

### 结构断言（同一脚本）

```
A1. 76 张 ENABLE+FORCE / 单策略 rls_tenant_isolation 通过
A2. 谓词形态 通过（系统通道 76；USING(true)/列侧 cast/nil/NULL 分支 均 0）
C2. 系统通道可写 1 行 通过
C4. 事件幂等索引含 tenant_id 通过
D. 全局只读表 0 张 通过
=== LIMS 验证全部通过 ===
```

---

## 3. 预演（单事务 ROLLBACK，已在本地执行）

```bash
python3 - <<'PY'   # 去掉文件自带 BEGIN/COMMIT，改为外层事务控制
...
PY
psql -h /tmp -d w7_b4_lims_ab -X -q -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
\i /tmp/lims_migration_no_tx.sql
SELECT count(*) FROM pg_policies
 WHERE policyname='rls_tenant_isolation'
   AND (schemaname='lims' OR (schemaname='public' AND (tablename LIKE 'qa_lab%' OR tablename LIKE 'qa_lims%')));
ROLLBACK;
SQL
```

结果：

| 项 | 值 |
| --- | --- |
| 事务内策略数 | 76 |
| 事务内断言 | `LIMS RLS：76/76 张表已收敛为 fail-closed + FORCE` |
| 回滚后 | 策略仍 76（幂等），无数据变化 |
| 耗时 | **real 0.11s**（本地空表；生产预计同量级） |
| 重复执行 | 第二次整文件执行同样 76/76，无报错（幂等） |

---

## 4. 正式开窗方案（待批准）

> 前置：release 构建对齐当前 HEAD、工作树干净、产物 sha256 已记录；
> 备份用超管，验证用非超户（窗口公共前置 §1.0）。

### P0. 开窗前

- `git rev-parse HEAD` 与发布产物一致；源码无未提交件；
- `launchctl bootout gui/$UID/com.topems.server` + `com.topems.backup`；
- 确认 8099 无监听、DB 无应用连接（`pg_stat_activity` 按 `topems_prod` 过滤）；
- 记录 `_sqlx_migrations` 行数与 `max(version)`（PDM 收口后为 654，本笔预期 → 655，以实测为准）。

### P1. 备份（**超级用户** `xingzhai`）

- 全库 `pg_dump -Fc`；
- `lims` + `public.qa_lab_*` / `qa_lims_*` 的 `pg_policies` 快照；
- 76 张表 RLS 标志快照；
- `_sqlx_migrations` 快照；
- 旧二进制。

### P2. 迁移（单连接、单事务）

```bash
psql -X -1 -v ON_ERROR_STOP=1 \
  -c "SET LOCAL lock_timeout='5s'" \
  -f database/migrations/20261110210000_w7_b4_lims_rls_policies.sql \
  -c "INSERT INTO _sqlx_migrations (version, description, installed_on, success, checksum, execution_time)
      VALUES (20261110210000, 'w7 b4 lims rls policies', now(), true,
              decode('<shasum -a 384 现算>', 'hex'), 0);"
```

- 迁移末段自带 76/76 断言，失败即整事务回滚；
- 同一事务内补 1 行账本（`success=true`、`execution_time=0`）。

### P3. 验证（非超户 `topems_prod`）

```bash
psql -X -v ON_ERROR_STOP=1 -v app_role=topems_prod -f scripts/ops/w7_b4_lims_verify.sql
```

必须全段通过：A1/A2、B1/B2/B3、C1/C2/C3/C4、D。

### P4. 换二进制 + 起服务

- 替换 release 产物 → `bootstrap`；
- `/health`、`/api/server/health`（`degraded=0`）、`/api/server/ready`。

### P5. 生产 HTTP 冒烟

- 超管 + 显式租户头 → 200；
- 超管无租户头 → 400；
- 普通用户带他人租户头 → 按自己租户；
- LIMS 列表读 smoke（真实 token）。

### P6. 恢复

- `launchctl bootstrap` 恢复 `com.topems.backup`；
- 记录停写时长、迁移耗时、账本推进、逐表结果、HTTP 状态码。

### 失败回滚顺序

1. 迁移事务未提交：自动回滚，服务不用动；
2. 已提交但验证失败：用 P1 策略/RLS 快照重建旧策略，`DELETE` 本笔账本行；
3. 二进制异常：回退旧二进制 + 重启，再按 2 处理；
4. 任一步失败即停下报告，不继续后续步骤。

---

## 5. 验收基线

| 项 | 期望 |
| --- | --- |
| 策略数 | `lims.*` + `public.qa_*` 共 **76** 条 `rls_tenant_isolation` |
| 结构 | 76 张 ENABLE + FORCE（含此前未 FORCE 的 `lims.qa_lims_analytes`） |
| 谓词 | `USING(true)` 0、`tenant_id IS NULL` 0、列侧 cast 0、nil 分支 0、系统通道 76 |
| 双身份 | 跨租户 0 行；无上下文 76 张全 0 |
| 幂等索引 | `lims_inspection_records` / `lims_safety_tasks` 唯一约束含 `tenant_id` |
| 全局只读表 | 0 张（无需登记项） |
| 账本 | 开窗前实测 + 1，`success=true` |
| 日志 | panic 0；无 `RLS context missing` 刷屏；无 `[tenant_ctx:*]` 持续告警 |

---

## 6. 依赖与风险（开窗前必须确认）

| 项 | 说明 |
| --- | --- |
| **QMS / EHS 必须同批上线** | 新 LIMS 要求 `payload.tenant_id`；旧生产端不带该字段 → 事件进 DLQ。窗口内需同时替换 QMS、EHS、LIMS（同 release） |
| 旧 LIMS 二进制 + 新策略 | 旧代码写全 0 租户，会被 fail-closed 拒绝；因此迁移与换二进制必须在同一停写窗口内完成 |
| `integration` 仍用 nil 租户 | `svc/integration/src/qms_lims_ehs.rs` 以 `Uuid::nil()` 调下游，属既有债；不在本轮修，但会让相关转发落空，需在 integration 收口时处理 |
| `ehs` 超管分支 | `hazard.rs` 对超管仍取 `None` 回退 nil，与新口径不一致；同批上线后超管创建的隐患事件会进 DLQ，需在 EHS 收口时修正 |
| 双 schema 同名表 | 迁移已两套全收；后续新增 LIMS 表必须同步纳入冻结清单与验证脚本 |
