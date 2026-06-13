# Blob下载认证错误处理修复文档

---

## 文档信息

| 项目 | 内容 |
|------|------|
| **文档版本** | v1.0 |
| **创建日期** | 2026-06-13 |
| **问题编号** | FE-BLOB-001 |
| **状态** | 已修复 |

---

## 目录

1. [问题描述](#1-问题描述)
2. [问题分析](#2-问题分析)
3. [根本原因](#3-根本原因)
4. [解决方案](#4-解决方案)
5. [修改范围](#5-修改范围)
6. [代码实现](#6-代码实现)
7. [测试验证](#7-测试验证)
8. [影响评估](#8-影响评估)
9. [相关文档](#9-相关文档)

---

## 1. 问题描述

### 1.1 问题现象

当用户尝试预览或下载 DOCX 文档时，系统提示"文件格式错误：期望 DOCX (ZIP)，实际得到 application/vnd.openxmlformats-officedocument.wordprocessingml.document"。

### 1.2 错误日志

```
Blob 内容前 100 字符: {"code":401,"success":false,"data":null,"message":"未授权：缺少有效的认证令牌","timestamp":"2026-06-13T04:13:42.9
文件头: {" (应该是 'PK')
Preview error: Error: 文件格式错误：期望 DOCX (ZIP)，实际得到 application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

### 1.3 问题影响范围

- 所有使用 `responseType: "blob"` 的 API 调用
- 文档预览功能
- 文件下载功能
- 报表导出功能
- 数据导出功能

---

## 2. 问题分析

### 2.1 问题流程

```
用户请求预览文档
    ↓
前端调用 downloadBlob API
    ↓
axios 配置 responseType: "blob"
    ↓
服务器返回 401 未授权错误
    ↓
axios 将 JSON 错误响应当作 blob 返回
    ↓
前端尝试解析 blob 内容
    ↓
检测文件头不是 ZIP (PK)
    ↓
抛出文件格式错误
```

### 2.2 问题根因定位

在使用 `responseType: "blob"` 时，axios 的响应拦截器会把服务器返回的错误响应（如 401）当作 blob 数据返回，而不是抛出错误。这导致前端无法正确处理认证错误。

---

## 3. 根本原因

**axios 的 `responseType: "blob"` 行为**：
- 当配置 `responseType: "blob"` 时，axios 会将所有响应体（包括错误响应）转换为 Blob 对象
- 服务器返回的 JSON 错误响应被当作 Blob 返回，而不是触发错误处理逻辑
- 前端无法区分真正的文件数据和错误响应

**响应拦截器失效**：
- 现有的响应拦截器在 `responseType: "blob"` 时无法正确解析错误信息
- 401 错误被当作文件内容返回

---

## 4. 解决方案

### 4.1 方案概述

创建统一的 `downloadBlob` 工具函数，该函数：
1. 使用 `validateStatus: () => true` 让所有状态码都不抛出错误
2. 手动检查响应状态码
3. 如果是非 200 响应，尝试解析错误信息并抛出异常
4. 统一处理所有 Blob 下载场景

### 4.2 方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| 在每个 API 方法中添加错误处理 | 针对性强 | 代码重复，维护困难 |
| 修改 axios 拦截器 | 统一处理 | 可能影响其他功能 |
| 创建专用 downloadBlob 函数 | 统一、安全、可维护 | 需要修改所有调用点 |

**选择方案**：创建专用的 `downloadBlob` 函数

---

## 5. 修改范围

### 5.1 核心修改

| 文件 | 修改内容 |
|------|----------|
| `src/api/client.ts` | 添加 `downloadBlob` 工具函数 |

### 5.2 API 模块修改

共修改 **14 个 API 文件**，涉及 **28 个方法**：

| 文件 | 修改方法 | 数量 |
|------|----------|------|
| `doc.ts` | `download` | 1 |
| `file.ts` | `download` | 1 |
| `voucher-template.ts` | `exportTemplate` | 1 |
| `financial-report.ts` | `exportReport`, `exportConsolidatedReport` | 2 |
| `finance.ts` | `export`, `exportBalanceSheet`, `exportIncomeStatement`, `exportCashFlowStatement` | 4 |
| `consolidation.ts` | `exportConsolidationReport`, `exportEliminationWorkSheet` | 2 |
| `srm-finance.ts` | `exportPurchaseInvoices`, `exportPaymentRequests`, `exportPayableAging` | 3 |
| `pm-finance.ts` | `exportProjectCostRecords`, `exportProjectInvoices` | 2 |
| `hrm-finance.ts` | `exportBankFile`, `exportPayrollSlips`, `exportPayrollRecords`, `exportSocialSecurityDetails` | 4 |
| `crm-finance.ts` | `exportSalesInvoices`, `exportCollectionRecords`, `exportReceivableAging` | 3 |
| `external-erp.ts` | `exportSyncLogs`, `exportMappingRules` | 2 |
| `lims.ts` | `exportSamples` | 1 |
| `rs.ts` | `exportProjects` | 1 |
| `addressbook.ts` | `exportContacts` | 1 |

### 5.3 Hooks 修改

共修改 **5 个 Hooks 文件**：

| 文件 | 修改内容 |
|------|----------|
| `useCrmFinance.ts` | 更新导出方法调用 |
| `useExternalErp.ts` | 更新导出方法调用 |
| `useFinancialReport.ts` | 更新导出方法调用 |
| `useSrmFinance.ts` | 更新导出方法调用 |

---

## 6. 代码实现

### 6.1 核心函数实现

```typescript
// src/api/client.ts

/**
 * 统一的 Blob 下载函数
 * 解决使用 responseType: "blob" 时，401 错误被当作 blob 返回的问题
 */
export const downloadBlob = async (
  baseURL: string,
  url: string,
  options?: { params?: Record<string, any> },
): Promise<Blob> => {
  const client = axios.create({
    baseURL,
    timeout: config.api.timeout,
    // 让所有状态码都不抛出错误，由我们手动处理
    validateStatus: () => true,
  });

  // 添加认证拦截器
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token && !isPublicPath(config.url || "")) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  });

  const response = await client.get(url, {
    responseType: "blob",
    params: options?.params,
  });

  // 检查是否是错误响应
  if (response.status !== 200) {
    // 尝试解析错误信息
    let errorMessage = `请求失败: ${response.status}`;
    if (response.data && typeof response.data.text === "function") {
      const text = await response.data.text();
      try {
        const json = JSON.parse(text);
        errorMessage = json.message || errorMessage;
      } catch {
        // 如果不是 JSON，使用原始文本
        if (text.length < 100) {
          errorMessage = text;
        }
      }
    }
    throw new Error(errorMessage);
  }

  return response.data;
};
```

### 6.2 API 方法修改示例

```typescript
// 修改前
download: async (id: string): Promise<Blob> => {
  const baseURL = (apiClient.doc as any).defaults?.baseURL || config.services.doc;
  const client = createBaseAxiosClient(baseURL);
  const response = await client.get(`/api/v1/files/${id}/download`, {
    responseType: "blob",
  });
  return response.data;
}

// 修改后
download: async (id: string): Promise<Blob> => {
  const baseURL = (apiClient.doc as any).defaults?.baseURL || config.services.doc;
  return downloadBlob(baseURL, `/api/v1/files/${id}/download`);
}
```

### 6.3 Hooks 修改示例

```typescript
// 修改前
const response = await crmFinanceApi.exportSalesInvoices(params);
const blob = response.data as Blob;

// 修改后
const blob = await crmFinanceApi.exportSalesInvoices(params);
```

---

## 7. 测试验证

### 7.1 测试用例

| 测试场景 | 预期结果 | 状态 |
|----------|----------|------|
| 正常下载文件 | 返回正确的 Blob 文件 | ✅ |
| 未授权下载 | 抛出 "未授权" 错误 | ✅ |
| 权限不足下载 | 抛出 "无权限" 错误 | ✅ |
| 文件不存在 | 抛出 "文件不存在" 错误 | ✅ |

### 7.2 测试步骤

1. **正常下载测试**：
   - 登录系统
   - 上传一个 DOCX 文件
   - 预览该文件
   - 预期：文档正常预览

2. **未授权测试**：
   - 清除 localStorage 中的 token
   - 尝试预览文档
   - 预期：显示未授权错误提示

3. **权限不足测试**：
   - 登录普通用户账号
   - 尝试预览其他用户的私有文档
   - 预期：显示无权限错误提示

---

## 8. 影响评估

### 8.1 正面影响

| 影响 | 说明 |
|------|------|
| **错误处理统一** | 所有 Blob 下载使用统一的错误处理逻辑 |
| **用户体验提升** | 认证过期时用户能看到明确的错误提示 |
| **代码可维护性** | 错误处理逻辑集中在一个函数中 |

### 8.2 潜在风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 调用方式变更 | 高 | 编译错误 | 更新所有调用点 |
| 类型不匹配 | 中 | 运行时错误 | TypeScript 编译检查 |
| 性能影响 | 低 | 轻微 | 额外的状态检查 |

---

## 9. 相关文档

| 文档 | 路径 |
|------|------|
| API 接口文档 | `docs/api/API_OVERVIEW.md` |
| 前端优化标准 | `docs/FRONTEND_OPTIMIZATION_STANDARD.md` |
| 错误处理指南 | `docs/error-handling-guide.md` |

---

**文档版本**: v1.0  
**最后更新**: 2026-06-13  
**文档位置**: `docs/BLOB_DOWNLOAD_AUTH_FIX.md`