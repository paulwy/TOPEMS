# TOPEMS 数据库性能优化分析报告

**日期**：2026-09-11
**版本**：v1.0
**分析范围**：全量数据库表、索引、后端服务查询代码

---

## 一、执行摘要

本报告基于数据库统计信息和代码分析，对 TOPEMS 项目的数据库性能进行全面评估。由于开发环境数据量较小（最大表约 8500 行），慢查询日志数据不足，本报告主要通过以下方式识别潜在性能问题：

1. **索引使用情况分析**：基于 `pg_stat_user_indexes` 统计
2. **代码查询分析**：扫描后端服务中的复杂查询（多表 JOIN、聚合、子查询）
3. **数据库配置分析**：检查 PostgreSQL 配置和连接池配置

**主要发现**：
- 高频使用索引集中在 CQRS 和权限相关表
- 发现 20+ 个未使用的非主键索引（可能冗余）
- 识别 15+ 个潜在慢查询（多表 JOIN、聚合查询）
- 部分聚合查询可能缺少合适的索引

---

## 二、索引使用情况分析

### 2.1 高频使用索引 Top 10

| 排名 | 表名 | 索引名 | 扫描次数 | 索引大小 | 说明 |
|------|------|--------|----------|----------|------|
| 1 | cqrs_projection_progress | cqrs_projection_progress_pkey | 6,639 | 16 kB | 主键，高频查询 |
| 2 | cqrs_events | idx_cqrs_events_occurred | 6,551 | 8 kB | 事件时间索引，高频查询 |
| 3 | core_permissions | core_permissions_pkey | 809 | 40 kB | 权限表主键 |
| 4 | core_permissions | core_permissions_code_key | 374 | 48 kB | 权限编码唯一索引 |
| 5 | mes.material_issues | idx_material_issues_order_id | 126 | 8 kB | MES 物料出库订单ID索引 |
| 6 | mes.quality_records | idx_quality_records_order_id | 126 | 8 kB | MES 质量记录订单ID索引 |
| 7 | mes.production_schedules | idx_production_schedules_order_id | 126 | 8 kB | MES 生产计划订单ID索引 |
| 8 | mes.material_requirements | idx_material_requirements_order_id | 126 | 8 kB | MES 物料需求订单ID索引 |
| 9 | mes.wips | idx_wips_order_id | 126 | 8 kB | MES 在制品订单ID索引 |
| 10 | mes.production_records | idx_production_records_order_id | 114 | 16 kB | MES 生产记录订单ID索引 |

**分析**：
- CQRS 相关表索引使用频率最高，说明事件溯源和投影更新是核心操作
- MES 模块的订单ID索引使用频率较高，说明按订单查询是常见操作
- 权限表索引使用频率较高，说明权限校验是高频操作

### 2.2 未使用索引 Top 20（潜在冗余）

| 排名 | Schema | 表名 | 索引名 | 索引大小 | 建议 |
|------|--------|------|--------|----------|------|
| 1 | public | core_refresh_tokens | idx_iam_refresh_tokens_token_hash | 88 kB | 评估是否需要，token_hash 查询可能走其他索引 |
| 2 | public | core_tenants | core_tenants_code_key | 72 kB | 唯一索引，建议保留 |
| 3 | public | core_tenants | idx_core_tenants_code | 72 kB | 与 core_tenants_code_key 重复，建议删除 |
| 4 | public | core_sessions | idx_iam_sessions_token_hash | 40 kB | 评估是否需要 |
| 5 | public | core_refresh_tokens | idx_iam_refresh_tokens_expires_at | 40 kB | 过期时间索引，建议保留（清理任务使用） |
| 6 | public | core_permissions | idx_core_permissions_resource | 32 kB | 资源索引，评估是否需要 |
| 7 | gis | business_locations | idx_business_locations_position | 24 kB | 位置索引，GIS 查询可能使用 |
| 8 | core | core_plugins | idx_core_plugins_is_published | 16 kB | 发布状态索引，评估是否需要 |
| 9 | core | core_plugins | idx_core_plugins_category | 16 kB | 分类索引，评估是否需要 |
| 10 | public | audit_logs | idx_audit_logs_action | 16 kB | 操作类型索引，审计查询可能使用 |
| 11 | gis | device_location_records | idx_gis_device_location_records_recorded_at | 16 kB | 记录时间索引，建议保留 |
| 12 | ai | documents | idx_documents_status | 16 kB | 状态索引，评估是否需要 |
| 13 | ai | documents | idx_documents_created_at | 16 kB | 创建时间索引，建议保留 |
| 14 | ai | documents | idx_documents_deleted_at | 16 kB | 删除时间索引，软删除查询使用 |
| 15 | ai | documents | idx_documents_title | 16 kB | 标题索引，全文搜索可能使用 |
| 16 | core | core_plugins | idx_core_plugins_code | 16 kB | 编码索引，评估是否需要 |
| 17 | core | core_tenant_plugins | idx_core_tenant_plugins_tenant | 16 kB | 租户索引，建议保留（RLS 查询使用） |
| 18 | gis | device_location_records | idx_gis_device_location_records_device_id | 16 kB | 设备ID索引，建议保留 |
| 19 | ai | document_chunks | idx_document_chunks_embedding | 16 kB | 向量索引，AI 查询使用 |
| 20 | gis | devices | devices_device_code_key | 16 kB | 设备编码唯一索引，建议保留 |

**优化建议**：
1. **明确冗余**：`idx_core_tenants_code` 与 `core_tenants_code_key` 重复，建议删除
2. **需评估**：token_hash、resource、is_published、category、status 等索引，需确认是否有对应查询
3. **建议保留**：过期时间、创建时间、删除时间、租户ID、设备ID、记录时间等索引

---

## 三、潜在慢查询分析（基于代码扫描）

### 3.1 多表 JOIN 查询

| 序号 | 服务 | 文件 | 查询描述 | 潜在问题 | 优化建议 |
|------|------|------|----------|----------|----------|
| 1 | erp | inventory.rs:359 | 库存与物料表 JOIN，查询低于安全库存的库存 | 缺少 material_id 索引 | 添加 `idx_inventory_material_id` 索引 |
| 2 | finance | voucher_template_entries.rs:101 | 凭证模板行与模板表 JOIN | 缺少 template_id 索引 | 添加 `idx_voucher_template_lines_template_id` 索引 |
| 3 | finance | voucher_template_entries.rs:202 | 同上，COUNT 查询 | 同上 | 同上 |
| 4 | mes | equipment_oee.rs:265 | OEE 与设备表 LEFT JOIN | 缺少 equipment_id 索引 | 添加 `idx_equipment_oee_equipment_id` 索引 |
| 5 | monitor | metrics.rs:722 | 员工与部门表 JOIN | 缺少 dept_id 索引 | 添加 `idx_employees_dept_id` 索引 |

### 3.2 聚合查询（GROUP BY）

| 序号 | 服务 | 文件 | 查询描述 | 潜在问题 | 优化建议 |
|------|------|------|----------|----------|----------|
| 1 | crm | sales_funnel.rs:288 | 按周期和阶段分组的销售漏斗 | 缺少 created_at 和 stage 复合索引 | 添加 `idx_opportunities_created_at_stage` 索引 |
| 2 | crm | rfm.rs:362 | 客户 RFM 分析，按客户分组 | 缺少 customer_id 索引 | 确认 `idx_interactions_customer_id` 存在 |
| 3 | crm | analytics.rs:130 | 商机按阶段分组统计 | 缺少 stage 索引 | 添加 `idx_opportunities_stage` 索引 |
| 4 | crm | analytics.rs:137 | 商机按月度分组统计 | 缺少 created_at 索引 | 添加 `idx_opportunities_created_at` 索引 |
| 5 | crm | analytics.rs:144 | 客户按行业分组统计 | 缺少 industry 索引 | 添加 `idx_customers_industry` 索引 |
| 6 | crm | dashboard.rs:67 | 客户按行业分组统计 | 同上 | 同上 |
| 7 | crm | dashboard.rs:97 | 商机按阶段分组统计 | 同 analytics.rs:130 | 同上 |
| 8 | crm | dashboard.rs:136 | 互动按类型分组统计 | 缺少 type 索引 | 添加 `idx_interactions_type` 索引 |
| 9 | ehs | dashboard.rs:91 | 隐患按类别分组统计 | 缺少 category 索引 | 添加 `idx_qa_ehs_hazards_category` 索引 |
| 10 | erp | master_data_assets.rs:200 | 主数据按域分组统计 | 缺少 domain 索引 | 添加 `idx_master_data_refs_domain` 索引 |
| 11 | erp | sales_order.rs:784 | 销售订单按状态分组统计 | 缺少 status 索引 | 添加 `idx_sales_orders_status` 索引 |

### 3.3 子查询

| 序号 | 服务 | 文件 | 查询描述 | 潜在问题 | 优化建议 |
|------|------|------|----------|----------|----------|
| 1 | finance | risk_v54.rs:860 | 欺诈评分子查询，按交易ID前缀匹配 | LIKE 前缀查询可能无法使用索引 | 考虑使用全文搜索或单独的前缀字段 |
| 2 | pm | statistics.rs:802 | 项目统计子查询，比较计划结束日期 | 子查询性能较差 | 改为 JOIN 查询 |
| 3 | srm | supplier_category.rs:483 | 供应商分类子查询 | 子查询性能较差 | 改为 JOIN 查询 |

---

## 四、数据库配置分析

### 4.1 当前配置

| 配置项 | 当前值 | 建议值 | 说明 |
|--------|--------|--------|------|
| shared_buffers | 默认（128MB） | 内存的 25% | 数据库缓存 |
| effective_cache_size | 默认（4GB） | 内存的 50-75% | 查询优化器估算可用缓存 |
| work_mem | 默认（4MB） | 16-64MB | 排序和哈希操作内存 |
| maintenance_work_mem | 默认（64MB） | 256MB-1GB | 维护操作（VACUUM、CREATE INDEX）内存 |
| max_connections | 默认（100） | 100-200 | 最大连接数（配合连接池） |
| log_min_duration_statement | 1000ms | 1000ms | 慢查询日志阈值（已配置） |
| logging_collector | on | on | 日志收集器（已配置，需重启生效） |

### 4.2 连接池配置

| 配置项 | 当前值 | 建议值 | 说明 |
|--------|--------|--------|------|
| max_connections | 10（默认） | 10-20（开发）/ 20-50（生产） | 每个服务的最大连接数 |
| acquire_timeout | 未设置（30s） | 10s | 连接获取超时 |
| idle_timeout | 未设置（10min） | 5min | 空闲连接超时 |
| min_connections | 未设置（0） | 2-5 | 最小连接数（预热） |

---

## 五、优化实施计划

### 阶段一：索引优化（1-2 天）

**高优先级**：
1. 删除冗余索引：`idx_core_tenants_code`（与 `core_tenants_code_key` 重复）
2. 添加外键索引：
   - `idx_inventory_material_id`
   - `idx_voucher_template_lines_template_id`
   - `idx_equipment_oee_equipment_id`
   - `idx_employees_dept_id`
3. 添加聚合查询索引：
   - `idx_opportunities_stage`
   - `idx_opportunities_created_at`
   - `idx_customers_industry`
   - `idx_interactions_type`
   - `idx_qa_ehs_hazards_category`
   - `idx_master_data_refs_domain`
   - `idx_sales_orders_status`

**中优先级**：
4. 评估并删除未使用索引（需确认无对应查询）
5. 添加复合索引（如 `idx_opportunities_created_at_stage`）

### 阶段二：查询优化（2-3 天）

1. 优化子查询为 JOIN 查询：
   - `pm/statistics.rs:802`
   - `srm/supplier_category.rs:483`
2. 优化 LIKE 前缀查询：
   - `finance/risk_v54.rs:860`
3. 分页查询优化：
   - 检查所有列表查询是否使用游标分页而非 OFFSET
4. N+1 查询优化：
   - 检查详情页是否存在 N+1 查询

### 阶段三：缓存优化（3-5 天）

1. 实现查询结果缓存：
   - 字典数据缓存（部门、角色、权限等）
   - 配置数据缓存（系统配置、业务配置）
   - 统计数据缓存（Dashboard、Analytics）
2. 缓存失效策略：
   - 基于时间的失效（TTL）
   - 基于事件的失效（数据变更时主动失效）
3. 缓存工具选型：
   - 内存缓存：`moka` crate（高性能、支持 TTL）
   - 外部缓存：Redis（分布式环境）

### 阶段四：配置调优（1 天）

1. PostgreSQL 配置调优（生产环境）：
   - `shared_buffers` = 内存的 25%
   - `effective_cache_size` = 内存的 50-75%
   - `work_mem` = 16-64MB
   - `maintenance_work_mem` = 256MB-1GB
2. 连接池配置调优：
   - 添加 `acquire_timeout` = 10s
   - 添加 `idle_timeout` = 5min
   - 添加 `min_connections` = 2-5
3. 监控配置：
   - 配置 Prometheus + Grafana 监控仪表盘
   - 设置关键指标告警（慢查询、连接池使用率、缓存命中率）

---

## 六、性能监控建议

### 6.1 关键监控指标

| 指标类别 | 指标名 | 告警阈值 | 说明 |
|----------|--------|----------|------|
| 数据库 | 慢查询数量 | > 10/分钟 | 慢查询日志统计 |
| 数据库 | 连接池使用率 | > 80% | 活跃连接数 / 最大连接数 |
| 数据库 | 缓存命中率 | < 95% | 索引缓存命中率 |
| 数据库 | 锁等待时间 | > 1s | 锁等待统计 |
| API | P95 响应时间 | > 500ms | API 响应时间 |
| API | P99 响应时间 | > 2s | API 响应时间 |
| API | 错误率 | > 1% | HTTP 5xx 错误率 |

### 6.2 监控工具

1. **Prometheus**：指标收集和存储
2. **Grafana**：数据可视化和仪表盘
3. **pg_stat_statements**：PostgreSQL 查询统计（需安装扩展）
4. **OpenTelemetry**：分布式追踪（已集成）

---

## 七、总结

### 7.1 主要成果

1. **索引优化**：识别 1 个明确冗余索引，建议添加 11 个新索引
2. **查询优化**：识别 15+ 个潜在慢查询，给出具体优化建议
3. **配置优化**：给出 PostgreSQL 和连接池的配置调优建议
4. **缓存优化**：提出查询结果缓存的实施方案

### 7.2 预期收益

| 优化项 | 预期性能提升 | 实施难度 |
|--------|-------------|----------|
| 索引优化 | 20-50% 查询速度提升 | 低 |
| 查询优化 | 10-30% 查询速度提升 | 中 |
| 缓存优化 | 50-80% 重复查询速度提升 | 中高 |
| 配置调优 | 10-20% 整体性能提升 | 低 |

### 7.3 后续建议

1. **安装 pg_stat_statements 扩展**：用于生产环境的真实慢查询分析
2. **建立性能基准测试**：在优化前后进行性能对比
3. **持续监控**：配置 Prometheus + Grafana 监控，及时发现性能问题
4. **定期审查**：每季度进行一次索引和查询性能审查

---

**报告生成时间**：2026-09-11
**分析工具**：PostgreSQL 统计信息 + 代码静态分析
**数据来源**：开发环境数据库（数据量较小，生产环境可能存在差异）
