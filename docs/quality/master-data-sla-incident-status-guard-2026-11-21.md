# B84 · master-data SLA 事故类型/级别/状态严格解析（2026-11-21）

## 现状（改动前）
- `master_data.mdm_sla_incidents` 本地 0 行，`status` 默认 open，无 CHECK。
- `IncidentStatus`、`SLAIncidentType`、`ImpactSeverity` 的 `_ =>` 分支会把未知值静默改成 open / downtime / medium。
- 创建接口的事故类型和影响级别直接走宽松解析，传错也返回 200。
- 事故列表的 `status` 参数原样匹配，未知值返回空；列表与报告的事故查询均未做状态过滤。

## 改动
1. 三个枚举统一增加 `DB_VALUES`/`from_db_str`（trim + 小写、未知 None）/`as_db_str`；读侧 helper 改为“严格解析 + 显式默认”。
2. 创建 SLA 事故：事故类型、影响级别非法值返回 400，不再静默落到默认值；缺省影响级别仍为 medium。
3. 事故列表 `status` 先严格解析并回填规范值，未知值 400；列表 SQL 增加四值过滤。
4. SLA 报告的事故读取同样增加四值过滤，集合外状态不进入统计。
5. 候选 CHECK 增加 `incident_type` 与 `impact_severity` 两条 NOT VALID；映射登记三个枚举。

## 验证
- `cargo fmt --all`、`cargo clippy -p topems-master-data --all-targets -- -D warnings` 干净。
- 单测覆盖三组枚举的往返、未知值拒绝、空格与大小写归一。
- 本地演练（事务内 ROLLBACK）：临时插入 open + bogus 两行，全表 2 行、状态过滤后 1 行、`status=open` 过滤后 1 行。
- 盘点与队列：172 枚举 / 166 值 / 127 不在 DB CHECK；前端 181 键；色板缺口 0；队列 118/127 分桶不变。

## 残留
- 事故状态没有独立的状态流转接口，当前只有创建时 open；后续若增加调查/解决/关闭动作，需要补迁移规则和起始态谓词。
- 生产 `mdm_sla_incidents` 为空表，三条候选 CHECK 可在窗口内直接 `VALIDATE`；本地未执行。
