-- 2026-10-17 ehs emergency_drill 域：drill records 接真表补列
-- 背景：前端 EhsDrillPage 真实调用 ehsApi.listDrills/createDrill/updateDrill/deleteDrill
--       （apps/web/src/api/ehs/emergency.ts，路径 /drills、/drills/{id}，前端契约
--        apps/web/src/api/ehs/types/plan.ts DrillRecord），后端 emergency_drill.rs 对应 handler 为内存桩
--       （list_drill_records 返回空数组）= 契约撒谎面。
-- 现状：ehs.qa_ehs_drill_records（21 列，RLS 策略 qa_ehs_drill_records_tenant_policy 已就绪，
--       0 行）缺 issues_found/improvements/created_by 3 列对齐前端契约；其余列别名映射（handler 层做）：
--       drill_no←record_no、drill_name←title、drill_date←started_at::text、participants←participant_list
--       （jsonb string[]）、duration_hours←duration（i32→f64）、summary←COALESCE(actual_content, content)。
-- 方案（后端宽容、零回归）：仅补缺列，既有列/RLS 不动。幂等：ADD COLUMN IF NOT EXISTS 可重复执行。

ALTER TABLE ehs.qa_ehs_drill_records
    ADD COLUMN IF NOT EXISTS issues_found text,
    ADD COLUMN IF NOT EXISTS improvements text,
    ADD COLUMN IF NOT EXISTS created_by varchar(128);
