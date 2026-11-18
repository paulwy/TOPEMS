# RLS 严格化窗口 Runbook（2026-11-18）

> 适用：把 14 条 RLS 严格化迁移应用到生产 `topems_prod`。
> 依据：`scripts/migration/window-rehearsal.py` 在隔离库的完整预演（14 条应用 → 14 条回滚，全部断言通过）。
> 预演基线：锚点 `20261117235500`，表 1345，账本 704（仅参考），业务行 4740，策略 1039。
> 生产零写入；本清单不 push、不改 `lefthook.yml` / `package.json`。

## 0. 范围与红线

- 窗口版本：14 条（下表）。`20261118124000` **显式 defer**，本窗口不应用、保持 pending。
- 唯一入口：`scripts/migration/apply-forward.sh --prod`。禁止 `sqlx migrate run`、禁止裸 `psql` 写账本。
- 生产执行前不得有任何 DDL/DML；所有只读核查用 `SELECT` / `pg_dump --schema-only`。
- 变更票据：`RESIDUAL-RLS-20261118`。`20261118110000`、`20261118123000`、`20261118140000`
  含破坏性 DML，必须逐版本 `--allow-destructive=<version>`，且票据与文件内 `destructive-ticket` 一致。
  `20261118140000` 的标记票据是 **`TENANT-SELF-20261118`**（`core_tenants` 自指 UPDATE），
  不在 `RESIDUAL-RLS-20261118` 内，因此 `PROD_CHANGE_TICKET` 必须写成逗号列表
  `RESIDUAL-RLS-20261118,TENANT-SELF-20261118`。
  > 事实记录（2026-11-18 窗口）：本条是窗口内第 13 条，实际执行时被 guard 以
  > `L84 ticket=TENANT-SELF-20261118 已列出=RESIDUAL-RLS-20261118` 拒绝后才暴露；
  > 本节是按当天真实结果补齐，不是预判。其他 12 条不受影响。
- 窗口写冻结：执行前停止业务写入（或确认无活动写事务），否则「业务行数不变」判据不可判定。

## 1. 前置检查（全部通过才开窗）

逐项记录实际值到窗口日志；任一失败即不开窗。

| # | 检查 | 命令 | 期望 |
|---|---|---|---|
| 1 | 快照完整性 | `node scripts/ci/check-baseline-integrity.mjs` | exit 0 |
| 2 | 全链路预演 | `python3 scripts/migration/window-rehearsal.py` | `== 全部断言通过 ==`，报告 `/tmp/topems_window_rehearsal.json` |
| 3 | 未应用证据（schema diff + RLS 指纹） | `node scripts/migration/check-pending-ddl.mjs --anchor 20261117235500 --defer 20261118124000,20261118160000 --db "$MIGRATE_URL" --expect-policies 1039` | exit 0；窗口内 PASS 13 / NOOP 1 / FAIL 0，另有 2 条显式 defer（按范围 defer，非无法断言）；全量跑（去掉 `--defer`）实测 PASS 15 / NOOP 1 / FAIL 0 / **SKIP 0**；RLS 指纹 38 表 / 114 断言；策略总数 1039 |
| 3b | 账本参考值（**不作判据**） | `psql ... -tAc "SELECT count(*), max(version) FROM public._sqlx_migrations WHERE success"` | 记录实际值即可；与 `704\|20261117235500` 不一致只登记、不据此开窗/停窗 |
| 4 | 待应用集合 | `apply-forward --prod --only <14 条> --defer 20261118124000`（先加 `--help` 外的只读扫描方式：见 §2 注） | 恰好 14 条 pending + 1 条显式 defer，无清单外 pending |
| 5 | 迁移/回滚文件校验 | `sha256sum`（或 `shasum -a 256`）比对评审记录 | 28 个文件逐一一致 |
| 6 | 代码前置已发布 | 确认生产构建含本批配套代码：`create_tenant`/`onboard_tenant` 写 `tenant_id=id`；auth 系统通道；平台读分支；qms/hrm 显式租户绑定 | 版本号/commit 与评审一致 |
| 7 | 破坏性备份 | 超级用户只读 dump：`finance.core_finance_currencies`、`finance.core_finance_report_line_map`、`public.core_roles`、`pm.project_type_configs`、`mobile.sync_policies`、`core.core_plugins` | 6 份 dump 存在且非空 |
| 8 | 连接与锁基线 | `SELECT count(*) FROM pg_stat_activity WHERE datname='topems_prod'` | 无长事务、无 idle in transaction |
| 9 | 策略基线 | `SELECT count(*) FROM pg_policies` | **1039**（与快照一致；不一致即说明快照后有人改过策略，停） |
| 10 | 服务状态 | `/health` | 200 |
| 11 | 运行二进制 sha256（**硬前置**） | `shasum -a 256 "$(plutil -extract ProgramArguments.0 raw ~/Library/LaunchAgents/com.topems.server.plist)"` | **`676287d355bd00051bf563d2d3a9ac6e4e07fbe22f85174236f430fb228913a5`**；构建自 `281d25e7b`（2026-11-19 独立 target 重建）；不相等**禁止**应用 `20261118160000`（见 §3.0） |

> 注：`apply-forward` 没有 dry-run 参数。第 4 项用同参数执行时，脚本会在任何 DDL 前完成
> 白名单/defer/破坏性校验并打印「待应用 14 条」；若打印条数不是 14，立即 `Ctrl-C`（尚未产生写入）
> 或直接让其以非 0 退出。
>
> **账本仅作参考，不作为应用状态判据。** 方法论上，`success=t` 只证明「该版本被登记过」，
> 不证明「在本库执行过」：生产 `public._sqlx_migrations` 有批量导入行（同一秒落 57/192 行等）。
> 历史 6 条曾被称为「已证伪」的版本，按 schema diff 复核后应拆分：
> **2 条可证伪**（`20261014000000`、`20261028040000`，DROP 目标仍在）、
> **4 条状态不明**（`20261007000012/20261014000020/20261014000050/20261027200000`，
> 目标表已不存在或新增列已存在）。`DROP TABLE IF EXISTS` 的歧义在于：目标缺失既可能是
> 「迁移已执行」，也可能是「目标原本就不存在」，静态结构无法区分两者，所以这 4 条只能记「不明」。
> 判断「是否未应用」一律以第 3 项 schema diff 为准；第 3b 项只登记数值。
>
> 第 3 项的覆盖（锚点后共 16 条 pending，全量实测 0 SKIP）：
> - **12 条 policy-only** 全部由 RLS 指纹覆盖（逐表断言 `relrowsecurity` / `relforcerowsecurity` /
>   策略名集合与 anchor 快照一致），窗口内 11 条 = 38 表 / 114 断言；含 `20261118124000` 后
>   12 条 = 39 表 / 117 断言。
> - `20261118125000` 纯数据种子：用「缺失码数」断言；生产 69/69 已存在且文件是
>   `ON CONFLICT DO NOTHING`，应用为幂等空操作 → **NOOP**（不阻断）。
> - `20261118123000`、`20261118130000` 分别由 3 条、1 条 ADD COLUMN 断言覆盖。
> - `20261118160000` 是 DO 内动态 RENAME（flow 副本 → `_deprecated_<原名>`）：从 ARRAY 名单
>   抽出 11 张表，断言「原名仍在」且「`_deprecated_` 目标未生成」，共 **22 条断言**。
> - 静态确实无法断言的只剩「DO 内表名来自变量拼接、且无 ARRAY 字面量」的迁移；本批没有。
>   **14 条窗口内无一条 SKIP；16 条全量也无一条 SKIP。**

## 2. 执行顺序（14 条）

`apply-forward` 按版本号升序扫描并逐条单事务应用。**`20261118090000` 必须最先**：

1. 它是本批最早版本，升序天然第一；其前置断言只依赖快照，不依赖本批其他迁移。
2. 它把 `public.core_operation_logs` / `public.subscriptions` 的 allow_all 收为
   `rls_tenant_isolation`，并把 `public.navigation_menu` / `pinned_apps` / `todos`
   置为「ENABLE+FORCE、无策略 = 全拒绝」。后续批次的断言与复核以这个结果为基础。
3. `20261118111000` 对 `public.core_operation_logs` 做后置断言（策略必须已严格）；
   若 090000 未先执行，该断言会失败。

| # | 版本 | 关键变更 | 账本记录（仅参考，非判据） | 预期策略总数 | 预期策略数变化（表: 前→后） | 行数变化（非账本） |
|---:|---|---|---:|---:|---|---|
| 1 | `20261118090000` | allow_all 残留收口 + 3 张骨架表置全拒绝 | 705 | 1036 | navigation_menu 1→0；pinned_apps 1→0；todos 1→0 | 0 |
| 2 | `20261118093000` | bi 8 表严格 RLS | 706 | 1044 | bi.analytics_* 8 张 0→1 | 0 |
| 3 | `20261118100000` | qms 3 表严格 RLS | 707 | 1047 | qa_inspection_items/plans、qa_sampling_plans 0→1 | 0 |
| 4 | `20261118103000` | hrm/qms 遗留宽松表收口 | 708 | 1047 | 每表 1→1（策略名换成 `rls_tenant_isolation`） | 0 |
| 5 | `20261118110000` | 平台语料 5 表归一 + 平台读 | 709 | 1046 | mobile.sync_policies 2→1 | 0（仅 UPDATE tenant_id） |
| 6 | `20261118111000` | 登录会话两表 system-only 定型 | 710 | 1046 | — | 0 |
| 7 | `20261118112000` | gis 4 表 allow_all → 严格 | 711 | 1046 | 每表 1→1（策略名换成 `rls_tenant_isolation`） | 0 |
| 8 | `20261118113000` | portal_quick_actions 平台语料 + 平台读 | 712 | 1047 | portal_quick_actions 1→2 | 0 |
| 9 | `20261118120000` | erp 字典 2 表 + rs.formulas 严格 | 713 | 1046 | rs.formulas 2→1 | 0 |
| 10 | `20261118123000` | core_plugins 平台目录化 + 外键 | 714 | 1047 | core.core_plugins 1→2 | 0（回填 0 行） |
| 11 | `20261118125000` | 69 个模块伞码入链 | 715 | 1047 | — | 0（`ON CONFLICT DO NOTHING`） |
| 12 | `20261118130000` | erp.holidays 平台语料 + 平台读 | 716 | 1048 | erp.holidays 1→2 | 0 |
| 13 | `20261118140000` | core_tenants 仅自己 + 系统通道 | 717 | 1047 | core_tenants 2→1 | 0（仅 UPDATE tenant_id=id） |
| 14 | `20261118150000` | 批 0 剩余 3 张活表严格 RLS | 718 | 1050 | core_file_permissions/core_users/monitor_thresholds 0→1 | 0 |

说明：
- 「行数变化 0」是本批的硬判据；本批所有 DML 只改 `tenant_id`，不增删行。
- `20261118110000` 的 UPDATE 上限为 8/48/16/1/1 行，`20261118123000` 回填上限 1000 行；
  `apply-forward --prod` 会在只读事务里预演受影响行数，超限直接拒绝（零写入）。

## 3. 单条应用命令

在能连生产 socket 的主机执行（或按 `apply-forward.sh` 头注释使用 `--ssh-host` 模式）。

### 3.0 开窗前硬前置：运行中的二进制必须已是新件

`20261118160000` 改名后，旧二进制里这 12 张表的**裸名**会从 `flow` 落到 `public`。public 侧已
FORCE RLS，而旧代码的 master 变更日志/审批写路径未带租户 GUC，会直接被策略拒绝；读路径也会
换库。因此顺序必须是「停服 → 换入新二进制 → 应用迁移 → 起服」，不能反序。

先执行下面这段；不通过就**不得**执行 §3 的任何迁移命令：

```bash
BIN="$(plutil -extract ProgramArguments.0 raw "$HOME/Library/LaunchAgents/com.topems.server.plist")"
ACTUAL="$(shasum -a 256 "$BIN" | cut -d' ' -f1)"
# 构建自 commit 281d25e7bd5f704a40ec9ab03107086c043f3053（2026-11-19）
EXPECT=676287d355bd00051bf563d2d3a9ac6e4e07fbe22f85174236f430fb228913a5
if [[ "$ACTUAL" != "$EXPECT" ]]; then
  echo "拒绝开窗：运行中的二进制 sha256=${ACTUAL}，期望 ${EXPECT}" >&2
  echo "请先停服换入新件（/Users/xingzhai/topems-target-281d25e7b-20261119/release/topems-server）再迁移。" >&2
  exit 1
fi
```

> **本次新件构建来源（2026-11-19，只重建未换件）**
> - commit：`281d25e7bd5f704a40ec9ab03107086c043f3053`（`281d25e7b`）
> - 产物：`/Users/xingzhai/topems-target-281d25e7b-20261119/release/topems-server`
> - 构建：`SQLX_OFFLINE=true CARGO_PROFILE_RELEASE_STRIP=none cargo build --release -p topems-server --bin topems-server --offline`
> - 结果：耗时 10m01s，Mach-O arm64，264,579,424 B，sha256 `676287d355bd00051bf563d2d3a9ac6e4e07fbe22f85174236f430fb228913a5`
> - 换件后必须重新执行上面的断言；运行中二进制 sha 不等于 `EXPECT` 即视为「件比 HEAD 旧」，禁止开窗。

`SEARCH_PATH` 不需要同步调整：plist 当前是 `flow, mobile, rs, erp, public, iam, shared`。
改名把这 12 个名字从 `flow` 移除后，裸名会自然落到后面的 `public`；而 `flow` 仍承载
`core_comments` / `core_favorites` / `notifications` / `workflows` 等 flow-only 业务表，
删除或后移 `flow` 会改变这些裸名的解析落点，反而引入新风险。

该断言同样适用于 `20261118160000` 的补投命令
（`apply-forward.sh --prod --apply-deferred 20261118160000 ...`，见执行记录 §7）：
二进制不匹配时不得执行补投。

```bash
export PROD_CHANGE_TICKET=RESIDUAL-RLS-20261118,TENANT-SELF-20261118
cd /path/to/TOPEMS

V=20261118090000
ALL="20261118090000,20261118093000,20261118100000,20261118103000,20261118110000,20261118111000,20261118112000,20261118113000,20261118120000,20261118123000,20261118125000,20261118130000,20261118140000,20261118150000"
DEFER="$ALL,20261118124000"   # 每条执行时把其余版本全部 defer
ONLY_DEFER="$(python3 - "$V" "$DEFER" <<'PY'
import sys
v, s = sys.argv[1], sys.argv[2].split(",")
print(",".join(x for x in s if x and x != v))
PY
)"

bash scripts/migration/apply-forward.sh --prod --db topems_prod \
  --anchor 20261117235500 --only "$V" --defer "$ONLY_DEFER"
```

以下三条额外加逐版本破坏性批准（`PROD_CHANGE_TICKET` 用上面的逗号列表，三条都能通过票据比对）：

```bash
# 20261118110000
bash scripts/migration/apply-forward.sh --prod --db topems_prod \
  --anchor 20261117235500 --only 20261118110000 --defer "$(...)" \
  --allow-destructive=20261118110000

# 20261118123000
bash scripts/migration/apply-forward.sh --prod --db topems_prod \
  --anchor 20261117235500 --only 20261118123000 --defer "$(...)" \
  --allow-destructive=20261118123000

# 20261118140000（ticket=TENANT-SELF-20261118；上限 10 行）
bash scripts/migration/apply-forward.sh --prod --db topems_prod \
  --anchor 20261117235500 --only 20261118140000 --defer "$(...)" \
  --allow-destructive=20261118140000
```

每条执行后立刻跑 §4 的核验，再进入下一条。

## 4. 每条执行后的即时核验

```sql
-- 1) 账本记录（仅登记数值；不等于上表「账本记录」不构成中止，见 §5）
SELECT count(*) AS ledger_rows, max(version) AS max_version
  FROM public._sqlx_migrations WHERE success;

-- 2) 本条账本状态（仅记录；应用是否成功以 3)/4) 与 §4 抽查为准）
SELECT version, success FROM public._sqlx_migrations WHERE version = :version;

-- 3) 策略总数等于上表「预期策略总数」
SELECT count(*) AS policies FROM pg_policies;

-- 4) 表数不变
SELECT count(*) AS tables FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema');

-- 5) 逐表行数：与窗口前基线比对，只允许账本表 +1
--    生产活跃写已冻结的前提下，任何非账本表行数变化 = 中止。
```

针对性抽查（与预演逐条记录一致）：

```sql
-- 090000：三张骨架表应无策略；两张日志/订阅表策略名为 rls_tenant_isolation
SELECT tablename, policyname FROM pg_policies
 WHERE schemaname='public'
   AND tablename IN ('navigation_menu','pinned_apps','todos','core_operation_logs','subscriptions')
 ORDER BY 1,2;

-- 110000：平台语料 NULL 行应为 0，且 rls_platform_read 存在
SELECT 'finance.core_finance_currencies' t, count(*) FILTER (WHERE tenant_id IS NULL) nulls
  FROM finance.core_finance_currencies
UNION ALL SELECT 'finance.core_finance_report_line_map', count(*) FILTER (WHERE tenant_id IS NULL)
  FROM finance.core_finance_report_line_map
UNION ALL SELECT 'public.core_roles', count(*) FILTER (WHERE tenant_id IS NULL) FROM public.core_roles
UNION ALL SELECT 'pm.project_type_configs', count(*) FILTER (WHERE tenant_id IS NULL) FROM pm.project_type_configs
UNION ALL SELECT 'mobile.sync_policies', count(*) FILTER (WHERE tenant_id IS NULL) FROM mobile.sync_policies;

-- 140000：core_tenants 1 行且 tenant_id = id
SELECT count(*) FILTER (WHERE tenant_id = id) AS self_rows, count(*) AS total FROM public.core_tenants;

-- 123000：新增列存在
SELECT column_name FROM information_schema.columns
 WHERE table_schema='core' AND table_name='core_plugins'
   AND column_name IN ('owner_tenant_id','last_owner_tenant_id','unpublished_at')
 ORDER BY 1;
```

**窗口后总账断言**（14 条全部应用完后执行）：

```bash
node scripts/migration/check-pending-ddl.mjs --post --db "$MIGRATE_URL" --expect-policies 1050
```

期望：策略总数 **1050**（锚点 1039 + 本批净增 11）。窗口前的判据是「效果尚未出现」，
窗口后是「效果已经出现」，两者不能共用同一份期望，所以 `--post` 只做总账断言，
不重跑逐版本判定；逐版本结果已在窗口前固化。

## 5. 逐条中止判据

任一命中，**立即停止后续迁移**，不要继续下一条：

**开窗前硬前置（先于以下任一条）**：§3.0 的二进制 sha256 断言不通过（期望
`676287d355bd00051bf563d2d3a9ac6e4e07fbe22f85174236f430fb228913a5`，构建自
`281d25e7b`），禁止应用 `20261118160000`；此时连第一条迁移都不要执行。

1. `apply-forward` 非 0 退出（失败/守卫拒绝/白名单外 pending）。单事务保证无半应用。
2. 结构核验不符：应用前 `check-pending-ddl.mjs` 对 `20261118123000` / `20261118130000`
   的目标列已报 present，或 11 条 policy-only 的 RLS 指纹报 FAIL
   （`relforcerowsecurity` 已为 true / 策略集合已与 anchor 不同，说明效果已存在，可能重复应用）；
   或应用后策略/列与上表预期不符。
   **账本行数、`success` 只登记不作为中止判据**（账本含导入行，见 §1 注）。
3. 策略总数不是「上表预期策略总数」。
4. 表数不是 1345（`information_schema.tables` 口径；等价于 1344 张 `relkind in ('r','p')`
   表 + 1 张视图，两者不可混用）。
5. 任何非账本表行数变化（冻结窗口下预期为 0）。
6. 出现第 15 条 pending（应为 `20261118124000` 且只应被 defer）。
7. 破坏性预演行数超过文件内 `destructive-max-rows`。
8. 锁等待超过约定阈值或业务监控出现 5xx 尖峰。

## 6. 单条回滚命令

中止某条后，回滚**最近成功应用的那一条**（逆序，一次一条）：

```bash
V=20261118090000   # 换成要回滚的版本
RB="$(ls database/rollback/${V}_*.rollback.sql)"
psql "$TOPEMS_PROD_DSN" -X -v ON_ERROR_STOP=1 -f "$RB"
```

回滚脚本末尾会 `DELETE FROM public._sqlx_migrations WHERE version = <V>;`（幂等）。
执行后核验：

```sql
SELECT count(*) FROM public._sqlx_migrations WHERE version = :version;  -- 必须 0
SELECT count(*) FROM public._sqlx_migrations WHERE success;             -- 应回到该条之前的行数
SELECT count(*) FROM pg_policies;                                       -- 应回到该条之前的策略数
```

若回滚脚本本身失败：停止，保持服务只读/停写，按 §9 的恢复路径处理，不要手工补账本。

## 7. 整批回滚命令

仅在需要撤销整批时使用。必须逆序、逐条、`ON_ERROR_STOP=1`：

```bash
VERSIONS=(20261118090000 20261118093000 20261118100000 20261118103000 \
          20261118110000 20261118111000 20261118112000 20261118113000 \
          20261118120000 20261118123000 20261118125000 20261118130000 \
          20261118140000 20261118150000)

for ((i=${#VERSIONS[@]}-1; i>=0; i--)); do
  V="${VERSIONS[$i]}"
  RB="$(ls database/rollback/${V}_*.rollback.sql)"
  echo "== rollback $V"
  psql "$TOPEMS_PROD_DSN" -X -v ON_ERROR_STOP=1 -f "$RB" || { echo "FAILED $V"; exit 1; }
done
```

批回滚后必须满足（预演实测值）：

| 判据 | 期望 |
|---|---|
| 账本行数（仅参考） | **704**（14 条登记行全部删除） |
| `max(version)` | `20261117235500` |
| 策略总数 | **1039** |
| 表数 | 1345 |
| 业务行数 | 4740 |
| 列结构指纹 | 与窗口前完全一致 |
| 策略定义差异 | 仅 `public.core_tenants.rls_system_only`、`rs.formulas.rls_tenant_isolation`（`WITH CHECK` 省略 vs 显式，`FOR ALL` 语义等价） |
| 回滚耗时参考 | 14 条合计约 0.5s（预演实测 0.48s） |

## 8. 账本记录 SQL（窗口前 / 窗口后 / 回滚后；**仅作记录，不作判据**）

```sql
-- 水位与行数
SELECT count(*) AS rows, max(version) AS max_version, min(version) AS min_version
  FROM public._sqlx_migrations WHERE success;

-- 14 条窗口版本的登记情况（窗口后应为 14 行；回滚后应为 0 行）
SELECT version, success, installed_on
  FROM public._sqlx_migrations
 WHERE version BETWEEN 20261118090000 AND 20261118150000
 ORDER BY version;

-- defer 版本必须保持未应用
SELECT count(*) FROM public._sqlx_migrations WHERE version = 20261118124000;  -- 0

-- 账本与磁盘迁移不一致的残留检查（排除显式 defer）
-- （在仓库侧运行）
-- ls database/migrations | cut 出 14 位版本，与 SELECT version 结果比对

-- 策略与表基线
SELECT count(*) AS policies FROM pg_policies;
SELECT count(*) AS tables FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema');
```

判定（参考值；应用成败以策略/列/行数结构核验为准，不以账本为准）：
- 应用完成：账本参考 **718**，`max=20261118150000`，`124000` 为 0；结构上策略 1050、表 1345。
- 整批回滚完成：账本参考 **704**，`max=20261117235500`，14 行消失；结构上策略 1039、表 1345。
- 账本与结构不一致：按结构判定，并在窗口日志登记差异版本。

## 9. 恢复服务前的验证点

全部满足才恢复写入与流量：

1. 策略 1050；表 1345；§4 逐表策略抽查全部符合。账本 718 / 14 条 success 仅登记参考（`20261118124000` 仍 pending）。
2. 业务行数与窗口前逐表一致（冻结期间无写入）；`20261118110000` 只改 `tenant_id`，
   `20261118123000` 回填 0 行。
3. `core.core_plugins` 三个新列存在；`iam.core_tenant_plugins` 外键存在且无孤儿。
4. `core_tenants` 的 `tenant_id` 全部等于 `id`（140000）。
5. 运行时冒烟（用最小权限业务角色，验证 RLS 实际生效）：
   - 登录 / 刷新 token（111000 系统通道）；
   - 租户 A 读不到租户 B 的订单/BI/QMS/GIS 行（各抽 1 张表）；
   - 租户 A 能读平台语料（币种、报表映射、角色模板、项目类型、快捷入口、节假日、插件目录）；
   - `GET /dsh/copilot/modules/{module}/faq` 同时返回本租户自有行与平台全零行；
   - 平台管理员租户目录走系统通道可见（140000 配套代码）。
6. `/health` 200；关键接口 5xx 与窗口前基线持平。
7. 记录实际账本行数、策略数、逐条耗时到窗口日志；与 §2 表不一致时按 §5 处理。

## 10. 已知等价差异与脚本断言

预演脚本把以下两条登记为「已知等价差异」，其余任何策略定义/集合差异都会使预演非 0 退出：

- `public.core_tenants.rls_system_only`
- `rs.formulas.rls_tenant_isolation`

差异形态：回滚前 `WITH CHECK` 省略（`FOR ALL` 默认取 `USING`），回滚后显式写出同一表达式。
窗口当天若用其他工具比对指纹，需同样按语义处理，否则会误报不可逆。

预演脚本内的硬断言（不依赖人工读数）：

- 每条应用后账本恰好 +1、表数不变、业务行数不变；
- 每个 rollback 后 `SELECT count(*) FROM public._sqlx_migrations WHERE version = <v>` 必须为 0；
- 整批回滚后账本 704、策略 1039、业务行 4740、表 1345、列指纹一致、策略集合一致。

## 11. 后续事项（不在本窗口）

- `20261118124000`（`iam.core_tenant_plugins` RLS 严格化）保持 pending；
  需要补投时走 `apply-forward.sh --apply-deferred 20261118124000 --ticket <ticket>`，单独验证。
- `database/migrations/20261024000015_copilot_faq_table.sql` 的宽松策略与生产严格版漂移：
  另开前向迁移收紧（不改历史迁移），是否进本窗口见评审结论；本窗口不包含。
- 快照资产、`anchors.json`、`migrations_at_anchor.json` 仍未提交；
  `lefthook.yml`、`package.json` 仍未提交；均等确认，不 push。
