# 测试有效性分诊（`#[ignore]` 与 early-return）

- 日期：2026-11-18
- 范围：全仓 `*.rs`（`svc/**`、`lib/**`、`apps/**`）
- 性质：只读盘点 + 分诊建议；统计口径可复现。**P0 的测试 DSN 护栏已单独落地**，见第 8 节。
- 未改动：`database/migrations/**`、`database/migration_manifest.yaml`、`database/checksums.txt`、`.github/workflows/ci.yml`。

## 1. 结论摘要

| 指标 | 数量 |
| --- | ---: |
| `#[ignore]` 原始 grep 命中 | 548 |
| 其中注释/doc 文本误报 | 13 |
| **真实 `#[ignore]` 属性** | **535** |
| ├ 无原因裸标 | 380 |
| ├ 显式 `requires PostgreSQL` | 113 |
| └ 其他显式原因（Redis / Dify / 服务 / 演练等） | 42 |
| 环境缺失即 early-return 的测试函数 | 492 |
| ├ **没有 `#[ignore]`（默认永真通过）** | **150** |
| └ `#[ignore]` + early-return 双重掩盖 | 342 |

关键判断：

1. **548 这个数偏高**：13 处是文件头注释里的 `#[ignore]` 字样（如 10 个 master-data 文件的
   `//! 所有测试默认 #[ignore]`），不是属性。真实属性 535。
2. **裸标占比 71%**：380 处没有原因说明，其中 377 处所在文件实际需要运行中的 HTTP 服务
   （`reqwest` + `localhost` 探测），1 处同时需要 HTTP + PG，2 处只缺 PG。
3. **最大的失真来源不是 `#[ignore]`，而是 150 个没有 `#[ignore]` 的 early-return**：
   默认 `cargo test` 会执行它们，但环境缺失时直接 `return`，统计上永远是绿的。
4. **双重掩盖 342 处**：即使加 `--ignored` 手动启用，仍会因为 early-return 静默通过，
   `--ignored` 也拿不到真实结果。

## 2. 口径与方法

```bash
# 1) 原始命中
grep -rn '#\[ignore' --include='*.rs' . | wc -l          # 548

# 2) 排除注释/doc 文本后，按文件统计真实属性
grep -rn '^\s*#\[ignore' --include='*.rs' . | wc -l      # 535

# 3) 裸标 vs 带原因
grep -rn '^\s*#\[ignore\]' --include='*.rs' . | wc -l    # 380
grep -rn '^\s*#\[ignore = ' --include='*.rs' . | wc -l   # 155
```

early-return 的识别规则：测试函数体内，首个 `return;` / `return Ok(())` 出现在首个断言或
SQL/HTTP 调用之前，且其前置 8 行内出现 `env::var`、`DATABASE_URL`、`ensure_*`、
`*_available`、`PgPool::connect`、`reqwest`、`redis` 等环境特征。该规则会漏掉纯
`if !check() { return; }` 的自定义封装，因此 492 是**下限**。

## 3. 分类统计表

按「实际依赖」归并（裸标按所在文件的依赖特征推断）：

| 类别 | 数量 | 判定依据 |
| --- | ---: | --- |
| 需要运行中的 HTTP 服务 | 392 | 文件内 `reqwest` / `localhost:80xx` / 服务健康探测；裸标 377 + 显式 14 + 1 |
| 需要 PostgreSQL | 118 | 显式 113 + 裸标 2 + 1；其中 17 处原因写 PostgreSQL 但实际跑 HTTP（见下） |
| 需要 Redis | 13 | 显式 `requires Redis` 13（shared-event 8、shared-core 5） |
| 需要 Dify 外部实例 | 3 | `DIFY_API_KEY` / 外部 URL |
| 人工演练 / 证据库 | 7 | `w7_b4_fresh`、`topems_rls_drill` 等专用库 |
| 实现未完成（占位/废弃） | 2 | ERP `Contract APIs are not implemented`、`Payment schedule ... not implemented` |
| 与已有用例重复 | 1 | portal 两个 V60 文件中的 `test_portal_health_check_reachable` 完全同文 |
| **合计** | **535** | |

> 口径修正：113 处 `requires PostgreSQL` 中，`svc/crm/tests/plugin_integration_test.rs`（8）
> 与 `svc/hrm/tests/plugin_integration_test.rs`（9）实际是 HTTP 插件集成测试，原因文案与
> 实际依赖不符，共 17 处。分诊时按 HTTP 计入。

## 4. 逐 crate 清单摘要

| crate | `#[ignore]` | 裸标 | 主要依赖 | 备注 |
| --- | ---: | ---: | --- | --- |
| svc/unified-core | 177 | 169 | HTTP | IAM/权限/租户用例，需服务运行 |
| svc/master-data | 102 | 102 | HTTP | 10 个 V5x/V60 集成文件，模板化 |
| svc/finance | 83 | 75 | HTTP + PG | 75 个财务 V60 接口、8 个 PG |
| svc/portal | 30 | 30 | HTTP | 含 1 处重复用例 |
| svc/crm | 21 | 2 | PG（19 显式） | 其中 8 个 plugin 实为 HTTP |
| svc/wms | 15 | 0 | PG | 全部在 `http_endpoint_tests` feature 后 |
| svc/pdm | 14 | 0 | PG 8 + 证据库 6 | `w7_b4_fresh` 需专用 seed |
| svc/qms | 14 | 0 | PG | 部分在 feature 后 |
| svc/rd | 14 | 0 | PG | 含 1 处「里程碑/成员 API 未实现」 |
| svc/ai | 11 | 2 | HTTP 8 + Dify 3 | 外部 AI 服务 |
| svc/scm | 10 | 0 | PG | |
| svc/hrm | 9 | 0 | PG（实为 HTTP） | 原因文案不符 |
| lib/shared-event | 8 | 0 | Redis | 事件总线 smoke |
| svc/gis | 6 | 0 | PG | |
| lib/shared-core | 5 | 0 | Redis | 限流/缓存 |
| svc/mobile | 5 | 0 | PG | |
| svc/srm | 5 | 0 | PG | |
| svc/erp | 4 | 0 | PG/证据/未实现 | 2 处为未实现占位 |
| svc/analytics | 1 | 0 | PG | BI 严格模式 |
| svc/communication | 1 | 0 | PG | `core_email_queue` |
| **合计** | **535** | **380** | | |

## 5. 「环境缺失即 early-return」清单

### 5.1 没有 `#[ignore]`、默认永真通过（150 个，优先处理）

| 文件 | 数量 | 代表行号 |
| --- | ---: | --- |
| `svc/mes/tests/integration_tests.rs` | 47 | 43、53 |
| `svc/ehs/tests/ehs_tests.rs` | 10 | 56、90 |
| `svc/ai/tests/integration_tests.rs` | 8 | 30、40 |
| `lib/shared-db/tests/scope_search_path_it.rs` | 8 | 74、129 |
| `svc/lims/tests/integration_tests.rs` | 8 | 45、55 |
| `lib/shared-bootstrap/src/lib.rs` | 5 | 2820、2842 |
| 其余（crm/scm/rd/mobile/qms/finance/pdm/gis/srm/analytics 等） | 54 | 见各文件 `ensure_db_available` 调用点 |

这些用例掩盖的断言类型：

- 表/列存在性与迁移结果（`test_*_table_exists`、`column exists`）；
- CRUD 与事务提交/回滚；
- RLS / `search_path` 隔离（shared-db 的 8 个用例最典型）；
- 跨服务接口契约（HTTP 200/字段）。

### 5.2 `#[ignore]` + early-return 双重掩盖（342 个）

主要分布在 unified-core、master-data、finance、wms/qms/rd/crm/scm 的集成测试。特点是：
`#[ignore]` 让你以为「手动 `--ignored` 就能跑」，但测试体第一步仍是
`if !ensure_db_available() { return; }`，DB 探活失败就静默通过。

### 5.3 改法方向（本轮未改代码）

1. 缺环境应 **panic 失败**，不要 `return`；错误信息带上所需服务与连接串来源。
2. 确实需要人工环境的用例，保留 `#[ignore = "原因"]`，但删除体内 early-return，
   让 `--ignored` 真正执行或真正失败。
3. 依赖运行中 HTTP 服务的用例，长期应改为进程内 router 测试或 `#[sqlx::test]`
   直连 handler，避免端口/进程编排。
4. 只被 `http_endpoint_tests` feature 门控的 wms/qms 用例，需决定是纳入默认测试
   还是明确标记为手动套件。

## 6. 可启用性分级（基于当前测试环境）

本机已确认：角色 `topems_test_runner` = `LOGIN + CREATEDB + NOBYPASSRLS`（非 superuser），
数据库 `topems_test_runner` 存在（1346 张表，`_sqlx_migrations` 为空，属结构副本）。

| 分级 | 判据 | 数量级 |
| --- | --- | --- |
| A. 现在就能启用 | 只依赖 PG，且使用 `#[sqlx::test(migrations = false)]` 或 `TEST_DATABASE_URL` | 约 30–50 个 |
| B. 补环境后可启用 | 需 PG + feature/专用角色/严格模式；或需 Redis | 约 130 个 |
| C. 不建议启用 | 需运行中服务、Dify、专用演练库，或实现未完成 | 约 350 个 |

本轮 P0 已验证：`#[sqlx::test]` 在 `TEST_DATABASE_URL` 指向 runner 时可以正常建库并执行；
一旦真正执行，立刻暴露了真实问题（见 6.1）。

### 6.1 启用后已暴露的真实缺陷样本

> 以下按「只报不修」归档，本轮不改测试代码，也不改迁移/实体。

**① `lib/shared-auth/tests/rls_middleware_e2e.rs:40`**
`permission denied to set role "rls_test_user"`

- 根因一句话：用例假设测试连接有权 `SET ROLE rls_test_user`（即执行者是 superuser 或已是该角色成员），
  而本机测试角色 `topems_test_runner` 是 LOGIN + CREATEDB + NOBYPASSRLS 的普通角色，既不能切到
  目标角色、也无法绕过 RLS 建角色，断言前提与角色能力不匹配。
- 影响：2 个用例失败（`3 passed / 2 failed`），不是护栏回归。
- 建议方向（本轮不做）：测试内用 `CREATE ROLE ... NOBYPASSRLS` 后以该角色建连接，或改用 superuser
  专用 DSN；不要把 `topems_test_runner` 提权。

**② `svc/crm/src/tests/rls_isolation_test.rs:132`**
`column "name_en" does not exist`

- 根因一句话：测试自带建表脚本与实体/迁移漂移——`crm.customers` 的建表 SQL 少列，而实体（FromRow）
  按最新结构取 `name_en`，两边 schema 版本不一致。
- 影响：crm `--lib` 2 个用例失败，与 DSN 护栏无关。
- 建议方向（本轮不做）：以 `database/migrations/**` 为准整体替换测试内联建表，不再手写列。

**③ `lib/shared-auth/tests/permission_backfill_e2e.rs:321`**
superuser 走 system channel 的断言失败

- 状态：待确认是测试假设过期还是实现回归，暂不归档为缺陷。

### 6.2 批次建议（P0 完成后另开任务，本轮不执行）

- 第一批（最小）：shared-db 的 `scope_search_path_it`（8）+ `connection_budget_it`（2）、
  `lib/tests/tenant_scope_sql`（2）、shared-bootstrap（5）。纯 PG、无外部服务，
  预计单 crate 增量编译 1–3 分钟，执行 < 10 秒。可能暴露：search_path/RLS 隔离回归、
  租户越权、schema 漂移。
- 第二批：crm/shared-auth 的 `#[sqlx::test]` 用例，先修 SET ROLE 与建表漂移，再转绿。
- 第三批：wms/qms/rd/crm/scm/gis/mobile/srm 的 `requires PostgreSQL` 集成测试，
  需先统一 DSN 与 feature 门控。
- 暂不启用：unified-core/master-data/finance/portal 的 HTTP 套件、Dify、演练库。

### 6.3 建议直接删除或改写

- `svc/erp/tests/contract_tests.rs:18` `test_project_contract_crud`：函数体只有
  `eprintln`，且没有 `#[tokio::test]`，不是可执行测试（幽灵用例）。
- `svc/portal/tests/ai_ops_v60_integration.rs:87` 与
  `svc/portal/tests/deployment_v60_integration.rs:87` 的
  `test_portal_health_check_reachable`：完全重复，保留一份。
- `svc/rd/tests/project_relation_tests.rs:360`：里程碑/成员 API 未实现的占位断言，
  建议删除或改为带 issue 链接的 `#[ignore]`。

## 7. 代表条目（路径:行号）

- 裸标 + HTTP：`svc/unified-core/tests/iam_permission_tests.rs:107`（`test_iam_001_superuser_list_users`）
- 裸标 + HTTP：`svc/master-data/tests/knowledge_v53_integration.rs:21`（`test_add_kg_node`）
- 裸标 + HTTP：`svc/portal/tests/ai_ops_v60_integration.rs:87`（重复用例）
- 显式 PG：`svc/wms/tests/integration_tests.rs:28`（`test_database_connection`）
- 显式 PG：`svc/finance/tests/finance_service_tests.rs:44`（`test_create_account`）
- 显式 Redis：`lib/shared-event/tests/event_bus_smoke.rs:21`（`stream_publish_smoke`）
- 未实现占位：`svc/erp/tests/contract_tests.rs:18`、`:142`
- 双重掩盖：`svc/crm/src/tests/rls_isolation_test.rs:57`、`:133`
- 默认早退（无 ignore）：`svc/mes/tests/integration_tests.rs:43`、`svc/ehs/tests/ehs_tests.rs:56`、
  `lib/shared-db/tests/scope_search_path_it.rs:74`

## 8. 测试 DSN 安全边界（P0，已落地）

2026-11-18 实际发生：落点测试因 `.env` 的 `DATABASE_URL` 指向 `topems_prod`，在生产上
创建 `ut_audit_landing` schema、写 1 行、`DROP SCHEMA CASCADE`；事后核查无残留，但属于
真实生产写入。同一根因还导致 `ledger-ddl-drift` 把「账本为空」误判一次。

本轮已落地的护栏：

- 新增 [lib/test-support](../../lib/test-support/src/lib.rs)：
  - 只读 `TEST_DATABASE_URL`，**不回退** `DATABASE_URL`；缺失即 panic；
  - 库名/角色/主机命中生产标识（`topems_prod`、`*_prod`、`prod`、生产主机）即 panic，
    打印来源与打码后的实际 DSN；
  - 校验通过后覆盖进程内 `DATABASE_URL`，保证 sqlx 只连测试库；
  - 通过 `init_array` 在测试二进制启动期执行，早于任何测试体。
- 57 个使用 `#[sqlx::test]` 的测试文件已接入 `topems_test_support::sqlx_dsn_guard!();`。
- 17 个硬编码 `postgres://topems:topems_secret@localhost:5432/topems` 的文件已收敛为
  `TEST_DATABASE_URL` 环境变量读取，缺失时 `expect` 失败。
- 事故案例与使用说明：[docs/testing/test-dsn-safety-guard.md](../testing/test-dsn-safety-guard.md)。

### 2026-11-19 补强（关闭剩余继承路径）

- `lib/shared-bootstrap` 的测试夹具不再读 `DATABASE_URL`（无环境变量时直接 skip 的写法此前会把
  push 钩子注入的生产 DSN 继承进来），改为 `topems_test_support::try_test_database_url()`：
  只认 `TEST_DATABASE_URL`，未设置跳过，设置则执行同一套生产特征校验。
- `lefthook.yml` 的 Gate T 取消 `MIGRATE_URL` 回退：`.env` 的 `MIGRATE_URL` 通常是 `topems_prod`，
  缺失 `TEST_DATABASE_URL` 时现在直接 fail-closed；解析出的库名命中 `*prod*` 直接拒绝；
  并**无条件**把 `DATABASE_URL` 覆盖为已校验的测试 DSN，防止调用者 shell 残留的生产 DSN 被继承。
- 现状盘点：58 个 `#[sqlx::test]` 文件全部接入启动期守卫；28 个直接读 `TEST_DATABASE_URL` 的测试
  使用专用测试变量，并在 lefthook / `verify-rust-full.sh` 注入点拒绝生产库。

验证读数：

- `env -u DATABASE_URL -u TEST_DATABASE_URL cargo test ...` →
  `[test-dsn] 拒绝启动：进程环境变量 TEST_DATABASE_URL 未设置或为空。`（进程 SIGABRT）
- `TEST_DATABASE_URL=postgres://topems_prod:***@192.168.110.115:5432/topems_prod` →
  `[test-dsn] 拒绝连接生产环境 ... database=topems_prod`，打印打码 DSN 与解析结果。
- `env -u DATABASE_URL TEST_DATABASE_URL=postgres://topems_test_runner@localhost:5432/topems_test_runner`
  → `[test-dsn] DATABASE_URL ← 进程环境变量 TEST_DATABASE_URL（user=topems_test_runner ...）`，
  shared-auth 用例实际执行（3 passed / 2 failed，失败原因见 6.1）。

编译与运行期复核（磁盘释放后补跑）：

- `env -u DATABASE_URL cargo check --workspace --tests` → `Finished dev profile ... in 3m 03s`，
  退出码 0，57 处守卫插入全部编译通过。
- 运行期抽查 5 个测试二进制（wms `wave_pick_e2e`、mes `work_order_e2e`、crm `--lib`、
  unified-core `tenant_e2e`、finance `pg_materialized_views_e2e`），不设 `TEST_DATABASE_URL`
  只跑 `--list`：5 个全部 `exit=101` 且打印
  `[test-dsn] 拒绝启动：进程环境变量 TEST_DATABASE_URL 未设置或为空。`——
  说明守卫在 libtest `main` 之前执行，不是「编译通过但不生效」。
- 同一二进制给出 runner DSN 时打印
  `[test-dsn] DATABASE_URL ← 进程环境变量 TEST_DATABASE_URL（... database=topems_test_runner）`
  并正常列出用例，接受路径可用。

## 9. 未做 / 待确认

- 未改动任何 `#[ignore]` 标注或 early-return 逻辑（P0 优先）。
- mes 47 个 early-return 的具体改造方案未展开，等 P0 确认后另开。
- 未执行任何生产连接或写入；所有验证均在 `env -u DATABASE_URL` + `topems_test_runner` 上完成。

## 10. 构建缓存与磁盘余量（2026-11-18）

`cargo check --workspace --tests` 首次执行时磁盘被打满（228Gi 卷仅剩 125Mi），大量
`No space left on device (os error 28)`，连工具链自身都写不出执行临时文件。

- 主要占用：`target/` 约 **96G**，其中 `target/debug/incremental` 是最大头。这是长期问题，
  不是本次才出现，此前每次全仓 `--tests` 编译都在持续放大。
- 清理动作：删除 `target/debug/incremental`（纯再生缓存，下次编译自动重建）。
  清理后 `target/` 降至 **25G**，卷可用从 125Mi 回到 **71Gi**。
- 没有执行整体 `cargo clean`，避免丢掉 `deps` 里已有产物、把下一轮编译时间重新拉满。

**一句话结论**：这台机器平时至少留 **20Gi** 余量；空间不足时优先删
`target/debug/incremental`（性价比最高、无副作用），仍不够再按包体积做
`cargo clean -p <包名>`，不要整体 `cargo clean`。
