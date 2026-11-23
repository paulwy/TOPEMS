-- 20261123130000: hrm.contracts 状态约束收敛到 ContractStatus（W5-B B215）
--
-- 背景：库内存在历史约束 ck_contracts_status_standard，只允许 active/inactive/archived，
-- 与前端合同 schema（active/expired/terminated/pending）不一致：
--   更新接口写 expired / terminated / pending 会直接撞约束失败，
--   而 archived / inactive 在后端没有任何写入方。
-- 本迁移删除该历史约束，改为 ck_hrm_contracts_status_standard。
-- 幂等：pg_constraint 存在性守卫；NOT VALID 只约束新写入，历史行留待按租户核对。
-- 不删除数据、不改列类型。

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_contracts_status_standard'
          AND conrelid = 'hrm.contracts'::regclass
    ) THEN
        ALTER TABLE hrm.contracts DROP CONSTRAINT ck_contracts_status_standard;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_hrm_contracts_status_standard'
          AND conrelid = 'hrm.contracts'::regclass
    ) THEN
        ALTER TABLE hrm.contracts
            ADD CONSTRAINT ck_hrm_contracts_status_standard
            CHECK (status IN ('active', 'expired', 'terminated', 'pending')) NOT VALID;
    END IF;
END $$;

