# B75 · 移动端推送历史 active 状态读取兼容（2026-11-21）

## 现状（改动前）
- `mobile.push_notifications.status` 的唯一集合是 pending/sent/failed，创建写 pending、发送回写只接受 pending 起始态。
- 但本地 194 行中 191 行仍是旧创建逻辑写入的 `active`，列表/详情按原值透出，前端色板没有 active；总数也把这些行计入。
- 另一张 `mobile.mobile_push_notifications` 仍有 76 行全 pending，服务代码零引用，是待确认删表/接线的独立遗留表。

## 改动
1. 推送列表、详情、总数三处 SELECT 把 `status='active'` 投影为 `pending`，并只放行 pending/sent/failed/active。
2. 枚举仍保持严格三值，`from_db_str("active") == None`；归一化只发生在读取投影，不污染写入集合。
3. 候选 CHECK 文档补读取兼容说明：DB 值未归一前保持 NOT VALID。

## 验证
- `cargo check -p topems-mobile`、`cargo clippy -p topems-mobile --all-targets -- -D warnings` 干净。
- 本地核对：总数 194、可读 194、历史 active 191、投影后合法 194；没有集合外值被隐藏。
- 状态盘点/队列 `--check` 不变。

## 残留
- 191 行 `active` 仍需在窗口内 UPDATE 为 pending 后才能 VALIDATE 候选 CHECK；本轮未改库。
- `mobile.mobile_push_notifications` 76 行仍无服务引用，删表还是接线需产品确认。
