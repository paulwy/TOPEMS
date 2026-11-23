# 生产窗口就绪包：R5 归档三批 + IAM 严格 RLS + W7-B/W2-C（2026-11-21 重算版）

> 文档性质：**只做窗口前准备，不应用任何迁移、不写生产、不开窗、不 push**。
> 目标：开窗时照文档执行，不需要现场判断。
> 重算基线：`73b0c221b`（2026-11-21）；准备期间远端前进到 `a3a8ddbd4`，该提交仅归档 2026-11-14 审计/RLS 窗口记录，无迁移或代码变化，不影响本包清单。2026-11-19 的账本、表数、RLS/策略数已失效，仅作历史对照；生产侧数值必须在开窗前用 `topems_drift` 只读重测（§1.5、§4.8）。
> 仓库侧证据：W1–W5 五个迁移文件的 SHA-256 与 11-19 指纹一致，回滚文件亦未改写；`20261119233000` 之后新增 36 条迁移；W7-B `20261118110000`、P1 首批 `20261118100000`、W2-C `20261121220000` 均未进生产。
> 只读预检连接：`topems_drift`（非特权、非 superuser、无 BYPASSRLS）。
> 配套可执行预检：`docs/database/window-preflight-2026-11-19.sql`（132 张清单仍适用，行数需重跑）。
> **2026-11-22 增补**：新增 **W9 公司上下文波次**（`20261121235940` + `20261122090000`），代码与迁移必须同窗口，详见 §0、§2.4、§3、§4.12。§2.3 的「36 条」等中间读数已失效，按 §2.3 的失效标注执行。

---

## 0. 摘要

- **W1–W5 不变**：五个迁移文件与回滚文件字节未变，仍按 2026-11-19 的清单执行：

| 波 | 版本 | 主题 | 归档表数 | destructive 标记 | 备注 |
|---|---|---|---:|---:|---|
| W1 | `20261119160000` | 零路径遗留表归档 | 16 | 8 | 建 archive schema + 6 张簿记表 |
| W2 | `20261119180000` | 历史 schema 副本归档 | 108 | 10 | 入向 FK 19 条全在批次内 |
| W3 | `20261119200000` | 遗留租户表解依赖归档 | 8 | 4 | 建第 7 张簿记表；插件 FK 重指；函数语义改写 |
| W4 | `20261119233000` | IAM 遗留权限码收敛 | 0 | 2（DELETE） | 44 条遗留码 + 其授权清理；补 2 条字典码；ticket `IAM-PERM-20261119` |
| W5 | `20261119140000` | `iam.core_tenant_plugins` 严格 RLS | 0 | 0 | `20261118124000` 的前向承载；dev/prod 均未落；ticket `RESIDUAL-RLS-20261118`；无闸门 GUC |

- **新增窗口项 4 条**（此前不在本包内）：

| 波 | 版本 | 主题 | 对象规模 | 同窗口二进制 | 备注 |
|---|---|---|---:|---|---|
| W6（W7-B） | `20261118110000` | 平台语料 5 表严格 RLS + 平台读 | 5 表 / 83 行（其中 74 行归一）/ 9 策略 | finance、unified-core、mobile | NULL→全零哨兵；`mobile.sync_policies` 是唯一“租户可见范围净减少” |
| P1-1 | `20261118100000` | P1 首批 QMS 3 表严格 RLS | 3 表 / 0 行 / 3 策略 | qms | DEC-13；不归一数据，只补 RLS/FORCE/策略/索引 |
| W8（W2-C） | `20261121220000` | `erp.opening_balances` 迁入 finance | 1 表 `SET SCHEMA` | finance | 必须排在 erp canonical `20261121100000` 之后；只移表，不复制数据 |
| W9 | `20261121235940` + `20261122090000` | 合并报表公司维度 RLS + 默认公司回填 | 8 表 / 32 策略 / 6 新列 / 1 列+1 唯一索引 | erp、shared-auth、shared-db | **代码与迁移必须同窗口**；未接公司上下文的旧二进制读这 8 张表返回 0 行；回滚 B→A，详见 §4.12 |
| W10 | `20261122150000` | `public` 审批/流程 4 表租户索引与策略归一 | 4 表 / 4 索引 / 4 策略（`approvals`、`approval_records`、`core_workflow_instances`、`core_workflow_tasks`） | 无（不依赖代码） | **独立成波，不并入 W9**：W9 是 ERP 公司维度且代码强耦合；本波四表均 0 行、无写入路径变更、策略已在生产生效，可独立执行与回滚，详见 §2.5 |
| W12 | `20261123090000` + `20261123100000` + `20261123110000` + `20261123120000` | 集团母版 + 公司差异 4 表（`core_tenant_modules`、`core_inter_module_sync`、`monitor_settings`、`system_settings`） | 4 表 / 4 列 / 4 条策略组（4/4/5/5）/ 触发器与函数 | erp、monitor | **严格串行 A1→A2→B1→B2**，全部排在 W1 之前；已在 main，待窗口执行；B2 含 `/system/company-settings` 公司作用域 API；详见执行清单 §5B |
| W13 | `20261123140000` + `20261123141000` + `20261123142000`（第一段） | 订单公司归属补列 + 搜索 v2 建表与双写（第一段） | 2 表补列 + 1 张投影表 / 2 条策略 | erp、search | **第一段已在 main，待窗口执行**；回填/切换/下线属第二段，待 CSV 业务签字、母公司待指定清单清零、例外行签字；CSV 由我方 `--draft` 起草，业务只复核兜底与例外行；四条规则已回执（1A / 2B / 3B / 4A），优先级既定；详见执行清单 §5C、§5D |

> 回执状态：业务已于 2026-11-23 完成回执（业务已确认，明细见 `rls-business-confirmation-2026-11-23.md` §8）；仍未闭合：CSV 业务复核签字、母公司待指定清单清零、例外行签字（规则优先级已既定）。

> 版本号口径：`20261123130000` 已被 W5-B215 占用；订单补列为 `140000`/`141000`，v2 建表为 `142000`；切换与下线待建时另行取号，不得复用 `140000`–`142000`。

- **新增候选 36 条（读数已失效）**：`20261119233000` 之后新增 26 条 `*_schema_canonical.sql`、6 条 `*_drop_resurrected_dead_tables.sql`、`20261120120000`（AI 重复索引）、`20261120090000`（MES typmod）、`20261120100000`（菜单/CRM 权限别名）、`20261121220000`（W2-C）。**2026-11-22 复核实为 42 条**，差额 6 条见 §2.3 失效标注；36 条仅为 11-21 中间读数。这些是否已在生产，必须用现场账本确认，不能仅凭版本号假定。
- **硬依赖**：
  - **W3 ← W2** 仍成立；但 `iam.core_tenants` 入向 FK 的 `8/1/4→1/1/4` 是 11-19 实测，必须在开窗前重测（§1.5）。新增 36 条迁移里没有新增指向 `iam.core_tenants` 的 FK。
  - **W8 ← erp canonical**：`20261121100000_erp_schema_canonical.sql` 会 `CREATE TABLE IF NOT EXISTS erp.opening_balances`，随后 `20261121220000` 才把它移入 finance；若先跑 W8，再跑 erp canonical 会重新造出 `erp.opening_balances`，形成双表。必须按版本顺序先 canonical、后 W8。
  - **W6 / P1-1 ← canonical**：pm/mobile/qms 的 canonical 会重建同名 RLS 策略；W6、P1-1 必须排在对应 canonical 之后，否则严格策略会被覆盖。
  - **W1–W5 与 W6/P1-1/W8 无表集合交集**；W6 触碰 `public.core_roles`、finance 两表、`pm.project_type_configs`、`mobile.sync_policies`，均不在 132 张归档目标内。
  - **W9 ← erp/hrm canonical**：8 张合并报表表由 `20261121100000` 建表并带租户策略，`hrm.companies` 的 `(tenant_id,id)` 唯一键由 `20261120235900` 提供；两者 `success=t` 后才可跑 W9-A。W9 与 W1–W8/W6/P1-1 无表交集，可与 W8 同窗；但同窗发布必须包含 `erp`、`shared-auth`、`shared-db`（其余使用公司上下文的服务建议一并重编）。W9 与 `20261120090000`/`20261122100000` 的数量列语义无关（MES 对象），只需按版本号自然排序。
  - **W12 ← W9 公司维度**：W12 的母版/公司差异与平台行复用 `erp` 公司维度函数和 `hrm.companies`；A1→A2→B1→B2 严格串行，B1/B2 必须与 erp/monitor 同窗口代码。W12 不依赖 W1–W11 的表，但排在其前。
  - **W13 ← W12 + 业务前置**：W13 第一段（`140000`/`141000`/`142000`）依赖 W12 写入端公司上下文。11 张表 8 项已于 2026-11-23 回执（Q-G4 / Q-G5 不再阻断 W13 第二段的可见性验收）。第二段（回填/切换/下线）仍需 CSV 业务签字、母公司待指定清单清零、例外行签字；CSV 由我方 `--draft` 起草，母公司由租户根公司自动解析；未补齐不得开跑（执行清单 §5C、§5D；业务确认材料 §5.1–§5.3、§8）。
- **建议顺序**：**W12（A1→A2→B1→B2）→ W13 第一段（140000→141000→142000）** → W1 → W2 → W3 → W4 → canonical 26 条 + 6 条 drop（按版本号）→ W8（W2-C）→ **W9（A→B）** → W5 → W6（W7-B）→ P1-1。（W13 第二段不排入本窗口，待 CSV 签字、母公司待指定清单清零、例外行签字。）
- **P1-1 可与 W6 同窗口，但不合并成一个迁移**：3 张 QMS 表与 5 张平台表无交集，各自单事务、可独立回滚；前提是同窗口发布包含 `finance`、`unified-core`、`mobile`、`qms` 四个二进制。若发布编排只能带 W6 的三件套，则 P1-1 拆到下一窗口，W6 优先。
- **回滚逆序**：P1-1 → W6 → W5 → **W9（B→A）** → W8 → W4 → W3 → W2 → W1 → **W13 第一段（142000→141000→140000）** → **W12（B2→B1→A2→A1）**；canonical 26 条与代码同窗口、无独立回滚文件，不纳入逆序演练。W13 回填不可逆，回滚只退结构不退数据。
- **终态不再给单一数字**：11-19 的「账本 721→726、表 1344→1351、RLS 959→914、策略 1050→1004」已失效。新增 42 条迁移（11-22 复核；§2.3 的 36 条为中间读数）与四条窗口项都会改变终态，必须以开窗前 preflight 的现场值为起点逐波记录（§4.7）。
- **不纳入**：29 条 prod-only 版本、9 条早间计划版本（`20261119010000` 等）、孤儿 `20261103000005`。W7-B 与 QMS 首批虽版本号低于旧 prod max，但明确未进生产，不能靠版本差集发现，必须按本表纳入。详见 §7。

---

## 1. 事实基线（2026-11-19 实测；当前有效口径见 §1.5）

> **1.1–1.4 是 2026-11-19 的旧读数，已失效，仅作历史对照，不得作为开窗依据。** 当前仓库侧重算见 §1.5；生产侧必须在开窗前用 `topems_drift` 重新取证。

### 1.1 账本与差集

| 项 | dev | prod |
|---|---|---|
| 账本行 / success / failed | 698 / 698 / 0 | 721 / 721 / 0 |
| `max(version)` | `20261119233000` | `20261119000002` |
| 五条窗口版本 | 已应用（success） | 0 行（未应用） |

差集方向为 dev → prod。dev-only 的 6 条中只有 5 条有迁移文件且可执行；`20261103000005` 是历史孤儿账本行（无对应文件），不作为窗口项。

### 1.2 dev 落地后读数（用于推定 prod 终态）

| 项 | 读数 |
|---|---|
| archive 表 | 139（132 归档 + 7 簿记） |
| 非 archive 业务表 | 1257 |
| 全局表（`relkind IN ('r','p')`） | 1396 |
| RLS 表 / 策略 | 470 / 524 |
| 权限码 / 角色授权（`public.core_permissions` / `core_role_permissions`） | 350 / 4507 |
| `finance.bootstrap_defaults()` | 仅引用 `public.core_tenants` 与 `finance.core_finance_accounts`，不含 iam/flow/`iam.core_tenant_users` |
| `iam.core_tenant_plugins` 外键 | `REFERENCES core_tenants(id)`（解析到 `public.core_tenants`） |
| `iam.core_tenant_plugins` RLS / 策略（W5 落地后） | 0 行 / RLS+FORCE 开启 / 1 条 `rls_tenant_isolation`（严格 B） |

### 1.3 prod 只读实测（`topems_drift`）

| 项 | 读数 |
|---|---|
| archive schema | 不存在 |
| 全局表 / RLS / 策略 | 1344 / 959 / 1050 |
| W1 的 16 张 | 16/16 在位；RLS 16 / 策略 16；入向 FK 0；依赖视图 0 |
| W2 的 108 张 | 108/108 在位；RLS 30 / 策略 31；入向 FK 19（全部批次内）；依赖视图 0 |
| W3 的 8 张（3 目标 + `iam.core_user_roles` + 4 张 `flow._deprecated_core_tenant_*`） | 8/8 在位；RLS 0 / 策略 0；入向 FK 13；视图 0；触发器 0 |
| W3 入向 FK 构成 | 7（来自 W2 的 108 批表）+ 4（4 张 flow 引用方 → `flow.core_tenants`）+ 1（`iam.core_user_roles` → `iam.core_users`）+ 1（`iam.core_tenant_plugins` → `iam.core_tenants`） |
| W3 分目标入向 FK（当前） | `iam.core_tenants` 8 / `iam.core_users` 1 / `flow.core_tenants` 4 |
| W3 分目标入向 FK（W2 后） | `iam.core_tenants` 1 / `iam.core_users` 1 / `flow.core_tenants` 4 |
| `iam.core_tenant_plugins` FK | `core_tenant_plugins_tenant_id_fkey → iam.core_tenants(id) ON DELETE CASCADE` |
| `iam.core_tenant_plugins` RLS / 策略（W5 前） | 0 行 / RLS 关闭（`f/f`）/ 0 策略；`tenant_id` NOT NULL，零/NULL 租户 0 行 |
| `finance.bootstrap_defaults()` | 同时引用 `iam.core_tenants` / `flow.core_tenants` / `iam.core_tenant_users` / `public.core_tenants` |
| 精确行数 | `topems_drift` 对 132 张表均无 SELECT 权限，须 DBA 特权只读会话（同一 preflight 第 7 节自动转 READABLE） |
| 权限码 / 角色授权 | 1157 / 2917；44 条 W4 遗留码 = 0、相关授权 = 0；`iam:dictionaries_read` / `iam:dictionaries_update` 均不存在 |

### 1.4 迁移脚本闸门（实测）

- `apply-forward.sh` 在 DDL 前对每条破坏性语句做行数预演，超过 `destructive-max-rows`（`DROP TABLE` 必须为 0）即拒绝；票据不能绕过行数闸门。
- **预演按版本推进**：版本 N 的预演只在其前面所有 pending 版本都已应用之后执行，因此预演里看到的是「N 之前的迁移全部生效」的真实基线（例如 `20261118160000` 改名后的 `flow._deprecated_*`），而不是 anchor 的旧状态。
- **中途失败语义**：任一版本预演被拒（行数超限 / 不可回滚语句 / 前置断言失败）即停在该版本——该版本不应用，已应用的前序版本保持已落账；脚本输出「已应用清单 + 未应用清单 + 逆序回滚入口」，退出码 1。不采用「先整体预演一遍再应用」：整体预演只能看到 anchor 状态，会复现 `20261119200000` 的前置断言失败。
- 预演**不是只读事务**：它必须真实执行 DML 再 `ROLLBACK`，因此脚本拒绝会逃出事务或不可回滚的语句（`COMMIT`/`ROLLBACK`、`nextval`、`CREATE/DROP INDEX CONCURRENTLY`、`VACUUM`、`ALTER SYSTEM`、`CREATE/DROP DATABASE`），由预演生成器 fail-closed 中止；临时表的 `ON COMMIT` 子句（`DROP`/`PRESERVE ROWS`/`DELETE ROWS`）不结束事务，检测前先剔除。
- 预演会话自行注入 `SET app.rls_system='on'` 与迁移文件声明的全部 `app.*_gate`：调用方不传 `PGOPTIONS` 也能看到 FORCE RLS 后的真实行数、通过闸门断言。prod 与 drill 两种模式都执行预演；drill 对文件自带 `destructive-ticket` 自动批准（隔离库），无标记的破坏性语句只提示、不阻断演练。
- apply 段在 prod 仍不自行注入 GUC（`--drill-gate-guc-auto` 仅限演练）；开窗执行时 `PGOPTIONS` 必须自己带上 `-c app.rls_system=on` 与对应闸门 GUC。
- `--apply-deferred` 只接受单个 14 位版本，必须同时带 `--ticket`，不可与 `--anchor/--only/--defer` 组合。
- `--allow-destructive=<version>` 必须同时设置 `PROD_CHANGE_TICKET`，且票据与文件内 `destructive-ticket` 一致。
- prod 模式缺 `node` 时直接 DENIED，不会降级放行。

### 1.5 2026-11-21 仓库侧重算（当前有效口径）

| 项 | 结论 |
|---|---|
| W1–W5 文件 | 5 条迁移存在且 SHA-256 与 11-19 指纹一致；5 条回滚文件存在且 SHA-256 亦一致；内容未被远端 81 条提交改写 |
| W1/W2/W3 归档目标 | 仍为 16 / 108 / 8，合计 132；文件未变，数量不变 |
| 新增迁移 | `20261119233000` 之后 36 条（11-22 复核为 42 条，见 §2.3 失效标注）：26 条 canonical、6 条 drop dead、AI 重复索引 1、MES typmod 1、菜单/CRM 权限别名 1、W2-C 1 |
| 旧版本但未落生产 | W7-B `20261118110000`、P1 首批 `20261118100000`；版本号低于旧 prod max，**账本差集扫不到**，只能按 manifest note 与本包纳入 |
| 同窗口二进制 | finance（W6 + W8）、unified-core（W6）、mobile（W6）、qms（P1-1）、**erp + shared-auth + shared-db（W9）** |
| 仓库侧 FK 影响 | 新增 36 条（11-22 的 42 条亦然）中无 `REFERENCES iam.core_tenants`；6 条 drop dead 的目标与 W1/W2/W3 的 132 张无交集（脚本比对）；W9-A 的 4 条 FK 指向 `hrm.companies`，不在 132 张归档目标内 |
| W3 前置 | `iam.core_tenants` 8 / `iam.core_users` 1 / `flow.core_tenants` 4 是 11-19 实测，必须现场重测；W2 后 `1/1/4` 的推算也只在现场仍为 `8/1/4` 时成立 |
| C16 | 132 张清单仍适用；`rows=0` 是 11-19 结论，必须在窗口前 24h 与开窗前 30min 重跑 |

**已失效、不得沿用的旧数字**：prod 账本 721 行 / `max=20261119000002`；dev 账本 698 行 / `max=20261119233000`；全局表 1344、RLS 959、策略 1050；权限码 1157 / 角色授权 2917；archive 0；W3 FK `8/1/4` 与 W2 后 `1/1/4`；132 张 `rows=0`；终态 726 / 1351 / 914 / 1004；dev 落地读数 470 / 524 / 139 / 1257 / 1396；§2.3「新增候选 36 条」（2026-11-22 复核为 42 条）。

---

## 2. 迁移清单（逐条指纹）

复算命令：

```bash
cd /Users/xingzhai/TOPEMS
for v in 20261119160000_drop_zero_path_legacy_tables \
         20261119180000_archive_legacy_schema_copies \
         20261119200000_unblock_and_archive_legacy_tenant_tables \
         20261119233000_iam_legacy_permission_convergence \
         20261119140000_iam_core_tenant_plugins_rls_strict_forward; do
  shasum -a 384 database/migrations/$v.sql
  shasum -a 256 database/migrations/$v.sql
  shasum -a 256 database/rollback/$v.rollback.sql
done
```

账本 checksum 是**文件字节的 SHA-384**。

| 版本 | 主题 | 表数 | sha384（账本） | sha256（迁移） | commit |
|---|---|---:|---|---|---|
| `20261119160000` | 零路径遗留表归档 | 16 | `8a58bed713e99b511b5a2a491119c268066c860ebb266250fe4a83d0005d80f82214074cdcd34278e74491350f508c6c` | `cc30df5798befe482298f37e8e3dcb1d6c38b3460a100ae065cf216c53ccd64c` | `e5d2e12ace713bc9a5c64298224a807af511aae5` |
| `20261119180000` | 历史 schema 副本归档 | 108 | `9b47af6d2c376bbf0921b7be76a3c0e01c8bb352eb8e739ea59604f15e803cdff82b6e9d1c12165f6b8909ca18013755` | `d43420625578900bfea3f5368ce10ed24300a8bcfdd6937b19cbd5d5d4a90e52` | `137cca4b8cdc6aa3efeca7870c2c31d5d61468a1` |
| `20261119200000` | 遗留租户表解依赖归档 | 8 | `c130918357fab2c65251d4e32601e6329a88a9647fb4838af3b58f74b20a634a39fb920c9d6c2979acc10f35ca0f2ea6` | `cb71c4922ed2cc10114469a54da901c17b9e960c1a6f34da86d481d507160910` | `364eded6f091a92668dff44cc3f12ebc3faba87b` |
| `20261119233000` | IAM 遗留权限码收敛 | 0 | `13d613136fb107739bac3a87c013b1d3dc9843795ad466a5e2a92d60c8faae92fdffe5ea6eceb590cdd9193f8a8534b7` | `a041ea01d7ee5cf4309fc2d83eb6958e9ca4db8281f11f49b74c936283210952` | `414155a1cec5f3dc2e83a030163939ed8b632f21`（原始）；标记块见 §2.2 |
| `20261119140000` | `iam.core_tenant_plugins` 严格 RLS | 0 | `4f8095503d8e233f1673a228a4758547b1d653c1c42c4ce04c33da2f21f60a233d359a34689aba0b3f1549c2e075037d` | `b6abb791a4e7a8566cbde485aa466c1617cc2996c55e8a7d4763d9f915a8f709` | `bb4b9ccf3e3f31848cc7859f57d40221ba8fe081` |

| 版本 | 回滚文件 | sha256 | destructive 标记数 |
|---|---|---|---:|
| `20261119160000` | `database/rollback/20261119160000_drop_zero_path_legacy_tables.rollback.sql` | `03996af8f692cb0728e8d132ad30aafead36278e127ca91092de6fb3c7ecc913` | 8 |
| `20261119180000` | `database/rollback/20261119180000_archive_legacy_schema_copies.rollback.sql` | `1ca7c11ca8b6df74649ab73cf95f5d1bdc8b8f2cde237872d951cf6d9104c1de` | 10 |
| `20261119200000` | `database/rollback/20261119200000_unblock_and_archive_legacy_tenant_tables.rollback.sql` | `40aa9ed80d2ebc3a127df6c49b17c1869f14d40616947625cfca6c1313ea986f` | 4 |
| `20261119233000` | `database/rollback/20261119233000_iam_legacy_permission_convergence.rollback.sql` | `e9edec1ffd19853fec007dbb6c574e5f43722115c43eb0316df8fe5ec2d98b9e` | 2（DELETE） |
| `20261119140000` | `database/rollback/20261119140000_iam_core_tenant_plugins_rls_strict_forward.rollback.sql` | `c8d57d9d29ab5eb531b276aa9c7e320cd92cb6b29c740054eb1e5ced80007c1e` | 0 |

### 2.1 演练与 dev 落地方式

| 版本 | 隔离库演练 | dev 落地方式 | dev 落地时间 |
|---|---|---|---|
| `20261119160000` | `run-migration-drill.sh anchor` `[5/5]` PASS（2026-11-19；快照重生成 + 实测比对，anchor `20261117235500`，非特权 `topems_test_runner`） | §7.1 重放：备份 → 删账本行 → `--apply-deferred` + GUC 闸门 + `--allow-destructive` | 2026-11-19 18:38:53 |
| `20261119180000` | `[5/5]` PASS（2026-11-19，83s；快照 825→795 表、837→807 策略，-30/-30，diff 全部落在本批 108 张内） | §7.1 重放，同上 | 2026-11-19 18:38:16 |
| `20261119200000` | `[5/5]` PASS（2026-11-19 18:47；check/write 双模式，798 表 / 809 策略零 diff） | §7.1 重放，同上 | 2026-11-19 18:43:01 |
| `20261119233000` | 无独立隔离演练；`check-destructive-sql --strict --approve-ticket=IAM-PERM-20261119` 转 APPROVE（2 条 DELETE，max-rows=0） | §7.1 重放：`pg_dump` 备份两张表 → 账本无该行 → `--apply-deferred` | 2026-11-19 20:39 |
| `20261119140000` | 无独立隔离演练；文件自带前置/后置断言，dev 落地即验证 | §7.1 落地：`pg_dump` 备份 `iam.core_tenant_plugins` → 账本无该行 → `--apply-deferred 20261119140000 --ticket RESIDUAL-RLS-20261118`（无 `--allow-destructive`、无闸门 GUC）→ 运行期行为矩阵（见 §4.6） | 2026-11-20 02:20 |

> 演练快照与 prod 实测的 RLS 口径存在采集时差：演练 anchor 记 108 批 -30 表；dev 落地实测为 29 表 / 30 策略（`iam.permission_audit_logs` 带 2 条策略）；prod 当前实测为 30 表 / 31 策略。窗口验收以 **prod 实测目标值** 为准（§4）。

### 2.2 W4 的 destructive 标记块（`20261119233000`）

原文件（`414155a1c`）的两条 `DELETE` 没有豁免标记，prod 门禁会直接 DENY。按仓库既有字段顺序补齐，两条 `DELETE` 使用**完全相同**的 8 行模板（仅 `reason` 按语句语义区分）：

```sql
-- destructive-gate: allow
-- destructive-kind: DELETE
-- destructive-reason: <≥10 字，说明清理对象与生产实测行数>
-- destructive-owner: iam
-- destructive-ticket: IAM-PERM-20261119
-- destructive-expires: 2027-05-10
-- destructive-max-rows: 0
-- destructive-backup: 窗口前超户 pg_dump -t public.core_permissions -t public.core_role_permissions
```

口径说明：

- `destructive-owner: iam`：仓库既有取值以 `平台组/DBA` 为主，但本迁移只动 IAM 权限域，且已有 2 处 IAM 迁移使用 `iam`，按域归属取值。
- `max-rows: 0`：11-19 dev/prod 实测 44 条遗留码与相关授权均为 0；开窗时必须重测，若出现非 0（例如恢复库带回历史数据），预演直接拒绝，需人工确认后再放行。
- `expires: 2027-05-10`：门禁要求不超过执行日 +180 天（2026-11-19 起），与其他三波保持一致。
- 标记规范与最小示例已补进 `scripts/ci/check-destructive-sql.mjs` 头部注释，后续迁移不再需要靠猜字段。

### 2.3 2026-11-21 新增候选（36 条）

> **失效标注（2026-11-22）**：本节标题与下表合计的「36 条」是 11-21 中间读数，**已失效**。当前 `> 20261119233000` 实为 42 条，差额 6 条：
> - W5C 3 条：`20261121230000`、`20261121235900`、`20261121235930`（不属于本包，是否入窗另行评估）；
> - 本波公司上下文 2 条：`20261121235940`、`20261122090000`（见 §2.4）；
> - MES 数量列 1 条：`20261122100000`（语义见 §4.12 末尾，不属本波）。
>
> 下表其余 36 条的归类与顺序判断继续有效，不追溯改写历史读数。

| 类别 | 条数 | 说明 |
|---|---:|---|
| `*_schema_canonical.sql` | 26 | ai/tms/master-data/ticket/plugin-registry/finance/portal/ehs/lims/wms/qms/hrm/unified-core/scm/erp/mobile/gis/pm/pdm/srm/mes/crm/integration/rd/analytics/communication |
| `*_drop_resurrected_dead_tables.sql` | 6 | wms/hrm/unified-core/mobile/pm/analytics；目标与 W1/W2/W3 的 132 张无交集 |
| 索引/列/权限修补 | 3 | `20261120120000` AI 重复索引、`20261120090000` MES typmod、`20261120100000` 菜单/CRM 权限别名 |
| W2-C | 1 | `20261121220000_finance_opening_balances_move.sql` |

关键顺序：

- **canonical 26 条按版本号执行**；6 条 drop 紧跟对应 canonical 之后（版本号已保证）。
- **W2-C 必须最后**：`20261121100000_erp_schema_canonical.sql` 内含 `CREATE TABLE IF NOT EXISTS erp.opening_balances`；W2-C 通过 `ALTER TABLE ... SET SCHEMA finance` 把它移走。若顺序反转，canonical 会重新创建 `erp.opening_balances`，形成双表。
- **W6/P1-1 必须排在对应 canonical 之后**：pm canonical 已重建 `pm.project_type_configs` 的 `rls_platform_read`/`rls_tenant_isolation`，mobile canonical 已重建 `mobile.sync_policies` 的隔离策略；W7-B 在其后执行才能保证数据归一与最终策略一致。W7-B 的 5 张表不在 26 条 canonical 的建表清单内，不存在表结构冲突。
- **W7-B 与 P1-1 互相独立**：对象集合无交集，可同窗口、分事务顺序执行。

W7-B 文件头已声明：5 表共 83 行，其中 74 行 `tenant_id NULL → 全零哨兵`（8/48/16/1/1），删除 `rls_global_read`，前 4 表加 `rls_platform_read`，`mobile.sync_policies` 不加平台读；回滚文件 `database/rollback/20261118110000_platform_corpus_rls_strict.rollback.sql` 逆向恢复 NULL 行与 `rls_global_read`。

### 2.4 W9 公司上下文波次（2026-11-22 增补）

本波不在 11-21 的 36 条候选内，是 11-22 新增；两笔迁移都属于「代码与迁移必须同窗口」的强耦合项。

| 子波 | 版本 | 主题 | 对象规模 | 同窗口二进制 | 迁移提交 |
|---|---|---|---:|---|---|
| W9-A | `20261121235940` | ERP 合并报表族公司维度 RLS | 8 表 / 32 策略（每表 4）/ 4 张补 `company_id`、其中 2 张另补 `period_version`（共 6 列）/ 4 条 FK / 4 条索引 / 3 个新函数（复用 `erp.group_tenant_of`） | erp | `db1da5e28` |
| W9-B | `20261122090000` | `core_user_company_scopes.is_default` + 部分唯一索引 + 回填 | 1 表 / 1 列 / 1 唯一索引 / 1 条 UPDATE | shared-auth、shared-db（其余使用公司上下文的服务建议同批重编） | `7d92a571e` |

账本 checksum 是**迁移文件字节的 SHA-384**；下表同时给出迁移与回滚的 SHA-256，便于开窗前后比对文件未被改写。

| 版本 | sha384（账本） | sha256（迁移） | sha256（回滚） |
|---|---|---|---|
| `20261121235940` | `9989aa836c96530ba3bdbe22d6c23e13d984e16957fbe9971069bac660a262e866b82b6cc682e6c7a98ab0578146f9c7` | `117c2b9d86a74d64898200e5783c47858b69196f023578ac51079b3013f7fbb8` | `f8b686492cc2ad6d447c185ee369a996a34605d5b5d3e7213cdd45606eb46654` |
| `20261122090000` | `19a04c0122968ff6caede8dc002a06816acfac50ef31dd8507e757b01ff25596db8581994ddfd88d6aa7ce6349f333ee` | `bb606c17395ccaac3520ef6f13469185d5688d5e1839f4b8b11ba69c19a09583` | `fb3b3089e8fbcce012a2efd03dd659b19bd036c0f6a3c9f9789e6da4d47ca4e9` |

**执行顺序：W9-A → W9-B**（版本号已保证）。

```bash
# W9-A（无闸门 GUC；--strict 破坏性检查已实测 OK，无需 --allow-destructive）
PROD_CHANGE_TICKET=ERP-COMPANY-RLS-20261122 \
PGOPTIONS="-c app.rls_system=on" \
bash scripts/migration/apply-forward.sh --db topems_prod --prod \
  --apply-deferred 20261121235940 --ticket ERP-COMPANY-RLS-20261122

# W9-B（带 destructive 标记：ticket COMPANY-DEFAULT-20261121）
PROD_CHANGE_TICKET=COMPANY-DEFAULT-20261121 \
PGOPTIONS="-c app.rls_system=on" \
bash scripts/migration/apply-forward.sh --db topems_prod --prod \
  --apply-deferred 20261122090000 --ticket COMPANY-DEFAULT-20261121
```

**前置（缺一不可）**

1. 账本中 W9 两个版本均未 `success=t`（现场只读确认；不能凭版本号低于 prod max 判断）。
2. `20261120235900`（hrm canonical）与 `20261121100000`（erp canonical）已 `success=t`：
   - 8 张表已存在且各只有 1 条 `rls_tenant_isolation`、`FORCE RLS` 已开（由 `20261119210000` 改名 + erp canonical 重建；生产现存的 `tenant_isolation_<表名>` 届时不应再出现）；
   - `hrm.companies` 具备 `(tenant_id, id)` 唯一键（W9-A 的 4 条 FK 依赖）。
3. 同窗口二进制已构建并待发布：`erp`（合并报表读写走请求事务）、`shared-auth`（`company_context.rs` + `middleware/company.rs`，`7d92a571e`）、`shared-db`（`app.company_id` / `app.actor_is_parent` / `app.visible_company_ids` GUC 注入）。
   - **口径校正**：`Claims` 当前未新增 `company_id`，公司上下文按请求解析（头 > `is_default` > 唯一成员）；发布核对以代码为准，不要按「token 携带 company_id」检查。
4. 备份：`pg_dump` 覆盖 8 张 erp 表 + `public.core_user_company_scopes`（W9-B 的标记只要求后者，建议一并备份前者）。

**硬约束：代码与迁移必须同窗口。** 未接公司上下文（不注入 `app.company_id`）的二进制读这 8 张表会返回 **0 行**（系统读通道除外）。分批执行的结果：

| 分批方式 | 发生什么 |
|---|---|
| 先库后码 | 8 张表切到公司维度；旧二进制不设 `app.company_id` → 普通会话读 **0 行**、写被 `WITH CHECK` 拒绝；ERP 合并报表页表现为空/写失败。`is_default` 列虽在，但旧中间件不读它，无 500。 |
| 先码后库 | 新二进制设 `app.company_id`，但策略仍是租户级 → 同租户各公司**互相可见**（越权可见，安全缺口）；中间件查 `is_default` 失败被吞掉 → 隐式默认公司与唯一成员推断同时失效，未带 `x-company-id` 的请求落为「无公司上下文」。 |
| 同窗口 | 读写按公司维度收敛；`is_default` 兜底可用；回滚按 B→A 恢复。 |

**与相邻波次的关系**

- **← erp canonical `20261121100000`（必须先于任何 `SET SCHEMA`/策略重建）**：合并报表 8 表由它建表；租户策略来自更早的 `20261114180000`（`20261119210000` 后统一为 `rls_tenant_isolation`），`erp.group_tenant_of()` 也由其创建并仅供 W9-A 的公司维度策略复用，不在旧租户策略表达式内。W8 的 `SET SCHEMA finance` 必须在 canonical 之后；W9-A 版本号在其后，按版本顺序天然满足。
- **与 W8（`20261121220000`）**：无表交集；W8 只移动 `erp.opening_balances`。建议同窗，顺序 W8 → W9。
- **与 W6 / P1-1**：对象集合无交集（平台语料 5 表、QMS 3 表），可同窗、各自单事务回滚；前提是发布编排同时包含 erp、shared-auth、shared-db、finance、unified-core、mobile、qms。
- **与 `20261120090000` / `20261122100000`（MES 数量列）**：无对象交集，语义互不影响；`20261122100000` 版本号更晚，落到同一待应用序列时按版本号自然排在 W9-B 之后。W9 不改变 `mes.production_orders` 的 bigint 终态。
- **与 W1–W5**：无表交集；W9 不触碰归档目标，也不依赖 C16 的 `rows=0` 断言。

### 2.5 W10 public 审批/流程 4 表（2026-11-22 增补）

| 项 | 内容 |
|---|---|
| 版本 | `20261122150000_public_approval_workflow_tenant_isolation.sql`（回滚同名 `.rollback.sql`） |
| 对象 | `public.approvals`、`approval_records`、`core_workflow_instances`、`core_workflow_tasks` |
| 规模 | 4 表 / 4 条租户索引 / 4 条策略归一；0 行数据变化；列 `tenant_id` 已存在，`ADD COLUMN IF NOT EXISTS` 为幂等守卫 |
| 同窗口二进制 | **无**。四张表无写入路径变更：`approvals` / `approval_records` 仓库内只读；`core_workflow_*` 写入点已显式绑定 `tenant_id` |
| 前置 | `20261120235945`（unified core canonical）、`20260923160000`（四表建表/策略）、`20260917000005`、`20260918000017` 已应用；与 `20261121235940` 无表交集 |
| 回滚 | 删 4 条索引；`approvals` / `approval_records` 回到「严格 USING、无 WITH CHECK」的迁移前生产形态；`core_workflow_*` 不变；保留 `tenant_id` 列与已回填值 |

**为什么独立成波、不并入 W9**：W9 是 ERP 合并报表的公司维度改造，与 `erp` / `shared-auth` / `shared-db` 二进制强耦合；若把本波塞进 W9，会把「无代码依赖、0 行、可独立回滚」的低风险项绑到强耦合发布上，扩大回滚面。本波按版本号自然排在 W9 之后即可。

**与相邻波次的关系**：与 W8（`erp.opening_balances`）、W6/P1-1（平台语料/QMS）无表交集；与 `20261120090000` / `20261122100000`（MES 数量列）无交集。只需保证在 unified core canonical 之后执行（版本号已保证）。

---

## 3. 顺序、依赖与分波

### 3.1 硬依赖

1. **W3 ← W2**：W3 第一个前置断言要求 `iam.core_tenants` / `iam.core_users` / `flow.core_tenants` 的入向 FK 精确为 `1/1/4`。11-19 实测 prod 为 `8/1/4`（现场必须重测）；差值 7 全部来自 W2 的 108 批（`iam.core_billing_invoices`、`core_subscriptions`、`core_tenant_modules`、`core_tenant_settings`、`core_tenant_usage`、`core_tenant_users`、`core_usage_records`）。W2 未完成时 W3 必然在预检阶段 `RAISE EXCEPTION`。
2. **W2 内部外键**：108 批的 19 条入向 FK 全部指向批次内表，迁移内按依赖顺序归档/DROP；不允许批次外引用（当前实测 0）。
3. **W1 与 W2 无表集合交集**，可各自独立执行；建议 W1 先跑，由它创建 `archive` schema 与 6 张簿记表（W2 的 `CREATE ... IF NOT EXISTS` 也会兜底）。
4. **W3 另建** `archive._fk_out_snapshot`（第 7 张簿记表），用于回滚重建被删表自身的出向外键。
5. **W4 与 W1/W2/W3 无依赖**：W4 只读写 `public.core_permissions` 与 `public.core_role_permissions`；三波只归档/删除 132 张业务表并重指插件 FK/函数，两者对象集合无交集，也不共享闸门 GUC 或票据。W4 可与任一波合并，或独立成波；建议独立成波放在最后，便于单独回滚（只恢复两张表）。
6. **W5 与 W1–W4 无对象依赖，但固定排在 W3 之后**：W5 只对 `iam.core_tenant_plugins` 做 ENABLE/FORCE RLS + 重建 1 条策略；W3 会重指该表的外键（同一张表、不同对象），两者不共享 GUC/票据。放在 W3 之后可保证开窗执行时该表已处于 W3 的终态结构，避免把「FK 重指」与「RLS 收紧」混在同一步排查。
7. **W8（W2-C）← erp canonical**：`20261121100000` 必须先于 `20261121220000`；否则 W2-C 找不到 `erp.opening_balances` 会中止，或在回放时重新造出 erp 表。W2-C 只做 `SET SCHEMA`，不复制数据，但必须与 finance 本波二进制同窗口。
8. **W6（W7-B）/ P1-1 ← canonical**：pm/mobile/qms canonical 会重建同名策略；两条 RLS 批必须排在对应 canonical 之后，才能保证最终策略不被覆盖。W6 与 W1–W5 无表交集。
9. **W6 与 P1-1 互相独立**：5 张平台语料表与 3 张 QMS 检验表无交集，可同窗口分事务执行；但 W6 的 `mobile.sync_policies` 与 mobile canonical 同表，必须按“canonical → W6”顺序。
10. **canonical 26 条无独立回滚文件**：它们与代码同窗口；若在 canonical 之后、W6/P1-1 之前失败，只能停止后续波次并评估是否整批回退代码，不进入 §3.3 的逆序演练。
11. **W9-A ← `20261114180000` + hrm canonical `20261120235900` + erp canonical `20261121100000`**：8 张表由 `20261114180000` 建立 `tenant_isolation_<表名>` 租户策略与 `erp.group_tenant_of()`，随后 `20261119210000` 把这些策略改名为 `rls_tenant_isolation`，erp canonical 再按同名重建；4 条公司列 FK 依赖 `hrm.companies(tenant_id, id)`（约束 `uq_companies_tenant_id_id`）。三者未 `success=t` 时 W9-A 会因函数/表/约束缺失中止。注意 `20261114180000` 版本号低于旧 prod max，不能靠「版本号 > max」判定已应用。
12. **W9-A ← 公司上下文二进制（硬约束）**：未注入 `app.company_id` 的二进制读 8 张表返回 0 行；因此迁移与 `erp` + `shared-auth` + `shared-db` 必须同窗口（§2.4 已列分批后果）。这是本包内唯一「先库后码会造成可用性中断」的波次。
13. **W9-B 与 W9-A 无对象依赖，但固定 A→B**：`is_default` 只影响中间件缺省公司解析，不改 8 表策略；按版本号执行以保持账本顺序。W9-B 与 MES 数量列 `20261120090000` / `20261122100000` 无交集，后者按版本号自然排在 W9-B 之后。

### 3.2 分波（每波单文件、单事务、可独立回滚与验收）

| 波 | 版本 | 归档表 | 建议窗口段 | 独立回滚 |
|---|---|---:|---|---|
| W1 | `20261119160000` | 16 | 第 1 段 | `20261119160000` 回滚文件 |
| W2 | `20261119180000` | 108 | 第 2 段 | `20261119180000` 回滚文件 |
| W3 | `20261119200000` | 8 | 第 3 段 | `20261119200000` 回滚文件（须在 W2 回滚之前） |
| W4 | `20261119233000` | 0 | 第 4 段 | `20261119233000` 回滚文件（与三波无依赖，可最先回滚） |
| C | 26 条 canonical + 6 条 drop + 3 条修补 | 0 | 第 5 段（按版本号） | 无独立回滚，与代码同窗口 |
| W8 | `20261121220000` | 0（1 表换 schema） | 第 6 段（必须在 erp canonical 之后） | `20261121220000` 回滚文件（finance → erp） |
| W5 | `20261119140000` | 0 | 第 7 段（排在 W3 之后） | `20261119140000` 回滚文件（删策略 + 关闭 RLS） |
| W6 | `20261118110000` | 0（5 表 RLS + 74 行归一） | 第 8 段（必须在 pm/mobile canonical 之后） | `20261118110000` 回滚文件（恢复 NULL + `rls_global_read`） |
| P1-1 | `20261118100000` | 0（3 表 RLS） | 第 9 段（必须在 qms canonical 之后） | `20261118100000` 回滚文件（关 RLS + 删策略/索引） |
| W9 | `20261121235940` + `20261122090000` | 0（8 表 RLS 收紧 + 1 列回填） | 第 6.5 段（W8 之后、W5 之前；A→B） | 两个回滚文件，按 B→A；A 的回滚不自删账本，需手工清理 |

### 3.3 回滚逆序

`P1-1 → W6 → W5 → W9（B→A） → W8 → W4 → W3 → W2 → W1`（canonical 26 条不纳入逆序演练，见 §3.1 第 10 条）。

- W9 回滚顺序为 **B → A**：B 先删部分唯一索引与 `is_default` 列（回滚文件会自删账本行）；A 再删除 8 张表的 32 条公司维度策略、恢复每表 1 条租户策略，并删除新增的 6 列、4 条 FK、4 条索引与 3 个函数。**A 的回滚文件不自删账本**，须按 §5.2 手工 `DELETE FROM public._sqlx_migrations WHERE version=20261121235940`。
- A 回滚件按窗口顺序**原样还原**：8 张表各 1 条 `rls_tenant_isolation`（ALL / PERMISSIVE / {public}，表达式 `系统通道 OR 租户`），与 `20261119210000` 改名 + erp canonical 重建后的 W9 前置逐表逐字一致；回滚脚本自检逐表比对 `policyname`、命令类型、`permissive`、roles 与 `USING`/`WITH CHECK`，不符即失败。限定：若跳过 `20261119210000`、只单独补投 W9-A，则 W9 前置是 `tenant_isolation_<表名>`，需改用另一套回滚口径。
- W9 回滚后语义：8 张表退回「同租户各公司互相可见」，`company_id` / `period_version` 的回填值随列删除而丢失，`is_default` 标记丢失；因此开窗前必须保留 8 张 erp 表与 `core_user_company_scopes` 的 `pg_dump`。

- W5 回滚删除 `rls_tenant_isolation` 策略并关闭 `iam.core_tenant_plugins` 的 RLS/FORCE；表结构与数据不变，与其他波无交集，可在任意时点执行。
- W4 回滚删除 2 条字典码、恢复 44 条遗留码及其角色授权；与其他三波无交集，可在任意时点最先执行。
- W3 回滚先恢复 8 张表（含 `iam.core_tenants`）、旧函数体，并把插件 FK 改回 `iam.core_tenants`。
- W2 回滚随后重建 108 张表；其中 7 条 FK 指向 `iam.core_tenants`，因此必须在 W3 回滚之后执行。
- W1 回滚与其他两波无依赖，可在 W3 之后任意时点执行。

---

## 4. 每波前置、命令与验收断言

### 4.1 公共环境与 T-0 门禁

```bash
export PGHOST=127.0.0.1 PGPORT=5432 PGUSER=topems_prod PGPASSFILE=$HOME/.pgpass
psql -d topems_prod -tAc "SELECT current_user, current_database(), inet_server_addr()"
# 期望：topems_prod | topems_prod | 127.0.0.1
node -v   # prod 主机必须有 node；缺失则脚本 DENIED
```

T-0（任一不过即停止开窗）：

1. prod 主机检出目录内五份迁移文件 sha384 与 §2 完全一致；五份回滚文件 sha256 与 §2 一致。
2. `git status --porcelain database/migrations database/rollback` 为空（除已跟踪的五份文件外无额外文件）。
3. `PGPASSFILE=$HOME/.pgpass MIGRATION_DRIFT_DB_URL=postgresql://topems_drift@127.0.0.1:5432/topems_prod node scripts/migration/check-ledger-ddl-drift.mjs` 输出 PASS、exit 0。
4. `window-preflight-2026-11-19.sql` 在 `topems_drift` 下 exit 0、无 `ERROR`，C1–C15/C17/C19 全 PASS，C10 为 `PASS_PRE`；C16 为 `NEEDS_DBA`，按 §4.8 由 DBA 用 `topems_prod` 只读复跑并转 PASS。

### 4.2 W1：`20261119160000`（16 张，零路径）

前置（迁移内断言 + 现场核对）：

- 16 张表全部存在，且每张行数为 0（脚本预演硬闸门）。
- 16 张表入向 FK = 0、依赖视图 = 0。
- `archive` schema 不存在，或仅存在 6 张簿记表。
- 账本无 `20261119160000`。

命令：

```bash
PROD_CHANGE_TICKET=ZERO-PATH-20261119 \
PGOPTIONS="-c app.drop_zero_path_tables_gate=zero-path-20261119" \
bash scripts/migration/apply-forward.sh --db topems_prod --prod \
  --apply-deferred 20261119160000 --ticket ZERO-PATH-20261119 \
  --allow-destructive=20261119160000
```

验收（全部通过才进入 W2）：

```sql
-- 1) 账本 success + checksum = 文件 sha384
SELECT version, success, encode(checksum,'hex') AS sha384
FROM _sqlx_migrations WHERE version = 20261119160000;
-- 期望：t | 8a58bed7...508c6c

-- 2) archive 表 = 22（16 归档 + 6 簿记）
SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='archive' AND c.relkind='r';

-- 3) manifest 恰 16 行
SELECT count(*) FROM archive._drop_manifest WHERE migration_version='20261119160000';

-- 4) 16 张原表残留 = 0（清单见 preflight 第 4.5 节）
-- 5) 全局读数（相对 W1 前现场值）：RLS -16 / 策略 -16 / 表 +6 / archive +22
```

失败处理：该文件整事务回滚、exit 1；不重跑同一文件，先按 §5 恢复并核对。

### 4.3 W2：`20261119180000`（108 张）

前置：

- 108 张表全部存在，且每张行数为 0（脚本预演硬闸门）。
- 108 张表入向 FK 19 条，全部来自批次内；批次外 = 0。
- 依赖视图 = 0。
- 账本无 `20261119180000`。

命令：

```bash
PROD_CHANGE_TICKET=LEGACY-COPY-20261119 \
PGOPTIONS="-c app.archive_legacy_copies_gate=legacy-copies-20261119" \
bash scripts/migration/apply-forward.sh --db topems_prod --prod \
  --apply-deferred 20261119180000 --ticket LEGACY-COPY-20261119 \
  --allow-destructive=20261119180000
```

验收（按 §3.2 建议顺序，W1 已先跑；全部通过才进入 W3）：

```sql
SELECT version, success, encode(checksum,'hex') AS sha384
FROM _sqlx_migrations WHERE version = 20261119180000;
-- 期望：t | 9b47af6d...013755

SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='archive' AND c.relkind='r';       -- 130

SELECT count(*) FROM archive._drop_manifest
WHERE migration_version='20261119180000';          -- 108

-- 108 张原表残留 0；相对 W2 前现场值：RLS -30 / 策略 -31 / 表 0 / archive +108
```

W2 结束后额外确认（W3 前置）：`iam.core_tenants` / `iam.core_users` / `flow.core_tenants` 入向 FK = `1/1/4`（11-19 推算；若开窗前现场起点不是 `8/1/4`，按实际值减 7 重算，不能直接套用）。

### 4.4 W3：`20261119200000`（8 张 + FK 重指 + 函数改写）

前置（迁移内断言）：

- 8 张表存在且行数 0。
- 入向 FK 精确 `1/1/4`（`iam.core_tenants` / `iam.core_users` / `flow.core_tenants`）。
- 8 张表无其他入向 FK、无依赖视图、无触发器。
- `public.core_tenants`、`public.core_users`、`public.core_user_roles`、`public.core_tenant_plugins` 存在。
- `iam.core_tenant_plugins` 的 `core_tenant_plugins_tenant_id_fkey` 存在且当前指向 `iam.core_tenants`；无孤儿 `tenant_id`。
- `finance.bootstrap_defaults()` 存在；除它之外无其他函数引用三目标。
- 账本无 `20261119200000`。

命令：

```bash
PROD_CHANGE_TICKET=TENANT-UNBLOCK-20261119 \
PGOPTIONS="-c app.tenant_unblock_archive_gate=tenant-unblock-20261119" \
bash scripts/migration/apply-forward.sh --db topems_prod --prod \
  --apply-deferred 20261119200000 --ticket TENANT-UNBLOCK-20261119 \
  --allow-destructive=20261119200000
```

验收（按 §3.2 建议顺序，W1、W2 已先跑）：

```sql
-- 1) 账本 success + checksum
SELECT version, success, encode(checksum,'hex') AS sha384
FROM _sqlx_migrations WHERE version = 20261119200000;
-- 期望：t | c1309183...0f2ea6

-- 2) 归档 8 张；manifest 8 行；原表残留 0
SELECT count(*) FROM archive._drop_manifest WHERE migration_version='20261119200000'; -- 8
SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='archive' AND c.relkind='r';       -- 139

-- 3) 插件 FK 已重指 public
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                  WHERE n.nspname='iam' AND c.relname='core_tenant_plugins')
  AND conname='core_tenant_plugins_tenant_id_fkey';
-- 期望：REFERENCES core_tenants(id)（解析到 public.core_tenants）

-- 4) 函数不再引用 iam/flow/core_tenant_users
SELECT position('iam.core_tenants' in prosrc)=0 AS no_iam,
       position('flow.core_tenants' in prosrc)=0 AS no_flow,
       position('iam.core_tenant_users' in prosrc)=0 AS no_legacy_users,
       position('public.core_tenants' in prosrc)>0 AS has_public
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='finance' AND p.proname='bootstrap_defaults';

-- 5) 相对 W3 前现场值：RLS 0 / 策略 0 / 表 +1 / archive +9（W3 本身 0/0）
```

### 4.5 W4：`20261119233000`（0 张表，2 条 DELETE）

前置：

- 账本无 `20261119233000`。
- `public.core_permissions` / `public.core_role_permissions` 存在；唯一指向 `core_permissions` 的外键是 `core_role_permissions_permission_id_fkey`。
- 44 条遗留码 = 0、相关角色授权 = 0、`iam:dictionaries_read` / `iam:dictionaries_update` = 0（当前 prod 实测均为 0）。
- 文件含 2 组 `destructive-ticket: IAM-PERM-20261119`、`destructive-max-rows: 0` 标记；`check-destructive-sql --strict` 带该票据应 APPROVE。
- 无需闸门 GUC；预演会自行注入 `app.rls_system=on`（该表未启用 RLS，注入只是保持一致）。

命令：

```bash
PROD_CHANGE_TICKET=IAM-PERM-20261119 \
bash scripts/migration/apply-forward.sh --db topems_prod --prod \
  --apply-deferred 20261119233000 --ticket IAM-PERM-20261119 \
  --allow-destructive=20261119233000
```

验收：

```sql
-- 1) 账本 success + checksum
SELECT version, success, encode(checksum,'hex') AS sha384
FROM _sqlx_migrations WHERE version = 20261119233000;
-- 期望：t | 13d61313...534b7

-- 2) 2 条字典码存在；44 条遗留码与授权仍为 0；总数 1159
SELECT count(*) FROM core_permissions;                       -- 1159
SELECT count(*) FROM core_permissions
 WHERE code IN ('iam:dictionaries_read','iam:dictionaries_update');  -- 2
-- 44 条遗留码：复用 preflight §7.5 的 C18，期望 legacy_present=0、legacy_grants=0

-- 3) 无意外对象变化：表/RLS/策略与 W4 前现场值一致（W4 只动权限码/授权）
```

失败处理：整文件单事务，任一断言失败即整批回滚；不重跑同一版本，先按回滚文件恢复两张表。

### 4.6 W5：`20261119140000`（0 张表，`iam.core_tenant_plugins` 严格 RLS）

前置（迁移内断言 + 现场核对）：

- 账本无 `20261119140000`。
- `iam.core_tenant_plugins` 存在；`tenant_id` 为 NOT NULL；零/NULL 租户行 = 0。
- 窗口前 RLS/FORCE 均为 `f`、策略 0 条（§1.3 实测；preflight C19 复核）。
- 该表 0 行；无 DML、无表结构变更，无需闸门 GUC，无需 `--allow-destructive`（文件无 DELETE/UPDATE/TRUNCATE）。
- 固定排在 W3 之后执行：此时 FK 已由 W3 重指 `public.core_tenants`，与本迁移互不影响。

命令：

```bash
# 无闸门 GUC、无 PROD_CHANGE_TICKET、无 --allow-destructive
bash scripts/migration/apply-forward.sh --db topems_prod --prod \
  --apply-deferred 20261119140000 --ticket RESIDUAL-RLS-20261118
```

验收（全部通过才进入收尾）：

```sql
-- 1) 账本 success + checksum = 文件 sha384
SELECT version, success, encode(checksum,'hex') AS sha384
FROM _sqlx_migrations WHERE version = 20261119140000;
-- 期望：t | 4f809550...075037d

-- 2) 表 0 行 / RLS+FORCE 开启 / 恰 1 条策略且定义含两个 GUC
SELECT (SELECT count(*) FROM iam.core_tenant_plugins) AS rows,   -- 0
       c.relrowsecurity, c.relforcerowsecurity,                  -- t | t
       (SELECT count(*) FROM pg_policies
         WHERE schemaname='iam' AND tablename='core_tenant_plugins') AS policies  -- 1
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='iam' AND c.relname='core_tenant_plugins';

SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='iam' AND tablename='core_tenant_plugins';
-- 期望：rls_tenant_isolation | ALL | USING/WITH CHECK 均含 app.rls_system 与 app.tenant_id

-- 3) 相对 W5 前现场值：表不变 / RLS +1 / 策略 +1
```

运行期行为矩阵（dev 实测，非特权角色 `topems_test_runner`，非 superuser、非 BYPASSRLS）：

| 会话设置 | `SELECT count(*)` | 结论 |
|---|---:|---|
| 无 `app.*` GUC | 0 | fail-closed |
| `app.tenant_id = 00000000-0000-0000-0000-000000000001` | 1 | 只读本租户 |
| `app.tenant_id = 0214a319-…-c04d`（另一租户） | 1 | 只读本租户 |
| `app.rls_system = on` | 2 | 系统通道放行全量 |
| `app.tenant_id = A` 写入 `tenant_id = B` 的行 | — | `new row violates row-level security policy` |
| `app.tenant_id = A` 写入本租户行 | — | 成功（返回 id） |

> 该矩阵用 dev 临时探针数据验证，验证后已全部回退（`iam.core_tenant_plugins` 0 行、探针插件删除、临时 GRANT 已 revoke）。prod 表为 0 行，无法复现行级过滤，prod 验收以「策略定义 + RLS/FORCE 标志」为准。

回滚：`database/rollback/20261119140000_iam_core_tenant_plugins_rls_strict_forward.rollback.sql` 删除策略并关闭 RLS/FORCE；表结构与数据不变。

### 4.7 累计预期读数（2026-11-19 表已失效）

> 11-19 的起点值（账本 721、表 1344、RLS 959、策略 1050、权限 1157/2917）已经被远端 81 条提交与新增 36 条迁移（2026-11-22 复核为 42 条）破坏，**不得作为验收依据**。开窗起点必须以 preflight 现场值为准。

**当前有效口径**：

- **不预设终态数字**。每波执行后记录「账本行 +1、`max(version)`、表总数、archive 表、RLS 表、策略、权限码/授权」七项现场值；任一项与迁移内断言不符即停。
- **W1–W5 的相对增量仍成立**（文件未改写，对象集合未变）：W1 表 `+6`、archive `+22`、RLS `-16`、策略 `-16`；W2 表 `0`、archive `+108`、RLS `-30`、策略 `-31`；W3 表 `+1`、archive `+9`、RLS `0`、策略 `0`；W4 权限码 `+2`、授权不变；W5 RLS `+1`、策略 `+1`。
- **W6（W7-B）**：5 张表 RLS/FORCE 保持启用；策略从「5 条 `rls_global_read`」变为「5 条 `rls_tenant_isolation` + 4 条 `rls_platform_read`」，净 `+4`（终态 9 条）；74 行 `tenant_id` 从 NULL 变为全零哨兵；表总数、行总数不变。
- **P1-1**：3 张 QMS 表从「无 RLS」变为「RLS+FORCE」；RLS `+3`、策略 `+3`、索引 `+3`；行数保持 0；表总数不变。
- **W8（W2-C）**：表总数不变（同一张表换 schema）；RLS/策略随表移动，计数不变；行数不变。
- **W9（公司上下文）**：表总数不变；8 张表本就 ENABLE+FORCE，RLS 表数不变；这 8 张表的策略 **8 → 32（净 +24）**；列 **+6**（`company_id`×4、`period_version`×2）、FK **+4**、索引 **+4**、函数 **+3**；`public.core_user_company_scopes` 新增 1 列 + 1 条部分唯一索引，回填 UPDATE 行数 = 开窗时「尚无 `is_default=true` 的用户数」（须 ≤ 标记的 `max-rows: 100000`，实测值记入记录）；W9-A 另有 3 条带 `IS NULL` 前置条件的可推导回填（reports / report_lines / elimination_rules），行数按现场记录。**与旧口径冲突**：任何「8 张表各 1 条租户策略」的描述在本波后失效，终态为每表 4 条。
- **canonical 26 条 + 6 条 drop + 3 条修补**：表总数、RLS、策略、权限码都可能变化，逐条按迁移内 `DO` 断言记录，不汇总成单一终态。

**已失效的旧表**：账本 `721→722→…→726`、表 `1344→1350→1351`、archive `0→22→130→139`、RLS `959→943→913→914`、策略 `1050→1034→1003→1004`、权限码 `1157→1159`、授权 `2917`。仅作历史对照，不再执行对照验收。

### 4.8 C16 交接：DBA 用 `topems_prod` 只读复跑（路径 A）

C16 不能用 `topems_drift` 完成：它对 132 张表覆盖 **0/132**、15 个 schema 的 USAGE **0/15**。已确认的合规候选只有 `topems_prod`（`rolsuper=f`、`rolbypassrls=f`、有 LOGIN、132/132 覆盖、15/15 schema USAGE）。**不能用 `topems` / `xingzhai`**：二者为 superuser（`xingzhai` 还带 BYPASSRLS），会让权限判定与行数校验恒真。

完整可复制命令：

```bash
PGPASSFILE=<DBA 的 pgpass> \
PGOPTIONS="-c default_transaction_read_only=on -c app.rls_system=on" \
psql "postgresql://topems_prod@127.0.0.1:5432/topems_prod" \
  -f docs/database/window-preflight-2026-11-19.sql \
  > preflight_c16_$(date +%Y%m%d_%H%M%S).txt 2>&1
```

判定口径：

- **C16 PASS**：132 张全部 `READABLE` 且 `rows=0`，第 7 节例外查询输出 0 行。**132 这个数量仍成立**（W1/W2/W3 文件未改写），但 `rows=0` 是 11-19 结论，必须在两个时点重跑；新增 6 条 drop 与这 132 张无交集。W6/P1-1/W8 的目标是生产业务表，不在 C16 清单内，另有 §4.9–§4.11 的前置检查。
- **未通过**（任一即算，需原样回报）：出现任何 `NO_PRIV`；任一表 `rows > 0`；或缺少 `app.rls_system=on` 导致 28 张 `tenant_isolation` 表被过滤成 0。

**必须带 `app.rls_system=on`，否则假 PASS**：132 张中 **46 张是 FORCE RLS**（18 张 `allow_all` + 28 张 `tenant_isolation`）。`topems_prod` 是表 owner，但 FORCE RLS 对 owner 同样生效，且它非 BYPASSRLS；不设置该 GUC 时，28 张 `tenant_isolation` 表的 `count(*)` 会被策略过滤为 0，C16 会误判 PASS。破坏性预演段已改为**由脚本自行注入** `SET app.rls_system='on'` 与文件声明的 `app.*_gate`（无需 `PGOPTIONS`）；但 apply 段在 prod 仍不自行注入（`--drill-gate-guc-auto` 仅限演练），因此开窗执行 `apply-forward.sh` 时仍必须在 `PGOPTIONS` 里带上 `-c app.rls_system=on`（与各波 gate GUC 并列）。

复跑时机（结论有保鲜期）：

- **窗口前 24 小时内**：DBA 用上面同一命令做一次准入判定，作为「是否动库」的前置结论。
- **开窗前 30 分钟**：再按同一命令复跑一次确认。
- **两次都 `C16 PASS`**（132 张全部 `READABLE` 且 `rows=0`，第 7 节例外查询 0 行）才允许动库；两次之间任何一次不是 PASS，即推迟窗口，不得用另一次的 PASS 抵消。
- 两次判定之间若发生任何写入、DDL 或权限变更，前一次结论自动失效，必须按上述时机重新复跑。

DBA 回报格式（一条消息）：

1. 一行结论：`C16 PASS` 或 `C16 NOT PASS`。
2. 第 7 节输出原文；若权限不足，给出 `NO_PRIV` 行数统计。
3. 实际执行命令（pgpass 路径可脱敏）与时间戳。

### 4.9 W6（W7-B）：`20261118110000` 同窗口包

**同窗口二进制**：`finance`（币种/报表行映射）、`unified-core`（角色模板/全局指标）、`mobile`（同步策略）。旧二进制在 `tenant_id` NULL→哨兵后会看不到平台行，必须与本迁移同窗口发布；`topems-server` 本波无改动。

**前置只读校验**（任一不符即停）：

```sql
-- 行数 / NULL 数 / 哨兵数；期望 rows=16/48/17/1/1，nulls=8/48/16/1/1，sentinel 全 0
SELECT 'finance.core_finance_currencies' t, count(*), count(*) FILTER (WHERE tenant_id IS NULL), count(*) FILTER (WHERE tenant_id='00000000-0000-0000-0000-000000000000')
FROM finance.core_finance_currencies
UNION ALL SELECT 'finance.core_finance_report_line_map', count(*), count(*) FILTER (WHERE tenant_id IS NULL), count(*) FILTER (WHERE tenant_id='00000000-0000-0000-0000-000000000000') FROM finance.core_finance_report_line_map
UNION ALL SELECT 'public.core_roles', count(*), count(*) FILTER (WHERE tenant_id IS NULL), count(*) FILTER (WHERE tenant_id='00000000-0000-0000-0000-000000000000') FROM public.core_roles
UNION ALL SELECT 'pm.project_type_configs', count(*), count(*) FILTER (WHERE tenant_id IS NULL), count(*) FILTER (WHERE tenant_id='00000000-0000-0000-0000-000000000000') FROM pm.project_type_configs
UNION ALL SELECT 'mobile.sync_policies', count(*), count(*) FILTER (WHERE tenant_id IS NULL), count(*) FILTER (WHERE tenant_id='00000000-0000-0000-0000-000000000000') FROM mobile.sync_policies;

-- RLS/FORCE 与策略：期望 5 表均 t/t；每表 1 条 rls_global_read；0 条 rls_platform_read
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
       count(*) FILTER (WHERE p.policyname='rls_global_read') AS global_read,
       count(*) FILTER (WHERE p.policyname='rls_platform_read') AS platform_read
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname=n.nspname AND p.tablename=c.relname
WHERE (n.nspname,c.relname) IN (('finance','core_finance_currencies'),('finance','core_finance_report_line_map'),
      ('public','core_roles'),('pm','project_type_configs'),('mobile','sync_policies'))
GROUP BY 1,2,3 ORDER BY 1;
```

若行数/NULL 数与上表不符，先查是否有业务写入或 canonical 已改动数据；不要直接执行。

**执行后判定读数**：

- 5 表 `relrowsecurity=t`、`relforcerowsecurity=t`；`rls_global_read` 全部消失。
- 策略数：前 4 表各 2 条（`rls_tenant_isolation` + `rls_platform_read`），`mobile.sync_policies` 仅 1 条（隔离），合计 9。
- `tenant_id IS NULL` 全为 0；全零哨兵分别为 8/48/16/1/1；总行数仍为 16/48/17/1/1。
- A/B 查询：租户 A 只看到 A + 平台行（前 4 表），看不到 B；`mobile.sync_policies` 只看 A；`app.rls_system=on` 看到全部。
- 旧 `rls_global_read` 的全局可读面消失，是本次唯一的“净减少”；回滚文件 `database/rollback/20261118110000_platform_corpus_rls_strict.rollback.sql` 恢复 NULL 与全局读。

**锁影响**：74 行 UPDATE + 5 表策略 DDL，短暂 ACCESS EXCLUSIVE；建议在业务低峰执行。

### 4.10 W8（W2-C）：`20261121220000` 同窗口包

**同窗口二进制**：`finance`（代码改读 `finance.opening_balances`）。erp 代码不再读写该表。

**前置只读校验**：

```sql
SELECT to_regclass('erp.opening_balances') AS erp_tbl,
       to_regclass('finance.opening_balances') AS finance_tbl;
-- 期望：恰好一个非空；两个都非空或都为空即停
SELECT count(*) FROM pg_constraint
WHERE confrelid='erp.opening_balances'::regclass AND contype='f';  -- 期望 0（无入向 FK）
SELECT count(*) FROM erp.opening_balances;  -- 记录行数，执行后必须不变
```

**硬顺序**：必须晚于 `20261121100000_erp_schema_canonical.sql`；若 canonical 尚未应用，先应用 canonical 再执行 W2-C。

**执行后**：`finance.opening_balances` 存在、`erp.opening_balances` 不存在；行数不变；索引/约束/RLS 随表移动；`check-ledger-ddl-drift` PASS。回滚 `database/rollback/20261121220000_finance_opening_balances_move.rollback.sql` 把表移回 erp。

### 4.11 P1-1：`20261118100000` 同窗口包

**同窗口二进制**：`qms`。迁移只做 RLS/FORCE/策略/索引，不改表结构、不改数据；旧 qms 二进制在缺少 `app.tenant_id` 时会 fail-closed 返回 0 行，必须同窗口发布。

**前置只读校验**：`qms.qa_inspection_plans`、`qms.qa_inspection_items`、`qms.qa_sampling_plans` 均存在、`rows=0`、`relrowsecurity=f`、0 条策略；必须晚于 `20261120230000_qms_schema_canonical.sql`。

**执行后**：3 表 `relrowsecurity=t`、`relforcerowsecurity=t`；各 1 条 `rls_tenant_isolation`；各 1 条 `idx_*_tenant_id` 索引；行数仍为 0。回滚 `database/rollback/20261118100000_qms_inspection_tables_rls_strict.rollback.sql` 关闭 RLS 并删除策略/索引。

### 4.12 W9：公司上下文两笔（`20261121235940` + `20261122090000`）

**同窗口二进制**：`erp`、`shared-auth`、`shared-db`。**不允许只上库或只上码**（§2.4 已列两种分批的后果）。

**前置只读校验**

1. 账本：两版本均不存在或 `success=f`；`20261114180000`、`20261120235900`、`20261121100000` 为 `success=t`（前两者版本号可能低于旧 prod max，须逐条查）。
2. 8 张表均存在、`relrowsecurity=t`、`relforcerowsecurity=t`、各 1 条 `rls_tenant_isolation`（ALL / PERMISSIVE / {public}，表达式 `COALESCE(current_setting('app.rls_system', true), 'off') = 'on' OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid`；原 `tenant_isolation_<表名>` 已被 `20261119210000` 改名）；`hrm.companies` 有 `(tenant_id, id)` 唯一约束 `uq_companies_tenant_id_id`；`erp.group_tenant_of(uuid)` 存在（W9-A 新策略的解析函数，不参与旧策略表达式）。
3. 公司列现状：仅 `consolidation_scope_companies` 在迁移前已有 `company_id`（NOT NULL）；`consolidation_scopes` / `consolidation_reports` / `consolidation_report_lines` / `elimination_rules` 的 `company_id` 由 W9-A 新增（可空）；`company_relations` 用 `parent/child_company_id`，`internal_transactions` / `elimination_candidates` 用 `from/to_company_id`。既有或重复执行场景下，非 NULL 的 `company_id` 行必须能通过 `company_readable()`；`period_version` 已存在时须为 `integer NOT NULL DEFAULT 1`。
4. `public.core_user_company_scopes.is_default` 不存在；同一 `(tenant_id,user_id)` 的 `is_default=true` 行数 ≤ 1（列已存在时）。
5. 同窗口发布物已就绪；`pg_dump` 备份完成（8 张 erp 表 + `core_user_company_scopes`）。

以上 1–5 与 C16 同节奏：窗口前 24h 与开窗前 30min 各只读复跑一次；任一项与预期不符即停。

**执行后断言（只读）**

```sql
-- 账本与指纹：两行 success=t，checksum 等于 §2.4 的 sha384
SELECT version, success, encode(checksum, 'hex')
FROM public._sqlx_migrations
WHERE version IN (20261121235940, 20261122090000);

-- 8 表：FORCE RLS + 每表 4 条策略
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity, count(p.policyname) AS policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname = n.nspname AND p.tablename = c.relname
WHERE n.nspname = 'erp'
  AND c.relname IN ('company_relations','internal_transactions','consolidation_scopes',
                    'consolidation_scope_companies','consolidation_reports',
                    'consolidation_report_lines','elimination_rules','elimination_candidates')
GROUP BY 1,2,3 ORDER BY 1;
-- 期望：每行 t | t | 4（策略名为 <表名>_company_select / _insert / _update / _delete）

-- 新列形状
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'erp'
  AND column_name IN ('company_id','period_version')
  AND table_name IN ('company_relations','internal_transactions','consolidation_scopes',
                     'consolidation_scope_companies','consolidation_reports',
                     'consolidation_report_lines','elimination_rules','elimination_candidates')
ORDER BY 1,2;
-- 期望共 7 行：company_id 5 行 = 4 张本次新增可空（consolidation_scopes /
--       consolidation_reports / consolidation_report_lines / elimination_rules）
--       + consolidation_scope_companies 既有 NOT NULL；
--       period_version 2 行 = 本次新增 integer NOT NULL DEFAULT 1
--       （仅 consolidation_reports / consolidation_report_lines）。
--       本次新增列合计 6 个，只分布在上述 4 张表。

-- 3 个解析函数存在且 SECURITY INVOKER
SELECT proname, prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'erp'
  AND proname IN ('current_company_id','parent_visible_company_ids','company_readable');
```

**行数表现（同一租户 T 内，A 为母公司，B/C 为子公司）**

| 会话 GUC / 头 | 8 表的 SELECT 预期 |
|---|---|
| 仅 `app.tenant_id=T`（无公司头、无系统通道） | **0 行**（fail-closed；含 `company_id IS NULL` 的历史行） |
| `app.company_id=A` | 公司列 = A 的行；双向表（`company_relations` / `internal_transactions` / `elimination_candidates`）任一侧 = A |
| `app.company_id=B` | 仅 B；看不到 A/C（兄弟公司互不可见） |
| `app.company_id=A` + `app.actor_is_parent=on` + `app.visible_company_ids={B,C}` | A + B + C（**只放读**；写仍仅 A） |
| 同上但 `visible_company_ids` 为空 | 仅 A |
| `app.rls_system=on`（仍需 tenant） | 租户内全部（含 NULL 公司历史行）；**写不豁免** |
| 跨租户（tenant=T1，行属 T2） | 0 行（租户谓词恒在） |

写侧不是「任一侧」：`company_relations` 要求 `parent_company_id = 当前公司`（子公司不能自行维护关系）；
`internal_transactions` / `elimination_candidates` 要求 from/to 任一侧等于当前公司；
其余 5 表（`consolidation_scopes` / `consolidation_scope_companies` / `consolidation_reports` / `consolidation_report_lines` / `elimination_rules`）要求 `company_id = 当前公司`。系统通道只放宽读，不放宽写。

**`is_default` 回填抽查（只读）**

```sql
-- 同一用户至多一条默认：应为 0 行
SELECT tenant_id, user_id, count(*) AS defaults
FROM public.core_user_company_scopes
WHERE is_default
GROUP BY 1,2 HAVING count(*) > 1;

-- 回填后不应有「无默认」的用户：应为 0 行
SELECT tenant_id, user_id
FROM public.core_user_company_scopes
GROUP BY 1,2
HAVING count(*) FILTER (WHERE is_default) = 0;

-- 默认必须是该用户最早一条：应为 0 行
SELECT s.tenant_id, s.user_id, s.id
FROM public.core_user_company_scopes s
WHERE s.is_default
  AND EXISTS (
      SELECT 1 FROM public.core_user_company_scopes e
      WHERE e.tenant_id = s.tenant_id AND e.user_id = s.user_id
        AND (e.created_at, e.id) < (s.created_at, s.id)
  );

-- 列与部分唯一索引
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='core_user_company_scopes'
  AND column_name='is_default';
-- 期望：boolean | NO | false

SELECT indexdef FROM pg_indexes
WHERE schemaname='public' AND indexname='uq_user_company_scopes_default';
-- 期望：UNIQUE ... (tenant_id, user_id) WHERE is_default

-- 抽样 20 条人工核对
SELECT id, tenant_id, user_id, company_id, is_default, created_at
FROM public.core_user_company_scopes
ORDER BY tenant_id, user_id, created_at LIMIT 20;
```

**回滚**：按 B→A 执行 `database/rollback/20261122090000_...rollback.sql`（删索引与列、自删账本行）与 `database/rollback/20261121235940_...rollback.sql`（每表删 4 条公司策略、恢复 1 条租户策略；删 6 列、4 FK、4 索引、3 函数，其中 6 列仅指上述 4 张表新增的 `company_id` / `period_version`，`consolidation_scope_companies.company_id` 为迁移前既有、不删）；A 不删账本行，需手工清理。回滚后同租户各公司恢复互相可见；上述新增列的回填值丢失，`scope_companies` 的既有 `company_id` 保留。

**与 MES 数量列的边界**：本波不触碰 `mes.*`；`20261120090000` 与 `20261122100000` 只保证 `mes.production_orders.quantity/completed_quantity` 同为 bigint，W9 前后该终态不变。二者仅共享「按版本号顺序应用」这一约束，无对象依赖。

---

## 5. 风险分级与回滚后状态

### 5.1 风险分级

| 等级 | 迁移 | 风险内容 | 已做的消减 |
|---|---|---|---|
| R1 destructive | W1/W2/W3 全部 | `DROP TABLE`（8/10/4 处标记） | 迁移内先归档到 `archive.*`；脚本运行前预演要求目标表行数全 0；票据 + GUC 双闸门；成对回滚文件 |
| R2 权限/策略语义 | W2 | 108 张中 30 张启用 RLS、31 条策略随表删除 | 归档表不继承 RLS/策略；回滚按 `_rls_policy_snapshot` 重建；窗口验收核对全局 -30/-31 |
| R2 权限/策略语义 | W3 | `finance.bootstrap_defaults()` 去掉 iam/flow/`iam.core_tenant_users` 分支，业务口径改为「public 是唯一租户权威」 | 11-19 实测 public 1 行、legacy 全 0 行（开窗前重测），补播输出不变；回滚恢复旧函数体 |
| R3 外键重指向 | W3 | `iam.core_tenant_plugins.tenant_id` 从 `iam.core_tenants` 改指 `public.core_tenants` | 列与 `ON DELETE CASCADE` 不变，插件代码零改动；外部入向 FK 已为 0；回滚改回原指向 |
| R3 外键重指向 | W2/W3 交界 | 108 批中 7 条 FK 指向 `iam.core_tenants` | 回滚必须 W3 先于 W2；文档与 preflight 均显式标注 |
| R2 权限/策略语义 | W5 | `iam.core_tenant_plugins` 首次启用 FORCE RLS，若应用缺少正确的 `app.tenant_id` 会 fail-closed 返回 0 行 | dev 运行期矩阵已验证（无 GUC → 0；本租户 → 1；系统通道 → 全量）；迁移幂等、0 行表、瞬时锁；回滚即删策略关 RLS |
| R2 权限/策略语义 | W6（W7-B） | 5 表 83 行中 74 行 `tenant_id` NULL→全零哨兵；删除 `rls_global_read`，`mobile.sync_policies` 可见范围净减少 | 迁移内断言 NULL=0、哨兵数、政策数；A/B 对抗与回滚演练通过；同窗口三二进制；回滚恢复 NULL 与全局读 |
| R3 对象迁移 | W8（W2-C） | `erp.opening_balances` 整体移入 finance；旧 finance 二进制读 erp 会 0 行/报错 | 仅 `SET SCHEMA`、不复制数据；无入向 FK 断言；同窗口 finance；回滚一句 `SET SCHEMA erp` |
| R2 权限/策略语义 | P1-1 | 3 张 QMS 表首次 FORCE RLS，旧 qms 缺 `app.tenant_id` 会返回 0 行 | 0 行表、只加 RLS/策略/索引；A/B 对抗；同窗口 qms；回滚即关 RLS 删策略 |
| R2 权限/策略语义 | W9-A | 8 张合并报表表从租户级收紧到公司维度；未接公司上下文的旧二进制 **读 0 行、写被拒** | 迁移无闸门 GUC、可重复执行；文件内先断言无越界数据；A/B 对抗（带/不带公司头、集团视角）；强制同窗口发布 erp + shared-auth + shared-db |
| R2 权限/策略语义 | W9-B | 回填改变隐式公司解析：多公司用户从「无上下文 → 0 行」变为「自动取最早一条为默认 → 可见」 | 属本波预期的可见性放开（仅租户内）；部分唯一索引保证至多一条；回滚删列即恢复旧行为 |
| R3 外键/回填 | W9-A/B | `company_id` / `period_version` 可推导回填，推导不出保持 NULL；FK 指向 `hrm.companies` | UPDATE 均带 `IS NULL` 前置条件且限定本租户；开窗前备份 8 表与 `core_user_company_scopes`；B 的标记 `max-rows: 100000` |
| R1 destructive | canonical 26 + drop 6 | 6 条 `drop_resurrected_dead_tables` 会删重启的死表；canonical 可能建表/加列 | 已核对与 132 张归档目标无交集；与代码同窗口、无独立回滚；执行前逐条看文件头 destructive 标记 |

### 5.2 回滚后状态

| 迁移 | 回滚动作 | 回滚后状态 |
|---|---|---|
| W5 | 删除 `rls_tenant_isolation` 策略 → 关闭 RLS/FORCE | `iam.core_tenant_plugins` 恢复 RLS `f/f`、0 策略；表结构与数据不变 |
| W3 | 按 manifest 恢复 8 张表（结构/数据/RLS/默认值/序列/出向外键）→ 恢复旧 `bootstrap_defaults()` → 插件 FK 改回 `iam.core_tenants` | 8 张表与旧函数体恢复；插件 FK 指向 `iam.core_tenants`；RLS/策略回到 W3 前现场值（11-19 旧值 913/1003 已失效）；archive 副本留存 |
| W2 | 按 manifest 恢复 108 张表、19 条批次内外键、30 张 RLS、31 条策略、依赖视图 | 108 张表恢复；RLS/策略回到 W2 前现场值（11-19 旧值 943/1034 已失效）；`iam.core_tenants` 已由 W3 回滚恢复，7 条 FK 可成功建立 |
| W1 | 按 manifest 恢复 16 张表、16 张 RLS、16 条策略 | 16 张表恢复；RLS/策略回到 W1 前现场值；archive 副本留存 |
| W6 | 恢复 74 行 `tenant_id` 为 NULL → 删除 `rls_platform_read` → 重建 `rls_global_read` | 5 表回到「全局读 + NULL」状态；RLS/FORCE 保持；行数不变 |
| W8 | `ALTER TABLE finance.opening_balances SET SCHEMA erp` | 表回到 erp；数据/索引/约束/RLS 随表回移；行数不变 |
| P1-1 | 关闭 3 表 RLS/FORCE → 删除策略与 tenant_id 索引 | 3 表回到无 RLS、0 策略、无新增索引；行数仍为 0 |
| W9 | B：删部分唯一索引与 `is_default` 列（自删账本行）；A：每表删 4 条公司策略 → 恢复 1 条 `rls_tenant_isolation`（ALL / PERMISSIVE / {public}，系统通道 OR 租户）→ 删 6 列、4 FK、4 索引、3 函数 | 8 表回到「租户内各公司互相可见」；`company_id` / `period_version` 回填值随列删除丢失；`is_default` 标记丢失。**A 的回滚不自删账本**，需手工删除 `20261121235940` 行；回滚后逐表策略名/命令类型/roles/表达式与窗口前置（`20261119210000` 改名 + canonical 重建后的 `rls_tenant_isolation`）完全一致，可原样还原；仅当跳过 `20261119210000` 单独补投 W9-A 时，前置才是 `tenant_isolation_<表名>`，需换口径 |

- 回滚只重建结构与数据，不恢复 GRANT/COMMENT；不写账本。
- 回到窗口前账本水位需手工删除对应 `_sqlx_migrations` 行；行数取开窗前现场值（11-19 旧值为 721，已失效）。
- 归档副本与 `archive._drop_manifest` 保留 180 天，供二次核对；彻底清除需另立清理单。

---

## 6. 开窗执行顺序（照抄）

1. T-0 四项门禁（§4.1）全过。
2. 按 §4.8 的命令由 DBA 用 `topems_prod` 只读复跑，132 张全部 READABLE 且 0 行，C16 转 PASS；同时记录 W6/W8/W9/P1-1 的前置值（§4.9–§4.12）。
3. W1：执行命令 → 跑 §4.2 五条验收 → 记录输出。
4. W2：执行命令 → 跑 §4.3 验收 + `1/1/4` 确认（现场值，不是旧值）→ 记录输出。
5. W3：执行命令 → 跑 §4.4 五条验收 → 记录输出。
6. W4：执行命令 → 跑 §4.5 三条验收（账本/权限码/无意外变化）→ 记录输出。
7. canonical 26 条 + 6 条 drop + 3 条修补：按版本号执行；逐条看文件头 destructive 标记；每批后核对账本 +1 与迁移内断言。
8. W8（W2-C）：确认 erp canonical 已应用、恰好一个 `opening_balances` 存在 → 执行 → 核对 finance 存在/erp 消失/行数不变。
8b. W9（公司上下文）：确认 **erp + shared-auth + shared-db 发布物已就绪**、§4.12 前置全过 → A → B → 跑 §4.12 的账本/结构/GUC 行数/`is_default` 抽查 → 记录回填行数。
9. W5：执行命令 → 跑 §4.6 三条验收（账本/RLS+策略/现场读数）→ 记录输出。
10. W6（W7-B）：核 §4.9 前置（16/48/17/1/1 与 8/48/16/1/1）→ 执行 → 核 §4.9 后置（NULL=0、9 策略、RLS+FORCE）→ A/B 查询。
11. P1-1：核 §4.11 前置（3 表 0 行、无 RLS）→ 执行 → 核后置（RLS+FORCE、3 策略、3 索引）。
12. 终态核对：按 §4.7 的“现场起点 + 相对增量”逐波记录（含 W9 的 8→32 策略、+6 列）；`check-ledger-ddl-drift.mjs` 再跑一次仍 PASS；不再对照 11-19 的 726/1351/914/1004。
13. 任一步失败：停止后续波次；该文件事务已整体回滚；按 §3.3 逆序恢复已成功的波次，再重新评审。

---

## 7. 范围外与已知差异

- `20261103000005`：dev 账本孤儿（有行、无文件），不属本窗口，不处理。
- 29 条 prod-only 版本：prod 已有、dev 没有；与本窗口五条无表集合交集，不纳入。
- 9 条早间计划版本（`20261119010000`、`20261119120000`、`20261119130000`、`20261119131000`、`20261119141000`、`20261119150000`、`20261119151000`、`20261119161000`、`20261119170000`）：dev/prod 均未落地，旧版文档曾纳入，本版剔除。`20261119140000` 已按拍板移出该清单，作为 W5 纳入本窗口。
- 工作树 `.verify/` 及其他线未跟踪文件：不动。
- 11-19 版只给 W4 补 destructive 标记块（§2.2），W5 不新增任何标记；**11-22 增补 W9 只改本文件，未改任何迁移/回滚/代码，不 push**。
- **W7-B `20261118110000` 与 P1 首批 `20261118100000` 的版本号低于旧 prod max `20261119000002`，不能用「版本号 > max」的差集发现**；本包按 manifest note 与迁移文件显式纳入。开窗前仍须以 `_sqlx_migrations` 实际缺失行为准。
- **新增候选（11-19 版写 36 条，11-22 实为 42 条）不默认全部待上**：其中可能有已随其他窗口进入生产的版本；本包只给仓库侧候选集与顺序依赖，生产差集必须现场重算。
- **已失效、需要重新取证**：prod/dev 账本行数与 max、全局表/RLS/策略数、权限码/授权数、archive 表数、W3 的 `iam.core_tenants` FK `8/1/4` 与 W2 后 `1/1/4`、132 张 `rows=0`、终态 `726/1351/914/1004`。旧值仅保留在 §1.1–§1.4 与 §4.7 作为历史对照。
- P1 首批与 W6 可以同窗口：两者对象集合无交集、均可在独立事务内回滚；但同窗口二进制需同时包含 `finance`、`unified-core`、`mobile`、`qms`，发布编排做不到时拆窗，W6 优先。
- **W9 与 W8/W6/P1-1 同窗的额外前提**：发布编排必须同时包含 `erp`、`shared-auth`、`shared-db`；若发布只能含其中一部分，W9 单独成窗，其余照旧。W9 不能拆成「先库后码」或「先码后库」（§2.4）。
- **W9 之外的三类新增不属本包**：W5C 三条（`20261121230000`/`20261121235900`/`20261121235930`）、MES 数量列 `20261122100000`、以及 11-22 之后可能继续进入主干的版本。`20261122100000` 只定稿 `mes.production_orders` 两列同为 bigint，与 W9 无交集；若生产账本尚未应用，按普通前向补丁随发布处理，不列为 RLS 窗口项。
- **旧读数失效补记**：§2.3「36 条」已失效（11-22 实为 42 条）；任何「合并报表 8 表各 1 条租户策略」的旧描述在 W9-A 后失效，终态为每表 4 条。
