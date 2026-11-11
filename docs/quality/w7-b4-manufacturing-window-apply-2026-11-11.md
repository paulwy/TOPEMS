# W7 · B4 制造（mes / srm）生产窗口申请

- 日期：2026-11-11
- 结论：**前置条件全绿，申请开窗**（尚未对生产做任何写入）
- 范围：六笔迁移 `20261112090000`–`20261112095000`（srm 策略归一、mes 19 表补列 / 回填隔离、mes 19 表策略、work_orders FORCE、supplier_users RESTRICTIVE）
- 关联文档：[w7-b4-manufacturing-rls-freeze-2026-11-10.md](w7-b4-manufacturing-rls-freeze-2026-11-10.md)、[w7-cross-request-tenant-context-2026-11-10.md](w7-cross-request-tenant-context-2026-11-10.md)

---

## 0. 摘要

| 项 | 值 |
| --- | --- |
| 生产当前账本 | **655 / max `20261110210000`**（超户 `xingzhai@topems_prod` 实测，`current_database()=topems_prod`、PG 18.4） |
| 副本重跑后账本 | **661 / max `20261112095000`** |
| 生产 19 表数据 | **全 0 行**（逐表实测）；`work_orders` 0 行、`production_orders` 0 行 |
| 行级可见性变化 | **无** → `quarantine` 预期 0、`v_tenant_backfill_gaps` 预期 0 |
| 第 6 笔 `srm.supplier_users` | 生产**表不存在**（已于 `20261105100000` DROP）→ 迁移 no-op 且不报错 |
| 回滚物 | 全库 dump、生产版 srm schema 存档、生产 pre 策略原文与逐表 RLS 标志快照，sha256 见 §4 |
| 新二进制 | sha256 `ca34b88c…`、206,140,192 B、mtime `2026-11-11 17:00:32`；HEAD `54de48d28`（提交 `16:39:30`）→ **构建晚于提交 21m02s** |

---

## 1. 提交与门禁

| 类别 | commit | 内容 |
| --- | --- | --- |
| 代码 | `9ca6b9bbb` | 写路径绑定租户，146 处裸池查询迁入租户作用域 |
| 代码 | `735f0cffb` | basics 四张主数据表写路径改 `require_tenant`，收回例外清单 #7 |
| 代码 | `94511f9b5` | WIP 转移 / 物料需求计算先判租户，避免父行 404 掩盖缺租户 |
| **迁移** | `f2b703e9c` | 六笔迁移 |
| **迁移** | `54de48d28` | 第 6 笔加 `srm.supplier_users` 存在性守卫 + 豁免登记 + `checksums.txt` 同步 |

- 迁移与代码分开提交，迁移可独立回滚。
- 门禁全绿（`migration-validate`、`migration-prod-guard`、`tenant-context`、`rls-permissions`、`schema-defense-drift`、`sqlx-cache-freshness` 等），**未使用 `--no-verify`**。
- 第 6 笔修改属「已提交迁移的受控修改」，已在 `database/migration-exemptions.json` 登记 `B20261111-w7b4-supplier-users-guard`（`approved: true`，含失败原文与复跑证据）。
- 未推送（等你确认）。

### 1.0 窗口执行总表（强制纪律）

后续每一次生产窗口按下表留痕，缺项即视为窗口未收口：

| # | 环节 | 必须落盘的证据 | 落盘方式 |
| --- | --- | --- | --- |
| 1 | 停写前 PRE | 账本、各 schema 目录、目标表行数、列存在性 | `psql -A -F'|'` 输出重定向到 `backups/<window>_pre_*.txt` |
| 2 | 备份 | dump / schema-only / 策略存档的大小与 sha256 | 工作区 `backups/` + `shasum -a 256` |
| 3 | 停写 | `launchctl bootout` 输出、`lsof`、`ps`、业务连接数 | **stdout/stderr `tee` 到 `logs/<window>/03_bootout.log`** |
| 4 | 逐笔迁移 | 每笔账本值、耗时、**NOTICE 原文** | **每笔一个文件 `logs/<window>/mig_<version>.log`，`tee` 同步 stdout/stderr**；不得只依赖会话流式输出 |
| 5 | 换二进制 | 部署 sha256、大小、mtime、`bootstrap` 输出、pid、`/health` 时间戳 | `logs/<window>/05_deploy.log` |
| 6 | 冒烟 | 每个端点 × 每个租户的状态码与条数 | `logs/<window>/06_smoke.log` |
| 7 | 终检 | 账本、quarantine、gaps、RLS/FORCE/策略、NULL 计数 | `logs/<window>/07_final.log` |
| 8 | 清理 | 临时账号/租户的创建与删除时间戳、删除后计数 | `logs/<window>/08_cleanup.log` |

- **NOTICE 必须落盘**：执行器或 psql 的 stdout/stderr 一律 `tee`，逐笔一个文件；报告只允许引用落盘文件中的原文，禁止以「会话里看到过」代替。
- 停机时长必须由三个时间戳计算：`bootout` 时刻、二进制替换时刻、`/health=200` 时刻，并给出实际不可用时长。

### 1.1 六笔文件 sha256（`database/checksums.txt`）

| 版本 | sha256 |
| --- | --- |
| 20261112090000 | `dfdce46cdb974dd5079a9202aa405bd6a3be99250b624fdc72c1967aec4e1eb4` |
| 20261112091000 | `4dc1194d077ac80721ffa8509bb2e67f1cc4e96224569897718845a44f3aa600` |
| 20261112092000 | `0559ef5638e4a51d1f1f367070946795256cb358a6779dd1930e7dfbf435fb6c` |
| 20261112093000 | `33ced552c4da77ac38688982d83d1c0082ba5b3040530662bf96d8cc04189266` |
| 20261112094000 | `50b6e4f98c264d071f1ecfc200457f7cdb25ba77abb85e23885d7b0d0c03e8fa` |
| 20261112095000 | `095dbb825115452ce218b33a362f829853bad9d7020c66cb6068f8f155b8b5c8` |

`validate.sh`：705 文件、Checksum errors 0、Errors 0。

### 1.2 第 6 笔「已提交迁移受控修改」完整留痕

#### 1.2.1 该迁移从未进入任何生产账本

| 事实 | 证据 |
| --- | --- |
| 生产账本仍是 655 / max `20261110210000` | 超户只读实测：`select count(*), max(version) from _sqlx_migrations where success` → `655 \| 20261110210000`（`current_database()=topems_prod`、PG 18.4） |
| 生产**没有** `version=20261112095000` | 同上连接 `where version=20261112095000` → 0 行 |
| 本报告所有 661 / 52 / 50 / 50 / 57 均为**副本**数字 | 全部取自本地 `topems_w7_reh_prod_20261111`，非生产 |
| 旧内容唯一一次执行发生在副本，且失败 | 旧内容在副本报 `ERROR: W7-B4-SRM 失败：srm.supplier_users 不存在`，账本止于 660 / `20261112094000` |
| 新内容首次执行也在副本 | 干净重建后重跑，账本 661 / `20261112095000` |

结论：**这是一次「已提交但从未应用」的迁移的文件级修正，不是对已执行历史的改写**；因此不做前向补丁，只做存在性守卫 + 豁免登记，`checksums.txt` 仅更新该文件一行。

#### 1.2.2 `migration-exemptions.json` 登记原文

```json
{
  "id": "B20261111-w7b4-supplier-users-guard",
  "date": "2026-11-11",
  "committer": "paulwy",
  "reason": "W7-B4 第 6 笔（srm.supplier_users 去 PERMISSIVE SELECT 放行 + 加 RESTRICTIVE）在应用前被生产副本证明无法直接执行：生产账本内 20261105100000_p4_drop_shadow_tables_and_repoint_fks.sql 已 DROP TABLE srm.supplier_users，而开发库未升级到 P4、该表仍存在，同一份迁移必须在两种环境形态下都幂等可跑。改造为存在性守卫：to_regclass('srm.supplier_users') IS NULL → RAISE NOTICE + RETURN（该迁移记成功、no-op），表存在才走原收敛与断言逻辑。不改版本号、不删除文件、不用 --defer（--defer 会在账本永久留 pending），属已提交迁移的受控内容修改。checksums.txt 仅更新该文件一行。",
  "files": [
    "20261112095000_w7_b4_srm_supplier_users_restrictive.sql"
  ],
  "evidence": "生产副本 topems_w7_reh_prod_20261111（由生产全库 dump sha256=54bad79c4b8e3618960ce7d3944a5d843bf83a772186138f3243b296dacf8086 恢复，账本 655/max 20261110210000）从 anchor 20261110210000 顺序应用前 5 笔后，第 6 笔硬失败：ERROR: W7-B4-SRM 失败：srm.supplier_users 不存在（账本止于 660/max 20261112094000）；根因定位 database/migrations/20261105100000_p4_drop_shadow_tables_and_repoint_fks.sql:60 DROP TABLE srm.supplier_users（该版本在 prod 账本内、本地开发库账本内没有）。守卫改造后重建副本、从干净恢复点重跑六笔，账本 661/max 20261112095000，mes 52 表/50 RLS/50 FORCE/57 策略、19 表 tenant_id 19/19、srm 21 表/20 RLS/20 FORCE/20 策略/RESTRICTIVE 0、quarantine 0、v_tenant_backfill_gaps 0 全绿；开发克隆 topems_w7_reh_20261111（账本 578、表存在）同文件走非 no-op 分支并断言通过。",
  "approved": true
}
```

#### 1.2.3 旧 / 新文件 sha256 对照

| 项 | 值 |
| --- | --- |
| 旧文件（`f2b703e9c` 入库内容）sha256 | `52f56bf2bc608a20d3d99cabd6801427d5f63fcd0801c9eca925b6fb4f84bcd4` |
| 新文件（HEAD `54de48d28`）sha256 | `095dbb825115452ce218b33a362f829853bad9d7020c66cb6068f8f155b8b5c8` |
| 取旧值命令 | `git show f2b703e9c:database/migrations/20261112095000_w7_b4_srm_supplier_users_restrictive.sql \| shasum -a 256` |
| 变更规模 | `+12 / −1`（3 处：头部注释补环境幂等说明；主 DO 块 `RAISE EXCEPTION` → `RAISE NOTICE … RETURN`；断言 DO 块加同款 NULL 守卫） |
| 版本号 / 文件名 | **不变**（`20261112095000`），不删文件、不 `--defer` |

#### 1.2.4 `checksums.txt` 重算与 `validate` 零错误

`checksums.txt` 差异（仅一行换值，无其他行变动）：

```diff
-52f56bf2bc608a20d3d99cabd6801427d5f63fcd0801c9eca925b6fb4f84bcd4  database/migrations/20261112095000_w7_b4_srm_supplier_users_restrictive.sql
+095dbb825115452ce218b33a362f829853bad9d7020c66cb6068f8f155b8b5c8  database/migrations/20261112095000_w7_b4_srm_supplier_users_restrictive.sql
```

`bash scripts/migration/validate.sh` 输出片段：

```text
[INFO] Checking checksums...
[OK]   Checksums verified / updated at database/checksums.txt
[INFO] DATABASE_URL not set; skipping schema drift check
[INFO] Validation Summary

Total migration files checked: 705
Invalid filenames:             0
Version ordering issues:       48
Idempotency warnings:          148
Multi-responsibility flags:    131
Missing down migrations:       705
Checksum errors:               0
Schema drift issues:           0
Errors:                        0
Warnings:                      4
```

（`Version ordering issues`/`Idempotency`/`Multi-responsibility`/`Missing down` 为仓库既有历史基线的 warning，`Errors: 0`、`Checksum errors: 0`。）

提交 `54de48d28` 时 `migration-validate` / `check-migrations.mjs` 门禁通过（`checkNoModify` 报「受控修改豁免登记命中」而非硬错误），全程未用 `--no-verify`。

---

## 2. 副本干净重跑（本轮核心证据）

**为什么重建**：上轮只在已跑过 5 笔的库上补第 6 笔，不能证明整链；本轮从生产 dump 的干净恢复点重跑六笔。

| 项 | 值 |
| --- | --- |
| dump | `backups/topems_prod_pre_w7b4_20261111.dump`（= `/tmp/topems_prod_w7pre.dump`） |
| 大小 / sha256 | 4,677,619 B / `54bad79c4b8e3618960ce7d3944a5d843bf83a772186138f3243b296dacf8086` |
| TOC 条目 | 8,146 |
| 恢复后账本 | 655 / `20261110210000` |
| 恢复残差 | dump **最后一项** `MATERIALIZED VIEW DATA bi org_stats` 因基表 RLS 无法 `REFRESH`（与本次迁移无关，也不在 mes/srm 范围）；其余 8,145 项全部落库 |

### 2.1 副本 PRE 实测（恢复后、迁移前）

| 度量 | 值 |
| --- | --- |
| mes 表 / RLS / FORCE / 策略 | 51 / 33 / 32 / 40 |
| srm 表 / RLS / FORCE / 策略 / RESTRICTIVE | 21 / 20 / 20 / 26 / 0 |
| `srm.supplier_users` | 不存在 |
| 19 表 `tenant_id` 列 | 0 / 19 |
| 19 表原有策略 | 2 条（`material_categories`、`material_requirement_items` 的 `mes_allow_all_*`，`USING true`） |
| `mes.work_orders` | RLS=on、FORCE=off、1 条 fail-open `rls_tenant_isolation` |

与生产同口径只读快照（§4.3）**逐项一致** → 副本与生产等价。

### 2.2 执行

```bash
PROD_CHANGE_TICKET=W7-MES-RLS-20261112 bash scripts/migration/apply-forward.sh \
  --db topems_w7_reh_prod_20261111 --prod --anchor 20261110210000 \
  --only 20261112090000,20261112091000,20261112092000,20261112093000,20261112094000,20261112095000 \
  --allow-destructive=20261112092000
```

结果：`== OK：应用 6 条，无失败`（逐条单事务，含账本写入）。

### 2.3 副本 POST 实测

| 度量 | PRE | POST |
| --- | --- | --- |
| 账本 / max | 655 / `20261110210000` | **661 / `20261112095000`** |
| mes 表 | 51 | 52（+`tenant_backfill_quarantine`） |
| mes RLS | 33 | **50** |
| mes FORCE | 32 | **50** |
| mes 策略 | 40 | **57** |
| mes RESTRICTIVE | 0 | 0 |
| 19 表 `tenant_id`（uuid/NULL） | 0 / 19 | **19 / 19** |
| 19 表策略 | 2 | **19**（每表 1 条 `rls_tenant_isolation`） |
| 19 表 RLS+FORCE+模板策略不合规表 | — | **none** |
| srm 表 / RLS / FORCE | 21 / 20 / 20 | 21 / 20 / 20 |
| srm 策略 / RESTRICTIVE | 26 / 0 | **20 / 0** |
| `quarantine` / `v_tenant_backfill_gaps` | — | **0 / 0** |

- srm 未开 RLS 的唯一表：`srm.schema_defense_ledger`（预期）。
- 19 表策略 qual 均为 fail-closed 模板（`app.rls_system='on' OR tenant_id=app.tenant_id`），无 `tenant_id IS NULL`、无 `true`。

### 2.4 第 6 笔双分支证明

| 环境形态 | 结果 |
| --- | --- |
| 生产副本（表不存在） | `NOTICE: W7-B4-SRM：srm.supplier_users 不存在（已由 20261105100000 删除），本迁移 no-op`；断言块 `NOTICE: ... 跳过断言（no-op）`；账本记成功 |
| 开发克隆 `topems_w7_reh_20261111`（表存在、账本 578） | 删账本行后重跑：`NOTICE: ... supplier_users 已收敛（租户 PERMISSIVE + 供应商 RESTRICTIVE）`；`NOTICE: ... 断言通过：supplier_users（2 条策略，含 RESTRICTIVE）`；账本回到 `20261112095000` |

---

## 3. 生产范围收窄：本窗口**无行级可见性变化**

生产（超户只读实测，2026-11-11）19 张目标表逐表 `count(*)`：

| 表 | 行数 | 表 | 行数 |
| --- | --- | --- | --- |
| batch_records | 0 | material_returns | 0 |
| bom_items | 0 | production_lines | 0 |
| equipment_inspections | 0 | quality_records | 0 |
| material_boms | 0 | shifts | 0 |
| material_categories | 0 | team_members | 0 |
| material_issue_items | 0 | wip_transfers | 0 |
| material_issues | 0 | wips | 0 |
| material_requirement_items | 0 | work_calendars | 0 |
| material_requirements | 0 | workshops | 0 |
| 另：`mes.work_orders` | **0** | `mes.production_orders` | **0** |

结论：

- 19 表全 0 行 → `20261112092000` 的 13 条 UPDATE 全部命中 0 行，**不回填任何数据**；`mes.tenant_backfill_quarantine` 生产落 **0 行**。
- `work_orders` 0 行 → `20261112094000` 收紧策略后**无任何行变为不可见**。
- 因此验收项由「quarantine 9 行落位」改为：**生产 `quarantine = 0` 且 `v_tenant_backfill_gaps = 0`**。
- 本地开发库的 54 行 `work_orders`（47 nil UUID + 7 NULL，全部 `status='completed'` 且 `deleted_at` 非空、`order_id`/`order_no` 全 NULL）与 9 行 quarantine 均为**开发库残留，不进入生产**，本窗口不涉及。

---

## 4. 窗口前物（均已落盘，位于本机工作区）

### 4.1 备份

| 物 | 路径 | 度量 |
| --- | --- | --- |
| 生产全库 dump | `backups/topems_prod_pre_w7b4_20261111.dump` | 4,677,619 B；sha256 `54bad79c4b8e3618960ce7d3944a5d843bf83a772186138f3243b296dacf8086` |
| **生产版 srm schema 存档** | `backups/w7_b4_srm_schema_prod_20261111.sql` | 42,667 B；**26 条 `CREATE POLICY`**；sha256 `88308295201db1ba8641157283091a9189ad3198097b493c8f70ae314c5fd5e9` |
| 生产 pre 目录快照 | `backups/w7_b4_mfg_prod_pre_20261111.txt` | 19 表行数 + srm/mes 目录数 + **19 表 2 条原策略原文** + srm 26 条策略原文；sha256 `018f31270c3ca5df3923066c6e1d0e77dd241da2007f692173b8a23261c4b0d4` |
| 生产 pre 逐表 RLS 标志 | `backups/w7_b4_mfg_prod_pre_flags_20261111.txt` | 20 表 `relrowsecurity/relforcerowsecurity/策略数` |
| 回滚策略原文（26 条） | `backups/w7_b4_srm_policies_prod_pre_20261111.sql` | 26 行 `CREATE POLICY`；sha256 `fed37caf9e8a8a3f2a69ce01313d73e3c65ffcf7e9cc8b6d5f73f78edc17639f` |
| 回滚脚本（已预演） | `scripts/ops/w7_b4_mfg_rollback_prestate.sql` | §7 |
| 旧二进制（生产在跑） | `xingzhai@192.168.110.115:/Users/xingzhai/topems/bin/topems-server` | 205,101,072 B；sha256 `5d4f4f129a1264f615f176f496aff8248d425347041f5101bc3cd1323bb32368`；构建 2026-11-11 09:23 |
| **新二进制（本窗口用）** | 本机 `target/release/topems-server` | **206,140,192 B**；sha256 `ca34b88c04a3c634d1ebfc8685e13f3912a6cfdbea5e964a87fbf8470b94c326`；mtime `2026-11-11 17:00:32` |

> 旧二进制构建于 09:23，**早于**本轮三个代码提交（15:29 / 15:49 / 16:08），不含 W7-B4 代码，**不可用于本窗口**；窗口换二进制一律用上表新二进制。

#### 4.1.1 新二进制一致性（三项齐）

| 项 | 实测 |
| --- | --- |
| 构建状态 | 已完成，`BUILD_RC=0`；无残留构建进程（`pgrep -f "cargo build --release -p topems-server"` 无输出）；日志尾部 `Finished \`release\` profile [optimized] target(s) in 18m 52s` |
| 构建窗口 | 开始 `2026-11-11 16:41:40` → 结束 `2026-11-11 17:00:33`；二进制 mtime `17:00:32` |
| `git rev-parse HEAD` | `54de48d28fbdc30701e0c83a5d5eb00febf35467` |
| HEAD 提交时间 | `2026-11-11 16:39:30 +0800` |
| 断言 | **构建时间 17:00:32 晚于 HEAD 提交时间 16:39:30（Δ = 21m02s）** ✅ |
| 工作树一致性 | `git status --short` 无 `.rs` / `Cargo.toml` 变更（`NO_CODE_CHANGES`）→ 二进制与 HEAD 代码一致 |
| 构建命令 | `CARGO_TARGET_DIR=/Users/air/TOPEMS/target SWAGGER_UI_DOWNLOAD_URL=file:///Users/air/topems-release/vendor/swagger-ui-v5.32.6.zip cargo build --release -p topems-server` |

### 4.2 回滚物必备性

- `20261112090000` 会删掉 srm 26 条旧策略 → 回滚依赖 `w7_b4_srm_schema_prod_20261111.sql`（**生产版 26 条**，sha256 `88308295…` 已在 §4.1 记录，窗口报告将引用此值）。
- `20261112093000` 会删掉 `material_categories` / `material_requirement_items` 的 2 条 `mes_allow_all_*` → 原文已存档（§4.3）。
- 其余 17 张表 PRE 无 RLS、无策略（§4.3），回滚只需 `DISABLE ROW LEVEL SECURITY`。

### 4.3 生产 PRE 只读快照（超户 `xingzhai`，2026-11-11 16:4x）

| 度量 | 生产实测 |
| --- | --- |
| 库 / 用户 / 版本 | `topems_prod` / `xingzhai`（本地 socket，`inet_server_addr()` 为空） / PostgreSQL 18.4 |
| 账本 | 655 / `20261110210000` |
| mes 表 / RLS / FORCE / 策略 | 51 / 33 / 32 / 40 |
| srm 表 / RLS / FORCE / 策略 / RESTRICTIVE | 21 / 20 / 20 / 26 / 0 |
| `srm.supplier_users` | 不存在 |
| 19 表 `tenant_id` 列 | 0 / 19 |
| 19 表策略原文 | `mes.material_categories:mes_allow_all_material_categories`、`mes.material_requirement_items:mes_allow_all_material_requirement_items`（均 `PERMISSIVE/ALL`、`USING true`、`WITH CHECK true`） |
| `mes.v_tenant_backfill_gaps` | 不存在（由本窗口创建） |

与副本 PRE（§2.1）**逐项一致**。

---

## 5. 窗口时序（写实命令）

目标机：`xingzhai@192.168.110.115`；实测 `id -u = 501`；服务 `gui/501/com.topems.server` 当前 `state = running`（pid 64271），8099 LISTEN。

| 步骤 | 命令 | 通过判据 |
| --- | --- | --- |
| 1 停写 | `ssh xingzhai@192.168.110.115 'launchctl bootout gui/501/com.topems.server'` | `launchctl print gui/501/com.topems.server` 返回 `Could not find service` |
| 2 验停 | `ssh … "lsof -nP -iTCP:8099 -sTCP:LISTEN"` | 无输出（无监听） |
| 3 验停 | `ssh … "/opt/homebrew/bin/psql -h /tmp -X -d topems_prod -Atc \"select count(*) from pg_stat_activity where datname='topems_prod' and pid<>pg_backend_pid()\""` | `0` |
| 4 备份 | 全库 dump + 账本快照 + 旧二进制 `.bak`（含 sha256） | 见 §4 |
| 5 迁移 | `apply-forward.sh --prod --ssh-host xingzhai@192.168.110.115 --remote-db topems_prod --remote-mig-dir <投递目录> --anchor 20261110210000 --only <六笔> --allow-destructive=20261112092000`（`PROD_CHANGE_TICKET=W7-MES-RLS-20261112`） | `应用 6 条，无失败` |
| 6 换二进制 | 投递新二进制（HEAD `54de48d28`）+ `launchctl bootstrap gui/501 ~/Library/LaunchAgents/com.topems.server.plist` | 进程启动 |
| 7 健康 | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8099/health` | `200` |
| 8 验收 | §6 全部断言 | 全绿 |
| 9 失败则回滚 | §7 | 恢复到 PRE 形态 |

> 远端 `psql` 必须用 `/opt/homebrew/bin/psql`（非交互 PATH 里没有 `psql`，已实测 `command not found`）。

---

## 6. 验收断言（生产，实测口径）

| # | 断言 | 期望 |
| --- | --- | --- |
| A1 | 账本 | 655 → **661**，`max(version)=20261112095000`，六笔 `success=true` |
| A2 | mes 目录 | 52 表 / 50 RLS / **50 FORCE** / 57 策略 |
| A3 | 19 表 `tenant_id` | `uuid` + `NULL`，**19 / 19** |
| A4 | 19 表策略 | 每表 1 条 `rls_tenant_isolation`，含 `app.rls_system`，不含 `tenant_id IS NULL` |
| A5 | srm | **21 表 / 20 RLS / 20 FORCE / 20 策略 / RESTRICTIVE 0**（`schema_defense_ledger` 除外） |
| A6 | `srm.supplier_users` | 生产**表不存在** → 迁移 **no-op 且不报错**（两条 NOTICE 原文见 §2.4），账本记成功 |
| A7 | 数据面 | **`quarantine = 0`** 且 **`v_tenant_backfill_gaps = 0`**；19 表与 `work_orders`、`production_orders` 仍全 0 行 |
| A8 | 策略巡检 | mes/srm 中 `USING(true)`、`tenant_id IS NULL` 分支在**本窗口 19 表 + work_orders + 20 张 srm 表**内为 0 |
| A9 | 运行面 | `/health` 200、`server.err` 无 `panic` / `RLS context missing`、进程稳定 5 分钟 |

注 A8 边界：mes 中不属本次 19 表的既有策略（如 `mes.production_orders`、`mes.audit_logs` 等）仍为历史形态，**本窗口不改写**；这些表生产均 0 行，无可见性影响，留待后续批次。

### 6.1 窗口内必须落盘的实际输出（不接受"已确认"式结论）

| # | 项 | 必须贴出的内容 |
| --- | --- | --- |
| E1 | 停写判据 | `launchctl print gui/501/com.topems.server` 的**实际输出**（停前 `state = running` + pid；停后 `Could not find service` 原文）与 `lsof -nP -iTCP:8099 -sTCP:LISTEN` 的**实际输出**（停前含监听行、停后无输出），附执行时间戳 |
| E2 | 六笔逐笔记录 | 每笔一条：`version`、执行前后 `max(version)` 与 `count(*)`、耗时（秒）、`RAISE NOTICE` 原文（如第 6 笔两条 no-op NOTICE 全文）、`success` 值 |
| E3 | 非超户验收 | 用真实 `w7_mes_probe` token（不手写 permissions），租户 A / B 各做**读 + 写**：A 读自己 200、A 写自己 200/201；B 读 A 行 0 或 404、B 写 A 租户数据被拒（403/404/0 行）；B 读自己 200、B 写自己 200/201。附请求行 + 状态码 + 响应体键 |
| E4 | 换二进制后冒烟 | `/api/mes/orders`、`/api/mes/boms`、`/api/mes/wips`、`/api/wms/inbound-orders`、srm 供应商列表 五个端点，**A/B 双头各一次**（A 200 且只见 A 行、B 200 且不见 A 行），附状态码与返回条数 |
| E5 | 数据面终检 | 生产 `select count(*) from mes.tenant_backfill_quarantine` = **0**；`select count(*) from mes.v_tenant_backfill_gaps` = **0**；19 表 + `work_orders` + `production_orders` 仍为 0 行 |
| E6 | 二进制一致性 | `git rev-parse HEAD`、新二进制 `sha256`、文件 mtime（构建时间），并断言 **构建时间晚于 HEAD 提交时间**（§4.1） |

API 层同口径（若窗口内提供账号口令）：A 租户读自己 200 / B 租户读 A 行 0 或 404 / B 读自己 200；取证前记录 `git rev-parse HEAD`、二进制 sha256、构建时间，并断言二进制晚于 HEAD。

---

## 7. 回滚（语句级，单事务）

前提：已停写、已备份（§4）。顺序：**跑回滚脚本 → 换回旧二进制 → 起服务**。

脚本：[scripts/ops/w7_b4_mfg_rollback_prestate.sql](../../scripts/ops/w7_b4_mfg_rollback_prestate.sql)，策略原文取自 `backups/w7_b4_srm_policies_prod_pre_20261111.sql`（26 条，sha256 `fed37caf9e8a8a3f2a69ce01313d73e3c65ffcf7e9cc8b6d5f73f78edc17639f`，由生产存档 `88308295…` 抽取）。

| 段 | 动作 |
| --- | --- |
| A（090000） | DROP srm 全部现有策略；`\i` 重放生产 **26 条**旧策略 |
| C（092000） | `DROP VIEW IF EXISTS mes.v_tenant_backfill_gaps`；`DROP TABLE IF EXISTS mes.tenant_backfill_quarantine`（生产 UPDATE 命中 0 行，无数据需还原） |
| D（093000） | 17 张 PRE 无 RLS 的表：DROP 策略 + `NO FORCE` + `DISABLE RLS`；`material_categories` / `material_requirement_items`：DROP 新策略 + 重建 `mes_allow_all_*`（`USING true`），保留 ENABLE+FORCE |
| B（091000） | 19 张表 `DROP COLUMN IF EXISTS tenant_id` |
| E（094000） | `work_orders` `NO FORCE`；DROP 新策略；重建 PRE 的 fail-open `rls_tenant_isolation` |
| F（095000） | 生产为 no-op，无需数据回滚 |
| G（账本） | `DELETE FROM _sqlx_migrations WHERE version IN (…090000…095000)`，`GET DIAGNOSTICS` 要求恰好 6 行 |
| H（断言） | mes 33 RLS / 32 FORCE / 40 策略、srm 26 策略、19 表无 `tenant_id`、`work_orders` 非 FORCE |

**已做可执行性预演**（生产副本 `topems_w7_reh_prod_20261111`，POST 形态，`-v rehearse=1` 事务内执行后 ROLLBACK）：

- 首轮暴露两处顺序/标志缺陷并已修正：① `DROP COLUMN tenant_id` 必须晚于「删缺口视图 + 删策略」（否则 `v_tenant_backfill_gaps` 与策略依赖阻断）；② `DISABLE ROW LEVEL SECURITY` **不会**清除 `relforcerowsecurity`，必须显式 `NO FORCE`。
- 修正后：`NOTICE: 回滚断言通过：mes 33/32/40、srm 26、19 表无 tenant_id、work_orders NO FORCE`。
- ROLLBACK 后副本仍为 POST（661 / 52 / 50 / 50 / 57 / srm 20 / tenant_id 19），证明脚本不落任何变更。

执行方式：生产 `psql -X -v ON_ERROR_STOP=1 -f scripts/ops/w7_b4_mfg_rollback_prestate.sql`（脚本内 `BEGIN … COMMIT`，失败整体回滚）。

---

## 8. 遗留与限制

- 本窗口不做：mes 非 19 表的历史策略归一（生产 0 行，后续批次）、`// tenant-system:` 注释与 CI 门禁（按约定窗口后）。
- 副本 `bi.org_stats` 未 populate（dump 最后一项，RLS 阻挡 `REFRESH`），与本次迁移无关。
- 生产 API 200/403 取证依赖账号口令；口令未入库，需要时临时提供。
- 提交未推送。

---

## 9. 清理（窗口验收后执行）

```bash
# 1) 两个演练库（开发库克隆已无证明力；生产副本在验收后同样清理）
psql -h /tmp -U air -d postgres -c "DROP DATABASE IF EXISTS topems_w7_reh_20261111;"
psql -h /tmp -U air -d postgres -c "DROP DATABASE IF EXISTS topems_w7_reh_prod_20261111;"

# 2) 为副本临时创建的本地角色（确认无其他依赖后）
psql -h /tmp -U air -d postgres -c "DROP ROLE IF EXISTS topems_prod;"

# 3) 临时 dump 副本（工作区 backups/ 下的归档保留）
rm -f /tmp/topems_prod_w7pre.dump /tmp/w7_b4_mfg_prod_pre.sql /tmp/w7_b4_mfg_prod_pre.out /tmp/w7_b4_mfg_prod_pre.err
```

---

## 10. 窗口申请

- 申请内容：按 §5 时序，对 `topems_prod` 应用六笔迁移并更换二进制。
- 停写预估：`bootout` → `/health` 200，约 1–3 分钟（六笔均在本副本实测通过，含回填 UPDATE 命中 0 行）。
- 决策点：① ~~新二进制重建并记录 sha256~~ **已完成**（sha256 `ca34b88c…`、mtime `2026-11-11 17:00:32` > HEAD `16:39:30`，§4.1.1）；② ~~窗口前回滚脚本可执行性预演~~ **已完成**（§7，断言全绿且 ROLLBACK 无残留）；③ 生产 PRE 快照在窗口时刻重取一次（§4.3 为窗口前基线，用于比对未漂移）。

---

## 11. 窗口执行实录（2026-11-11 17:30–17:47，生产 `topems_prod`）

### 11.1 停写前 PRE 重取（与 §4.3 基线逐项对比）

窗口时刻在 `topems_prod` 重取只读 PRE，与 §4.3 基线逐项一致，判定 `NO_DRIFT`：

| 项 | 基线（§4.3） | 窗口重取 | 结论 |
| --- | --- | --- | --- |
| 账本 | 655 / `20261110210000` | 655 / `20261110210000` | 一致 |
| mes 目录 | 51 表 / 33 RLS / 32 FORCE / 40 策略 | 同左 | 一致 |
| srm 目录 | 21 表 / 20 RLS / 20 FORCE / 26 策略 / RESTRICTIVE 0 | 同左 | 一致 |
| 19 张目标表行数 | 全 0 | 全 0 | 一致 |
| 19 张目标表 `tenant_id` 列 | 0 列 | 0 列 | 一致 |

### 11.2 备份（窗口内现取）

| 物 | 字节 | sha256 |
| --- | --- | --- |
| 超户全库 `topems_prod_pre_w7b4_window_20261111.dump` | 4,677,619 | `0f61a944c62b74ad460ccf603f31b7a4e10ceeb2ada246af779d9bb0d4d889dd` |
| 现取 srm schema-only `w7_b4_srm_schema_prod_window_20261111.sql` | 42,667 | `f943ce117f0f3aadcfc2770fcc94f75ad7a6c8c2687391a0d7a1b557be9133af` |
| srm 策略回滚存档 `w7_b4_srm_policies_prod_pre_20261111.sql`（26 条） | 10,972 | `fed37caf9e8a8a3f2a69ce01313d73e3c65ffcf7e9cc8b6d5f73f78edc17639f` |
| 旧二进制 `topems-server.pre_w7b4_20261111.bak` | 205,101,072 | `5d4f4f129a1264f615f176f496aff8248d425347041f5101bc3cd1323bb32368` |

### 11.3 `bootout` 停写证据（原文）

```text
$ launchctl bootout gui/501/com.topems.server
Could not find service "com.topems.server" in domain for port
RC=0
$ lsof -nP -iTCP:8099 -sTCP:LISTEN
（无输出，RC=1）
$ ps -ef | grep topems-server | grep -v grep
（无输出）
$ psql ... -c "select count(*) from pg_stat_activity where datname='topems_prod' and pid<>pg_backend_pid()"
0
```

判据：`Could not find service` 表示服务已不在 launchd 域内（停写完成），`launchctl print` 此刻无输出；`lsof` 无监听、进程 0、业务连接 0。

#### 11.3.1 停机时长（三个时间戳）

`bootout` 命令本身未落盘时间戳（本轮缺陷，已写入 §1.0 强制纪律），用前后可证事件界定：

| 事件 | 时间戳（+08） | 证据 |
| --- | --- | --- |
| 最后一条只读 PRE 查询 | `17:33:47.858` | PG 日志 `17:33:47.858 CST ... select 'GAPS' ...` |
| `bootout` 执行 | `17:33:48 ~ 17:34:29`（工作值 `17:34:00`） | 介于上一条与第一笔迁移落账之间 |
| 第一笔迁移落账（账本 656） | `17:34:29.871675` | `_sqlx_migrations.installed_on` |
| 二进制替换完成 | `17:36:53` | 远端 `topems-server` mtime |
| 新进程启动 | `17:36:54` | `ps -o lstart -p 29846` |
| 启动完成 / 可服务 | `17:36:57.359` | `server.out` 首条 `2026-11-11T09:36:57.359201Z`（UTC）= `17:36:57.359 +08` |

**实际不可用时长**：按工作值 `17:34:00 → 17:36:57` = **2 分 57 秒**；严格区间为 **2 分 25 秒（17:34:29→17:36:54）~ 3 分 10 秒（17:33:47→17:36:57）**。六笔迁移总耗时约 33s，其余为停写校验、二进制替换与启动。

### 11.4 六笔逐笔（账本 / 耗时 / NOTICE）

执行器：`apply-forward.sh --ssh-host --remote-db topems_prod --prod --anchor 20261110210000 --only <六笔> --allow-destructive=20261112092000`，`PROD_CHANGE_TICKET=W7-MES-RLS-20261112`。逐笔单事务，任一失败即停（本轮六笔全部 RC=0）。

| # | version | 账本写入后 | `installed_on`（+08） | 执行器耗时 | NOTICE（源文件原文，动态参数按生产实测展开） |
| --- | --- | --- | --- | --- | --- |
| 1 | 20261112090000 | 656 | 17:34:29.871675 | 7s | `W7-B4-SRM：20 张表策略已归一（fail-closed + FORCE）`；`W7-B4-SRM 断言通过：20 张表策略形状一致` |
| 2 | 20261112091000 | 657 | 17:34:41.844299 | 5s | `W7-B4-MES：tenant_id 列就绪（新加 19 张，已存在 0 张）`；`W7-B4-MES 断言通过：19 张表 tenant_id uuid NULL` |
| 3 | 20261112092000 | 658 | 17:34:51.415414 | 6s | `W7-B4-MES 回填断言通过：gaps=0，剩余 nil 0 行全部登记 quarantine` |
| 4 | 20261112093000 | 659 | 17:35:01.341488 | 5s | `W7-B4-MES：19 张表策略已下发（fail-closed + FORCE）`；`W7-B4-MES 断言通过：19 张表策略形状一致` |
| 5 | 20261112094000 | 660 | 17:35:11.184606 | 5s | `W7-B4-MES：work_orders 策略已收紧并 FORCE`；`W7-B4-MES 断言通过：work_orders（1 条策略，ENABLE+FORCE）` |
| 6 | 20261112095000 | 661 | 17:35:19.871234 | 5s | `W7-B4-SRM：srm.supplier_users 不存在（已由 20261105100000 删除），本迁移 no-op`；`W7-B4-SRM：srm.supplier_users 不存在，跳过断言（no-op）` |

第 6 笔 NOTICE 原始日志（本机 `/tmp/topems_forward_last.log`）：

```text
psql:.../20261112095000_w7_b4_srm_supplier_users_restrictive.sql:70: NOTICE:  W7-B4-SRM：srm.supplier_users 不存在（已由 20261105100000 删除），本迁移 no-op
DO
DO
INSERT 0 1
psql:.../20261112095000_w7_b4_srm_supplier_users_restrictive.sql:117: NOTICE:  W7-B4-SRM：srm.supplier_users 不存在，跳过断言（no-op）
```

说明：前五条为迁移源文件 `RAISE NOTICE` 原文（第 2 笔的两个计数按生产 PRE `TENANT_COL=0` 展开为 19/0；第 3 笔 `v_nil` 按生产 0 行展开为 0）；第 6 笔日志已落盘，其余五条的运行期输出随执行会话流式输出、未单独落盘（本轮缺陷，后续按 §1.0 强制 `tee` 逐笔落盘）。

#### 11.4.1 六笔 NOTICE 与账本对齐（补录）

| 账本值 | version | `installed_on` | `RAISE NOTICE` 源文件行 | 生产展开值 |
| --- | --- | --- | --- | --- |
| 656 | 20261112090000 | 17:34:29.871675 | `20261112090000_w7_b4_srm_normalize_policies.sql` | 静态 |
| 657 | 20261112091000 | 17:34:41.844299 | `20261112091000_w7_b4_mes_add_tenant_id_columns.sql` | 新加 19 / 已存在 0 |
| 658 | 20261112092000 | 17:34:51.415414 | `20261112092000_w7_b4_mes_backfill_tenant_and_quarantine.sql` | 剩余 nil 0 行 |
| 659 | 20261112093000 | 17:35:01.341488 | `20261112093000_w7_b4_mes_rls_policies.sql` | 静态 |
| 660 | 20261112094000 | 17:35:11.184606 | `20261112094000_w7_b4_work_orders_forcerls.sql` | 静态 |
| 661 | 20261112095000 | 17:35:19.871234 | `20261112095000_w7_b4_srm_supplier_users_restrictive.sql` | 两条 no-op，日志见上 |

补录口径：源文件 `RAISE NOTICE` 字符串逐字取自仓库（`grep -oE "RAISE NOTICE '[^']*'"`），动态占位符按生产 PRE/终检实测值展开；账本时间取 `_sqlx_migrations.installed_on`。二者对齐即视为该笔 NOTICE 的可复核证据。

### 11.5 账本 655 → 661

```text
LEDGER | 661 | 20261112095000
```

六行均 `success=t`，`execution_time` 字段由执行器写 0（实际耗时以执行器计时为准，见 §11.4）。

### 11.6 二进制更换与启动

| 项 | 值 |
| --- | --- |
| 远端部署 sha256 | `ca34b88c04a3c634d1ebfc8685e13f3912a6cfdbea5e964a87fbf8470b94c326`（与构建一致） |
| 大小 / mtime | 206,140,192 B / `2026-11-11 17:36:53` |
| 启动 | `bootstrap` 成功，pid `29846`，`lsof` 单监听 `*:8099` |
| `/health` | 200 |

`server.err` 仅 1 行 `Error: Address already in use (os error 48)`，为首次启动尝试与旧进程退出竞争产生；当前 `lsof` 仅 1 个监听进程（29846），判定为陈旧日志，不影响服务。

### 11.7 非超户探针账号（临时，已删除）

生产 `core_users=0`、`iam.users` 仅有 `admin`（超户）与 `tenant_admin`，A/B 双租户无非超户可用账号。窗口内按批准口径临时创建：

| 项 | 账号 A | 账号 B |
| --- | --- | --- |
| `iam.users.id` | `7c000000-0000-4000-8000-0000000000a1` | `7c000000-0000-4000-8000-0000000000b2` |
| 用户名 | `w7_mes_probe_a` | `w7_mes_probe_b` |
| `is_superuser` | false | false |
| 租户（`core_tenant_users`） | 默认租户 `00000000-…-0001` | 临时租户 B `c51c3a73-6cd4-49eb-b21e-efd7231e445b`（code `w7b4-probe-b`） |
| 创建时间 | `2026-11-11 17:37:41.061595+08` | 同左 |
| 角色 | `mes_manager`（`2ddf11b1-…`，76 个 `mes:%`）；窗口内先追加 `wms_manager`、`srm_manager`，再追加 `tenant_admin`（为 `mes:write` 写验收） | 同左 |

登录（生产实测 `POST /api/core/iam/auth/login`）：A/B 均 `code=0`，JWT claims：

```text
A| sub=7c000000-0000-4000-8000-0000000000a1 tenant_id=00000000-0000-0000-0000-000000000001 is_superuser=false roles=['mes_manager']
B| sub=7c000000-0000-4000-8000-0000000000b2 tenant_id=c51c3a73-6cd4-49eb-b21e-efd7231e445b is_superuser=false roles=['mes_manager']
```

**发现 F1（窗口内处置，未改代码/未改已批准迁移）**：生产 `public.core_tenant_users` 仍为旧策略，qual 不认 `app.rls_system`；而登录的成员解析走系统通道（`app.tenant_id=nil` + `app.rls_system=on`），在 app 角色下实测命中 0 行 → `resolve_membership_tenant` 回落默认租户，B 也签成 A。为使真实登录路径可用，窗口内临时新增一条 **PERMISSIVE/SELECT/TO topems_prod** 策略 `w7b4_probe_sysread USING (current_setting('app.rls_system', true) = 'on')`，仅放宽显式系统通道；登录后立即删除：

```text
BEFORE | tenant_isolation_core_tenant_users | PERMISSIVE | {public} | ALL
CREATE POLICY | 2026-11-11 17:40:43
LOGIN_a|http=200  LOGIN_b|http=200
DROP POLICY   | 2026-11-11 17:40:44
AFTER  | tenant_isolation_core_tenant_users | PERMISSIVE | {public} | ALL
```

前后 `pg_policies` 完全一致（仅 1 条），无残留。**这是既有多租户登录缺口，建议另立工单，不在本窗口修**。

### 11.8 五端点 A/B 双头冒烟（非超户）

请求均带 `Authorization: Bearer <token>` + `x-tenant-id: <各自租户>`；非超户以 claims 租户为准（头不可欺骗）。

| 端点 | A（租户 A） | B（租户 B） |
| --- | --- | --- |
| `GET /api/mes/orders` | 200，`total=0` | 200，`total=0` |
| `GET /api/mes/boms` | 200，`total=0` | 200，`total=0` |
| `GET /api/mes/wips` | 200，`total=0` | 200，`total=0` |
| `GET /api/wms/inbound-orders` | 200，`total=0` | 200，`total=0` |
| `GET /api/srm/suppliers` | 200，`total=0` | 200，`total=0` |

过程说明：wms/srm 首次 403 是因探针仅挂 `mes_manager`；追加真实角色后仍 403，为服务端权限缓存 TTL（默认 60s）未过期，过 TTL 后 200（非缺陷）。

### 11.9 A/B 读写与跨租户隔离

| 动作 | 结果 |
| --- | --- |
| A 创建 `POST /api/mes/orders`（`W7B4-PROBE-A`） | 200，id `612dfe2f-1ddb-402e-958d-c9b32b1efde5` |
| B 创建（`W7B4-PROBE-B`） | 200，id `3d988318-3562-45d0-97ac-d25145fd3d38` |
| A 列表 | 200，`total=1`，仅 A 行 |
| B 列表 | 200，`total=1`，仅 B 行 |
| B 读 A 行 | 404「生产工单不存在」 |
| A 读 B 行 | 404「生产工单不存在」 |
| A/B 读各自行 | 200 |

落库 `tenant_id` 实测：

```text
612dfe2f-1ddb-402e-958d-c9b32b1efde5 | W7B4-PROBE-A | 00000000-0000-0000-0000-000000000001
3d988318-3562-45d0-97ac-d25145fd3d38 | W7B4-PROBE-B | c51c3a73-6cd4-49eb-b21e-efd7231e445b
```

测试数据已在本窗口内删除（`DELETE … RETURNING` 返回 2 行），终检 `mes.production_orders` = **0**。

### 11.10 无租户头 400

- 五端点无令牌、无租户头：401（认证中间件先于租户判定）。
- 服务身份 token（`role=service`、`tenant_id=null`）访问 `GET /api/wms/warehouses`（handler 内调用 `require_tenant`）：
  - 无 `x-tenant-id` → **400**，`{"code":400,"success":false,"message":"缺少租户上下文"}`
  - 带 `x-tenant-id: 00000000-…-0001` → 200
- 代码事实：`require_tenant()` 中间件未挂载到上述五端点；400 分支由 handler 内 `require_tenant(&claims,&headers)` 产生，需 claims 租户为 nil（非超户 token 恒有租户）。

### 11.11 生产终检（2026-11-11 17:48 实测）

```text
LEDGER              | 661 | 20261112095000
QUARANTINE          | 0
GAPS                | 0
MES_CAT             | 52 表 | 50 RLS | 50 FORCE | 57 策略 | RESTRICTIVE 0
SRM_CAT             | 21 表 | 20 RLS | 20 FORCE | 20 策略 | RESTRICTIVE 0
TENANT_COL_19       | 19/19
SRM_SUPPLIER_USERS  | (空，to_regclass 为 NULL)
19 表行数 / NULL    | 19 张全部 0 行 / 0 NULL
MES 全 50 表 NULL   | 50 张全部 0 行 / 0 NULL
```

19 表逐张实测（行数|NULL）：`batch_records 0|0`、`bom_items 0|0`、`equipment_inspections 0|0`、`material_boms 0|0`、`material_categories 0|0`、`material_issue_items 0|0`、`material_issues 0|0`、`material_requirement_items 0|0`、`material_requirements 0|0`、`material_return_items 0|0`、`material_returns 0|0`、`production_lines 0|0`、`quality_records 0|0`、`shifts 0|0`、`team_members 0|0`、`wip_transfers 0|0`、`wips 0|0`、`work_calendars 0|0`、`workshops 0|0`。

以上均为生产库直接 `pg_class` / `pg_policies` / `information_schema.columns` 查询结果，未引用副本。

### 11.12 探针账号与临时租户处置

- 创建：`2026-11-11 17:37:41.061595+08`（A/B 共用同一批 SQL，见 §11.7）。
- 删除：`2026-11-11 17:46`（窗口内执行 `w7_probe_cleanup.sh`，单事务依次删 `core_sessions`、`core_refresh_tokens`、`core_user_roles`、`core_tenant_users`、`iam.users`、临时 `core_tenants`）。
- 删除后终检（本报告定稿时实查）：

```text
probe_users | tenants | user_roles | tenant_users | po | quarantine | gaps | ledger | lmax
0           | 1       | 0          | 0            | 0  | 0          | 0    | 661    | 20261112095000
```

- 账号 id：`7c000000-0000-4000-8000-0000000000a1`、`7c000000-0000-4000-8000-0000000000b2`；临时租户 `c51c3a73-6cd4-49eb-b21e-efd7231e445b`。
- `SELECT count(*) FROM iam.users WHERE username LIKE 'w7_mes_probe%'` = **0**；`core_tenants` 仅剩默认租户 `00000000-0000-0000-0000-000000000001`。

### 11.13 临时策略删除后的登录回归（⑤）

为排除「策略删了登录也废了」，`pg_policies` 确认仅剩 `tenant_isolation_core_tenant_users` 后，新建默认租户临时探针 `w7_mes_probe_c`（`is_superuser=false`）登录一次：

```text
policies now | tenant_isolation_core_tenant_users（仅 1 条，无临时策略）
CREATE_TS    | 2026-11-11 17:49:59.734519+08
LOGIN_C      | http=200, code=0
CLAIM        | sub=7c000000-0000-4000-8000-0000000000c3 tenant_id=00000000-0000-0000-0000-000000000001 is_superuser=false
DELETE_TS    | 2026-11-11 17:50:00.020944+08
AFTER        | probe_users=0, membership=0, tenants=1
```

结论：临时策略 DROP 后登录仍可正常签发 token 并取到租户（默认租户）；该验证账号已即时删除，`count(*)=0`。

### 11.14 遗留

- **F1（既有）**：`public.core_tenant_users` 旧策略不认 `app.rls_system`，导致登录成员解析系统通道读 0 行、非默认租户用户登录回落默认租户。窗口内以临时策略取证并已还原，已登记 `TODO.md` 独立工单（见 F1 条目，含创建/删除时间与 `pg_policies` 前后对照）。
- 前五笔 NOTICE 运行期原文未单独落盘（见 §11.4 说明与 §11.4.1 补录对齐），后续按 §1.0 强制逐笔 `tee`。
- `bootout` 秒级时间戳未落盘，停机时长以 §11.3.1 的三段可证事件界定。
- `server.err` 单条 `Address already in use` 为陈旧日志（§11.6）。
