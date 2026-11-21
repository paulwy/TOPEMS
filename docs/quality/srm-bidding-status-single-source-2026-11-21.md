# B59 · srm.biddings 状态单一源（2026-11-21）

## 现状（改动前）
- `srm.biddings.status`：本地 0 行；列非空，DB 默认 `'draft'`，无 CHECK。
- 创建接口写死 `'draft'`；列表 `?status=` 接受任意字符串。
- 发布/开标/评标/定标四条 SQL 都把目标态和前驱态写成字面量，前驱条件本身正确。
- 定标使用 `fetch_one`，状态不匹配（0 行）被当成数据库错误返回 500，而不是 409。
- 列表 SELECT 缺少 `deleted_at IS NULL`，与 COUNT 口径不一致。

## 改动
1. 新增 `svc/srm/src/modules/bidding_status.rs`：`BiddingStatus`（draft/published/opened/evaluated/awarded，DEFAULT draft），四个前驱集合方法 + 3 单测。
2. `bidding.rs`：
   - 创建状态绑定 `DEFAULT`；
   - 列表状态筛选严格解析，未知值 400，并补 `deleted_at IS NULL`；
   - 发布、开标、评标、定标四条 UPDATE 的目标态与前驱态全部改绑枚举；
   - 0 行统一 404→409，定标从 `fetch_one` 改为 `fetch_optional`，不再把状态冲突误报 500。
3. 候选 DDL `docs/database/srm-bidding-status-check-candidates-2026-11-21.sql`：五值 CHECK，`NOT VALID`。

## 验证
- `cargo check -p topems-srm`、`cargo clippy -p topems-srm --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `cargo test -p topems-srm --lib bidding_status`：3 passed。
- 本地演练（事务内 ROLLBACK，残留 0）：插入 draft；发布→开标→评标→定标各 `UPDATE 1`；已 awarded 再定标 `UPDATE 0`；`bogus` → 23514。

## 残留
- 没有取消/终止招标动作，进入 published 后只能按链走完；是否需要取消态需产品确认。
- 创建不接收 status，统一 draft；如果需要直接创建已发布招标，需要另加导入/发布动作。
- 定标不校验中标金额与预算、供应商是否在投标名单内。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
