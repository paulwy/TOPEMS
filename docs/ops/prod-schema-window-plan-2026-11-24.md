# 生产 schema 追赶窗口执行包（2026-11-24）

生产机回执：HEAD `642ca90db` 构建成功（`fe23cda1…`），换入后 navigation-config 连续 500，根因是 `public.core_user_company_scopes` 缺 `is_default` 列 —— 该列由 `20261122090000` 加，生产账本停在 `20261119000002`。已回滚到旧件 `676287d3…`，pid 59896，服务正常。

## 1. 裁决：选 A（安排迁移窗口，不用补丁分支）

理由：


1. **根因是 schema 落后，不是修复回退**。`is_default` 与 `resolve_company_context` 都是 11-21 之后的新件（`b2407612b` 引入公司上下文，`20261122090000` 加列）。11-19 基线上根本没有这段代码，所以 B 路径做出的二进制「不会复现该 500」，但也**不会验证到真正的生产形态**—— 修完再发下一个功能，同样的 81 条又炸一次。

2. **B 的收益无法保留**。补丁分支不回流主干，等于长期维护第二条发版线；且每次再发版都要重新挑一次。相对 A 省下的只是一次安排窗口的沟通成本。

3. **A 的风险已被机械验证**。迁移链在演练库里从空库完整重放通过（含 W9 回滚循环 398s、策略快照 801 表 / 855 策略一致、菜单权限码 341 全中），且生产是单租户、`core_user_company_scopes` 1 行、`hrm.companies` 1 行，数据侧不存在大表改写。

4. **风险集中在 16 条破坏性迁移**，而它们**全部带 fail-closed 闸门**：批次删表要显式 `app.drop_dead_tables_gate=batch-N`，且先把数据归档到 `archive.*` 并校验行数一致才 DROP；「复活死表」类迁移一旦发现仍有行就 `RAISE EXCEPTION` 拒绝执行。逐条开、逐条核验，不存在静默删数据。

## 2. 窗口与边界


- **窗口**：2026-11-24 21:00–22:30（CST），最晚 23:00 收尾；失败即回滚旧件 `676287d3…`（保留在 `bin/topems-server.bak-20261124-1325`）。

- **本次只追到二进制 **`642ca90db`** 需要的 schema**，即 `20261119010000` … `20261124160000` 共 **81 条**。

- **明确排除 **`20261124170000`（B261 RD 公式状态守卫，来自 `961b595b4`，不在 `642ca90db` 里）：schema 不得超在二进制前面，否则新约束会拒绝旧代码的合法写入。B261 单独排窗口。

- 换入用**已构建好的** `fe23cda1…`（`642ca90db`），本窗口不重建，避免 11GiB 磁盘再被构建吃掉。

## 3. 前置（窗口前做完）

### 3.1 备份与基线

1. 备份：`pg_dump -Fc topems_prod > /Users/xingzhai/backup/topems_prod-20261124-window.dump`，记录 sha256 与 size；保留 48h。
2. 记基线：`select max(version) from _sqlx_migrations;` 应为 `20261119000002`；再记 `select count(*) from pg_class where relkind='r';`、`select count(*) from pg_constraint;`、`select count(*) from pg_indexes;`。
3. 磁盘：清理 `target/debug`、`~/.cargo/registry` 旧版本，确保 ≥25GiB（当前 11GiB 不够跑演练恢复库）。
4. 停写：窗口内停掉前端 / 轮询以外的写入（插件 10 秒轮询 `/api/plugin/navigation-config` 可继续，它只读）。

### 3.2 开窗前置检查清单（逐条跑，结果贴回）

```sql
-- ① 账本：水位与失败记录
select max(version) as ledger_max, count(*) filter (where not success) as failed from _sqlx_migrations;

-- ② 缺列确认（应为 is_default 不存在）
select column_name from information_schema.columns
 where table_schema='public' and table_name='core_user_company_scopes'
 order by 1;

-- ③ archive schema 冲突预检（批次1/2 归档会在这里建表，已存在即 RAISE）
select count(*) as archive_ns from pg_namespace where nspname='archive';
select n.nspname||'.'||c.relname as archive_obj
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='archive';

-- ④ 对象数基线（回滚与核验的对照锚）
select
 (select count(*) from pg_class where relkind='r') as tables,
 (select count(*) from pg_constraint) as constraints,
 (select count(*) from pg_indexes) as indexes;

-- ⑤ 长事务与连接（开窗前必须无 >5min 的活跃事务）
select pid, state, now()-xact_start as age, left(query,60) as q
  from pg_stat_activity
 where datname='topems_prod' and xact_start is not null
 order by age desc limit 5;
```

bash 侧：

```bash
# ⑥ 磁盘
df -h /System/Volumes/Data | tail -1     # 需 ≥25GiB

# ⑦ 当前件（窗口前必须是旧件；换件前必须是 fe23cda1…）
shasum -a 256 /Users/xingzhai/topems/target/release/topems-server
```

判定：① `ledger_max=20261119000002` 且 `failed=0`；② 无 `is_default`；③ `archive_ns=0` 且 archive 对象列表为空（**非空即停窗**，批次1/2 会拒绝重跑）；⑤ 无长事务；⑥ ≥25GiB；⑦ 旧件 `676287d3…`。

## 4. 演练（必做，窗口前 1 小时）

```bash
createdb -h /tmp -U xingzhai topems_prod_dryrun
pg_restore -h /tmp -U xingzhai -d topems_prod_dryrun --no-owner /Users/xingzhai/backup/topems_prod-20261124-window.dump
WINDOW_DB=topems_prod_dryrun bash scripts/migration/prod-window-20261124.sh dryrun
```

`dryrun` 与正式窗口走**同一条代码路径**（`--prod`、闸门 `PGOPTIONS`、`--allow-destructive`、票据全保留），只是目标库换成演练库；这样演练结果对正式执行有约束力。

演练通过判据：

- 81 条全部入账，`max(version)=20261124160000`，`failed=0`；
- 不再出现 `column "is_default" does not exist`；
- 演练库对象数与生产基线的差值，能对上 `archive._drop_manifest` 里的归档/删表记录；
- 记录每段耗时，作为正式窗口的时间预算依据。

## 5. 正式执行：三段按序，逐版本

执行器：`scripts/migration/prod-window-20261124.sh`（`bash -n` + shellcheck 通过）。它把"逐版本 `--only` 单版本 + 其余 80 条 `--defer`"封装好；prod 必须 `CONFIRM=1`，`dryrun` 拒绝跑正式库，任一版本失败即停并打印停在哪条。

```bash
cd /Users/xingzhai/topems            # 必须是拉到 642ca90db 的仓库
bash scripts/migration/prod-window-20261124.sh plan     # 只打印，不碰库
```

三段按版本号严格升序，**不可跳段、不可乱序**（部分清理迁移依赖前段建立的对象）：

| 段 | 版本区间 | 条数 | 其中破坏性 | 段末账本水位 | 内容 |
|---|---|---|---|---|---|
| phase1 | `20261119010000` … `20261120235950` | 40 | 9 | `20261120235950` | 死表归档/复活死表清理、租户表解锁、W2-D2 系列 |
| phase2 | `20261121090000` … `20261124130000` | 38 | 7 | `20261124130000` | W5C 冗余列、ERP 公司维度、财务/审计状态收窄（**`is_default` 在 `20261122090000`，本段到位**） |
| phase3 | `20261124140000` … `20261124160000` | 3 | 0 | `20261124160000` | CRM 风险等级、HRM 初始化唯一索引、RD 成员状态收口 |

### 5.1 phase1（预计 10–15 分钟）

```bash
CONFIRM=1 WINDOW_DB=topems_prod bash scripts/migration/prod-window-20261124.sh phase1
bash scripts/migration/prod-window-20261124.sh verify
```

9 条破坏性里两条要开闸门（`20261119100000`=batch-1、`20261119110000`=batch-2），脚本已自动加 `PGOPTIONS`；其余 7 条是「复活死表」类，靠行数守卫。

### 5.2 phase2（预计 10–15 分钟）

```bash
CONFIRM=1 WINDOW_DB=topems_prod bash scripts/migration/prod-window-20261124.sh phase2
bash scripts/migration/prod-window-20261124.sh verify
```

**这一段跑完 `is_default` 已存在**，原 500 的直接病因消除；此时仍跑旧件 `676287d3…` 也不会再撞缺列（旧代码不查该列），可以在这里停手过夜，第二天再换件。

### 5.3 phase3（预计 1–2 分钟）

```bash
CONFIRM=1 WINDOW_DB=topems_prod bash scripts/migration/prod-window-20261124.sh phase3
bash scripts/migration/prod-window-20261124.sh verify        # 期望 ledger_max=20261124160000, failed=0
```

### 5.4 常见拒绝与处置（演练前先读）

| 报错 | 含义 | 处置 |
|---|---|---|
| `gate closed: set app.drop_dead_tables_gate=batch-N` | 批次归档闸门未开 | 用手工命令时漏了 `PGOPTIONS`；脚本已自动注入，走脚本即可 |
| `仍有 N 行数据，拒绝自动 DROP` | 该"复活死表"在目标库非空 | **停手**，先归档到 `archive.*` 并核对，再决定是否删；禁止强删 |
| `batch precheck: <schema>.<table> 的 canonical 策略不存在或不含系统通道` | 目标库 RLS 策略与迁移预期不一致 | **停手回报**，不要跳过该条；说明该 schema 策略历史与仓库预期不同，需按实际策略补一条定向处置 |
| `archive table archive.<x> already exists: refusing to re-run` | 归档表已存在 | 确认是上次中断残留还是真实占用；必要时改名归档批次再跑 |
| `白名单外 pending 迁移` | `--defer` 未覆盖全部磁盘 pending | 脚本按磁盘全量生成 defer，不应出现；手工跑时必须把其余版本全部列出 |

### 5.5 执行器本地冒烟（2026-11-24 我方已做）

在本机用 dev 库克隆（`createdb -T topems`）跑 `dryrun`，验证到：

- 脚本 plumbing 正确：账本写入、逐版本 `--only`/`--defer`、票据比对、`archive` 归档路径都走通；
- 两条闸门批次（`20261119100000` batch-1、`20261119110000` batch-2）在 `PGOPTIONS` 注入下正常开闸并完成；
- 第 6 条 `20261119130000` 在 dev 克隆库被 RLS 策略 precheck 拒绝（`bi.report_templates 的 canonical 策略不存在或不含系统通道`）——这是 **dev 与 prod 策略历史不同**造成的，不是迁移缺陷。因此正式演练**只能**在 prod dump 恢复库上做，dev 克隆不具备代表性。

结论：脚本可用，但演练结论必须以 prod dump 为准；若 prod 演练也报同一类 precheck，按 §5.4 停手回报，我方按 prod 实际策略补定向处置。

### 5.6 断点与续跑

- 任一段中断，重跑同一段即可：已入账版本被跳过（`--only` 命中已应用版本输出 0 pending）。
- 段间休息前先 `verify` 存档水位；恢复后从下一段继续，不要回头重跑整段。
- 出现 `RAISE` 且脚本停止时，**先看报错文本再决定**：`仍有 N 行数据，拒绝自动 DROP` 属于设计内拒绝，需先归档再定，不允许任何方式强行 DROP。

## 6. 每条执行后的即时核验


```
psql -h /tmp -U xingzhai -d topems_prod -c "select max(version) from _sqlx_migrations;"
psql -h /tmp -U xingzhai -d topems_prod -c "select count(*) from pg_class where relkind='r';"
psql -h /tmp -U xingzhai -d topems_prod -c "select version,success from _sqlx_migrations order by version desc limit 3;"
```

破坏性版本额外核对：


- 归档批次：`select batch, table_name, row_count from archive._drop_manifest where migration_version='<V>';` 与源表行数一致；

- 复活死表类：若 `RAISE EXCEPTION` 报「仍有 N 行」，**停手**，把该表进 `archive` 后再决定，不要强行 DROP。

## 7. 回滚


- 单条失败：该条事务已 ROLLBACK，账本不前进，直接停窗，服务不受影响（schema 仍≤已应用版本，旧件 `676287d3…` 可继续跑）。

- 多条成功但需整体回退：停服务 → `pg_restore` 覆盖回第 3.1 的 dump → bootout/bootstrap 旧件 → health 200 复核。

## 8. 换入与回归（迁移全部成功后）


1. `sha256sum target/release/topems-server` 应为 `fe23cda1…`（`642ca90db` 的产物）；旧件另存。

2. bootout + bootstrap（**必须**，`kickstart -k` 不重读环境变量），确认 pid/state/cwd。

3. 五项回归：

- `GET /api/plugin/navigation-config` → 200 且 body `success:true`（本次失败的正是这条，此前是 200 + `success:false`）；

- 90 秒内不再出现 `RLS context missing`、`column "is_default" does not exist`、`current transaction is aborted`；

- `GET /api/plugin/runtime/plugins` 正常；

- 2–3 个普通模块读写正常；

- 上传落盘 `/Users/xingzhai/uploads/<user>/<file>`。

1. 回归通过后回报：账本 max、对象数、五项结果、pid、产物 sha256。

## 9. 本窗口不做什么

不改 plist /.env/cwd、不动口令、不放宽 RLS、不加 BYPASSRLS、不重建二进制、不应用 `20261124170000`、不动生产数据（除迁移自身的归档 / 归一）。

## 附 A：本窗口 81 条待应用版本


- `20261119010000`

- `20261119100000`

- `20261119110000`

- `20261119120000`

- `20261119130000`

- `20261119131000`

- `20261119140000`

- `20261119141000`

- `20261119150000`

- `20261119151000`

- `20261119160000`

- `20261119161000`

- `20261119170000`

- `20261119180000`

- `20261119190000`

- `20261119190100`

- `20261119200000`

- `20261119210000`

- `20261119220000`

- `20261119230000`

- `20261119233000`

- `20261120090000`

- `20261120100000`

- `20261120110000`

- `20261120120000`

- `20261120130000`

- `20261120140000`

- `20261120150000`

- `20261120160000`

- `20261120170000`

- `20261120180000`

- `20261120190000`

- `20261120200000`

- `20261120210000`

- `20261120220000`

- `20261120230000`

- `20261120235900`

- `20261120235930`

- `20261120235945`

- `20261120235950`

- `20261121090000`

- `20261121100000`

- `20261121110000`

- `20261121111000`

- `20261121120000`

- `20261121130000`

- `20261121131000`

- `20261121140000`

- `20261121150000`

- `20261121160000`

- `20261121170000`

- `20261121180000`

- `20261121190000`

- `20261121200000`

- `20261121201000`

- `20261121210000`

- `20261121220000`

- `20261121230000`

- `20261121235900`

- `20261121235930`

- `20261121235940`

- `20261122090000`

- `20261122100000`

- `20261122150000`

- `20261122160000`

- `20261123090000`

- `20261123100000`

- `20261123110000`

- `20261123120000`

- `20261123130000`

- `20261123140000`

- `20261123141000`

- `20261123142000`

- `20261123150000`

- `20261124100000`

- `20261124110000`

- `20261124120000`

- `20261124130000`

- `20261124140000`

- `20261124150000`

- `20261124160000`

## 附 B：16 条破坏性版本与票据


- `20261119100000` 票据 `DEAD-TABLE-20261119`  · gate `batch-1`

- `20261119110000` 票据 `DEAD-TABLE-20261119`  · gate `batch-2`

- `20261119160000` 票据 `ZERO-PATH-20261119`

- `20261119180000` 票据 `LEGACY-COPY-20261119`

- `20261119200000` 票据 `TENANT-UNBLOCK-20261119`

- `20261119233000` 票据 `IAM-PERM-20261119`

- `20261120220000` 票据 `W2-D2-WMS-20261120`

- `20261120235930` 票据 `W2-D2-HRM-20261120`

- `20261120235950` 票据 `W2-D2-UC-20261120`

- `20261121111000` 票据 `W2-D2-MOBILE-20261121`

- `20261121131000` 票据 `W2-D2-PM-20261121`

- `20261121201000` 票据 `W2-D2-ANALYTICS-20261121`

- `20261121230000` 票据 `W5C-ORG-HRM-20261121`

- `20261121235900` 票据 `W5C-ORG-WMS-20261121`

- `20261121235930` 票据 `W5C-ORG-HRM-INIT-20261121`

- `20261124130000` 票据 `B255-FIN-REPORT-20261124`