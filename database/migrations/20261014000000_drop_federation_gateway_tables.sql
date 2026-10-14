-- 4.8：下线 federation_gateway / smart_gateway 两套自研网关后 DROP 其表族。
--
-- 范围：
--   portal.federation_*（6 张：subgraphs / query_plans / transactions /
--     transaction_steps / execution_logs / compensation_logs）——联邦子图注册与跨服务事务补偿，
--     已被 deep_federation + 全局 Saga（topems-shared saga）取代，REST/GraphQL 路由与模块已删除。
--   portal.gateway_*（4 张：routes / protocols / degradation_policies / health_metrics）——
--     超级网关智能路由/多协议/降级策略，前端零调用、BFF 无流量。
--
-- 不在范围：portal.portal_gateway_configs 归属 deployment_manager 活代码（schema_defense 登记），严禁 DROP。
--
-- 幂等：全部 IF EXISTS。

DROP TABLE IF EXISTS "portal"."federation_compensation_logs";
DROP TABLE IF EXISTS "portal"."federation_execution_logs";
DROP TABLE IF EXISTS "portal"."federation_query_plans";
DROP TABLE IF EXISTS "portal"."federation_subgraphs";
DROP TABLE IF EXISTS "portal"."federation_transaction_steps";
DROP TABLE IF EXISTS "portal"."federation_transactions";

DROP TABLE IF EXISTS "portal"."gateway_degradation_policies";
DROP TABLE IF EXISTS "portal"."gateway_health_metrics";
DROP TABLE IF EXISTS "portal"."gateway_protocols";
DROP TABLE IF EXISTS "portal"."gateway_routes";
