# TOPEMS 项目同步指南

## 概述
本指南包含将当前工作区的所有修改同步到原项目 `/Users/air/TOPEMS` 所需的所有步骤和文件内容。

## 需要同步的关键文件

### 1. 前端同步 (`platform/topems-doc/frontend`)

#### 1.1 新增/更新的组件文件

##### FilePreview.tsx (新增)
将当前工作区的完整文件内容复制到原项目：
`/Users/air/.trae-cn/worktrees/TOPEMS/analyze-project-z09ZSl/platform/topems-doc/frontend/src/components/FilePreview.tsx`
→ `/Users/air/TOPEMS/platform/topems-doc/frontend/src/components/FilePreview.tsx`

##### FileEditor.tsx (新增)
将当前工作区的完整文件内容复制到原项目：
`/Users/air/.trae-cn/worktrees/TOPEMS/analyze-project-z09ZSl/platform/topems-doc/frontend/src/components/FileEditor.tsx`
→ `/Users/air/TOPEMS/platform/topems-doc/frontend/src/components/FileEditor.tsx`

#### 1.2 更新的 Hooks 文件

##### useFileApi.ts (更新)
关键修改点：
- 确保正确处理 API 响应格式
- 支持 preview 和 extract-text 接口
- 路径保持为 `${API_BASE_URL}/api/v1/files`

将当前工作区的文件复制到原项目。

#### 1.3 更新的页面文件

##### FileListPage.tsx (更新)
需要添加 FilePreview 和 FileEditor 组件的导入和使用。

#### 1.4 vite.config.ts (更新)
确保代理配置正确（如果需要）。

---

### 2. 后端同步 (`platform/topems-doc/backend`)

#### 2.1 main.rs (更新)
**关键修改：添加双路由支持（同时支持 /api 和 /api/v1）**

需要修改路由设置部分，将：
```rust
let app = Router::new()
    .route("/", get(home))
    .route("/health", get(health))
    .route("/api/v1/files", get(list_files))
    .route("/api/v1/files", post(upload_file))
    .route("/api/v1/files/:id", get(get_file))
    .route("/api/v1/files/:id/download", get(download_file))
    .route("/api/v1/files/:id/preview", get(preview_file))
    .route("/api/v1/files/:id", delete(delete_file))
    .with_state(state)
    ...
```

修改为：
```rust
// 创建一个 API 路由嵌套，同时支持 /api 和 /api/v1
let api_routes = Router::new()
    .route("/files", get(list_files))
    .route("/files", post(upload_file))
    .route("/files/:id", get(get_file))
    .route("/files/:id", delete(delete_file))
    .route("/files/:id/download", get(download_file))
    .route("/files/:id/preview", get(preview_file))
    // 新增接口
    .route("/files/:id/preview-pdf", get(preview_convert_to_pdf))
    .route("/files/:id/extract-text", get(extract_text));

let app = Router::new()
    .route("/", get(home))
    .route("/health", get(health))
    .nest("/api", api_routes.clone())
    .nest("/api/v1", api_routes)
    .with_state(state)
    ...
```

#### 2.2 api/handlers/mod.rs (更新/新增)
需要添加以下新的处理函数：

```rust
// 新增：使用 LibreOffice 转换为 PDF 预览
pub async fn preview_convert_to_pdf(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<(HeaderMap, Vec<u8>), StatusCode> {
    // 实现参考当前工作区的文件
    // 如果没有 LibreOffice，则返回原文件
}

// 新增：提取文本内容
pub async fn extract_text(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<String>, StatusCode> {
    // 实现参考当前工作区的文件
}
```

#### 2.3 Cargo.toml (更新)
需要添加依赖：
```toml
tempfile = "3.0"
```

#### 2.4 其他文件 (如果需要)
- `state.rs` - 如果需要分离状态管理
- `services/storage_service.rs` - 如果需要改进存储服务

---

## 同步步骤

### 步骤 1：备份原项目
```bash
cd /Users/air/TOPEMS/platform
cp -r topems-doc topems-doc.backup
```

### 步骤 2：同步前端文件

```bash
# 进入当前工作区
cd /Users/air/.trae-cn/worktrees/TOPEMS/analyze-project-z09ZSl/platform/topems-doc/frontend

# 复制组件文件
cp src/components/FilePreview.tsx /Users/air/TOPEMS/platform/topems-doc/frontend/src/components/
cp src/components/FileEditor.tsx /Users/air/TOPEMS/platform/topems-doc/frontend/src/components/

# 复制 Hooks 文件
cp src/hooks/useFileApi.ts /Users/air/TOPEMS/platform/topems-doc/frontend/src/hooks/

# 复制页面文件（检查是否需要）
cp src/pages/FileListPage.tsx /Users/air/TOPEMS/platform/topems-doc/frontend/src/pages/
```

### 步骤 3：同步后端文件

```bash
cd /Users/air/.trae-cn/worktrees/TOPEMS/analyze-project-z09ZSl/platform/topems-doc/backend

# 复制 main.rs 或手动应用修改
cp src/main.rs /Users/air/TOPEMS/platform/topems-doc/backend/src/main.rs

# 复制 handlers
cp src/api/handlers/mod.rs /Users/air/TOPEMS/platform/topems-doc/backend/src/api/handlers/mod.rs

# 更新 Cargo.toml
# 手动添加 tempfile 依赖
```

### 步骤 4：测试

1. 启动后端：
```bash
cd /Users/air/TOPEMS/platform/topems-doc/backend
cargo run
```

2. 启动前端：
```bash
cd /Users/air/TOPEMS/platform/topems-doc/frontend
npm install
npm run dev
```

3. 访问 http://localhost:5173 测试

---

## 关键功能改进总结

本次同步包含以下重要改进：

### 前端改进
1. ✅ **FilePreview 组件** - 完整的文件预览组件
2. ✅ **FileEditor 组件** - 在线文本编辑功能
3. ✅ **文件类型检测优化** - 优先通过扩展名检测
4. ✅ **PDF 预览降级方案** - 无 LibreOffice 时显示文本内容
5. ✅ **API 请求优化** - 正确设置 responseType: 'text'

### 后端改进
1. ✅ **双路由支持** - 同时支持 /api 和 /api/v1
2. ✅ **PDF 预览接口** - /api/v1/files/:id/preview-pdf
3. ✅ **文本提取接口** - /api/v1/files/:id/extract-text
4. ✅ **示例文件初始化** - 服务启动时自动加载示例

---

## 注意事项

1. **LibreOffice 依赖** - PDF 预览功能需要安装 LibreOffice
   - macOS: `brew install libreoffice`
   - Linux: `sudo apt install libreoffice`

2. **API 兼容性** - 确保原项目的 API 响应格式与前端期望一致

3. **端口配置** - 确保后端在 8001 端口，前端在 5173 端口

4. **数据备份** - 同步前务必备份原项目！
