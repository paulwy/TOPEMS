-- TOPEMS database migration 20261020000010
-- C8 修复 rs.experiments 列型漂移（创建/列表 500）：
-- 1) created_by：UUID -> VARCHAR(255)，与同 schema 族 rs.formulas / rs.projects 的
--    created_by 文本口径一致。代码绑定的是实验员/创建用户名 String，UUID 列导致
--    INSERT 报"字段 created_by 类型为 uuid, 但表达式类型为 text"。
-- 2) results：TEXT -> JSONB，与 rs.formulas.ingredients/properties 的 JSON 口径一致，
--    模型按 serde_json::Value 解码；历史非 JSON 文本用 to_jsonb 安全包裹，NULL 保持 NULL。
-- 幂等、双库安全；不改动现有数据语义，不删除任何列。

ALTER TABLE rs.experiments
    ALTER COLUMN created_by TYPE VARCHAR(255) USING created_by::text;

ALTER TABLE rs.experiments
    ALTER COLUMN results TYPE JSONB USING to_jsonb(results);
