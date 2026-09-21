-- 000100: lims.samples 旧表清理 + public.qa_lab_samples 标准表补建迁移
--
-- 背景（2026-09-21 决策）：
--   1. lims.samples（旧表）：代码零读写引用（svc/lims 111 处 samples 引用全部为
--      qa_lab_samples / qa_lims_pt_samples）；09-19 数据迁移已把 4 行历史数据迁入
--      public.qa_lab_samples（列映射 code→sample_no 等）；5432 权威库已无此表
--      （手动清理），5433 残留 3 列空骨架（0 行，基线只建 id 主键 1 列）。
--      结论：废弃，DROP。
--   2. public.qa_lab_samples（标准表）：svc/lims 35 处显式引用 + 14 列标准结构 +
--      lims/public/rs 三镜像 FK 引用，但迁移链只有 20260902000002 的 DROP 与
--      20260903000001 的 SET SCHEMA（public→lims），从未有 CREATE 步骤——
--      5432 的表是 09-19 手动重建的（未入迁移），5433 全新实例因此缺失，
--      lims 样品 API 在 5433 上无法工作。结论：补 CREATE（幂等，双库可重放，
--      5432 已存在则跳过）。
--
-- 兼容性：全部幂等（IF EXISTS / IF NOT EXISTS），双库（5432 / 5433）可重放。

-- 1. 清理废弃旧表 lims.samples
DROP TABLE IF EXISTS lims.samples;

-- 2. 补建标准表 public.qa_lab_samples（结构对齐 5432 现行表：14 列 + 索引 + 约束）
CREATE TABLE IF NOT EXISTS public.qa_lab_samples (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sample_no   VARCHAR(64)  NOT NULL,
    sample_name VARCHAR(256) NOT NULL,
    sample_type VARCHAR(64),
    source      VARCHAR(64),
    quantity    NUMERIC(12,2),
    unit        VARCHAR(32),
    status      VARCHAR(32) DEFAULT 'received',
    received_at TIMESTAMP DEFAULT now(),
    expired_at  TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ,
    tenant_id   UUID,
    CONSTRAINT qa_lab_samples_sample_no_key UNIQUE (sample_no),
    CONSTRAINT ck_qa_lab_samples_status_standard
        CHECK (status IS NULL OR status IN ('active', 'inactive', 'archived'))
);
CREATE INDEX IF NOT EXISTS idx_qa_lab_samples_no         ON public.qa_lab_samples (sample_no);
CREATE INDEX IF NOT EXISTS idx_qa_lab_samples_sample_no  ON public.qa_lab_samples (sample_no);
CREATE INDEX IF NOT EXISTS idx_qa_lab_samples_status     ON public.qa_lab_samples (status);
