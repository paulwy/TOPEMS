-- =============================================================================
-- erp 租户回填补全 + dict 触发器修复（2026-10-15）
-- 1) migration 72 仅回填 3 张表（按 pg_stat 判断），漏掉 dict_types 等
--    含 tenant_id 且有存量数据的表 → 本迁移对全部 erp 表补回填 NULL → zero。
-- 2) 顺带修复 prevent_archived_dict_write 触发器函数：原实现无条件引用
--    NEW.type_id（仅 dict_items 存在该列），导致 dict_types 的所有
--    UPDATE/DELETE 报 "record new has no field type_id"（业务接口不可用），
--    也是 dict_types 回填的阻塞项。改为按 TG_TABLE_NAME 分支兼容两表。
-- =============================================================================

-- ---- 2. 触发器函数兼容修复 ----
-- 原实现两处缺陷：① 无条件引用 NEW.type_id（仅 dict_items 有该列）→ dict_types
-- 的 UPDATE/DELETE 报 "record new has no field type_id"；② 引用 erp.archive_marks
-- （该表不存在）→ 任何触发均失败。本函数仅保留 dict_items 的父类型归档检查；
-- dict_types 无父类型概念，直接放行。
-- 行级归档（archive_marks）无消费方、表不存在，评估后不实现（见 TODO）。
-- DELETE 分支：NEW 为 NULL（RETURN NEW 会静默取消删除，RETURN OLD 放行），
-- 用 OLD.dict_type_id 做父类型归档检查，归档字典下的项禁止删除，与 UPDATE/INSERT 一致。
CREATE OR REPLACE FUNCTION prevent_archived_dict_write() RETURNS trigger AS $$
DECLARE
    check_type_id uuid;
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF TG_TABLE_NAME = 'dict_items' THEN
            check_type_id := OLD.dict_type_id;
            IF EXISTS (
                SELECT 1 FROM erp.dict_types dt
                WHERE dt.id = check_type_id
                AND dt.status = 'archived'
            ) THEN
                RAISE EXCEPTION 'Cannot modify archived dictionary items. HR dictionary data is managed by HRM service.';
            END IF;
        END IF;
        RETURN OLD;
    END IF;
    -- NEW.dict_type_id 先赋值到局部变量再参与子查询：PL/pgSQL 对 SQL 子查询中的
    -- record 字段引用在语句准备期解析，若直接写 NEW.dict_type_id 即使被分支包裹
    -- 也会在 dict_types 上抛 "record new has no field dict_type_id"。
    IF TG_TABLE_NAME = 'dict_items' THEN
        check_type_id := NEW.dict_type_id;
        IF EXISTS (
            SELECT 1 FROM erp.dict_types dt
            WHERE dt.id = check_type_id
            AND dt.status = 'archived'
        ) THEN
            RAISE EXCEPTION 'Cannot modify archived dictionary items. HR dictionary data is managed by HRM service.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---- 1.5 触发器事件补全：dict_items 增加 DELETE 事件 ----
-- 原触发器仅 BEFORE INSERT OR UPDATE，归档父类型下的项仍可物理删除；
-- 补 DELETE 事件使归档保护覆盖增/改/删（函数 DELETE 分支用 OLD.dict_type_id）。
-- 注意：触发器属主为表 owner（topems_app），需以 owner 执行本段。
DROP TRIGGER IF EXISTS trigger_prevent_archived_dict_items_write ON erp.dict_items;
CREATE TRIGGER trigger_prevent_archived_dict_items_write
BEFORE INSERT OR UPDATE OR DELETE ON erp.dict_items
FOR EACH ROW EXECUTE FUNCTION prevent_archived_dict_write();

-- ---- 1. 全表租户回填（NULL → zero）----
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'erp' AND column_name = 'tenant_id'
  LOOP
    BEGIN
      EXECUTE format(
        'UPDATE erp.%I SET tenant_id = ''00000000-0000-0000-0000-000000000000'' WHERE tenant_id IS NULL',
        r.table_name
      );
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'skip backfill for erp.%: %', r.table_name, SQLERRM;
    END;
  END LOOP;
END $$;
