# TOPEMS 数据导入导出功能实现说明

## 概述

本实现为 TOPEMS 系统添加了完整的数据导入导出功能，支持 Excel 和 CSV 格式，包含数据验证、错误报告、进度跟踪等功能。

## 已实现模块

### 后端服务

#### 1. topems-rs (研发管理系统)

**新增端点：**
- `POST /api/v1/import` - 导入项目/试验数据
- `POST /api/v1/export` - 导出项目/试验数据
- `GET /api/v1/import/templates` - 获取导入模板列表
- `GET /api/v1/import/templates/:entity_type` - 下载特定模板
- `GET /api/v1/import/:id/status` - 查看导入状态

**支持实体类型：**
- `projects` - 项目
- `experiments` - 试验记录

#### 2. topems-lims (实验室管理系统)

**新增端点：** (同上架构)

**支持实体类型：**
- `samples` - 样品
- `inspection_records` - 检验记录

#### 3. topems-qms (质量管理系统)
#### 4. topems-ehs (安全管理系统)
#### 5. topems-srm (供应商管理系统)
#### 6. topems-pdm (生产数据管理系统)

## 前端组件

### 导入组件

#### 1. ImportButton.tsx
导入按钮组件，用于触发导入操作。

**用法：**
```tsx
import { ImportButton } from '@/components/import-export';

<ImportButton onImport={handleImport} label="导入项目" />
```

#### 2. ImportModal.tsx
导入弹窗组件，包含文件选择、类型选择、导入模式配置、导入结果展示等功能。

**用法：**
```tsx
import { ImportModal } from '@/components/import-export';

<ImportModal
  isOpen={isOpen}
  onClose={handleClose}
  onImport={handleImport}
  entityTypes={[
    { value: 'projects', label: '项目' },
    { value: 'experiments', label: '试验记录' }
  ]}
/>
```

#### 3. ImportPreview.tsx
导入预览组件，显示待导入数据的预览和验证错误。

**用法：**
```tsx
import { ImportPreview } from '@/components/import-export';

<ImportPreview
  data={previewData}
  errors={validationErrors}
  onConfirm={handleConfirm}
  onCancel={handleCancel}
/>
```

#### 4. ImportProgress.tsx
导入进度组件，实时显示导入进度和结果统计。

**用法：**
```tsx
import { ImportProgress } from '@/components/import-export';

<ImportProgress
  progress={50}
  totalRows={100}
  processedRows={50}
  successRows={48}
  failedRows={2}
  status="processing"
/>
```

### 导出组件

#### 1. ExportDropdown.tsx
导出下拉菜单，快速选择导出格式。

**用法：**
```tsx
import { ExportDropdown } from '@/components/import-export';

<ExportDropdown onExport={handleExport} />
```

#### 2. ExportOptions.tsx
导出选项弹窗，支持选择导出列和格式。

**用法：**
```tsx
import { ExportOptions } from '@/components/import-export';

<ExportOptions
  isOpen={isOpen}
  onClose={handleClose}
  onExport={handleExport}
  availableColumns={[
    { key: 'name', label: '名称' },
    { key: 'status', label: '状态' }
  ]}
/>
```

#### 3. ExportPreview.tsx
导出预览组件，预览导出的数据。

**用法：**
```tsx
import { ExportPreview } from '@/components/import-export';

<ExportPreview
  isOpen={isOpen}
  onClose={handleClose}
  onDownload={handleDownload}
  data={exportData}
  columns={['name', 'status']}
  format="csv"
/>
```

## 数据结构

### ImportRequest
```rust
struct ImportRequest {
    entity_type: String,          // 实体类型 (projects, experiments, etc.)
    file_data: String,            // Base64编码的文件数据
    file_format: String,          // xlsx, csv
    import_mode: String,          // create, update, create_update
    skip_errors: bool,           // 跳过错误继续导入
}
```

### ExportRequest
```rust
struct ExportRequest {
    entity_type: String,          // 实体类型
    filters: Option<HashMap<String, String>>,  // 筛选条件
    columns: Vec<String>,         // 导出列
    file_format: String,          // xlsx, csv
}
```

### ImportResult
```rust
struct ImportResult {
    total_rows: usize,            // 总行数
    success_rows: usize,          // 成功行数
    failed_rows: Vec<ImportRowError>,  // 失败的行及错误详情
    errors: Vec<String>,          // 错误消息列表
}
```

### ImportRowError
```rust
struct ImportRowError {
    row: usize,                   // 行号
    field: String,                // 字段名
    message: String,              // 错误消息
    value: String,                // 错误的值
}
```

## 导入模板

已创建以下导入模板文件（位于 `/templates` 目录）：

1. **RS-Projects-Template.csv** - 研发项目导入模板
2. **RS-Experiments-Template.csv** - 研发试验记录导入模板
3. **LIMS-Samples-Template.csv** - 实验室样品导入模板
4. **QMS-Standards-Template.csv** - 质量标准导入模板
5. **EHS-SafetyChecks-Template.csv** - 安全检查导入模板
6. **SRM-Suppliers-Template.csv** - 供应商导入模板
7. **PDM-Processes-Template.csv** - 生产工艺导入模板

### 模板使用说明

1. 下载对应的模板文件
2. 在 Excel 或文本编辑器中打开
3. 按模板格式填充数据（保留表头）
4. 保存为 CSV 或 XLSX 格式
5. 在系统中上传并导入

## 数据验证规则

### 必填字段验证
- 检查必填字段是否存在且不为空
- 显示缺少必填字段的错误信息

### 字段类型验证
- 字符串字段：检查长度限制
- 枚举字段：验证是否在允许的值范围内
- 数字字段：验证是否为有效数字

### 关联数据验证
- 外键关联：验证引用的数据是否存在
- 唯一性检查：检查字段值是否重复

### 业务规则验证
- 项目名称长度：2-100个字符
- 试验标题长度：2-200个字符
- 试验员姓名长度：最多50个字符

## 功能特性

### 导入功能
✓ 支持 Excel (.xlsx) 和 CSV 格式
✓ 大数据量分批处理
✓ 导入预览和确认
✓ 详细的错误报告和日志
✓ 多种导入模式（仅创建/仅更新/创建或更新）
✓ 跳过错误继续导入选项
✓ 实时导入进度显示

### 导出功能
✓ 支持 Excel (.xlsx) 和 CSV 格式
✓ 自定义导出列选择
✓ 数据筛选和过滤
✓ 导出预览
✓ 文件下载

### 用户界面
✓ 简洁直观的操作界面
✓ 清晰明确的错误提示
✓ 批量操作支持
✓ 操作可追溯性
✓ 实时进度反馈

## 文件清单

### 后端文件
- `services/topems-rs/backend/src/main.rs` - 添加导入导出处理器
- `services/topems-rs/backend/Cargo.toml` - 添加依赖项
- `services/topems-lims/backend/src/main.rs` - 添加导入导出处理器
- `services/topems-lims/backend/Cargo.toml` - 添加依赖项

### 前端文件
- `frontend/src/components/import-export/ImportButton.tsx`
- `frontend/src/components/import-export/ImportModal.tsx`
- `frontend/src/components/import-export/ImportPreview.tsx`
- `frontend/src/components/import-export/ImportProgress.tsx`
- `frontend/src/components/import-export/ExportDropdown.tsx`
- `frontend/src/components/import-export/ExportOptions.tsx`
- `frontend/src/components/import-export/ExportPreview.tsx`
- `frontend/src/components/import-export/index.ts`
- `frontend/src/utils/importExport.ts` - 导入导出工具函数
- `frontend/src/hooks/useImportExport.ts` - 导入导出 Hook

### 模板文件
- `templates/RS-Projects-Template.csv`
- `templates/RS-Experiments-Template.csv`
- `templates/LIMS-Samples-Template.csv`
- `templates/QMS-Standards-Template.csv`
- `templates/EHS-SafetyChecks-Template.csv`
- `templates/SRM-Suppliers-Template.csv`
- `templates/PDM-Processes-Template.csv`

## 依赖项

### Rust 后端
```toml
calamine = "0.26"    # Excel 读取库
csv = "1.3"         # CSV 处理库
futures = "0.3"     # 异步编程
bytes = "1"         # 字节处理
```

### 前端
无需额外依赖，使用标准 React 和 TypeScript。

## 使用示例

### 1. 在页面中使用导入功能

```tsx
import { useState } from 'react';
import { ImportButton, ImportModal } from '@/components/import-export';
import { useImportExport } from '@/hooks/useImportExport';
import { readFileAsBase64, parseFileExtension } from '@/utils/importExport';

const MyPage = () => {
  const [showImportModal, setShowImportModal] = useState(false);
  const { importData } = useImportExport({ apiEndpoint: '/api/v1' });

  const handleImport = async (file: File, entityType: string, importMode: string) => {
    const fileData = await readFileAsBase64(file);
    const fileFormat = parseFileExtension(file.name);

    const response = await fetch('http://localhost:8005/api/v1/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_type: entityType,
        file_data: fileData,
        file_format: fileFormat,
        import_mode: importMode,
        skip_errors: false,
      }),
    });

    const result = await response.json();
    if (result.success) {
      // 刷新数据
      loadData();
    }
  };

  return (
    <div>
      <ImportButton onImport={() => setShowImportModal(true)} />
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        entityTypes={[{ value: 'projects', label: '项目' }]}
      />
    </div>
  );
};
```

### 2. 在页面中使用导出功能

```tsx
import { useState } from 'react';
import { ExportDropdown } from '@/components/import-export';
import { downloadBase64File } from '@/utils/importExport';

const MyPage = () => {
  const handleExport = async (format: string) => {
    const response = await fetch('http://localhost:8005/api/v1/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_type: 'projects',
        file_format: format,
        columns: ['name', 'description', 'status'],
      }),
    });

    const result = await response.json();
    if (result.success) {
      downloadBase64File(result.data, `projects.${format}`);
    }
  };

  return <ExportDropdown onExport={handleExport} />;
};
```

## 注意事项

1. **文件大小限制**：建议单个文件不超过 10MB
2. **数据量限制**：建议单次导入不超过 10,000 条记录
3. **字符编码**：确保文件使用 UTF-8 编码
4. **日期格式**：使用 ISO 8601 格式（YYYY-MM-DD）
5. **必填字段**：导入前确保必填字段已填写
6. **关联数据**：确保引用的数据（如项目）已存在

## 前端 UI 优化（2026-05-29）

### 新增功能
1. **模板下载** - 在导入界面提供标准模板下载
2. **文件预览** - 上传后显示前 5 行数据，便于用户确认内容正确
3. **拖放上传** - 更友好的上传界面
4. **文件大小显示** - 清晰显示文件大小信息
5. **错误提示优化** - 更详细的导入错误反馈

### 优化页面
- [Limspage.tsx](file:///Users/xingzhai/TOPEMS/frontend/src/pages/Limspage.tsx) - LIMS 样品管理页面
- [Rspage.tsx](file:///Users/xingzhai/TOPEMS/frontend/src/pages/Rspage.tsx) - RS 项目管理页面

## 待完成工作

1. ✅ topems-rs 导入导出实现
2. ✅ topems-lims 导入导出实现
3. ✅ 前端导入导出 UI 优化
4. ⏳ topems-qms 导入导出实现
5. ⏳ topems-ehs 导入导出实现
6. ⏳ topems-srm 导入导出实现
7. ⏳ topems-pdm 导入导出实现

## 技术支持

如有问题，请查阅：
- API 文档：`/api/v1/import/templates`
- 验证规则：`docs/VALIDATION_RULES.md`
- 系统文档：`docs/my/README.md`
