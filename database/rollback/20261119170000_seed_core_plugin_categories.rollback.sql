-- 回滚：20261119170000_seed_core_plugin_categories.sql
-- 仅删除本迁移灌入的分类字典行，不影响其它数据。

DELETE FROM core.core_plugin_categories
 WHERE code IN ('manufacturing', 'quality', 'analytics', 'supply-chain',
                'hr', 'crm', 'ai', 'gis', 'devtools');
