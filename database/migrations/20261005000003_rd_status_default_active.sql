-- ============================================================
-- 方向③：rd.builds / rd.deploys status 默认值固化（补录）
-- ============================================================
-- 背景（TODO.md L973 方向③收尾）：
--   * rd 服务创建 builds/deploys 时 status 默认 'active'（live 曾手工 ALTER 生效，
--     但迁移文件未入主线——本次补录固化文件）。
--   * 本迁移幂等：SET DEFAULT 重复执行无副作用，可安全重放。
-- ============================================================

ALTER TABLE rd.builds ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE rd.deploys ALTER COLUMN status SET DEFAULT 'active';
