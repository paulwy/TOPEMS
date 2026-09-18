-- TOPEMS database migration 20260918000031
-- 补建 srm.scoring_dimensions（5432 缺表，代码引用；5433 若已有则幂等跳过）
-- 金额/分值列用 double precision 对齐代码 f64（避免 numeric↔f64 解码不兼容）。

CREATE TABLE IF NOT EXISTS srm.scoring_dimensions (
    id uuid NOT NULL PRIMARY KEY,
    tenant_id uuid,
    name character varying NOT NULL,
    code character varying NOT NULL,
    weight double precision,
    min_score double precision,
    max_score double precision,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone
);
