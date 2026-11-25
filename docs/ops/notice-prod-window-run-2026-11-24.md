# 通知：生产 schema 追赶窗口执行（可直接转发生产机）

> 面向：生产机执行人（xingzhai Mac mini）
> 目标：把 `topems_prod` 从 `20261119000002` 追到 `20261124160000`（81 条），再换入 `fe23cda1…` 并跑五项回归
> 执行包：`docs/ops/prod-schema-window-plan-2026-11-24.md`（判据、处置表、回滚都在里面）
> 执行器：`scripts/migration/prod-window-20261124.sh`（main `ae1741b02`）

## 1. 我方已完成的部分（不要再做一次）

- 81 条迁移链已在**生产基线恢复库**上完整跑通：`ledger_max=20261124160000`、`failed=0`、表 1442、约束 10027、索引 3325、策略 855，`public.core_user_company_scopes.is_default` 已到位并带部分唯一索引。
- 5 条闸门版本全部在 `PGOPTIONS` 注入下正常开闸；执行器已把 5 条 GUC 映射写死，不需要手工 set。
- 执行器已补「已应用即跳过」：任一段中断，重跑同一条命令即从账本断点续做，不用改参数。

## 2. 开窗前必须回的 5 个数（缺一项就停）

```bash
psql -h /tmp -U xingzhai -d topems_prod -c "select max(version) from _sqlx_migrations;"        -- 期望 20261119000002
psql -h /tmp -U xingzhai -d topems_prod -c "select count(*) from _sqlx_migrations where not success;"  -- 期望 0
psql -h /tmp -U xingzhai -d topems_prod -c "select count(*) from pg_namespace where nspname='archive';" -- 期望 0
psql -h /tmp -U xingzhai -d topems_prod -c "select count(*) from core_user_company_scopes;"      -- 期望 1
df -h / | tail -1                                                                                 -- 可用 ≥25GiB
shasum -a 256 bin/topems-server                                                                   -- 期望 676287d3…
```

外加：窗口前整库 dump 一份（`pg_dump -Fc`，**必须带数据**），路径回传。

## 3. 演练（窗口内第一步，约 15 分钟）

```bash
createdb -h /tmp -U xingzhai topems_prod_dryrun
pg_restore -h /tmp -U xingzhai -d topems_prod_dryrun --no-owner <dump>
WINDOW_DB=topems_prod_dryrun bash scripts/migration/prod-window-20261124.sh dryrun
```

判据：`ledger_max=20261124160000`、`failed=0`、不再出现 `column "is_default" does not exist`。
失败就停窗，把最后 40 行贴回，不要手工补跑。

## 4. 正式执行（三段按序，可分段休息）

```bash
CONFIRM=1 WINDOW_DB=topems_prod bash scripts/migration/prod-window-20261124.sh phase1
bash scripts/migration/prod-window-20261124.sh verify
CONFIRM=1 WINDOW_DB=topems_prod bash scripts/migration/prod-window-20261124.sh phase2
bash scripts/migration/prod-window-20261124.sh verify
CONFIRM=1 WINDOW_DB=topems_prod bash scripts/migration/prod-window-20261124.sh phase3
bash scripts/migration/prod-window-20261124.sh verify
```

- 段间可停：重跑同一段自动跳过已应用版本，日志里是 `--- 已应用，跳过`。
- 时间紧可加 `WINDOW_MAX_NEW=N`（每段最多新应用 N 条后自动停），再跑同一条命令续做。
- 五条闸门（`20261119100000/19110000/19160000/19180000/19200000`）的 `PGOPTIONS` 由执行器自动注入，**不要手工 `SET`**，也不要跳过任何一条破坏性版本。

## 5. 停手条件（出现即停，不要"绕过"）

| 现象 | 处置 |
|---|---|
| `gate closed: set app.…` | 说明没走执行器；停手，改用脚本 |
| `仍有 N 行数据，拒绝自动 DROP` | 设计内拒绝：先归档 `archive.*` 核对，不许强删 |
| `前置断言失败：… NULL 行数为 N，与基线 M 不符` | 目标库数据与迁移预期不符，停手回报 |
| `batch precheck: … canonical 策略不存在或不含系统通道` | 停手回报，按生产实际策略补定向处置 |
| 任一条 `STOP` | 该条已 ROLLBACK，账本不前进；停窗，服务仍由旧件 `676287d3…` 提供 |

## 6. 换入与回归（迁移 3 段全部成功后）

0. 换件前先跑只读体检闸，**FAIL 就不许换件**：

```bash
bash scripts/ops/post-window-probe-20261124.sh --host /tmp --user xingzhai --db topems_prod
```

1. 换前复核 `shasum -a 256 target/release/topems-server` = `fe23cda1…`，`bin/topems-server.bak-20261124-1325` 仍在。
2. `bootout` + `bootstrap` 后确认 `pid` 变化、`health=200`。
3. 五项回归跑脚本（内置二进制指纹、两个 health、导航 `success:true`、`runtime/list`、上传目录可写、日志尾部错误签名）：

```bash
bash scripts/ops/post-swap-regression-20261124.sh \
  --base http://127.0.0.1:8099 \
  --bin target/release/topems-server \
  --uploads-dir /Users/xingzhai/uploads \
  --log /Users/xingzhai/Library/Logs/topems/server.err.log
```

   模块读写脚本不能代替：`TOKEN=...` 加 `--authed-path "/api/core/users?page=1&page_size=5"` 验登录态读，写操作人工点一次。
4. 任一回归失败：立即换回 `bin/topems-server.bak-20261124-1325`（`676287d3…`），把 500 响应体 + ERROR 日志贴回，不要自行改 schema。

## 7. 回执要带的东西

`verify` 三行输出、`pg_namespace='archive'` 计数、`core_user_company_scopes` 的 `is_default` 分布、每段耗时、换件后 `health` 与五项回归结果、磁盘剩余。

## 8. 明确不做

不应用 `20261124170000`/`20261124180000`/`20261124190000`（窗口外，执行器已自动 defer）；不改账本、不改 plist/Keychain、不放宽 RLS、不双号并存。
