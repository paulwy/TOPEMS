-- schema_defense 服务级补列批次 [ai]
-- 来源：服务自建 DDL（svc/*/src + lib/*/src）与门禁同口径提取；迁移权威缺列补齐
-- 幂等：ALTER TABLE ADD COLUMN IF NOT EXISTS；仅补列与类型（created_at/updated_at 保留 DEFAULT CURRENT_TIMESTAMP），
-- 不含 NOT NULL 等约束（已有行安全，约束治理另行评估）；目标 schema 取自本地库 information_schema

-- ai.ai_training_samples: +11 列
ALTER TABLE IF EXISTS "ai"."ai_training_samples" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE IF EXISTS "ai"."ai_training_samples" ADD COLUMN IF NOT EXISTS "features_json" JSONB;
ALTER TABLE IF EXISTS "ai"."ai_training_samples" ADD COLUMN IF NOT EXISTS "is_used" BOOLEAN;
ALTER TABLE IF EXISTS "ai"."ai_training_samples" ADD COLUMN IF NOT EXISTS "label" TEXT;
ALTER TABLE IF EXISTS "ai"."ai_training_samples" ADD COLUMN IF NOT EXISTS "model_type" VARCHAR(100);
ALTER TABLE IF EXISTS "ai"."ai_training_samples" ADD COLUMN IF NOT EXISTS "quality_score" DOUBLE PRECISION;
ALTER TABLE IF EXISTS "ai"."ai_training_samples" ADD COLUMN IF NOT EXISTS "sample_type" VARCHAR(100);
ALTER TABLE IF EXISTS "ai"."ai_training_samples" ADD COLUMN IF NOT EXISTS "source_id" VARCHAR(255);
ALTER TABLE IF EXISTS "ai"."ai_training_samples" ADD COLUMN IF NOT EXISTS "source_type" VARCHAR(100);
ALTER TABLE IF EXISTS "ai"."ai_training_samples" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "ai"."ai_training_samples" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- ai.analysis_results: +6 列
ALTER TABLE IF EXISTS "ai"."analysis_results" ADD COLUMN IF NOT EXISTS "analysis_type" VARCHAR(50);
ALTER TABLE IF EXISTS "ai"."analysis_results" ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION;
ALTER TABLE IF EXISTS "ai"."analysis_results" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE IF EXISTS "ai"."analysis_results" ADD COLUMN IF NOT EXISTS "input_text" TEXT;
ALTER TABLE IF EXISTS "ai"."analysis_results" ADD COLUMN IF NOT EXISTS "result" JSONB;
ALTER TABLE IF EXISTS "ai"."analysis_results" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- ai.document_chunks: +14 列
ALTER TABLE IF EXISTS "ai"."document_chunks" ADD COLUMN IF NOT EXISTS "chunk_index" INTEGER;
ALTER TABLE IF EXISTS "ai"."document_chunks" ADD COLUMN IF NOT EXISTS "content" TEXT;
ALTER TABLE IF EXISTS "ai"."document_chunks" ADD COLUMN IF NOT EXISTS "content_hash" VARCHAR(64);
ALTER TABLE IF EXISTS "ai"."document_chunks" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE IF EXISTS "ai"."document_chunks" ADD COLUMN IF NOT EXISTS "created_by" UUID;
ALTER TABLE IF EXISTS "ai"."document_chunks" ADD COLUMN IF NOT EXISTS "document_id" UUID;
ALTER TABLE IF EXISTS "ai"."document_chunks" ADD COLUMN IF NOT EXISTS "embedding" JSONB;
ALTER TABLE IF EXISTS "ai"."document_chunks" ADD COLUMN IF NOT EXISTS "embedding_model" VARCHAR(255);
ALTER TABLE IF EXISTS "ai"."document_chunks" ADD COLUMN IF NOT EXISTS "embedding_status" VARCHAR(50);
ALTER TABLE IF EXISTS "ai"."document_chunks" ADD COLUMN IF NOT EXISTS "knowledge_base_id" UUID;
ALTER TABLE IF EXISTS "ai"."document_chunks" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE IF EXISTS "ai"."document_chunks" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "ai"."document_chunks" ADD COLUMN IF NOT EXISTS "token_count" INTEGER;
ALTER TABLE IF EXISTS "ai"."document_chunks" ADD COLUMN IF NOT EXISTS "vector_dimensions" INTEGER;

-- ai.documents: +7 列
ALTER TABLE IF EXISTS "ai"."documents" ADD COLUMN IF NOT EXISTS "chunk_count" INTEGER;
ALTER TABLE IF EXISTS "ai"."documents" ADD COLUMN IF NOT EXISTS "content_hash" VARCHAR(64);
ALTER TABLE IF EXISTS "ai"."documents" ADD COLUMN IF NOT EXISTS "error_message" TEXT;
ALTER TABLE IF EXISTS "ai"."documents" ADD COLUMN IF NOT EXISTS "knowledge_base_id" UUID;
ALTER TABLE IF EXISTS "ai"."documents" ADD COLUMN IF NOT EXISTS "mime_type" VARCHAR(100);
ALTER TABLE IF EXISTS "ai"."documents" ADD COLUMN IF NOT EXISTS "processed_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS "ai"."documents" ADD COLUMN IF NOT EXISTS "tags" TEXT[];

-- ai.qa_history: +8 列
ALTER TABLE IF EXISTS "ai"."qa_history" ADD COLUMN IF NOT EXISTS "answer" TEXT;
ALTER TABLE IF EXISTS "ai"."qa_history" ADD COLUMN IF NOT EXISTS "context" JSONB;
ALTER TABLE IF EXISTS "ai"."qa_history" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE IF EXISTS "ai"."qa_history" ADD COLUMN IF NOT EXISTS "feedback" TEXT;
ALTER TABLE IF EXISTS "ai"."qa_history" ADD COLUMN IF NOT EXISTS "question" TEXT;
ALTER TABLE IF EXISTS "ai"."qa_history" ADD COLUMN IF NOT EXISTS "rating" INTEGER;
ALTER TABLE IF EXISTS "ai"."qa_history" ADD COLUMN IF NOT EXISTS "sources" JSONB;
ALTER TABLE IF EXISTS "ai"."qa_history" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
