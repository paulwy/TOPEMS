# W7 · B4 LIMS 生产窗口报告

- 日期：2026-11-11
- 结论：**成功，未触发回滚**
- 关联：迁移 [20261110210000](../../database/migrations/20261110210000_w7_b4_lims_rls_policies.sql)、验收脚本 [w7_b4_lims_verify.sql](../../scripts/ops/w7_b4_lims_verify.sql)、开窗方案 [w7-b4-lims-window-plan-2026-11-10.md](w7-b4-lims-window-plan-2026-11-10.md)

---

## 1. 提交

| 项 | 值 |
| --- | --- |
| commit | `14d7eff07bbe7813ec469319fba394ffb662bda0`（`feat(lims): 全量租户作用域改造与 76 张表 fail-closed RLS`） |
| 范围 | 34 文件，+3504 / −1212；`svc/lims/**`、`lib/shared-db/{lib,scope,tenant_sweep}.rs`、`svc/server/src/modules/lims_real_module.rs`、`Cargo.lock`、迁移、`scripts/ops/w7_b4_lims_verify.sql` |
| 排除项 | `apps/web/useWebSocket.ts`、unified-core WS 三文件、`scripts/ops/w7_b1_verify.sql`、finance/mfg 文档、`database/checksums.txt`、各类快照/设计文档均未进入本提交 |
| 推送 | **未推送**（`origin/main` 落后 1 个提交，等你确认） |
| 门禁 | 全绿；前两次尝试失败于 `database/migrations/.DS_Store`（macOS 垃圾文件被 migration-validate 计入「非 .sql」）与本地 8099 未启动（web-contract-smoke），清理/起本地 BFF 后第三次通过，**未使用 `--no-verify`** |

## 2. 二进制

| 项 | 值 |
| --- | --- |
| sha256 | `5d4f4f129a1264f615f176f496aff8248d425347041f5101bc3cd1323bb32368` |
| 大小 | 205,101,072 B |
| 构建 | `CARGO_TARGET_DIR=/Users/air/TOPEMS/target SWAGGER_UI_DOWNLOAD_URL=file:///…/swagger-ui-v5.32.6.zip cargo build --release -p topems-server`（17m50s） |
| 隔离 | 构建前 `git stash push` 三个 `svc/unified-core` WS 文件，窗口后已 `stash pop` 复原；二进制不含 WS 改动 |

## 3. 窗口时序

| 时点 | 动作 | 结果 |
| --- | --- | --- |
| 09:24:5x | `launchctl bootout gui/501/com.topems.server` | 8099 无监听、`pg_stat_activity` 应用连接 0 |
| 09:25:06–09:25:11 | 全库 `pg_dump -Fc` + 账本快照 + 旧二进制备份 | 见 §4 |
| 09:25:2x | `apply-forward.sh --prod --only 20261110210000` | 单事务提交，含账本写入 |
| 09:25:4x | 换二进制 + `bootstrap` | 进程 09:25:44 启动 |
| 09:25:53 | `/health` = 200 | **停写合计约 1 分钟** |

注：生产 PG 实际为 **18.4**，`pg_dump` 必须用 `postgresql@18` 客户端（17 客户端会拒绝），`psql` 走 18 客户端。

## 4. 备份与回滚物（均在 `xingzhai@192.168.110.115`）

| 物 | 路径 | 度量 |
| --- | --- | --- |
| 全库 dump（超户 topems） | `/Users/xingzhai/topems-window-lims-20261111/backup/topems_prod_w7b4lims_20261111-092511.dump` | 4,702,373 B；sha256 `ab665e40…0ac25`；库 76 MB |
| 账本快照 | 同目录 `ledger_pre_20261111-092511.csv`（654 行 + 表头）、`ledger_pre_20261111-092511.txt`（`654\|20261110204100`） | — |
| 旧二进制 | 同目录 `topems-server-preW7B4LIMS-20261111-092511.bak`（另 `~/topems/bin/topems-server-preW7B4LIMS-<ts>.bak`） | sha256 `72b6e89dc379deca8e12603777583a8cf80a48e9442f9d67b9455699013037a1` |
| **数据侧回滚脚本** | `/Users/xingzhai/topems-window-lims-20261111/rollback/w7_b4_lims_rollback_prestate.sql` | 由生产预态生成：76 表 106 条原策略 + ENABLE 76 / FORCE 75 + 两条唯一约束原定义 + 删除账本 655 + 断言 |

回滚处置（数据侧，本次明确到语句级）：

1. 脚本 A 段清空 76 表现有策略，B 段按预态快照逐条 `CREATE POLICY`（106 条），C 段还原 `ENABLE`/`FORCE`（`lims.qa_lims_analytes` 回到 NO FORCE），D 段把两条幂等唯一约束改回不含 `tenant_id`，E 段 `DELETE FROM _sqlx_migrations WHERE version=20261110210000`（要求恰好 1 行），F 段断言 76/106/76/75。
2. 执行方式：`psql -X -1 -f …`（单事务，失败整体回滚）。
3. **已做可执行性预演**：迁移提交后在 `BEGIN … ROLLBACK` 内整段执行，A–F 全部通过（回滚脚本能把生产恢复成 106 策略 / 76 ENABLE / 75 FORCE 并删掉账本行），ROLLBACK 后生产仍为 76 条新策略、账本行仍在。
4. 回滚顺序：先换回旧二进制（`.bak`）→ 再跑本脚本 → 再起服务。旧代码用裸池、不设 `app.tenant_id`，若只换二进制不还原策略，LIMS 会 fail-closed 全 0 行。

## 5. 迁移与账本

| 项 | 前 | 后 |
| --- | --- | --- |
| `_sqlx_migrations` 行数 | 654 | **655** |
| `max(version)` | 20261110204100 | **20261110210000** |
| 本笔 checksum（sha384） | — | `6ad5c302e1977440a198729b055a29237f6b97fac6ec7f0aee850f0b6ca415336a6fe9b03dbdb450c07f5eff3c5bfa4f` |

执行入口（仓库规范）：`apply-forward.sh --prod --ssh-host … --remote-db topems_prod --remote-mig-dir …/migrations --anchor 20261110204100 --only 20261110210000`；破坏性语句守卫本地预判通过（`check-destructive-sql.mjs --strict`）。

## 6. 生产断言（实测，非预演）

超户目录查询 + 非超户 `topems_prod` 双向核对，两处一致：

| 断言 | 实测 | 期望 |
| --- | --- | --- |
| 76 张表策略总数 | 76 | 76 |
| `rls_tenant_isolation` | 76 | 76 |
| ENABLE RLS | 76 | 76 |
| **FORCE RLS** | **76** | 76/76 |
| `USING(true)` | 0 | 0 |
| `tenant_id IS NULL` 分支 | **0** | 0 |
| nil UUID 分支 | 0 | 0 |
| 列侧 cast | 0 | 0 |
| 系统通道分支 | 76 | 76 |
| 函数参数 cast 谓词 | 76 | 76 |

## 7. 冒烟（全部非超户 `topems_prod`，`SET ROLE` 校验 `rolsuper/rolbypassrls=false`）

`scripts/ops/w7_b4_lims_verify.sql`：A1、A2、B1、B2、B3、C1、C3、C4、D 全通过（B3 = 无上下文 76 张全 0）。

**C2 例外**：脚本 C2 依赖 `public.qa_lab_samples` 已有 tenant=0002 的行，生产该表为空 → `C2 失败：系统通道未命中任何行`。这是数据前提缺失，不是形态缺陷；用独立写探针覆盖同一路径：

| 探针 | 结果 |
| --- | --- |
| P1 写入（tenant 0001，`lims.samples`） | 成功，落行 `tenant_id=00000000-0000-0000-0000-000000000001` |
| P2 随机租户上下文读该行 | 0 行 |
| P3 无上下文读 | 0 行（fail-closed） |
| P4 系统通道读 | 1 行 |
| P5 租户 0001 上下文写 0002 的行 | 被 WITH CHECK 拒绝（`insufficient_privilege`） |
| P6 删除探针行 | 1 行，残留 0 |

HTTP：`GET /api/lims/samples` 无 token → 401、坏 token → 401、未知路由 → 404；`/api/server/ready` = `ready`（0 degraded）；`/api/server/health` 31 模块（含 `lims-real`）。启动后 `server.err` 扫描 `panic` / `RLS context missing` / `[tenant_ctx:` = 0。

**限制**：手上没有生产账号口令（未在仓库/环境留存），因此未做「带真实 token 的 200 级读」与 400/403 的租户头分支；租户解析正确性由上面的 DB 层非超户断言 + 路由鉴权行为覆盖。若需要 200 级 HTTP 证据，给一次 `W7B2_PASSWORD` 即可复跑 `scripts/ops/w7_b2_auth_smoke.py --reads /api/lims/samples`。

## 8. 事件消费者（窗口前后对比）

| 组 | 窗口前 | 窗口后 |
| --- | --- | --- |
| `ai-group` / `gis-group` / `mobile-group`（共 16 个 stream×group 组合） | 全 `pending=0, lag=0` | 全 `pending=0, lag=0` |

## 9. 遗留

- 本轮未做：`// tenant-system:` 注释、`scripts/ci/check-tenant-context.cjs` CI 门禁（按约定与「迁移模板漏 FORCE 根因」合并到窗口后）。
- `database/checksums.txt` 被 migration-validate 自动重写，属非 LIMS 改动，未纳入提交，工作区仍为未暂存状态。
- 提交未推送，等你确认后 push。
