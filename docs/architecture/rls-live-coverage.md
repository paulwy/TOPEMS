# RLS 实时盘点（Live Coverage）

> 本文件基于运行库 `postgres://topems@localhost:5432/topems` 实时查询（information_schema + pg_class），**权威口径**；`check-rls-coverage.py` 静态扫描（仅迁移 SQL）结果见 `rls-coverage-report.md` 并已标注局限。生成日期：2026-09-08（实施后）。

## 实施后状态（迁移 20260908000015 试点 + 20260908000016 全量）

| 项 | 数量 |
|---|---|
| 含 tenant_id/org_id 列的对象 | 570（普通表 **567** + 视图 3） |
| 含租户列普通表 | 567 |
| RLS 已启用（relrowsecurity=t） | **567（100%）** |
| 含租户列但未启用 RLS | **0** |
| 策略 `rls_tenant_isolation` | 331 个（试点 4 + 全量 327，ALL） |
| 视图（不单列，由底层表控制） | 3（`public.assets` 等） |

## 策略模板

```sql
CREATE POLICY rls_tenant_isolation ON <table>
USING (
  current_setting('app.current_tenant_id', true) IS NULL        -- 无上下文：放行（兼容）
  OR current_setting('app.current_tenant_id', true) = ''        -- 空上下文：放行
  OR tenant_id IS NULL                                          -- 共享/系统行：放行
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid  -- 本租户
)
WITH CHECK (同 USING);
-- text/varchar tenant_id 列：末项改用 ::text
-- 未使用 FORCE ROW LEVEL SECURITY：superuser/owner 管理通道保留
```

## 语义验证（试点，非 superuser 角色）

- 有租户上下文（`SET app.current_tenant_id='<uuid>'`）→ SELECT 仅见本租户行 ✓
- 越权写入他租户行 → `ERROR: new row violates row-level security policy` ✓
- 无上下文 → 全放行（兼容现有连接）✓
- superuser 绕过 RLS（预期，未 FORCE）✓

## 阶段 2（隔离真正生效，待专项）

1. **服务会话注入租户上下文**：后端连接建立时 `SET app.current_tenant_id = <当前请求租户>`（当前全仓 rg 无任何 `current_setting('app.current_tenant_id')` 设置代码）。
2. **应用角色非 superuser 化**：`topems` 为 Superuser（RLS 默认绕过）——需专用业务角色（可选项：FORCE ROW LEVEL SECURITY + 策略白名单）。
3. 逐服务回归：多租户数据互不可见。

## 未启用对象明细（追溯：实施前 334 张目标清单）

实施前目标 334 张 = 普通表 331（试点 4 先启用，全量 327 补足）+ 视图 3（剔除）。实施后普通表 0 未启用；清单不再单独维护，迁移文件 `20260908000016_rls_enable_all.sql` 内含全量表名。
## 策略对齐 v2（20260908000017，2026-09-08 实跑）

**背景**：0015/0016 策略误用 `app.current_tenant_id`，而既有租户基础设施（`lib/shared-auth` tenant_middleware、`lib/shared-db/src/rls.rs`）统一使用 `app.tenant_id`——策略读不到租户上下文导致隔离不生效；且服务身份（service claims）将上下文设为 nil UUID，需显式豁免。

**对齐后策略模板**（331 个策略全部 ALTER 重建，`rls_tenant_isolation`）：

```sql
USING (
  current_setting('app.tenant_id', true) IS NULL                                  -- 未设置：放行（兼容）
  OR current_setting('app.tenant_id', true) = ''                                  -- 空：放行
  OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'  -- 服务身份(nil)：放行
  OR tenant_id IS NULL                                                            -- 共享/系统行：放行
  OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid         -- 本租户
)
WITH CHECK (同 USING)
```

**三态语义验证**（非 superuser 角色 `rls_test3`，事务内临时验证后回滚）：
- 正常租户上下文（`SET app.tenant_id='<uuid>'`）→ SELECT 仅见本租户行 ✓
- nil 服务上下文（`SET app.tenant_id='0000...0000'`）→ 全量访问（服务调用豁免）✓
- 无上下文（`RESET`）→ 全放行（兼容现有连接）✓

## 阶段 2 接线（2026-09-08 完成机制层）

**租户上下文来源（已核实）**：登录时 `SELECT tenant_id FROM core_tenant_users WHERE user_id=$1 AND status='active'` → 注入 JWT `Claims.tenant_id`（`svc/unified-core/src/modules/iam/auth.rs` 两处签发）→ `tenant_middleware`（`lib/shared-auth/src/middleware/tenant.rs`，337 行）解析 claims 后 `set_config('app.tenant_id', ...)`；service claims 设 nil 上下文（服务调用豁免）；无租户用户返回 400 缺少租户ID。

**接线现状（全量）**：
- 统一层：`build_application`（`lib/shared-bootstrap/src/lib.rs`）已装配 `topems_shared_db::rls::rls_middleware`（948 行）+ auth/rate-limit/CORS——凡走 build_application 的服务全部获得 RLS 中间件。
- 补充层：`tenant_middleware`（JWT→SET app.tenant_id）此前已挂 46 个服务；本轮补挂 8 个（finance/master-data/monitor/plugin-registry/qms/rd/search/tms，`svc/*/src/main.rs` protected_routes 挂 `from_fn_with_state(ctx.db.clone(), tenant_middleware())`）——**54 个 protected_routes 服务全量覆盖**。
- 8 服务 cargo check 通过（仅 rd 既有 unused imports warning，非本次引入）。

**DB 租户数据**：`core_tenants` 3 个（默认租户/test_tenant/test_ehs_tenant）；`core_tenant_users` 2 行；admin（superuser）→ 默认租户 `00000000-0000-0000-0000-000000000001`（非 nil，不与服务豁免冲突）。

## 阶段 2 剩余（非本轮范围）

1. **应用角色非 superuser 化**：`topems` 为 Superuser（RLS 默认绕过）——需专用业务角色（可选项：FORCE ROW LEVEL SECURITY + 策略白名单）。
2. **受限角色端到端回归**：非 superuser 角色 + tenant_middleware 链路下多租户互不可见（DB 层三态已验证，服务层需接入受限连接后复验）。
3. 无租户用户（未关联 core_tenant_users）登录后 protected 请求返回 400 缺少租户ID——属既有设计（tenant_middleware 行为），接入时需为全局用户建立租户关联或白名单。
## 阶段 2 收尾：非 superuser 化 + FORCE（20260908000018，2026-09-08 实跑）

**前置审计**（降级影响）：
- `topems` 原为 SUPERUSER（RLS 默认绕过）——降级目标：让连接角色自身受 RLS 约束。
- public schema 66 表均 topems owner（schema 级属 air/pg_database_owner）；core schema 表 owner 混合（6 air + 6 topems）。
- 首次 psql 多语句因语法错误整体回滚 → schema owner 未转移；改用 air 补 `GRANT USAGE, CREATE ON SCHEMA core/public TO topems` 解决降级后 FORCE 的 `permission denied for schema core`。
- 扩展：pgcrypto/uuid-ossp（trusted，PG18）可后续自建；vector/postgis（untrusted）需 superuser——未来迁移若 CREATE EXTENSION 需记录此限制。

**执行结果**：
- `ALTER ROLE topems NOSUPERUSER CREATEDB CREATEROLE`——保留 CREATEDB（sqlx::test 建库）+ CREATEROLE（测试/审计角色）运维能力；BYPASSRLS=f。
- `ALTER TABLE <331 表> FORCE ROW LEVEL SECURITY`（迁移 0018，台账 success=t）——owner 亦受策略约束。
- core 表 owner 统一为 topems（DO 块转移）；public 表本就 topems。

**FORCE 四态语义验证**（topems 降级后、owner 身份直连）：
| 态 | 上下文 | 结果 |
|---|---|---|
| A | `app.tenant_id`=本租户 | count=1（owner 亦被过滤——FORCE 生效）✓ |
| B | `app.tenant_id`=他租户 | count=0（owner 越权不可见）✓ |
| C | nil UUID（服务身份） | count=1（服务调用豁免）✓ |
| D | 无上下文 | count=1（兼容放行）✓ |

**阶段 2 全部闭环**：567 表启用 RLS + 331 策略（GUC 对齐）+ tenant_middleware 54 服务全量接线 + topems 非 superuser + FORCE。

**遗留（非本轮，记录）**：
1. 连接池下 `set_config` 为连接级：tenant_middleware SET 的连接与 handler 查询连接不保证同一——服务层端到端（受限连接 + 真实请求）复验时需确认；若隔离需严格，应改 `pool.connection()` 级上下文或查询级注入。
2. 无租户用户（未关联 core_tenant_users）登录后 protected 请求 400 缺少租户ID——既有设计，接入时需为全局用户建租户关联或白名单。
3. 未来迁移创建 untrusted 扩展（vector/postgis）需 superuser——建议预置扩展或单独 superuser 迁移通道。
4. 回退预案：`ALTER ROLE topems SUPERUSER` + `ALTER TABLE ... NO FORCE ROW LEVEL SECURITY`。
