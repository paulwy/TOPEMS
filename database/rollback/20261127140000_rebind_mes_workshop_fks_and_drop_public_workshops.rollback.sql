-- 回滚 20261127140000：只能重建 public.workshops 空壳结构，无法恢复数据（本身 0 行）
-- 说明：外键回绑不做逆转（回绑到 mes.workshops 是正确口径，逆转只会把问题带回来）。
BEGIN;
CREATE TABLE IF NOT EXISTS public.workshops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar NOT NULL,
  name varchar NOT NULL,
  location varchar,
  manager varchar,
  status varchar,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS workshops_code_key ON public.workshops (code);
COMMIT;
