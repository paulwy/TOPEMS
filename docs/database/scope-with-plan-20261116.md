# §17.2 请求事务统一到 `scope_with` —— 全局方案（只出方案，不落码）

> 状态：**方案定稿待评审**。本文件不产生任何代码/迁移改动。
> 代码基线：`f9ce1b495`（origin/main，2026-11-15）。
> 上游依据：[TODO.md](../../TODO.md) §17.2、[scope.rs](../../lib/shared-db/src/scope.rs) 模块头注释、[tenant.rs](../../lib/shared-auth/src/middleware/tenant.rs)。

## 0. 一句话结论

`scope_with` **已经是现成的正确抽象**（474 处已在用、生产在跑），不需要新发明机制；本方案要解决的是**收敛口径与验收判据**：把"请求内拿裸 `&mut **txn` 直接查"和"请求内再 `pool.begin()` 另开事务"两种写法统一到同一条请求事务上，并用**单租户也能跑的只读判据**替代已不成立的"租户 A/B 运行时验证"。

## 1. 现状真实取数（TODO 的 590 条已过期）

| 维度 | TODO 记 | 实测（本机 origin/main） | 说明 |
|---|---|---|---|
| `&mut **txn` 裸用请求事务 | 590 处 / 8 服务 | **1656 处 / 8 服务** | erp 349、wms 292、hrm 232、scm 211、srm 211、crm 197、rd 163、pdm 1 |
| 已迁 `scope_with` | 未记 | **474 处 / 11 服务** | pm 130、pdm 115、communication 79、integration 77、tms 41、master-data 16、scm 6、portal 4、finance 3、ai 1、search 1 |
| 请求路径里 `.scope*()` 另开事务 | QMS 86 / PM 130 / PDM 115 | 见 §5 轨道 B | finance 367、mes 205、lims 148、unified-core 102 等；PM/PDM 已完成迁移 |
| 租户表 RLS 策略 | — | **1030 条** SELECT/ALL 策略，962 条谓词含 `app.tenant_id` | 全部为行级隔离，不是 schema-per-tenant |
| 物理 schema | — | 58 个，均为**模块名**（`pm`/`wms`/`hrm`/`rs`/`plugin_*` …） | 关键前提：schema ≠ 租户 |
| `core_tenants` | — | **1 个租户** | 这是"租户 A/B 验证"无法执行的原因 |

两个结论直接改写 W2-B / §17.2 的执行假设：

1. 1656 不是 590 —— 不能按旧数估算批次规模。
2. "租户 A/B 互不可见"这条验收在生产只有 1 个租户时**永远跑不出来**，必须换判据（见 §7）。

## 2. 目标模型：三层职责不要混

```
① 连接层（§17.1，已完成治理 A/B）
   进程单池 + 预算 62；模块拿不到 PgPool，只能拿 Db
        │
② 事务层（tenant_middleware，已有）
   每请求 1 个 Transaction<'static, Postgres>
   起始即写 app.tenant_id / app.rls_system（事务级 GUC）
   放进 RlsTxnCell，handler 用 Extension 取
        │
③ 作用域层（scope_with，已有）
   复用②的事务，只叠加 SET LOCAL search_path
   再补一次 app.tenant_id / app.rls_system（防后台误入）
   返回 ScopedTxn：实现 Executor，可 &mut *scope
```

要点：

- `scope_with` **不 `BEGIN`**，因此**不额外占连接**——这是它相对 `scope()`/`scope_read()` 的全部价值（后者各自 `pool.begin()`，一个写请求就吃 2 条连接）。
- `ScopedTxn::commit()` 对借来的事务是 **no-op**，提交/回滚仍归中间件，不存在"谁先提交"的竞态。
- `scope_with` 借的是 `&mut Transaction`，**同一事务同一时刻只能有一个 `ScopedTxn`**（borrow 排他）；需要多个作用域必须顺序 drop。

## 3. 全限定 schema / search_path / RLS 三者的对应关系（W2-B 验收判据的来源）

这是本方案最核心的一节。三者是**三条正交的解析/鉴权路径**：

| 路径 | 由谁决定 | 影响什么 | 与另两者的关系 |
|---|---|---|---|
| **表解析** | `search_path`（事务级 `SET LOCAL`）或 SQL 里写死的 `schema.table` | 命中哪个物理表 | 全限定名**短路** search_path：写了 `pm.projects` 就不再走 search_path。未写才走 |
| **RLS 谓词** | `pg_policies` 里的表达式，依赖 `current_setting('app.tenant_id')` / `app.rls_system` | 返回哪些行 | **与 schema 限定完全无关**。无论是 `projects` 还是 `pm.projects`，只要命中同一张开了 RLS 的表，谓词一样 |
| **schema 归属校验** | `scripts/schema_boundary.json` 的 `allowed` | 静态门禁是否放行 | 只对**未限定**名字生效（已限定名字被 `extractRefs` 直接跳过） |

由此得到三条可直接落地的对应规则：

**规则 1（解析必须唯一）** 对任一租户表，若模块 SQL 用裸名，则 `search_path` 中**第一个**包含该表的 schema 必须等于该表的权威 owner。
- W2-B 的作用 = 把裸名改成全限定，**让解析结果与 search_path 无关**，从而消除"同名表命中影子表"的整类风险。
- 因此 W2-B 是 §17.2 的**前置**而非平行项：歧义表（`projects`/`inventory`/`employees`）在 search_path 正确之前改全限定，语义最安全。

**规则 2（RLS 与限定名无关，但与"有没有 GUC"强相关）**
- 全限定名不能替代 RLS：`pm.projects` 依然受 `app.tenant_id` 谓词约束。
- 反过来，`scope_with` 也不能替代全限定名：search_path 设对只是让裸名解析到正确 schema，若该 schema 里恰好有同名废弃副本（如 `portal` 的情形），照样读错表。

**规则 3（三个迁移动作的正确先后）**

```
W2-B0 清高危歧义（已完成：AMBIGUOUS/CROSS_SCHEMA = 0）
   ↓ 前置：解析歧义消失，search_path 才可安全生效
W2-B 逐模块裸名→全限定（1535 条，按模块分批）
   ↓ 与前一批不冲突：全限定名与 search_path 可共存
§17.2 轨道A：1656 处裸 txn → scope_with（本方案）
§17.2 轨道B：请求路径 .scope*() → scope_with（本方案，容量收益）
```

**反例（必须避免）**：先做 §17.2 再补 W2-B。因为一旦 `scope_with` 把 search_path 设成模块域，原先"恰好解析对"的裸名会立刻改解析目标；歧义未清时这一步无法用静态门禁复核。

## 4. 迁移配方（逐 handler，禁止半迁移）

```rust
// before：直接用请求事务，事务里没有模块 search_path
let rows = sqlx::query_as::<_, Row>("SELECT ... FROM projects WHERE id = $1")
    .bind(id).fetch_all(&mut **txn).await?;

// after：在请求事务上叠一层模块作用域
let mut scope = db.scope_with(&mut *txn).await?;
let rows = sqlx::query_as::<_, Row>("SELECT ... FROM projects WHERE id = $1")
    .bind(id).fetch_all(&mut *scope).await?;
scope.commit().await?; // 对借来的事务是 no-op，仅显式收尾防止借用期过长
```

**为什么必须整 handler 迁移，不能"这一句改了、下一句还裸用"**：
`SET LOCAL` / `set_config(..., true)` 是**事务级**而非语句级。一旦 `scope_with` 设了 `search_path='pm, public'`，**同一事务内后续所有裸名查询都继承该值**。所以：

- 混用不会报错，但会静默改变同事务内其他查询的解析目标 —— 这是最隐蔽的一类回归。
- 迁移粒度必须是"一个 handler 一个整体"（含该 handler 内的全部查询、含早先已 `&mut **txn` 的分支）。

已迁移的 474 处（pm 130 / pdm 115 / communication 79 / integration 77 / tms 41 …）即是可对照的参考实现，例如 [project_resource.rs](file:///Users/xingzhai/topems/svc/pm/src/modules/project_resource.rs#L77)。

## 5. 覆盖范围、批次与顺序

### 轨道 A：裸 `&mut **txn` → `scope_with`（解析正确性）

| 批次 | 服务 | 处数 | 排序理由 |
|---|---|---|---|
| A1 | pdm | 1 | 唯一"两轴都小"的服务，且已有 115 处 `scope_with` 参考实现 → 用来跑通配方与验收脚本的**冒烟批** |
| A2 | rd → crm | 163 / 197 | 纯业务读写，无 IAM/鉴权旁路，失败面可控 |
| A3 | srm + scm | 211 / 211 | 互为上下游、共用供应商/采购表，同一验收脚本一次覆盖 |
| A4 | hrm | 232 | 与刚清零的 `employees`/`departments` 跨 schema 点同域，验收可复用 |
| A5 | wms | 292 | `inventory` 与 erp 同名 → 必须在 erp 之前单独确认 wms 侧解析 |
| A6 | erp | 349 | 最大，且 `inventory`/`suppliers` 与 wms/srm 同名 → 放最后，等前面各批把同名表归属钉死 |

### 轨道 B：请求路径 `.scope*()` → `scope_with`（连接容量，§17.1 收益兑现）

| 批次 | 服务 | 处数 | 排序理由 |
|---|---|---|---|
| B1 | finance | 367 | 最大消耗者；且其 `.scope*` 多在内联谓词（`tenant_id = $n`）路径，迁移后 RLS 判据最容易量化 |
| B2 | mes → lims | 205 / 148 | 量级相近，同属"写请求密集" |
| B3 | unified-core → gis → ai | 102 / 95 / 91 | 含 WS/事件桥的后台线程，必须逐点区分请求路径与后台路径（后台保留 `scope_system`） |
| B4 | qms → ticket → ehs | 89 / 65 / 59 | QMS 就是 TODO 里那 86 处的真身 |

**轨道 B 的分流规则（决定"改还是不改"）**：能拿到 `RlsTxnCell`（请求上下文）→ 改 `scope_with`；拿不到（定时任务、事件消费者、CLI、迁移脚本）→ **保持 `scope_system`/`scope_read_system`，不许改**。改错方向会让后台任务触发 `RLS context missing` 报错（这是 `apply_request_tenant` 的显式保护，见 [scope.rs](file:///Users/xingzhai/topems/lib/shared-db/src/scope.rs#L273-L282)）。

### 两条轨道的关系

- A 与 B **不共享文件**（A 是 `&mut **txn` 查询点，B 是 `.scope*` 调用点），可在不同服务上并行。
- A 与 B **共享验收脚本与判据**（§7）。
- 两者都受 W2-B 的模块批次约束：同一服务不得同时开 A/B 与 W2-B 三路。

## 6. 是否需要双轨过渡？不需要

**结论：不设 feature flag、不做双写、不留兼容分支。**

理由：

1. `scope_with` 是**纯加性**的：只在既有事务上多执行一条 `set_config`，不改 SQL、不改返回结构、不改事务边界。
2. 提交语义不变：`ScopedTxn::commit()` 对 Borrowed 事务是 no-op，中间件仍是唯一提交者，不存在"新旧两套收尾"。
3. 迁移前后**同一连接、同一事务、同一 RLS 上下文**，唯一变化是 `search_path` 从"池会话值"变成"显式模块值"——而这正是要修的东西。
4. 引入双轨反而制造第三种状态（部分 handler 带 search_path、部分不带），使 §7 的解析判据无法一次跑全。

**回滚点**：
- 纯代码改动，**无 DDL、无迁移、无数据变更** → 回滚 = 按服务 `git revert` 该批 commit，无需数据回滚。
- 单批失败不影响其他批次（服务间无共享事务）。
- 唯一不可"半回滚"的边界：**单个 handler 必须整文件语义一致**（§4），回滚也要整 handler 回滚。

## 7. 单租户环境下可执行、可复核的验收判据（替代 A/B 验证）

生产只有 1 个租户，但 RLS 谓词是 `tenant_id = current_setting('app.tenant_id')`，**不需要第二个真实租户**即可验证隔离——用一个"不存在的租户 UUID"就能构造出"他人视角"。三条判据全部**只读**、全部可脚本化：

### 判据 ①：结构（策略是否真的挂在目标表上）

```sql
SELECT n.nspname, c.relname, c.relrowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = '<module>' AND c.relname = '<table>';
-- 期望：relrowsecurity = true 且 pg_policies 中存在含 app.tenant_id 的谓词
```

### 判据 ②：行为（假租户视角必须 0 行）

```sql
BEGIN READ ONLY;
SELECT set_config('search_path', '<module>, public', true);
SELECT set_config('app.tenant_id', '<真实租户>',  true);  -- 对照：N 行
-- 重开只读事务
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-0000000000ff', true); -- 期望：0 行
SELECT set_config('app.rls_system', 'off', true);
ROLLBACK;
```

**已核实的现状样例**（只读查 `pg_policies`）：

- `pm.projects`：`rls_system='on' OR tenant_id = current_setting('app.tenant_id')` → 假租户得 0 行，**符合判据**。
- `rs.projects`：`current_setting(...) IS NULL OR ... tenant_id IS NULL OR ... = '000…0'` → **未设上下文即放行**，**不符合判据**。

按谓词形态分类（`pg_policies` 中 `cmd IN ('SELECT','ALL')` 且 `qual` 非空，共 **1030** 条；其中 **962** 条谓词含 `app.tenant_id`，**68** 条为 owner/角色类非租户谓词）：

| 形态 | 条数 | 含义 |
|---|---|---|
| 有 `rls_system` 逃生口 + 未设即拒 | **579** | 当前正确态 |
| 无逃生口、未设即**放行** | **370** | 跨租户放行风险（`rs` 这类） |
| 既有逃生口、又未设即放行 | **12** | 最危险，两种旁路叠加 |
| 无逃生口、未设即拒 | **1** | 安全但系统通道不可用 |
| 非租户谓词（owner/角色） | **68** | 不适用本判据，单独归类 |

→ 所以判据 ② 分两档执行：**②-a 假租户 0 行**对 962 条租户策略都成立、可直接作批次门禁；**②-b 未设上下文必须 0 行**目前仅 579 + 1 = 580 条成立，**382 条（370 + 12）是已知缺陷**（属 W7/known-gate 范围，不在本方案内修），只能作台账、不作阻断。

### 判据 ③：解析（证明没落到影子表）

```sql
EXPLAIN (VERBOSE, FORMAT JSON)
SELECT ... ;  -- 原样贴回被迁移的 SQL
-- 从 JSON 里读 Scan 节点的 Schema + Relation Name
-- 期望：等于该模块 search_path 的第一个 schema，且不等于任何 *_tmp / 废弃副本
```

这条是 W2-B 与 §17.2 的**共同判据**：只要 `Scan.Schema` 固定，就同时证明"全限定名写对了"和"search_path 没把它带偏"。

### 判据 ④（静态，防回潮）

建议新增 `scripts/ci/check-request-txn.mjs`（形态照抄 W2-0）：
- 统计 `svc/*/src/**` 中 `&mut **txn` 与 `.scope()`/`.scope_read()`（排除 `_system`）的**按服务计数**；
- 落基线，**只减不增**；
- 豁免白名单：显式 `scope_system`/`scope_read_system`/`scope_for_tenant` 及后台任务模块。

这样即使不做运行时验证，也能保证"迁移过的不会退回去"。

## 8. 风险与需业务判断的边界（本方案**不**顺手开做）

| # | 边界 | 为什么不能顺手做 | 建议归属 |
|---|---|---|---|
| 1 | **W1-2b 的 481 条 be_only 甄别** | 要判断"权限码仍在用 / 已废弃 / 与别处重复"，属业务判断；批量补入等于往 `core_permissions` 塞垃圾，且会污染 W1-2d 的 976→新口径分流 | 交你/产品定夺，只出清单 |
| 2 | **最后 1 处 `MONOLITH_SERVICE_URL` 的 `set_var`** | 它是"单体模式"的**进程级信号**，被 portal 客户端 3 处 + `shared-bootstrap` 的 IAM 自调用守卫读取。改显式注入要动 4 个调用点与 IAM 语义；提前/延后设置都会改变 IAM 是否走自调用路径 | 单独立项，先出注入方案 |
| 3 | **382 条宽松 RLS 策略** | 是策略定义缺陷（未设上下文即放行），属 W7 RLS 收口与 K 台账范围；在 §17.2 里改策略会混淆两个变更面 | W7 / known-gate |
| 4 | **`rs`/`portal` 等影子 schema 里的同名废弃副本** | 与 W2-B 规则 2 相关，但是**数据侧**问题（空壳表/副本表），要 DDL 与数据迁移，需生产窗口 | W2-D |
| 5 | **后台任务的上下文来源** | 轨道 B 改错方向会触发 `RLS context missing` 硬错；需要先盘点哪些 `spawn` 路径其实有请求上下文 | 随 B3 批逐点确认 |
| 6 | **`unified-core` 的 WS/事件桥线程** | 事件桥在 `serve` 进程内但无 HTTP 请求，绝不能套 `scope_with` | B3 批前置确认 |

## 9. 落地顺序建议（与本方案的依赖）

```
[pdm 冒烟] → [新增 check-request-txn 基线门禁] → A2/A3 → B1(finance) → A4/A5/A6 ⇄ B2/B3/B4
```

- 先 pdm 冒烟 + 立门禁，再做量大批次——否则无度量口径（与 W0 立 `check-schema-prefix` 同理）。
- B1（finance 367）优先于其余 B 批：它直接兑现 §17.1 的"2 条连接变 1 条"，容量收益最大且可量化。
- A6（erp）最后：与 wms/srm 的同名表归属必须已定。

## 10. 本方案明确不做

- 不改任何业务代码、不加迁移、不改 RLS 策略、不调连接池参数。
- 不动 §8 的六项边界（含 W1-2b 甄别与 `MONOLITH_SERVICE_URL`）。
- 不 push、不提交；生产库仅只读查询（本文所有数字均来自只读查询与代码静态统计）。
