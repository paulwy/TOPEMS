# 3 张依赖未封闭表解依赖方案（iam.core_tenants / iam.core_users / flow.core_tenants）

- 日期：2026-11-19
- 范围：~~只出方案与迁移草案~~ → **已按选项 A 落地**：迁移文件 `20261119200000_unblock_and_archive_legacy_tenant_tables.sql` 已提交，anchor 演练 `[5/5]` PASS（见 §5），并已落 dev（账本 success）。
- 前提：`20261119180000`（108 张历史 schema 副本归档）已应用。本文所有“现存引用”均指该迁移**之后**的状态。

## 0. 结论（已拍板并落地：选项 A）

三张表都能做到“零 CASCADE 归档”，但 `iam.core_tenants` 与 `flow.core_tenants` 被运行期函数 `finance.bootstrap_defaults()` 读取，**需先定业务口径**。用户已确认**选项 A（收口 `public` 权威表）**，迁移已落地。

| 选项 | 做法 | 代价 / 影响 | 本轮能否归档 |
|---|---|---|---|
| **A. 收口 public 权威表** | 函数只读 `public.core_tenants`（+ `finance.core_finance_accounts`），删除 iam/flow/iam.core_tenant_users 三个分支 | 语义变成“public 是唯一租户权威”；当前数据下输出不变（public 1 行、legacy 0 行，且函数末尾本就按 public 过滤）。需一次 `CREATE OR REPLACE FUNCTION` 与回滚旧函数体 | 3 张全归档 |
| **B. 冻结改名** | `iam.core_tenants`/`flow.core_tenants` 改名为 `_deprecated_*`，函数改读新名；`iam.core_users` 照常归档 | 业务口径零变化，但保留 2 张运行期依赖的冻结表，**本轮不能归档**，需下一轮再改函数 | 只归档 `iam.core_users` |

`iam.core_users` 不受该函数影响，A/B 两种口径下都可归档（先归档引用方 `iam.core_user_roles`）。

## 1. 20261119180000 之后的现存引用

行数（基线实测）全部为 0；三张目标表均无 RLS、无策略；所有相关表无视图、无触发器、无自有序列。

### 1.1 `iam.core_tenants`

| 类型 | 引用方 | 定义 | 代码读写 | 解除方式 |
|---|---|---|---|---|
| 外键 | `iam.core_tenant_plugins` | `core_tenant_plugins_tenant_id_fkey (tenant_id) REFERENCES iam.core_tenants(id) ON DELETE CASCADE` | **是**：`svc/plugin-registry` 十余处显式 `iam.core_tenant_plugins` 读写（安装/启停/续期/查询） | 改引用方：外键改指 `public.core_tenants(id)`（列与 `ON DELETE` 不变），插件代码零改动 |
| 函数 | `finance.bootstrap_defaults(p_tenant_id uuid)` | 分支 1：`to_regclass('iam.core_tenants')` → `INSERT INTO bootstrap_seed_tenants SELECT id ... WHERE deleted_at IS NULL` | **是**：POST `/bootstrap` 运行期调用 | 见 §3 选项 A / B |
| 视图 / 触发器 / 序列默认值 | — | — | — | 无 |

已随 `20261119180000` 消失的 7 条入向外键（来源表本批已归档，无需再处理）：
`iam.core_billing_invoices`、`iam.core_subscriptions`、`iam.core_tenant_modules`、`iam.core_tenant_settings`、`iam.core_tenant_usage`、`iam.core_tenant_users`、`iam.core_usage_records`。

### 1.2 `iam.core_users`

| 类型 | 引用方 | 定义 | 代码读写 | 解除方式 |
|---|---|---|---|---|
| 外键 | `iam.core_user_roles` | `core_user_roles_user_id_fkey (user_id) REFERENCES iam.core_users(id)` | **否**：代码只用 `public.core_user_roles`；`iam.core_user_roles` 无限定/裸名读写 | 先归档引用方 `iam.core_user_roles`（自身 0 行、无入向引用），外键随表消失 |
| 视图 / 函数 / 触发器 / 序列默认值 | — | — | — | 无 |

注：登录权威是 `iam.users`（`svc/hrm/src/modules/setup.rs` 注释已说明 `public.core_users` 与 `iam.users` 不同步、id 空间不重叠）；`iam.core_users` 与 `public.core_users` 均为 0 行。`iam.core_user_roles` 不属任何既有批次。

### 1.3 `flow.core_tenants`

| 类型 | 引用方 | 定义 | 代码读写 | 解除方式 |
|---|---|---|---|---|
| 外键 | `flow._deprecated_core_tenant_modules` | `core_tenant_modules_tenant_id_fkey (tenant_id) REFERENCES flow.core_tenants(id)` | **否**（已被 `20261118160000` 改名冻结） | 先归档这 4 张引用方 |
| 外键 | `flow._deprecated_core_tenant_settings` | 同上 | 否 | 同上 |
| 外键 | `flow._deprecated_core_tenant_usage` | 同上 | 否 | 同上 |
| 外键 | `flow._deprecated_core_tenant_users` | 同上 + `ON DELETE CASCADE` | 否 | 同上 |
| 函数 | `finance.bootstrap_defaults` | 分支 3：`to_regclass('flow.core_tenants')` → 读取 `id` | **是**（仅该函数） | 见 §3 选项 A / B |
| 视图 / 触发器 / 序列默认值 | — | — | — | 无 |

嵌入模式补充：`svc/unified-core` 在嵌入部署下 `SEARCH_PATH="flow, public"`，其未限定表名的 `core_tenants` 当前会命中 `flow.core_tenants`。**删除 `flow.core_tenants` 后自动回落到 `public.core_tenants`，是期望方向**；同组 `core_tenant_modules/settings/usage/users` 在 `20261118160000` 改名后已按同样机制回落到 `public.*`。

### 1.4 另需清理的函数分支（不在三张表内，但同批）

`finance.bootstrap_defaults()` 分支 4 读取 `iam.core_tenant_users`，该表已被 `20261119180000` 归档删除，分支因 `to_regclass` 守卫变成静默 no-op。选项 A 一并删除；选项 B 保留（无害）。

## 2. 权限与数据前置（方案 A 的可行性依据）

- `public.core_tenants` 1 行；`public.core_users`、`public.core_user_roles`、`public.core_tenant_plugins`、`public.core_tenant_users` 均存在且 0 行。
- `iam.core_tenant_plugins` 0 行。其外键当前指向 0 行的 `iam.core_tenants`，意味着**现在任何非空 tenant_id 的插件安装都会被外键拒绝**；改指 `public.core_tenants` 反而修复该潜在缺陷。
- 三张目标表与 5 张引用方均 0 行；列默认值存在（`gen_random_uuid()`/`now()` 等），无序列。

## 3. `finance.bootstrap_defaults()` 改法与影响面（两个选项）

现状（`database/migrations/20261108135000_p2a_single_ledger_convergence.sql` 中的最新定义）：

```
分支 1 iam.core_tenants        → 收集 id（deleted_at is null）
分支 2 public.core_tenants     → 收集 id（deleted_at is null）
分支 3 flow.core_tenants       → 收集 id（deleted_at is null）
分支 4 iam.core_tenant_users   → 收集 tenant_id
分支 5 finance.core_finance_accounts → 收集 tenant_id
末尾：仍存在的租户才保留（NOT EXISTS public.core_tenants → DELETE）
```

关键事实：末尾过滤已经把“只在 legacy 表存在、public 没有”的 id 全部删掉。因此只要 `public.core_tenants` 存在且完整，分支 1/3/4 对最终补播集合**没有增量**。当前生产 public 1 行、legacy 全 0 行，A 与现状输出一致。

调用方：仅 `POST /bootstrap`（`svc/finance/src/modules/bootstrap.rs`，显式 tenant 或 `NULL` 补播全部）；`svc/finance/src/event_handlers/mod.rs:1421` 的调用在 E2E 测试模块内，不是运行期链路。

### 选项 A：收口 `public.core_tenants`

改法（函数其余部分不动）：

```sql
    ELSE
        IF to_regclass('public.core_tenants') IS NOT NULL THEN
            EXECUTE 'INSERT INTO bootstrap_seed_tenants SELECT id FROM public.core_tenants WHERE deleted_at IS NULL';
        END IF;
        IF to_regclass('finance.core_finance_accounts') IS NOT NULL THEN
            EXECUTE 'INSERT INTO bootstrap_seed_tenants SELECT DISTINCT tenant_id FROM finance.core_finance_accounts WHERE tenant_id IS NOT NULL';
        END IF;
    END IF;
```

- 影响面：只影响 `p_tenant_id IS NULL` 的“全量补播”分支；显式传 tenant 的分支不变。
- 代价：需要一次业务代码（函数）变更；若某环境 `public.core_tenants` 为空而 legacy 有数据，补播数会从 N 变 0——但这类 id 原本也会被末尾 DELETE 过滤，实际行为不变。
- 回滚：`CREATE OR REPLACE FUNCTION` 恢复旧函数体（完整旧体随本次变更入库到回滚文件）。

### 选项 B：冻结改名，函数改读 `_deprecated_`

改法：

```sql
ALTER TABLE iam.core_tenants  RENAME TO _deprecated_core_tenants;
ALTER TABLE flow.core_tenants RENAME TO _deprecated_core_tenants;
-- 函数分支改为 to_regclass('iam._deprecated_core_tenants') / ('flow._deprecated_core_tenants')
```

- 影响面：业务口径零变化；但 `iam/flow` 两张表仍然是运行期依赖，**不能进 archive**，只能冻结。
- 代价：需要下一轮再改函数才能归档；期间 `_deprecated_` 表不能被清理。
- 另注：改名后嵌入模式未限定的 `core_tenants` 立即回落到 `public`，与该组其它表的现状一致。

## 4. 迁移（已落地：`20261119200000_unblock_and_archive_legacy_tenant_tables.sql`）

### 4.1 选项 A：`20261119200000_unblock_and_archive_legacy_tenant_tables.sql`

闸门 GUC：`app.tenant_unblock_archive_gate=tenant-unblock-20261119`；归档 schema 元数据沿用 `archive._drop_manifest / _rls_policy_snapshot / _fk_snapshot / _view_snapshot / _column_defaults / _sequence_snapshot`，本批新增 `archive._fk_out_snapshot`（记录被删表自身的出向外键，供回滚）。

| 步骤 | 内容 | 前置断言 | 后置断言 |
|---|---|---|---|
| 0 | 状态核对 | 8 张表存在且行数 0；三目标入向外键集合精确等于 §1（1/1/4）；`public.*` 权威表存在；除 `bootstrap_defaults` 外无其他函数/视图/触发器提及三表 | — |
| 1 | 改引用方：`iam.core_tenant_plugins` 外键改指 `public.core_tenants` | `NOT EXISTS` 孤儿 `tenant_id`（0 行，恒真） | 旧约束不存在、新约束指向 `public.core_tenants` |
| 2 | 归档并 DROP 5 张引用方：`iam.core_user_roles`、`flow._deprecated_core_tenant_{modules,settings,usage,users}` | 每张表入向引用为 0；行数 0 | 归档表存在、三方行数相等（0/0/0）；`_fk_out_snapshot` 记录 `iam.core_user_roles.role_id → iam.core_roles` |
| 3 | `CREATE OR REPLACE FUNCTION finance.bootstrap_defaults`（选项 A 函数体） | 函数存在 | `prosrc` 不含 `iam.core_tenants` / `flow.core_tenants` / `iam.core_tenant_users`，仍含 `public.core_tenants`、`finance.core_finance_accounts` |
| 4 | 归档并 DROP 3 张目标表 | 每张表入向引用为 0（步骤 1/2 已解除） | 三张表不存在；归档表存在；`_drop_manifest` 本批恰好 8 行；三方行数相等 |
| 5 | 终态 | — | 三表 0 残留、5 张引用方 0 残留、`iam.core_tenant_plugins` 仍存在且外键指向 public |

DROP 一律按显式 schema 字面量（`DROP TABLE IF EXISTS iam.%I`）不使用 `CASCADE`。归档名沿用规则：`drop_20261119_ub__<schema>__<table>`（均 < 63 字节，无需截断）。

回滚（成对）：恢复 3 张目标表（结构/数据/默认值）→ 恢复函数旧体 → 恢复 5 张引用方 → 恢复 `iam.core_user_roles.role_id → iam.core_roles` 外键 → 把 `iam.core_tenant_plugins` 外键改回 `iam.core_tenants`（必须在目标表恢复之后）。每步恢复数不等于 manifest 数即 `RAISE EXCEPTION`。

### 4.2 选项 B：`20261119200000_rename_legacy_tenant_tables.sql`

| 步骤 | 内容 | 断言 |
|---|---|---|
| 0 | 状态核对（同 A 步骤 0） | 同 A |
| 1 | `iam.core_tenant_plugins` 外键改指 `public.core_tenants` | 同 A |
| 2 | 归档并 DROP `iam.core_user_roles`、`iam.core_users` | 行数 0；`iam.core_users` 入向引用为 0 |
| 3 | `ALTER TABLE iam.core_tenants RENAME TO _deprecated_core_tenants`；`flow.core_tenants` 同理 | 原名不存在、新名存在；4 条 `_deprecated_*` 外键跟随 |
| 4 | `CREATE OR REPLACE FUNCTION` 改读 `_deprecated_` 名 | `prosrc` 含 `_deprecated_core_tenants`，不含裸 `iam.core_tenants`/`flow.core_tenants` |

回滚：恢复函数旧体 → 改回原名 → 重建 `iam.core_user_roles`/`iam.core_users` → 外键改回 `iam.core_tenants`。

选项 B 不产生归档表，本批 `_drop_manifest` 只有 `iam.core_user_roles`/`iam.core_users` 2 行。

## 5. 演练与快照（已执行）

- `bash scripts/dev/run-migration-drill.sh anchor`：**`[5/5]` PASS**（anchor=20261117235500，75s，2026-11-19）。
- `MIGRATION_DRILL_WRITE_POLICY_SNAPSHOT=1` 重生成：表 798 / 策略 809，与实测完全一致，**零 diff**（本批 8 张表均无 RLS、无策略）。
- 已同步：`migration_manifest.yaml`、`checksums.txt`、回滚文件，以及本文档的“已落地”标注；dev 账本 success（见 §7）。

## 6. 范围与边界

- 已修改 `finance.bootstrap_defaults()`（选项 A 函数体，去掉 iam/flow/`iam.core_tenant_users` 三个分支）；迁移文件、回滚、演练均已完成并落 dev。
- 不动 `TODO.md`、`docs/api/openapi-aggregated.json`、未跟踪评估文档；不 push。
- 5 张引用方中，`iam.core_tenant_plugins` **不归档**（活跃业务表，只改外键）；其余 4 张照常归档。

## 7. dev 落地记录（2026-11-19）

- 备份：`/tmp/topems_pre_r5_b3_20261119184254.dump`（sha256 `f265dafb…79c81`）。
- 执行：`PROD_CHANGE_TICKET=R5-ARCHIVE-B3-20261119`、`PGOPTIONS=-c app.tenant_unblock_archive_gate=tenant-unblock-20261119`、`--allow-destructive=20261119200000`；rc=0。
- 账本：`20261119200000 | success`，`696 行 / 696 success / max=20261119200000`；checksum `c1309183…f2ea6` = 文件 sha384 ✓。
- 断言：
  1. 归档 **8 张**（3 目标 + `iam.core_user_roles` + 4 张 `flow._deprecated_core_tenant_*`），`archive.drop_20261119_ub__*` 各 0 行 ✓
  2. 8 张原表残留 0 ✓
  3. `iam.core_tenant_plugins` 保留，外键 `core_tenant_plugins_tenant_id_fkey` → `public.core_tenants` ✓
  4. `finance.bootstrap_defaults()` 仅引用 `public.core_tenants`，不含 `iam.core_tenants` / `flow.core_tenants` / `iam.core_tenant_users` ✓
  5. `archive` 表数 130 → 139（+8 归档 +1 `_fk_out_snapshot` 簿记）✓
  6. dev 业务表 1395 → 1396（-8 原表 +8 归档 +1 簿记）✓
- 演练：check / write 双模式均 `[5/5]` PASS（表 798 / 策略 809，零 diff）。
- 口径说明：前一轮预报告写「归档 7 张」是漏算 `iam.core_user_roles`；`iam.core_tenant_users` 已由批次① 以 `drop_20261119_lc__iam__core_tenant_users` 归档，故本批清单为 8 张。
- 预期外 diff：无。
