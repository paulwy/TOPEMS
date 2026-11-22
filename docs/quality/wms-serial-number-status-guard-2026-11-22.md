# WMS 序列号主状态/质量状态收口（B116）

- 日期：2026-11-22
- 范围：`wms.serial_numbers.status`、`wms.serial_numbers.quality_status`
- 结论：主状态统一为前端与 DB 默认的 `in_stock / reserved / out_stock / frozen / scrapped`，质量状态统一为四值；废弃 FSM 里从未被业务使用的 `pending / assigned / used / archived`；创建、批量创建、更新、删除、转移库位、列表、详情、批次、追踪、统计全部收口。

## 状态集合

主状态：

```
in_stock → reserved | out_stock | frozen | scrapped
reserved → in_stock | out_stock | frozen | scrapped
out_stock → in_stock | scrapped
frozen → in_stock | scrapped
scrapped 终态
```

默认 `in_stock`。

质量状态：

```
pending → inspecting | qualified | unqualified
inspecting → qualified | unqualified
qualified | unqualified → inspecting 或互相回写（复检）
```

默认 `pending`。

## 本批发现并修掉的问题

1. **FSM 状态与前端、DB 默认完全不一致**：`SERIAL_NUMBER` FSM 是 `pending → assigned → used → archived`，前端选项与 DB 默认却是 `in_stock / out_stock / reserved / frozen / scrapped`。该 FSM 没有被任何业务代码调用，只在测试里自证，形成“有一个看似权威的旧状态机，但与真实数据无关”的假象。现在 FSM 与枚举统一为五值，旧值严格拒绝。
2. **创建与批量创建的质量状态任意透传**：请求可写任意字符串，缺省依赖 DB 默认；批量创建中后续非法行会让前面的行“部分成功”。现在创建缺省 `pending`、非法值 400；批量创建先全量校验，任一数据库写入失败即返回错误且不提交，整批回滚。
3. **列表状态/质量参数不做校验**：未知值静默返回空列表，前端无法区分“没有数据”和“参数写错”。现在两参数严格解析，非法 400；列表 SELECT/COUNT 增加规范集合过滤与租户过滤。
4. **详情、按序列号、按批次查询没有值域过滤**：库里一旦有脏值，接口会把非法状态原样返回。现在三处查询都只返回规范集合内的行。
5. **更新两个状态列任意透传**：可把 `scrapped` 改回 `in_stock`、把质量结论随意回退；且没有软删过滤。现在校验值域，UPDATE 内用 `CASE` 谓词约束质量复检与主状态迁移矩阵，补 `deleted_at IS NULL`；0 行返回 409。
6. **删除不限制状态、不校验租户与软删**：已出库、已冻结、已报废的序列号也能被直接软删，破坏追溯链；重复删除返回成功路径。现在只允许 `in_stock`，带租户与 `deleted_at IS NULL`，0 行 409。
7. **转移库位允许清空库位、也不限制状态**：请求缺 `to_location_id` 时会把库位写成 NULL；已出库/冻结序列号也能挪库位。现在目标库位必填且必须是 UUID，只允许 `in_stock / reserved`，并补租户过滤；0 行 409。
8. **统计包含已删除行、已过期保修，且未做值域过滤**：`warranty_expiring_soon_count` 把已过期保修也算作“即将到期”。现在统计补软删、租户、状态与质量集合过滤，保修只统计未来 30 天内；聚合列显式 `::bigint` 与 `COALESCE`，零行不再返回 NULL。
9. **追踪查询无值域过滤**：现在只返回规范状态/质量集合内的序列号，避免脏值通过追踪接口外泄。

## 代码

- 新增 `svc/wms/src/modules/serial_number_status.rs`：
  - `SerialNumberStatus` 五值 + `DB_VALUES / DEFAULT(InStock) / from_db_str / as_db_str / can_transition_to`。
  - `SerialNumberQualityStatus` 四值 + `DB_VALUES / DEFAULT(Pending) / from_db_str / as_db_str / can_transition_to`。
  - 三个单测：主状态往返与旧 FSM 值拒绝、主状态迁移矩阵、质量状态往返与复检矩阵。
- `svc/wms/src/modules/mod.rs`：注册 `pub mod serial_number_status;`。
- `svc/wms/src/shared/fsm.rs`：`SERIAL_NUMBER` 改为五值矩阵，终态 `scrapped`；同步更新 FSM 内部测试与 `fsm_test.rs`。
- `svc/wms/src/modules/serial_number.rs`：
  - 列表严格解析两参数，SELECT/COUNT 加规范集合与租户过滤。
  - 创建/批量创建校验质量状态，状态绑默认 `in_stock`；批量失败不提交。
  - 详情、按序列号、按批次加规范集合过滤。
  - 更新校验两列、补软删过滤、迁移矩阵，0 行 409。
  - 删除仅 `in_stock`，带租户与软删过滤。
  - 转移库位要求合法目标库位，仅 `in_stock / reserved`，带租户过滤。
  - 统计补软删、租户、集合过滤与聚合类型；追踪补集合过滤。
- `svc/wms/src/models/serial_number.rs`：测试夹具状态改为 `in_stock / qualified / out_stock`。

## 本地事务演练

本地与生产快照 `wms.serial_numbers` 均 0 行，当前无状态 CHECK。DDL 与探针全部在事务内执行，最后回滚。

1. 两条候选 CHECK 以 `NOT VALID` 建成，默认保持 `in_stock / pending`。
2. 插入探针不传两列：得 `in_stock / pending`。
3. 合法更新为 `reserved / inspecting`：`UPDATE 1`。
4. 改 `status='pending'`、`quality_status='rejected'`：分别触发 `ERROR 23514`，行仍是 `reserved / inspecting`。
5. 回滚后复查：两条约束计数 0，表仍 0 行。

## 验证

- `cargo fmt --all`
- `cargo check -p topems-wms`：通过
- `cargo clippy -p topems-wms --all-targets -- -D warnings`：通过
- `cargo test -p topems-wms --lib`：579 passed（B115 为 576，新增 3 个）

## 后续

- 候选 DDL 未进 `database/migrations/`，生产执行需窗口；窗口内先跑 SQL 文件头部两条预检。
- 表上没有 `serial_no` 唯一约束，批量创建仍可能写入重复序列号；本批只取值域与状态流转，唯一性留待数据完整性批次。
- 删除只允许 `in_stock`，已出库/报废序列号保留追溯；如业务确需清理历史行，应走单独的归档流程。
- 序列号目前没有独立的质量检验、冻结、报废动作端点，仍通过通用 PUT 的迁移矩阵守卫。
