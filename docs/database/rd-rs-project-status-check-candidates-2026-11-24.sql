-- B253：rs.rs_projects.status 收敛到 RdProjectStatus 四态
-- 该表由 PM 项目事件维护，既有 17 行全部为 pending；无 CHECK 约束。
-- 事件处理器原先硬编码 pending / completed，统计查询硬编码四态；
-- 本批统一为 pending / in_progress / completed / cancelled。

ALTER TABLE rs.rs_projects
    ADD CONSTRAINT ck_rs_projects_status_lifecycle_standard
    CHECK (
        (status)::text = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])
    ) NOT VALID;
