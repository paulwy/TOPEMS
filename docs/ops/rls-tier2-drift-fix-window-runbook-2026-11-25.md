# 档 2 五条漂移策略订正 · 生产窗口准备手册（2026-11-25）

> 对应收口汇总 P1 #1。五条表基准口径已收紧，但生产仍挂 `qual=true` 全放行；根因是**账本滞后**（水位 `20261119000002`，三条既有严格化迁移未重放），不是新缺陷。本手册给出两条订正路径、窗口前预检、执行步骤、回滚与核验口径。**本地不连生产、不擅动；策略变更须在生产窗口 + 安全/产品确认后执行。**

## 1. 五条表与基准口径

| 生产表 | 生产现状（漂移） | 基准目标口径 | 链上既有迁移 | 基准策略名 |
|---|---|---|---|---|
| `iam.roles` | ALL = true | `rls_global_read` SELECT(true) 全局只读 + `rls_system_write` ALL 系统通道写 | `20261119161000_zero_path_retained_tables_policy_fix.sql` | 2 条 |
| `core.core_tenant_plugins` | ALL = true | `rls_system_only` ALL 仅系统通道（遗留壳，权威表 `iam.core_tenant_plugins`） | `20261119161000_zero_path_retained_tables_policy_fix.sql` | 1 条 |
| `portal.user_preferences` | ALL = true | `rls_system_only` ALL 仅系统通道（portal 预留表） | `20261119161000_zero_path_retained_tables_policy_fix.sql` | 1 条 |
| `mobile.oa_announcement_reads` | ALL = true | `rls_tenant_isolation` ALL 租户隔离（系统 OR 本租户） | `20261119151000_mobile_oa_announcement_reads_tenant_rls.sql` | 1 条 |
| `pdm.pdm_master_data_refs` | SELECT = true（读侧全放行）+ write 系统通道 | `rls_tenant_isolation` ALL 租户隔离 | `20261119150000_pdm_master_data_refs_rls_strict_forward.sql` | 1 条 |

基准来源：`database/rls_policy_expected.json`（已逐条核对，策略文本与既有迁移一致）。
台账：`docs/ops/allow-all-policy-review-2026-11-24.md` §3 / §3.1。

## 2. 路径裁决：优先追平账本重放既有迁移

**正常订正 = 随 schema 追赶窗口重放既有迁移，不新增链上迁移。**

- 三条迁移已在 11-24 追赶窗口清单内（phase1 段），由 `scripts/migration/prod-window-20261124.sh` 逐版本 `--only` 单版本应用、其余 `--defer`，失败即停。
- 窗口边界与三段顺序见 `docs/ops/prod-schema-window-plan-2026-11-24.md`；目标水位 `20261124160000`。
- 既有迁移回滚齐全：`database/rollback/20261119150000_*.rollback.sql`、`20261119151000_*.rollback.sql`、`20261119161000_*.rollback.sql`。

**兜底路径仅在账本无法重放时启用**（旧版本禁止 in-place 重放；`apply-forward.sh` 锚点偏离即拒；`--apply-deferred` 仅支持单版本补投）。此时用 `scripts/ops/rls-tier2-drift-fix-2026-11-25.sql` 在窗口内直改五表策略。

## 3. 窗口前预检（只读，结果留基线）

```bash
psql -v ON_ERROR_STOP=1 -d topems_prod \
  -f scripts/ops/rls-tier2-precheck-2026-11-25.sql
```

预检输出与判读：

| 读数 | 判读 |
|---|---|
| 账本水位 / 三条迁移 `success` | 若三条已入账但策略仍漂移，说明策略被后续手工改动，先核对历史，不直接走兜底补丁 |
| 五表 RLS / FORCE / 策略集合 | 记录订正前基线；`pdm.pdm_master_data_refs` 预期 2 策略（read true + write 系统通道），其余各 1 条 allow-all |
| `pdm.pdm_master_data_refs` NULL 租户 / 零租户 | **必须 0**；任一 >0 先定性归属或回填，再开严格化（迁移 150000 前置断言会 RAISE 中止） |
| `mobile.oa_announcement_reads` 回填 `unresolved` | **必须 0**；两源（公告 `tenant_id`、`core_users.tenant_id`）都推不出的行须先人工定性，否则迁移 151000 回填断言中止 |
| 两张壳/预留表行数 | 通常 0 行；非 0 行先确认是否系统种子行，收紧后仅系统通道可见 |

> 预检 SQL 为纯只读 SELECT；窗口后重跑一次对照基线。

## 4. 路径 A · 追平账本重放（优先）

### 4.1 前置条件

1. 已按 `prod-schema-window-plan-2026-11-24.md` §3.1 完成备份、基线记录、磁盘与长事务检查。
2. 应用侧系统通道注入在位：`app.rls_system` / `app.tenant_id` GUC 由请求事务注入；`iam.roles` 种子/后台写路径走系统通道。
3. 演练库已用生产带数据 dump 完成 dryrun，三条迁移在演练库入账、预检/核验通过。
4. 确认无裸表名直连绕过应用作用域（写源门禁 `scripts/ci/check-tenant-write-sources.cjs --strict` 口径）。

### 4.2 执行

随追赶窗口三段按序推进，三条迁移均在 phase1：

- `20261119150000`（pdm refs，纯策略层，不改列/数据/索引）
- `20261119151000`（mobile reads，**含补列 `tenant_id` + 回填 + 索引**，前置：列不存在、回填 0 NULL）
- `20261119161000`（roles / core 壳表 / portal 预留表三表策略重建，`to_regclass` 容错缺表）

执行器与命令沿用窗口计划 §5；任一条 `RAISE EXCEPTION` 即停，先看报错文本，不强行跳过。

### 4.3 段间核验

```bash
psql -d topems_prod -f scripts/ops/rls-tier2-drift-fix-2026-11-25.verify.sql
```

期望六条期望策略全部 `PASS`，五表 RLS + FORCE 全开；`pdm.refs` / `mobile.reads` 各 1 条隔离策略，`roles` 2 条，两张壳/预留表各 1 条系统通道策略。

## 5. 路径 B · 兜底补丁直改（账本不可重放时）

### 5.1 适用与边界

- 仅当账本无法追平、需在窗口内直接订正这五表策略时使用；补丁幂等，可重复执行。
- **不改列、不改数据、不补索引**：`mobile.reads` / `pdm.refs` 的 `tenant_id` 列须已由既有迁移就绪；补丁前置断言校验列存在与 0 NULL，缺失或有 NULL 行即中止——此时须先走既有完整迁移，不得在补丁内补数据结构。
- 补丁只做策略层订正：快照既有策略 → DROP 全放行 → 按基准重建 → 后置断言（策略数精确匹配 + RLS/FORCE 全开）。

### 5.2 产物（`scripts/ops/`，已入库 `be4a01333`，本地干跑验证）

| 文件 | 作用 |
|---|---|
| `rls-tier2-drift-fix-2026-11-25.sql` | 订正：前置断言 → 系统通道会话 → 快照 → 清空重建 → 后置断言 |
| `rls-tier2-drift-fix-2026-11-25.rollback.sql` | 急停回滚：按 `archive._rls_policy_snapshot` 本批次（`tier2-drift-fix-20261125`）快照恢复原策略；快照缺失即中止，禁止凭记忆重建 allow-all |
| `rls-tier2-drift-fix-2026-11-25.verify.sql` | 只读核对：策略集合 / cmd / qual 分支 / RLS+FORCE，输出 PASS / DRIFT / MISSING |

### 5.3 执行与回滚

```bash
# 窗口内按事务口径包裹（补丁文件不含 BEGIN/COMMIT）
psql -v ON_ERROR_STOP=1 -d topems_prod \
  -f scripts/ops/rls-tier2-drift-fix-2026-11-25.sql
# 核验
psql -v ON_ERROR_STOP=1 -d topems_prod \
  -f scripts/ops/rls-tier2-drift-fix-2026-11-25.verify.sql
# 急停回滚（仅补丁刚执行、快照在位时）
psql -v ON_ERROR_STOP=1 -d topems_prod \
  -f scripts/ops/rls-tier2-drift-fix-2026-11-25.rollback.sql
```

## 6. 窗口后核验与收尾

1. `verify.sql` 六条期望策略全 `PASS`；人工补查**多余策略**（verify 只校验期望策略在位与口径，不枚举游离策略）：核对各表策略数与 §1 一致。
2. 重跑全量 RLS / 策略对照（基准 `rls_policy_expected.json`）；档 2 与 A 类 `iam.core_tenant_plugins` 结论以追平后快照为准。
3. 五项应用回归：字典/角色读取、公告已读标记写入、插件实例/偏好相关读面、普通模块读写、上传落盘；观察无 `RLS context missing` / 跨租户空集。
4. 记录：账本水位、五表策略集合、预检/核验快照输出、回归结果，回填收口汇总 §7 P1 #1 状态。

## 7. 风险与中止条件

| 风险 | 判据 | 处置 |
|---|---|---|
| 回填不可推知（mobile reads） | 预检 `unresolved > 0` | 停窗：先人工归属/回填，再重放 151000 |
| 隔离表存在 NULL/零租户 | 预检 NULL 或零租户 > 0 | 停窗：先定性归属；严格化前不得放行 |
| 系统通道未注入 | 收紧后种子/后台写被拦、字典读空集 | 先修中间件注入，再开窗；不放宽策略补口子 |
| 既有迁移前置断言不符（策略数/RLS 开关/列形状） | 迁移 `RAISE EXCEPTION` | 停手回报；说明该表历史策略与仓库预期差异，按实际补定向处置，不跳断言 |
| 演练库未带数据恢复 | 数据前置断言拒绝 | 按窗口计划 §4 三件齐（schema + 账本 + 基线数据）重建演练库 |

## 8. 不在本窗口范围

- 不处理档 3 其余 30 条 allow-all（按汇总 P3 #5 另行定性）。
- 不动 `iam.core_tenant_plugins`（基准为 `rls_tenant_isolation`，与 `core.core_tenant_plugins` 壳表不是同一张；A 类去留随 P2 #4 复核）。
- 不新增链上迁移；不删 `archive._rls_policy_snapshot` 快照行。
