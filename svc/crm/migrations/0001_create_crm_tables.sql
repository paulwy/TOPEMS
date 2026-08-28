-- CRM 测试数据库迁移脚本
-- 创建 crm.customers 表，匹配 Customer 模型结构

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建 crm schema
CREATE SCHEMA IF NOT EXISTS crm;

-- 创建 public.tenants 表（RLS 测试需要）
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建 crm.customers 表，匹配 Customer 模型
CREATE TABLE IF NOT EXISTS crm.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    customer_type VARCHAR(50) NOT NULL DEFAULT 'enterprise',
    industry VARCHAR(100),
    rating VARCHAR(20) NOT NULL DEFAULT 'C',
    region VARCHAR(100),
    owner_id UUID NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    approval_status VARCHAR(50) NOT NULL DEFAULT 'none',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON crm.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_owner_id ON crm.customers(owner_id);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON crm.customers(deleted_at);
