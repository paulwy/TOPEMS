# 预埋 API 评估报告

**日期：** 2026-09-11
**评估范围：** unified-core、master 模块中 0 消费的 API 文件
**评估方法：** 全仓 grep 检查 API 使用情况 + 后端实现检查

## 评估总览

| 模块 | API 文件总数 | 有消费 | 0 消费 | 有后端实现 | 无后端实现 |
|------|------------|--------|--------|----------|----------|
| unified-core | 5 | 1 (tenantApi) | 4 | 1 (system) | 3 |
| master | 13 | 2 (dataAssetCatalogApi, qualityApi) | 11 | 0 | 11 |
| **合计** | **18** | **3** | **15** | **1** | **14** |

## 有消费的 API（保留）

### unified-core
| API | 使用次数 | 状态 |
|-----|---------|------|
| tenantApi | 50 处 | ✅ 保留，活跃使用 |

### master
| API | 使用次数 | 状态 |
|-----|---------|------|
| dataAssetCatalogApi | 5 处 | ✅ 保留，活跃使用 |
| qualityApi | 17 处 | ✅ 保留，活跃使用 |

## 0 消费 API 详细评估

### unified-core（4 个）

#### 1. systemApi (`system.ts`)
- **文件大小：** 5042 bytes
- **后端实现：** ✅ 有（/system/audit-logs、/system/api-keys 等）
- **前端消费：** 0 处
- **评估：** 后端已实现，但前端未使用。可能是为系统管理页面预留的 API。
- **建议：** ⚠️ 保留（后端已实现，未来系统管理页面可能使用）

#### 2. unifiedSearchApi (`search.ts`)
- **文件大小：** 940 bytes
- **后端实现：** ❌ 无
- **前端消费：** 0 处
- **评估：** 纯预埋，无后端实现，无前端消费。
- **建议：** 📦 归档（纯预埋，无实现无消费）

#### 3. iamAuthApi (`iamAuth.ts`)
- **文件大小：** 1298 bytes
- **后端实现：** ❌ 无
- **前端消费：** 0 处
- **评估：** 纯预埋，无后端实现，无前端消费。IAM 认证可能由其他模块处理。
- **建议：** 📦 归档（纯预埋，无实现无消费）

#### 4. businessMetricApi (`businessMetric.ts`)
- **文件大小：** 6341 bytes
- **后端实现：** ❌ 无
- **前端消费：** 0 处
- **评估：** 纯预埋，无后端实现，无前端消费。业务指标可能是未来功能。
- **建议：** 📦 归档（纯预埋，无实现无消费）

### master（11 个）

#### 1. governanceApi (`governance.ts`)
- **文件大小：** 7258 bytes
- **后端实现：** ❌ 无
- **前端消费：** 0 处
- **评估：** 纯预埋，数据治理功能。
- **建议：** 📦 归档（纯预埋，无实现无消费）

#### 2. governanceV2Api (`governanceV2.ts`)
- **文件大小：** 10059 bytes
- **后端实现：** ❌ 无
- **前端消费：** 0 处
- **评估：** 纯预埋，数据治理 V2 版本。与 governance.ts 可能重复。
- **建议：** 📦 归档（纯预埋，无实现无消费，且与 governance.ts 重复）

#### 3. lineageApi (`lineage.ts`)
- **文件大小：** 4835 bytes
- **后端实现：** ❌ 无
- **前端消费：** 0 处
- **评估：** 纯预埋，数据血缘功能。
- **建议：** 📦 归档（纯预埋，无实现无消费）

#### 4. versioningApi (`versioning.ts`)
- **文件大小：** 9934 bytes
- **后端实现：** ❌ 无
- **前端消费：** 0 处
- **评估：** 纯预埋，数据版本管理功能。
- **建议：** 📦 归档（纯预埋，无实现无消费）

#### 5. metadataApi (`metadata.ts`)
- **文件大小：** 7691 bytes
- **后端实现：** ❌ 无
- **前端消费：** 0 处
- **评估：** 纯预埋，元数据管理功能。
- **建议：** 📦 归档（纯预埋，无实现无消费）

#### 6. metadataV60Api (`metadataV60.ts`)
- **文件大小：** 11457 bytes
- **后端实现：** ❌ 无
- **前端消费：** 0 处
- **评估：** 纯预埋，元数据 V60 版本。与 metadata.ts 可能重复。
- **建议：** 📦 归档（纯预埋，无实现无消费，且与 metadata.ts 重复）

#### 7. semanticSearchApi (`semanticSearch.ts`)
- **文件大小：** 8118 bytes
- **后端实现：** ❌ 无
- **前端消费：** 0 处
- **评估：** 纯预埋，语义搜索功能。
- **建议：** 📦 归档（纯预埋，无实现无消费）

#### 8. knowledgeGraphApi (`knowledgeGraph.ts`)
- **文件大小：** 6924 bytes
- **后端实现：** ❌ 无
- **前端消费：** 0 处
- **评估：** 纯预埋，知识图谱功能。
- **建议：** 📦 归档（纯预埋，无实现无消费）

#### 9. schemaRegistryApi (`schemaRegistry.ts`)
- **文件大小：** 3452 bytes
- **后端实现：** ❌ 无
- **前端消费：** 0 处
- **评估：** 纯预埋，Schema 注册中心功能。
- **建议：** 📦 归档（纯预埋，无实现无消费）

#### 10. disasterRecoveryApi (`disasterRecovery.ts`)
- **文件大小：** 9020 bytes
- **后端实现：** ❌ 无
- **前端消费：** 0 处
- **评估：** 纯预埋，灾难恢复功能。
- **建议：** 📦 归档（纯预埋，无实现无消费）

#### 11. aiGovernanceApi (`aiGovernance.ts`)
- **文件大小：** 7203 bytes
- **后端实现：** ❌ 无
- **前端消费：** 0 处
- **评估：** 纯预埋，AI 治理功能。
- **建议：** 📦 归档（纯预埋，无实现无消费）

## 归档建议汇总

### 建议归档（14 个文件）

**unified-core（3 个）：**
1. `search.ts` - unifiedSearchApi
2. `iamAuth.ts` - iamAuthApi
3. `businessMetric.ts` - businessMetricApi

**master（11 个）：**
1. `governance.ts` - governanceApi
2. `governanceV2.ts` - governanceV2Api
3. `lineage.ts` - lineageApi
4. `versioning.ts` - versioningApi
5. `metadata.ts` - metadataApi
6. `metadataV60.ts` - metadataV60Api
7. `semanticSearch.ts` - semanticSearchApi
8. `knowledgeGraph.ts` - knowledgeGraphApi
9. `schemaRegistry.ts` - schemaRegistryApi
10. `disasterRecovery.ts` - disasterRecoveryApi
11. `aiGovernance.ts` - aiGovernanceApi

### 建议保留（1 个文件）

**unified-core（1 个）：**
1. `system.ts` - systemApi（后端已实现，未来系统管理页面可能使用）

## 归档操作说明

归档操作包括：
1. 从 `index.ts` 中移除对应的导入和导出
2. 删除 API 文件
3. 检查是否有测试文件引用这些 API
4. 验证 TypeScript 编译和测试通过

**注意：** 归档前需要确认这些 API 确实没有被任何页面、组件、Hook 或测试引用。

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 未来功能需要这些 API | 中 | 归档文档保留文件内容摘要，可从 git 历史恢复 |
| 有隐藏的引用未被发现 | 低 | 全仓 grep 检查 + TypeScript 编译验证 |
| 后端实现依赖这些 API 定义 | 低 | 后端独立实现，不依赖前端 API 定义 |

## 结论

建议归档 14 个纯预埋 API 文件（无后端实现、无前端消费），保留 1 个有后端实现的 systemApi。

归档后可减少代码库体积，提高可维护性。未来需要这些功能时，可从 git 历史恢复或重新实现。
