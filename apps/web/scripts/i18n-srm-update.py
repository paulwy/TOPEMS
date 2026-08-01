#!/usr/bin/env python3
"""Merge new structured i18n keys into SRM JSON resource files.

Adds new top-level keys (performance, evaluation, quotation, order, contract,
scoring, supplier) to:
  - zh/srm.json (preserve existing keys)
  - en/srm.json (create if missing)
  - zh.json (merge under "srm" namespace)
  - en.json (merge under "srm" namespace)
"""
import json
import os
import sys

LOCALES_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'i18n', 'locales')

ZH_SRM = os.path.join(LOCALES_DIR, 'zh', 'srm.json')
EN_SRM = os.path.join(LOCALES_DIR, 'en', 'srm.json')
ZH_MAIN = os.path.join(LOCALES_DIR, 'zh.json')
EN_MAIN = os.path.join(LOCALES_DIR, 'en.json')


def deep_merge(base, addition):
    """Recursively merge addition into base (addition wins on conflict)."""
    for key, value in addition.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            deep_merge(base[key], value)
        else:
            base[key] = value
    return base


def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json(path, obj):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write('\n')


def update_keys(new_keys_zh, new_keys_en):
    """Merge new structured keys into all 4 JSON files.

    new_keys_zh / new_keys_en: nested dicts with the SAME structure.
    For zh/srm.json and en/srm.json: merge at top level.
    For zh.json and en.json: merge under the "srm" top-level key.
    """
    # zh/srm.json
    zh_srm = load_json(ZH_SRM)
    deep_merge(zh_srm, new_keys_zh)
    save_json(ZH_SRM, zh_srm)
    print(f'Updated {ZH_SRM}')

    # en/srm.json (create if missing)
    if os.path.exists(EN_SRM):
        en_srm = load_json(EN_SRM)
    else:
        en_srm = {}
    deep_merge(en_srm, new_keys_en)
    save_json(EN_SRM, en_srm)
    print(f'Updated {EN_SRM}')

    # zh.json under "srm"
    zh_main = load_json(ZH_MAIN)
    if 'srm' not in zh_main or not isinstance(zh_main['srm'], dict):
        zh_main['srm'] = {}
    deep_merge(zh_main['srm'], new_keys_zh)
    save_json(ZH_MAIN, zh_main)
    print(f'Updated {ZH_MAIN} (srm section)')

    # en.json under "srm"
    en_main = load_json(EN_MAIN)
    if 'srm' not in en_main or not isinstance(en_main['srm'], dict):
        en_main['srm'] = {}
    deep_merge(en_main['srm'], new_keys_en)
    save_json(EN_MAIN, en_main)
    print(f'Updated {EN_MAIN} (srm section)')


# New structured keys for 7 SRM pages
NEW_KEYS_ZH = {
    "performance": {
        "message": {
            "create_fail": "绩效数据不可创建",
            "update_fail": "绩效数据不可更新",
            "delete_fail": "绩效数据不可删除"
        },
        "column": {
            "amount": "订单金额",
            "amount_value": "{{value}}万",
            "overall_score": "综合评分",
            "quality_score": "质量评分",
            "delivery_score": "交付评分",
            "on_time_rate": "准时交付率",
            "defect_rate": "缺陷率"
        },
        "stat": {
            "total_suppliers": "供应商总数",
            "evaluated": "已评估供应商",
            "coverage_rate": "评估覆盖率",
            "avg_overall": "平均综合评分"
        },
        "title": {
            "overview": "绩效概览",
            "best_supplier": "最佳供应商",
            "score_value": "{{value}}分"
        },
        "breadcrumb": "供应商绩效"
    },
    "evaluation": {
        "message": {
            "create_fail": "创建评估失败",
            "update_fail": "更新评估失败",
            "delete_fail": "删除评估失败"
        },
        "status": {
            "in_progress": "进行中",
            "completed": "已完成",
            "pending": "待审核",
            "rejected": "已驳回"
        },
        "column": {
            "overall_score": "综合评分",
            "status": "状态"
        },
        "stat": {
            "total": "评估总数",
            "in_progress": "进行中",
            "completed": "已完成",
            "pending": "待审核"
        },
        "action": {
            "view_detail": "查看详情"
        },
        "breadcrumb": "供应商评估"
    },
    "quotation": {
        "message": {
            "load_fail": "加载报价单失败",
            "create_fail": "创建报价单失败",
            "update_fail": "更新报价单失败",
            "award_success": "报价单已中标",
            "award_fail": "中标操作失败",
            "reject_success": "报价单已驳回",
            "reject_fail": "驳回操作失败"
        },
        "action": {
            "award": "中标",
            "reject": "驳回"
        },
        "breadcrumb": "报价单管理"
    },
    "order": {
        "message": {
            "load_stats_fail": "加载订单统计失败",
            "load_fail": "加载订单失败",
            "create_fail": "创建订单失败",
            "update_fail": "更新订单失败",
            "delete_fail": "删除订单失败"
        },
        "stat": {
            "total": "订单总数",
            "pending": "待处理",
            "processing": "处理中",
            "completed": "已完成",
            "total_amount": "订单总额"
        },
        "breadcrumb": {
            "home": "首页",
            "purchase_order": "采购订单"
        }
    },
    "contract": {
        "message": {
            "create_fail": "创建合同失败",
            "update_fail": "更新合同失败",
            "delete_fail": "删除合同失败"
        },
        "stat": {
            "total": "合同总数",
            "active": "执行中",
            "completed": "已完成",
            "total_amount": "合同总额"
        },
        "action": {
            "view_detail": "查看详情"
        },
        "breadcrumb": "合同管理"
    },
    "scoring": {
        "message": {
            "create_fail": "创建评分维度失败",
            "update_fail": "更新评分维度失败",
            "delete_fail": "删除评分维度失败"
        },
        "stat": {
            "total": "维度总数",
            "active": "已启用",
            "total_weight": "权重合计",
            "inactive": "已禁用"
        },
        "breadcrumb": "评分维度配置"
    },
    "supplier": {
        "status": {
            "active": "启用"
        },
        "stat": {
            "total": "供应商总数",
            "active": "已启用",
            "low_risk": "低风险",
            "high_risk": "高风险"
        },
        "breadcrumb": "供应商管理"
    }
}

NEW_KEYS_EN = {
    "performance": {
        "message": {
            "create_fail": "Performance data cannot be created",
            "update_fail": "Performance data cannot be updated",
            "delete_fail": "Performance data cannot be deleted"
        },
        "column": {
            "amount": "Order Amount",
            "amount_value": "{{value}}0k",
            "overall_score": "Overall Score",
            "quality_score": "Quality Score",
            "delivery_score": "Delivery Score",
            "on_time_rate": "On-time Delivery Rate",
            "defect_rate": "Defect Rate"
        },
        "stat": {
            "total_suppliers": "Total Suppliers",
            "evaluated": "Evaluated Suppliers",
            "coverage_rate": "Evaluation Coverage",
            "avg_overall": "Avg Overall Score"
        },
        "title": {
            "overview": "Performance Overview",
            "best_supplier": "Best Supplier",
            "score_value": "{{value}} pts"
        },
        "breadcrumb": "Supplier Performance"
    },
    "evaluation": {
        "message": {
            "create_fail": "Failed to create evaluation",
            "update_fail": "Failed to update evaluation",
            "delete_fail": "Failed to delete evaluation"
        },
        "status": {
            "in_progress": "In Progress",
            "completed": "Completed",
            "pending": "Pending Review",
            "rejected": "Rejected"
        },
        "column": {
            "overall_score": "Overall Score",
            "status": "Status"
        },
        "stat": {
            "total": "Total Evaluations",
            "in_progress": "In Progress",
            "completed": "Completed",
            "pending": "Pending Review"
        },
        "action": {
            "view_detail": "View Detail"
        },
        "breadcrumb": "Supplier Evaluation"
    },
    "quotation": {
        "message": {
            "load_fail": "Failed to load quotations",
            "create_fail": "Failed to create quotation",
            "update_fail": "Failed to update quotation",
            "award_success": "Quotation awarded",
            "award_fail": "Award operation failed",
            "reject_success": "Quotation rejected",
            "reject_fail": "Reject operation failed"
        },
        "action": {
            "award": "Award",
            "reject": "Reject"
        },
        "breadcrumb": "Quotation Management"
    },
    "order": {
        "message": {
            "load_stats_fail": "Failed to load order statistics",
            "load_fail": "Failed to load orders",
            "create_fail": "Failed to create order",
            "update_fail": "Failed to update order",
            "delete_fail": "Failed to delete order"
        },
        "stat": {
            "total": "Total Orders",
            "pending": "Pending",
            "processing": "Processing",
            "completed": "Completed",
            "total_amount": "Total Order Amount"
        },
        "breadcrumb": {
            "home": "Home",
            "purchase_order": "Purchase Order"
        }
    },
    "contract": {
        "message": {
            "create_fail": "Failed to create contract",
            "update_fail": "Failed to update contract",
            "delete_fail": "Failed to delete contract"
        },
        "stat": {
            "total": "Total Contracts",
            "active": "Active",
            "completed": "Completed",
            "total_amount": "Total Contract Amount"
        },
        "action": {
            "view_detail": "View Detail"
        },
        "breadcrumb": "Contract Management"
    },
    "scoring": {
        "message": {
            "create_fail": "Failed to create scoring dimension",
            "update_fail": "Failed to update scoring dimension",
            "delete_fail": "Failed to delete scoring dimension"
        },
        "stat": {
            "total": "Total Dimensions",
            "active": "Enabled",
            "total_weight": "Total Weight",
            "inactive": "Disabled"
        },
        "breadcrumb": "Scoring Dimension Configuration"
    },
    "supplier": {
        "status": {
            "active": "Active"
        },
        "stat": {
            "total": "Total Suppliers",
            "active": "Enabled",
            "low_risk": "Low Risk",
            "high_risk": "High Risk"
        },
        "breadcrumb": "Supplier Management"
    }
}


if __name__ == '__main__':
    update_keys(NEW_KEYS_ZH, NEW_KEYS_EN)
    print('Done.')
