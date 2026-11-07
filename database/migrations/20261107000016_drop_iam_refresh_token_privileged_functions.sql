-- ============================================================
-- 清理方案 C 残留：删除 iam_refresh_token_* 特权函数
-- 版本：20261107000016
--
-- ⚠️ 延后执行（本迁移只登记文件与 checksums，不在本轮应用）：
--   必须等**所有** topems 进程都切换到「直接查表 + 全 0 上下文」的新二进制
--   （即 20261107000015 的策略已生效、auth.rs 回退版本已重新编译并重启）之后，
--   再应用本迁移。旧二进制在运行期依赖这两个函数，提前删除会导致
--   refresh / logout 直接报 `function ... does not exist`（500）。
--
-- 前置确认（执行前人工核对）：
--   1) rg -n "iam_refresh_token_lookup|iam_refresh_token_revoke" svc/ 命中为 0；
--   2) 运行中的 unified-core 二进制是回退后的版本（refresh/logout 走直查表）；
--   3) 迁移 20261107000015（策略全 0 分支）已应用，且 refresh 可正常换发。
--
-- 幂等：DROP FUNCTION IF EXISTS；重复执行为 no-op。
-- 回滚：需要时按 20261105235800_iam_refresh_token_privileged_lookup.sql 重建
--   两个函数（同样的 owner/search_path/GRANT）。
-- ============================================================

SET lock_timeout = '5s';

DROP FUNCTION IF EXISTS public.iam_refresh_token_lookup(text);
DROP FUNCTION IF EXISTS public.iam_refresh_token_revoke(text);
