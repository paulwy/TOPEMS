# WMS 入库明细质量状态收口（B107）

日期：2026-11-22
范围：`wms.inbound_order_items.quality_status`、收货/明细更新入口、WMS 前端类型
基线：B106 `6ffc54dff` 之后的 `main`

## 命中问题

- `quality_status` 是自由文本 `String`，收货和明细更新都原样落库，没有枚举或 CHECK。
- 收货事务只判断 `item.quality_status == "qualified"`：写成 `ok`、`pass`、`good` 等任意值不会报错，明细照常更新，但库存不会入账，形成“明细已收货、库存没增加”的静默丢失。
- 明细更新可以随时改质量结论：`qualified → rejected` 或 `rejected → qualified` 都不会反向调整已生成的库存，造成库存与明细质量不一致。
- 明细创建依赖数据库默认 `'pending'`，INSERT 未绑定质量状态。
- 前端 `ReceiveItemRequest` 缺 `quality_status`，后端却必填；类型契约与实际接口不一致。

本地数据：`wms.inbound_order_items` 0 行，无需历史数据迁移。

## 收口决策

规范集合：

`pending / qualified / rejected`

新增 `svc/wms/src/modules/inbound_item_quality_status.rs`：

- `DB_VALUES`、`DEFAULT = pending`
- `from_db_str` 严格解析三值
- `as_db_str`、`is_terminal`
- `can_transition_to`
- `TRANSITIONS = pending → qualified | rejected`
- `qualified / rejected` 为终态，通用编辑不得回退或互改

## 写入口

- 明细创建：INSERT 增加 `quality_status` 列，绑定 `InboundItemQualityStatus::DEFAULT`；同时修正列清单中重复的 `org_id`。
- 明细更新：先解析请求质量值（未知 400）；在原有明细查询中一并读取 `expected_quantity` 与当前 `quality_status`（NULL 视为默认 `pending`）；数量校验后校验质量迁移，终态被改写返回 409；UPDATE 绑定枚举值。
- 收货：收货前按明细读取当前质量状态，逐条校验请求值是否合法、是否允许从当前值迁移；非法值 400、终态冲突 409，校验阶段不写库；写入循环绑定枚举值，`qualified` 判断改用枚举比较。
- 收货仍是短事务，`qualified` 才生成库存；`rejected` 只记录质量结论，不入账。

## 前端

- `apps/web/src/api/wms/types.ts`：新增 `InboundItemQualityStatus = 'pending' | 'qualified' | 'rejected'`；`InboundOrderItem` 补 `quality_status`；`ReceiveItemRequest` 补必填 `quality_status` 和可选 `remarks`。
- `apps/web/src/utils/status.ts`：补 `qualified: success` 色板。

## DB CHECK 候选

文件：`docs/database/wms-inbound-item-quality-check-candidates-2026-11-22.sql`

```sql
ALTER TABLE wms.inbound_order_items
    ADD CONSTRAINT ck_inbound_order_items_quality_status_standard
    CHECK (
        quality_status IS NULL
        OR quality_status::text = ANY (
            ARRAY['pending','qualified','rejected']::text[]
        )
    ) NOT VALID;
```

本地演练：

1. 事务内加 `NOT VALID` 约束。
2. 用真实入库单插入一条 `quality_status='pending'` 的探针明细，`INSERT 0 1`，同时验证 INSERT 列清单与枚举绑定可用。
3. 将探针改为 `bogus`，触发 `23514`（`ck_inbound_order_items_quality_status_standard`）。
4. 连接关闭后事务回滚：探针明细 0 行、约束 0 个，原表 0 行未被触碰。

## 未纳入本批

- `rejected` 目前只写 `quality_status`，没有累加 `rejected_quantity`；这是收货数量口径问题，不是状态集合问题，留待后续单独处理。
- `inspection_status` 仍无写入方，继续不动。

## 验证

- `cargo check -p topems-wms`：通过。
- `cargo clippy -p topems-wms --all-targets -- -D warnings`：通过。
- `cargo test -p topems-wms --lib`：557 passed。
- Web `npm run typecheck`：通过；`npm run lint`：0 errors。
- 盘点：182 个 Rust 枚举、180 值、141 不在 DB CHECK、195 前端键、色板缺口 0。
- 队列：126 枚举 / 141 值，`resolved_enums` 94。
- 候选约束本地插入合法值成功、非法值 23514，回滚零残留。
