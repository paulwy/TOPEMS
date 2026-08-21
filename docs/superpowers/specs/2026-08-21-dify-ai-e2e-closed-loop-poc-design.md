# Dify AI 端到端闭环 POC 设计文档

> **Date:** 2026-08-21
> **Owner:** Agent-Driven + Human Approval
> **承接:** V232 封版（`5c449d014`）。Backlog 主题 1 "Dify AI 端到端闭环"首次提出于 V238，连续提及 ≥15 版。
> **目标:** 最小闭环 POC — 前端 Chat UI → Vite proxy → AI 服务 → Dify → LLM → SSE 流式回传。

---

## 0. 目标摘要

**一句话目标：** Docker Compose 拉起 Dify + Ollama，配置 DIFY_* 环境变量，将 WorkflowOrchestrator 接入 DifyService 作为步骤执行器，端到端验证 `/dify/chat` 流式对话闭环。

### 量化成功标准（3 KPI）

| # | 指标 | 基线 | 阈值 | Actual | Status |
|---|------|:----:|:----:|--------|--------|
| 1 | Dify 实例可达 | 无 Dify 运行 | health endpoint 200 | docker-compose.dify.yml + Ollama 就绪；需 docker compose up 启动 + 配置 DIFY_API_KEY | ✅ 代码完成 |
| 2 | `/dify/chat/stream` SSE 闭环 | 0 端到端测试 | ≥1 集成测试 PASS | 3 个 e2e 测试（health/chat-blocking/chat-stream）；需 DIFY_API_KEY 运行 | ✅ 代码完成 |
| 3 | WorkflowOrchestrator-Dify 联动 | 0 联动 | ≥1 workflow step 调用 Dify | executor="dify" + dify_qa workflow + /api/ai/workflows routes | ✅ 代码完成 |

---

## 1. 现状分析

### 已有代码（全部就绪）

| 层 | 文件 | 状态 |
|----|------|------|
| Backend Service | `svc/ai/src/services/dify.rs` | DifyService 完整：chat/chat_stream/info/parameters/meta/conversations/messages/feedback/stop/health |
| Backend Handlers | `svc/ai/src/handlers/dify_handlers.rs` | 10 个 handler 全部实现 |
| Backend Routes | `svc/ai/src/routes.rs:262-298` | `/dify/*` 路由注册，legacy alias `/api/ai` |
| Backend Env Init | `svc/ai/src/main.rs:130-162` | 读取 DIFY_BASE_URL/DIFY_API_KEY/DIFY_DEFAULT_USER/DIFY_TIMEOUT_SECS |
| Frontend API | `apps/web/src/api/ai/dify.ts` | difyApi 完整：health/info/parameters/meta/conversations/messages/chat/chatStream/feedback/stop |
| Frontend Page | `apps/web/src/pages/ai/DifyChatPage.tsx` | 810 行完整 Chat UI：侧边栏/消息列表/SSE 流式/反馈 |
| Frontend Route | `apps/web/src/modules/ai/config.ts:169` | `/ai/dify-chat` 路由注册，lazy import |
| Vite Proxy | `apps/web/vite.config.ts:105` | `/api/ai` → AI 服务端口 |
| WorkflowOrchestrator | `svc/ai/src/services/agent.rs:789` | 已有 WorkflowOrchestrator + 预定义 workflow |

### 缺口

| # | 缺口 | 影响 |
|---|------|------|
| 1 | `.env`/`.env.example` 无 DIFY_* 变量 | DifyService.is_configured()=false，所有 API 返回 503 |
| 2 | 无运行中的 Dify 实例 | 端到端无法验证 |
| 3 | WorkflowOrchestrator 未接入 DifyService | sub-item ③ 未完成 |
| 4 | 无端到端集成测试 | 无法自动验证闭环 |

---

## 2. 架构设计

```
Frontend (apps/web :5173)
  DifyChatPage -> difyApi.chatStream()
  fetch POST /api/ai/dify/chat/stream (SSE)
       |
       | Vite proxy /api/ai -> :8013
       v
AI Service (svc/ai :8013)
  dify_handlers::chat_stream
  -> DifyService.chat_stream()
  -> reqwest POST {DIFY_BASE_URL}/v1/chat-messages
       |
       v
Docker Compose
  dify (nginx :8180) -> dify-backend -> dify-worker
  ollama (:11434) -- LLM provider (llama3.2 / qwen2.5)

WorkflowOrchestrator 联动
  WorkflowStep { executor: "dify" }
  -> DifyService.chat() (blocking)
  -> step result = answer
```

---

## 3. 工作项详细设计

### 3.1 Docker Compose + 环境变量

**docker-compose.yml 新增 service：**

```yaml
  # Dify - AI 应用开发平台
  dify:
    image: langgenius/dify-web:0.15.1
    ports:
      - "8180:80"
    environment:
      - CONSOLE_API_URL=http://localhost:8180
      - SERVICE_API_URL=http://localhost:8180
    depends_on: [dify-backend, dify-worker, ollama]

  dify-backend:
    image: langgenius/dify-api:0.15.1
    environment:
      - DB_HOST=postgres
      - REDIS_HOST=redis
      - OLLAMA_API_BASE=http://ollama:11434
    depends_on: [postgres, redis]

  dify-worker:
    image: langgenius/dify-api:0.15.1
    command: celery -A celery worker
    environment:
      - DB_HOST=postgres
      - REDIS_HOST=redis

  # Ollama - 本地 LLM 推理
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama-models:/root/.ollama
```

**.env / .env.example 新增：**

```bash
# --- Dify AI Integration ---
# Dify base URL (local self-hosted via docker-compose)
DIFY_BASE_URL=http://localhost:8180
# Dify app API key (generate from Dify console: App -> API Access)
DIFY_API_KEY=
# Default user identifier for Dify API calls
DIFY_DEFAULT_USER=topems-user
# Request timeout in seconds
DIFY_TIMEOUT_SECS=120
```

### 3.2 WorkflowOrchestrator -> DifyService 联动

**设计：** 在 `WorkflowStep` 新增 `executor` 字段，当 `executor="dify"` 时调用 `DifyService.chat()` 作为步骤执行器。

**变更文件：**

1. `svc/ai/src/services/agent.rs` - WorkflowStep 新增 `executor` 字段 + `execute_step()` 方法增加 Dify 分支
2. `svc/ai/src/shared/mod.rs` - AppState 已有 `dify_service`，WorkflowOrchestrator 注入 DifyService

**关键代码设计：**

```rust
// agent.rs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowStep {
    pub id: String,
    pub name: String,
    pub description: String,
    pub agent_type: String,
    pub executor: Option<String>, // "dify" | "agent" | None
    pub inputs: Vec<String>,
    pub outputs: Vec<String>,
    pub retry_count: u32,
    pub timeout_seconds: u64,
}

// WorkflowOrchestrator::execute_step()
async fn execute_step(
    &self,
    step: &WorkflowStep,
    context: &HashMap<String, serde_json::Value>,
) -> Result<StepResult, String> {
    match step.executor.as_deref() {
        Some("dify") => {
            let query = context.get("query")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let req = DifyChatRequest {
                query: query.to_string(),
                user: "workflow-executor".to_string(),
                ..Default::default()
            };
            let resp = self.dify_service.chat(req).await
                .map_err(|e| format!("Dify step failed: {}", e))?;
            Ok(StepResult {
                step_id: step.id.clone(),
                status: "success".to_string(),
                output: serde_json::json!({ "answer": resp.answer }),
                error: None,
                duration_ms: 0,
            })
        }
        _ => {
            // 原有 agent 执行逻辑
            self.agent_service.execute_agent(...).await
        }
    }
}
```

**新增预定义 workflow：** `dify_qa` - 单步 Dify 问答 workflow，用于 POC 验证。

### 3.3 端到端冒烟测试

**文件：** `svc/ai/tests/dify_e2e_test.rs`

**测试场景：**
1. `test_dify_health` - 调用 `/dify/health`，验证 Dify 可达
2. `test_dify_chat_blocking` - 调用 `/dify/chat`，验证 blocking 响应包含 answer
3. `test_dify_chat_stream` - 调用 `/dify/chat/stream`，验证 SSE 流包含 message + message_end 事件

**条件执行：** 测试在 `DIFY_API_KEY` 未设置时自动 skip。

### 3.4 TODO.md 更新

更新 Backlog 主题 1 状态为 "POC 闭环完成"，记录实际值。

---

## 4. 验证清单

| # | 验证项 | 方法 | 通过标准 |
|---|--------|------|----------|
| 1 | Docker Compose 启动 | `docker compose up -d dify dify-backend dify-worker ollama` | 所有容器 healthy |
| 2 | Dify 配置 LLM | 在 Dify Console 配置 Ollama provider + 创建 Chat App | App 创建成功 |
| 3 | AI 服务健康 | `curl localhost:8013/health` | 200 |
| 4 | Dify health endpoint | `curl localhost:8013/api/ai/dify/health` | 200 + status=healthy |
| 5 | Dify chat blocking | `POST /api/ai/dify/chat` | 200 + answer 非空 |
| 6 | Dify chat SSE | `POST /api/ai/dify/chat/stream` | SSE 流含 message + message_end |
| 7 | 前端 Chat 页面 | 浏览器访问 `/ai/dify-chat` | 消息发送+流式回显正常 |
| 8 | WorkflowEngine 联动 | 调用 workflow execute API (dify_qa) | step result output.answer 非空 |
