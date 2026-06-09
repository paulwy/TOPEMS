import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  generateServiceMigration,
  generateIndexMigration,
} from '../src/generator';
import { getServiceByName } from '../src/services';

const outDir = path.join(__dirname, '..', '.test-ai-temp');

beforeAll(() => {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
});

afterAll(() => {
  try {
    fs.rmSync(outDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe('AI 服务 - pgvector 支持 (schema)', () => {
  it('AI 服务存在于服务注册表中', () => {
    const ai = getServiceByName('ai');
    expect(ai).toBeDefined();
    expect(ai!.schema).toBe('ai');

    const chunksTable = ai!.tables.find((t) => t.name === 'document_chunks');
    expect(chunksTable).toBeDefined();
    expect(chunksTable!.fields.some((f) => f.name === 'embedding' && f.type === 'VECTOR')).toBe(true);
    expect(chunksTable!.fields.some((f) => f.name === 'embedding_model')).toBe(true);
    expect(chunksTable!.fields.some((f) => f.name === 'vector_dimensions')).toBe(true);
    expect(chunksTable!.fields.some((f) => f.name === 'token_count')).toBe(true);
    expect(chunksTable!.fields.some((f) => f.name === 'chunk_index')).toBe(true);
    expect(chunksTable!.fields.some((f) => f.name === 'content_hash')).toBe(true);
  });

  it('generateServiceMigration 输出 vector(1536) 类型及 embedding_model 等字段', () => {
    const ai = getServiceByName('ai')!;
    const filename = generateServiceMigration(ai, outDir);
    expect(filename).toBeTruthy();

    const content = fs.readFileSync(path.join(outDir, filename!), 'utf8');

    // 基本结构
    expect(content).toContain('BEGIN;');
    expect(content).toContain('COMMIT;');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS');

    // pgvector 扩展
    expect(content).toContain('CREATE EXTENSION IF NOT EXISTS vector');

    // 向量列类型
    expect(content).toMatch(/embedding\s+vector\(1536\)/);
    expect(content).toContain('embedding_model');
    expect(content).toContain('vector_dimensions');
    expect(content).toContain('token_count');
    expect(content).toContain('chunk_index');
    expect(content).toContain('content_hash');

    // 向量列不为空，没有 DEFAULT 1536（避免把维度当成默认值）
    expect(content).not.toMatch(/embedding.*DEFAULT 1536/);
    // NOT NULL 对于 embedding
    expect(content).toMatch(/embedding\s+vector\(1536\) NOT NULL/);

    // 复合索引 (document_id, chunk_index)
    expect(content).toMatch(/\(document_id,\s*chunk_index\)/);

    // 外键约束（document_id -> ai.documents）
    expect(content).toContain('FOREIGN KEY (document_id) REFERENCES ai.documents(id)');
    expect(content).toContain('ON DELETE CASCADE');
  });
});

describe('AI 服务 - pgvector 支持 (indexes)', () => {
  it('generateIndexMigration 输出 HNSW 向量索引和 CREATE EXTENSION', () => {
    const ai = getServiceByName('ai')!;
    const filename = generateIndexMigration(ai, outDir);
    expect(filename).toBeTruthy();

    const content = fs.readFileSync(path.join(outDir, filename!), 'utf8');

    expect(content).toContain('BEGIN;');
    expect(content).toContain('COMMIT;');
    expect(content).toContain('CREATE EXTENSION IF NOT EXISTS vector');

    // HNSW 索引
    expect(content).toContain('USING hnsw');
    expect(content).toContain('idx_ai_document_chunks_embedding');
    expect(content).toContain('vector_cosine_ops');

    // 复合索引 (document_id, chunk_index)
    expect(content).toMatch(/\(document_id,\s*chunk_index\)/);
  });
});
