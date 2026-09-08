-- 清理 im schema（死表评审 A 组漏网：im 服务已不存在，7 张表无真实服务引用）
-- im.core_chat_* 曾因 communication TABLE_DEFS 声明被误判为有引用；
-- 声明已删（d75347e77），本迁移彻底移除孤儿 schema。
-- 幂等：schema 不存在时直接跳过。
DROP SCHEMA IF EXISTS im CASCADE;
