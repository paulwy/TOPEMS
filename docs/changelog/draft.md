# CHANGELOG 草案（自动生成 2026-08-31）

> 范围：`V472..HEAD`，共 5 条提交。自动生成，人工复核后合并。

## [未发布]

### 重构

- graphql_cache invalidation/prefetch 规则函数改为 pub 供 graphql 模块复用 (`portal` · ed087479c)
- graphql_cache LruCache 方法改为 pub 供 graphql_helpers 复用 + 删除重复注释 (`portal` · a5b28a844)
- 拆分 master_data_refs.rs 与 mdm_v49.rs 上帝文件 + 冗余清理整合 (`master-data` · 89e29f8e5)

### 文档

- upgrade architecture plans to v1.2/v1.1 and gitignore experimental code ( · 8582c9a50)
- fix duplicate V321 section and update header to V472 (`todo` · 633d59fa6)
