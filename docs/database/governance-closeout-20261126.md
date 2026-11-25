# 数据库治理收口记录（2026-11-26）

一句话结论：属主、账本、schema 基线、运行期错误、空库重放五条线都已落地并推 `origin/main`；四道硬门禁全绿，账本外的 178 条迁移**全部已有归属**（0 条未处置），剩下的只是「按发版清单在目标环境执行」，不是待查问题。

## 一、做了什么

| 线 | 结果 | 关键产物 |
|---|---|---|
| 属主收敛 | 62 schema / relations / functions / types 全部归 `topems_owner`；`topems_app` 只有 DML+EXECUTE 与 4 个 schema 的 CREATE；库级 `CREATE` 对 owner/app 均已撤 | `database/scripts/converge_owner.sql`、`scripts/db/owner-sweep.sh` |
| 迁移账本 | 磁盘 873 条（14 位版本）/ 账本 709 条 / 归档 43 条；逐文件单事务、成功才记账 | `scripts/db/apply-pending.sh`、`database/migrations-{archive,triage,release-plan}.tsv` |
| schema 基线 | schema 级 + **逐表**两级比对；140 张落后表中 113 张无代码引用（waive）、27 张定性，真修 3 条 | `scripts/db/schema-health.sh`、`database/schema-diff-waivers.tsv` |
| 运行期 | 26000 unnamed prepared statement、结算中心列漂移、WMS 仓库名空白、集成同步列错位、admin 公司范围 403 等已修并实测 | `docs/ops/*`、`svc/{finance,wms,integration}` |
| 空库重放 | 官方 `anchors.json` + `apply-forward.sh` 路径：124 条 0 失败，1375 表 / 17767 列 / 3212 索引 / 857 策略 / 账本 828 | `scripts/db/bootstrap-check.sh` |

## 二、本轮三条拍板

1. `topems_owner` 保持 `LOGIN`（`NOLOGIN + SET ROLE` 会把超管 DSN 引进常规迁移路径）。
2. `topems` 保留 `CREATEDB`（`deploy/rollback.sh`、`rollback-prod-mac.sh`、演练/克隆脚本依赖它，运行期不经过该角色）。
3. `iam.tenant_permissions` / `iam.tool_permissions` 建表并补 identity：存量血缘里表已存在但 `id` 无 identity，迁移用条件式 `DO` 块补装并 `setval(max+1)`；默认仍是 Memory 存储。

详见 `docs/database/role-ownership.md` §11。

## 三、一条命令看现状

```bash
scripts/db/governance-status.sh          # 全量，约 6 秒
scripts/db/governance-status.sh --fast   # 跳过 schema-health，约 3 秒
```

输出五段：属主漂移、schema 差量（含逐表）、迁移账本分层、归档门禁、租户完整性；退出码 0=绿，1=有红项（schema-health 的逐表项按定案仍是提示性，不计入退出码）。

## 四、账本外 178 条的去向

- 归档 **43**（`archived 11 / replayable 32`，冻结线 `20261201000000`，与账本做互斥校验）；
- 生产定向等已定性 **29**（断言按「与生产同源」状态编写，本库状态不同故就地拒绝）；
- 在发版清单 **135**，按阶段分布：`stage1-canonical 26`、`stage2-b-class 16`、`stage3-prod-directed 21`、`stage4-replay 68`、`stage5-gated 5`；
- **未处置 0**。

发版执行顺序与逐条风险说明见 `database/migrations-release-plan.tsv` 与 `docs/database/ledger-triage-20261125.md`。

## 五、明确不做的（避免反复起念）

- `sqlx migrate run` 全量跑：checksum 漂移会整体中止，不用。
- 空库重建用 raw psql 全量灌：356 条会失败，只走 anchor + forward。
- 逐表落后校验进 PR 门禁：基线是旧 pg_dump，会随模块新增表老化，放夜间/发版前人工跑。
- `topems_app` 跑迁移：必然 `must be owner`，不用试。

## 六、上线前 checklist

1. `scripts/db/apply-pending.sh dry-run` 看目标库还剩多少待应用；
2. 属主收敛先跑（`database/scripts/converge_owner.sql`，需超管）；
3. 迁移按 `migrations-release-plan.tsv` 的阶段顺序执行，`20261125160000` 含 `ADD GENERATED ... IDENTITY`（只加序列、不改数据），放低峰；
4. 跑 `scripts/db/governance-status.sh` 收尾，红项清零再发。
