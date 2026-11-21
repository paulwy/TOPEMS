# B86 · master-data SLA 指标严格解析与读取过滤（2026-11-21）

## 现状（改动前）
- `master_data.mdm_sla_configs` 本地 0 行，`metric` 无 CHECK。
- `SLAMetric` 读侧 `_ => Availability`，配置创建 `metric` 也走宽松解析，未知指标会静默变成可用性。
- 度量、SLA 状态、SLA 报告三处配置读取均未做 metric 过滤；损坏行会被当作 availability 参与计算。

## 改动
1. `SLAMetric` 增加 `DB_VALUES`/`from_db_str`（trim + 小写）/`as_db_str`；读侧 helper 改为严格解析 + 显式默认。
2. `/sla/configure` 的 `metric` 非法值返回 400，不再静默落到 availability。
3. 度量入口配置读取、SLA 状态配置读取、SLA 报告配置读取统一增加三值过滤；集合外指标不会被当作可用性计算。
4. 候选 CHECK 增加 `mdm_sla_configs_metric_check`（NOT VALID），映射登记 `SLAMetric`。

## 验证
- `cargo fmt --all`、`cargo clippy -p topems-master-data --all-targets -- -D warnings` 干净。
- 单测覆盖三值往返、未知值拒绝、大小写与空格归一。
- 本地演练（事务内 ROLLBACK）：临时插入 availability + throughput 两行，全表 2 行、指标过滤后 1 行；按 id 读取损坏指标 0 行。
- 盘点/队列：172 枚举 / 127 不在 DB CHECK；队列 118/127，分桶不变。

## 残留
- `mdm_sla_measurements.met` 是布尔计算值，不是状态枚举；本批未改。
- 生产配置表为空，候选 CHECK 可在窗口内直接 VALIDATE；本地未执行。
