#!/usr/bin/env python3
"""
TOPEMS OpenAPI 聚合脚本

功能：
    读取 /tmp/topems-*-openapi.json（由各服务 `cargo test extract_openapi_spec`
    生成），合并 paths 与 schemas，补充标准类型（Uuid / DateTime / BigDecimal 等），
    输出聚合后的 OpenAPI JSON 供前端类型生成（gen-types.mjs）消费。

用法：
    python3 scripts/openapi/aggregate.py                          # 默认：读 /tmp，输出到 docs/api/openapi-aggregated.json
    python3 scripts/openapi/aggregate.py --input-dir /tmp          # 指定输入目录
    python3 scripts/openapi/aggregate.py --output docs/api/openapi-aggregated.json
    python3 scripts/openapi/aggregate.py --strict                  # 冲突时退出非零

与 generate.sh --extract 的关系：
    `generate.sh --extract` 会先调用 `cargo test extract_openapi_spec` 将各服务
    spec 写到 /tmp，再调用本脚本完成聚合。

冲突处理策略：
    - paths 冲突（同 path + 同 method）：保留先出现的服务，后续服务记 warning
      （除非 --strict，则直接报错退出）
    - schemas 冲突：
        * 若是标准类型（Uuid / DateTime 等），始终用 STANDARD_TYPES 覆盖
        * 否则给后出现的服务加 `<service>_<schema>` 前缀，避免相互覆盖

输出：
    docs/api/openapi-aggregated.json
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sys
from datetime import datetime, timezone

# 标准类型：跨服务共享的基础类型，utoipa 生成的 spec 经常 $ref 引用它们。
# 即使某服务未声明，也由本脚本统一补齐，保证 gen-types.mjs 解析时不会出现悬空引用。
STANDARD_TYPES = {
    "Uuid": {"type": "string", "format": "uuid"},
    "DateTime": {"type": "string", "format": "date-time"},
    "NaiveDateTime": {"type": "string", "format": "date-time"},
    "chrono.NaiveDateTime": {"type": "string", "format": "date-time"},
    "chrono.NaiveDate": {"type": "string", "format": "date"},
    "chrono.NaiveTime": {"type": "string", "format": "time"},
    "Date": {"type": "string", "format": "date"},
    "Decimal": {"type": "number"},
    "BigDecimal": {"type": "number"},
    "JsonValue": {"type": "object", "additionalProperties": True},
    "serde_json::Value": {"type": "object", "additionalProperties": True},
    "HashMap_String_String": {
        "type": "object",
        "additionalProperties": {"type": "string"},
    },
    # 通用响应包装（与 topems_shared::response::ApiResponse 对齐）
    "ApiResponse": {
        "type": "object",
        "properties": {
            "success": {"type": "boolean"},
            "message": {"type": "string"},
            "data": {"type": "object"},
            "code": {"type": "integer"},
        },
    },
    "Uri": {"type": "string", "format": "uri"},
    "Email": {"type": "string", "format": "email"},
    "Hostname": {"type": "string", "format": "hostname"},
    "Ipv4": {"type": "string", "format": "ipv4"},
    "Ipv6": {"type": "string", "format": "ipv6"},
    "Byte": {"type": "string", "format": "byte"},
    "Binary": {"type": "string", "format": "binary"},
    "Base64": {"type": "string", "format": "byte"},
    "UuidSet": {"type": "array", "items": {"type": "string", "format": "uuid"}},
    "StringList": {"type": "array", "items": {"type": "string"}},
    "IntList": {"type": "array", "items": {"type": "integer", "format": "int32"}},
    "LongList": {"type": "array", "items": {"type": "integer", "format": "int64"}},
    "I18nString": {"type": "object", "additionalProperties": {"type": "string"}},
    "Pagination": {"type": "object", "properties": {"page": {"type": "integer"}, "page_size": {"type": "integer"}, "total": {"type": "integer"}}},
    "AuditStamp": {"type": "object", "properties": {"created_at": {"type": "string", "format": "date-time"}, "updated_at": {"type": "string", "format": "date-time"}, "created_by": {"type": "string", "format": "uuid"}, "updated_by": {"type": "string", "format": "uuid"}}},
    "SoftDelete": {"type": "object", "properties": {"deleted_at": {"type": "string", "format": "date-time"}, "deleted_by": {"type": "string", "format": "uuid"}}},
    "User": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "username": {"type": "string"}, "email": {"type": "string", "format": "email"}, "phone": {"type": "string"}, "status": {"type": "string"}, "avatar": {"type": "string", "format": "uri"}}},
    "UserProfile": {"type": "object", "properties": {"user_id": {"type": "string", "format": "uuid"}, "nickname": {"type": "string"}, "gender": {"type": "string"}, "birthday": {"type": "string", "format": "date"}, "bio": {"type": "string"}, "locale": {"type": "string"}, "timezone": {"type": "string"}}},
    "UserRole": {"type": "object", "properties": {"user_id": {"type": "string", "format": "uuid"}, "role_id": {"type": "string", "format": "uuid"}, "assigned_at": {"type": "string", "format": "date-time"}, "assigned_by": {"type": "string", "format": "uuid"}}},
    "UserPermission": {"type": "object", "properties": {"user_id": {"type": "string", "format": "uuid"}, "permission_key": {"type": "string"}, "resource": {"type": "string"}, "action": {"type": "string"}, "granted_at": {"type": "string", "format": "date-time"}}},
    "Role": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "code": {"type": "string"}, "description": {"type": "string"}, "is_system": {"type": "boolean"}, "priority": {"type": "integer", "format": "int32"}}},
    "Permission": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "key": {"type": "string"}, "name": {"type": "string"}, "resource": {"type": "string"}, "action": {"type": "string"}, "module": {"type": "string"}, "description": {"type": "string"}}},
    "Menu": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "parent_id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "path": {"type": "string"}, "icon": {"type": "string"}, "sort": {"type": "integer", "format": "int32"}, "visible": {"type": "boolean"}, "permission_key": {"type": "string"}}},
    "Department": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "parent_id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "code": {"type": "string"}, "leader_id": {"type": "string", "format": "uuid"}, "sort": {"type": "integer", "format": "int32"}, "status": {"type": "string"}}},
    "Organization": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "type": {"type": "string"}, "industry": {"type": "string"}, "scale": {"type": "string"}, "region": {"type": "string"}, "address": {"type": "string"}}},
    "Tenant": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "code": {"type": "string"}, "plan": {"type": "string"}, "status": {"type": "string"}, "expired_at": {"type": "string", "format": "date-time"}, "max_users": {"type": "integer", "format": "int32"}}},
    # V71 A2 补齐：HrmTypes.Company 引用，before MES V71.5 修复
    "Company": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "code": {"type": "string"}, "legal_person": {"type": "string"}, "tax_id": {"type": "string"}, "address": {"type": "string"}, "phone": {"type": "string"}, "email": {"type": "string", "format": "email"}, "industry": {"type": "string"}, "scale": {"type": "string"}, "status": {"type": "string"}, "parent_id": {"type": "string", "format": "uuid"}}},
    # V71 A2 补齐：CommonTypes 通用响应包装（与 topems_shared::response 对齐）
    "SuccessResponse": {"type": "object", "properties": {"success": {"type": "boolean"}, "message": {"type": "string"}, "data": {"type": "object"}, "code": {"type": "integer"}}},
    "ErrorResponse": {"type": "object", "properties": {"success": {"type": "boolean"}, "error": {"type": "object", "properties": {"code": {"type": "string"}, "message": {"type": "string"}, "details": {"type": "object"}}}, "code": {"type": "integer"}}},
    "PaginatedResponse": {"type": "object", "properties": {"success": {"type": "boolean"}, "data": {"type": "array", "items": {"type": "object"}}, "total": {"type": "integer"}, "page": {"type": "integer"}, "page_size": {"type": "integer"}, "total_pages": {"type": "integer"}, "code": {"type": "integer"}}},
    "TenantMember": {"type": "object", "properties": {"tenant_id": {"type": "string", "format": "uuid"}, "user_id": {"type": "string", "format": "uuid"}, "role": {"type": "string"}, "joined_at": {"type": "string", "format": "date-time"}, "invited_by": {"type": "string", "format": "uuid"}}},
    "Product": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "sku": {"type": "string"}, "name": {"type": "string"}, "category_id": {"type": "string", "format": "uuid"}, "brand_id": {"type": "string", "format": "uuid"}, "price": {"type": "number"}, "cost": {"type": "number"}, "stock": {"type": "integer", "format": "int32"}, "unit": {"type": "string"}, "status": {"type": "string"}, "description": {"type": "string"}}},
    "ProductCategory": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "parent_id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "code": {"type": "string"}, "sort": {"type": "integer", "format": "int32"}, "status": {"type": "string"}}},
    "ProductBrand": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "logo": {"type": "string", "format": "uri"}, "website": {"type": "string", "format": "uri"}, "description": {"type": "string"}, "country": {"type": "string"}}},
    "ProductInventory": {"type": "object", "properties": {"product_id": {"type": "string", "format": "uuid"}, "warehouse_id": {"type": "string", "format": "uuid"}, "quantity": {"type": "integer", "format": "int32"}, "reserved": {"type": "integer", "format": "int32"}, "available": {"type": "integer", "format": "int32"}, "safety_stock": {"type": "integer", "format": "int32"}}},
    "Warehouse": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "code": {"type": "string"}, "address": {"type": "string"}, "manager_id": {"type": "string", "format": "uuid"}, "type": {"type": "string"}, "status": {"type": "string"}}},
    "Order": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "no": {"type": "string"}, "customer_id": {"type": "string", "format": "uuid"}, "total_amount": {"type": "number"}, "discount_amount": {"type": "number"}, "paid_amount": {"type": "number"}, "status": {"type": "string"}, "source": {"type": "string"}, "remark": {"type": "string"}, "placed_at": {"type": "string", "format": "date-time"}, "paid_at": {"type": "string", "format": "date-time"}, "shipped_at": {"type": "string", "format": "date-time"}, "completed_at": {"type": "string", "format": "date-time"}}},
    "OrderItem": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "order_id": {"type": "string", "format": "uuid"}, "product_id": {"type": "string", "format": "uuid"}, "sku": {"type": "string"}, "name": {"type": "string"}, "quantity": {"type": "integer", "format": "int32"}, "unit_price": {"type": "number"}, "subtotal": {"type": "number"}, "discount": {"type": "number"}}},
    "Invoice": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "no": {"type": "string"}, "order_id": {"type": "string", "format": "uuid"}, "type": {"type": "string"}, "title": {"type": "string"}, "tax_no": {"type": "string"}, "amount": {"type": "number"}, "tax_amount": {"type": "number"}, "status": {"type": "string"}, "issued_at": {"type": "string", "format": "date-time"}}},
    "Customer": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "type": {"type": "string"}, "level": {"type": "string"}, "industry": {"type": "string"}, "region": {"type": "string"}, "credit_limit": {"type": "number"}, "balance": {"type": "number"}, "status": {"type": "string"}, "source": {"type": "string"}}},
    "CustomerContact": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "customer_id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "position": {"type": "string"}, "phone": {"type": "string"}, "email": {"type": "string", "format": "email"}, "is_primary": {"type": "boolean"}}},
    "CustomerAddress": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "customer_id": {"type": "string", "format": "uuid"}, "province": {"type": "string"}, "city": {"type": "string"}, "district": {"type": "string"}, "detail": {"type": "string"}, "zipcode": {"type": "string"}, "is_default": {"type": "boolean"}}},
    "Supplier": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "code": {"type": "string"}, "type": {"type": "string"}, "industry": {"type": "string"}, "region": {"type": "string"}, "credit_rating": {"type": "string"}, "payment_terms": {"type": "string"}, "status": {"type": "string"}}},
    "SupplierContact": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "supplier_id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "position": {"type": "string"}, "phone": {"type": "string"}, "email": {"type": "string", "format": "email"}, "is_primary": {"type": "boolean"}}},
    "Project": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "code": {"type": "string"}, "type": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}, "priority": {"type": "string"}, "budget": {"type": "number"}, "progress": {"type": "integer", "format": "int32"}, "start_date": {"type": "string", "format": "date"}, "end_date": {"type": "string", "format": "date"}, "description": {"type": "string"}}},
    "ProjectMember": {"type": "object", "properties": {"project_id": {"type": "string", "format": "uuid"}, "user_id": {"type": "string", "format": "uuid"}, "role": {"type": "string"}, "join_date": {"type": "string", "format": "date"}, "allocation": {"type": "integer", "format": "int32"}}},
    "TaskItem": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "project_id": {"type": "string", "format": "uuid"}, "parent_id": {"type": "string", "format": "uuid"}, "title": {"type": "string"}, "description": {"type": "string"}, "assignee_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}, "priority": {"type": "string"}, "story_points": {"type": "integer", "format": "int32"}, "due_date": {"type": "string", "format": "date"}, "started_at": {"type": "string", "format": "date-time"}, "completed_at": {"type": "string", "format": "date-time"}}},
    "Milestone": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "project_id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "target_date": {"type": "string", "format": "date"}, "status": {"type": "string"}, "achieved_at": {"type": "string", "format": "date-time"}, "description": {"type": "string"}}},
    "Ticket": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "no": {"type": "string"}, "title": {"type": "string"}, "type": {"type": "string"}, "priority": {"type": "string"}, "status": {"type": "string"}, "channel": {"type": "string"}, "reporter_id": {"type": "string", "format": "uuid"}, "assignee_id": {"type": "string", "format": "uuid"}, "category": {"type": "string"}, "created_at": {"type": "string", "format": "date-time"}, "updated_at": {"type": "string", "format": "date-time"}}},
    "TicketComment": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "ticket_id": {"type": "string", "format": "uuid"}, "author_id": {"type": "string", "format": "uuid"}, "content": {"type": "string"}, "is_internal": {"type": "boolean"}, "created_at": {"type": "string", "format": "date-time"}}},
    "Attachment": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "original_name": {"type": "string"}, "mime_type": {"type": "string"}, "size_bytes": {"type": "integer", "format": "int64"}, "url": {"type": "string", "format": "uri"}, "storage_key": {"type": "string"}, "bucket": {"type": "string"}, "uploaded_by": {"type": "string", "format": "uuid"}, "uploaded_at": {"type": "string", "format": "date-time"}}},
    "TagItem": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "color": {"type": "string"}, "category": {"type": "string"}, "usage_count": {"type": "integer", "format": "int32"}}},
    "CommentItem": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "resource_type": {"type": "string"}, "resource_id": {"type": "string", "format": "uuid"}, "author_id": {"type": "string", "format": "uuid"}, "content": {"type": "string"}, "reply_to_id": {"type": "string", "format": "uuid"}, "likes": {"type": "integer", "format": "int32"}, "created_at": {"type": "string", "format": "date-time"}}},
    "Notification": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "user_id": {"type": "string", "format": "uuid"}, "type": {"type": "string"}, "title": {"type": "string"}, "content": {"type": "string"}, "read": {"type": "boolean"}, "read_at": {"type": "string", "format": "date-time"}, "resource_type": {"type": "string"}, "resource_id": {"type": "string", "format": "uuid"}, "created_at": {"type": "string", "format": "date-time"}}},
    "Message": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "conversation_id": {"type": "string", "format": "uuid"}, "sender_id": {"type": "string", "format": "uuid"}, "content": {"type": "string"}, "type": {"type": "string"}, "sent_at": {"type": "string", "format": "date-time"}, "delivered_at": {"type": "string", "format": "date-time"}, "read_at": {"type": "string", "format": "date-time"}}},
    "Conversation": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "type": {"type": "string"}, "title": {"type": "string"}, "last_message_id": {"type": "string", "format": "uuid"}, "last_activity_at": {"type": "string", "format": "date-time"}, "member_count": {"type": "integer", "format": "int32"}}},
    "EventLog": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "user_id": {"type": "string", "format": "uuid"}, "action": {"type": "string"}, "resource_type": {"type": "string"}, "resource_id": {"type": "string", "format": "uuid"}, "ip": {"type": "string"}, "user_agent": {"type": "string"}, "created_at": {"type": "string", "format": "date-time"}}},
    "AuditLogEntry": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "operator_id": {"type": "string", "format": "uuid"}, "operator_name": {"type": "string"}, "operation": {"type": "string"}, "target_type": {"type": "string"}, "target_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}, "reason": {"type": "string"}, "created_at": {"type": "string", "format": "date-time"}}},
    "Workflow": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "code": {"type": "string"}, "category": {"type": "string"}, "version": {"type": "integer", "format": "int32"}, "status": {"type": "string"}, "trigger_type": {"type": "string"}, "description": {"type": "string"}, "created_by": {"type": "string", "format": "uuid"}, "published_at": {"type": "string", "format": "date-time"}}},
    "WorkflowInstance": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "workflow_id": {"type": "string", "format": "uuid"}, "workflow_version": {"type": "integer", "format": "int32"}, "business_key": {"type": "string"}, "status": {"type": "string"}, "initiator_id": {"type": "string", "format": "uuid"}, "current_node": {"type": "string"}, "started_at": {"type": "string", "format": "date-time"}, "ended_at": {"type": "string", "format": "date-time"}}},
    "WorkflowTask": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "instance_id": {"type": "string", "format": "uuid"}, "node_key": {"type": "string"}, "node_name": {"type": "string"}, "assignee_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}, "action": {"type": "string"}, "comment": {"type": "string"}, "created_at": {"type": "string", "format": "date-time"}, "completed_at": {"type": "string", "format": "date-time"}}},
    "Form": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "code": {"type": "string"}, "version": {"type": "integer", "format": "int32"}, "category": {"type": "string"}, "status": {"type": "string"}}},
    "FormSubmission": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "form_id": {"type": "string", "format": "uuid"}, "form_version": {"type": "integer", "format": "int32"}, "submitter_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}, "submitted_at": {"type": "string", "format": "date-time"}}},
    "Dashboard": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}, "is_public": {"type": "boolean"}, "category": {"type": "string"}}},
    "ReportItem": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "type": {"type": "string"}, "data_source": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}, "refresh_interval": {"type": "integer", "format": "int32"}, "last_run_at": {"type": "string", "format": "date-time"}}},
    "KpiMetric": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "code": {"type": "string"}, "name": {"type": "string"}, "category": {"type": "string"}, "unit": {"type": "string"}, "target_value": {"type": "number"}, "actual_value": {"type": "number"}, "period": {"type": "string"}, "trend": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}}},
    "CalendarEvent": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "title": {"type": "string"}, "description": {"type": "string"}, "start_at": {"type": "string", "format": "date-time"}, "end_at": {"type": "string", "format": "date-time"}, "is_all_day": {"type": "boolean"}, "location": {"type": "string"}, "organizer_id": {"type": "string", "format": "uuid"}, "visibility": {"type": "string"}, "status": {"type": "string"}}},
    "ResourceBooking": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "resource_type": {"type": "string"}, "resource_id": {"type": "string", "format": "uuid"}, "booker_id": {"type": "string", "format": "uuid"}, "start_at": {"type": "string", "format": "date-time"}, "end_at": {"type": "string", "format": "date-time"}, "status": {"type": "string"}, "purpose": {"type": "string"}, "attendee_count": {"type": "integer", "format": "int32"}}},
    "Article": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "title": {"type": "string"}, "slug": {"type": "string"}, "summary": {"type": "string"}, "content": {"type": "string"}, "cover": {"type": "string", "format": "uri"}, "author_id": {"type": "string", "format": "uuid"}, "category_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}, "views": {"type": "integer", "format": "int64"}, "likes": {"type": "integer", "format": "int32"}, "published_at": {"type": "string", "format": "date-time"}}},
    "ArticleCategory": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "parent_id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "slug": {"type": "string"}, "sort": {"type": "integer", "format": "int32"}, "status": {"type": "string"}}},
    "Survey": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "title": {"type": "string"}, "description": {"type": "string"}, "type": {"type": "string"}, "status": {"type": "string"}, "start_at": {"type": "string", "format": "date-time"}, "end_at": {"type": "string", "format": "date-time"}, "max_responses": {"type": "integer", "format": "int32"}, "response_count": {"type": "integer", "format": "int32"}}},
    "SurveyResponse": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "survey_id": {"type": "string", "format": "uuid"}, "respondent_id": {"type": "string", "format": "uuid"}, "submitted_at": {"type": "string", "format": "date-time"}, "duration_seconds": {"type": "integer", "format": "int32"}}},
    "Sla": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "priority": {"type": "string"}, "response_time_minutes": {"type": "integer", "format": "int32"}, "resolution_time_minutes": {"type": "integer", "format": "int32"}, "warning_threshold_percent": {"type": "integer", "format": "int32"}, "enabled": {"type": "boolean"}}},
    "SlaViolation": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "sla_id": {"type": "string", "format": "uuid"}, "ticket_id": {"type": "string", "format": "uuid"}, "violation_type": {"type": "string"}, "triggered_at": {"type": "string", "format": "date-time"}, "acknowledged": {"type": "boolean"}, "acknowledged_by": {"type": "string", "format": "uuid"}}},
    "Contract": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "no": {"type": "string"}, "title": {"type": "string"}, "type": {"type": "string"}, "party_a": {"type": "string"}, "party_b": {"type": "string"}, "amount": {"type": "number"}, "currency": {"type": "string"}, "start_date": {"type": "string", "format": "date"}, "end_date": {"type": "string", "format": "date"}, "status": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}, "signed_at": {"type": "string", "format": "date-time"}}},
    "ContractClause": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "contract_id": {"type": "string", "format": "uuid"}, "section": {"type": "string"}, "title": {"type": "string"}, "content": {"type": "string"}, "sort": {"type": "integer", "format": "int32"}}},
    "Payment": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "no": {"type": "string"}, "order_id": {"type": "string", "format": "uuid"}, "method": {"type": "string"}, "channel": {"type": "string"}, "amount": {"type": "number"}, "currency": {"type": "string"}, "status": {"type": "string"}, "transaction_no": {"type": "string"}, "paid_at": {"type": "string", "format": "date-time"}, "refunded_at": {"type": "string", "format": "date-time"}}},
    "Refund": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "no": {"type": "string"}, "payment_id": {"type": "string", "format": "uuid"}, "order_id": {"type": "string", "format": "uuid"}, "amount": {"type": "number"}, "reason": {"type": "string"}, "status": {"type": "string"}, "requested_by": {"type": "string", "format": "uuid"}, "approved_by": {"type": "string", "format": "uuid"}, "requested_at": {"type": "string", "format": "date-time"}, "completed_at": {"type": "string", "format": "date-time"}}},
    "Shipment": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "no": {"type": "string"}, "order_id": {"type": "string", "format": "uuid"}, "carrier": {"type": "string"}, "tracking_no": {"type": "string"}, "origin_address": {"type": "string"}, "destination_address": {"type": "string"}, "weight_kg": {"type": "number"}, "volume_m3": {"type": "number"}, "cost": {"type": "number"}, "status": {"type": "string"}, "shipped_at": {"type": "string", "format": "date-time"}, "delivered_at": {"type": "string", "format": "date-time"}}},
    "PurchaseOrder": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "no": {"type": "string"}, "supplier_id": {"type": "string", "format": "uuid"}, "warehouse_id": {"type": "string", "format": "uuid"}, "total_amount": {"type": "number"}, "status": {"type": "string"}, "expected_date": {"type": "string", "format": "date"}, "owner_id": {"type": "string", "format": "uuid"}, "remark": {"type": "string"}, "created_at": {"type": "string", "format": "date-time"}, "approved_at": {"type": "string", "format": "date-time"}}},
    "PurchaseOrderItem": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "order_id": {"type": "string", "format": "uuid"}, "product_id": {"type": "string", "format": "uuid"}, "quantity": {"type": "integer", "format": "int32"}, "unit_price": {"type": "number"}, "subtotal": {"type": "number"}, "received_quantity": {"type": "integer", "format": "int32"}}},
    "GoodsReceipt": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "no": {"type": "string"}, "purchase_order_id": {"type": "string", "format": "uuid"}, "warehouse_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}, "received_by": {"type": "string", "format": "uuid"}, "received_at": {"type": "string", "format": "date-time"}, "remark": {"type": "string"}}},
    "StockTransfer": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "no": {"type": "string"}, "from_warehouse_id": {"type": "string", "format": "uuid"}, "to_warehouse_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}, "created_at": {"type": "string", "format": "date-time"}, "shipped_at": {"type": "string", "format": "date-time"}, "received_at": {"type": "string", "format": "date-time"}}},
    "StockAdjustment": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "no": {"type": "string"}, "warehouse_id": {"type": "string", "format": "uuid"}, "type": {"type": "string"}, "reason": {"type": "string"}, "status": {"type": "string"}, "created_by": {"type": "string", "format": "uuid"}, "approved_by": {"type": "string", "format": "uuid"}, "created_at": {"type": "string", "format": "date-time"}}},
    "WorkOrder": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "no": {"type": "string"}, "product_id": {"type": "string", "format": "uuid"}, "quantity": {"type": "integer", "format": "int32"}, "unit": {"type": "string"}, "priority": {"type": "string"}, "status": {"type": "string"}, "start_date": {"type": "string", "format": "date"}, "end_date": {"type": "string", "format": "date"}, "bom_id": {"type": "string", "format": "uuid"}, "workshop_id": {"type": "string", "format": "uuid"}, "owner_id": {"type": "string", "format": "uuid"}}},
    "BillOfMaterials": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "product_id": {"type": "string", "format": "uuid"}, "version": {"type": "integer", "format": "int32"}, "status": {"type": "string"}, "yield_quantity": {"type": "number"}, "unit": {"type": "string"}, "created_by": {"type": "string", "format": "uuid"}, "approved_by": {"type": "string", "format": "uuid"}}},
    "Routing": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "product_id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "version": {"type": "integer", "format": "int32"}, "status": {"type": "string"}}},
    "Equipment": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "code": {"type": "string"}, "name": {"type": "string"}, "type": {"type": "string"}, "model": {"type": "string"}, "manufacturer": {"type": "string"}, "serial_no": {"type": "string"}, "location": {"type": "string"}, "status": {"type": "string"}, "install_date": {"type": "string", "format": "date"}, "warranty_end": {"type": "string", "format": "date"}}},
    "MaintenancePlan": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "equipment_id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "type": {"type": "string"}, "interval_days": {"type": "integer", "format": "int32"}, "last_done_at": {"type": "string", "format": "date-time"}, "next_due_at": {"type": "string", "format": "date-time"}, "owner_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}}},
    "MaintenanceWorkOrder": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "equipment_id": {"type": "string", "format": "uuid"}, "plan_id": {"type": "string", "format": "uuid"}, "type": {"type": "string"}, "priority": {"type": "string"}, "status": {"type": "string"}, "description": {"type": "string"}, "assignee_id": {"type": "string", "format": "uuid"}, "started_at": {"type": "string", "format": "date-time"}, "completed_at": {"type": "string", "format": "date-time"}, "cost": {"type": "number"}}},
    "QualityInspection": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "no": {"type": "string"}, "type": {"type": "string"}, "source_type": {"type": "string"}, "source_id": {"type": "string", "format": "uuid"}, "inspector_id": {"type": "string", "format": "uuid"}, "standard": {"type": "string"}, "result": {"type": "string"}, "defect_count": {"type": "integer", "format": "int32"}, "sample_size": {"type": "integer", "format": "int32"}, "batch_size": {"type": "integer", "format": "int32"}, "remark": {"type": "string"}, "inspected_at": {"type": "string", "format": "date-time"}}},
    "QualityStandard": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "code": {"type": "string"}, "name": {"type": "string"}, "product_id": {"type": "string", "format": "uuid"}, "version": {"type": "integer", "format": "int32"}, "status": {"type": "string"}, "effective_date": {"type": "string", "format": "date"}}},
    "NonConformance": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "no": {"type": "string"}, "type": {"type": "string"}, "source": {"type": "string"}, "description": {"type": "string"}, "severity": {"type": "string"}, "root_cause": {"type": "string"}, "corrective_action": {"type": "string"}, "preventive_action": {"type": "string"}, "status": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}, "raised_at": {"type": "string", "format": "date-time"}, "closed_at": {"type": "string", "format": "date-time"}}},
    "RiskItem": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "code": {"type": "string"}, "title": {"type": "string"}, "category": {"type": "string"}, "description": {"type": "string"}, "likelihood": {"type": "string"}, "impact": {"type": "string"}, "level": {"type": "string"}, "mitigation": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}, "identified_at": {"type": "string", "format": "date"}}},
    "IncidentRecord": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "no": {"type": "string"}, "title": {"type": "string"}, "type": {"type": "string"}, "severity": {"type": "string"}, "description": {"type": "string"}, "reported_by": {"type": "string", "format": "uuid"}, "handler_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}, "root_cause": {"type": "string"}, "resolution": {"type": "string"}, "reported_at": {"type": "string", "format": "date-time"}, "resolved_at": {"type": "string", "format": "date-time"}}},
    "Document": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "title": {"type": "string"}, "code": {"type": "string"}, "type": {"type": "string"}, "category_id": {"type": "string", "format": "uuid"}, "version": {"type": "integer", "format": "int32"}, "status": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}, "security_level": {"type": "string"}, "published_at": {"type": "string", "format": "date-time"}, "expired_at": {"type": "string", "format": "date-time"}}},
    "DocumentFolder": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "parent_id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "code": {"type": "string"}, "sort": {"type": "integer", "format": "int32"}, "is_public": {"type": "boolean"}, "owner_id": {"type": "string", "format": "uuid"}}},
    "TrainingCourse": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "title": {"type": "string"}, "code": {"type": "string"}, "category": {"type": "string"}, "level": {"type": "string"}, "duration_hours": {"type": "number"}, "description": {"type": "string"}, "objectives": {"type": "string"}, "instructor_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}, "max_participants": {"type": "integer", "format": "int32"}}},
    "TrainingSession": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "course_id": {"type": "string", "format": "uuid"}, "start_at": {"type": "string", "format": "date-time"}, "end_at": {"type": "string", "format": "date-time"}, "location": {"type": "string"}, "mode": {"type": "string"}, "instructor_id": {"type": "string", "format": "uuid"}, "participant_count": {"type": "integer", "format": "int32"}, "status": {"type": "string"}}},
    "LearningRecord": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "user_id": {"type": "string", "format": "uuid"}, "course_id": {"type": "string", "format": "uuid"}, "session_id": {"type": "string", "format": "uuid"}, "progress_percent": {"type": "integer", "format": "int32"}, "score": {"type": "number"}, "status": {"type": "string"}, "certificate_no": {"type": "string"}, "started_at": {"type": "string", "format": "date-time"}, "completed_at": {"type": "string", "format": "date-time"}}},
    "RecruitmentJob": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "title": {"type": "string"}, "code": {"type": "string"}, "department_id": {"type": "string", "format": "uuid"}, "hiring_manager_id": {"type": "string", "format": "uuid"}, "type": {"type": "string"}, "level": {"type": "string"}, "location": {"type": "string"}, "headcount": {"type": "integer", "format": "int32"}, "salary_min": {"type": "number"}, "salary_max": {"type": "number"}, "status": {"type": "string"}, "description": {"type": "string"}, "requirements": {"type": "string"}, "posted_at": {"type": "string", "format": "date-time"}, "closed_at": {"type": "string", "format": "date-time"}}},
    "Candidate": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "job_id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "phone": {"type": "string"}, "email": {"type": "string", "format": "email"}, "gender": {"type": "string"}, "birthday": {"type": "string", "format": "date"}, "education": {"type": "string"}, "years_experience": {"type": "integer", "format": "int32"}, "source": {"type": "string"}, "status": {"type": "string"}, "resume_url": {"type": "string", "format": "uri"}, "applied_at": {"type": "string", "format": "date-time"}}},
    "Interview": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "candidate_id": {"type": "string", "format": "uuid"}, "job_id": {"type": "string", "format": "uuid"}, "round": {"type": "integer", "format": "int32"}, "type": {"type": "string"}, "start_at": {"type": "string", "format": "date-time"}, "end_at": {"type": "string", "format": "date-time"}, "location": {"type": "string"}, "mode": {"type": "string"}, "result": {"type": "string"}, "feedback": {"type": "string"}, "score": {"type": "integer", "format": "int32"}}},
    "Employee": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "emp_no": {"type": "string"}, "user_id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "gender": {"type": "string"}, "birthday": {"type": "string", "format": "date"}, "department_id": {"type": "string", "format": "uuid"}, "position_id": {"type": "string", "format": "uuid"}, "level": {"type": "string"}, "employment_type": {"type": "string"}, "hire_date": {"type": "string", "format": "date"}, "probation_end": {"type": "string", "format": "date"}, "regular_date": {"type": "string", "format": "date"}, "resign_date": {"type": "string", "format": "date"}, "status": {"type": "string"}}},
    "Position": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "code": {"type": "string"}, "name": {"type": "string"}, "department_id": {"type": "string", "format": "uuid"}, "parent_id": {"type": "string", "format": "uuid"}, "level": {"type": "string"}, "job_family": {"type": "string"}, "description": {"type": "string"}, "headcount": {"type": "integer", "format": "int32"}}},
    "AttendanceRecord": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "employee_id": {"type": "string", "format": "uuid"}, "date": {"type": "string", "format": "date"}, "check_in": {"type": "string", "format": "date-time"}, "check_out": {"type": "string", "format": "date-time"}, "work_start": {"type": "string", "format": "date-time"}, "work_end": {"type": "string", "format": "date-time"}, "status": {"type": "string"}, "late_minutes": {"type": "integer", "format": "int32"}, "early_leave_minutes": {"type": "integer", "format": "int32"}, "overtime_minutes": {"type": "integer", "format": "int32"}, "location": {"type": "string"}}},
    "LeaveRequest": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "employee_id": {"type": "string", "format": "uuid"}, "type": {"type": "string"}, "start_date": {"type": "string", "format": "date"}, "end_date": {"type": "string", "format": "date"}, "days": {"type": "number"}, "hours": {"type": "number"}, "reason": {"type": "string"}, "status": {"type": "string"}, "approved_by": {"type": "string", "format": "uuid"}, "created_at": {"type": "string", "format": "date-time"}, "approved_at": {"type": "string", "format": "date-time"}}},
    "Payroll": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "employee_id": {"type": "string", "format": "uuid"}, "period": {"type": "string"}, "base_salary": {"type": "number"}, "bonus": {"type": "number"}, "allowance": {"type": "number"}, "overtime_pay": {"type": "number"}, "deductions": {"type": "number"}, "tax": {"type": "number"}, "social_insurance": {"type": "number"}, "housing_fund": {"type": "number"}, "net_pay": {"type": "number"}, "currency": {"type": "string"}, "status": {"type": "string"}, "paid_at": {"type": "string", "format": "date-time"}}},
    "BenefitPlan": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "code": {"type": "string"}, "name": {"type": "string"}, "type": {"type": "string"}, "coverage": {"type": "string"}, "employee_cost": {"type": "number"}, "company_cost": {"type": "number"}, "currency": {"type": "string"}, "provider": {"type": "string"}, "effective_date": {"type": "string", "format": "date"}, "status": {"type": "string"}}},
    "AssetItem": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "tag": {"type": "string"}, "name": {"type": "string"}, "category": {"type": "string"}, "type": {"type": "string"}, "model": {"type": "string"}, "serial_no": {"type": "string"}, "purchase_date": {"type": "string", "format": "date"}, "purchase_cost": {"type": "number"}, "currency": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}, "location": {"type": "string"}, "status": {"type": "string"}, "warranty_end": {"type": "string", "format": "date"}, "depreciated_value": {"type": "number"}}},
    "AssetLoan": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "asset_id": {"type": "string", "format": "uuid"}, "borrower_id": {"type": "string", "format": "uuid"}, "purpose": {"type": "string"}, "loan_date": {"type": "string", "format": "date"}, "expected_return": {"type": "string", "format": "date"}, "actual_return": {"type": "string", "format": "date"}, "status": {"type": "string"}}},
    "Vendor": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "code": {"type": "string"}, "name": {"type": "string"}, "type": {"type": "string"}, "category": {"type": "string"}, "service_area": {"type": "string"}, "contact_name": {"type": "string"}, "contact_phone": {"type": "string"}, "contact_email": {"type": "string", "format": "email"}, "tax_no": {"type": "string"}, "bank_account": {"type": "string"}, "status": {"type": "string"}, "rating": {"type": "number"}}},
    "ServiceCatalogItem": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "code": {"type": "string"}, "name": {"type": "string"}, "category": {"type": "string"}, "description": {"type": "string"}, "fulfillment_days": {"type": "integer", "format": "int32"}, "price": {"type": "number"}, "currency": {"type": "string"}, "required_approval": {"type": "boolean"}, "sla_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}}},
    "ServiceRequest": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "no": {"type": "string"}, "catalog_item_id": {"type": "string", "format": "uuid"}, "requester_id": {"type": "string", "format": "uuid"}, "assignee_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}, "priority": {"type": "string"}, "created_at": {"type": "string", "format": "date-time"}, "fulfilled_at": {"type": "string", "format": "date-time"}}},
    "Campaign": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "code": {"type": "string"}, "type": {"type": "string"}, "channel": {"type": "string"}, "budget": {"type": "number"}, "currency": {"type": "string"}, "target_audience": {"type": "string"}, "goal": {"type": "string"}, "status": {"type": "string"}, "start_date": {"type": "string", "format": "date"}, "end_date": {"type": "string", "format": "date"}, "owner_id": {"type": "string", "format": "uuid"}, "created_at": {"type": "string", "format": "date-time"}}},
    "Lead": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "company": {"type": "string"}, "title": {"type": "string"}, "phone": {"type": "string"}, "email": {"type": "string", "format": "email"}, "source": {"type": "string"}, "campaign_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}, "score": {"type": "integer", "format": "int32"}, "industry": {"type": "string"}, "size": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}, "created_at": {"type": "string", "format": "date-time"}, "converted_at": {"type": "string", "format": "date-time"}}},
    "Opportunity": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "customer_id": {"type": "string", "format": "uuid"}, "lead_id": {"type": "string", "format": "uuid"}, "amount": {"type": "number"}, "currency": {"type": "string"}, "stage": {"type": "string"}, "probability_percent": {"type": "integer", "format": "int32"}, "expected_close_date": {"type": "string", "format": "date"}, "owner_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}, "source": {"type": "string"}, "campaign_id": {"type": "string", "format": "uuid"}, "created_at": {"type": "string", "format": "date-time"}, "closed_at": {"type": "string", "format": "date-time"}}},
    "AccountCRM": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "type": {"type": "string"}, "industry": {"type": "string"}, "revenue": {"type": "number"}, "employees": {"type": "integer", "format": "int32"}, "region": {"type": "string"}, "address": {"type": "string"}, "website": {"type": "string", "format": "uri"}, "phone": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}, "created_at": {"type": "string", "format": "date-time"}}},
    "ContactCRM": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "account_id": {"type": "string", "format": "uuid"}, "first_name": {"type": "string"}, "last_name": {"type": "string"}, "title": {"type": "string"}, "department": {"type": "string"}, "phone": {"type": "string"}, "mobile": {"type": "string"}, "email": {"type": "string", "format": "email"}, "is_primary": {"type": "boolean"}, "owner_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}, "created_at": {"type": "string", "format": "date-time"}}},
    "CaseRecord": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "no": {"type": "string"}, "subject": {"type": "string"}, "account_id": {"type": "string", "format": "uuid"}, "contact_id": {"type": "string", "format": "uuid"}, "type": {"type": "string"}, "origin": {"type": "string"}, "priority": {"type": "string"}, "status": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}, "description": {"type": "string"}, "resolution": {"type": "string"}, "created_at": {"type": "string", "format": "date-time"}, "closed_at": {"type": "string", "format": "date-time"}}},
    "Forecast": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "period": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}, "currency": {"type": "string"}, "quota": {"type": "number"}, "pipeline_amount": {"type": "number"}, "committed_amount": {"type": "number"}, "best_case": {"type": "number"}, "worst_case": {"type": "number"}, "actual_amount": {"type": "number"}, "status": {"type": "string"}, "submitted_at": {"type": "string", "format": "date-time"}}},
    "Territory": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "code": {"type": "string"}, "region": {"type": "string"}, "country": {"type": "string"}, "parent_id": {"type": "string", "format": "uuid"}, "manager_id": {"type": "string", "format": "uuid"}, "quota": {"type": "number"}, "currency": {"type": "string"}, "status": {"type": "string"}}},
    "InvoiceLine": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "invoice_id": {"type": "string", "format": "uuid"}, "item_type": {"type": "string"}, "description": {"type": "string"}, "quantity": {"type": "number"}, "unit_price": {"type": "number"}, "amount": {"type": "number"}, "tax_rate": {"type": "number"}, "tax_amount": {"type": "number"}, "line_total": {"type": "number"}}},
    "BillPayable": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "no": {"type": "string"}, "supplier_id": {"type": "string", "format": "uuid"}, "type": {"type": "string"}, "issue_date": {"type": "string", "format": "date"}, "due_date": {"type": "string", "format": "date"}, "total_amount": {"type": "number"}, "paid_amount": {"type": "number"}, "balance": {"type": "number"}, "currency": {"type": "string"}, "status": {"type": "string"}, "approval_status": {"type": "string"}, "approved_by": {"type": "string", "format": "uuid"}, "paid_at": {"type": "string", "format": "date-time"}}},
    "ExpenseReport": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "no": {"type": "string"}, "employee_id": {"type": "string", "format": "uuid"}, "purpose": {"type": "string"}, "report_date": {"type": "string", "format": "date"}, "total_amount": {"type": "number"}, "currency": {"type": "string"}, "status": {"type": "string"}, "approval_status": {"type": "string"}, "approved_by": {"type": "string", "format": "uuid"}, "reimbursed_at": {"type": "string", "format": "date-time"}}},
    "ExpenseItem": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "report_id": {"type": "string", "format": "uuid"}, "date": {"type": "string", "format": "date"}, "category": {"type": "string"}, "description": {"type": "string"}, "amount": {"type": "number"}, "currency": {"type": "string"}, "receipt_url": {"type": "string", "format": "uri"}, "project_id": {"type": "string", "format": "uuid"}, "billable": {"type": "boolean"}}},
    "JournalEntry": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "no": {"type": "string"}, "entry_date": {"type": "string", "format": "date"}, "period": {"type": "string"}, "type": {"type": "string"}, "reference_type": {"type": "string"}, "reference_id": {"type": "string", "format": "uuid"}, "total_debit": {"type": "number"}, "total_credit": {"type": "number"}, "currency": {"type": "string"}, "status": {"type": "string"}, "approved_by": {"type": "string", "format": "uuid"}, "posted_at": {"type": "string", "format": "date-time"}}},
    "JournalLine": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "entry_id": {"type": "string", "format": "uuid"}, "account_code": {"type": "string"}, "description": {"type": "string"}, "debit": {"type": "number"}, "credit": {"type": "number"}, "currency": {"type": "string"}, "dimension1": {"type": "string"}, "dimension2": {"type": "string"}, "dimension3": {"type": "string"}}},
    "GlAccount": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "code": {"type": "string"}, "name": {"type": "string"}, "type": {"type": "string"}, "category": {"type": "string"}, "parent_id": {"type": "string", "format": "uuid"}, "currency": {"type": "string"}, "is_contra": {"type": "boolean"}, "is_active": {"type": "boolean"}, "description": {"type": "string"}}},
    "Budget": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "code": {"type": "string"}, "period": {"type": "string"}, "account_code": {"type": "string"}, "department_id": {"type": "string", "format": "uuid"}, "project_id": {"type": "string", "format": "uuid"}, "amount": {"type": "number"}, "currency": {"type": "string"}, "consumed": {"type": "number"}, "committed": {"type": "number"}, "available": {"type": "number"}, "status": {"type": "string"}}},
    "TaxCode": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "code": {"type": "string"}, "name": {"type": "string"}, "type": {"type": "string"}, "rate_percent": {"type": "number"}, "account_code": {"type": "string"}, "effective_date": {"type": "string", "format": "date"}, "expiry_date": {"type": "string", "format": "date"}, "is_active": {"type": "boolean"}}},
    "CurrencyRate": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "from_currency": {"type": "string"}, "to_currency": {"type": "string"}, "rate": {"type": "number"}, "rate_date": {"type": "string", "format": "date"}, "provider": {"type": "string"}, "source": {"type": "string"}}},
    "PeriodFiscal": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "code": {"type": "string"}, "fiscal_year": {"type": "integer", "format": "int32"}, "period_no": {"type": "integer", "format": "int32"}, "start_date": {"type": "string", "format": "date"}, "end_date": {"type": "string", "format": "date"}, "status": {"type": "string"}, "closed_by": {"type": "string", "format": "uuid"}, "closed_at": {"type": "string", "format": "date-time"}}},
    "Reconciliation": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "account_code": {"type": "string"}, "period": {"type": "string"}, "balance_per_books": {"type": "number"}, "balance_per_bank": {"type": "number"}, "difference": {"type": "number"}, "reconciled": {"type": "boolean"}, "reconciled_by": {"type": "string", "format": "uuid"}, "reconciled_at": {"type": "string", "format": "date-time"}}},
    "FixedAssetItem": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "tag": {"type": "string"}, "name": {"type": "string"}, "category": {"type": "string"}, "acquisition_date": {"type": "string", "format": "date"}, "acquisition_cost": {"type": "number"}, "currency": {"type": "string"}, "salvage_value": {"type": "number"}, "useful_life_months": {"type": "integer", "format": "int32"}, "depreciation_method": {"type": "string"}, "accumulated_depreciation": {"type": "number"}, "net_book_value": {"type": "number"}, "location": {"type": "string"}, "custodian_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}}},
    "Subscription": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "customer_id": {"type": "string", "format": "uuid"}, "plan_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}, "quantity": {"type": "integer", "format": "int32"}, "unit_price": {"type": "number"}, "currency": {"type": "string"}, "billing_cycle": {"type": "string"}, "start_date": {"type": "string", "format": "date"}, "end_date": {"type": "string", "format": "date"}, "trial_end": {"type": "string", "format": "date"}, "canceled_at": {"type": "string", "format": "date-time"}, "next_billing": {"type": "string", "format": "date-time"}}},
    "SubscriptionPlan": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "code": {"type": "string"}, "name": {"type": "string"}, "product_id": {"type": "string", "format": "uuid"}, "billing_cycle": {"type": "string"}, "price": {"type": "number"}, "currency": {"type": "string"}, "trial_days": {"type": "integer", "format": "int32"}, "grace_days": {"type": "integer", "format": "int32"}, "proration": {"type": "boolean"}, "status": {"type": "string"}}},
    "Coupon": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "code": {"type": "string"}, "name": {"type": "string"}, "type": {"type": "string"}, "discount_type": {"type": "string"}, "discount_value": {"type": "number"}, "min_order_amount": {"type": "number"}, "max_discount": {"type": "number"}, "currency": {"type": "string"}, "usage_limit": {"type": "integer", "format": "int32"}, "used_count": {"type": "integer", "format": "int32"}, "valid_from": {"type": "string", "format": "date-time"}, "valid_until": {"type": "string", "format": "date-time"}, "status": {"type": "string"}}},
    "Promotion": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "type": {"type": "string"}, "scope": {"type": "string"}, "status": {"type": "string"}, "start_date": {"type": "string", "format": "date-time"}, "end_date": {"type": "string", "format": "date-time"}, "stackable": {"type": "boolean"}}},
    "LoyaltyProgram": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "tier_name": {"type": "string"}, "tier_level": {"type": "integer", "format": "int32"}, "min_points": {"type": "integer", "format": "int32"}, "points_per_currency": {"type": "number"}, "status": {"type": "string"}, "start_date": {"type": "string", "format": "date"}, "end_date": {"type": "string", "format": "date"}}},
    "MemberAccount": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "customer_id": {"type": "string", "format": "uuid"}, "program_id": {"type": "string", "format": "uuid"}, "tier_id": {"type": "string", "format": "uuid"}, "points_balance": {"type": "integer", "format": "int64"}, "points_earned": {"type": "integer", "format": "int64"}, "points_redeemed": {"type": "integer", "format": "int64"}, "points_expiring": {"type": "integer", "format": "int32"}, "join_date": {"type": "string", "format": "date"}, "status": {"type": "string"}}},
    "Gateway": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "code": {"type": "string"}, "name": {"type": "string"}, "type": {"type": "string"}, "provider": {"type": "string"}, "mode": {"type": "string"}, "merchant_id": {"type": "string"}, "fee_percent": {"type": "number"}, "fee_fixed": {"type": "number"}, "status": {"type": "string"}, "is_default": {"type": "boolean"}}},
    "Webhook": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "url": {"type": "string", "format": "uri"}, "secret": {"type": "string"}, "content_type": {"type": "string"}, "auth_type": {"type": "string"}, "auth_token": {"type": "string"}, "status": {"type": "string"}, "created_by": {"type": "string", "format": "uuid"}}},
    "Integration": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "type": {"type": "string"}, "provider": {"type": "string"}, "connection_mode": {"type": "string"}, "status": {"type": "string"}, "last_sync_at": {"type": "string", "format": "date-time"}, "sync_status": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}}},
    "ApiKey": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "key_prefix": {"type": "string"}, "rate_limit_per_min": {"type": "integer", "format": "int32"}, "expires_at": {"type": "string", "format": "date-time"}, "last_used_at": {"type": "string", "format": "date-time"}, "status": {"type": "string"}, "created_by": {"type": "string", "format": "uuid"}, "created_at": {"type": "string", "format": "date-time"}}},
    "OAuthClient": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "client_id": {"type": "string"}, "name": {"type": "string"}, "token_expiry_seconds": {"type": "integer", "format": "int32"}, "refresh_expiry_seconds": {"type": "integer", "format": "int32"}, "is_public": {"type": "boolean"}, "status": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}}},
    "Site": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "domain": {"type": "string"}, "type": {"type": "string"}, "theme": {"type": "string"}, "language": {"type": "string"}, "timezone": {"type": "string"}, "status": {"type": "string"}, "is_default": {"type": "boolean"}, "owner_id": {"type": "string", "format": "uuid"}, "published_at": {"type": "string", "format": "date-time"}}},
    "SitePage": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "site_id": {"type": "string", "format": "uuid"}, "parent_id": {"type": "string", "format": "uuid"}, "title": {"type": "string"}, "slug": {"type": "string"}, "path": {"type": "string"}, "template": {"type": "string"}, "status": {"type": "string"}, "sort": {"type": "integer", "format": "int32"}, "published_at": {"type": "string", "format": "date-time"}}},
    "ContentBlock": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "page_id": {"type": "string", "format": "uuid"}, "type": {"type": "string"}, "name": {"type": "string"}, "content": {"type": "string"}, "sort": {"type": "integer", "format": "int32"}}},
    "NavigationMenu": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "site_id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "location": {"type": "string"}, "status": {"type": "string"}}},
    "Theme": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "code": {"type": "string"}, "name": {"type": "string"}, "version": {"type": "string"}, "author": {"type": "string"}, "screenshot_url": {"type": "string", "format": "uri"}, "preview_url": {"type": "string", "format": "uri"}, "status": {"type": "string"}, "is_published": {"type": "boolean"}, "installed_at": {"type": "string", "format": "date-time"}}},
    "Plugin": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "code": {"type": "string"}, "name": {"type": "string"}, "version": {"type": "string"}, "type": {"type": "string"}, "author": {"type": "string"}, "description": {"type": "string"}, "icon": {"type": "string"}, "status": {"type": "string"}, "installed_at": {"type": "string", "format": "date-time"}, "enabled": {"type": "boolean"}}},
    "Dataset": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "code": {"type": "string"}, "name": {"type": "string"}, "source_type": {"type": "string"}, "refresh_policy": {"type": "string"}, "refresh_interval_min": {"type": "integer", "format": "int32"}, "row_count": {"type": "integer", "format": "int64"}, "size_bytes": {"type": "integer", "format": "int64"}, "last_refresh_at": {"type": "string", "format": "date-time"}, "status": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}}},
    "DataModel": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "dataset_id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "status": {"type": "string"}, "version": {"type": "integer", "format": "int32"}}},
    "Visualization": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "dataset_id": {"type": "string", "format": "uuid"}, "model_id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "type": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}, "created_at": {"type": "string", "format": "date-time"}}},
    "AIModel": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "code": {"type": "string"}, "provider": {"type": "string"}, "base_model": {"type": "string"}, "version": {"type": "string"}, "type": {"type": "string"}, "context_window": {"type": "integer", "format": "int32"}, "max_output_tokens": {"type": "integer", "format": "int32"}, "temperature": {"type": "number"}, "fine_tuned": {"type": "boolean"}, "training_data_ref": {"type": "string"}, "status": {"type": "string"}, "deployed_at": {"type": "string", "format": "date-time"}}},
    "PromptTemplate": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "model_id": {"type": "string", "format": "uuid"}, "category": {"type": "string"}, "template": {"type": "string"}, "version": {"type": "integer", "format": "int32"}, "status": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}}},
    "AIConversation": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "user_id": {"type": "string", "format": "uuid"}, "model_id": {"type": "string", "format": "uuid"}, "title": {"type": "string"}, "system_prompt": {"type": "string"}, "message_count": {"type": "integer", "format": "int32"}, "token_usage_in": {"type": "integer", "format": "int64"}, "token_usage_out": {"type": "integer", "format": "int64"}, "status": {"type": "string"}, "created_at": {"type": "string", "format": "date-time"}, "last_message_at": {"type": "string", "format": "date-time"}}},
    "AIFineTuneJob": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "base_model_id": {"type": "string", "format": "uuid"}, "target_model": {"type": "string"}, "dataset_ref": {"type": "string"}, "status": {"type": "string"}, "progress_percent": {"type": "integer", "format": "int32"}, "estimated_cost": {"type": "number"}, "actual_cost": {"type": "number"}, "started_at": {"type": "string", "format": "date-time"}, "completed_at": {"type": "string", "format": "date-time"}, "owner_id": {"type": "string", "format": "uuid"}}},
    "Space": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "code": {"type": "string"}, "type": {"type": "string"}, "visibility": {"type": "string"}, "description": {"type": "string"}, "avatar": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}, "member_count": {"type": "integer", "format": "int32"}, "status": {"type": "string"}, "created_at": {"type": "string", "format": "date-time"}}},
    "PageDoc": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "space_id": {"type": "string", "format": "uuid"}, "parent_id": {"type": "string", "format": "uuid"}, "title": {"type": "string"}, "slug": {"type": "string"}, "content": {"type": "string"}, "format": {"type": "string"}, "status": {"type": "string"}, "editor_id": {"type": "string", "format": "uuid"}, "sort": {"type": "integer", "format": "int32"}, "views": {"type": "integer", "format": "int64"}, "likes": {"type": "integer", "format": "int32"}, "created_at": {"type": "string", "format": "date-time"}, "updated_at": {"type": "string", "format": "date-time"}}},
    "WikiPageDoc": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "space_id": {"type": "string", "format": "uuid"}, "title": {"type": "string"}, "content": {"type": "string"}, "format": {"type": "string"}, "version": {"type": "integer", "format": "int32"}, "status": {"type": "string"}, "editor_id": {"type": "string", "format": "uuid"}, "published_at": {"type": "string", "format": "date-time"}, "last_modified_at": {"type": "string", "format": "date-time"}}},
    "CodeRepo": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "path": {"type": "string"}, "provider": {"type": "string"}, "url": {"type": "string", "format": "uri"}, "default_branch": {"type": "string"}, "visibility": {"type": "string"}, "language": {"type": "string"}, "size_kb": {"type": "integer", "format": "int64"}, "status": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}, "created_at": {"type": "string", "format": "date-time"}}},
    "BuildPipeline": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "repo_id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "type": {"type": "string"}, "status": {"type": "string"}, "last_run_at": {"type": "string", "format": "date-time"}, "last_run_status": {"type": "string"}}},
    "Deployment": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "pipeline_id": {"type": "string", "format": "uuid"}, "artifact_ref": {"type": "string"}, "environment": {"type": "string"}, "cluster": {"type": "string"}, "namespace": {"type": "string"}, "replicas": {"type": "integer", "format": "int32"}, "status": {"type": "string"}, "deployed_by": {"type": "string", "format": "uuid"}, "started_at": {"type": "string", "format": "date-time"}, "completed_at": {"type": "string", "format": "date-time"}}},
    "Environment": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "code": {"type": "string"}, "cluster": {"type": "string"}, "namespace": {"type": "string"}, "type": {"type": "string"}, "status": {"type": "string"}, "is_protected": {"type": "boolean"}}},
    "FeatureFlag": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "key": {"type": "string"}, "name": {"type": "string"}, "type": {"type": "string"}, "description": {"type": "string"}, "enabled": {"type": "boolean"}, "rollout_percent": {"type": "integer", "format": "int32"}, "owner_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}, "created_at": {"type": "string", "format": "date-time"}}},
    "Experiment": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "flag_id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "hypothesis": {"type": "string"}, "primary_metric": {"type": "string"}, "variant_a_name": {"type": "string"}, "variant_b_name": {"type": "string"}, "traffic_split_percent": {"type": "integer", "format": "int32"}, "status": {"type": "string"}, "start_date": {"type": "string", "format": "date"}, "end_date": {"type": "string", "format": "date"}, "confidence_level": {"type": "number"}}},
    "Cluster": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "provider": {"type": "string"}, "region": {"type": "string"}, "k8s_version": {"type": "string"}, "node_count": {"type": "integer", "format": "int32"}, "total_cpu": {"type": "number"}, "total_memory_gb": {"type": "number"}, "total_storage_tb": {"type": "number"}, "status": {"type": "string"}, "created_at": {"type": "string", "format": "date-time"}}},
    "CloudResource": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "provider": {"type": "string"}, "region": {"type": "string"}, "service": {"type": "string"}, "resource_type": {"type": "string"}, "resource_id": {"type": "string"}, "name": {"type": "string"}, "status": {"type": "string"}, "cost_monthly": {"type": "number"}, "currency": {"type": "string"}, "created_at": {"type": "string", "format": "date-time"}}},
    "HealthCheck": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "target_ref": {"type": "string"}, "type": {"type": "string"}, "endpoint": {"type": "string"}, "interval_seconds": {"type": "integer", "format": "int32"}, "timeout_seconds": {"type": "integer", "format": "int32"}, "threshold_ok": {"type": "integer", "format": "int32"}, "threshold_fail": {"type": "integer", "format": "int32"}, "last_status": {"type": "string"}, "last_checked_at": {"type": "string", "format": "date-time"}, "avg_latency_ms": {"type": "integer", "format": "int32"}}},
    "AlertRecord": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "rule_id": {"type": "string", "format": "uuid"}, "severity": {"type": "string"}, "source": {"type": "string"}, "target_ref": {"type": "string"}, "message": {"type": "string"}, "status": {"type": "string"}, "triggered_at": {"type": "string", "format": "date-time"}, "acknowledged_at": {"type": "string", "format": "date-time"}, "resolved_at": {"type": "string", "format": "date-time"}, "acknowledged_by": {"type": "string", "format": "uuid"}}},
    "AlertRule": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "type": {"type": "string"}, "severity": {"type": "string"}, "query": {"type": "string"}, "for_duration": {"type": "string"}, "enabled": {"type": "boolean"}}},
    "IncidentTimelineEvent": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "incident_id": {"type": "string", "format": "uuid"}, "event_type": {"type": "string"}, "actor_id": {"type": "string", "format": "uuid"}, "message": {"type": "string"}, "created_at": {"type": "string", "format": "date-time"}}},
    "ChangeRequest": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "no": {"type": "string"}, "title": {"type": "string"}, "type": {"type": "string"}, "risk": {"type": "string"}, "description": {"type": "string"}, "backout_plan": {"type": "string"}, "test_plan": {"type": "string"}, "status": {"type": "string"}, "requester_id": {"type": "string", "format": "uuid"}, "approver_id": {"type": "string", "format": "uuid"}, "scheduled_at": {"type": "string", "format": "date-time"}, "implemented_at": {"type": "string", "format": "date-time"}, "closed_at": {"type": "string", "format": "date-time"}}},
    "ProductRoadmapItem": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "theme": {"type": "string"}, "title": {"type": "string"}, "description": {"type": "string"}, "quarter": {"type": "string"}, "year": {"type": "integer", "format": "int32"}, "owner_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}, "confidence": {"type": "string"}, "effort_weeks": {"type": "number"}, "value_score": {"type": "integer", "format": "int32"}}},
    "IdeaItem": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "title": {"type": "string"}, "description": {"type": "string"}, "category": {"type": "string"}, "source": {"type": "string"}, "submitter_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}, "votes": {"type": "integer", "format": "int32"}, "comments_count": {"type": "integer", "format": "int32"}, "created_at": {"type": "string", "format": "date-time"}}},
    "ReleaseInfo": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "version": {"type": "string"}, "name": {"type": "string"}, "product": {"type": "string"}, "status": {"type": "string"}, "phase": {"type": "string"}, "release_date": {"type": "string", "format": "date"}, "changelog": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}, "published_at": {"type": "string", "format": "date-time"}}},
    "CustomerHealthScore": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "customer_id": {"type": "string", "format": "uuid"}, "overall_score": {"type": "integer", "format": "int32"}, "engagement_score": {"type": "integer", "format": "int32"}, "adoption_score": {"type": "integer", "format": "int32"}, "support_score": {"type": "integer", "format": "int32"}, "financial_score": {"type": "integer", "format": "int32"}, "risk_level": {"type": "string"}, "trend": {"type": "string"}, "updated_at": {"type": "string", "format": "date-time"}}},
    "CustomerJourney": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "customer_id": {"type": "string", "format": "uuid"}, "stage": {"type": "string"}, "stage_order": {"type": "integer", "format": "int32"}, "entered_at": {"type": "string", "format": "date-time"}, "exited_at": {"type": "string", "format": "date-time"}, "notes": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}}},
    "CustomerTouchpoint": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "customer_id": {"type": "string", "format": "uuid"}, "type": {"type": "string"}, "channel": {"type": "string"}, "title": {"type": "string"}, "content": {"type": "string"}, "sentiment": {"type": "string"}, "created_by": {"type": "string", "format": "uuid"}, "created_at": {"type": "string", "format": "date-time"}}},
    "SurveyQuestion": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "survey_id": {"type": "string", "format": "uuid"}, "code": {"type": "string"}, "type": {"type": "string"}, "title": {"type": "string"}, "required": {"type": "boolean"}, "sort": {"type": "integer", "format": "int32"}}},
    "TicketCategory": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "parent_id": {"type": "string", "format": "uuid"}, "code": {"type": "string"}, "description": {"type": "string"}, "sla_id": {"type": "string", "format": "uuid"}, "default_assignee_id": {"type": "string", "format": "uuid"}, "sort": {"type": "integer", "format": "int32"}, "status": {"type": "string"}}},
    "TicketPriorityMatrix": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "category_id": {"type": "string", "format": "uuid"}, "impact": {"type": "string"}, "urgency": {"type": "string"}, "priority": {"type": "string"}, "response_sla_minutes": {"type": "integer", "format": "int32"}, "resolution_sla_minutes": {"type": "integer", "format": "int32"}}},
    "KnowledgeBase": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "code": {"type": "string"}, "description": {"type": "string"}, "visibility": {"type": "string"}, "language": {"type": "string"}, "owner_id": {"type": "string", "format": "uuid"}, "article_count": {"type": "integer", "format": "int32"}, "status": {"type": "string"}}},
    "KnowledgeArticle": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "base_id": {"type": "string", "format": "uuid"}, "category_id": {"type": "string", "format": "uuid"}, "title": {"type": "string"}, "summary": {"type": "string"}, "content": {"type": "string"}, "format": {"type": "string"}, "author_id": {"type": "string", "format": "uuid"}, "reviewer_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}, "version": {"type": "integer", "format": "int32"}, "views": {"type": "integer", "format": "int64"}, "helpful_votes": {"type": "integer", "format": "int32"}, "published_at": {"type": "string", "format": "date-time"}, "last_updated_at": {"type": "string", "format": "date-time"}}},
    "BatchJob": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "name": {"type": "string"}, "type": {"type": "string"}, "cron_expression": {"type": "string"}, "timezone": {"type": "string"}, "command_ref": {"type": "string"}, "status": {"type": "string"}, "enabled": {"type": "boolean"}, "last_run_at": {"type": "string", "format": "date-time"}, "last_run_status": {"type": "string"}, "next_run_at": {"type": "string", "format": "date-time"}}},
    "BatchJobRun": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "job_id": {"type": "string", "format": "uuid"}, "trigger_type": {"type": "string"}, "status": {"type": "string"}, "started_at": {"type": "string", "format": "date-time"}, "finished_at": {"type": "string", "format": "date-time"}, "duration_seconds": {"type": "integer", "format": "int32"}, "exit_code": {"type": "integer", "format": "int32"}, "output_ref": {"type": "string"}, "error_message": {"type": "string"}, "processed_count": {"type": "integer", "format": "int64"}, "failed_count": {"type": "integer", "format": "int32"}}},
    "DataImportJob": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "type": {"type": "string"}, "target": {"type": "string"}, "file_ref": {"type": "string"}, "file_name": {"type": "string"}, "file_size_bytes": {"type": "integer", "format": "int64"}, "row_count": {"type": "integer", "format": "int64"}, "success_count": {"type": "integer", "format": "int64"}, "failed_count": {"type": "integer", "format": "int32"}, "skipped_count": {"type": "integer", "format": "int32"}, "status": {"type": "string"}, "error_log_ref": {"type": "string"}, "imported_by": {"type": "string", "format": "uuid"}, "started_at": {"type": "string", "format": "date-time"}, "completed_at": {"type": "string", "format": "date-time"}}},
    "DataExportJob": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "type": {"type": "string"}, "source": {"type": "string"}, "format": {"type": "string"}, "row_count": {"type": "integer", "format": "int64"}, "file_ref": {"type": "string"}, "file_name": {"type": "string"}, "file_size_bytes": {"type": "integer", "format": "int64"}, "status": {"type": "string"}, "expires_at": {"type": "string", "format": "date-time"}, "requested_by": {"type": "string", "format": "uuid"}, "created_at": {"type": "string", "format": "date-time"}, "ready_at": {"type": "string", "format": "date-time"}}},
    "Announcement": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "title": {"type": "string"}, "type": {"type": "string"}, "severity": {"type": "string"}, "content": {"type": "string"}, "scope": {"type": "string"}, "target_audience": {"type": "string"}, "schedule_at": {"type": "string", "format": "date-time"}, "expires_at": {"type": "string", "format": "date-time"}, "status": {"type": "string"}, "banner": {"type": "boolean"}, "sticky": {"type": "boolean"}, "published_by": {"type": "string", "format": "uuid"}}},
    "FeedbackItem": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "type": {"type": "string"}, "title": {"type": "string"}, "description": {"type": "string"}, "app": {"type": "string"}, "page_path": {"type": "string"}, "os": {"type": "string"}, "browser": {"type": "string"}, "device": {"type": "string"}, "screenshot_url": {"type": "string", "format": "uri"}, "submitter_id": {"type": "string", "format": "uuid"}, "status": {"type": "string"}, "assignee_id": {"type": "string", "format": "uuid"}, "created_at": {"type": "string", "format": "date-time"}}},
    "VotePoll": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "question": {"type": "string"}, "description": {"type": "string"}, "allow_multiple": {"type": "boolean"}, "allow_write_in": {"type": "boolean"}, "visibility": {"type": "string"}, "status": {"type": "string"}, "starts_at": {"type": "string", "format": "date-time"}, "ends_at": {"type": "string", "format": "date-time"}, "total_votes": {"type": "integer", "format": "int32"}, "created_by": {"type": "string", "format": "uuid"}}}
}
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
DEFAULT_INPUT_DIR = os.path.join(ROOT, "tmp", "openapi")
if os.environ.get("TOPEMS_OPENAPI_LEGACY_TMP") == "1":
    DEFAULT_INPUT_DIR = "/tmp"
DEFAULT_OUTPUT = os.path.join(
    ROOT,
    "docs",
    "api",
    "openapi-aggregated.json",
)

SPEC_GLOB_PRIMARY = "topems-*-openapi.json"
SPEC_GLOB_FALLBACK = "topems-*.json"
SPEC_GLOB = SPEC_GLOB_PRIMARY
HTTP_METHODS = ("get", "post", "put", "delete", "patch", "head", "options", "trace")

COLORS = {
    "RED": "\033[0;31m",
    "GREEN": "\033[0;32m",
    "YELLOW": "\033[1;33m",
    "BLUE": "\033[0;34m",
    "NC": "\033[0m",
}


def log_info(msg: str) -> None:
    print(f"{COLORS['BLUE']}[INFO]{COLORS['NC']} {msg}")


def log_success(msg: str) -> None:
    print(f"{COLORS['GREEN']}[OK]{COLORS['NC']} {msg}")


def log_warn(msg: str) -> None:
    print(f"{COLORS['YELLOW']}[WARN]{COLORS['NC']} {msg}", file=sys.stderr)


def log_error(msg: str) -> None:
    print(f"{COLORS['RED']}[ERROR]{COLORS['NC']} {msg}", file=sys.stderr)


def extract_service_name(filename: str) -> str | None:
    """从 `topems-<svc>-openapi.json` 或 `topems-<svc>.json` 提取 <svc>。"""
    base = os.path.basename(filename)
    m = re.match(r"^topems-(.+)-openapi\.json$", base)
    if m:
        return m.group(1)
    m = re.match(r"^topems-(.+)\.json$", base)
    return m.group(1) if m else None


def load_specs(input_dir: str) -> list[tuple[str, dict]]:
    """加载输入目录下所有 topems-*-openapi.json，返回 [(service_name, spec), ...]。"""
    files_primary = sorted(glob.glob(os.path.join(input_dir, SPEC_GLOB_PRIMARY)))
    files_fallback = sorted(glob.glob(os.path.join(input_dir, SPEC_GLOB_FALLBACK)))
    primary_stems = {
        os.path.basename(p).replace("-openapi.json", ".json")
        for p in files_primary
    }
    files = list(files_primary) + [
        p for p in files_fallback
        if os.path.basename(p) not in primary_stems
        and os.path.basename(p) != "SUMMARY.txt"
        and not os.path.basename(p).endswith("-openapi.json")
    ]
    if not files:
        log_error(f"未找到 spec 文件: {os.path.join(input_dir, SPEC_GLOB_PRIMARY)} 或 {os.path.join(input_dir, SPEC_GLOB_FALLBACK)}")
        log_error("请先运行: cargo test -p topems-<svc> extract_openapi_spec -- --nocapture")
        return []

    specs: list[tuple[str, dict]] = []
    for path in files:
        svc = extract_service_name(path)
        if svc is None:
            log_warn(f"无法解析服务名，跳过: {path}")
            continue
        try:
            with open(path, encoding="utf-8") as f:
                spec = json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            log_warn(f"读取 {path} 失败: {e}")
            continue
        specs.append((svc, spec))
        path_count = len(spec.get("paths", {}))
        schema_count = len(spec.get("components", {}).get("schemas", {}))
        log_success(f"{svc} — {path_count} paths, {schema_count} schemas")
    return specs


def merge_paths(
    aggregated: dict, specs: list[tuple[str, dict]], strict: bool
) -> tuple[int, list[str]]:
    """合并 paths，返回 (总端点数, 冲突列表)。"""
    total = 0
    conflicts: list[str] = []
    paths: dict = aggregated.setdefault("paths", {})
    # V72.5 第二批：operationId 全局去重，避免 openapi-typescript 生成重复 TS 标识符。
    # 首次出现的 operationId 保持原样（向后兼容），后续冲突的自动加 `{svc}_` 前缀。
    seen_oids: dict[str, str] = {}

    for svc, spec in specs:
        svc_paths = spec.get("paths", {})
        for path, methods in svc_paths.items():
            # utoipa 生成的 path 已带 /api/<svc> 前缀（如 /api/mes/work-reports），
            # 此类路径直接保留；否则补服务前缀避免与其它服务冲突。
            prefixed = path
            if not path.startswith("/api") and not path.startswith(f"/{svc}"):
                prefixed = f"/{svc}{path}"

            slot = paths.setdefault(prefixed, {})
            for method, spec_def in methods.items():
                if method.lower() not in HTTP_METHODS:
                    continue
                if method in slot:
                    msg = f"paths 冲突: {prefixed} [{method}] 已被服务 {slot[method].get('_source', '?')} 占用，{svc} 被跳过"
                    conflicts.append(msg)
                    if strict:
                        log_error(msg)
                        raise SystemExit(1)
                    log_warn(msg)
                    continue
                # 注入来源标记与 tag（便于排查，输出前再剥离 _source）
                spec_def = dict(spec_def)
                spec_def["_source"] = svc
                tags = spec_def.setdefault("tags", [])
                if svc not in tags:
                    tags.insert(0, svc)
                # operationId 全局去重：冲突时改为 `{svc}_{原 operationId}`
                # 同服务内也需去重（如 ehs 的 list_plans 在 checks 和 emergency-plans 模块都有）
                oid = spec_def.get("operationId")
                if oid:
                    if oid in seen_oids:
                        owner = seen_oids[oid]
                        if owner == svc:
                            new_oid = f"{svc}_{oid}_{prefixed.replace('/', '_').strip('_')}"
                        else:
                            new_oid = f"{svc}_{oid}"
                        spec_def["operationId"] = new_oid
                        log_warn(
                            f"operationId 冲突: '{oid}' 已被 {owner} 占用，"
                            f"{svc} 重命名为 '{new_oid}'"
                        )
                    else:
                        seen_oids.setdefault(oid, svc)
                slot[method] = spec_def
                total += 1

    return total, conflicts


def merge_schemas(
    aggregated: dict, specs: list[tuple[str, dict]], strict: bool
) -> tuple[int, list[str]]:
    """合并 schemas，返回 (总 schema 数, 冲突列表)。"""
    total = 0
    conflicts: list[str] = []
    schemas: dict = aggregated.setdefault("components", {}).setdefault("schemas", {})

    for svc, spec in specs:
        svc_schemas = spec.get("components", {}).get("schemas", {})
        for name, definition in svc_schemas.items():
            # 标准类型由本脚本统一注入，跳过服务自带版本（以 STANDARD_TYPES 为准）
            if name in STANDARD_TYPES:
                continue
            if name in schemas:
                prefixed = f"{svc}_{name}"
                if prefixed in schemas:
                    msg = f"schema 冲突: {prefixed} 已存在，{svc}/{name} 被跳过"
                    conflicts.append(msg)
                    if strict:
                        log_error(msg)
                        raise SystemExit(1)
                    log_warn(msg)
                    continue
                schemas[prefixed] = definition
                total += 1
            else:
                schemas[name] = definition
                total += 1

    return total, conflicts


def inject_standard_types(schemas: dict) -> int:
    """补充标准类型，已存在的会被 STANDARD_TYPES 覆盖以保证一致性。返回注入数量。"""
    count = 0
    for name, definition in STANDARD_TYPES.items():
        if name not in schemas:
            count += 1
        schemas[name] = definition
    return count


def strip_internal_markers(aggregated: dict) -> None:
    """剥离 merge_paths 注入的 _source 字段（避免污染输出）。"""
    for methods in aggregated.get("paths", {}).values():
        for spec_def in methods.values():
            if isinstance(spec_def, dict):
                spec_def.pop("_source", None)


def build_aggregated(specs: list[tuple[str, dict]], strict: bool) -> tuple[dict, int, int, list[str]]:
    """构建聚合文档，返回 (doc, paths_count, schemas_count, conflicts)。"""
    aggregated: dict = {
        "openapi": "3.0.3",
        "info": {
            "title": "TOPEMS API",
            "version": "1.0.0",
            "description": "TOPEMS 企业级 SaaS 平台统一 API 文档（由 aggregate.py 从 cargo test 提取的 spec 聚合生成）",
        },
        "paths": {},
        "components": {"schemas": {}},
    }

    path_count, path_conflicts = merge_paths(aggregated, specs, strict)
    schema_count, schema_conflicts = merge_schemas(aggregated, specs, strict)

    standard_count = inject_standard_types(aggregated["components"]["schemas"])
    schema_count += standard_count

    strip_internal_markers(aggregated)

    aggregated["info"]["description"] = (
        "TOPEMS 企业级 SaaS 平台统一 API 文档（由 aggregate.py 从 cargo test 提取的 spec 聚合生成）\n\n"
        f"聚合自 {len(specs)} 个服务，共 {path_count} 个端点、{schema_count} 个 Schema（含 {standard_count} 个标准类型）。\n"
        f"生成时间: {datetime.now(timezone.utc).isoformat()}"
    )

    conflicts = path_conflicts + schema_conflicts
    return aggregated, path_count, schema_count, conflicts


def main() -> int:
    parser = argparse.ArgumentParser(
        description="聚合 /tmp/topems-*-openapi.json 为统一 OpenAPI 文档"
    )
    parser.add_argument(
        "--input-dir",
        default=DEFAULT_INPUT_DIR,
        help=f"spec 输入目录（默认: {DEFAULT_INPUT_DIR}）",
    )
    parser.add_argument(
        "--output",
        default=DEFAULT_OUTPUT,
        help=f"聚合输出路径（默认: {DEFAULT_OUTPUT}）",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="遇到 paths/schemas 冲突时立即报错退出（默认仅 warning）",
    )
    args = parser.parse_args()

    specs = load_specs(args.input_dir)
    if not specs:
        log_error("无可聚合的 spec，终止")
        return 1

    log_info(f"开始聚合 {len(specs)} 个服务 spec...")

    aggregated, path_count, schema_count, conflicts = build_aggregated(specs, args.strict)

    output_dir = os.path.dirname(args.output)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(aggregated, f, indent=2, ensure_ascii=False)

    log_success(f"已生成: {args.output} ({path_count} paths, {schema_count} schemas)")
    if conflicts:
        log_warn(f"共 {len(conflicts)} 处冲突，详见上方 warning")

    return 0


if __name__ == "__main__":
    sys.exit(main())

