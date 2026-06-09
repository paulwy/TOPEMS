import * as fs from 'fs';
import * as path from 'path';
import {
  ServiceConfig,
  ForeignKeyConfig,
  CompositeIndexConfig,
  FIELD_TYPES,
} from './services';

let _timestampCounter = 0;
let _timestampLast = '';
function getTimestamp(): string {
  let t = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  if (t === _timestampLast) {
    _timestampCounter += 1;
    const base = parseInt(t, 10);
    t = String(base + _timestampCounter).padStart(14, '0');
  } else {
    _timestampLast = t;
    _timestampCounter = 0;
  }
  return t;
}

function buildForeignKeyConstraint(tableName: string, fk: ForeignKeyConfig, idx: number): string {
  const constraintName =
    fk.constraintName || `fk_${tableName}_${fk.column}_${idx}`;
  const onDelete = fk.onDelete || 'RESTRICT';
  const onUpdate = fk.onUpdate || 'CASCADE';
  return `    CONSTRAINT ${constraintName} FOREIGN KEY (${fk.column}) REFERENCES ${fk.references} ON DELETE ${onDelete} ON UPDATE ${onUpdate}`;
}

function buildCompositeIndex(
  schema: string,
  tableName: string,
  composite: CompositeIndexConfig,
  idx: number,
): string {
  const indexName =
    composite.name || `idx_${tableName}_composite_${idx}`;
  const unique = composite.unique ? 'UNIQUE ' : '';
  const columns = composite.columns.join(', ');
  return `CREATE ${unique}INDEX IF NOT EXISTS ${indexName}
    ON ${schema}.${tableName} (${columns});`;
}

export function generateServiceMigration(
  service: ServiceConfig,
  outputDir: string,
): string | null {
  const timestamp = getTimestamp();
  const filename = `${timestamp}_01_${service.name}_schema.sql`;
  const filepath = path.join(outputDir, filename);

  let sql = `-- ============================================
-- ${service.name.toUpperCase()} 服务数据库迁移
-- 描述: ${service.description}
-- 生成时间: ${new Date().toISOString()}
-- ============================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS ${service.schema};

SET search_path TO ${service.schema}, public;

`;

  // 扩展：pgcrypto (uuid_generate_v4) 及 AI 专属的 pgvector
  const baseExtension = `CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;`;
  sql += `-- 基础扩展 (pgcrypto) - 提供 uuid_generate_v4() 函数
${baseExtension}

`;

  // AI 服务：启用 pgvector 扩展（在 ai schema 中注册 vector 类型 / 操作符）
  if (service.name === 'ai') {
    sql += `-- 向量扩展 (pgvector) - 用于 embedding 字段的向量相似度检索
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA ${service.schema};

`;
  }

  // 生成表结构
  service.tables.forEach((table) => {
    sql += `-- ============================================
-- 表: ${table.name}
-- ${table.description || ''}
-- ============================================
CREATE TABLE IF NOT EXISTS ${service.schema}.${table.name} (
`;

    const fields: string[] = [];
    const indexes: string[] = [];
    const constraints: string[] = [];

    table.fields.forEach((field) => {
      let baseType: string;
      if (field.type === 'VECTOR') {
        const dim = field.default || '1536';
        baseType = `vector(${dim})`;
      } else {
        baseType = FIELD_TYPES[field.type] || field.type;
      }
      let fieldDef = `    ${field.name.padEnd(30)} ${baseType}`;

      if (field.primaryKey) {
        fieldDef += ' PRIMARY KEY';
      }
      if (field.notNull) {
        fieldDef += ' NOT NULL';
      }
      if (field.default !== undefined && field.type !== 'VECTOR') {
        fieldDef += ` DEFAULT ${field.default}`;
      }
      if (field.unique) {
        fieldDef += ' UNIQUE';
      }
      if (field.references) {
        fieldDef += ` REFERENCES ${field.references}`;
      }
      // 注：我们不在字段定义行尾使用 `-- comment`，因为 join(',\n') 后的
      // 分隔逗号会被 `--` 吞进注释里，从而造成 SQL 语法错误。
      // 改用表尾的独立 COMMENT ON COLUMN 语句来记录字段注释。

      fields.push(fieldDef);
    });

    // 记录字段注释（如果有），以独立 SQL 语句输出
    const columnComments: string[] = [];
    table.fields.forEach((field) => {
      if (field.comment) {
        const safeComment = field.comment.replace(/'/g, "''");
        columnComments.push(
          `COMMENT ON COLUMN ${service.schema}.${table.name}.${field.name} IS '${safeComment}';`,
        );
      }
    });

    const explicitNames = new Set(table.fields.map((f) => f.name));
    const autoFields: { name: string; def: string }[] = [
      { name: 'created_at', def: `    ${'created_at'.padEnd(30)} TIMESTAMPTZ DEFAULT NOW()` },
      { name: 'updated_at', def: `    ${'updated_at'.padEnd(30)} TIMESTAMPTZ DEFAULT NOW()` },
      { name: 'created_by', def: `    ${'created_by'.padEnd(30)} UUID` },
      {
        name: 'organization_id',
        def: `    ${'organization_id'.padEnd(30)} UUID DEFAULT CURRENT_SETTING('app.organization_id')::UUID`,
      },
      { name: 'deleted_at', def: `    ${'deleted_at'.padEnd(30)} TIMESTAMPTZ` },
    ];
    for (const af of autoFields) {
      if (!explicitNames.has(af.name)) {
        fields.push(af.def);
        explicitNames.add(af.name);
      }
    }

    // 外键约束（增强版：含 ON DELETE / ON UPDATE 和命名约束）
    table.foreignKeys?.forEach((fk, idx) => {
      constraints.push(buildForeignKeyConstraint(table.name, fk, idx));
    });

    sql += fields.join(',\n');

    if (constraints.length > 0) {
      sql += ',\n' + constraints.join(',\n');
    }

    sql += `\n);\n\n`;

    // 自动更新时间戳触发器
    sql += `-- 自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION ${service.schema}.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_${table.name}_update_timestamp
    ON ${service.schema}.${table.name};

CREATE TRIGGER trigger_${table.name}_update_timestamp
    BEFORE UPDATE ON ${service.schema}.${table.name}
    FOR EACH ROW
    EXECUTE FUNCTION ${service.schema}.update_timestamp();\n\n`;

    // 索引
    indexes.push(`CREATE INDEX IF NOT EXISTS idx_${table.name}_created_at
    ON ${service.schema}.${table.name} (created_at DESC);`);
    indexes.push(`CREATE INDEX IF NOT EXISTS idx_${table.name}_organization_id
    ON ${service.schema}.${table.name} (organization_id);`);
    indexes.push(`CREATE INDEX IF NOT EXISTS idx_${table.name}_deleted_at
    ON ${service.schema}.${table.name} (deleted_at)
    WHERE deleted_at IS NULL;`);

    table.fields
      .filter((f) => f.index)
      .forEach((field) => {
        indexes.push(`CREATE INDEX IF NOT EXISTS idx_${table.name}_${field.name}
    ON ${service.schema}.${table.name} (${field.name});`);
      });

    // 复合索引（由 compositeIndexes 配置驱动）
    if (table.compositeIndexes && table.compositeIndexes.length > 0) {
      table.compositeIndexes.forEach((ci, idx) => {
        indexes.push(buildCompositeIndex(service.schema, table.name, ci, idx));
      });
    }

    sql += indexes.join('\n\n') + '\n\n';

    // 注释
    sql += `COMMENT ON TABLE ${service.schema}.${table.name} IS '${table.description || table.name}';\n`;
    if (columnComments.length > 0) {
      sql += columnComments.join('\n') + '\n';
    }
    sql += '\n';
  });

  // 审计日志表
  sql += `-- ============================================
-- 表: audit_logs (${service.name})
-- ============================================
CREATE TABLE IF NOT EXISTS ${service.schema}.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    organization_id UUID DEFAULT CURRENT_SETTING('app.organization_id')::UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_${service.name}_audit_logs_user_id
    ON ${service.schema}.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_${service.name}_audit_logs_action
    ON ${service.schema}.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_${service.name}_audit_logs_created_at
    ON ${service.schema}.audit_logs (created_at DESC);

COMMENT ON TABLE ${service.schema}.audit_logs IS '审计日志表';

COMMIT;
`;

  try {
    fs.writeFileSync(filepath, sql, 'utf-8');
    return filename;
  } catch (error) {
    console.error(`❌ 生成 ${service.name} 迁移文件失败:`, error);
    return null;
  }
}

export function generateIndexMigration(
  service: ServiceConfig,
  outputDir: string,
): string | null {
  const timestamp = getTimestamp();
  const filename = `${timestamp}_02_${service.name}_indexes.sql`;
  const filepath = path.join(outputDir, filename);

  let sql = `-- ============================================
-- ${service.name.toUpperCase()} 索引优化
-- 生成时间: ${new Date().toISOString()}
-- ============================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS ${service.schema};

SET search_path TO ${service.schema}, public;

`;

  // AI 服务：确保 pgvector 扩展已启用（index 脚本也需要先注册）
  if (service.name === 'ai') {
    sql += `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA ${service.schema};

`;
  }

  service.tables.forEach((table) => {
    // 1. 基于 compositeIndexes 的复合索引
    if (table.compositeIndexes && table.compositeIndexes.length > 0) {
      sql += `-- 复合索引: ${table.name}\n`;
      table.compositeIndexes.forEach((ci, idx) => {
        sql += buildCompositeIndex(service.schema, table.name, ci, idx) + '\n';
      });
      sql += '\n';
    } else {
      // 2. 回退策略：当表本身没定义 compositeIndexes 时，根据高频 index 字段自动建议
      const compositeFields = table.fields.filter((f) => f.index);
      if (compositeFields.length >= 2) {
        sql += `-- 复合索引(建议): ${table.name}\n`;
        const fieldNames = compositeFields.slice(0, 3).map((f) => f.name).join(', ');
        sql += `CREATE INDEX IF NOT EXISTS idx_${table.name}_composite
    ON ${service.schema}.${table.name} (${fieldNames});\n\n`;
      }
    }

    // AI 服务的 document_chunks：为 embedding 字段生成 HNSW 余弦相似度索引
    if (
      service.name === 'ai' &&
      table.name === 'document_chunks' &&
      table.fields.some((f) => f.type === 'VECTOR' && f.name === 'embedding')
    ) {
      sql += `-- 向量索引: document_chunks (pgvector HNSW, 余弦相似度)
CREATE INDEX IF NOT EXISTS idx_ai_document_chunks_embedding
    ON ${service.schema}.document_chunks USING hnsw (embedding vector_cosine_ops);

`;
    }

    // 3. 全文搜索索引（searchable 文本字段，支持 TEXT / VARCHAR 等）
    const searchableFields = table.fields.filter((f) => f.searchable);
    if (searchableFields.length > 0) {
      sql += `-- 全文搜索索引: ${table.name}\n`;
      searchableFields.forEach((field) => {
        sql += `CREATE INDEX IF NOT EXISTS idx_${table.name}_${field.name}_search
    ON ${service.schema}.${table.name} USING gin (to_tsvector('simple', ${field.name}));\n`;
      });
      sql += '\n';
    }
  });

  sql += `COMMIT;\n`;

  try {
    fs.writeFileSync(filepath, sql, 'utf-8');
    return filename;
  } catch (error) {
    console.error(`❌ 生成 ${service.name} 索引文件失败:`, error);
    return null;
  }
}

export function generateAuditMigration(
  service: ServiceConfig,
  outputDir: string,
): string | null {
  const timestamp = getTimestamp();
  const filename = `${timestamp}_03_${service.name}_audit.sql`;
  const filepath = path.join(outputDir, filename);

  let sql = `-- ============================================
-- ${service.name.toUpperCase()} 审计触发器
-- 生成时间: ${new Date().toISOString()}
-- ============================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS ${service.schema};

SET search_path TO ${service.schema}, public;

-- 审计日志函数
CREATE OR REPLACE FUNCTION ${service.schema}.audit_log_change()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_action VARCHAR(50);
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_old_data = to_jsonb(OLD);
        v_action = 'DELETE';
    ELSIF (TG_OP = 'UPDATE') THEN
        v_old_data = to_jsonb(OLD);
        v_new_data = to_jsonb(NEW);
        v_action = 'UPDATE';
    ELSIF (TG_OP = 'INSERT') THEN
        v_new_data = to_jsonb(NEW);
        v_action = 'INSERT';
    END IF;

    INSERT INTO ${service.schema}.audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_data,
        new_data,
        ip_address,
        user_agent,
        organization_id
    ) VALUES (
        CURRENT_SETTING('app.user_id')::UUID,
        v_action,
        TG_TABLE_NAME,
        CASE
            WHEN TG_OP = 'DELETE' THEN OLD.id
            ELSE NEW.id
        END,
        v_old_data,
        v_new_data,
        CURRENT_SETTING('app.ip_address', TRUE),
        CURRENT_SETTING('app.user_agent', TRUE),
        CURRENT_SETTING('app.organization_id')::UUID
    );

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

`;

  // 为每个表添加审计触发器
  service.tables.forEach((table) => {
    if (table.name === 'audit_logs') return;

    sql += `-- ${table.name} 审计触发器
DROP TRIGGER IF EXISTS trigger_${table.name}_audit ON ${service.schema}.${table.name};

CREATE TRIGGER trigger_${table.name}_audit
    AFTER INSERT OR UPDATE OR DELETE ON ${service.schema}.${table.name}
    FOR EACH ROW EXECUTE FUNCTION ${service.schema}.audit_log_change();

`;
  });

  sql += `COMMIT;\n`;

  try {
    fs.writeFileSync(filepath, sql, 'utf-8');
    return filename;
  } catch (error) {
    console.error(`❌ 生成 ${service.name} 审计文件失败:`, error);
    return null;
  }
}

export function generateMigration(name: string, sql: string, outputDir: string): string | null {
  const timestamp = getTimestamp();
  const filename = `${timestamp}_${name}.sql`;
  const filepath = path.join(outputDir, filename);

  const wrappedSql = `-- ============================================
-- ${name}
-- 生成时间: ${new Date().toISOString()}
-- ============================================

BEGIN;

${sql}

COMMIT;
`;

  try {
    fs.writeFileSync(filepath, wrappedSql, 'utf-8');
    return filename;
  } catch (error) {
    console.error(`❌ 生成迁移文件失败:`, error);
    return null;
  }
}
