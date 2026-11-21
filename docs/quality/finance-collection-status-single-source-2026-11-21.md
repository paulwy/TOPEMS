# 收款记录状态单一源（2026-11-21）

## 结论

`finance.erp_collection_records.status` 是自由文本，本地 553 行中：

- `NULL` 351 行；
- `pending` 202 行；
- 无 `confirmed` / `written_off` 行。

代码读取路径把 `NULL` 当 `pending` 展示，但确认谓词写成 `status != 'confirmed'`。PostgreSQL 中 `NULL != 'confirmed'` 结果是 `NULL`，WHERE 不成立，**351 条历史记录永远无法确认**。同时更新入口接受任意字符串，核销接口不校验状态，已核销可重复核销。

现统一为三值：`pending / confirmed / written_off`；`NULL` 明确作为 `pending` 的历史别名。

## 状态机

- 创建：`pending`；
- 确认：`pending`（含历史 `NULL`）→ `confirmed`；
- 核销：`pending` / `confirmed` → `written_off`；
- `confirmed` 不可重复确认；
- `written_off` 不可再确认、不可重复核销；
- 手工更新只允许 `pending` / `confirmed`，核销必须走 `/collections/write-off`。

## 改动

- 新增 `svc/finance/src/modules/collection_status.rs`：`CollectionStatus`、NULL 归一、4 个单测。
- `services/finance/collection.rs`：
  - 列表/详情 SELECT 改为 `COALESCE(status, 'pending') AS status`，历史行不再显示 `null`；
  - 列表 `status=pending` 过滤改为 `COALESCE(status, 'pending') = $2`，历史 NULL 行可被筛出；
  - 更新入口校验状态，只允许 `pending` / `confirmed`，`written_off` 与未知值返回 400；
  - 核销 UPDATE 增加 `COALESCE(status,'pending') IN ('pending','confirmed')` 谓词，状态不符不再假成功。
- `modules/sales_invoice.rs` 两条确认 UPDATE（单条与批量）改为 `COALESCE(status,'pending') = 'pending'`；单条入口对 `written_off` 显式 409。
- 前端目前无收款状态展示/写入组件，无需改动。

## 验证

- `cargo test -p topems-finance --lib modules::collection_status`：4 passed。
- `cargo clippy -p topems-finance --lib -- -D warnings`：通过。
- 本地库事务回滚验证：
  - 插入 `status=NULL` 的记录，按新谓词确认更新 1 行，返回 `confirmed`；
  - 再确认更新 0 行；
  - 已确认记录核销更新 1 行，返回 `written_off`；
  - 重复核销更新 0 行。
- 未对现有 553 行做数据修改。

## DB CHECK（待生产窗口）

`NULL` 是历史别名，CHECK 对 `NULL` 天然放行；无需为了加约束先回填。若希望彻底消灭 NULL，可在生产确认后单独回填。

```sql
ALTER TABLE finance.erp_collection_records
  ADD CONSTRAINT erp_collection_records_status_check
  CHECK (status IN ('pending','confirmed','written_off')) NOT VALID;

SELECT status, count(*) FROM finance.erp_collection_records GROUP BY 1 ORDER BY 2 DESC;

ALTER TABLE finance.erp_collection_records VALIDATE CONSTRAINT erp_collection_records_status_check;

-- 可选：确认业务接受后，把历史 NULL 明确回填为 pending
-- UPDATE finance.erp_collection_records SET status = 'pending', updated_at = now() WHERE status IS NULL;
```

生产若存在 `completed`、`settled`、`void` 等值，先与财务确认映射，不得直接归一。

## 回滚

```sql
ALTER TABLE finance.erp_collection_records
  DROP CONSTRAINT IF EXISTS erp_collection_records_status_check;
```

代码回滚到 `b28c75019` 可恢复旧行为（不推荐：历史 NULL 行将再次无法确认）。
