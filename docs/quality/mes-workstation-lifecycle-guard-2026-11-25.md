# B309 MES 工位生命周期守卫（2026-11-25）

## 结论

`mes.work_stations` 本地 79 行：`active` 69、`available` 10、`inactive` 0。

- 通用 update 虽已有当前态并发谓词，但 status 接受任意三值，可 `active/available → inactive`、`inactive → active`，绕过专用 `activate/deactivate` 的起始态校验。
- delete 只校验 `id + tenant_id + deleted_at IS NULL`，69 个启用工位与 10 个可用工位都能直接软删，无需先停用。

## 代码改动

- `WorkStationStatus` 新增：
  - `can_update_status_to`：`active/available` 为同一启用族，可在族内互转；`inactive` 只能保持 `inactive`，跨族必须走 activate/deactivate。
  - `deletable_from() = ["inactive"]`。
- update：
  - status 解析为枚举而非字符串；预读当前态，非法 409；
  - 目标状态跨族时 409，提示走专用启停接口；
  - 保留 `status = $12 AND deleted_at IS NULL` 并发谓词。
- delete：
  - UPDATE 增加 `status = ANY($3)`，仅 `inactive` 可删；
  - 0 行返回 409“不存在、已删除或未停用”，不再假成功。

## 数据库

无 DDL。当前 79 行均为启用族，按新规则全部不可直接删除，需先 deactivate；编辑字段不受影响。

## 验证

- `cargo fmt -p topems-mes`、`cargo check -p topems-mes` PASS。
- `cargo test -p topems-mes --lib work_station` 7 passed（新增 4 条族内/跨族/删除集合断言）。

## 遗留

`available` 与 `active` 业务语义重叠，本批按同族处理；是否合并两值待业务确认。
