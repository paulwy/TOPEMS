-- U4（阶段2 master-data 落库）：v51-v60 共 10 个 MDM 模块原为 LazyLock 内存 Store
-- （Mutex<Vec<T>>），进程重启即失（报告 F-20/ADVAI-01）。
--
-- 方案：在 master_data schema 建一张通用集合快照表，按 (module, entity) 主键
-- 持久化每个模块各叶子集合的 JSONB 序列化结果。服务启动时从库加载（load-on-boot），
-- 运行期由后台 flush 任务近实时回写（write-through snapshot），重启后数据仍在。
--
-- 设计取舍：
--   * 通用 KV 集合表而非逐实体建表——10 个模块约 75 个叶子集合，逐表建模
--     侵入过大且会破坏既有 ApiResponse 契约；JSONB 快照保留实体结构，前端无感。
--   * 主键 (module, entity)：每个模块每个集合一行，整集合 upsert（ON CONFLICT）。
--   * 幂等：CREATE SCHEMA / CREATE TABLE IF NOT EXISTS，可重复执行。
--
-- 注意：本表不纳入 schema_defense.rs 的 TABLE_DEFS（该机制假设 id UUID 单列主键），
--       由本迁移 + persist::init() 的 CREATE TABLE IF NOT EXISTS 双重保证存在。

CREATE SCHEMA IF NOT EXISTS master_data;

CREATE TABLE IF NOT EXISTS master_data.mdm_collections (
    module      TEXT        NOT NULL,
    entity      TEXT        NOT NULL,
    data        JSONB       NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (module, entity)
);

-- 便于按模块排查/清理（可选，低开销）
CREATE INDEX IF NOT EXISTS mdm_collections_module_idx
    ON master_data.mdm_collections (module);
