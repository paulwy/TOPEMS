# pool 租户上下文收敛计划（B 阶段盘点）

> 状态：**仅盘点，未改代码、未提交**。日期 2026-11-06。
> 前置：P0 RLS fail-closed 已在演练库验证，但 pool 直查路径在 fail-closed 下归零（MES kanban 22→0），
> 迁移已移入 `database/migrations_deferred/`，prod 仍为 1066 策略 / 858 FORCE。
> 关联文档：`p0-rls-fail-closed-plan-20261106.md`、`p0-rls-fail-closed-inventory-20261106.md`。

---

## 0. 结论摘要

1. **阻塞不在策略层，在「查询不经请求事务」**。全仓直接使用 `PgPool` 的读点 **2630**、写点 **729**，分布在 **329** 个文件；这些语句跑在没有 `app.tenant_id` 的连接上，fail-closed 谓词判 NULL → 全拒。
2. **请求事务当前是空转**。`tenant_middleware` 每请求 `pool.begin()` + `set_config('app.tenant_id', …, true)` 并把事务放进 `RlsTxnCell`，但全仓 `RlsTxnCell` 仅 5 处（全在该中间件内）、`Extension<Transaction>` 仅 1 处（测试）——**没有任何生产者之外的消费者**。所以隔离正确性完全依赖旧策略的 `tenant_id IS NULL` / nil 豁免分支。
3. **推荐机制 M-A**：把请求事务变成唯一 DB 出口（`ScopedPool` newtype + `tokio::task_local` 作用域），调用点 `&state.pool` / `&self.pool` **表达式不变**，只改字段类型（约 30 处），可一次覆盖 1899 + 91 个读点。
4. **单租户可先用 M-B 过渡**（plist 加 `DEFAULT_TENANT_ID=0001`，零代码改动），但前提是明确「多租户暂不启用」，否则 pool 直查会固定到 0001。
5. **6 批推进**，按模块/ schema 划分；每批用 HTTP 三身份 + 模块 E2E 验证后，才对该 schema 的表子集收紧；`public` 共享表最后一批。

---

## 1. 盘点口径与可复现方法

扫描范围：`svc/**/*.rs` 与 `lib/**/*.rs`，按行匹配「接收者就是池」的调用：

```text
读：.(fetch_all|fetch_one|fetch_optional|fetch)( &state.pool | &self.pool | &pool | &db.pool() | &ctx.pool )
写：.(execute|execute_many)( 同上 )
```

脚本：`/tmp/pool_inventory.py`（本轮临时脚本，未入库；关键逻辑已写进本文档第 1 节，可 1:1 复现）。
不计入：`&mut *tx` / `&mut *conn` / `&mut **txn` 等事务语句——这些已经过请求事务，不是本轮目标（全仓 `fetch_*` 总调用 5355，其中 **2724** 走事务）。

### 1.1 口径校正

此前报告里的「248 处」「2398 处」是早期近似（模式只覆盖 `&state.pool`、且 Grep 结果被截断）。正式口径：

| 接收者 | 读点 | 写点 |
|---|---|---|
| `&state.pool` | 1899 | 360 |
| `&self.pool` | 91 | 48 |
| `&pool`（service 内注入的池） | 610 | 303 |
| `&db.pool()` / `&ctx.pool` | 4 | 4 |
| **合计** | **2604** | **715** |

加上 `lib/`（8 文件 26 读 14 写）后：**329 文件 / 2630 读 / 729 写**。下文所有数字以此为准。

### 1.2 分类口径

| 类别 | 判定 | 文件 | 读 | 写 |
|---|---|---|---|---|
| HTTP 在用 | 文件内有 `.route("…")` | 149 | 1232 | 254 |
| 内部服务层 | 无路由声明，但被其他文件引用 | 133 | 977 | 243 |
| 测试 | `tests/` 或文件名含 test | 28 | 319 | 193 |
| 后台任务(tokio::spawn) | 无路由 + 含 `tokio::spawn` | 5 | 27 | 14 |
| 后台任务/事件处理 | 路径含 job/scheduler/worker/consumer/webhook | 2 | 2 | 2 |
| 基础设施/启动 | rls.rs、database/mod.rs、bootstrap | 2 | 46 | 8 |
| 疑似死代码 | 无路由且无跨文件引用 | 2 | 1 | 1 |

**「疑似死代码」仅 2 个文件（1 读 1 写）**：`svc/unified-core/src/middleware/audit_log.rs`（0 读 / 1 写）、`svc/portal/src/modules/graphql_dataloader.rs`（1 读 / 0 写）。其余 133 个无路由文件按「内部服务层（在用）」处理，改造前由模块负责人按调用链确认。

---

## 2. 读点清单（按模块）

| 模块 | 文件 | 读 | 写 | HTTP 文件 | 后台 | 内部/未定 |
|---|---|---|---|---|---|---|
| unified-core | 52 | 480 | 95 | 1 | 2 | 44 |
| mes | 37 | 430 | 103 | 27 | 0 | 7 |
| qms | 19 | 270 | 53 | 18 | 0 | 0 |
| lims | 24 | 183 | 44 | 15 | 0 | 6 |
| ehs | 17 | 177 | 51 | 16 | 0 | 0 |
| finance | 15 | 143 | 45 | 10 | 1 | 4 |
| analytics | 27 | 138 | 36 | 9 | 1 | 16 |
| pdm | 21 | 131 | 25 | 19 | 0 | 1 |
| mobile | 18 | 104 | 40 | 1 | 0 | 16 |
| gis | 19 | 115 | 15 | 10 | 0 | 8 |
| integration | 11 | 82 | 22 | 1 | 1 | 9 |
| communication | 3 | 69 | 41 | 1 | 1 | 1 |
| ticket | 4 | 60 | 37 | 3 | 0 | 1 |
| plugin-registry | 6 | 54 | 10 | 0 | 0 | 6 |
| ai | 6 | 42 | 13 | 2 | 0 | 3 |
| wms | 10 | 27 | 34 | 1 | 0 | 1 |
| pm | 2 | 21 | 2 | 2 | 0 | 0 |
| portal | 7 | 18 | 5 | 1 | 0 | 5 |
| crm | 3 | 13 | 14 | 1 | 0 | 0 |
| rd | 2 | 11 | 13 | 0 | 0 | 1 |
| scm | 2 | 10 | 5 | 1 | 0 | 0 |
| monitor | 4 | 10 | 4 | 4 | 0 | 0 |
| erp | 2 | 6 | 1 | 1 | 1 | 0 |
| server | 6 | 3 | 5 | 3 | 0 | 3 |
| srm | 2 | 4 | 1 | 1 | 0 | 0 |
| tms | 1 | 3 | 0 | 1 | 0 | 0 |
| master-data | 1 | 0 | 1 | 0 | 0 | 1 |
| **hrm** | **1** | **5** | **0** | 0 | 0 | 1 |

> **复核结论（决策 5，2026-11-06）：`hrm` 的 0 命中是扫描器漏报，不是"已走事务"。**
> 扫描口径只匹配 `&state.db` / `&self.pool` 等接收者，漏掉了「构造期注入、`self.db` 持有」的
> service 结构体。实测 `svc/hrm/src/services/employee_service.rs` 有 5 处
> `fetch_all/fetch_one/fetch_optional(&self.db)`（列表 77、97、141、175、290 行），
> 而 `EmployeeService` 由 handler 以 `EmployeeService::new(state.db…)` 构造，
> 原先直接持有 `PgPool` —— 属于**请求内 pool 直查**。
> B0 已把 `EmployeeService.db` 改为 `ScopedPool`（5 处查询因此进入请求事务），
> 另 `svc/hrm/src/event_handlers/mod.rs:19` 的 `pub db: PgPool` 属后台事件订阅，
> 保留裸池（B4 按后台口径处理）。其余模块也应按同一口径回扫
> `self.db` / `self.conn` / 构造注入形态，B1+ 盘点时需补。

命中量最大的文件（读+写）：

| 文件 | 读 | 写 | 类别 |
|---|---|---|---|
| `svc/mes/tests/integration_tests.rs` | 132 | 64 | 测试 |
| `svc/communication/src/notification.rs` | 45 | 32 | 内部服务层 |
| `svc/unified-core/src/modules/tenant/handlers.rs` | 62 | 7 | 内部服务层（实为 HTTP 路由在别处注册） |
| `svc/unified-core/src/modules/flow/monitor.rs` | 66 | 0 | 内部服务层 |
| `svc/ticket/src/handlers.rs` | 29 | 17 | HTTP 在用 |
| `svc/qms/src/modules/apqp.rs` | 38 | 4 | HTTP 在用 |
| `svc/finance/src/modules/mod.rs` | 26 | 14 | HTTP 在用 |
| `svc/ehs/src/modules/environmental_compliance.rs` | 31 | 4 | HTTP 在用 |
| `svc/mobile/src/modules/oa.rs` | 24 | 7 | 内部服务层 |

完整的 329 行逐文件清单见 **附录 A**。

---

## 3. 写路径口径（不要按 729 全改）

| 类别 | 写点 | 处置 | 理由 |
|---|---|---|---|
| HTTP 在用 | 254 | **必须改** | 请求有 Claims，可直接绑定真实租户 |
| 内部服务层 | 243 | **必须改（保守）** | 由 HTTP 调用链驱动，同属请求作用域；确认死代码后可扣减 |
| 测试 | 193 | **不改业务代码** | 测试自建连接；在测试内显式 `SET LOCAL` 即可，不受中间件约束 |
| 后台任务(tokio::spawn) | 14 | **不适用统一机制** | 无请求上下文，需按任务显式绑定：系统任务用 nil，租户任务用任务参数 |
| 后台任务/事件处理 | 2 | 同上 | 同上 |
| 基础设施/启动 | 8 | **不改** | DDL 走 `MIGRATE_URL`（owner），不受 RLS 影响；`after_connect` 属于机制实现本身 |

**真实改造量 ≈ 497 写点（254 + 243）**，其中 243 为保守上限；读点 2604 中约 1232（HTTP）+ 977（内部）同样需要覆盖，其余 319 测试 + 27 后台点按各自口径处理。

---

## 4. 推荐机制

### 4.1 关键事实

`lib/shared-auth/src/middleware/tenant.rs:222-247` 已经做了这件事的前半段：`pool.begin()` → `set_config('app.tenant_id', $1, true)`（`is_local=true`）→ 把事务放进 `RlsTxnCell` 扩展 → 请求结束时 `commit`/`rollback`。缺的是后半段：**没有任何 handler 取用这个事务**，所以每请求白白占用一条连接 + 一次 BEGIN/COMMIT，却执行 0 条语句；真实查询全部落到 `state.pool`。

### 4.2 机制对比

| 方案 | 覆盖方式 | 代码改动量 | 每请求开销 | 连接池影响 | 多租户正确性 | 结论 |
|---|---|---|---|---|---|---|
| **M-A 请求事务成为唯一出口**（task-local + `ScopedPool` newtype） | 一次机制覆盖全部 `&state.pool`/`&self.pool` 调用点 | 新增 1 个模块；改字段类型约 30 处；调用点 0 改动 | 复用中间件已开事务；额外仅 1 次 `SET LOCAL`（≈0.2–0.5 ms） | **下降**：不再「中间件占一条 + handler 另取一条」 | 正确 | **推荐** |
| M-B 连接级默认租户（plist `DEFAULT_TENANT_ID=0001`） | 全部连接，零改动 | 0 行代码 | 0 | 无 | **仅单租户正确**；多租户下 pool 直查被压到 0001 | 过渡备选，需显式禁用多租户 |
| M-C 逐处改为 `&mut *txn` | 逐调用点 | 1899 读 + 360 写 ≈ 2259 处 | 0 | 下降 | 正确 | 不推荐：diff 巨大、回滚难 |
| M-D 每语句 `SET` + `RESET`（会话级） | 逐语句包一层 | 需包装所有执行点 | +2 RTT/语句 | 有 GUC 泄漏风险（sqlx 无归还钩子） | 脆弱 | 否决 |

### 4.3 M-A 实现要点

1. `lib/shared-db/src/scoped_pool.rs`
   ```rust
   pub struct ScopedPool { inner: sqlx::PgPool }
   tokio::task_local! { pub static RLS_TXN: RlsTxnCell; }
   impl<'c> sqlx::Executor<'c> for &'c ScopedPool { /* 有 scope → &mut *txn；无 scope → &self.inner */ }
   ```
2. `tenant_middleware` 把 `next.run(req)` 包进 `RLS_TXN.scope(txn_cell, fut)`（替换现在「只插入扩展」的写法）。
3. `AppState.pool` 与各 service 结构体的 `pool` 字段类型 `PgPool → ScopedPool`（构造点集中，约 30 处；`ScopedPool::from(pool)`）。
4. 后台任务：新增 `ScopedPool::with_tenant(tenant, fut)`（内部 `begin + SET LOCAL + scope`），任务体不用改；系统身份用 `Uuid::nil()`。
5. 无 scope 且非显式绑定的调用（漏网）会回退 `inner` —— **fail-closed 下会返回 0 行**，这是有意的「可见失败」而不是静默放行；上线前用 `scripts/ci/check-rls-policy-shape.sh` + 观测日志兜底。

**风险点（必须评估）**：`RlsTxnCell` 是 `tokio::sync::Mutex<Option<Transaction>>`。同一请求内若有 `join!`/`spawn` 并发查询，事务访问会被串行化。两个选项：
- 保守：先接受串行化（多数 handler 为顺序执行），用压测确认 P95；
- 彻底：改为「一请求一连接 + 会话级 GUC + 请求结束显式 `RESET`」，连接由 scope 持有，避免 Mutex；代价是范围结束前必须保证 `RESET`（否则泄漏到池内其他请求）。

---

## 5. 分批计划

| 批次 | 模块（文件/读/写） | 对应 schema | 完成后可收紧的表子集 | 主要风险 |
|---|---|---|---|---|
| B0 机制落地 | `shared-db`（新增 ScopedPool）+ `shared-auth` 中间件 + `server`（3/3/5）+ `plugin-registry`（6/54/10） | 无（不改策略） | 无 | `Executor` 实现的生命周期/Send 约束；串行化 |
| B1 核心 | `unified-core`（52/480/95）、`portal`（7/18/5）、`master-data`（1/0/1）、`monitor`（4/10/4） | `iam`、`core_*`、`audit`、`master_data` | `iam.*`、`public.core_*`（auth 两表与菜单两表保留登记例外）、`master_data.*` | 登录/会话/菜单/字典是全局路径，回归面最大 |
| B2 制造 | `mes`（37/430/103）、`wms`（10/27/34）、`qms`（19/270/53） | `mes`、`wms`、`qms` | 三 schema 全表 | 看板类接口当前已实测 22→0，是验收样本 |
| B3 供应链与财务 | `finance`（15/143/45）、`erp`（2/6/1）、`scm`（2/10/5）、`crm`（3/13/14）、`srm`（2/4/1）、`tms`（1/3/0） | `finance`、`erp`、`scm`、`crm`、`srm`、`tms` | 六 schema 全表 | 金额/对账类，出现 0 行即为高危 |
| B4 研发与协同 | `pdm`（21/131/25）、`rd`（2/11/13）、`pm`（2/21/2）、`mobile`（18/104/40）、`hrm`（0，需先确认） | `pdm`、`rs`、`pm`、`mobile`、`hrm` | 五 schema 全表 | 移动端离线同步、pm settlement 属挂账项，需排除 |
| B5 质量与合规 | `ehs`（17/177/51）、`lims`（24/183/44）、`gis`（19/115/15）、`ai`（6/42/13）、`integration`（11/82/22）、`communication`（3/69/41） | `lims`、`gis`、`ai`、`integration`、`communication` | 五 schema 全表；`ehs` 的表在 `public`，随 B6 | ehs/ticket/monitor/search 共享 `public` |
| B6 公共与长尾 | `analytics`（27/138/36）、`ticket`（4/60/37）、`public` 共享表、`search` | `bi`、`ticket`、`public`（非 core） | 剩余全部 | 共享表牵一发动全身，必须最后 |

### 5.1 每批验收

1. **HTTP 三身份**：租户 0001、租户 0002、未设 GUC（直查应为 0）+ nil（超管全量）。
2. **模块 E2E**：`tests/e2e/tests/unified-core.spec.ts` 中该模块相关用例；现有覆盖不足的模块（见附录 A `e2e` 列）需先补最小用例。
3. **列表非 0 基线**：每批前记录该模块 6 个列表的行数快照，批后逐项对比，出现「有数据变 0」立即回滚。
4. **写入**：审计/登录日志/业务写入各 1 条，确认落库。
5. **观测**：`pg_stat_activity` 连接数、pool wait、P95 延迟；`DB_MAX_CONNECTIONS 8→16` 在本阶段拿到实测后再定。

### 5.2 回滚

- 策略层：按 schema 过滤重放 `policies_before.sql`（需给 `scripts/db/rollback_p0_rls_20261106.sh` 增加 `--schema` 过滤，本轮未实现）。
- 代码层：每批独立 commit，回滚即 revert 该批；`ScopedPool` 回退开关：`RLS_SCOPED_POOL=off` 时 `ScopedPool` 直接透传 `inner`（等价现状 fail-open），用于快速止血。

---

## 6. 待确认

1. M-A 的同一请求内事务串行化是否接受？若不接受，改走「一请求一连接 + 会话级 GUC + 显式 RESET」。
2. 是否允许 M-B 作为单租户过渡先解锁 P0？若允许，需同时确认 `MULTI_TENANT_ENABLED=false` 的部署前提。
3. 135 个「内部服务层」文件是否按在用处理（保守口径），还是先做一轮人工死代码清理再排期？
4. `public` 共享表（`ehs` / `ticket` / `monitor` / `search` / `unified-core` 共用）的归属与收紧时点。
5. ~~`hrm` 0 命中是否符合预期~~ → **已复核：扫描器漏报**（`self.db` 持有型 service 未被计入，
   实际 5 处直查），详见 §2 复核结论；B0 已纳入收敛。

---

## 7. B0 执行记录

### 7.1 一次性 `--no-verify` 例外（2026-11-06）

本批字段切换提交（`ScopedPool` 字段类型 + 服务/BFF 装配 + `EmployeeService`）使用一次
`git commit --no-verify`，仅限该 commit，不修改 lefthook 配置、不新增跳过脚本、不设 CI 跳过。
原因：pre-commit `web-contract-smoke` 对 8099 报 5 个失败，经 HEAD 基线二进制（`/tmp/topems-server-before`，
起在 8097、同一 rehearsal 库）复跑对照，**完全相同**：

- ERP 4 条：`GET /api/erp/hr/employees/{id}` ×2、`GET /api/erp/hr/employees`、`GET /api/erp/example/employees`，
  http=500（`hrProxy.ts:176/184`、`readOps.ts:97/105`）；基线 `362/366 PASS, 4 FAIL`，同为这 4 条。
- mobile 1 条：`GET /api/mobile/workbench`，http=-1（network_error，`mobile/index.ts:299`）；
  基线 `293/295 PASS, 2 FAIL`，其中 workbench 同为 -1。
- 根因：本地 dev 栈不完整 —— 8020 无独立 HRM 服务；mobile workbench 串行调用
  workflow/notification/hrm/mes/qms，均未启动独立服务。
- 结论：上述 5 条**非本批改动引入**，属环境缺失；本批 diff 不含路由/契约变更。

### 7.2 后续改进项

- pre-commit `web-contract-smoke` 依赖本地 dev 全栈，易被他人占用/缺服务误伤。改进方向：
  提交前探测依赖服务（8020 等）与 BFF 版本，缺失时对"远端服务相关用例"显式 SKIP 并打印原因，
  而不是阻断提交；在改进落地前，影响面提交应优先在具备完整栈的环境执行。
- 本批 `--no-verify` 为一次性例外，不作为常规手段。

### 7.3 B0 遗留风险的批次归属

| 风险 | 归属批次 |
|---|---|
| `Deref` 到裸 `PgPool` 的隐性 bypass（`&state.db` 传给 `fn(&PgPool)`） | B1 扫描器纳入登记，逐批清零 |
| 测试工厂直接构造 state、无 task-local（运行时 fail-closed） | B1 建立 scope fixture；B1–B5 各批同步补 |
| 后台任务/事件处理无请求租户（hrm `event_handlers` 等） | B2（mes/wms/qms 后台）、B4（hrm）各自批次引入 `with_tenant` |
| 8 个 BFF 模块未挂 `tenant_middleware`（ai/analytics/gis/integration/monitor/portal/ticket/unified-core） | B1（portal/monitor/unified-core）、B5（ai/integration/gis）、B6（analytics/ticket），随模块收敛补挂 |

### 7.4 一次性例外登记（与 7.1 并列）

| # | Commit | 范围 | 授权 | 理由 |
|---|---|---|---|---|
| 1 | `913d60c55` refactor(services): switch request pool fields to ScopedPool | B0 字段切换批次 | 用户显式授权，仅该 commit | `web-contract-smoke` 5 条失败经 HEAD 基线 8097 复跑完全相同，属本地 dev 栈缺失 |
| 2 | `066388df8` merge: fix/datetime-rfc3339-unify into main | 本次 merge commit | 用户显式授权，仅该 commit | 同上 5 条失败（ERP HR 4 条 500、mobile workbench -1），非本次合并引入 |

两次均为一次性例外：未改 lefthook 配置、未新增跳过脚本、未设 CI 跳过；不作为常规手段。
后续改进项见 7.2（提交前探测依赖服务，缺失时对远端服务相关用例显式 SKIP）。

---

## 附录 A：逐文件盘点（329 个文件）

> 读/写点为「接收者是池」的调用次数；路由列取文件内前 2 条，`E2E✓` 表示该路径出现在 `tests/e2e`。
> 「server」列为模块名是否出现在 `svc/server/src`（启发式，仅作参考）。
> 类型列中以「内部服务层」为默认，其中 2 个文件已初步确认为死代码候选（见 §1.2）。

| 模块 | 文件 | 读 | 写 | 类型 | 路由 / handler | server |
|---|---|---|---|---|---|---|
| ai | `svc/ai/src/handlers/business_copilot_handlers.rs` | 12 | 5 | 内部服务层 | — | 是 |
| ai | `svc/ai/tests/integration_tests.rs` | 11 | 5 | 测试 | — | 是 |
| ai | `svc/ai/src/handlers/prompt_handlers.rs` | 8 | 1 | 内部服务层 | — | 是 |
| ai | `svc/ai/src/handlers/model_admin_handlers.rs` | 6 | 1 | 内部服务层 | — | 是 |
| ai | `svc/ai/src/modules/chat_conversations.rs` | 4 | 1 | HTTP 在用 | — | 是 |
| ai | `svc/ai/src/modules/ai_plugin.rs` | 1 | 0 | HTTP 在用 | `GET /api/plugins/info` → `get_plugin_info`<br>`GET /api/plugins/health` → `plugin_health_check` | 是 |
| analytics | `svc/analytics/tests/integration_tests.rs` | 14 | 6 | 测试 | — | 是 |
| analytics | `svc/analytics/src/modules/bi/comparison_analysis.rs` | 10 | 4 | 内部服务层 | — | 是 |
| analytics | `svc/analytics/src/modules/bi/dashboard/crud.rs` | 9 | 1 | 内部服务层 | — | 是 |
| analytics | `svc/analytics/src/modules/bi/data_drilldown.rs` | 10 | 0 | 内部服务层 | — | 是 |
| analytics | `svc/analytics/src/modules/bi/dataset.rs` | 6 | 4 | HTTP 在用 | `GET /datasets` → `list_datasets`<br>`GET /datasets/{id}` → `get_dataset` | 是 |
| analytics | `svc/analytics/src/modules/bi/sync_records.rs` | 5 | 4 | 内部服务层 | — | 是 |
| analytics | `svc/analytics/src/modules/report/report.rs` | 4 | 5 | HTTP 在用 | `GET /reports` → `list_reports`<br>`POST /reports/from-template` → `create_report_from_template` | 是 |
| analytics | `svc/analytics/src/modules/report/schedule.rs` | 3 | 6 | HTTP 在用 | `GET /schedules` → `list_schedules`<br>`GET /schedules/{id}` → `get_schedule` | 是 |
| analytics | `svc/analytics/src/modules/bi/self_service_report.rs` | 8 | 0 | 内部服务层 | — | 是 |
| analytics | `svc/analytics/src/modules/bi/widget.rs` | 8 | 0 | 内部服务层 | — | 是 |
| analytics | `svc/analytics/src/modules/bi/dashboard/templates.rs` | 7 | 0 | 内部服务层 | — | 是 |
| analytics | `svc/analytics/src/modules/bi/row_level_permission.rs` | 7 | 0 | 内部服务层 | — | 是 |
| analytics | `svc/analytics/src/modules/report/subscription.rs` | 4 | 3 | HTTP 在用 | `GET /subscriptions` → `list_subscriptions`<br>`GET /subscriptions/{id}` → `get_subscription` | 是 |
| analytics | `svc/analytics/src/main.rs` | 5 | 0 | HTTP 在用 | `GET /` → `home` E2E✓<br>`GET /api/plugins/info` → `modules::bi::plugin::get_plugin_info` | 是 |
| analytics | `svc/analytics/src/modules/bi/dashboard/export.rs` | 5 | 0 | 内部服务层 | — | 是 |
| analytics | `svc/analytics/src/modules/bi/dashboard/realtime.rs` | 5 | 0 | 内部服务层 | — | 是 |
| analytics | `svc/analytics/src/modules/bi/multidimensional_analysis.rs` | 5 | 0 | 内部服务层 | — | 是 |
| analytics | `svc/analytics/src/modules/report/template.rs` | 2 | 3 | HTTP 在用 | `GET /templates` → `list_templates`<br>`GET /templates/{id}` → `get_template` | 是 |
| analytics | `svc/analytics/src/routes.rs` | 5 | 0 | HTTP 在用 | `GET /dashboard` → `modules::bi::dashboard::list_dashboards` E2E✓<br>`POST /dashboard` → `modules::bi::dashboard::create_dashboard` E2E✓ | 是 |
| analytics | `svc/analytics/src/modules/bi/dashboard/share.rs` | 4 | 0 | 内部服务层 | — | 是 |
| analytics | `svc/analytics/src/modules/bi/predictive_analysis.rs` | 4 | 0 | 内部服务层 | — | 是 |
| analytics | `svc/analytics/src/modules/bi/websocket.rs` | 3 | 0 | 内部服务层 | — | 是 |
| analytics | `svc/analytics/src/modules/bi/chart_service.rs` | 1 | 0 | 内部服务层 | — | 是 |
| analytics | `svc/analytics/src/modules/bi/datasource.rs` | 1 | 0 | 内部服务层 | — | 是 |
| analytics | `svc/analytics/src/modules/bi/plugin.rs` | 1 | 0 | HTTP 在用 | `GET /api/plugins/info` → `get_plugin_info`<br>`GET /api/plugins/health` → `plugin_health_check` | 是 |
| analytics | `svc/analytics/src/modules/report/report_plugin.rs` | 1 | 0 | HTTP 在用 | `GET /api/plugins/info` → `get_plugin_info`<br>`GET /api/plugins/health` → `plugin_health_check` | 是 |
| analytics | `svc/analytics/src/modules/report/scheduler.rs` | 1 | 0 | 后台任务/事件处理 | — | 是 |
| communication | `svc/communication/src/notification.rs` | 45 | 32 | 内部服务层 | — | 是 |
| communication | `svc/communication/src/mail.rs` | 17 | 7 | 后台任务(tokio::spawn) | — | 是 |
| communication | `svc/communication/src/im_location.rs` | 7 | 2 | HTTP 在用 | — | 是 |
| crm | `svc/crm/tests/integration_tests.rs` | 9 | 7 | 测试 | — | 是 |
| crm | `svc/crm/src/tests/rls_isolation_test.rs` | 3 | 7 | 测试 | — | 是 |
| crm | `svc/crm/src/main.rs` | 1 | 0 | HTTP 在用 | `GET /plugins/info` → `modules::crm_plugin::get_plugin_info`<br>`GET /plugins/health` → `modules::crm_plugin::plugin_health_check` | 是 |
| ehs | `svc/ehs/src/modules/environmental_compliance.rs` | 31 | 4 | HTTP 在用 | `GET /environmental-compliance/regulations` → `list_regulations`<br>`GET /environmental-compliance/regulations/categories` → `list_regulation_categories` | 是 |
| ehs | `svc/ehs/src/modules/training.rs` | 20 | 4 | HTTP 在用 | `GET /training` → `list_trainings` E2E✓<br>`GET /training/{id}` → `get_training` | 是 |
| ehs | `svc/ehs/src/modules/hazard.rs` | 14 | 8 | HTTP 在用 | `GET /issues` → `list_safety_hazards` E2E✓<br>`GET /issues/{id}` → `get_safety_hazard` | 是 |
| ehs | `svc/ehs/src/modules/safety.rs` | 14 | 5 | HTTP 在用 | `GET /checks/plans` → `list_plans_db`<br>`GET /checks/plans/{id}` → `get_plan_db` | 是 |
| ehs | `svc/ehs/src/modules/accident.rs` | 11 | 7 | HTTP 在用 | `GET /accidents` → `list_accidents`<br>`GET /incidents` → `list_accidents` | 是 |
| ehs | `svc/ehs/src/modules/emergency_drill.rs` | 17 | 1 | HTTP 在用 | `GET /drills/plans` → `list_drill_plans`<br>`GET /drills/records` → `list_drill_records` | 是 |
| ehs | `svc/ehs/src/modules/occupational_health.rs` | 16 | 1 | HTTP 在用 | `GET /occupational-health/contraindications` → `list_contraindications`<br>`GET /occupational-health/contraindications/{id}` → `get_contraindication` | 是 |
| ehs | `svc/ehs/tests/ehs_tests.rs` | 4 | 13 | 测试 | — | 是 |
| ehs | `svc/ehs/src/modules/hazardous_material.rs` | 13 | 1 | HTTP 在用 | `GET /hazardous-materials` → `list_materials`<br>`GET /hazardous-materials/categories` → `list_material_categories` | 是 |
| ehs | `svc/ehs/src/modules/health.rs` | 10 | 1 | HTTP 在用 | `GET /health` → `list_records` E2E✓<br>`GET /health/{id}` → `get_record` | 是 |
| ehs | `svc/ehs/src/modules/emergency_plan.rs` | 9 | 1 | HTTP 在用 | `GET /emergency-plans` → `list_plans`<br>`GET /emergency-plans/categories` → `list_plan_categories` | 是 |
| ehs | `svc/ehs/src/modules/occupational_disease.rs` | 6 | 1 | HTTP 在用 | `GET /occupational-disease/statistics` → `get_disease_statistics`<br>`GET /occupational-diseases/factors` → `list_hazard_factors` | 是 |
| ehs | `svc/ehs/src/modules/environment.rs` | 3 | 3 | HTTP 在用 | `GET /environment` → `list_records`<br>`GET /environment/monitors` → `list_records` | 是 |
| ehs | `svc/ehs/src/modules/data_sync.rs` | 3 | 1 | HTTP 在用 | `GET /sync-records` → `list_sync_records`<br>`GET /sync-records/{id}` → `get_sync_record` | 是 |
| ehs | `svc/ehs/src/modules/risk.rs` | 3 | 0 | HTTP 在用 | `GET /hazards` → `list_risks`<br>`GET /hazards/{id}` → `get_risk` | 是 |
| ehs | `svc/ehs/src/modules/integration.rs` | 2 | 0 | HTTP 在用 | `POST /api/internal/ehs/hazards/integration` → `create_integration_hazard`<br>`POST /api/internal/ehs/alerts/integration` → `create_integration_alert` | 是 |
| ehs | `svc/ehs/src/modules/ehs_plugin.rs` | 1 | 0 | HTTP 在用 | `GET /api/plugins/info` → `get_plugin_info`<br>`GET /api/plugins/health` → `plugin_health_check` | 是 |
| erp | `svc/erp/src/modules/settings.rs` | 5 | 1 | HTTP 在用 | `GET /system/settings` → `list_settings`<br>`PUT /system/settings/batch` → `batch_update_settings` | 是 |
| erp | `svc/erp/src/main.rs` | 1 | 0 | 后台任务(tokio::spawn) | — | 是 |
| finance | `svc/finance/src/modules/mod.rs` | 26 | 14 | HTTP 在用 | — | 是 |
| finance | `svc/finance/src/modules/financial_reports.rs` | 19 | 5 | HTTP 在用 | — | 是 |
| finance | `svc/finance/src/modules/operational.rs` | 20 | 4 | HTTP 在用 | `GET /expenses` → `list_expenses`<br>`GET /expenses/{id}` → `get_expense` | 是 |
| finance | `svc/finance/src/domain/pg_materialized_views.rs` | 12 | 8 | 内部服务层 | — | 是 |
| finance | `svc/finance/src/modules/sales_invoice.rs` | 17 | 2 | HTTP 在用 | `GET /sales-invoices` → `list_sales_invoices` E2E✓<br>`GET /sales-invoices/{id}` → `get_sales_invoice` | 是 |
| finance | `svc/finance/src/modules/reconcile_orders.rs` | 10 | 2 | HTTP 在用 | `GET /reconcile` → `list_reconcile_orders`<br>`POST /reconcile/auto` → `auto_reconcile` | 是 |
| finance | `svc/finance/src/modules/voucher_template_entries.rs` | 10 | 2 | 内部服务层 | — | 是 |
| finance | `svc/finance/src/domain/pg_event_store.rs` | 10 | 1 | 内部服务层 | — | 是 |
| finance | `svc/finance/src/modules/accounting_subjects.rs` | 6 | 1 | HTTP 在用 | `GET /accounting-subjects` → `list_accounting_subjects`<br>`GET /accounting-subjects/{id}` → `get_accounting_subject` | 是 |
| finance | `svc/finance/src/modules/voucher_template.rs` | 4 | 2 | 内部服务层 | — | 是 |
| finance | `svc/finance/src/modules/currencies.rs` | 4 | 1 | HTTP 在用 | `GET /currencies` → `list_currencies`<br>`PUT /currencies/{id}` → `update_currency` | 是 |
| finance | `svc/finance/src/domain/async_projector.rs` | 1 | 3 | 后台任务(tokio::spawn) | — | 是 |
| finance | `svc/finance/src/modules/bootstrap.rs` | 2 | 0 | HTTP 在用 | — | 是 |
| finance | `svc/finance/src/modules/audit_v52.rs` | 1 | 0 | HTTP 在用 | — | 是 |
| finance | `svc/finance/src/modules/risk_v59.rs` | 1 | 0 | HTTP 在用 | — | 是 |
| gis | `svc/gis/src/modules/device.rs` | 17 | 1 | 内部服务层 | — | 是 |
| gis | `svc/gis/src/modules/stats.rs` | 10 | 0 | HTTP 在用 | — | 是 |
| gis | `svc/gis/src/services/tenant_service.rs` | 9 | 1 | 内部服务层 | — | 是 |
| gis | `svc/gis/src/modules/location.rs` | 7 | 1 | 内部服务层 | — | 是 |
| gis | `svc/gis/src/modules/map.rs` | 6 | 2 | 内部服务层 | — | 是 |
| gis | `svc/gis/src/modules/business.rs` | 6 | 1 | HTTP 在用 | — | 是 |
| gis | `svc/gis/src/modules/geodata.rs` | 6 | 1 | 内部服务层 | — | 是 |
| gis | `svc/gis/src/modules/pipeline.rs` | 6 | 1 | HTTP 在用 | — | 是 |
| gis | `svc/gis/src/modules/sync.rs` | 6 | 1 | 内部服务层 | — | 是 |
| gis | `svc/gis/src/modules/warehouse.rs` | 6 | 1 | HTTP 在用 | — | 是 |
| gis | `svc/gis/tests/integration_tests.rs` | 6 | 1 | 测试 | — | 是 |
| gis | `svc/gis/src/modules/geofence.rs` | 5 | 1 | 内部服务层 | — | 是 |
| gis | `svc/gis/src/modules/marker.rs` | 4 | 1 | HTTP 在用 | — | 是 |
| gis | `svc/gis/src/modules/photo.rs` | 4 | 1 | HTTP 在用 | — | 是 |
| gis | `svc/gis/src/embedded.rs` | 3 | 1 | HTTP 在用 | `GET /health` → `modules::gis_plugin::plugin_health_check` E2E✓<br>`GET /statistics` → `modules::stats::get_statistics` E2E✓ | 是 |
| gis | `svc/gis/src/modules/import_export.rs` | 4 | 0 | HTTP 在用 | — | 是 |
| gis | `svc/gis/src/modules/search.rs` | 4 | 0 | HTTP 在用 | — | 是 |
| gis | `svc/gis/src/modules/spatial.rs` | 4 | 0 | 内部服务层 | — | 是 |
| gis | `svc/gis/src/modules/websocket.rs` | 2 | 0 | HTTP 在用 | `GET /ws/gis/map` → `websocket_handler`<br>`GET /ws/gis/device/{device_code}` → `websocket_device_handler` | 是 |
| integration | `svc/integration/src/external_erp.rs` | 26 | 6 | HTTP 在用 | `GET /` → `list_entity_mappings` E2E✓<br>`POST /batch` → `batch_entity_mappings` | 是 |
| integration | `svc/integration/src/handlers/sync.rs` | 18 | 4 | 内部服务层 | — | 是 |
| integration | `svc/integration/src/mes_erp_sync.rs` | 5 | 5 | 内部服务层 | — | 是 |
| integration | `svc/integration/src/handlers/conversion_rules.rs` | 5 | 3 | 内部服务层 | — | 是 |
| integration | `svc/integration/src/handlers/events.rs` | 6 | 0 | 内部服务层 | — | 是 |
| integration | `svc/integration/src/handlers/erp_connections.rs` | 4 | 1 | 内部服务层 | — | 是 |
| integration | `svc/integration/src/handlers/erp_mappings.rs` | 4 | 1 | 内部服务层 | — | 是 |
| integration | `svc/integration/src/handlers/lims_qms.rs` | 5 | 0 | 内部服务层 | — | 是 |
| integration | `svc/integration/src/handlers/mes_erp.rs` | 4 | 0 | 内部服务层 | — | 是 |
| integration | `svc/integration/src/handlers/wms_scm.rs` | 4 | 0 | 内部服务层 | — | 是 |
| integration | `svc/integration/src/sync_scheduler.rs` | 1 | 2 | 后台任务/事件处理 | — | 是 |
| lims | `svc/lims/tests/integration_tests.rs` | 13 | 12 | 测试 | — | 是 |
| lims | `svc/lims/src/modules/proficiency_testing.rs` | 18 | 4 | 测试 | `GET /pt-plans` → `list_plans`<br>`GET /pt-plans/{id}` → `get_plan` | 是 |
| lims | `svc/lims/src/modules/uncertainty.rs` | 18 | 4 | HTTP 在用 | `GET /uncertainty-projects` → `list_projects`<br>`GET /uncertainty-projects/{id}` → `get_project` | 是 |
| lims | `svc/lims/src/modules/sample_barcode.rs` | 17 | 4 | HTTP 在用 | `GET /barcodes` → `list_barcodes`<br>`POST /barcodes/generate` → `generate_barcode` | 是 |
| lims | `svc/lims/src/modules/test_method.rs` | 13 | 4 | 测试 | `GET /test-methods` → `list_methods`<br>`GET /test-methods/{id}` → `get_method` | 是 |
| lims | `svc/lims/src/modules/instrument.rs` | 13 | 3 | HTTP 在用 | `GET /instruments` → `list_instruments`<br>`GET /instruments/{id}` → `get_instrument` | 是 |
| lims | `svc/lims/src/modules/statistics.rs` | 15 | 0 | HTTP 在用 | `GET /statistics` → `get_statistics` E2E✓ | 是 |
| lims | `svc/lims/src/modules/inspection_task.rs` | 9 | 2 | HTTP 在用 | `GET /tasks` → `list_tasks` E2E✓<br>`GET /tasks/{id}` → `get_task` | 是 |
| lims | `svc/lims/src/modules/instrument_data/statistics.rs` | 9 | 0 | 内部服务层 | — | 是 |
| lims | `svc/lims/src/modules/analyte.rs` | 6 | 2 | HTTP 在用 | `GET /analytes` → `list_analytes`<br>`GET /analytes/{id}` → `get_analyte` | 是 |
| lims | `svc/lims/src/modules/instrument_data/collection_tasks.rs` | 6 | 2 | 内部服务层 | — | 是 |
| lims | `svc/lims/src/modules/inspection_record.rs` | 6 | 1 | HTTP 在用 | `GET /records` → `list_records` E2E✓<br>`GET /records/{id}` → `get_record` | 是 |
| lims | `svc/lims/src/modules/report.rs` | 6 | 1 | 内部服务层 | — | 是 |
| lims | `svc/lims/src/modules/instrument_data/instrument_data_crud.rs` | 4 | 1 | 内部服务层 | — | 是 |
| lims | `svc/lims/src/modules/instrument_data/parse_rules.rs` | 4 | 1 | 内部服务层 | — | 是 |
| lims | `svc/lims/src/modules/process.rs` | 4 | 1 | HTTP 在用 | `GET /processes` → `list_processes`<br>`GET /processes/{id}` → `get_process` | 是 |
| lims | `svc/lims/src/modules/reagent.rs` | 4 | 1 | HTTP 在用 | `GET /reagents` → `list_reagents`<br>`GET /reagents/{id}` → `get_reagent` | 是 |
| lims | `svc/lims/src/modules/audit.rs` | 4 | 0 | HTTP 在用 | `GET /audit-logs` → `list_audit_logs`<br>`GET /audit-logs/{id}` → `get_audit_log` | 是 |
| lims | `svc/lims/src/modules/data_sync.rs` | 3 | 1 | HTTP 在用 | `GET /sync-records` → `list_sync_records`<br>`GET /sync-records/{id}` → `get_sync_record` | 是 |
| lims | `svc/lims/src/modules/integration.rs` | 3 | 0 | HTTP 在用 | `POST /api/internal/lims/samples/integration` → `create_integration_sample`<br>`POST /api/internal/lims/tasks/integration` → `create_integration_task` | 是 |
| lims | `svc/lims/src/modules/sample.rs` | 3 | 0 | HTTP 在用 | `GET /samples` → `list_samples`<br>`GET /samples/{id}` → `get_sample` | 是 |
| lims | `svc/lims/src/main.rs` | 2 | 0 | HTTP 在用 | `GET /` → `home` E2E✓<br>`GET /health` → `health` E2E✓ | 是 |
| lims | `svc/lims/src/modules/instrument_data/data_parsing.rs` | 2 | 0 | 内部服务层 | — | 是 |
| lims | `svc/lims/src/modules/lims_plugin.rs` | 1 | 0 | HTTP 在用 | `GET /api/plugins/info` → `get_plugin_info`<br>`GET /api/plugins/health` → `plugin_health_check` | 是 |
| master-data | `svc/master-data/src/modules/persist.rs` | 0 | 1 | 内部服务层 | — | 是 |
| mes | `svc/mes/tests/integration_tests.rs` | 132 | 64 | 测试 | — | 是 |
| mes | `svc/mes/src/modules/basics.rs` | 20 | 4 | HTTP 在用 | `GET /workshops` → `list_workshops`<br>`GET /workshops/{id}` → `get_workshop` | 是 |
| mes | `svc/mes/src/modules/equipment.rs` | 19 | 1 | HTTP 在用 | `GET /equipment` → `list_equipment` E2E✓<br>`GET /equipment/statistics` → `get_equipment_statistics` | 是 |
| mes | `svc/mes/src/modules/aps_scheduling.rs` | 17 | 0 | HTTP 在用 | `POST /aps/schedule` → `execute_aps_schedule`<br>`POST /aps/schedule/simulate` → `simulate_aps_schedule` | 是 |
| mes | `svc/mes/src/modules/wip.rs` | 15 | 1 | HTTP 在用 | `GET /wips` → `list_wips`<br>`GET /wips/{id}` → `get_wip` | 是 |
| mes | `svc/mes/src/modules/capacity.rs` | 14 | 1 | HTTP 在用 | `GET /capacities` → `list_capacities`<br>`GET /capacities/{id}` → `get_capacity` | 是 |
| mes | `svc/mes/src/modules/process_flow.rs` | 13 | 2 | HTTP 在用 | `GET /process-flows` → `list_process_flows`<br>`GET /process-flows/{id}` → `get_process_flow` | 是 |
| mes | `svc/mes/src/modules/process_route.rs` | 12 | 2 | HTTP 在用 | `GET /process-routes` → `list_process_routes` E2E✓<br>`GET /process-routes/{id}` → `get_process_route` | 是 |
| mes | `svc/mes/src/modules/team.rs` | 8 | 6 | HTTP 在用 | `GET /teams` → `list_teams` E2E✓<br>`GET /teams/{id}` → `get_team` | 是 |
| mes | `svc/mes/src/modules/demand_forecast.rs` | 12 | 1 | HTTP 在用 | `GET /demand-forecasts` → `list_forecasts`<br>`GET /demand-forecasts/{id}` → `get_forecast` | 是 |
| mes | `svc/mes/src/modules/equipment_oee.rs` | 12 | 1 | HTTP 在用 | `GET /equipment-oee` → `list_oee_records`<br>`GET /equipment-oee/{id}` → `get_oee_record` | 是 |
| mes | `svc/mes/src/modules/production_plan.rs` | 12 | 1 | HTTP 在用 | `GET /production-plans` → `list_plans`<br>`GET /production-plans/{id}` → `get_plan` | 是 |
| mes | `svc/mes/src/modules/analytics.rs` | 12 | 0 | HTTP 在用 | `GET /analytics/capacity-utilization` → `get_capacity_utilization`<br>`GET /analytics/energy-cost` → `get_energy_cost` | 是 |
| mes | `svc/mes/src/modules/production_kanban.rs` | 12 | 0 | HTTP 在用 | `GET /kanban/dashboard` → `get_dashboard` E2E✓<br>`GET /kanban/order-progress` → `get_order_progress` | 是 |
| mes | `svc/mes/src/modules/material_requirement.rs` | 10 | 1 | HTTP 在用 | `GET /material-requirements` → `list_material_requirements` E2E✓<br>`GET /material-requirements/{id}` → `get_material_requirement` | 是 |
| mes | `svc/mes/src/modules/production_scheduling.rs` | 8 | 3 | HTTP 在用 | `GET /schedules` → `list_production_schedules`<br>`GET /schedules/{id}` → `get_production_schedule` | 是 |
| mes | `svc/mes/src/modules/work_order.rs` | 10 | 1 | HTTP 在用 | `GET /work-orders` → `list_work_orders` E2E✓<br>`GET /work-orders/{id}` → `get_work_order` | 是 |
| mes | `svc/mes/src/modules/quality_management/patrol.rs` | 8 | 2 | 内部服务层 | — | 是 |
| mes | `svc/mes/src/modules/production_order.rs` | 8 | 1 | HTTP 在用 | `GET /orders` → `list_production_orders` E2E✓<br>`GET /production/orders` → `list_production_orders` | 是 |
| mes | `svc/mes/src/modules/work_report.rs` | 7 | 1 | HTTP 在用 | `GET /work-reports` → `list_work_reports`<br>`GET /work-reports/today-output` → `get_today_production_output` | 是 |
| mes | `svc/mes/src/modules/work_station.rs` | 7 | 1 | HTTP 在用 | `GET /workstations` → `list_work_stations`<br>`GET /workstations/{id}` → `get_work_station` | 是 |
| mes | `svc/mes/src/modules/material_plan.rs` | 6 | 1 | HTTP 在用 | `GET /material-plans` → `list_material_plans`<br>`GET /material-plans/{id}` → `get_material_plan` | 是 |
| mes | `svc/mes/src/modules/production_process.rs` | 6 | 1 | HTTP 在用 | `GET /processes` → `list_processes`<br>`GET /processes/{id}` → `get_process` | 是 |
| mes | `svc/mes/src/modules/production_record.rs` | 6 | 1 | HTTP 在用 | `GET /records` → `list_records` E2E✓<br>`GET /records/{id}` → `get_record` | 是 |
| mes | `svc/mes/src/modules/material_bom/issue_handlers.rs` | 6 | 0 | 内部服务层 | — | 是 |
| mes | `svc/mes/src/modules/material_bom/return_handlers.rs` | 6 | 0 | 内部服务层 | — | 是 |
| mes | `svc/mes/src/modules/quality_management/inspection.rs` | 5 | 1 | 内部服务层 | — | 是 |
| mes | `svc/mes/src/modules/quality_management/standard.rs` | 5 | 1 | 内部服务层 | — | 是 |
| mes | `svc/mes/src/modules/quality_traceability.rs` | 6 | 0 | HTTP 在用 | `GET /traceability/forward/{order_id}` → `forward_traceability`<br>`GET /traceability/backward/{batch_no}` → `backward_traceability` | 是 |
| mes | `svc/mes/src/modules/material_bom/bom_handlers.rs` | 4 | 1 | 内部服务层 | — | 是 |
| mes | `svc/mes/src/modules/production_cost.rs` | 4 | 0 | HTTP 在用 | `GET /cost/work-order/{id}` → `calculate_work_order_cost`<br>`GET /cost/work-order/{id}/detail` → `get_work_order_cost_detail` | 是 |
| mes | `svc/mes/src/modules/audit.rs` | 3 | 0 | HTTP 在用 | `GET /audit-logs` → `list_audit_logs`<br>`GET /audit-logs/{id}` → `get_audit_log` | 是 |
| mes | `svc/mes/src/main.rs` | 2 | 0 | HTTP 在用 | `GET /` → `home` E2E✓<br>`GET /api/plugins/info` → `modules::mes_plugin::get_plugin_info` | 是 |
| mes | `svc/mes/src/modules/settings.rs` | 1 | 1 | HTTP 在用 | `GET /settings/{category}` → `get_settings` | 是 |
| mes | `svc/mes/tests/capacity_e2e.rs` | 1 | 1 | 测试 | — | 是 |
| mes | `svc/mes/src/modules/mes_plugin.rs` | 1 | 0 | 内部服务层 | — | 是 |
| mes | `svc/mes/tests/material_requirement_e2e.rs` | 0 | 1 | 测试 | — | 是 |
| mobile | `svc/mobile/src/modules/oa.rs` | 24 | 7 | 内部服务层 | — | 是 |
| mobile | `svc/mobile/src/modules/stats.rs` | 18 | 0 | 内部服务层 | — | 是 |
| mobile | `svc/mobile/src/modules/task.rs` | 8 | 7 | 内部服务层 | — | 是 |
| mobile | `svc/mobile/src/modules/device.rs` | 6 | 7 | 内部服务层 | — | 是 |
| mobile | `svc/mobile/src/modules/offline_sync.rs` | 10 | 0 | 内部服务层 | — | 是 |
| mobile | `svc/mobile/src/modules/user.rs` | 5 | 2 | 内部服务层 | — | 是 |
| mobile | `svc/mobile/src/modules/patrol.rs` | 3 | 3 | 内部服务层 | — | 是 |
| mobile | `svc/mobile/src/modules/push_notification.rs` | 6 | 0 | 内部服务层 | — | 是 |
| mobile | `svc/mobile/src/modules/document.rs` | 2 | 3 | 内部服务层 | — | 是 |
| mobile | `svc/mobile/src/modules/media.rs` | 3 | 2 | 内部服务层 | — | 是 |
| mobile | `svc/mobile/src/modules/missing_endpoints.rs` | 4 | 1 | 内部服务层 | — | 是 |
| mobile | `svc/mobile/src/modules/offline.rs` | 2 | 2 | 内部服务层 | — | 是 |
| mobile | `svc/mobile/src/modules/offline_records.rs` | 1 | 3 | 内部服务层 | — | 是 |
| mobile | `svc/mobile/src/modules/photo_upload.rs` | 3 | 1 | 内部服务层 | — | 是 |
| mobile | `svc/mobile/src/modules/shortcut.rs` | 3 | 1 | 内部服务层 | — | 是 |
| mobile | `svc/mobile/tests/integration_tests.rs` | 4 | 0 | 测试 | — | 是 |
| mobile | `svc/mobile/src/modules/barcode_scanner.rs` | 1 | 1 | 内部服务层 | — | 是 |
| mobile | `svc/mobile/src/modules/mobile_plugin.rs` | 1 | 0 | HTTP 在用 | `GET /api/plugins/info` → `get_plugin_info`<br>`GET /api/plugins/health` → `plugin_health_check` | 是 |
| monitor | `svc/monitor/src/modules/monitor/alert_evaluator.rs` | 5 | 1 | HTTP 在用 | `GET /thresholds` → `list_thresholds`<br>`GET /thresholds/{id}` → `get_threshold` | 是 |
| monitor | `svc/monitor/src/modules/monitor/settings.rs` | 3 | 3 | HTTP 在用 | `GET /settings` → `list_settings`<br>`PUT /settings` → `batch_update_settings` | 是 |
| monitor | `svc/monitor/src/modules/monitor/health_check.rs` | 1 | 0 | HTTP 在用 | `GET /health` → `get_service_health` E2E✓<br>`GET /infrastructure` → `get_infrastructure_health` | 是 |
| monitor | `svc/monitor/src/modules/monitor/metrics.rs` | 1 | 0 | HTTP 在用 | `GET /metrics` → `list_metrics`<br>`GET /metrics/system` → `get_system_metrics` | 是 |
| pdm | `svc/pdm/src/modules/document.rs` | 14 | 2 | HTTP 在用 | `GET /documents` → `list_documents`<br>`POST /documents/search` → `search_documents` | 是 |
| pdm | `svc/pdm/src/modules/project.rs` | 12 | 3 | HTTP 在用 | `GET /projects` → `list_projects`<br>`GET /projects/{id}` → `get_project` | 是 |
| pdm | `svc/pdm/tests/pdm_tests.rs` | 9 | 5 | 测试 | — | 是 |
| pdm | `svc/pdm/src/modules/bom.rs` | 10 | 2 | HTTP 在用 | `GET /bom-versions` → `list_bom_versions`<br>`GET /bom-versions/{id}` → `get_bom_version` | 是 |
| pdm | `svc/pdm/src/modules/workflow.rs` | 11 | 1 | HTTP 在用 | `GET /workflows` → `list_workflows` E2E✓<br>`GET /workflows/{id}` → `get_workflow` | 是 |
| pdm | `svc/pdm/src/modules/change_notice.rs` | 9 | 1 | HTTP 在用 | `GET /change-notices` → `list_change_notices`<br>`GET /change-notices/{id}` → `get_change_notice` | 是 |
| pdm | `svc/pdm/src/modules/document_version.rs` | 8 | 1 | HTTP 在用 | `GET /documents/{documentId}/versions` → `list_versions`<br>`GET /documents/{documentId}/versions/{versionId}` → `get_version` | 是 |
| pdm | `svc/pdm/src/modules/material.rs` | 6 | 1 | HTTP 在用 | `GET /materials` → `list_materials`<br>`GET /materials/{id}` → `get_material` | 是 |
| pdm | `svc/pdm/src/modules/configuration.rs` | 5 | 1 | HTTP 在用 | `GET /configurations` → `list_configurations`<br>`GET /configurations/{id}` → `get_configuration` | 是 |
| pdm | `svc/pdm/src/modules/drawings.rs` | 5 | 1 | HTTP 在用 | `GET /drawings` → `list_drawings`<br>`GET /drawings/{id}` → `get_drawing` | 是 |
| pdm | `svc/pdm/src/modules/product.rs` | 5 | 1 | HTTP 在用 | `GET /products` → `list_products`<br>`GET /products/{id}` → `get_product` | 是 |
| pdm | `svc/pdm/src/modules/production_batch.rs` | 5 | 1 | HTTP 在用 | `GET /production-batches` → `list_batches`<br>`GET /production-batches/{id}` → `get_batch` | 是 |
| pdm | `svc/pdm/src/modules/production_formula.rs` | 5 | 1 | HTTP 在用 | `GET /production-formulas` → `list_formulas`<br>`GET /production-formulas/{id}` → `get_formula` | 是 |
| pdm | `svc/pdm/src/modules/production_process.rs` | 5 | 1 | HTTP 在用 | `GET /production-processes` → `list_processes`<br>`GET /production-processes/{id}` → `get_process` | 是 |
| pdm | `svc/pdm/src/modules/production_step.rs` | 5 | 1 | HTTP 在用 | `GET /production-steps` → `list_steps`<br>`GET /production-steps/{id}` → `get_step` | 是 |
| pdm | `svc/pdm/src/modules/version.rs` | 5 | 1 | HTTP 在用 | `GET /versions` → `list_versions`<br>`GET /versions/{id}` → `get_version` | 是 |
| pdm | `svc/pdm/src/modules/production_statistics.rs` | 5 | 0 | HTTP 在用 | `GET /production-statistics` → `list_statistics`<br>`GET /statistics` → `get_statistics_summary` E2E✓ | 是 |
| pdm | `svc/pdm/src/modules/dashboard.rs` | 4 | 0 | HTTP 在用 | `GET /dashboard` → `get_dashboard` E2E✓<br>`GET /health` → `api_health` E2E✓ | 是 |
| pdm | `svc/pdm/src/modules/settings.rs` | 1 | 1 | HTTP 在用 | `GET /settings/{category}` → `get_settings` | 是 |
| pdm | `svc/pdm/src/main.rs` | 1 | 0 | HTTP 在用 | `GET /` → `home` E2E✓<br>`GET /health` → `health` E2E✓ | 是 |
| pdm | `svc/pdm/src/modules/pdm_plugin.rs` | 1 | 0 | 内部服务层 | — | 是 |
| plugin-registry | `svc/plugin-registry/src/modules/plugin/handlers/tenant_plugins.rs` | 18 | 4 | 内部服务层 | — | 是 |
| plugin-registry | `svc/plugin-registry/src/modules/plugin/handlers/marketplace.rs` | 12 | 0 | 内部服务层 | — | 是 |
| plugin-registry | `svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs` | 10 | 2 | 内部服务层 | — | 是 |
| plugin-registry | `svc/plugin-registry/src/modules/plugin/handlers/versioning.rs` | 6 | 1 | 内部服务层 | — | 是 |
| plugin-registry | `svc/plugin-registry/src/modules/plugin/handlers/runtime.rs` | 4 | 2 | 内部服务层 | — | 是 |
| plugin-registry | `svc/plugin-registry/src/modules/plugin/handlers/upgrade_workflow.rs` | 4 | 1 | 内部服务层 | — | 是 |
| pm | `svc/pm/src/modules/project.rs` | 11 | 1 | HTTP 在用 | `GET /projects` → `list_projects`<br>`GET /projects/{id}` → `get_project` | 是 |
| pm | `svc/pm/src/modules/settlement.rs` | 10 | 1 | HTTP 在用 | `GET /projects/{project_id}/settlements` → `get_project_settlements`<br>`GET /settlements/{id}` → `get_settlement` | 是 |
| portal | `svc/portal/src/modules/help/faq.rs` | 6 | 2 | 内部服务层 | — | 是 |
| portal | `svc/portal/src/modules/help/guide.rs` | 7 | 1 | 内部服务层 | — | 是 |
| portal | `svc/portal/src/modules/graphql_mutation_impls.rs` | 1 | 2 | 内部服务层 | — | 是 |
| portal | `svc/portal/src/modules/aggregation.rs` | 1 | 0 | HTTP 在用 | `GET /api/portal/dashboard/business-stats` → `get_business_stats`<br>`GET /api/portal/dashboard/unified-todos` → `get_unified_todos` | 是 |
| portal | `svc/portal/src/modules/dashboard.rs` | 1 | 0 | 内部服务层 | — | 是 |
| portal | `svc/portal/src/modules/graphql_dataloader.rs` | 1 | 0 | 内部服务层 | — | 是 |
| portal | `svc/portal/src/modules/graphql_query_impls.rs` | 1 | 0 | 内部服务层 | — | 是 |
| qms | `svc/qms/src/modules/apqp.rs` | 38 | 4 | HTTP 在用 | `GET /apqp/projects` → `list_apqp_projects`<br>`POST /apqp/projects` → `create_apqp_project` | 是 |
| qms | `svc/qms/tests/integration_tests.rs` | 26 | 12 | 测试 | — | 是 |
| qms | `svc/qms/src/modules/eight_d.rs` | 19 | 9 | HTTP 在用 | `GET /eightd` → `list_eightd_reports`<br>`POST /eightd` → `create_eightd_report` | 是 |
| qms | `svc/qms/src/modules/inspection_standard.rs` | 21 | 7 | HTTP 在用 | `GET /inspection-items` → `list_inspection_items`<br>`GET /inspection-items/{id}` → `get_inspection_item` | 是 |
| qms | `svc/qms/src/modules/audit.rs` | 25 | 1 | HTTP 在用 | `GET /audit-plans` → `list_audit_plans`<br>`POST /audit-plans` → `create_audit_plan` | 是 |
| qms | `svc/qms/src/modules/quality_dashboard.rs` | 25 | 1 | HTTP 在用 | `GET /quality-dashboard/overview` → `get_quality_overview`<br>`GET /quality-dashboard/trend` → `get_quality_trend` | 是 |
| qms | `svc/qms/src/modules/quality_inspection.rs` | 19 | 6 | HTTP 在用 | `GET /checks` → `list_inspections`<br>`POST /checks` → `create_inspection` | 是 |
| qms | `svc/qms/src/modules/fmea.rs` | 19 | 2 | HTTP 在用 | `GET /fmea` → `list_fmea_analyses` E2E✓<br>`POST /fmea` → `create_fmea_analysis` E2E✓ | 是 |
| qms | `svc/qms/src/modules/quality_issue.rs` | 17 | 1 | HTTP 在用 | `GET /issues` → `list_issues` E2E✓<br>`POST /issues` → `create_issue` E2E✓ | 是 |
| qms | `svc/qms/src/modules/spc.rs` | 12 | 2 | HTTP 在用 | `GET /spc/charts` → `list_spc_charts` E2E✓<br>`POST /spc/charts` → `create_spc_chart` E2E✓ | 是 |
| qms | `svc/qms/src/modules/quality_standard.rs` | 9 | 4 | HTTP 在用 | `GET /standards` → `list_standards`<br>`POST /standards` → `create_standard` | 是 |
| qms | `svc/qms/src/modules/dashboard.rs` | 12 | 0 | HTTP 在用 | `GET /dashboard` → `get_dashboard_stats` E2E✓<br>`GET /quality-tasks/today-pass-rate` → `get_today_quality_pass_rate` | 是 |
| qms | `svc/qms/src/modules/quality_cost.rs` | 9 | 1 | HTTP 在用 | `GET /quality-costs` → `list_quality_costs`<br>`POST /quality-costs` → `create_quality_cost` | 是 |
| qms | `svc/qms/src/modules/corrective_action.rs` | 6 | 1 | HTTP 在用 | `GET /actions` → `list_actions`<br>`POST /actions` → `create_action` | 是 |
| qms | `svc/qms/src/modules/quality_task.rs` | 6 | 1 | HTTP 在用 | `GET /quality-tasks` → `list_quality_tasks`<br>`GET /quality-tasks/{id}` → `get_quality_task` | 是 |
| qms | `svc/qms/src/modules/data_sync.rs` | 3 | 1 | HTTP 在用 | `GET /sync-records` → `list_sync_records`<br>`GET /sync-records/{id}` → `get_sync_record` | 是 |
| qms | `svc/qms/src/modules/integration.rs` | 2 | 0 | HTTP 在用 | `POST /api/internal/qms/actions/integration` → `create_integration_action`<br>`POST /api/internal/qms/inspections/{inspection_no}/result` → `update_integration_inspection_result` | 是 |
| qms | `svc/qms/src/main.rs` | 1 | 0 | HTTP 在用 | `GET /` → `home` E2E✓<br>`GET /health` → `health` E2E✓ | 是 |
| qms | `svc/qms/src/modules/qms_plugin.rs` | 1 | 0 | HTTP 在用 | `GET /api/plugins/info` → `get_plugin_info`<br>`GET /api/plugins/health` → `plugin_health_check` | 是 |
| rd | `svc/rd/tests/integration_tests.rs` | 11 | 11 | 测试 | — | 是 |
| rd | `svc/rd/src/repositories/project_repository.rs` | 0 | 2 | 内部服务层 | — | 是 |
| scm | `svc/scm/tests/integration_tests.rs` | 9 | 5 | 测试 | — | 是 |
| scm | `svc/scm/src/main.rs` | 1 | 0 | HTTP 在用 | `GET /api/plugins/info` → `scm_plugin::get_plugin_info`<br>`GET /api/plugins/health` → `scm_plugin::plugin_health_check` | 是 |
| server | `svc/server/src/modules/subscription_module.rs` | 3 | 0 | HTTP 在用 | `GET /current` → `get_current_subscription`<br>`POST /` → `upsert_subscription` E2E✓ | 是 |
| server | `svc/server/src/modules/communication_real_module.rs` | 0 | 1 | HTTP 在用 | `GET /notifications` → `notification::get_notifications` E2E✓<br>`POST /notifications` → `notification::create_notification` E2E✓ | 是 |
| server | `svc/server/src/modules/integration_real_module.rs` | 0 | 1 | 内部服务层 | — | 是 |
| server | `svc/server/src/modules/mobile_real_module.rs` | 0 | 1 | HTTP 在用 | `GET /api/mobile/health` → `|| async { "Mobile Service OK" }` | 是 |
| server | `svc/server/src/modules/monitor_real_module.rs` | 0 | 1 | 内部服务层 | — | 是 |
| server | `svc/server/src/modules/plugin_registry_real_module.rs` | 0 | 1 | 内部服务层 | — | 是 |
| shared-auth | `lib/shared-auth/src/middleware/department.rs` | 0 | 1 | 基础设施/启动 | `GET /protected` → `|| async { "ok" }` | 是 |
| shared-bootstrap | `lib/shared-bootstrap/src/lib.rs` | 1 | 4 | 基础设施/启动 | `GET /health` → `health_check` E2E✓<br>`GET /api/health/detailed` → `health_check_detailed` | 是 |
| shared-core | `lib/shared-core/src/n_plus_one_detector.rs` | 1 | 0 | 基础设施/启动 | `GET /` → `handler_requires_counter` E2E✓<br>`GET /` → `handler_requires_counter` E2E✓ | 是 |
| shared-db | `lib/shared-db/src/master_data_refs.rs` | 18 | 3 | 基础设施/启动 | — | 是 |
| shared-db | `lib/shared-db/src/audit.rs` | 4 | 1 | 基础设施/启动 | — | 是 |
| shared-db | `lib/shared-db/src/reconciliation_log.rs` | 2 | 2 | 基础设施/启动 | — | 是 |
| shared-db | `lib/shared-db/src/rls.rs` | 0 | 2 | 基础设施/启动 | — | 是 |
| shared-db | `lib/shared-db/tests/connection_budget_it.rs` | 0 | 1 | 基础设施/启动 | — | 是 |
| srm | `svc/srm/tests/integration_tests.rs` | 3 | 1 | 测试 | — | 是 |
| srm | `svc/srm/src/main.rs` | 1 | 0 | HTTP 在用 | `GET /api/plugins/info` → `modules::srm_plugin::get_plugin_info`<br>`GET /api/plugins/health` → `modules::srm_plugin::plugin_health_check` | 是 |
| ticket | `svc/ticket/src/handlers.rs` | 29 | 17 | HTTP 在用 | `POST /tickets` → `create_ticket_handler`<br>`GET /tickets/stats` → `get_stats_handler` | 是 |
| ticket | `svc/ticket/src/ticket_ext.rs` | 14 | 11 | HTTP 在用 | `GET /workflows` → `get_workflows` E2E✓<br>`GET /workflows/match` → `get_workflow_for_ticket_type` | 是 |
| ticket | `svc/ticket/src/sla_service.rs` | 12 | 7 | 内部服务层 | — | 是 |
| ticket | `svc/ticket/src/feedback_compat.rs` | 5 | 2 | HTTP 在用 | `POST /feedbacks` → `create_feedback`<br>`GET /feedbacks/{id}` → `get_feedback` | 是 |
| tms | `svc/tms/src/main.rs` | 3 | 0 | HTTP 在用 | `GET /api/plugins/info` → `get_plugin_info`<br>`GET /api/plugins/health` → `plugin_health_check` | 是 |
| unified-core | `svc/unified-core/src/modules/tenant/handlers.rs` | 62 | 7 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/flow/monitor.rs` | 66 | 0 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/automation/mod.rs` | 35 | 8 | 基础设施/启动 | — | 是 |
| unified-core | `svc/unified-core/src/modules/flow/approval.rs` | 26 | 0 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/flow/workflow.rs` | 19 | 4 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/audit/audit_query.rs` | 21 | 0 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/iam/position.rs` | 8 | 12 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/middleware/versioning.rs` | 14 | 3 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/flow/task.rs` | 13 | 3 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/iam/user/crud.rs` | 13 | 3 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/flow/instance.rs` | 15 | 0 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/file/manage.rs` | 8 | 5 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/iam/role.rs` | 11 | 2 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/menu/handlers.rs` | 11 | 2 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/flow/delegate.rs` | 9 | 2 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/flow/statistics.rs` | 11 | 0 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/iam/user/roles.rs` | 9 | 2 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/system_audit/mod.rs` | 11 | 0 | 基础设施/启动 | — | 是 |
| unified-core | `svc/unified-core/src/modules/flow/category.rs` | 8 | 2 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/flow/rule.rs` | 7 | 3 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/iam/auth.rs` | 8 | 2 | 后台任务(tokio::spawn) | — | 是 |
| unified-core | `svc/unified-core/src/modules/engagement/handlers.rs` | 6 | 3 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/audit/handlers.rs` | 8 | 0 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/iam/user/profile_ext.rs` | 5 | 3 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/master/handlers.rs` | 7 | 1 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/tests/automation_runs_e2e.rs` | 7 | 0 | 测试 | — | 是 |
| unified-core | `svc/unified-core/src/modules/audit/login_log_handlers.rs` | 4 | 2 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/doc/services/template.rs` | 5 | 1 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/iam/user/batch.rs` | 3 | 3 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/iam/user/status.rs` | 3 | 3 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/settings/api_keys.rs` | 3 | 3 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/doc/services/document.rs` | 4 | 1 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/doc/services/folder.rs` | 4 | 1 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/iam/user/access_log.rs` | 5 | 0 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/iam/user_position.rs` | 2 | 3 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/routes/business_tools/database_audit_log_store.rs` | 4 | 1 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/doc/handlers.rs` | 4 | 0 | HTTP 在用 | — | 是 |
| unified-core | `svc/unified-core/src/modules/iam/user_permission.rs` | 4 | 0 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/settings/smtp.rs` | 3 | 1 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/file/download.rs` | 3 | 0 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/iam/user/profile.rs` | 2 | 1 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/migration/service.rs` | 1 | 2 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/main.rs` | 0 | 2 | 后台任务(tokio::spawn) | — | 是 |
| unified-core | `svc/unified-core/src/modules/file/upload.rs` | 0 | 2 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/iam/permission_verify.rs` | 2 | 0 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/iam/user/validation.rs` | 2 | 0 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/handlers.rs` | 1 | 0 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/middleware/audit_log.rs` | 0 | 1 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/flow/variable.rs` | 1 | 0 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/iam/permission.rs` | 1 | 0 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/src/modules/iam/permission_metadata.rs` | 1 | 0 | 内部服务层 | — | 是 |
| unified-core | `svc/unified-core/tests/audit_e2e.rs` | 0 | 1 | 测试 | — | 是 |
| wms | `svc/wms/tests/integration_tests.rs` | 23 | 18 | 测试 | — | 是 |
| wms | `svc/wms/tests/analytics_e2e.rs` | 0 | 6 | 测试 | — | 是 |
| wms | `svc/wms/tests/audit_e2e.rs` | 2 | 0 | 测试 | — | 是 |
| wms | `svc/wms/tests/labor_e2e.rs` | 1 | 1 | 测试 | — | 是 |
| wms | `svc/wms/tests/replenishment_orders_e2e.rs` | 0 | 2 | 测试 | — | 是 |
| wms | `svc/wms/tests/slotting_e2e.rs` | 0 | 2 | 测试 | — | 是 |
| wms | `svc/wms/tests/stock_take_e2e.rs` | 0 | 2 | 测试 | — | 是 |
| wms | `svc/wms/tests/transfer_order_e2e.rs` | 0 | 2 | 测试 | — | 是 |
| wms | `svc/wms/src/main.rs` | 1 | 0 | HTTP 在用 | `GET /api/plugins/info` → `get_plugin_info`<br>`GET /api/plugins/health` → `plugin_health_check` | 是 |
| wms | `svc/wms/src/models/audit_log.rs` | 0 | 1 | 内部服务层 | — | 是 |
