# P3 #6 · head 库 RLS 策略快照对照复跑备忘（2026-11-25）

> 范围：在本地可连的 head / 校验 / 演练库上复跑 RLS 策略快照对照，确认代码基准快照与迁移链终态是否闭环，识别 fixture 库快照偏差，并沉淀 CI / 生产发布前可复用的对照口径。**只读连库核对，不改迁移链、不改基准快照、不写任何库。**

## 1. 对照工具链盘点（既有，无新增脚本）

| 层 | 脚本 | 连库 | 口径 | CI 挂载 |
|---|---|---|---|---|
| 静态覆盖粗分类 | `scripts/check-rls-coverage.py` | 否 | 扫描 `CREATE TABLE` / `ENABLE RLS`，启发式分 business 粗类；`--check` 退出码不阻断 | 未挂（辅助盘点） |
| 静态策略形态 | `scripts/ci/check-rls-policy-shape.sh` | 可选（`RLS_CHECK_DB=`） | 防 fail-open 回潮：空串全量、`IS NULL` 豁免、硬编码租户、ENABLE 缺 FORCE 等 | **已挂** `.github/workflows/ci.yml` |
| 连库全量快照对照 | `scripts/ci/check-rls-policy-snapshot.mjs` + `scripts/ci/lib/rls-policy-snapshot.mjs` | 是 | 只读 `pg_class` / `pg_namespace` / `pg_policies`，与基准 `database/rls_policy_expected.json` 全量比对：多表/少表、多策略/少策略、`relrowsecurity` / `relforcerowsecurity`、`cmd/permissive/roles/using/with_check` 逐项计入 problems | 未挂 CI；本地 / drill anchor / 生产发布前手动跑 |

基准快照固定为 `database/rls_policy_expected.json`：**version 1，801 张表，855 条策略**。

## 2. 门禁连接约束（复跑前必须满足）

- **拒绝特权连接**：`assertNonPrivileged` 在连库后查 `current_user` 的 `rolsuper` / `rolbypassrls`，任一为真即 FAILED，**不提供豁免开关**。超户连接会绕过 RLS，策略断言恒真，不能作为对照口径。
- 本地非超户角色：`topems_test_runner`（`rolsuper=false, rolbypassrls=false`）。管理角色 `xingzhai` 是 superuser + BYPASSRLS，**不得**直接跑快照门禁。
- 连接解析顺序（CLI 入口）：`--dsn` > `RLS_POLICY_DB_URL` > `MIGRATION_DRIFT_DB_URL` > `DATABASE_URL` > `.env MIGRATE_URL`。
- 本地 PG：走 socket `/tmp` 可通；`127.0.0.1` TCP 连本地库会挂起，连本地库一律走 socket。

## 3. 本地实测读数（2026-11-25）

| 库 | 角色 | 实测表 / 策略 | 对照结果 | 偏差定性 |
|---|---|---|---|---|
| `topems_runtime_fixture_verify` | topems_test_runner | 801 / 855 | **PASS**，与基准完全一致 | 无偏差；head 链终态口径闭环 |
| `topems_runtime_gate_verify` | topems_test_runner | 801 / 855 | **PASS**，与基准完全一致 | 无偏差；head 链终态口径闭环 |
| `topems_drift_check` | topems_test_runner | 800 / 835 | **FAILED**，35 项不一致 | 历史旧版演练库：基准的 `company_read/write/select/update/insert/delete/system` 成套策略在库内缺失，旧单条 `rls_tenant_isolation` 残留；`finance.finance_u8_import_records` 谓词为旧值。系迁移链未追平，**非基准快照缺陷** |
| `topems_smoke` | topems_test_runner | — | **FAILED**，751 项未展示 | 旧烟测库，schema 来源不可追溯，不纳入基准判定 |

> 说明：上述校验库 `_sqlx_migrations` 账本 0 行、版本不可追溯；对照判定以连库实测策略集合与基准 JSON 的比对为准，不以账本水位反推。

### 3.1 偏差模式（drift_check 样例，供追平时识别）

- 基准已把旧单条 `rls_tenant_isolation` 拆成 `*_company_read / *_company_write / *_system`（ERP 订单）、`*_company_select / insert / update / delete`（integration / settings / monitor / tenant_modules）等成套策略；旧库仍保留单条 `rls_tenant_isolation`。
- `finance.finance_u8_import_records` 的 `using` / `with_check` 谓词为旧值（已在链上 `20261119190000` / `20261119230000` 收紧，见 shape 脚本 REMEDIATED 白名单）。
- 该类偏差方向与生产账本滞后同源：**追平迁移链后重放**，不应回改基准快照去迁就旧库。

## 4. 结论

1. **基准快照无 fixture 偏差**：两个 head 校验库（fixture_verify、runtime_gate_verify）连库实测 801 表 / 855 策略，与 `rls_policy_expected.json` 逐项一致、PASS。代码基准与迁移链终态在本地闭环。
2. **现存偏差均在历史旧库**：`drift_check`、`smoke` 的不一致来自旧版演练/烟测库未追平迁移链，不是基准 JSON 错误，也不是 head 代码漏挂策略。
3. **CI 现状**：静态 shape 门禁已在 CI 拦截 fail-open 回潮；连库全量快照对照目前只在本地 / drill anchor / 生产发布前执行，CI 流水线未挂载连库 snapshot 步骤。

## 5. 可复用对照口径（CI / 窗口前复跑）

### 5.1 本地 / 预发 head 库对照

```bash
# 非超户角色连接；DSN 替换为目标库
RLS_POLICY_DB_URL="postgres://topems_test_runner:<pwd>@127.0.0.1:5432/<head库>" \
  node scripts/ci/check-rls-policy-snapshot.mjs
# 或显式 --dsn
node scripts/ci/check-rls-policy-snapshot.mjs --dsn "postgres://topems_test_runner:<pwd>@127.0.0.1:5432/<库>"
```

- 退出码 0 = 快照与实测完全一致；非 0 = problems 逐项列出（表缺失/多出、策略缺失/多出、开关/谓词/角色不符）。
- 只读查询，不写目标库；连接角色必须非 superuser / 非 BYPASSRLS。

### 5.2 迁移演练终态断言

- `drill:anchor`（正式闸门）：基线快照 + 前向迁移到 head，终态由快照门禁断言「迁移链终态 = 基准快照」。
  ```bash
  bash scripts/dev/run-migration-drill.sh anchor
  ```
- `drill:zero`（空库全链）：已知缺陷 **MIG-001**（pgvector 扩展在非特权角色下阻塞），预期失败，**不进 pre-push / verify:full**，不以非超户角色强补。

### 5.3 快照更新红线

- 基准快照只能随迁移一起更新：
  ```bash
  MIGRATION_DRILL_WRITE_POLICY_SNAPSHOT=1 bash scripts/dev/run-migration-drill.sh anchor
  ```
  生成后逐条 review `git diff`，与同批迁移一并提交；**不得为过门禁直接刷新快照**。
- 生产发布前用 `topems_drift` 库手动跑 `check-rls-policy-snapshot.mjs`；该门禁只验证迁移链终态与快照一致，**不替代生产库对照**。

## 6. 阻塞与后续

- **生产库本地不可达**：本地不连生产；生产账本追平（水位 `20261119000002` → 头版本）后，须在生产只读快照 / `topems_drift` 复跑同一门禁，档 2 漂移与 A 类结论以追平后快照为准。
- **历史旧库偏差**：`drift_check` / `smoke` 为残留演练库，不作为基准；如需清理按 P2 表治理口径评估，不在本门禁内自动处置。
- **未挂 CI 的连库 snapshot**：如需在 PR 阶段获得连库全量断言，需先在 CI 提供非超户可连的 head 临时库（含扩展恢复权限），再挂 `check-rls-policy-snapshot.mjs`；当前静态 shape 门禁已覆盖 fail-open 回潮的主要防线。

## 7. 证据复现命令

```bash
cd /Users/xingzhai/TOPEMS
# 基准计数
python3 -c "import json;d=json.load(open('database/rls_policy_expected.json'));print(len(d['tables']),sum(len(t.get('policies',[])) for t in d['tables']))"
# 各库对照（角色/口令取自 .env TEST_DATABASE_URL，不入库、不打印）
set -a && . ./.env && set +a
for db in topems_runtime_fixture_verify topems_runtime_gate_verify topems_drift_check topems_smoke; do
  node scripts/ci/check-rls-policy-snapshot.mjs --dsn "postgres://topems_test_runner:<pwd>@127.0.0.1:5432/$db"
done
```
