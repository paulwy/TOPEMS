-- 2026-10-30 第二批修复：ehs.training_programs 补 updated_at 列
-- 根因：handler PUT 引用 updated_at，但建表无此列，导致真实登录态 smoke 500。
-- 生产库已通过 ADD COLUMN IF NOT EXISTS 执行（幂等），本文件保证迁移可复现。

ALTER TABLE ehs.training_programs
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
