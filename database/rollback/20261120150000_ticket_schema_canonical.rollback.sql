-- 回滚 20261120150000_ticket_schema_canonical
--
-- 接管型迁移：7 张表在目标库通常已存在并被 ticket 真实读写。
-- 自动 DROP TABLE 会丢工单、评论、SLA 与知识库数据，因此明确拒绝自动回滚。

DO $$
BEGIN
    RAISE EXCEPTION
        '20261120150000 为 schema 接管型迁移，不可自动回滚；'
        '如需撤销请先确认 ticket 7 张业务表无数据，再人工 DROP';
END
$$;
