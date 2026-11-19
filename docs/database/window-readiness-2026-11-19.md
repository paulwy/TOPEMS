# 生产窗口就绪包：两波 RLS / 结构迁移（2026-11-19）

> 文档性质：**只做窗口前准备，不应用任何迁移、不写生产、不开窗、不 push**。
> 目标：开窗时照文档执行，不需要现场判断。
> 基线：仓库 HEAD `1f6d828b0744c93633a6b9d89e39c1764c8b66c1`；生产账本 721 行 / `max=20261119000002` / `failed=0`。
> 只读预检连接：`topems_drift`（非特权、非 superuser、无 BYPASSRLS）。
> 配套可执行预检：`docs/database/window-preflight-2026-11-19.sql`（本次已在当前 HEAD 实测跑通，输出见附录 A）。

---

## 0. 13 条迁移的指纹：sha256 / sha384 / commit / 回滚文件

### 0.1 复算命令（必须与当前 HEAD 一致）

```bash
cd /Users/xingzhai/TOPEMS
git rev-parse HEAD
# 逐条复算（示例）：
sha256sum  database/migrations/20261119010000_iam_resource_permissions_role_grants.sql
sha384sum  database/migrations/20261119010000_iam_resource_permissions_role_grants.sql
git log -1 --format=%H -- database/migrations/20261119010000_iam_resource_permissions_role_grants.sql
sha256sum  database/rollback/20261119010000_iam_resource_permissions_role_grants.rollback.sql
```

`apply-forward.sh` 写入账本的 checksum 是**文件字节的 SHA-384**，下表同时给出 sha256（本任务要求）与 sha384（账本核对用）。

### 0.2 第一波（9 条）

| 版本 | 文件（`database/migrations/`） | sha256 | sha384（账本 checksum） | commit |
|---|---|---|---|---|
| 20261119010000 | 20261119010000_iam_resource_permissions_role_grants.sql | `b699c3f280bb8828b47ff648fabbd87de74016c4006f37862d59ebbc5420a7da` | `26712888a40b99d3ed0fdb46934125c437783e4d44d1ae6f130f4fa353416deebe7aeb80fc1f99920e7c8815516d408d` | `a629c42f0e098687271a6ec3fe8d855871efedbc` |
| 20261119120000 | 20261119120000_erp_sales_order_items.sql | `cfed3d911e499ce791b45fb17a42f6a6972f16d8b979a5c01c785360569d9716` | `9026cfe828c3b9615b569f1af0fde982e8126c15b6b50a4755bd247240c31658301a1a1eef3af770149410b44c1e4c90` | `05e86c3a715a454d0b223ed1cc79e586f00a3b92` |
| 20261119130000 | 20261119130000_rls_normalize_batch1_drop_duplicate_legacy.sql | `3e4aee85885a5ffa28eaf63909bd4ae5647e86ec35ca7dd469e8ee8048c4b9fe` | `7eb5712616907bf1cfe5da6a4afae250045b05f3b7dd35be91604caead6ffd612c5d7a8421d03110155a1c996d4bb224` | `5ecd8ed5bfb15e7126d9947fee7115d17e738075` |
| 20261119131000 | 20261119131000_rls_normalize_batch2_rename_legacy.sql | `863dc027effe6f2d7c36b5c961a7a1942b5387b2ea4d9f7d5c8e8c3468c25b6f` | `47deff3979f13247fa450c938f688e91a6e46200f96dd802560ce11ee26f3589fdf54ebe5da32508f6337309b956276d` | `5ecd8ed5bfb15e7126d9947fee7115d17e738075` |
| 20261119140000 | 20261119140000_iam_core_tenant_plugins_rls_strict_forward.sql | `b6abb791a4e7a8566cbde485aa466c1617cc2996c55e8a7d4763d9f915a8f709` | `4f8095503d8e233f1673a228a4758547b1d653c1c42c4ce04c33da2f21f60a233d359a34689aba0b3f1549c2e075037d` | `bb4b9ccf3e3f31848cc7859f57d40221ba8fe081` |
| 20261119141000 | 20261119141000_rls_intentional_policies_guard.sql | `8987b65cdd2428f23f04f0d1f0d1dc5c57d7567f00f21a67518aaecbe524fdf1` | `5c3b616c31db4ee51a006138d9d98c12608e99c2258fa588c85d394453df038a2c6fdecfbc27a41d6674f04535b05fcf` | `6dbf4ba40dff5788591b600487be03b861077546` |
| 20261119150000 | 20261119150000_pdm_master_data_refs_rls_strict_forward.sql | `f5693169013de52c574e040b0f1ce58a3adfa88858ed891a5f6eedb69eb975dd` | `1167e853a60a171312cbd7be4b817364bf101809535891e7a9682865208e482df8ef57614fc1286721a69ee6720e2f13` | `639904225042878151dbadf59551a970be078a23` |
| 20261119151000 | 20261119151000_mobile_oa_announcement_reads_tenant_rls.sql | `903eb6d254095ca004398c8950f1335e70301a5b0470f46d262a9fb0e02c56a7` | `2dbfcea48d2164de7780a0f05a37575cafd27d02bfeefabd882ddab0cfa71b98d4f27513f2608d3fb3025bf4dae70380` | `639904225042878151dbadf59551a970be078a23` |
| 20261119170000 | 20261119170000_seed_core_plugin_categories.sql | `589bd68c1b7b0835675b5332a4fc08f6f2e775297df553cbe6b7bd581d488e9e` | `ead6f1f78de553b5082687c16febe554e95105711dc7cc00459527068fbb91b6705f5ecc34d3ee577ee5c2284bca4812` | `836bd867d0393968c54af6828131f90b454c7dbf` |

### 0.3 第二波（3 条，批 2 另计）

| 版本 | 文件（`database/migrations/`） | sha256 | sha384 | commit |
|---|---|---|---|---|
| 20261119100000 | 20261119100000_drop_dead_tables_batch1.sql | `42717ed5fce70c637faf94ca69ca6b6660750452eb389e891ab4caad51162b0f` | `cccc8c768513a17eae3187299123a0bd8aac8299dcc85cd60b281851d446abd161043094c4f99e392b96d00432ae4016` | `176d6b282e5a2ea7d02b38c3104b265da36af342` |
| 20261119160000 | 20261119160000_drop_zero_path_legacy_tables.sql | `cc30df5798befe482298f37e8e3dcb1d6c38b3460a100ae065cf216c53ccd64c` | `8a58bed713e99b511b5a2a491119c268066c860ebb266250fe4a83d0005d80f82214074cdcd34278e74491350f508c6c` | `e5d2e12ace713bc9a5c64298224a807af511aae5` |
| 20261119161000 | 20261119161000_zero_path_retained_tables_policy_fix.sql | `41f31705a18d5fa3a0f23b5c14c5428a53587255d56044e33001e0bd7489519e` | `8d8b14224cb2a18b3f303a4a6cea5ed8a4adeaf34e5fdca153c1e7a0947c25254f9f681ab33f15266cb2e33a9d4ead27` | `e5d2e12ace713bc9a5c64298224a807af511aae5` |
| 20261119110000（批 2，另计） | 20261119110000_drop_dead_tables_batch2.sql | `1cd4ce082f691c546fdb28ecfefe88161cd0740a45c32e8f7d0f4ba9d5e42e73` | `561f98d80efacf265fcc6f2a4bc6d36717b9d3868e96f7e008b94e6d50f7857e8ee71575e2e37f78187f4faa455cb87e` | `176d6b282e5a2ea7d02b38c3104b265da36af342` |

### 0.4 回滚文件指纹

| 版本 | 回滚文件（`database/rollback/`） | sha256 |
|---|---|---|
| 20261119010000 | 20261119010000_iam_resource_permissions_role_grants.rollback.sql | `169d64c6d452a870fdde7a7419535f205f3391752a28a4ee28cc825344310ea2` |
| 20261119120000 | 20261119120000_erp_sales_order_items.rollback.sql | `19dd638c01891f451166a3fa05ba5e0e59f6bf6fb0b5ad62d33ca0b50c3981d6` |
| 20261119130000 | 20261119130000_rls_normalize_batch1_drop_duplicate_legacy.rollback.sql | `210432d1e96d90e77c1c69d7eefb4c1ae2e863e682e8b5498fac6091d9d818b3` |
| 20261119131000 | 20261119131000_rls_normalize_batch2_rename_legacy.rollback.sql | `c8b90e71c0443468b18ae397b10933c5ce45391ffcdfa135cf31a03b9e2fb399` |
| 20261119140000 | 20261119140000_iam_core_tenant_plugins_rls_strict_forward.rollback.sql | `c8d57d9d29ab5eb531b276aa9c7e320cd92cb6b29c740054eb1e5ced80007c1e` |
| 20261119141000 | 20261119141000_rls_intentional_policies_guard.rollback.sql | `f74c85bc344a0faa1cbf234d2632c5ac23c27af8e724d93bc3a06f4e015816ab` |
| 20261119150000 | 20261119150000_pdm_master_data_refs_rls_strict_forward.rollback.sql | `d278ac5de8b06cebc7f034969b73b5ee299943622e2325dc66953548c0a6a359` |
| 20261119151000 | 20261119151000_mobile_oa_announcement_reads_tenant_rls.rollback.sql | `2b778f4b22261e3b6b8e8b9943d6281c465150d33d61eb9aff69536bb309c321` |
| 20261119170000 | 20261119170000_seed_core_plugin_categories.rollback.sql | `39dfabb8d90f53dd81442880bbb68e42ccab161d3134814e042120afb4c14f0a` |
| 20261119100000 | 20261119100000_drop_dead_tables_batch1.rollback.sql | `0eb7a7cc86e0c5b218947f1d1b44186f53c491ddf3681cd3be80a4ac6327d7d0` |
| 20261119160000 | 20261119160000_drop_zero_path_legacy_tables.rollback.sql | `03996af8f692cb0728e8d132ad30aafead36278e127ca91092de6fb3c7ecc913` |
| 20261119161000 | 20261119161000_zero_path_retained_tables_policy_fix.rollback.sql | `c013b2e49aeab6b213404d47e5508301ae5bf9a245cf73d4336b2aa7128c91ec` |
| 20261119110000 | 20261119110000_drop_dead_tables_batch2.rollback.sql | `b105b304a30fe1437546dd5368c9df7f86418666e144d8a4367a6b561863f1db` |

### 0.5 破坏性语句守卫（本机实测，非生产）

`node scripts/ci/check-destructive-sql.mjs --check-file <file> --strict`：

| 版本 | exit | 结论 |
|---|---|---|
| 20261119010000 / 120000 / 130000 / 131000 / 140000 / 141000 / 150000 / 151000 / 170000 | 0 | 无需 `--allow-destructive` |
| 20261119100000 | 1 | 必须 `--allow-destructive=20261119100000`，ticket `DEAD-TABLE-20261119` |
| 20261119160000 | 1 | 必须 `--allow-destructive=20261119160000`，ticket `ZERO-PATH-20261119` |
| 20261119161000 | 0 | 仅 DROP/CREATE POLICY，不触发破坏性闸门 |
| 20261119110000（另计） | 1 | 必须 `--allow-destructive=20261119110000`，ticket `DEAD-TABLE-20261119` |

---

## 1. 两波执行模型（关键：第二波不能走 `--anchor`）

### 1.1 版本序

```
20261119000002  ← 生产账本 max（锚点）
20261119010000  wave1  01:00
20261119100000  wave2  10:00
20261119110000  batch2 11:00（另计，不进本包）
20261119120000  wave1  12:00
20261119130000  wave1  13:00
20261119131000  wave1  13:10
20261119140000  wave1  14:00
20261119141000  wave1  14:10
20261119150000  wave1  15:00
20261119151000  wave1  15:10
20261119160000  wave2  16:00
20261119161000  wave2  16:10
20261119170000  wave1  17:00
```

**版本号与波次不单调**：第二波三条都小于第一波末尾的 `20261119170000`。

### 1.2 第一波：前向模式

`apply-forward.sh` 正常模式只应用 `version > anchor`。生产账本 max = `20261119000002`，13 条全部大于它。**按当前 HEAD 跟踪的文件统计，大于锚点的迁移恰好就是这 13 条**（`git ls-files 'database/migrations/*.sql' | cut -d_ -f1 | awk '$1>20261119000002'`）。

> 注意本机工作树的偏差：当前目录另有**未跟踪**的 `20261119180000_archive_legacy_schema_copies.sql`（108 张历史 schema 副本，属另一条线，不属本包），`apply-forward` 扫描的是文件系统而不是 git，若不排除会触发「清单外 pending」硬失败。下面的 `--defer` 已显式包含 `20261119180000`；该版本不存在时 defer 条目无副作用，存在时保证不被应用。**目标生产主机必须以干净 HEAD 检出为准**（见 §1.4 第 7 条）。

因此第一波一次调用即可，必须显式给出白名单与 defer。两波共用连接环境（`--db` 路径会读 `PGHOST/PGUSER`，且保留 `PGOPTIONS`）：

```bash
export PGHOST=127.0.0.1 PGPORT=5432 PGUSER=topems_prod PGPASSFILE=$HOME/.pgpass
psql -d topems_prod -tAc "SELECT current_user, inet_server_addr()"   # 期望 topems_prod | 127.0.0.1
```

```bash
export PROD_CHANGE_TICKET="WINDOW-20261119-W1"
bash scripts/migration/apply-forward.sh \
  --db topems_prod --prod \
  --anchor 20261119000002 \
  --only 20261119010000,20261119120000,20261119130000,20261119131000,20261119140000,20261119141000,20261119150000,20261119151000,20261119170000 \
  --defer 20261119100000,20261119110000,20261119160000,20261119161000,20261119180000
```

- 每条文件一个单事务；失败即停、退出码 1，不跳版本。
- 第一波结束账本：**730 行**，`max=20261119170000`，`failed=0`。

### 1.3 第二波：defer 补投模式（单版本、逐条）

第二波版本 < 第一波 max，**不能**再用 `--anchor`（会被拒绝/跳过）。按设计走 `--apply-deferred <version> --ticket`，破坏性版本另加 `--allow-destructive`：

```bash
# W2-1 死表批 1（闸门 GUC 通过 PGOPTIONS 注入到 apply-forward 启动的每个 psql；
#       prod 模式不会自动注入，且不能靠前一会话 SET 持久化）
PGOPTIONS="-c app.drop_dead_tables_gate=batch-1" \
PROD_CHANGE_TICKET=DEAD-TABLE-20261119 bash scripts/migration/apply-forward.sh \
  --db topems_prod --prod \
  --apply-deferred 20261119100000 --ticket DEAD-TABLE-20261119 \
  --allow-destructive=20261119100000

# W2-2 零路径 16 张
PGOPTIONS="-c app.drop_zero_path_tables_gate=zero-path-20261119" \
PROD_CHANGE_TICKET=ZERO-PATH-20261119 bash scripts/migration/apply-forward.sh \
  --db topems_prod --prod \
  --apply-deferred 20261119160000 --ticket ZERO-PATH-20261119 \
  --allow-destructive=20261119160000

# W2-3 保留表策略收敛（非破坏性、无闸门）
PROD_CHANGE_TICKET=ZERO-PATH-20261119 bash scripts/migration/apply-forward.sh \
  --db topems_prod --prod \
  --apply-deferred 20261119161000 --ticket ZERO-PATH-20261119
```

> 必须用 `--db`（本地 socket）而非 `--dsn` URL：脚本会给 URL 追加 `options=-csearch_path%3Dpublic`，conninfo 的 `options` 会压掉 `PGOPTIONS`，导致闸门 GUC 丢失。`--db` 路径保留 `PGOPTIONS` 并在其后追加 `-csearch_path=public`。

- 第二波结束账本：**733 行**，`max` 仍为 `20261119170000`（补投不回写 max），`failed=0`。
- 批 2 `20261119110000` 另计，本包不执行。

### 1.4 硬约束

1. 第一波 9 条必须全部成功后再进第二波；第二波三条按 W2-1 → W2-2 → W2-3 串行。
2. 不得把两波合并成一次 `--anchor` 调用（会把 DROP 混进 RLS 窗口，且破坏性闸门一次只批一个版本）。
3. `20261119110000` 不得在第一波 `--defer` 之外被任何调用顺带应用。
4. 任何一条 `RAISE EXCEPTION` 即整条文件回滚、进程退出；按 §6.4 恢复。
5. 破坏性版本（100000/160000/110000）依赖本机 `node` 与 `scripts/ci/check-destructive-sql.mjs`。`--prod` 模式下 `node` 缺失会进入 DENIED（原文 `[无法校验：node 缺失，拒绝在 prod 应用]`，exit 1，零 DDL），**不会静默跳过**；窗口前必须确认 `node -v` 可用，并已在本包 §0.5 用 `--check-file` 预跑过。非 prod 模式不做破坏性校验。
6. DROP 目标**必须 0 行**：`apply-forward.sh` 在 DDL 前做只读预演，`DROP TABLE` 要求 `destructive-max-rows=0`；票据批准也不能绕过行数闸门（超限报 `预演影响 <n> 行 > 允许 0 行`）。窗口前必须按 §2.4 逐表确认。
7. **迁移目录必须与 HEAD 一致**：开窗前 `git status --porcelain database/migrations database/rollback` 必须为空；若不为空，先改用干净检出（`git worktree add` 到 HEAD），或把每个额外版本显式写进 `--defer`。`apply-forward` 只做「pending 必须在 --only/--defer 内」的校验，不校验文件是否来自 HEAD。

---

## 2. 窗口前预检清单

### 2.1 A 类：`topems_drift` 非特权只读（可执行）

```bash
PGPASSFILE=$HOME/.pgpass \
psql "postgresql://topems_drift@127.0.0.1:5432/topems_prod" \
  -f docs/database/window-preflight-2026-11-19.sql \
  > "preflight_$(date +%Y%m%d_%H%M%S).txt" 2>&1
echo "exit=$?"
```

判读：文件开头必须显示 `topems_drift | topems_prod | 127.0.0.1 | on`；exit=0；输出中不得出现 `ERROR`。

> `topems_drift` 只有 `finance/mes/mobile/public` 的 schema USAGE；业务表数据不可读（实测 `mobile.oa_announcement_reads` 返回 `permission denied for table`），`public` 下仅账本 `_sqlx_migrations` 等少数对象可读。所有目录级读取（账本、`pg_class`、`pg_policies`、`pg_constraint`、`pg_indexes`、`pg_attribute`）都可用；表内数据行必须走 §2.4 B 类。

### 2.2 A 类实测读数（当前 HEAD，2026-11-19）

| 项 | 读数 |
|---|---|
| 会话 | `topems_drift @ topems_prod @ 127.0.0.1`，`txn_read_only=on` |
| 账本 | 721 行 / max `20261119000002` / success 721 / failed 0 |
| 13 条是否已在账本 | 0 行（全部未应用） |
| 表数 | 1344（`relkind='r'` 与 `relkind IN ('r','p')` 同为 1344） |
| RLS | enabled 959 / forced 957 |
| 策略 | 1050 |
| `iam.core_tenant_plugins` | RLS `f/f`；`tenant_id` NOT NULL；**0 条策略**；唯一约束 `(tenant_id, plugin_id)` 已存在；`idx_core_tenant_plugins_tenant` 已存在 |
| `iam.resource_permissions` | 8 列，无 `role_id/effect/scope`；`user_id` NOT NULL；`tenant_id` NOT NULL；无 `iam:resource_acl:*` 权限码 |
| `erp.sales_orders` | 存在，RLS `t/t`；`erp.sales_order_items` 不存在 |
| 归一 batch1（71 张） | 71/71 在库；71 张均为 **2 条策略**；异常 0 |
| 归一 batch2（167 张） | 167/167 在库；159 张 1 条策略、8 张 2 条策略；异常 0 |
| `pdm.pdm_master_data_refs` | `tenant_id` NOT NULL；2 条策略（`pdm_master_data_refs_read` SELECT true + `pdm_master_data_refs_write` 系统通道） |
| `mobile.oa_announcement_reads` | 3 列（无 `tenant_id`）；唯一策略 `mobile_allow_all_oa_announcement_reads` ALL true/true |
| 审计守卫 | `public.core_login_logs` 2 条策略；6 张审计表（bi/flow/gis/iam/qms 的 `audit_logs` + `gis.audit_log`）均为 ALL/USING(true) |
| `core.core_plugin_categories` | 表存在（行数需 B 类） |
| 死表批 1（19 张） | 19/19 在库，缺 0；这些表共 14 条策略、14 张 RLS/14 FORCE；入向 FK 0；依赖视图 1（`mes.v_tenant_backfill_gaps`） |
| 零路径（16 张） | 16/16 在库，缺 0；共 16 条策略、16 张 RLS/16 FORCE；入向 FK 0；依赖视图 0 |
| 保留表（3 张） | 各 1 条 `*_allow_all_*` ALL true/true；RLS `t/t` |
| `archive` schema | 不存在（第 2 波会创建） |

### 2.3 为什么目标清单可信

`130000` 的 71 张与 `131000` 的 167 张目标清单不是手抄，而是直接从迁移文件的 `v_targets` 数组提取：

```bash
# batch1
awk '/v_targets text\[\] := ARRAY\[/{f=1} f{print} /^BEGIN/{f=0}' \
  database/migrations/20261119130000_rls_normalize_batch1_drop_duplicate_legacy.sql \
 | grep -oE "'[a-z0-9_]+\|[a-z0-9_]+\|[a-z0-9_]+" | tr -d "'" | sort -u | wc -l    # 71
# batch2
awk '/v_targets text\[\] := ARRAY\[/{f=1} f{print} /^BEGIN/{f=0}' \
  database/migrations/20261119131000_rls_normalize_batch2_rename_legacy.sql \
 | grep -oE "'[a-z0-9_]+\|[a-z0-9_]+\|[a-z0-9_]+(\|[a-z0-9_]+)?" | tr -d "'" | sort -u | wc -l  # 167
```

同样方式提取 `v_dropped`：batch1 7 张、batch2 20 张；这些表若已不存在，迁移会 NOTICE 跳过；存在但不在该名单则硬失败。当前实测 71/71 与 167/167 全部存在，守卫不会触发跳过。

### 2.4 B 类：需 DBA 特权只读会话（`topems_drift` 无表 SELECT）

开窗前由 DBA 在**只读事务**内执行并保存输出（这些值也是迁移内部断言的对象，此处只作窗口前证据）：

```sql
SET default_transaction_read_only = on;

-- 140000 前置：必须 0 行 NULL / 零租户
SELECT count(*) AS total,
       count(*) FILTER (WHERE tenant_id IS NULL) AS null_tenant,
       count(*) FILTER (WHERE tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) AS zero_tenant
FROM iam.core_tenant_plugins;

-- 150000 前置
SELECT count(*) AS total,
       count(*) FILTER (WHERE tenant_id IS NULL) AS null_tenant,
       count(*) FILTER (WHERE tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) AS zero_tenant
FROM pdm.pdm_master_data_refs;

-- 151000 前置：tenant_id 必须不存在；行数用于回填进度判读
SELECT count(*) AS total FROM mobile.oa_announcement_reads;

-- 170000 前置：按迁移注释应为 0 行
SELECT count(*) AS total FROM core.core_plugin_categories;

-- 20261119010000 前置：历史行必须 user_id 非空、tenant_id 非空
-- （迁移随后 ADD role_id/effect/scope 并加收约束；deleted_at 生产已存在，无需补）
SELECT count(*) AS total,
       count(*) FILTER (WHERE user_id IS NULL) AS null_user,
       count(*) FILTER (WHERE tenant_id IS NULL) AS null_tenant
FROM iam.resource_permissions;

-- 120000 参考
SELECT count(*) AS sales_orders_rows FROM erp.sales_orders;

-- 迁移内归档/回滚依赖
SELECT count(*) AS archive_tables FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='archive' AND c.relkind='r';

-- 【硬闸门】第 2 波 DROP 前置：19 + 16 张表必须全部 0 行。
-- apply-forward.sh 的破坏性预演对 DROP TABLE 要求 destructive-max-rows=0，
-- 任一张非空都会在 DDL 之前直接拒绝执行。下面逐表输出行数，全部必须为 0。
SELECT 'batch1' AS grp, format('%I.%I', sch, tbl) AS object,
       (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', sch, tbl), false, true, '')))[1]::text::bigint AS rows
FROM (VALUES
 ('crm','crm_master_data_refs'),('mes','dashboard_stats'),('mes','financial_records'),
 ('mes','material_requirement_items'),('mes','supply_chain_orders'),
 ('mobile','mobile_leave_applications'),('pm','acceptances'),('pm','documents'),
 ('pm','pm_master_data_refs'),('pm','service_integrations'),('rs','equipment'),
 ('rs','equipment_inspections'),('rs','equipment_maintenance_records'),
 ('shared','audit_logs'),('tms','carriers'),('tms','drivers'),
 ('wms','transfer_items'),('wms','transfers'),('wms','wms_master_data_refs')
) AS t(sch,tbl)
UNION ALL
SELECT 'zero_path', format('%I.%I', sch, tbl),
       (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', sch, tbl), false, true, '')))[1]::text::bigint
FROM (VALUES
 ('doc','document_versions'),('doc','documents'),('doc','folders'),('doc','templates'),
 ('doc_service','archives'),('doc_service','files'),('doc_service','folders'),('doc_service','templates'),
 ('flow','notifications'),('flow','workflows'),('iam','permissions'),
 ('mail','emails'),('mail','templates'),('notification','notifications'),
 ('report','reports'),('storage','files')
) AS t(sch,tbl)
ORDER BY 1,2;
```

判读：`iam.resource_permissions` 的 `null_user`、`null_tenant` 必须为 0（否则 `ck_resource_permissions_subject` / `ck_resource_permissions_scope_tenant` 会在加约束时失败）；`iam.core_tenant_plugins` 与 `pdm.pdm_master_data_refs` 的 `null_tenant`、`zero_tenant` 必须为 0；`core.core_plugin_categories` 应为 0；**19 + 16 张 DROP 目标行数必须全部为 0**；其余是记录基线，不设通过阈值。
若任一 DROP 目标非 0：**停止开窗**，先单独归档/清理并重新评审；不要试图用 `--allow-destructive` 绕过（行数闸门在票据之后仍然生效）。

### 2.5 T-0 门禁（强制；任一不过即停止开窗）

```bash
# 1) 代码基线：必须是本包基线 commit，且迁移目录无额外文件
git rev-parse HEAD    # 期望 1f6d828b0744c93633a6b9d89e39c1764c8b66c1
git status --porcelain database/migrations database/rollback   # 期望空输出；否则见 §1.4 第 7 条

# 2) 破坏性闸门运行时依赖（prod 缺 node 会 DENIED，不是跳过）
node -v

# 3) 账本/DDL 漂移门禁（只读）
PGPASSFILE=$HOME/.pgpass \
MIGRATION_DRIFT_DB_URL=postgresql://topems_drift@127.0.0.1:5432/topems_prod \
node scripts/migration/check-ledger-ddl-drift.mjs
# 期望：PASS，12 断言 / 9 记账，exit 0；只读，不写 topems_prod
```

---

## 3. 第一波逐条 runbook

公共约定：

- 连接：窗口操作员使用生产特权会话（`$WINDOW_DSN`，例如 `postgresql://topems_prod@127.0.0.1:5432/topems_prod` + `PGPASSFILE`）。
- 执行：只通过 `scripts/migration/apply-forward.sh`；不手工 `psql -f` 跑迁移文件。
- 任一文件抛错：该文件事务整体回滚并 exit 1；不要重跑该文件（应先按 §6.4 恢复）。
- 每条失败文本均为迁移内 `RAISE EXCEPTION` 原文，输出命中即停。

### 3.1 `20261119010000` IAM 资源级 ACL

- 目的：`iam.resource_permissions` 增加 `role_id/effect/scope`，放开 `user_id/tenant_id` NOT NULL，5 个 CHECK、2 个索引、2 个 ACL 权限码并授予 3 个角色。
- 前置断言：迁移自身**没有** `RAISE EXCEPTION` 前置；依赖幂等 DDL。现场必须确认：
  - `iam.resource_permissions` 存在（实测：存在，8 列）；
  - `public.core_roles`、`public.core_permissions`、`iam.users` 存在（同一库既有对象）。
- 预期读数（相对 + 绝对）：

| 项 | 前 | 后 |
|---|---|---|
| 账本 | 721 | 722 |
| `iam.resource_permissions` 列 | 8 | 11（+role_id/effect/scope；`deleted_at` 已存在） |
| 该表约束 | 9 | 14（+5 个 `ck_resource_permissions_*`） |
| 该表索引 | 4 | 6（+`uq_resource_permissions_role_scope`、`+idx_resource_permissions_role_id`） |
| `core_permissions` code `iam:resource_acl:%` | 0 | 2 |
| `core_role_permissions` 新授权 | — | 6（tenant_admin/admin/superadmin × 2） |
| 全局策略数 | 1050 | 1050 |

- 失败即停文本（DDL 级，无自定义 RAISE）：
  - `ERROR:  relation "public.core_roles" does not exist`（依赖对象缺失）
  - `ERROR:  could not create unique index "uq_resource_permissions_role_scope"` / `DETAIL: Key (...) is duplicated.`（已有重复角色授予）
  - `ERROR:  check constraint "ck_resource_permissions_scope_tenant" of relation "resource_permissions" is violated by some row`（历史行 `tenant_id` 为空且 `scope` 默认落为 `tenant`）
  - `ERROR:  check constraint "ck_resource_permissions_subject" of relation "resource_permissions" is violated by some row`（历史行 `user_id` 为空）
- 单条回滚：

```bash
psql "$WINDOW_DSN" -v ON_ERROR_STOP=1 --single-transaction \
  -f database/rollback/20261119010000_iam_resource_permissions_role_grants.rollback.sql
psql "$WINDOW_DSN" -v ON_ERROR_STOP=1 \
  -c "DELETE FROM public._sqlx_migrations WHERE version = 20261119010000;"
```

- 回滚后核对：

```sql
SELECT count(*) FROM pg_attribute
 WHERE attrelid = (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                    WHERE n.nspname='iam' AND c.relname='resource_permissions')
   AND attname IN ('role_id','effect','scope') AND NOT attisdropped;   -- 期望 0
SELECT count(*) FROM public.core_permissions WHERE code LIKE 'iam:resource_acl:%'; -- 期望 0
```
  注意：`deleted_at` 不回滚（迁移注释：生产本来就有）。

### 3.2 `20261119120000` ERP 销售订单行项目

- 目的：新建 `erp.sales_order_items`，3 个索引，严格 B 策略 `rls_tenant_isolation`，并给 `scm.sales_order_items` 加归档注释。
- 前置（迁移内断言）：
  - `to_regclass('erp.sales_orders') IS NULL` → `前置断言失败：erp.sales_orders 不存在`
  - 现场额外：`scm.sales_order_items` 必须存在，否则第 5 步 `COMMENT ON TABLE` 报 `relation "scm.sales_order_items" does not exist`（实测：存在）。
- 预期读数：

| 项 | 前 | 后 |
|---|---|---|
| 账本 | 722 | 723 |
| `erp.sales_order_items` | 不存在 | 存在（14 列） |
| 该表策略 | — | 1（`rls_tenant_isolation`，ALL，USING/WITH CHECK 含 `app.rls_system`） |
| 该表 RLS/FORCE | — | `t/t` |
| 该表索引 | — | 4（`erp_sales_order_items_pkey` + `idx_erp_sales_order_items_tenant_id` + `idx_erp_sales_order_items_order` + `idx_erp_sales_order_items_material(tenant_id, material_code)`） |
| 全局表数 | 1344 | 1345 |
| 全局 RLS enabled/forced | 959/957 | 960/958 |
| 全局策略数 | 1050 | 1051 |

- 失败即停文本：
  - `前置断言失败：erp.sales_orders 不存在`
  - `后置断言失败：erp.sales_order_items 策略数 = <n>（期望 1）`
  - `后置断言失败：USING 缺少 app.rls_system 分支：<q>`
  - `后置断言失败：USING 缺少 app.tenant_id 分支：<q>`
  - `后置断言失败：WITH CHECK 缺失或未显式：<q>`
  - `后置断言失败：rls/force_rls = <a>/<b>（期望 true/true）`
  - `后置断言失败：erp.sales_order_items 索引数 = <n>（期望 >= 4，含主键）`
- 单条回滚：`database/rollback/20261119120000_erp_sales_order_items.rollback.sql`（DROP 新表；**若已有业务写入会丢数据**），再删账本行 `20261119120000`。
- 回滚后核对：`erp.sales_order_items` 在 `pg_class` 中不存在（用 `pg_class`+`pg_namespace` 判断，避免 `to_regclass` 需要 schema USAGE）；`scm.sales_order_items` 注释已清空；账本 722 行、max `20261119010000`。

### 3.3 `20261119130000` 归一 batch1：删除 71 张表的重复 legacy 策略

- 目的：每张目标表从 2 条策略（canonical `tenant_isolation_*` + legacy）收敛为 1 条。
- 前置读数（实测）：71/71 表存在；71 张均为 2 条策略；异常 0；FORCE 已开。
- 迁移内断言文本：
  - `batch1 precheck: <s>.<t> 不存在，且不在已知死表删除名单（7 张）内；拒绝静默跳过：若刚调整 20261119100000/20261119110000 的死表清单，请同步本迁移`
  - `batch precheck: <s>.<t> 期望 2 条策略（canonical+legacy），实际 <n>`
  - `batch precheck: <s>.<t> 未 FORCE RLS，拒绝改动`
  - `batch precheck: <s>.<t> 的 canonical 策略不存在或不含系统通道`
  - `batch precheck: <s>.<t> 的遗留策略 <name> 不存在或重名（<n>）`
  - 后置：`batch postcheck: <s>.<t> 期望只剩 1 条 rls_tenant_isolation，实际 <n> 条 / <name>`；`batch postcheck: <s>.<t> canonical 不含系统通道`；`batch postcheck: <s>.<t> 未 FORCE RLS`
  - 另有 `batch1: <s>.<t> 不存在...拒绝静默跳过` 与 `batch1 postcheck: <s>.<t> 不存在...拒绝静默通过`（第二段/后置块）
- 预期读数：账本 723 → 724；全局策略 1051 → **980**（-71）；表数、RLS 计数不变。
- 单条回滚：`database/rollback/20261119130000_rls_normalize_batch1_drop_duplicate_legacy.rollback.sql`（逐字恢复 71 条 legacy 策略），再删账本行。
- 回滚后核对：71 张目标表重新为 2 条策略；全局策略 **1051**；`pg_class` 上 FORCE 仍为 `t`。

### 3.4 `20261119131000` 归一 batch2：159 张重命名 + 8 张多策略合并

- 前置读数（实测）：167/167 表存在；159 张 1 条策略、8 张 2 条策略；异常 0。
- 迁移内断言文本：
  - `batch2 precheck: <s>.<t> 不存在，且不在已知死表删除名单（20 张）内；拒绝静默跳过：若刚调整 20261119100000/20261119110000 的死表清单，请同步本迁移`
  - `batch2 precheck: <s>.<t> 期望 1 条策略，实际 <n>`
  - `batch2 precheck: <s>.<t> 策略命令/表达式不符（cmd=<c>, qual=<q>）`
  - `batch2 precheck: <s>.<t> 未 FORCE RLS`
  - `batch2: <s>.<t> 不存在，且不在已知死表删除名单（20 张）内；拒绝静默跳过`
  - `batch2 multi: <s>.<t> 不存在，且不在已知死表删除名单（20 张）内；拒绝静默跳过`
  - 后置：同 3.3 的 `batch postcheck` 三条；另有 `batch2 postcheck: <s>.<t> 不存在...拒绝静默通过`
- 预期读数：账本 724 → 725；全局策略 980 → **972**（-8）；表数、RLS 计数不变。
- 单条回滚：`database/rollback/20261119131000_rls_normalize_batch2_rename_legacy.rollback.sql`（159 张还原原名原表达式；8 张恢复原策略集合），再删账本行。
- 回滚后核对：167 张目标表恢复为「159×1 + 8×2」；全局策略 **980**。

### 3.5 `20261119140000` `iam.core_tenant_plugins` 严格 B

- 前置（迁移内断言）：
  - 表不存在 → `前置断言失败：iam.core_tenant_plugins 不存在`
  - `前置断言失败：iam.core_tenant_plugins.tenant_id 不是 NOT NULL（当前 <v>）`
  - `前置断言失败：iam.core_tenant_plugins 存在 <n> 行零/NULL 租户，需先定性`
  - 现场实测：RLS `f/f`、0 条策略、`tenant_id` NOT NULL、唯一约束与索引已存在。
- 预期读数：账本 725 → 726；策略 0 → 1（ALL `rls_tenant_isolation`，系统通道 OR 租户等值，WITH CHECK 显式）；RLS `f/f` → `t/t`；全局策略 972 → **973**；全局 RLS enabled/forced 960/958 → **961/959**。
- 失败即停文本：
  - `后置断言失败：策略数应为 1，实际 <n>`
  - `后置断言失败：USING 定义不符合严格 B 范式：<q>`
  - `后置断言失败：WITH CHECK 定义不符合严格 B 范式：<q>`
  - `后置断言失败：RLS/FORCE 未同时开启（rls=<a>, force=<b>）`
  - `后置断言失败：唯一约束 (tenant_id, plugin_id) 缺失`
  - `后置断言失败：idx_core_tenant_plugins_tenant 缺失`
- 单条回滚：`database/rollback/20261119140000_iam_core_tenant_plugins_rls_strict_forward.rollback.sql`（删策略、DISABLE/NO FORCE，回到 0 策略 fail-open），再删账本行。
- 回滚后核对：该表策略 0、RLS `f/f`；全局策略 972、RLS 960/958。

### 3.6 `20261119141000` 审计守卫（纯断言）

- 前置（实测）：`public.core_login_logs` 恰 2 条策略（`rls_system_only` ALL + `rls_tenant_read` SELECT）；bi/flow/gis/iam/qms 的 `audit_logs` 与 `gis.audit_log` 共 6 张存在，均为 ALL/USING(true)。
- 预期读数：账本 726 → 727；**策略数、RLS、表数全部不变**（972 / 961 / 959 / 1345）；输出 NOTICE `守卫通过：public.core_login_logs 双策略（rls_system_only=ALL / rls_tenant_read=SELECT）` 与 `守卫通过：6 张审计表中存在 6 张、跳过 0 张（已删除）...`。
- 失败即停文本：
  - `守卫失败：public.core_login_logs 不存在`
  - `守卫失败：public.core_login_logs 应为「有意双策略」2 条，实际 <n> 条（若确需变更，请先修订本守卫与文档）`
  - `守卫失败：core_login_logs 系统通道策略 rls_system_only 应为 ALL，实际 <c>`
  - `守卫失败：租户策略 rls_tenant_read 必须保持 SELECT 只读，实际 <c>；禁止放大为 ALL/写权限`
  - `守卫失败：public.core_login_logs 未开启 RLS`
  - `守卫失败：审计表 <s>.<t> 不存在，且不在已知死表删除名单（4 张）内；若刚调整 20261119100000/20261119110000 的死表清单，请同步本守卫`
  - `守卫失败：<s>.<t> 的有意放行策略 <p> 缺失`
  - `守卫失败：<s>.<t> 的 <p> 应为有意 fail-open（ALL/USING(true)），实际 cmd=<c>, qual=<q>；若确需收紧请先修订守卫与文档`
  - `守卫失败：<s>.<t> 未开启 RLS`
- 单条回滚：`database/rollback/20261119141000_rls_intentional_policies_guard.rollback.sql`。该文件**自身删除账本行**，不要再执行额外 DELETE（重复执行 DELETE 0 行无害）。
- 回滚后核对：账本 726；所有策略/RLS/表计数与执行前一致。

### 3.7 `20261119150000` `pdm.pdm_master_data_refs` 严格 B

- 前置（实测）：`tenant_id` NOT NULL；恰 2 条策略（`pdm_master_data_refs_read` SELECT USING(true) + `pdm_master_data_refs_write` 系统通道）；RLS `t/t`。
- 迁移内断言文本：
  - `前置断言失败：pdm.pdm_master_data_refs 不存在`
  - `前置断言失败：pdm.pdm_master_data_refs.tenant_id 不是 NOT NULL（当前 <v>）`
  - `前置断言失败：pdm.pdm_master_data_refs 存在 <n> 行 NULL 租户，需先定性`
  - `前置断言失败：pdm.pdm_master_data_refs 存在 <n> 行零租户，需先定性`
  - `前置断言失败：预期 2 条策略（read SELECT true + write 系统通道），实际 <n>`
  - `前置断言失败：pdm_master_data_refs_read(SELECT USING true) 缺失或定义不符`
  - `前置断言失败：pdm_master_data_refs_write(系统通道) 缺失或定义不符`
  - `前置断言失败：RLS/FORCE 未同时开启（rls=<a>, force=<b>）`
  - 后置同 3.5 的四条 `后置断言失败`（策略数 / USING / WITH CHECK / RLS+FORCE）
- 预期读数：账本 727 → 728；该表策略 2 → 1（`rls_tenant_isolation`）；全局策略 973 → **972**；表数/RLS 计数不变（`t/t` 保持）。
- 单条回滚：`database/rollback/20261119150000_pdm_master_data_refs_rls_strict_forward.rollback.sql`（恢复 read+write 两条原策略），再删账本行。
- 回滚后核对：该表 2 条策略、定义与前置读数一致；全局策略 973。

### 3.8 `20261119151000` `mobile.oa_announcement_reads` 补租户维度

- 前置（实测）：表存在、3 列（无 `tenant_id`）、PK `(announcement_id,user_id)`、唯一策略 `mobile_allow_all_oa_announcement_reads`(ALL true)、RLS `t/t`。
- 迁移内断言文本：
  - `前置断言失败：mobile.oa_announcement_reads 不存在`
  - `前置断言失败：mobile.oa_announcement_reads.tenant_id 已存在，禁止重复补列`
  - `前置断言失败：主键 (announcement_id, user_id) 缺失`
  - `前置断言失败：预期唯一策略 mobile_allow_all_oa_announcement_reads(ALL true)，实际 <n> 条`
  - `前置断言失败：RLS/FORCE 未同时开启（rls=<a>, force=<b>）`
  - `回填断言失败：仍有 <n> / <total> 行 tenant_id 为空，需人工定性来源`
  - `后置断言失败：tenant_id 不是 NOT NULL（当前 <v>）`
  - `后置断言失败：策略数应为 1，实际 <n>`
  - `后置断言失败：USING 定义不符合严格 B 范式：<q>`
  - `后置断言失败：WITH CHECK 定义不符合严格 B 范式：<q>`
  - `后置断言失败：RLS/FORCE 未同时开启（rls=<a>, force=<b>）`
  - `后置断言失败：idx_oa_announcement_reads_tenant_user 缺失`
- 预期读数：账本 728 → 729；列 3 → 4（+`tenant_id` UUID NOT NULL）；策略 1 → 1（改名为 `rls_tenant_isolation` 严格 B）；新增索引 `idx_oa_announcement_reads_tenant_user(tenant_id,user_id)`；全局策略 972 不变；表数/RLS 计数不变。
- 单条回滚：`database/rollback/20261119151000_mobile_oa_announcement_reads_tenant_rls.rollback.sql`（删严格策略/索引、取消 NOT NULL、删列、重建 allow-all 策略；**会丢失回填数据**），再删账本行。
- 回滚后核对：该表 3 列、1 条 `mobile_allow_all_oa_announcement_reads`、RLS `t/t`。

### 3.9 `20261119170000` 插件分类种子

- 前置：`core.core_plugin_categories` 存在（实测存在）；按迁移注释生产为 0 行（B 类确认）。
- 幂等：按 `code` NOT EXISTS 插入 9 条。
- 预期读数：账本 729 → **730**；该表行数 +9（基线 0 → 9）；全局策略/RLS/表数不变（972 / 961 / 959 / 1345）。
- 失败即停文本：无自定义 RAISE；表不存在时 NOTICE `core.core_plugin_categories 不存在，跳过种子`；唯一索引冲突会报 `duplicate key value violates unique constraint`。
- 单条回滚：`database/rollback/20261119170000_seed_core_plugin_categories.rollback.sql`（按 9 个 code 删除），再删账本行。
- 回滚后核对：`SELECT count(*) FROM core.core_plugin_categories WHERE code IN (...9 个...)` 期望 0；账本 729。

### 3.10 第一波结束核对

```sql
SELECT count(*), max(version), count(*) FILTER (WHERE NOT success) FROM _sqlx_migrations; -- 730 / 20261119170000 / 0
SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relkind='r' AND n.nspname NOT IN ('pg_catalog','information_schema');           -- 1345
SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema')
   AND c.relrowsecurity;                                                                   -- 961
SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema')
   AND c.relforcerowsecurity;                                                              -- 959
SELECT count(*) FROM pg_policies
 WHERE schemaname NOT IN ('pg_catalog','information_schema');                              -- 972
```

---

## 4. 第二波逐条 runbook

### 4.1 `20261119100000` 死表批 1（19 张）

- 闸门：`current_setting('app.drop_dead_tables_gate', true)` 必须等于 `batch-1`，否则 `gate closed: set app.drop_dead_tables_gate=batch-1`。
  - prod 模式不自动注入该 GUC；用 `PGOPTIONS="-c app.drop_dead_tables_gate=batch-1"` 注入（见 §1.3）。不要用 `psql -c "SET ..."` 再另起进程执行文件——GUC 不会跨会话保留。
- 前置（A 类实测）：19/19 存在；共 14 条策略、14 张 RLS/14 FORCE；入向 FK 0；依赖视图 1（`mes.v_tenant_backfill_gaps`，迁移先写 `archive._view_snapshot` 再 DROP，回滚按快照重建）。
- **前置硬闸门**：19 张必须全部 0 行（§2.4 逐表读数）；非 0 时 `apply-forward` 预演直接拒绝，窗口停止。
- 归档：逐表建 `archive.drop_20261119_b1__<schema>__<table>` 并校验 `src=arc=inserted`；写 `archive._drop_manifest` 19 行、策略/FK/视图/默认值/序列快照。
- 失败即停文本：
  - `gate closed: set app.drop_dead_tables_gate=batch-1`
  - `archive table archive.<arc> already exists: refusing to re-run (clean up manually or use a new batch)`
  - `archive verification failed for <s>.<t>: src=<n>, arc=<n>, inserted=<n>`
- 预期读数：账本 730 → **731**（max 仍 `20261119170000`）；表 1345 → **1326**（-19）；策略 972 → **958**（-14）；RLS enabled/forced 961/959 → **947/945**；`archive` 新增 19 表 + 19 manifest 行。
- 单条回滚：`database/rollback/20261119100000_drop_dead_tables_batch1.rollback.sql`（按 archive 快照重建表/数据/RLS/FK/视图），再删账本行。
- 回滚后核对：19 张表全部回到 `pg_class`；表 1345、策略 972、RLS 961/959；`archive._drop_manifest` 中该版本 19 行仍在（回滚不删 manifest，属预期）。

### 4.2 `20261119160000` 零路径 16 张

- 闸门：`app.drop_zero_path_tables_gate` 必须为 `zero-path-20261119`，否则 `gate closed: set app.drop_zero_path_tables_gate=zero-path-20261119`；同样用 `PGOPTIONS` 注入（见 §1.3）。
- 前置（A 类实测）：16/16 存在；16 条策略；16 张 RLS/16 FORCE；入向 FK 0；依赖视图 0。
- **前置硬闸门**：16 张必须全部 0 行（§2.4 逐表读数）；非 0 时预演拒绝。
- 迁移内断言文本：
  - `pre-check failed: expected 16 tables present, found <n>`
  - `pre-check failed: inbound foreign key found for zero-path batch; split dependent table out`
  - `pre-check failed: dependent view found for zero-path batch; split dependent view out`
  - `archive table archive.<arc> already exists: refusing to re-run`（160000 文本较短，无括号说明）
  - `archive verification failed for <s>.<t>: src=<n>, arc=<n>, inserted=<n>`
  - `post-check failed: <n> zero-path tables still exist`
  - `post-check failed: expected 16 archive tables, found <n>`
  - `post-check failed: expected 16 manifest rows, found <n>`
- 预期读数：账本 731 → **732**；表 1326 → **1310**（-16）；策略 958 → **942**（-16）；RLS enabled/forced 947/945 → **931/929**；archive +16 表 +16 manifest 行。
- 单条回滚：`database/rollback/20261119160000_drop_zero_path_legacy_tables.rollback.sql`，再删账本行。
- 回滚后核对：16 张表回到 `pg_class`；计数回到表 1326、策略 958、RLS 947/945。

### 4.3 `20261119161000` 保留表策略收敛（3 张）

- 目的：`core.core_tenant_plugins`（1 条 `rls_system_only`）、`portal.user_preferences`（1 条 `rls_system_only`）、`iam.roles`（`rls_global_read` + `rls_system_write` 共 2 条）。
- 前置（A 类实测）：三表各 1 条 `*_allow_all_*` ALL true/true；RLS `t/t`。原策略先写入 `archive._rls_policy_snapshot`（`migration_version=20261119161000`）。
- 迁移内断言文本：
  - `post-check failed: core.core_tenant_plugins policy count = <n> (expect 1)`
  - `post-check failed: core.core_tenant_plugins rls_system_only definition mismatch`
  - `post-check failed: core.core_tenant_plugins RLS/FORCE off`
  - `post-check failed: portal.user_preferences policy count = <n> (expect 1)`
  - `post-check failed: portal.user_preferences rls_system_only definition mismatch`
  - `post-check failed: portal.user_preferences RLS/FORCE off`
  - `post-check failed: iam.roles policy count = <n> (expect 2)`
  - `post-check failed: iam.roles rls_global_read definition mismatch`
  - `post-check failed: iam.roles rls_system_write definition mismatch`
  - `post-check failed: iam.roles RLS/FORCE off`
- 预期读数：账本 732 → **733**；策略 942 → **943**（+1：`iam.roles` 1 → 2）；表数 1310、RLS 931/929 不变。
- 单条回滚：`database/rollback/20261119161000_zero_path_retained_tables_policy_fix.rollback.sql`（按快照恢复原 allow-all），再删账本行。
- 回滚后核对：三表恢复各 1 条 `*_allow_all_*`；策略 942。

### 4.4 第二波结束核对

```sql
SELECT count(*), max(version), count(*) FILTER (WHERE NOT success) FROM _sqlx_migrations; -- 733 / 20261119170000 / 0
-- 表 1310；RLS 931/929；策略 943
```

---

## 5. 演练对齐：`run-migration-drill.sh anchor` 与窗口真实路径

### 5.1 演练做了什么

`bash scripts/dev/run-migration-drill.sh anchor`：

1. 从生产基线快照（schema + `_sqlx_migrations` 账本 + 参考数据，`database/baseline/anchors.json`）恢复模板库 `topems_drill_template`，再创建一次性库 `topems_migration_drill_<pid>`。
2. 在 HEAD 创建**独立 worktree**，只读该检出里的迁移/基线/校验脚本（不扫描共享工作树）。
3. 用 `apply-forward.sh --drill-gate-guc-auto` 只应用 `version > anchor` 的迁移；对要求闸门 GUC 的文件自动注入 `SET app.xxx='<value>'`，并额外注入 `SET app.rls_system='on'`。
4. 跑迁移静态校验、权限码审计，以及策略快照门禁（`database/rls_policy_expected.json` vs 实测 `pg_policies`/`pg_class`）。
5. 连接必须非特权（`rolsuper=false` 且 `rolbypassrls=false`），否则直接失败；本机可用 `MIGRATION_DRILL_ALLOW_SUPERUSER=1` 豁免（CI 禁止）。

### 5.2 与窗口真实路径的差异（逐条）

| 维度 | 演练 `anchor` | 生产窗口 |
|---|---|---|
| 数据源 | 基线快照恢复的副本 | 生产现网数据 |
| 连接角色 | 非特权（禁 superuser/BYPASSRLS） | 生产管理员（通常是 superuser/表 owner） |
| 闸门 GUC | 自动注入 `app.drop_dead_tables_gate` / `app.drop_zero_path_tables_gate` | **不自动注入**，必须人工 `SET` 或依赖 `--apply-deferred` 会话 |
| 系统通道 | 统一注入 `app.rls_system='on'` | 不注入；由迁移以特权身份绕过 RLS |
| 应用方式 | 单次 `--anchor` 前向 | 第一波前向；第二波 `--apply-deferred` 单版本 |
| 破坏性闸门 | 演练模式不校验生产票据 | 必须 `--allow-destructive=<version>` + `PROD_CHANGE_TICKET` |
| 策略快照 | 比对仓库期望快照 | 不自动跑；需另跑 `check-rls-policy-snapshot.mjs` |
| 失败代价 | 丢弃一次性库 | 需要按 §6.4 从 archive/dump 恢复 |

### 5.3 演练能覆盖 / 不能覆盖

**能覆盖**：

- 迁移链在 HEAD 上可应用、版本单调、无 `BEGIN/COMMIT` 冲突；
- 迁移内部前置/后置断言在快照数据上成立；
- 迁移终态策略形状与仓库期望快照一致；
- 每条迁移的 checksum 与账本写入路径。

**不能覆盖（必须现场断言）**：

1. **非特权隔离语义**：演练用非特权连接 + 注入系统通道 GUC 来模拟；生产迁移以特权会话执行，RLS 对所有者是 BYPASS，迁移成功 **不等于** 运行时租户隔离正确。窗口后必须用真实租户/系统双通道做 `SET app.tenant_id` / `SET app.rls_system='on'` 的读写验证。
2. **生产数据前置**：`iam.core_tenant_plugins`、`pdm.pdm_master_data_refs` 的 NULL/零租户行数，`core.core_plugin_categories` 是否为空，`erp.sales_orders`/`scm.sales_order_items` 是否存在，只能现场读。
3. **生产现状漂移**：快照是某个 anchor 的副本；生产可能在快照之后新增表/策略/数据（本包 §2 的 13 条前置读数即为对齐手段）。
4. **归档与回滚可逆性**：archive 表创建、行数校验、180 天保留，演练库不承载真实行数/依赖。
5. **锁与时长**：生产表体量、并发连接、锁等待，演练无法复现；`20261119100000/160000` 的 DROP 与 `131000` 的 167 表策略 DDL 必须在窗口内监控 `pg_stat_activity`。
6. **应用二进制**：演练只跑迁移，不验服务启动、`/health`、modules 数、接口行为。

---

## 6. 备件与回退

### 6.1 窗口前 dump（开窗第一步，未做 dump 不得执行任何迁移）

```bash
TS=$(date +%Y%m%d_%H%M%S)
pg_dump -Fc -d topems_prod -f "/Users/xingzhai/topems/backups/topems_prod_pre_win20261119_${TS}.dump"
sha256sum "/Users/xingzhai/topems/backups/topems_prod_pre_win20261119_${TS}.dump" \
  | tee "/Users/xingzhai/topems/backups/topems_prod_pre_win20261119_${TS}.dump.sha256"
```

- 命名：`topems_prod_pre_win20261119_<TS>.dump`（第一波前）；第二波前再取 `..._pre_w2_<TS>.dump`。
- 另存 `pg_dump --schema-only` 的 SQL 文本，便于人工比对结构。
- 校验：`pg_restore -l <dump> | head` 能列出 TOC；文件大小 > 0；sha256 留档。

### 6.2 旧件备份命名与装新件后校验

| 对象 | 命名 | 校验 |
|---|---|---|
| 旧二进制 | `topems-unified-core.<旧commit前8位>.<TS>.bak` | `sha256sum` 与部署清单一致 |
| 新二进制 | `topems-unified-core.<新commit前8位>` | `sha256sum` 与 CI 产物/仓库记录一致 |
| 后端配置 | `config.<TS>.bak`（仅变更时） | diff 只含预期键 |
| 前端产物 | `dist.<TS>.bak/` | 目录内 `index.html` 引用 hash 与构建记录一致 |

装新件后：

```bash
sha256sum <新二进制>
/health                                   # 期望 200
curl -s http://127.0.0.1:8099/api/server/health   # 期望 status=ok，modules=31（与窗口前基线一致）
```

`modules` 数必须与窗口前基线相同；数量变化说明有模块未注册/启动失败，立即停并回退二进制。

### 6.3 起服后验收（迁移窗口与二进制发布同窗时）

1. `/health` → 200；
2. `/api/server/health` → `status=ok`，`modules=31`；
3. 账本 733 行、`failed=0`；
4. §2 的 A 类预检重跑：计数等于 §3.10/§4.4 的预期；
5. 双通道抽样：
   - 系统通道：`SET app.rls_system='on'` 能读到跨租户行；
   - 租户通道：`SET app.tenant_id='<某租户>'` 只能读到本租户行，且对 `iam.core_tenant_plugins`、`pdm.pdm_master_data_refs`、`mobile.oa_announcement_reads`、`erp.sales_order_items` 各抽 1 条；
6. 关键接口 5xx 与窗口前基线持平。

### 6.4 第 N 步失败后恢复到窗口前状态

**原则**：迁移按文件单事务，失败文件自身已回滚；只回滚**已成功的前序文件**，逆序执行，绝不跳版本。

1. 立即停：不再执行后续迁移，保存 `apply-forward` 完整输出与 `psql` 错误文本。
2. 记录现场：

```sql
SELECT version, success, installed_on FROM _sqlx_migrations ORDER BY version DESC LIMIT 20;
SELECT count(*) FROM pg_policies WHERE schemaname NOT IN ('pg_catalog','information_schema');
```

3. 第一波内失败（假设第 k 条失败）：对已成功的第 k-1…1 条**逆序**执行：

```bash
for v in <k-1 ... 1>; do
  f=$(ls database/rollback/${v}_*.rollback.sql)
  psql "$WINDOW_DSN" -v ON_ERROR_STOP=1 --single-transaction -f "$f"
  psql "$WINDOW_DSN" -v ON_ERROR_STOP=1 -c "DELETE FROM public._sqlx_migrations WHERE version = ${v};"
done
```

   回滚顺序（第一波）：`170000 → 151000 → 150000 → 141000 → 140000 → 131000 → 130000 → 120000 → 100000`。
   第二波：`161000 → 160000 → 100000`。

4. 回到窗口前读数：

| 状态 | 账本 | max | 表 | 策略 | RLS enabled/forced |
|---|---|---|---|---|---|
| 原始 | 721 | 20261119000002 | 1344 | 1050 | 959/957 |
| 第一波全回滚后 | 721 | 20261119000002 | 1344 | 1050 | 959/957 |
| 第二波全回滚（第一波保留） | 730 | 20261119170000 | 1345 | 972 | 961/959 |

5. 若 DROP 类迁移回滚失败（archive 表缺失/数据不一致），停止手工修补，改用 §6.1 的 dump 做**整库恢复**（需业务停机确认），并在恢复后重跑 §2 预检。
6. 恢复后重新跑 `run-migration-drill.sh anchor` 与本包 §2，确认基线一致后再决定是否重开窗口。

### 6.5 归档保留

- `archive.drop_20261119_b1__*`（19 张）、`archive.drop_20261119_zp__*`（16 张），`retention_until = now() + 180 days`。
- `archive._drop_manifest` 每批各 19/16 行；`_rls_policy_snapshot`、`_fk_snapshot`、`_view_snapshot`、`_column_defaults`、`_sequence_snapshot` 同步留档。
- 180 天内不得清理；清理前必须确认不再需要按 §6.4 回滚。

---

## 7. 边界与未覆盖

1. 本包**未应用任何迁移**、未写生产、未开窗、未 push。
2. `TODO.md`、`docs/api/openapi-aggregated.json`、`svc/scm`、`svc/srm` 等未提交改动属于其他线，未触碰。
   另：未跟踪的 `database/migrations/20261119180000_archive_legacy_schema_copies.sql` 及其 rollback、以及 `database/migration_manifest.yaml` 中对应条目也属于另一条线；本包只在第一波 `--defer` 中排除它，不修改这些文件、不提交。
3. 批 2 `20261119110000`（188 张）不在本包执行范围；其前置是批 1 观察 ≥7 天，且破坏性票据同为 `DEAD-TABLE-20261119`。
4. `topems_drift` 无业务表 `SELECT`，B 类数据读数必须由 DBA 在特权只读会话补跑；A 类已在本机实测（附录 A）。
5. 演练未覆盖项见 §5.3，窗口内必须按 §6.3 做现场断言。

---

## 附录 A：预检真实输出（2026-11-19，当前 HEAD）

命令：

```bash
PGPASSFILE=$HOME/.pgpass psql "postgresql://topems_drift@127.0.0.1:5432/topems_prod" \
  -f docs/database/window-preflight-2026-11-19.sql > /tmp/win_preflight_repo_out.txt 2>&1
echo "exit=$?"   # exit=0
```

输出（原样，未改写）：

```text
SET
不使用分页器.
== 0. 会话身份（必须是 topems_drift @ topems_prod，txn_read_only=on）==
 current_user | current_database | inet_server_addr | txn_read_only 
--------------+------------------+------------------+---------------
 topems_drift | topems_prod      | 127.0.0.1        | on
(1 行记录)

== 1. 账本水位 ==
 ledger_rows |  max_version   | success_rows | failed_rows 
-------------+----------------+--------------+-------------
         721 | 20261119000002 |          721 |           0
(1 行记录)

    version     | success |         installed_on          
----------------+---------+-------------------------------
 20261119000002 | t       | 2026-11-19 04:34:45.830808+08
 20261119000001 | t       | 2026-11-19 04:34:34.797153+08
 20261118160000 | t       | 2026-11-19 04:34:25.17826+08
 20261118150000 | t       | 2026-11-18 14:55:48.836298+08
 20261118140000 | t       | 2026-11-18 14:55:39.870861+08
(5 行记录)

== 2. 窗口 13 条是否已在生产账本（期望 0 行）==
 version | success 
---------+---------
(0 行记录)

== 3. 表 / RLS / 策略总数 ==
 tables_rp | tables_r 
-----------+----------
      1344 |     1344
(1 行记录)

 rls_enabled | rls_forced 
-------------+------------
         959 |        957
(1 行记录)

 policy_count 
--------------
         1050
(1 行记录)

== 4. iam.core_tenant_plugins 状态（140000 前置）==
 relrowsecurity | relforcerowsecurity 
----------------+---------------------
 f              | f
(1 行记录)

      attname       | attnotnull |           typ            
--------------------+------------+--------------------------
 id                 | t          | uuid
 tenant_id          | t          | uuid
 plugin_id          | t          | uuid
 installed_version  | f          | character varying(32)
 is_active          | f          | boolean
 license_type       | f          | character varying(32)
 license_expires_at | f          | timestamp with time zone
 purchase_order_id  | f          | character varying(128)
 activated_at       | f          | timestamp with time zone
 last_used_at       | f          | timestamp with time zone
 usage_count        | f          | integer
 created_at         | t          | timestamp with time zone
 updated_at         | t          | timestamp with time zone
 deleted_at         | f          | timestamp with time zone
(14 行记录)

 policyname | cmd | qual | with_check 
------------+-----+------+------------
(0 行记录)

                   conname                   |                                     def                                     
---------------------------------------------+-----------------------------------------------------------------------------
 core_tenant_plugins_created_at_not_null     | NOT NULL created_at
 core_tenant_plugins_id_not_null             | NOT NULL id
 core_tenant_plugins_pkey                    | PRIMARY KEY (id)
 core_tenant_plugins_plugin_id_not_null      | NOT NULL plugin_id
 core_tenant_plugins_tenant_id_fkey          | FOREIGN KEY (tenant_id) REFERENCES iam.core_tenants(id) ON DELETE CASCADE
 core_tenant_plugins_tenant_id_not_null      | NOT NULL tenant_id
 core_tenant_plugins_tenant_id_plugin_id_key | UNIQUE (tenant_id, plugin_id)
 core_tenant_plugins_updated_at_not_null     | NOT NULL updated_at
 fk_core_tenant_plugins_plugin               | FOREIGN KEY (plugin_id) REFERENCES core.core_plugins(id) ON DELETE RESTRICT
(9 行记录)

                  indexname                  |                                                           indexdef                                                            
---------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------
 core_tenant_plugins_pkey                    | CREATE UNIQUE INDEX core_tenant_plugins_pkey ON iam.core_tenant_plugins USING btree (id)
 core_tenant_plugins_tenant_id_plugin_id_key | CREATE UNIQUE INDEX core_tenant_plugins_tenant_id_plugin_id_key ON iam.core_tenant_plugins USING btree (tenant_id, plugin_id)
 idx_core_tenant_plugins_plugin_id           | CREATE INDEX idx_core_tenant_plugins_plugin_id ON iam.core_tenant_plugins USING btree (plugin_id)
 idx_core_tenant_plugins_tenant              | CREATE INDEX idx_core_tenant_plugins_tenant ON iam.core_tenant_plugins USING btree (tenant_id)
(4 行记录)

== 5. 第 1 波其余前置 ==
-- 5.1 iam.resource_permissions（20261119010000 前置）
    attname    | attnotnull |           typ            
---------------+------------+--------------------------
 id            | t          | uuid
 resource_type | t          | character varying(64)
 resource_id   | f          | uuid
 user_id       | t          | uuid
 permission    | t          | character varying(128)
 tenant_id     | t          | uuid
 created_at    | t          | timestamp with time zone
 deleted_at    | f          | timestamp with time zone
(8 行记录)

                             conname                             |                               def                                
-----------------------------------------------------------------+------------------------------------------------------------------
 resource_permissions_created_at_not_null                        | NOT NULL created_at
 resource_permissions_id_not_null                                | NOT NULL id
 resource_permissions_permission_not_null                        | NOT NULL permission
 resource_permissions_pkey                                       | PRIMARY KEY (id)
 resource_permissions_resource_type_not_null                     | NOT NULL resource_type
 resource_permissions_resource_type_resource_id_user_id_perm_key | UNIQUE (resource_type, resource_id, user_id, permission)
 resource_permissions_tenant_id_not_null                         | NOT NULL tenant_id
 resource_permissions_user_id_fkey                               | FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE
 resource_permissions_user_id_not_null                           | NOT NULL user_id
(9 行记录)

                            indexname                            
-----------------------------------------------------------------
 idx_resource_permissions_resource
 idx_resource_permissions_user_id
 resource_permissions_pkey
 resource_permissions_resource_type_resource_id_user_id_perm_key
(4 行记录)

 code 
------
(0 行记录)

-- 5.2 erp.sales_orders / erp.sales_order_items（120000 前置）
 sales_orders_present | sales_order_items_present 
----------------------+---------------------------
                20214 |                          
(1 行记录)

 relrowsecurity | relforcerowsecurity 
----------------+---------------------
 t              | t
(1 行记录)

SET
CREATE TABLE
INSERT 0 71
CREATE TABLE
INSERT 0 7
CREATE TABLE
INSERT 0 167
CREATE TABLE
INSERT 0 20
CREATE TABLE
INSERT 0 19
CREATE TABLE
INSERT 0 16
SET
-- 5.3 归一 batch1（20261119130000）：71 张目标前置读数
 targets | present | missing_known_dropped | missing_unexpected | ok_two_policies | bad_policy_count 
---------+---------+-----------------------+--------------------+-----------------+------------------
      71 |      71 |                     0 |                  0 |              71 |                0
(1 行记录)

 sch | tbl | policy_count 
-----+-----+--------------
(0 行记录)

-- 5.4 归一 batch2（20261119131000）：167 张目标前置读数
 targets | present | missing_known_dropped | missing_unexpected 
---------+---------+-----------------------+--------------------
     167 |     167 |                     0 |                  0
(1 行记录)

 policy_count | tables 
--------------+--------
            1 |    159
            2 |      8
(2 行记录)

 sch | tbl | policy_count 
-----+-----+--------------
(0 行记录)

-- 5.5 pdm.pdm_master_data_refs（150000 前置）
  attname  | attnotnull 
-----------+------------
 tenant_id | t
(1 行记录)

         policyname         |  cmd   |                                        qual                                         |                                     with_check                                      
----------------------------+--------+-------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------
 pdm_master_data_refs_read  | SELECT | true                                                                                | 
 pdm_master_data_refs_write | ALL    | (COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) | (COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
(2 行记录)

-- 5.6 mobile.oa_announcement_reads（151000 前置）
  tbl  
-------
 28103
(1 行记录)

     attname     | attnotnull |           typ            
-----------------+------------+--------------------------
 announcement_id | t          | uuid
 user_id         | t          | text
 created_at      | t          | timestamp with time zone
(3 行记录)

               policyname               | cmd | qual | with_check 
----------------------------------------+-----+------+------------
 mobile_allow_all_oa_announcement_reads | ALL | true | true
(1 行记录)

-- 5.7 审计守卫（20261119141000 前置）
 schemaname |    tablename    |        policyname         |  cmd   |                                                                                     qual                                                                                      |                                     with_check                                      
------------+-----------------+---------------------------+--------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------
 bi         | audit_logs      | bi_allow_all_audit_logs   | ALL    | true                                                                                                                                                                          | true
 flow       | audit_logs      | flow_allow_all_audit_logs | ALL    | true                                                                                                                                                                          | true
 gis        | audit_log       | gis_allow_all_audit_log   | ALL    | true                                                                                                                                                                          | true
 gis        | audit_logs      | gis_allow_all_audit_logs  | ALL    | true                                                                                                                                                                          | true
 iam        | audit_logs      | iam_allow_all_audit_logs  | ALL    | true                                                                                                                                                                          | true
 public     | core_login_logs | rls_system_only           | ALL    | (COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)                                                                                           | (COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
 public     | core_login_logs | rls_tenant_read           | SELECT | ((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)) | 
 qms        | audit_logs      | qms_allow_all_audit_logs  | ALL    | true                                                                                                                                                                          | true
(8 行记录)

 core_login_logs_policies 
--------------------------
                        2
(1 行记录)

-- 5.8 插件分类种子（20261119170000 前置）
  tbl  
-------
 18083
(1 行记录)

== 6. 第 2 波前置读数 ==
-- 6.1 死表批 1：19 张现状（期望 present=19 / missing=0）
 expected | present | missing 
----------+---------+---------
       19 |      19 |       0
(1 行记录)

 sch | tbl 
-----+-----
(0 行记录)

-- 6.2 零路径 16 张现状（期望 present=16 / missing=0）
 expected | present | missing 
----------+---------+---------
       16 |      16 |       0
(1 行记录)

 sch | tbl 
-----+-----
(0 行记录)

-- 6.3 零路径 16 张：出入向 FK / 依赖视图（期望 0 / 0）
 inbound_fks 
-------------
           0
(1 行记录)

 dependent_views 
-----------------
               0
(1 行记录)

-- 6.3a 死表批 1：入向 FK / 依赖视图（视图随表 DROP，回滚按 _view_snapshot 重建）
 inbound_fks 
-------------
           0
(1 行记录)

 view_schema |       view_name        | kind 
-------------+------------------------+------
 mes         | v_tenant_backfill_gaps | v
(1 行记录)

-- 6.4 保留表 3 张现状（161000 前置）
 schemaname |      tablename      |             policyname             | cmd | qual | with_check 
------------+---------------------+------------------------------------+-----+------+------------
 core       | core_tenant_plugins | core_allow_all_core_tenant_plugins | ALL | true | true
 iam        | roles               | iam_allow_all_roles                | ALL | true | true
 portal     | user_preferences    | portal_allow_all_user_preferences  | ALL | true | true
(3 行记录)

 nspname |       relname       | relrowsecurity | relforcerowsecurity 
---------+---------------------+----------------+---------------------
 core    | core_tenant_plugins | t              | t
 iam     | roles               | t              | t
 portal  | user_preferences    | t              | t
(3 行记录)

-- 6.5 归档 schema 现状（第 2 波会写入）
 drop_manifest | rls_snapshot | fk_snapshot | view_snapshot 
---------------+--------------+-------------+---------------
               |              |             |              
(1 行记录)

 archive_tables 
----------------
              0
(1 行记录)
```

> 说明：以上为 `psql -f docs/database/window-preflight-2026-11-19.sql` 的完整 stdout（exit=0），未做删改。
> 注：§5.6 / §5.8 的 `tbl` 列输出的是 `pg_class.oid`（存在性），**不是行数**；`topems_drift` 无业务表 `SELECT`，行数必须走 §2.4 B 类。
