# B273 Mobile OA 表 tenant_id 类型漂移收口（2026-11-25）

## 结论

`mobile.oa_announcements / oa_meetings / oa_calendar_events / oa_tasks` 的 `tenant_id` 在真实库与 Rust 实体中均为 `uuid`，但空库重建链上的 `20260917000001_mobile_oa_tables.sql` 把列建成 `text`。新增前向迁移 `20261125003000_mobile_oa_tenant_id_uuid.sql` 在检测到 `text` 时转 `uuid`，并同步重建 `rls_tenant_isolation` 为 uuid 比较；本地库与测试库均已应用。

## 根因与影响

- B272 提交前 `mobile-contract-smoke` 从 58/114 提升到 108/114，剩余 6 个 `schedule` 端点全部 500。
- 服务日志：`error occurred while decoding column "tenant_id": Rust type uuid::Uuid is not compatible with SQL type TEXT`，以及 `operator does not exist: text = uuid`。
- 真实库 4 张 OA 表的 `tenant_id` 已是 `uuid`；`topems_test` 按迁移重建后为 `text`，说明问题在重建链，不在运行时代码。
- 迁移文件中的旧策略为 `tenant_id = NULLIF(current_setting('app.tenant_id', true), '')`，列为 text 时可用；改为 uuid 后若不同步重建策略，会出现 `uuid = text` 操作符错误。

## 处置

1. `20261125003000_mobile_oa_tenant_id_uuid.sql`：对 4 张 OA 表逐表检查，仅 `text` 时先 `DROP POLICY`，再 `ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid`。
2. 统一重建 `rls_tenant_isolation`：`COALESCE(current_setting('app.rls_system', true), 'off') = 'on' OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid`，与真实库策略一致。
3. 后置断言：任一 OA 表 `tenant_id` 仍为 `text`，或策略不含 `::uuid` 比较，直接 `RAISE EXCEPTION`。
4. 回滚 `database/rollback/20261125003000_mobile_oa_tenant_id_uuid.rollback.sql`：恢复 `text` 与旧版策略表达式。

## 验证

| 验证项 | 结果 |
| --- | --- |
| 本地 `topems` 应用 | 4 表 `tenant_id` 均为 `uuid`；策略 qual 均含 `::uuid` |
| 幂等复跑 | 第二次应用成功，仅 `DROP POLICY IF EXISTS` 提示不存在 |
| 回滚/重放 | `topems_test` 回滚后 4 表为 `text`；重新应用后恢复 `uuid` |
| 空库前向 | 新建 `topems_b273_verify`，仅执行 `20260917000001` + 本迁移，4 表结果 `uuid` |
| mobile smoke | `114/114 PASS, 0 FAIL`，schedule `13/13 PASS` |
| 迁移校验 | 874 文件，`Checksum errors 0`、`Schema drift 0`、`Errors 0` |

## 说明

- 生产库已是 `uuid`，本迁移在生产为策略重建，不触发列改型；空库重建与 `topems_test` 会执行 `text → uuid`。
- 存量若存在非 uuid 文本，`USING tenant_id::uuid` 会失败并阻止迁移，属于 fail-closed，需先清洗数据。
