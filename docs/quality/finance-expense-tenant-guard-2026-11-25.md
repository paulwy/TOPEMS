# B322 Finance 费用报销写路径租户收敛（2026-11-25）

## 结论

`finance.expenses` 本地 3 行，状态均为 `submitted`：

- `tenant_id=00000000-0000-0000-0000-000000000001`：2 行
- `tenant_id=NULL`：1 行

更新/删除入口虽然跑在请求级 RLS 事务内，但 SQL 只按 `id` 定位，没有显式租户谓词。`update_expense` 与 `delete_expense` 的 `Extension(_claims)` 甚至没有读取 claims，能否跨租户改删完全取决于 RLS 策略是否按预期生效。

## 代码改动

`svc/finance/src/modules/operational.rs`：

1. `update_expense` 改为读取 `claims`，入口调用已有 `resolve_write_tenant`：
   - 缺少租户 400（超管也不例外）；
   - 租户非 UUID 400。
2. 当前态查询补 `tenant_id = $2::uuid`。
3. UPDATE 补 `tenant_id = $15::uuid`，并发谓词仍保留 `status = $14`。
4. `delete_expense` 同样读取 claims 并解析写租户。
5. 删除前状态查询补 `tenant_id = $2::uuid`。
6. 软删 UPDATE 补 `tenant_id = $2::uuid`，状态集合改为 `$3`；0 行仍返回 409。

状态机、软删集合与并发谓词均未改变；无 DDL。

## 验证

- `cargo fmt -p topems-finance` PASS
- `cargo check -p topems-finance` PASS
- `cargo test -p topems-finance --lib modules::operational::tests`：6 passed
  - 新增 `write_path_rejects_superuser_without_tenant`
  - 新增 `write_path_requires_valid_uuid_tenant`

## 数据风险

本地 1 行 `tenant_id=NULL` 的 `submitted` 报销在加显式租户谓词后，将无法通过 update/delete 入口访问。该行是历史公共行，生产侧若有同类数据同样不可写；如需处理，应由数据治理批次单独回填租户，不在本批静默改写。
