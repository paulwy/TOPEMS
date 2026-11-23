# W13 第二段演练环境方案（2026-11-23）

> 性质：**只读盘点 + 方案**。本轮不写库、不建表、不执行 apply、不部署、不碰生产业务表、不改 `.env`、不改脚本与迁移；连接串与口令不回显。
> 目标：先盘清本机数据库事实，再回答「为什么所有库都有结构没数据」「需要什么程度的数据库」「要不要造数据」「`topems_prod` 该干什么」，给出可执行、可审批的分步方案。
> 证据口径：本机 PostgreSQL 18.4（Homebrew，socket/peer 连接），全部查询带 `default_transaction_read_only=on`。

---

## 0. 六问速答

| # | 问题 | 结论 |
|---|---|---|
| 1 | 根因 | 四层叠加：变量指向的库本就不承载业务数据 → 新建库只从「基线快照 + 参考数据」重放 → 有 W13 结构的库是 schema 快照、有业务行的库没 W13 结构 → 演练方法本身只断言结构，不校验业务归属。 |
| 2 | 是否需要一套完整数据库 | 需要**结构完整 + 最小业务样本**，不需要生产量级数据；只有结构会让四个验收项全部空跑。 |
| 3 | 是否必须部署后才能验证 | 回填正确性、零 NULL、影子读比对、RLS 可见性可本地验证；写入路径、真实流量下的双写/性能/UI 必须部署后验证。 |
| 4 | 是否需要模拟数据 | 需要。用**可版本化、幂等的 SQL seed**，覆盖多租户（含 0 公司、多根负样本）、三层公司、三类归属分支；不用一次性手工灌入，也不做成不可追溯的夹具库。 |
| 5 | `topems_prod` 的作用 | 只做真实数据源、只读取证/基线、生产窗口执行对象；**不得**做迁移演练、RLS 演练、回填 dry-run/apply 或任何写操作。 |
| 6 | 其他更完善的方案 | A 在 dev 前向 + seed；B 新建专用演练库 + seed；C 预发/部署后脱敏数据；D 只做结构演练。推荐 **E = B（当前）+ C（部署后补运行态）**。 |

---

## 1. 事实核查

### 1.1 本机 TOPEMS 相关库（逐个）

说明：
- 「租户」取 `public.core_tenants`；`iam.core_tenants` 只在部分库存在且全部 0 行，不是现行租户主表。
- 「W13」为迁移 `20261123140000 / 141000 / 142000` 是否在 `public._sqlx_migrations` 中登记。
- `-` 表示该表不存在；`ERR` 表示库内无 `_sqlx_migrations` 或无业务 schema。

| 库名 | 用途（判定） | 账本 max | 租户 | 公司 | 关系 | 销单 | 购单 | 客户 | v2 | W13 |
|---|---|---|---:|---:|---:|---:|---:|---:|---|---|
| `topems` | 本地开发主库；`.env` 三个变量指向 | `20261119233000` | 61 | 1 | 0 | 0 | 0 | 0 | - | N |
| `topems_prod` | **生产库**（launchd 常驻、11 个活动连接） | `20261119000002` | 1 | 1 | 0 | 0 | 3 | 0 | - | N |
| `topems_test` | 测试主库；mobile 冒烟直接复用 | `20261122160000` | 1 | 0 | 0 | 0 | 0 | 0 | - | N |
| `topems_test_runner` | `TEST_DATABASE_URL` 指向的非特权演练/测试库 | 空 | 0 | 0 | 0 | 0 | 0 | 0 | 有 | N |
| `topems_status_baseline_verify` | **11-23 目录基线校验库** | `20261123142000` | 1 | 0 | 0 | 0 | 0 | 0 | 有 | **Y/Y/Y** |
| `topems_snap_20261118` | 11-17 锚点快照 | `20261117235500` | 1 | 1 | 0 | 0 | 0 | 0 | - | N |
| `topems_rls_baseline_20261118` | RLS 基线快照（无账本） | 空 | 1 | 0 | 0 | 0 | 0 | 0 | - | N |
| `topems_rls_baseline_all111_20261118` | RLS 基线快照（无账本） | 空 | 1 | 0 | 0 | 0 | 0 | 0 | - | N |
| `topems_rls_company_test` | 公司级 RLS **手工夹具** | `20261121235930` | 1 | **5** | **2** | 0 | 0 | 0 | - | N |
| `topems_rls_scratch_20261118_r5` | 11-17 锚点 RLS 草稿库 | `20261117235500` | 1 | 1 | 0 | 0 | 0 | 0 | - | N |
| `topems_drift_check` | 漂移检查克隆库 | `20261122090000` | 1 | 0 | 0 | 0 | 0 | 0 | - | N |
| `topems_gate` | `MIGRATION_DRIFT_DB_URL` 指向的漂移门禁库 | `20261122160000` | 1 | 0 | 0 | 0 | 0 | 0 | - | N |
| `topems_guc_probe2` | GUC 探针（仅 2 张表） | `20991231000003` | - | - | - | - | - | - | - | N |
| `topems_p0_rehearsal` | P0 演练库 | `20261107000035` | 2 | 0 | 0 | 0 | 0 | 0 | - | N |
| `topems_prepare` | 早期准备库 | `20261105190000` | 1 | 0 | 0 | 0 | 0 | 0 | - | N |
| `topems_rehearsal2` | 早期演练库 | `20261105235700` | 1 | 0 | 0 | 0 | 0 | 0 | - | N |
| `topems_drill_b1` | W12-B1 隔离演练（2 家手工公司） | 空 | 0 | 2 | 0 | 0 | 0 | 0 | - | N |
| `topems_drill_b2` | W12-B2 隔离演练（2 家手工公司） | 空 | 0 | 2 | 0 | 0 | 0 | 0 | 有 | 账本空、结构有 |
| `topems_w7b4_ehs_reh` | W7-B4 EHS 演练 | `20261112160000` | 1 | 1 | 0 | 0 | 0 | 0 | - | N |
| `topems_w9_probe` | W9 公司维度探针 | `20261117235500` | 1 | 0 | 0 | 0 | 0 | 0 | - | N |
| `topems_dev_audit` | dev 审计副本 | `20261119000002` | 61 | 1 | 0 | 0 | 0 | 0 | - | N |
| `topems_web_smoke` | Web 冒烟专用 | `20261121235930` | 1 | 0 | 0 | 0 | 0 | 0 | - | N |
| `topems_defense` | 空库（0 表） | - | - | - | - | - | - | - | - | - |
| `topems_smoke` | 空库（0 表） | - | - | - | - | - | - | - | - | - |
| `m2_dryrun_20261116` | M2 干跑库 | `20261115142500` | 1 | 1 | 0 | 0 | 0 | 0 | - | N |

**要点：**
1. **唯一具备 W13 结构的库是 `topems_status_baseline_verify`**，但它业务表全空。
2. **唯一有业务行的库是 `topems_prod`**（1 租户/1 公司/3 采购单），但停在 11-19 水位、没有 W13 结构。
3. `topems` 有 61 个租户，但订单/客户/关系全 0；这些租户是历史演练/演示留下的壳，不构成业务数据。
4. `topems_drill_b2` 与 `topems_test_runner` 结构自相矛盾：前者有 W13 列与 v2 但账本为空，后者有 v2 却**没有** `company_id` 列；两者都不能作为「迁移链终态」的可信代表。
5. 文档里写的只读预检连接 `topems_drift` **不是数据库**，而是一个非特权、无 `BYPASSRLS`、属于 `pg_read_all_data` 的**角色**；本机没有名为 `topems_drift` 的库。
6. 另有 1 个 `_sqlx_test_*` 自动测试库（`sqlx::test` 的临时产物），非受管环境，不纳入用途判定。

### 1.2 `topems_prod` 到底是什么

判定：**是本机上的生产库，不是演练库。**

证据：
- 账本 `max(version)=20261119000002`、721 条、0 失败，与 `window-readiness-2026-11-19.md` 记录的生产读数逐字一致；
- `~/Library/LaunchAgents/com.topems.server.plist` 存在（11-18 23:14），`pg_stat_activity` 显示该库有 **11 个活动连接**；
- `backup-topems.sh` 明确注释「Daily pg_dump of topems_prod」，每日备份对象就是它；
- `database/migration_manifest.yaml`、`database/table_archive_register.yaml`、`database/migration-exemptions.json` 均把它登记为生产；
- 文档侧 `docs/` 下 145 个文件提到 `topems_prod`（含 `database/` 共 152 个）。

引用面（只列判定结论）：
- 写入/变更：仅生产窗口脚本与 rollback 文件；
- 只读取证：`backup-topems.sh`（`pg_dump`）、`scripts/mes_guard.sh`（默认 `SNAPSHOT_DB=topems_prod`，走 `default_transaction_read_only=on`）、`scripts/refresh-prod-cols.sh`；
- 防护：`scripts/ci/check-no-prod-dsn-defaults.sh`、`scripts/ci/check-prod-migration-entry.mjs`、lefthook 的 PROD-DSN 守卫；
- `.env`：**没有任何变量指向 `topems_prod`**（见 §1.3）。

业务数据：`public.core_tenants=1`、`hrm.companies=1`、`erp.company_relations=0`、`erp.sales_orders=0`、`erp.purchase_orders=3`、`erp.customers=0`，`search_entity_projections_v2` 不存在。也就是说，**生产本身也几乎是空业务库**，但它的身份仍是生产。

> 过程披露：盘点脚本在确认该库生产属性之前，对它执行过一次聚合 `count(*)`（仅返回行数，未读取任何行内容）。确认生产属性后，后续查询全部改为元数据/统计视图，未再扫描业务表。建议把「先判身份、再决定是否允许计数」固化为盘点工具的前置守卫。

### 1.3 `.env` 数据库变量与门禁读取关系

只报变量名与目标库名（不报连接串）：

| 变量 | 目标库 | 谁读取 |
|---|---|---|
| `DATABASE_URL` | `topems` | 通用本地连接、`mes_guard.sh` 的编译参考库回退、部分脚本 |
| `MIGRATE_URL` | `topems` | `dump-status-checks.mjs` 的最终回退 |
| `STATUS_CATALOG_DB_URL` | `topems` | `scripts/ci/dump-status-checks.mjs`（status-catalog 门禁） |
| `MIGRATION_DRIFT_DB_URL` | `topems_gate` | `check-ledger-ddl-drift.sh` / `check-ledger-ddl-drift.mjs` |
| `TEST_DATABASE_URL` | `topems_test_runner` | `run-migration-drill.sh`、`web_smoke_precommit.sh`、`mobile_smoke_precommit.sh`、Rust DB 测试 |
| （无）`RLS_POLICY_DB_URL` | 未设置 | `check-rls-policy-snapshot.mjs` 按回退链取值 |

关键错位与风险：
1. `STATUS_CATALOG_DB_URL` 指向 `topems`，而该库与仓库 11-23 目录**全量比对 FAIL**：库中 31 条状态 CHECK（目录 33 条），少 2 条（`hrm.contracts.ck_hrm_contracts_status_standard`、`integration.mes_erp_sync.ck_mes_erp_sync_success_requires_mes_order`），另有 3 条定义不一致；无约束列 706（目录 683）。门禁用 `--changed-only` 只校验改动对象，所以平时不报，但**全量口径已经漂移**，不能再用它证明「目录与库一致」。
2. lefthook 内部注释自相矛盾：第 252 行已写「`.env` 的 `MIGRATE_URL` 已指向本地开发库」，第 811 行仍写「通常是 `topems_prod`」。后者会误导人把生产当默认迁移目标，应改为运行时探测。
3. `topems_drift` 是**角色**不是库；文档若写成「连接 topems_drift」会让人误以为存在同名库。
4. 没有任何变量指向有 W13 结构的库，也没有任何变量指向有业务数据的库；这就是「本地怎么跑都只有结构」的第一层原因。

### 1.4 现有演练方法

现状是三条互不相通的路：

**路线一：锚点重放（结构与门禁演练）**
- 锚点 `20261117235500`，资产在 `database/baseline/`：`baseline_20261117235500.sql.gz`（schema）+ `_data.sql.gz`（参考数据）+ `anchors.json`。
- `scripts/dev/run-migration-drill.sh anchor`：临时建库（`topems_drill_template` 提供扩展）→ 恢复锚点 schema/账本/参考数据 → 应用前向迁移 → 断言表/策略/权限码/参考数据行数 → 比对 `rls_policy_expected.json`。
- 参考数据只有 **10 张表 4740 行**（权限、菜单、币种、字典、默认角色等），**不含公司、客户、订单**。
- 结果：每次都得到「结构完整、业务为空」的库。门禁的通过条件也只看结构，所以空数据不影响它。

**路线二：手工夹具（公司级 RLS 演练）**
- `topems_rls_company_test`：5 家公司、2 条关系（母公司 P、子公司 C1/C2，另有 2 家位于其他租户的公司），0 订单/客户。
- `topems_drill_b1/b2`：各 2 家公司（演练母公司/演练子公司），0 关系、0 订单/客户；b2 甚至从含 W13 结构的镜像克隆而来，但账本为空。
- 这些夹具**不在仓库里**（全仓搜索不到生成脚本），属于「一次性手工灌入」，不可复现、不可 code review、无法在 CI 重放。

**路线三：冒烟与测试（运行态但不碰业务数据）**
- `web_smoke_precommit.sh` 从基线资产建 `topems_web_smoke` 再前向迁移，验证接口/契约；
- `mobile_smoke_precommit.sh` 直接复用 `topems_test`；
- Rust DB 测试用 `sqlx::test` 自建隔离库并插自己的极小夹具，覆盖的是单模块行为，不是 W13 归属链路。

**现有 demo 种子覆盖面**
- `database/seeds/seed_demo_business_data.sql`：3 供应商、5 物料、5 库存、3 采购单，全部租户 `…0001`，**没有公司、客户、销售订单**；
- `scripts/dev/seed-e2e-core.sql`：覆盖权限/租户等，不覆盖 ERP 公司/订单归属。

**结论：现有方法能证明「迁移链与策略快照一致」，不能证明「归属回填正确」。**

### 1.5 关键事实：结构与数据长期错位

| 维度 | 有 W13 结构 | 有业务数据 |
|---|---|---|
| `topems_status_baseline_verify` | 是 | 否（全 0） |
| `topems_prod` | 否 | 近空（1 公司/3 采购单） |
| `topems` | 否 | 否（61 租户、0 订单） |
| 其余库 | 否（b2 例外但账本空） | 否 |

一句话：**有结构的库没数据，有数据的库没结构，有租户的库没业务。**

---

## 2. 根因（分四层）

### 第 1 层：环境变量指向

- 默认变量全部指向「壳库」：`topems`（开发壳）、`topems_test_runner`（空模板）、`topems_gate`（漂移门禁壳）；
- 没有任何变量指向「有 W13 结构」或「有业务数据」的库；
- `STATUS_CATALOG_DB_URL` 还与当前目录漂移，导致「目录一致性」这件事本身没有被持续校验。

### 第 2 层：库的重建方式

- 唯一受支持的新库供给路径是「锚点 schema + 账本 + 参考数据 → 前向迁移」；
- 参考数据刻意只包含配置/字典类 10 张表，不含业务表；
- 因此**每次重建都必然得到业务为空的库**，这不是意外，是设计结果。

### 第 3 层：迁移没有在数据-bearing 库上应用

- 生产停在 `20261119000002`，开发 `topems` 停在 `20261119233000`，都早于 W13；
- 只有 `topems_status_baseline_verify` 应用了 `140000/141000/142000`，而它是 schema 校验库；
- `topems_test_runner` 甚至出现「v2 存在但 `company_id` 列不存在」的部分结构；
- 结果：**结构最新与数据最新从未同时发生在一个库上。**

### 第 4 层：演练方法只验证结构

- 锚点演练的断言对象是表、策略、权限码、参考数据行数；
- 公司级 RLS 演练靠手工插 2～5 家公司，不插订单/客户；
- 冒烟验证 200/契约，不验证归属；
- 因此「W13 第二段的四个验收项」在现有方法里**没有承接者**。

---

## 3. 是否需要一套完整数据库

### 判断：需要「结构完整 + 最小业务样本」，不需要生产量级

依据是 W13 第二段的四个验收项：

| 验收项 | 只有结构会怎样 | 需要什么数据 |
|---|---|---|
| 回填 | 0 行可回填，「成功」无意义 | 有 `company_id IS NULL` 的订单，且客户有不同归属 |
| 零 NULL | 本来就是 0，断言恒真 | 回填后应覆盖的目标行集合 |
| 影子读比对 | v1/v2 都是 0 行，差异恒 0 | 两侧都有投影行的订单/客户 |
| 例外签字 | 没有兜底/例外行可签 | 无自然归属、跨公司、数据缺失等分支 |

所以：
- **结构必须完整**：`140000/141000/142000` + 公司维度函数 + RLS 策略 + v2 表；
- **数据必须够分支**：不是「有一点数据」，而是「每个归属分支至少 1 行」；
- **不需要**生产全量、不需要真实金额、不需要历史深度；规模以「能覆盖分支 + 能压出索引/分页」为上限。

---

## 4. 是否必须部署后才能验证

### 可在本地/演练库验证（不依赖部署）

1. 迁移应用与幂等（重复执行不重复写）；
2. `--resolve-parents` 的根公司判定与 PENDING 口径；
3. `--draft` 四规则与优先级、CSV 字段完整性；
4. 回填脚本的覆盖、幂等、fail-closed（`--dry-run` 全量报告、未匹配逐行输出）；
5. 零 NULL 断言；
6. v1/v2 影子读比对（纯 SQL 对拍）；
7. 非特权角色下的 RLS 可见性（跨租户 0 行、跨公司 0 行、母公司可见）。

### 必须部署后验证（依赖真实服务/流量）

1. 写入路径是否真的带公司上下文写入 `company_id`（服务代码 + 请求头/会话）；
2. 搜索双写的延迟、失败率、追平机制；
3. 真实请求下母公司/子公司的可见范围与 UI 过滤；
4. 大表回填的锁、时长、索引膨胀；
5. 生产窗口的回滚路径。

**结论：数据正确性不必等部署；部署后补的是运行态与性能。不能用「等部署」替代本地数据验收，也不能用本地结构验收替代部署验收。**

---

## 5. 是否需要模拟数据

### 判断：需要，而且必须版本化

### 5.1 数据方案

**租户（4 个）**

| 租户 | 形态 | 目的 |
|---|---|---|
| T1 | 三层集团：母公司 P → 子公司 C1/C2，C1 → 孙公司 C1a | 正常母公司/子公司/跨公司分支 |
| T2 | 独立根 Q → 子公司 Q1 | 跨租户负样本（T1 订单不得引用 T2 客户） |
| T3 | 0 家公司 | 验证 `PENDING-零根` fail-closed |
| T4 | 2 个无关系根 | 验证 `PENDING-多根` 与待指定清单 |

另加：C2 设为 `deleted_at` 非空、Q1 设为 `status=inactive`，验证过滤条件。

**公司（共 9 家）**：T1 的 P、C1、C2、C1a、C3（5 家），T2 的 Q、Q1（2 家），T4 的 R1、R2（2 家）。

**客户/供应商样本（各 6 条）**

| 编号 | 归属形态 | 期望规则 |
|---|---|---|
| CU1 | `group_company_id=C1`（子公司） | 客户所属公司 |
| CU2 | `group_company_id=NULL`、`is_group_company=false` | 客户无公司归属 → 兜底 |
| CU3 | `group_company_id=P`、`is_group_company=true` | 母公司级 |
| CU4 | `group_company_id=C3`（兄弟公司） | 跨公司 |
| CU5 | `deleted_at` 非空 | 数据缺失 → 兜底 |
| CU6 | 属于 T2 | 跨租户负样本（若外键不允许则改为「逻辑跨租户」并在报告中标注） |

供应商 SU1～SU6 按同一矩阵对称构造。

**订单样本（销售/采购各 8 条）**

| 编号 | 形态 | 覆盖点 |
|---|---|---|
| O1 | `customer_id IS NULL` | 无客户 → 兜底 |
| O2 | 客户 = CU3（母公司） | 母公司级 |
| O3 | 客户 = CU1（子公司） | 客户所属公司 |
| O4 | 客户 = CU2（无归属） | 兜底-数据缺失 |
| O5 | 客户 = CU4（跨公司） | 跨公司异常 |
| O6 | 客户 = CU5（已删除） | 数据缺失 |
| O7 | `company_id` 已预填 | 幂等/不覆盖 |
| O8 | 客户 = CU6（跨租户） | 隔离负样本 |

采购订单 PO1～PO8 用供应商镜像同一矩阵。

**v2 投影**：为所有订单与客户各造 1 条 v1、1 条 v2 投影，确保影子比对有对象。

**规模上限**
- 正确性档：上述约 30 条订单/客户，秒级重建；
- 性能档（可选）：单租户 200 公司、2,000 客户/供应商、20,000 订单，总量 ≤ 5 万行；
- 上限理由：覆盖分页/索引/回填耗时，又不至于让演练库超过 ~100 MB、重建超过 1 分钟。

### 5.2 存在形式：版本化 SQL seed（推荐）

放在 `database/seeds/seed_w13_company_scope_rehearsal.sql`，配套校验 SQL（输出每类计数与期望值）。

理由：
1. **与现有惯例一致**：仓库已有 `database/seeds/*.sql` 与 `scripts/dev/seed-e2e-core.sql`，都是幂等 SQL；
2. **可 review**：固定 UUID、`ON CONFLICT DO NOTHING`，diff 即变更；
3. **可重放**：同一份脚本可灌 dev / 演练库 / 预发，不依赖某台机器的物理库；
4. **可进 CI**：演练脚本显式调用，避免 `topems_rls_company_test` 那种「手工夹具、不可追溯」的问题；
5. **安全**：脚本头部加库名守卫，数据库名匹配 `*prod*` 时直接退出。

不选其他形式的原因：
- 夹具库（clone 后手改）：不可 diff、不可复现、换机即失效；
- 一次性手工灌入：无法在 CI 与多人环境重放，正是当前问题的成因；
- 放进 migrations：业务数据会进入生产迁移链，属于禁忌。

---

## 6. `topems_prod` 的作用边界

### 应该承担

1. **唯一真实数据源**：生产窗口前的只读取证、锚点/结构指纹、漂移比对；
2. **生产窗口执行对象**：只由受控脚本在审批后执行，不在演练中使用；
3. **备份与灾备对象**：`backup-topems.sh` 的每日 dump；
4. **只读元数据访问**：用 `topems_drift` 角色（非 superuser、无 `BYPASSRLS`）做 preflight。

### 不应该承担

1. 迁移演练（锚点重放应在临时库）；
2. RLS 演练（需要写策略/写数据，禁止）；
3. 回填 `--dry-run` / `--apply`（dry-run 也应对演练库做，避免误连）；
4. 任何 `INSERT/UPDATE/DELETE/DDL`；
5. 业务表全表扫描（除非显式审批的只读统计窗口）。

### 如果现在被当演练库用

**明确不能这么用。** 本机 `topems_prod` 是活生产（11 个活动连接）。`mes_guard.sh` 以它作只读快照、`backup-topems.sh` 以它作 dump 源，这属于「只读取证」，可以；但任何写演练、任何 `w13_backfill_company_attribution.py --apply` 都绝不能在它上面跑。当前 `.env` 没有指向它，这是对的，必须保持；同时应把「库名含 prod 一律拒绝」写进回填/演练脚本的守卫。

---

## 7. 备选方案对比

| 选项 | 做法 | 成本 | 覆盖回填 | 覆盖零 NULL | 覆盖影子比对 | 覆盖例外签字 | 遗留风险 |
|---|---|---|---|---|---|---|---|
| A | 在现有 dev `topems` 上应用 W13 三条迁移 + 灌 seed | 中高 | ✅ | ✅ | ✅ | ✅ | dev 从 11-19 前向到 11-23 跨百余条迁移；61 个历史租户可能被迁移影响；多人共用，污染开发环境 |
| **B（推荐）** | 新建专用演练库 `topems_w13_rehearsal`（从 11-23 基线库克隆，或锚点 + 前向）+ 版本化 seed | 中低 | ✅ | ✅ | ✅ | ✅ | 需确认基线库账本口径（795 条 vs 仓库 854 个文件；59 个仓库版本不在该账本、28 个该库版本不在 dev 账本，说明它不是 dev 的前向延续）；克隆需短暂独占连接 |
| C | 等部署后在预发环境用脱敏数据演练 | 高 | ✅ | ✅ | ✅ | ✅ | 阻塞第二段直到部署；脱敏不彻底有合规风险；环境不一定有 W13 所需的数据分支 |
| D | 只做结构性演练，把数据演练顺延 | 低 | ❌ | ❌ | ❌ | ❌ | 四项验收全部无法签字，风险推给生产窗口 |
| E | B + 部署后 C 补运行态 | 中 | ✅ | ✅ | ✅ | ✅ | 需要两段排期；B 的结论需在 C 中复核写入路径 |

### 推荐：E（B 为当前动作，C 为部署后补充）

理由：
1. **一步到位**：B 能在本地一次覆盖四个验收项，不依赖部署、不被窗口阻塞；
2. **通用**：seed 与校验 SQL 可复用到 dev、预发、CI，换环境不改脚本；
3. **不碰生产、不污染 dev**：专用库可随时丢弃重建；
4. **风险可控**：B 的已知缺口（迁移链前向）由既有锚点演练覆盖，二者互补；
5. **部署后仍有增量**：C 只补写入路径/双写/性能，不重复数据正确性验证。

---

## 8. 分步动作清单

| # | 动作 | 执行人 | 批准人 | 触生产 |
|---|---|---|---|---|
| 0 | 拍板数据方案与规模档（正确性档 / 是否加性能档） | 用户（技术负责人） + 业务负责人 | 用户 | 否 |
| 1 | 冻结基线：记录 commit、catalog 版本、账本 max、基线库名 | 研发 | 研发负责人 | 否 |
| 2 | 建 `topems_w13_rehearsal`：`createdb --template=topems_status_baseline_verify`（模板需无活动连接；否则用 `pg_dump`/restore，或锚点 + 前向） | DBA/研发 | 研发负责人 | 否 |
| 3 | 编写 seed 与校验 SQL，业务评审分支覆盖 | 研发 | 业务负责人 | 否 |
| 4 | 灌 seed，跑校验 SQL，确认每类计数与期望一致 | 研发 | 研发负责人 | 否 |
| 5 | 跑 `--resolve-parents`，确认 T3 零根 / T4 多根进入待指定清单 | 研发 | 研发负责人 | 否 |
| 6 | 跑 `--draft` 生成归属清单 CSV | 研发 | 研发负责人 | 否 |
| 7 | 业务复核 CSV，指定零根/多根租户的主办公司，签署例外说明 | 业务负责人 | 用户 | 否 |
| 8 | `--dry-run` 全量报告，确认 0 未匹配、0 冲突 | 研发 | 研发负责人 | 否 |
| 9 | `--apply` 写入演练库源表与 v2 | 研发 | 用户 | 否 |
| 10 | 零 NULL 断言 + v1/v2 影子读比对 + 非特权角色 RLS 断言 | 研发 + 测试 | 研发负责人 | 否 |
| 11 | 生产窗口前 preflight（只读、用 `topems_drift` 角色） | DBA | 用户 + 变更审批 | 只读 |
| 12 | 生产窗口执行 W13 第二段 | DBA | 变更审批 | **是** |
| 13 | 部署后运行态验收（写入路径、双写、性能、UI） | 研发 + 测试 | 用户 | 只读业务 |
| 14 | 归档演练产物与签字回执 | 研发 | 研发负责人 | 否 |

> 第 9 步只允许在 `topems_w13_rehearsal` 执行；脚本需自带「库名含 prod 拒绝」守卫。第 12 步才触生产，且必须与第 11 步的 preflight 读数一致。

---

## 9. 需要用户拍板的点

1. **是否同意新建专用演练库**（约 120 MB，本地磁盘），而不是在 `topems` 上前向。
2. **数据规模档**：只做正确性档（约 30 条），还是加性能档（≤5 万行）。
3. **是否接受 `topems_status_baseline_verify` 作为结构基线**：它账本 795 条、仓库迁移文件 854 个；59 个仓库版本不在它账本里，28 个它账本里的版本不在 dev 账本里，说明它是锚点重建而非 dev 前向延续。若只用于 W13 数据验收可以接受；若要同时验证「dev/生产前向到 W13」，第 2 步应改用锚点 + 前向。
4. **T4 多根租户是否入样**：入样会让 `--apply` 被 fail-closed 拦下，必须业务先指定根公司；不入样则少一个负样本。
5. **生产只读 preflight 用哪个角色**：建议 `topems_drift`（非 superuser、无 `BYPASSRLS`），口令由 DBA 管理，不写入 `.env`。
6. **门禁口径是否本轮一并修正**：`STATUS_CATALOG_DB_URL` 指向的 `topems` 与 11-23 目录全量比对 FAIL；本轮只写文档，修正留待单独变更。

---

## 附录 A：只读盘点口径

- 连接：unix socket / OS 用户 `xingzhai`；不拼接、不回显 DSN 与口令。
- 每个会话首句 `set default_transaction_read_only=on`；仅 `SELECT`，未建临时表、未写任何表、未执行 apply。
- 生产库：确认身份后只做账本/元数据/统计视图查询；业务表计数仅限身份确认前的一次聚合（已披露）。
- 结果留存于临时目录，未写入仓库；本文为唯一归档。

## 附录 B：相关既有材料

| 材料 | 作用 |
|---|---|
| `docs/quality/environment-provisioning.md` | 锚点供给与参考数据边界 |
| `docs/database/window-execution-checklist-2026-11-21.md` §5C/§5D | W13 第二段命令与签字前置 |
| `docs/database/rls-business-confirmation-2026-11-23.md` §5/§8 | CSV 责任、规则优先级、例外签字 |
| `docs/database/rls-company-scope-remediation-plan-2026-11-23.md` | 公司级改造清单与分档 |
| `database/baseline/anchors.json` | 锚点版本 |
| `database/seeds/seed_demo_business_data.sql` | 现有 demo 种子（无公司维度） |
| `scripts/dev/run-migration-drill.sh` | 锚点重放实现 |
| `scripts/db/w13_backfill_company_attribution.py` | `--resolve-parents` / `--draft` / `--apply` |
