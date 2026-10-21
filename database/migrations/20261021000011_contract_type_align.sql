-- =============================================================
-- 批5：契约类型对齐（wms.batches 库位/供应商、pm.project_documents.tags）
--
-- 背景：
--   1) wms.batches.location_id / supplier_id 历史上建为 varchar，同库其他表
--      （inventory / inbound_order_items / serial_numbers 等）均为 uuid，
--      svc/wms 也按 Uuid 绑定/解码（batch.rs 的 $N::uuid、models::Batch 的 Option<Uuid>），
--      运行时直接报 operator does not exist: character varying = uuid。
--   2) pm.project_documents.tags 由旧迁移建为 text[]，而 20261007140000 的
--      ADD COLUMN IF NOT EXISTS tags JSONB 因列已存在被跳过；svc/pm 的模型按
--      jsonb 绑定（Option<serde_json::Value>），UPDATE 报
--      COALESCE types jsonb and text[] cannot be matched。
--
-- 幂等：仅在列类型仍为旧类型时转换；非 uuid 脏值回填 NULL。
-- =============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'wms' AND table_name = 'batches'
          AND column_name = 'location_id' AND data_type = 'character varying'
    ) THEN
        ALTER TABLE wms.batches
            ALTER COLUMN location_id TYPE uuid
            USING (CASE
                WHEN location_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                THEN location_id::uuid
                ELSE NULL
            END);
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'wms' AND table_name = 'batches'
          AND column_name = 'supplier_id' AND data_type = 'character varying'
    ) THEN
        ALTER TABLE wms.batches
            ALTER COLUMN supplier_id TYPE uuid
            USING (CASE
                WHEN supplier_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                THEN supplier_id::uuid
                ELSE NULL
            END);
    END IF;
END $$;

-- pm.project_documents.tags：text[] -> jsonb（对齐 Rust Option<serde_json::Value>）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'pm' AND table_name = 'project_documents'
          AND column_name = 'tags' AND udt_name = '_text'
    ) THEN
        ALTER TABLE pm.project_documents
            ALTER COLUMN tags TYPE jsonb
            USING to_jsonb(tags);
    END IF;
END $$;
