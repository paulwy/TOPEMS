# W5-C 首批组织字段收敛：HRM 四表删除 `organization_id`

日期：2026-11-21
迁移：`database/migrations/20261121230000_w5c_hrm_drop_redundant_organization_id.sql`
回滚：`database/rollback/20261121230000_w5c_hrm_drop_redundant_organization_id.rollback.sql`
代码：`svc/hrm/src/modules/attendance.rs`
状态：已本地验证；生产窗口未执行。

## 1. 为什么选这四张表

口径依据 V69.1：`tenant_id` 是租户隔离键，`organization_id` 已废弃。选择标准是
“逐行等于 `tenant_id` + 代码不再读取或仅把它当租户别名”：

| 表 | 行数 | `organization_id <> tenant_id` | 代码引用 |
| --- | --- | --- | --- |
| `hrm.departments` | 5 | 0 | 只用 `tenant_id`/`org_id` |
| `hrm.employees` | 19 | 0 | 只用 `tenant_id`/`org_id` |
| `hrm.positions` | 7 | 0 | 只用 `tenant_id`/`org_id` |
| `hrm.attendance_records` | 5 | 0 | 仅两处 INSERT 把它与 `tenant_id` 同值写入 |

`hrm.companies` 与 `hrm.initialization_logs` 不入选：前者 `organization_id`
有 4/5 行与 `tenant_id` 不同，后者 1/1 行不同，语义未定。

## 2. 迁移守卫

删列前在同一个事务里逐表统计：

```sql
SELECT count(*) FROM hrm.<table>
WHERE organization_id IS DISTINCT FROM tenant_id;
```

任一表计数非 0 即 `RAISE EXCEPTION`，整条迁移回滚；不会先把列删掉再报错。
守卫通过后才执行四条 `ALTER TABLE ... DROP COLUMN IF EXISTS organization_id`。

四条 DROP 均带 `destructive-gate` 标记：

- ticket：`W5C-ORG-HRM-20261121`
- rows-at-review：`0`（删列不删行）
- backup：窗口前 `pg_dump` 四张表

`node scripts/ci/check-destructive-sql.mjs` 报告新增/修改阻断文件 0。

## 3. 代码改动

`svc/hrm/src/modules/attendance.rs` 两处 INSERT 去掉 `organization_id` 列：

- 上班打卡：`(id, tenant_id, employee_id, ...)`，参数从 `($1,$2,$2,$3,...)`
  改为 `($1,$2,$3,...)`；
- 首次打卡：同样去掉重复列，保留 `tenant_id`、`employee_id`。

`RETURNING` 与模型字段未改，API 响应形状不变。

## 4. 验证

scratch 库（`topems_test_full` 克隆）执行：

1. 前置统计：四表 `organization_id <> tenant_id` 均为 0；
2. 正向迁移：`psql -v ON_ERROR_STOP=1 -f ...` 输出 `DO` + 4 条 `ALTER TABLE`；
3. 列已消失：`information_schema.columns` 查询四表 `organization_id` 返回 0 行；
4. 回滚：四条 `ADD COLUMN` + `UPDATE ... = tenant_id` 成功；
5. 回滚后形状：`departments`/`positions`/`attendance_records` 为 `NOT NULL`，
   `employees` 保持 `NULLABLE`，与原状一致。

编译：`SQLX_OFFLINE=true cargo check -p topems-hrm` 通过。

## 5. 未完成

- 迁移尚未在生产窗口执行，生产 `organization_id` 列数暂未下降；
- WMS/HRM setup/AI/LIMS/MES 仍有引用，下一批按表比对后再删；
- 回滚只按 `tenant_id` 派生恢复列，不恢复删除前与 `tenant_id` 不同的历史值；
  本批四表已核对逐行相等，因此等价。
