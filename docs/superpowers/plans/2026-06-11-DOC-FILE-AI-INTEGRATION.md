# DOC-File-AI 整合实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标:** 整合 DOC、AI 和 File 服务，建立统一的文件存储和向量化处理流程

**架构:**
- File 服务作为统一文件存储层，DOC 和 AI 通过 API 调用
- 上传采用直接流模式，DOC 转发文件到 File 服务
- 向量化采用 HTTP 回调模式，由业务服务触发

**技术栈:** Rust (Axum), PostgreSQL, Redis, Ollama

---

## 阶段 1: File 服务完善

### Task 1: 添加流式上传支持

**Files:**
- Modify: `svc/file/src/api/handlers.rs`
- Modify: `svc/file/src/services/file_service.rs`

- [ ] **Step 1: 修改 File 服务上传 API 支持流式处理**

在 `handlers.rs` 中修改 `upload_file` 函数，实现边收边传的流式处理：

```rust
// 修改上传函数，支持流式处理大文件
pub async fn upload_file(
    State(state): State<AppState>,
    mut multipart: axum::extract::Multipart,
) -> impl IntoResponse {
    // ... 解析字段 ...
    // 使用 stream_upload 替代一次性接收
}
```

- [ ] **Step 2: 修改 File 服务支持业务方传入的 ID**

添加可选的 `external_id` 参数，允许业务服务指定文件 ID：

```rust
// 在 models/file.rs 添加
pub struct UploadFileRequest {
    pub external_id: Option<Uuid>,  // 业务方传入的 ID
    pub category: Option<String>,
    pub visibility: Option<String>,
}
```

- [ ] **Step 3: 运行编译验证**

```bash
cd svc/file && cargo build
```

---

### Task 2: 添加 File 服务客户端库

**Files:**
- Create: `lib/src/file_client.rs`

- [ ] **Step 1: 创建 File 服务 HTTP 客户端**

```rust
use reqwest::Client;
use serde::{Deserialize, Serialize};

pub struct FileServiceClient {
    base_url: String,
    client: Client,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UploadResponse {
    pub file_id: Uuid,
    pub storage_path: String,
    pub filename: String,
    pub file_size: i64,
    pub content_type: String,
    pub vector_status: String,
}

impl FileServiceClient {
    pub fn new(base_url: &str) -> Self {
        Self {
            base_url: base_url.to_string(),
            client: Client::new(),
        }
    }

    pub async fn upload_file(
        &self,
        filename: &str,
        content: Vec<u8>,
        content_type: &str,
    ) -> Result<UploadResponse, reqwest::Error> {
        let form = reqwest::multipart::Form::new()
            .part("file", reqwest::multipart::Part::bytes(content)
                .file_name(filename.to_string())
                .mime_str(content_type)?);

        self.client
            .post(format!("{}/api/v1/files/upload", self.base_url))
            .multipart(form)
            .send()
            .await?
            .json::<ApiResponse<UploadResponse>>()
            .await
            .map(|r| r.data.unwrap())
    }
}
```

- [ ] **Step 2: 添加 reqwest 依赖到 lib/Cargo.toml**

```toml
reqwest = { version = "0.12", features = ["json", "multipart"] }
```

- [ ] **Step 3: 编译验证**

```bash
cd lib && cargo build
```

---

## 阶段 2: DOC 服务集成 File 服务

### Task 3: DOC 服务调用 File 服务上传

**Files:**
- Modify: `svc/doc/src/api/document.rs:14-94` - 修改 upload 函数
- Modify: `svc/doc/src/services/storage_service.rs` - 添加 File 服务调用

- [ ] **Step 1: 添加 File 服务客户端到 DOC 服务**

在 `svc/doc/Cargo.toml` 添加依赖：
```toml
file-service = { path = "../../lib" }
reqwest = { version = "0.12", features = ["json", "multipart"] }
```

- [ ] **Step 2: 创建 File 服务客户端实例**

在 `svc/doc/src/services/storage_service.rs` 添加：

```rust
use file_service::FileServiceClient;

pub struct DocStorageService {
    file_client: FileServiceClient,
}

impl DocStorageService {
    pub fn new(file_service_url: &str) -> Self {
        Self {
            file_client: FileServiceClient::new(file_service_url),
        }
    }

    pub async fn upload_to_file_service(
        &self,
        filename: &str,
        data: Vec<u8>,
        content_type: &str,
    ) -> Result<file_service::UploadResponse, Box<dyn std::error::Error>> {
        Ok(self.file_client.upload_file(filename, data, content_type).await?)
    }
}
```

- [ ] **Step 3: 修改 DOC 上传 API 转发到 File 服务**

修改 `svc/doc/src/api/document.rs` 的 `upload` 函数：

```rust
pub async fn upload(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Json<ApiResponse<UploadDocumentResponse>> {
    // 解析文件
    let mut filename = String::new();
    let mut file_data: Option<Vec<u8>> = None;
    let mut mime_type = "application/octet-stream".to_string();

    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let name = field.name().unwrap_or_default();
        match name {
            "file" => {
                filename = field.file_name().unwrap_or_default().to_string();
                file_data = Some(field.bytes().await.unwrap_or_default().to_vec());
            }
            "title" => { /* 处理 title */ }
            _ => {}
        }
    }

    let data = match file_data {
        Some(d) => d,
        None => return Json(ApiResponse::error(400, "未提供文件")),
    };

    // 调用 File 服务上传
    match state.doc_storage.upload_to_file_service(&filename, data, &mime_type).await {
        Ok(response) => {
            // 保存 document 记录，关联 file_id
            let doc_id = state.document_service.create_document(
                filename.clone(),
                response.file_id,
                response.storage_path,
            ).await?;

            Ok(Json(ApiResponse::success(
                UploadDocumentResponse {
                    document_id: doc_id,
                    file_id: response.file_id,
                    message: format!("文档 '{}' 上传成功", filename),
                },
                "Success",
            )))
        }
        Err(e) => {
            Json(ApiResponse::error(500, &format!("上传失败: {}", e)))
        }
    }
}
```

- [ ] **Step 4: 编译验证**

```bash
cd svc/doc && cargo build
```

---

## 阶段 3: AI 服务集成 File 服务

### Task 4: AI 服务调用 File 服务获取文件

**Files:**
- Modify: `svc/ai/src/api/document.rs`
- Modify: `svc/ai/src/services/document.rs`

- [ ] **Step 1: 添加 File 服务客户端到 AI 服务**

在 `svc/ai/Cargo.toml` 添加依赖：
```toml
file-service = { path = "../../lib" }
```

- [ ] **Step 2: 创建 File 服务客户端**

在 `svc/ai/src/services/` 添加 `file_client.rs`：

```rust
use file_service::FileServiceClient;

pub struct AiFileClient {
    file_client: FileServiceClient,
}

impl AiFileClient {
    pub fn new(file_service_url: &str) -> Self {
        Self {
            file_client: FileServiceClient::new(file_service_url),
        }
    }

    pub async fn download_file(&self, file_id: Uuid) -> Result<Vec<u8>, reqwest::Error> {
        let url = format!("{}/api/v1/files/{}/download", self.file_client.base_url, file_id);
        let response = self.file_client.client.get(&url).send().await?;
        Ok(response.bytes().await?.to_vec())
    }

    pub async fn get_file_metadata(&self, file_id: Uuid) -> Result<file_service::FileMetadata, reqwest::Error> {
        let url = format!("{}/api/v1/files/{}", self.file_client.base_url, file_id);
        let response = self.file_client.client.get(&url).send().await?;
        let api_response: file_service::ApiResponse<file_service::FileMetadata> = response.json().await?;
        Ok(api_response.data.unwrap())
    }
}
```

- [ ] **Step 3: 修改 AI 向量化流程使用 File 服务**

修改 `svc/ai/src/services/document.rs`：

```rust
impl DocumentService {
    pub async fn vectorize_from_file_service(&self, file_id: Uuid) -> Result<VectorizeResult, Box<dyn Error>> {
        // 1. 从 File 服务获取文件
        let file_metadata = self.file_client.get_file_metadata(file_id).await?;
        let file_data = self.file_client.download_file(file_id).await?;

        // 2. 提取文本
        let text = self.extract_text(&file_metadata.filename, &file_data)?;

        // 3. 分块
        let chunks = self.chunk_text(&text);

        // 4. 生成向量
        let vectors = self.generate_embeddings(&chunks).await?;

        // 5. 存储向量到 Redis
        self.store_vectors(file_id, &chunks, &vectors).await?;

        Ok(VectorizeResult {
            file_id,
            chunks_count: chunks.len(),
            vectors_count: vectors.len(),
        })
    }
}
```

- [ ] **Step 4: 编译验证**

```bash
cd svc/ai && cargo build
```

---

## 阶段 4: 启动脚本更新

### Task 5: 更新 start-local.sh 启动 File 服务

**Files:**
- Modify: `scripts/start-local.sh`

- [ ] **Step 1: 添加 File 服务到启动脚本**

在启动服务部分添加：

```bash
# 启动 File 服务 (8050)
if lsof -ti :8050 > /dev/null 2>&1; then
    echo "File 服务已在运行 (端口 8050)"
else
    echo "启动 File 服务 (8050)..."
    cd "$TOPEMS_ROOT/svc/file"
    DATABASE_URL="$DATABASE_URL" \
    STORAGE_LOCAL_PATH="./storage/files" \
    FILE_PORT=8050 \
    RUST_LOG=info \
    cargo run --quiet &
    sleep 3
fi
```

- [ ] **Step 2: 添加 File 服务健康检查**

在健康检查部分添加：

```bash
# 检查 File 服务
check_service "File" 8050 "http://localhost:8050/health"
```

- [ ] **Step 3: 验证启动脚本**

```bash
cd <项目目录> && ./scripts/topems.sh status
```

---

## 阶段 5: 数据库迁移

### Task 6: 创建 File 服务数据库迁移

**Files:**
- Create: `svc/file/migrations/20260611000001_create_storage_schema.sql` (已存在)
- Create: `svc/doc/migrations/xxxx_add_file_reference.sql`

- [ ] **Step 1: 在 DOC 数据库添加 file_id 字段**

创建迁移脚本添加 file_id 到文档表：

```sql
-- 为文档表添加文件引用
ALTER TABLE documents ADD COLUMN file_id UUID;
ALTER TABLE documents ADD COLUMN storage_path VARCHAR(1000);

CREATE INDEX idx_documents_file_id ON documents(file_id);
```

- [ ] **Step 2: 执行迁移**

```bash
cd <项目目录>
psql "$DATABASE_URL" -f svc/doc/migrations/xxxx_add_file_reference.sql
```

---

## 验证清单

- [ ] File 服务编译通过
- [ ] DOC 服务编译通过
- [ ] AI 服务编译通过
- [ ] start-local.sh 成功启动 File 服务
- [ ] File 服务健康检查通过
- [ ] DOC 上传文件到 File 服务成功
- [ ] AI 从 File 服务获取文件成功

---

## 执行选项

**1. Subagent-Driven (recommended)** - 每个 Task 由独立 subagent 执行，快速迭代

**2. Inline Execution** - 在当前会话分批执行，带检查点

**选择哪种方式？**
