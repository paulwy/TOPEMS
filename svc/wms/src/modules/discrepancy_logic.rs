//! 盘点差异计算与 ABC 分析纯函数模块

use std::f64;

/// 计算单个盘点项的差异
/// 返回 (差异量, 差异类型)
/// diff = counted - system
pub fn calculate_discrepancy(system_quantity: f64, counted_quantity: f64) -> (f64, &'static str) {
    let diff = counted_quantity - system_quantity;
    let dtype = if diff > 0.0 {
        "over"
    } else if diff < 0.0 {
        "under"
    } else {
        "none"
    };
    (diff, dtype)
}

/// 计算差异金额 = 差异量 × 单价
pub fn calculate_discrepancy_value(discrepancy_quantity: f64, unit_price: f64) -> f64 {
    discrepancy_quantity * unit_price
}

/// 计算差异率（差异量 / 系统量 × 100）
/// 返回 0.0-100.0 的百分比；系统量为 0 时返回 0.0 避免除零
/// 注意：取绝对值，表示偏差幅度
pub fn calculate_variance_rate(discrepancy_quantity: f64, system_quantity: f64) -> f64 {
    if system_quantity.abs() < f64::EPSILON {
        return 0.0;
    }
    (discrepancy_quantity / system_quantity).abs() * 100.0
}

/// 计算盘点准确率（无差异项数 / 总项数 × 100）
/// 注意：这是真正的准确率，不是完成率
pub fn calculate_accuracy_rate(
    accurate_items: i64, // 无差异项数
    total_items: i64,    // 总盘点项数
) -> f64 {
    if total_items <= 0 {
        return 0.0;
    }
    (accurate_items as f64 / total_items as f64) * 100.0
}

/// 计算完成率（已盘点项数 / 总项数 × 100）
/// 这是 stock_take.rs 当前错误命名为 accuracy_rate 的逻辑
pub fn calculate_completion_rate(counted_items: i64, total_items: i64) -> f64 {
    if total_items <= 0 {
        return 0.0;
    }
    (counted_items as f64 / total_items as f64) * 100.0
}

/// 盘点项明细（用于汇总）
#[derive(Debug, Clone, PartialEq)]
pub struct DiscrepancyItem {
    pub system_quantity: f64,
    pub counted_quantity: Option<f64>, // None 表示未盘点
    pub unit_price: f64,
}

/// 盘点差异汇总
#[derive(Debug, Clone, PartialEq)]
pub struct DiscrepancySummary {
    pub total_items: i64,
    pub counted_items: i64,
    pub accurate_items: i64,    // 无差异项数
    pub discrepancy_items: i64, // 有差异项数
    pub over_count: i64,        // 盘盈项数
    pub under_count: i64,       // 盘亏项数
    pub uncounted_count: i64,   // 未盘点项数
    pub total_system_qty: f64,
    pub total_counted_qty: f64,
    pub total_discrepancy_qty: f64,
    pub total_discrepancy_value: f64,
    pub accuracy_rate: f64,   // 真正的准确率
    pub completion_rate: f64, // 完成率
    pub variance_rate: f64,   // 差异率
}

/// 汇总盘点差异
pub fn summarize_discrepancies(items: &[DiscrepancyItem]) -> DiscrepancySummary {
    let total_items = items.len() as i64;
    if total_items == 0 {
        return DiscrepancySummary {
            total_items: 0,
            counted_items: 0,
            accurate_items: 0,
            discrepancy_items: 0,
            over_count: 0,
            under_count: 0,
            uncounted_count: 0,
            total_system_qty: 0.0,
            total_counted_qty: 0.0,
            total_discrepancy_qty: 0.0,
            total_discrepancy_value: 0.0,
            accuracy_rate: 0.0,
            completion_rate: 0.0,
            variance_rate: 0.0,
        };
    }

    let mut counted_items = 0i64;
    let mut accurate_items = 0i64;
    let mut discrepancy_items = 0i64;
    let mut over_count = 0i64;
    let mut under_count = 0i64;
    let mut uncounted_count = 0i64;
    let mut total_system_qty = 0.0;
    let mut total_counted_qty = 0.0;
    let mut total_discrepancy_qty = 0.0;
    let mut total_discrepancy_value = 0.0;

    for item in items {
        total_system_qty += item.system_quantity;

        match item.counted_quantity {
            None => uncounted_count += 1,
            Some(counted) => {
                counted_items += 1;
                total_counted_qty += counted;

                let (diff, dtype) = calculate_discrepancy(item.system_quantity, counted);

                if dtype == "none" {
                    accurate_items += 1;
                } else {
                    discrepancy_items += 1;
                    total_discrepancy_qty += diff;
                    total_discrepancy_value += calculate_discrepancy_value(diff, item.unit_price);

                    match dtype {
                        "over" => over_count += 1,
                        "under" => under_count += 1,
                        _ => {}
                    }
                }
            }
        }
    }

    let accuracy_rate = calculate_accuracy_rate(accurate_items, total_items);
    let completion_rate = calculate_completion_rate(counted_items, total_items);
    let variance_rate = calculate_variance_rate(total_discrepancy_qty, total_system_qty);

    DiscrepancySummary {
        total_items,
        counted_items,
        accurate_items,
        discrepancy_items,
        over_count,
        under_count,
        uncounted_count,
        total_system_qty,
        total_counted_qty,
        total_discrepancy_qty,
        total_discrepancy_value,
        accuracy_rate,
        completion_rate,
        variance_rate,
    }
}

// ===================== ABC 分析 =====================

/// ABC 分析输入项
#[derive(Debug, Clone, PartialEq)]
pub struct AbcItem {
    pub code: String,
    pub value: f64,
}

/// ABC 分析结果项
#[derive(Debug, Clone, PartialEq)]
pub struct AbcResult {
    pub code: String,
    pub value: f64,
    pub cumulative_percentage: f64, // 累计占比
    pub category: &'static str,     // A / B / C
}

/// ABC 分析汇总
#[derive(Debug, Clone, PartialEq)]
pub struct AbcSummary {
    pub a_count: i64,
    pub b_count: i64,
    pub c_count: i64,
    pub a_value: f64,
    pub b_value: f64,
    pub c_value: f64,
    pub total_value: f64,
    pub total_count: i64,
}

/// 根据累计百分比判定 ABC 分类
/// A: 0-80%（半开区间 [0, 80)）
/// B: 80-95%（半开区间 [80, 95)）
/// C: 95-100%（半开区间 [95, 100]）
/// 修复原代码 `<=` 导致边界值重复分类的 Bug
pub fn classify_abc(cumulative_percentage: f64) -> &'static str {
    if cumulative_percentage < 80.0 {
        "A"
    } else if cumulative_percentage < 95.0 {
        "B"
    } else {
        "C"
    }
}

/// 计算累计百分比
/// total_value <= 0 时返回 0.0 避免除零
pub fn calculate_cumulative_percentage(cumulative_value: f64, total_value: f64) -> f64 {
    if total_value <= 0.0 {
        return 0.0;
    }
    (cumulative_value / total_value) * 100.0
}

/// 对物料列表执行 ABC 分析
/// 输入无需排序，函数内部按 value 降序排序
pub fn analyze_abc(items: &[AbcItem]) -> Vec<AbcResult> {
    if items.is_empty() {
        return vec![];
    }

    let mut sorted: Vec<&AbcItem> = items.iter().collect();
    sorted.sort_by(|a, b| {
        b.value
            .partial_cmp(&a.value)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    let total_value: f64 = items.iter().map(|i| i.value).sum();
    let mut cumulative = 0.0;

    sorted
        .iter()
        .map(|item| {
            cumulative += item.value;
            let pct = calculate_cumulative_percentage(cumulative, total_value);
            AbcResult {
                code: item.code.clone(),
                value: item.value,
                cumulative_percentage: pct,
                category: classify_abc(pct),
            }
        })
        .collect()
}

/// 汇总 ABC 分类统计
pub fn summarize_abc(results: &[AbcResult]) -> AbcSummary {
    let mut a_count = 0i64;
    let mut b_count = 0i64;
    let mut c_count = 0i64;
    let mut a_value = 0.0;
    let mut b_value = 0.0;
    let mut c_value = 0.0;

    for r in results {
        match r.category {
            "A" => {
                a_count += 1;
                a_value += r.value;
            }
            "B" => {
                b_count += 1;
                b_value += r.value;
            }
            "C" => {
                c_count += 1;
                c_value += r.value;
            }
            _ => {}
        }
    }

    AbcSummary {
        a_count,
        b_count,
        c_count,
        a_value,
        b_value,
        c_value,
        total_value: a_value + b_value + c_value,
        total_count: a_count + b_count + c_count,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn approx_eq(a: f64, b: f64) -> bool {
        (a - b).abs() < 0.001
    }

    // ========== 差异计算 ==========

    #[test]
    fn test_calculate_discrepancy_over() {
        assert_eq!(calculate_discrepancy(100.0, 120.0), (20.0, "over"));
    }

    #[test]
    fn test_calculate_discrepancy_under() {
        assert_eq!(calculate_discrepancy(100.0, 80.0), (-20.0, "under"));
    }

    #[test]
    fn test_calculate_discrepancy_none() {
        assert_eq!(calculate_discrepancy(100.0, 100.0), (0.0, "none"));
    }

    #[test]
    fn test_calculate_discrepancy_zero_system() {
        // 系统量为 0，盘点为 10 → 盘盈
        assert_eq!(calculate_discrepancy(0.0, 10.0), (10.0, "over"));
    }

    #[test]
    fn test_calculate_discrepancy_value_positive() {
        assert_eq!(calculate_discrepancy_value(20.0, 50.0), 1000.0);
    }

    #[test]
    fn test_calculate_discrepancy_value_negative() {
        assert_eq!(calculate_discrepancy_value(-10.0, 50.0), -500.0);
    }

    #[test]
    fn test_calculate_variance_rate_normal() {
        assert!(approx_eq(calculate_variance_rate(5.0, 100.0), 5.0));
    }

    #[test]
    fn test_calculate_variance_rate_zero_system() {
        // 除零保护
        assert_eq!(calculate_variance_rate(10.0, 0.0), 0.0);
    }

    #[test]
    fn test_calculate_accuracy_rate_all_accurate() {
        assert_eq!(calculate_accuracy_rate(100, 100), 100.0);
    }

    #[test]
    fn test_calculate_accuracy_rate_partial() {
        // 80 项准确，100 项总数 → 80%
        assert_eq!(calculate_accuracy_rate(80, 100), 80.0);
    }

    #[test]
    fn test_calculate_accuracy_rate_zero_items() {
        // 除零保护
        assert_eq!(calculate_accuracy_rate(0, 0), 0.0);
    }

    #[test]
    fn test_calculate_completion_rate() {
        assert_eq!(calculate_completion_rate(50, 100), 50.0);
        assert_eq!(calculate_completion_rate(0, 0), 0.0);
    }

    // ========== 差异汇总 ==========

    #[test]
    fn test_summarize_discrepancies_empty() {
        let s = summarize_discrepancies(&[]);
        assert_eq!(s.total_items, 0);
        assert_eq!(s.accuracy_rate, 0.0);
    }

    #[test]
    fn test_summarize_discrepancies_all_accurate() {
        let items = vec![
            DiscrepancyItem {
                system_quantity: 100.0,
                counted_quantity: Some(100.0),
                unit_price: 10.0,
            },
            DiscrepancyItem {
                system_quantity: 50.0,
                counted_quantity: Some(50.0),
                unit_price: 20.0,
            },
        ];
        let s = summarize_discrepancies(&items);
        assert_eq!(s.total_items, 2);
        assert_eq!(s.accurate_items, 2);
        assert_eq!(s.discrepancy_items, 0);
        assert_eq!(s.accuracy_rate, 100.0);
        assert_eq!(s.completion_rate, 100.0);
        assert_eq!(s.total_discrepancy_value, 0.0);
    }

    #[test]
    fn test_summarize_discrepancies_mixed() {
        let items = vec![
            // 准确
            DiscrepancyItem {
                system_quantity: 100.0,
                counted_quantity: Some(100.0),
                unit_price: 10.0,
            },
            // 盘盈
            DiscrepancyItem {
                system_quantity: 100.0,
                counted_quantity: Some(120.0),
                unit_price: 10.0,
            },
            // 盘亏
            DiscrepancyItem {
                system_quantity: 100.0,
                counted_quantity: Some(80.0),
                unit_price: 10.0,
            },
            // 未盘点
            DiscrepancyItem {
                system_quantity: 100.0,
                counted_quantity: None,
                unit_price: 10.0,
            },
        ];
        let s = summarize_discrepancies(&items);
        assert_eq!(s.total_items, 4);
        assert_eq!(s.counted_items, 3);
        assert_eq!(s.accurate_items, 1);
        assert_eq!(s.discrepancy_items, 2);
        assert_eq!(s.over_count, 1);
        assert_eq!(s.under_count, 1);
        assert_eq!(s.uncounted_count, 1);
        // 准确率 = 1/4 = 25%
        assert_eq!(s.accuracy_rate, 25.0);
        // 完成率 = 3/4 = 75%
        assert_eq!(s.completion_rate, 75.0);
        // 差异量 = 20 + (-20) = 0
        assert_eq!(s.total_discrepancy_qty, 0.0);
        // 差异金额 = 200 + (-200) = 0
        assert_eq!(s.total_discrepancy_value, 0.0);
    }

    #[test]
    fn test_summarize_discrepancies_all_over() {
        let items = vec![
            DiscrepancyItem {
                system_quantity: 100.0,
                counted_quantity: Some(110.0),
                unit_price: 10.0,
            },
            DiscrepancyItem {
                system_quantity: 100.0,
                counted_quantity: Some(120.0),
                unit_price: 20.0,
            },
        ];
        let s = summarize_discrepancies(&items);
        assert_eq!(s.over_count, 2);
        assert_eq!(s.under_count, 0);
        // 差异量 = 10 + 20 = 30
        assert_eq!(s.total_discrepancy_qty, 30.0);
        // 差异金额 = 100 + 400 = 500
        assert_eq!(s.total_discrepancy_value, 500.0);
    }

    // ========== ABC 分析 ==========

    #[test]
    fn test_classify_abc_boundaries() {
        // 修复后的半开区间边界
        assert_eq!(classify_abc(0.0), "A");
        assert_eq!(classify_abc(79.99), "A");
        assert_eq!(classify_abc(80.0), "B"); // 修复：80.0 应归 B
        assert_eq!(classify_abc(94.99), "B");
        assert_eq!(classify_abc(95.0), "C");
        assert_eq!(classify_abc(100.0), "C");
    }

    #[test]
    fn test_calculate_cumulative_percentage_zero_total() {
        // 除零保护
        assert_eq!(calculate_cumulative_percentage(100.0, 0.0), 0.0);
        assert_eq!(calculate_cumulative_percentage(100.0, -10.0), 0.0);
    }

    #[test]
    fn test_analyze_abc_normal_distribution() {
        // 3 个物料，价值 70/20/10，total=100
        let items = vec![
            AbcItem {
                code: "A".into(),
                value: 70.0,
            },
            AbcItem {
                code: "B".into(),
                value: 20.0,
            },
            AbcItem {
                code: "C".into(),
                value: 10.0,
            },
        ];
        let results = analyze_abc(&items);
        assert_eq!(results.len(), 3);
        // 第一个累计 70% → A
        assert_eq!(results[0].category, "A");
        assert!(approx_eq(results[0].cumulative_percentage, 70.0));
        // 第二个累计 90% → B
        assert_eq!(results[1].category, "B");
        assert!(approx_eq(results[1].cumulative_percentage, 90.0));
        // 第三个累计 100% → C
        assert_eq!(results[2].category, "C");
        assert!(approx_eq(results[2].cumulative_percentage, 100.0));
    }

    #[test]
    fn test_analyze_abc_single_item() {
        let items = vec![AbcItem {
            code: "X".into(),
            value: 100.0,
        }];
        let results = analyze_abc(&items);
        assert_eq!(results.len(), 1);
        // 累计 100% → C（边界：95.0 归 C）
        assert_eq!(results[0].category, "C");
    }

    #[test]
    fn test_analyze_abc_empty() {
        let results = analyze_abc(&[]);
        assert!(results.is_empty());
    }

    #[test]
    fn test_analyze_abc_all_zero_value() {
        let items = vec![
            AbcItem {
                code: "A".into(),
                value: 0.0,
            },
            AbcItem {
                code: "B".into(),
                value: 0.0,
            },
        ];
        let results = analyze_abc(&items);
        // total_value = 0 → 所有 percentage = 0 → 全部归 A
        // 这符合"无价值物料无法分类"的语义
        for r in &results {
            assert_eq!(r.category, "A");
            assert_eq!(r.cumulative_percentage, 0.0);
        }
    }

    #[test]
    fn test_analyze_abc_sorts_by_value_desc() {
        let items = vec![
            AbcItem {
                code: "low".into(),
                value: 10.0,
            },
            AbcItem {
                code: "high".into(),
                value: 100.0,
            },
            AbcItem {
                code: "mid".into(),
                value: 50.0,
            },
        ];
        let results = analyze_abc(&items);
        // 应按价值降序：high(100) → mid(50) → low(10)
        assert_eq!(results[0].code, "high");
        assert_eq!(results[1].code, "mid");
        assert_eq!(results[2].code, "low");
    }

    #[test]
    fn test_summarize_abc_counts_and_values() {
        let items = vec![
            AbcItem {
                code: "A1".into(),
                value: 50.0,
            },
            AbcItem {
                code: "A2".into(),
                value: 25.0,
            },
            AbcItem {
                code: "B1".into(),
                value: 15.0,
            },
            AbcItem {
                code: "C1".into(),
                value: 10.0,
            },
        ];
        let results = analyze_abc(&items);
        let summary = summarize_abc(&results);
        // total = 100，analyze_abc 内部按价值降序处理
        // A1: 50/100=50% → A
        // A2: 75/100=75% → A
        // B1: 90/100=90% → B
        // C1: 100/100=100% → C
        assert_eq!(summary.a_count, 2);
        assert_eq!(summary.b_count, 1);
        assert_eq!(summary.c_count, 1);
        assert!(approx_eq(summary.a_value, 75.0));
        assert!(approx_eq(summary.b_value, 15.0));
        assert!(approx_eq(summary.c_value, 10.0));
        assert!(approx_eq(summary.total_value, 100.0));
        assert_eq!(summary.total_count, 4);
    }

    // ========== 扩展覆盖：边界值与结构 ==========

    #[test]
    fn test_calculate_discrepancy_negative_inputs() {
        // 系统量与盘点量都为负：仍按公式计算
        let (diff, dtype) = calculate_discrepancy(-50.0, -30.0);
        assert!(approx_eq(diff, 20.0));
        assert_eq!(dtype, "over");
    }

    #[test]
    fn test_calculate_discrepancy_value_zero_price() {
        // 单价为 0 → 差异金额为 0
        assert_eq!(calculate_discrepancy_value(100.0, 0.0), 0.0);
        assert_eq!(calculate_discrepancy_value(-100.0, 0.0), 0.0);
    }

    #[test]
    fn test_calculate_variance_rate_negative_discrepancy() {
        // 差异量为负，绝对值后仍为正百分比
        let r = calculate_variance_rate(-5.0, 100.0);
        assert!(approx_eq(r, 5.0));
    }

    #[test]
    fn test_calculate_accuracy_rate_negative_total_returns_zero() {
        // total_items <= 0 → 除零保护
        assert_eq!(calculate_accuracy_rate(5, 0), 0.0);
        assert_eq!(calculate_accuracy_rate(5, -10), 0.0);
    }

    #[test]
    fn test_calculate_completion_rate_negative_total_returns_zero() {
        assert_eq!(calculate_completion_rate(5, 0), 0.0);
        assert_eq!(calculate_completion_rate(5, -10), 0.0);
    }

    #[test]
    fn test_summarize_discrepancies_single_uncounted() {
        let items = vec![DiscrepancyItem {
            system_quantity: 100.0,
            counted_quantity: None,
            unit_price: 10.0,
        }];
        let s = summarize_discrepancies(&items);
        assert_eq!(s.total_items, 1);
        assert_eq!(s.counted_items, 0);
        assert_eq!(s.uncounted_count, 1);
        assert_eq!(s.accurate_items, 0);
        assert_eq!(s.completion_rate, 0.0);
        assert_eq!(s.accuracy_rate, 0.0);
    }

    #[test]
    fn test_classify_abc_negative_input_returns_a() {
        // 负百分比 < 80 → A（半开区间 [0, 80) 实际接受任意 < 80 的值）
        assert_eq!(classify_abc(-1.0), "A");
        assert_eq!(classify_abc(-100.0), "A");
    }

    #[test]
    fn test_classify_abc_just_below_a_threshold() {
        // 79.999 仍归 A（半开区间 [0, 80)）
        assert_eq!(classify_abc(79.999), "A");
    }

    #[test]
    fn test_discrepancy_item_partial_eq() {
        let a = DiscrepancyItem {
            system_quantity: 10.0,
            counted_quantity: Some(8.0),
            unit_price: 1.5,
        };
        let b = a.clone();
        assert_eq!(a, b);
        let c = DiscrepancyItem {
            system_quantity: 10.0,
            counted_quantity: None,
            unit_price: 1.5,
        };
        assert_ne!(a, c);
    }

    #[test]
    fn test_abc_result_partial_eq_with_clone() {
        let r = AbcResult {
            code: "X".into(),
            value: 100.0,
            cumulative_percentage: 50.0,
            category: "A",
        };
        assert_eq!(r, r.clone());
    }

    #[test]
    fn test_abc_summary_partial_eq_with_clone() {
        let s = AbcSummary {
            a_count: 1,
            b_count: 2,
            c_count: 3,
            a_value: 100.0,
            b_value: 50.0,
            c_value: 10.0,
            total_value: 160.0,
            total_count: 6,
        };
        assert_eq!(s, s.clone());
    }
}
