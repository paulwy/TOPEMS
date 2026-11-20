# 窗口 A 执行记录（2026-11-15 00:16 本地时间 / 2026-11-14T16:16Z）

- 目标：仅投 M2a `20261114201000`（加列/索引/幂等回填），**不碰二进制、不重启服务**
- 主机：`xingzhai@192.168.3.129`，库 `topems_prod`，psql/pg_dump 18.4，会话角色 `xingzhai`（`rolsuper=t`）

## 窗口前（只读）

| 项 | 结果 |
|---|---|
| 账本 | `674 \| 20261114170000` ✅ 与预期一致 |
| 8 张表存在 | 8/8 `exists=t` |
| `tenant_id` 列 | 8 表均无（`information_schema.columns` 0 行）✅ |
| 8 表行数 | 全部 `0` |
| 策略快照 | 8 条 `*_allow_all_*`，`USING(true) WITH CHECK(true)`；sha256 `4076b151cd8c2d75daa610e2f3708a9d2e134b00dcc7290b91b61a468cca1904` |

## 备份（超户）

`~/topems/backups/20261115-windowA-tenant-id/`

| 文件 | 字节 | sha256 |
|---|---|---|
| `schema_8tables.sql`（`pg_dump -s`，8 个 `-t`） | 12028 | `ac7e294ab5f5fc628a4019e99130be4bc9bc7be79269c3e45a5269d182d3c717` |
| `_sqlx_migrations_snapshot.txt`（674 行） | 49241 | `4fb60a95864f9356fe5411e13eb60505c6e8ceff93186160034c3bbfec201988` |
| `_sqlx_migrations_headcount.txt` | 19 | `9e2ef3c321679e056f715a00326899eb751e85722934a4abc307b092ed390d77` |
| `pg_policies_BEFORE.txt` | 672 | `4076b151cd8c2d75daa610e2f3708a9d2e134b00dcc7290b91b61a468cca1904` |

校验：四个文件均非空；`grep -c '^CREATE TABLE'` = **8**（crm.core_crm_customers / erp.core_erp_suppliers / erp.expenses / erp.meeting_bookings / erp.meeting_rooms / erp.vehicle_requests / erp.vehicles / portal.portal_announcements）。

## 投递

远端暂存目录：`~/topems/window-2026-11-15-windowA/migrations/`（sha256 `6c17d051…32d606`，与本地一致）

```
== 待应用 1 条（anchor=20261114170000，only=20261114201000）
== 显式 defer 4 条（保持 pending）：
  20261114180000_erp_consolidation_group_tenant_rls.sql
  20261114190000_forecast_v53_mark_synthetic.sql
  20261114200000_mes_rls_fail_closed_22.sql
  20261114202000_erp_crm_portal_rls_fail_closed_8.sql
-- 20261114201000_add_tenant_id_8_tables.sql
== OK：应用 1 条，无失败
```

耗时 16:16:46Z → 16:16:48Z；`installed_on = 2026-11-15 00:16:48.936025+08`。

## 后置核对

1. 账本：`675 | 20261114201000`，`success=t`；四条 defer 版本在账本中查无记录（仍 pending）✅
2. 列/索引：8 表 `tenant_id uuid / is_nullable=YES`；8 个 `idx_*_tenant_id` 索引齐全 ✅
3. 回填：8 表行数仍为 0，`count(tenant_id)=0`；可归因但仍 NULL 的 `meeting_bookings` / `vehicle_requests` 均为 **0** ✅
4. 策略：AFTER 快照与 BEFORE **diff 为空**，sha256 同为 `4076b151…cca1904` ✅（硬判据通过）
5. 服务：`/health` → 200 `{"code":200,"success":true,"data":"healthy"}`；`launchctl` `pid = 3096`（进程 `lstart 六 11月/14 20:25:39`，窗口内未重启）；二进制仍 `ff8a6cf5…9722060`（未换件）；`server.out` 窗口内新增 ERROR **0** 条（全文件 ERROR 亦为 0），窗口内新增日志 1 行（search 订阅者心跳）
6. 停机：**0 秒**（无重启）

## 结论

窗口 A 完成，prod 现在满足部署门 `max(version) = 20261114201000 >= 20261114201000`。窗口 B 待指令。
