-- 待拍板项 2: DROP core_subscriptions 死表
-- 三证：code 0 引用（svc/ + lib/ grep = 0）+ 前端 0 引用 + live DB 0 行数据
-- 原建表：010_billing.sql:23，无业务 handler 读写

DROP TABLE IF EXISTS public.core_subscriptions CASCADE;
