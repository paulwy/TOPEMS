//! 销售漏斗计算纯函数模块

use rust_decimal::Decimal;

/// 计算阶段间转换率（基于存量快照，返回百分比 0-100）
/// 当 from_count == 0 返回 0.0，避免除零
pub fn calculate_stage_conversion_rate(from_count: i64, to_count: i64) -> f64 {
    if from_count == 0 {
        return 0.0;
    }
    (to_count as f64 / from_count as f64) * 100.0
}

/// 计算总体转化率（won / total，返回百分比 0-100）
pub fn calculate_overall_conversion_rate(total_count: i64, won_count: i64) -> f64 {
    if total_count == 0 {
        return 0.0;
    }
    (won_count as f64 / total_count as f64) * 100.0
}

/// 计算加权预期金额 = value × (probability / 100)
/// probability 为 None 时按 0 处理；probability > 100 时 clamp 到 100；< 0 时 clamp 到 0
pub fn calculate_weighted_value(value: Decimal, probability: Option<i32>) -> Decimal {
    let prob = probability.unwrap_or(0).clamp(0, 100);
    value * Decimal::from(prob) / Decimal::from(100)
}

#[derive(Debug, Clone, PartialEq)]
pub struct StageConversion {
    pub from_stage: String,
    pub to_stage: String,
    pub from_count: i64,
    pub to_count: i64,
    pub conversion_rate: f64,
}

/// 批量计算各阶段到下一阶段的转换率
/// 输入按 stage_order 排序的 (stage, count) 列表，返回相邻阶段转换率
pub fn calculate_conversion_chain(stage_counts: &[(&str, i64)]) -> Vec<StageConversion> {
    stage_counts
        .windows(2)
        .filter_map(|w| {
            let (from_stage, from_count) = w[0];
            let (to_stage, to_count) = w[1];
            Some(StageConversion {
                from_stage: from_stage.to_string(),
                to_stage: to_stage.to_string(),
                from_count,
                to_count,
                conversion_rate: calculate_stage_conversion_rate(from_count, to_count),
            })
        })
        .collect()
}

/// 校验概率合法性（0-100）
pub fn validate_probability(probability: i32) -> Result<i32, String> {
    if probability < 0 || probability > 100 {
        return Err(format!(
            "probability must be in [0, 100], got {}",
            probability
        ));
    }
    Ok(probability)
}

#[derive(Debug, Clone, PartialEq)]
pub struct AccuracySummary {
    pub total_records: usize,
    pub average_accuracy: f64,
    pub average_deviation: f64,
    pub max_accuracy: f64,
    pub min_accuracy: f64,
    pub high_confidence_count: usize,
}

#[derive(Debug, Clone)]
pub struct AccuracyRecord {
    pub accuracy: f64,
    pub deviation: f64,
    pub confidence_level: f64,
}

/// 准确率摘要统计（修复 min 用 max 的 bug，且空数据不除零）
pub fn summarize_accuracy(
    records: &[AccuracyRecord],
    high_confidence_threshold: f64,
) -> AccuracySummary {
    if records.is_empty() {
        return AccuracySummary {
            total_records: 0,
            average_accuracy: 0.0,
            average_deviation: 0.0,
            max_accuracy: 0.0,
            min_accuracy: 0.0,
            high_confidence_count: 0,
        };
    }
    let n = records.len();
    let sum_acc: f64 = records.iter().map(|r| r.accuracy).sum();
    let sum_dev: f64 = records.iter().map(|r| r.deviation).sum();
    let max_acc = records
        .iter()
        .map(|r| r.accuracy)
        .fold(f64::NEG_INFINITY, f64::max);
    let min_acc = records
        .iter()
        .map(|r| r.accuracy)
        .fold(f64::INFINITY, f64::min);
    let high_count = records
        .iter()
        .filter(|r| r.confidence_level >= high_confidence_threshold)
        .count();
    AccuracySummary {
        total_records: n,
        average_accuracy: sum_acc / n as f64,
        average_deviation: sum_dev / n as f64,
        max_accuracy: max_acc,
        min_accuracy: min_acc,
        high_confidence_count: high_count,
    }
}

/// 趋势分析（基于最近 N 个点的 accuracy 变化）
/// 返回 "improving" / "declining" / "stable" / "insufficient_data"
pub fn analyze_accuracy_trend(recent_accuracies: &[f64], threshold: f64) -> &'static str {
    if recent_accuracies.len() < 3 {
        return "insufficient_data";
    }
    let n = recent_accuracies.len();
    let recent_avg: f64 = recent_accuracies[n - 3..].iter().sum::<f64>() / 3.0;
    let prev_avg: f64 = if n >= 6 {
        recent_accuracies[n - 6..n - 3].iter().sum::<f64>() / 3.0
    } else if n > 3 {
        recent_accuracies[0..n - 3].iter().sum::<f64>() / (n - 3) as f64
    } else {
        // n == 3：没有更早的数据，用首个点作为基线避免除零
        recent_accuracies[0]
    };
    let diff = recent_avg - prev_avg;
    if diff > threshold {
        "improving"
    } else if diff < -threshold {
        "declining"
    } else {
        "stable"
    }
}

/// 环比变化率（百分比），prev == 0 时返回 0.0
pub fn calculate_change_rate(prev: f64, curr: f64) -> f64 {
    if prev == 0.0 {
        return 0.0;
    }
    ((curr - prev) / prev) * 100.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stage_conversion_rate_normal() {
        assert_eq!(calculate_stage_conversion_rate(100, 60), 60.0);
    }

    #[test]
    fn test_stage_conversion_rate_zero_from() {
        assert_eq!(calculate_stage_conversion_rate(0, 10), 0.0);
    }

    #[test]
    fn test_stage_conversion_rate_over_100() {
        assert_eq!(calculate_stage_conversion_rate(50, 80), 160.0);
    }

    #[test]
    fn test_overall_conversion_rate() {
        assert_eq!(calculate_overall_conversion_rate(100, 25), 25.0);
        assert_eq!(calculate_overall_conversion_rate(0, 0), 0.0);
    }

    #[test]
    fn test_weighted_value_normal() {
        let v = calculate_weighted_value(Decimal::from(1000), Some(60));
        assert_eq!(v, Decimal::from(600));
    }

    #[test]
    fn test_weighted_value_zero_probability() {
        let v = calculate_weighted_value(Decimal::from(1000), Some(0));
        assert_eq!(v, Decimal::from(0));
    }

    #[test]
    fn test_weighted_value_clamped_high() {
        let v = calculate_weighted_value(Decimal::from(1000), Some(150));
        assert_eq!(v, Decimal::from(1000));
    }

    #[test]
    fn test_weighted_value_clamped_low() {
        let v = calculate_weighted_value(Decimal::from(1000), Some(-10));
        assert_eq!(v, Decimal::from(0));
    }

    #[test]
    fn test_weighted_value_none_probability() {
        let v = calculate_weighted_value(Decimal::from(1000), None);
        assert_eq!(v, Decimal::from(0));
    }

    #[test]
    fn test_conversion_chain_full() {
        let stages = vec![
            ("prospecting", 100),
            ("qualified", 60),
            ("proposal", 30),
            ("negotiation", 15),
            ("closed_won", 6),
        ];
        let chain = calculate_conversion_chain(&stages);
        assert_eq!(chain.len(), 4);
        assert_eq!(chain[0].from_stage, "prospecting");
        assert!((chain[0].conversion_rate - 60.0).abs() < 0.001);
        assert!((chain[3].conversion_rate - 40.0).abs() < 0.001);
    }

    #[test]
    fn test_conversion_chain_empty() {
        let chain = calculate_conversion_chain(&[]);
        assert_eq!(chain.len(), 0);
    }

    #[test]
    fn test_conversion_chain_single() {
        let chain = calculate_conversion_chain(&[("prospecting", 100)]);
        assert_eq!(chain.len(), 0);
    }

    #[test]
    fn test_validate_probability_bounds() {
        assert!(validate_probability(0).is_ok());
        assert!(validate_probability(100).is_ok());
        assert!(validate_probability(50).is_ok());
        assert!(validate_probability(-1).is_err());
        assert!(validate_probability(101).is_err());
    }

    #[test]
    fn test_summarize_accuracy_normal() {
        let records = vec![
            AccuracyRecord {
                accuracy: 0.9,
                deviation: 10.0,
                confidence_level: 0.85,
            },
            AccuracyRecord {
                accuracy: 0.8,
                deviation: 20.0,
                confidence_level: 0.75,
            },
            AccuracyRecord {
                accuracy: 0.95,
                deviation: 5.0,
                confidence_level: 0.9,
            },
        ];
        let summary = summarize_accuracy(&records, 0.8);
        assert_eq!(summary.total_records, 3);
        assert!((summary.average_accuracy - 0.8833).abs() < 0.01);
        assert_eq!(summary.max_accuracy, 0.95);
        assert_eq!(summary.min_accuracy, 0.8);
        assert_eq!(summary.high_confidence_count, 2);
    }

    #[test]
    fn test_summarize_accuracy_empty_no_divide_by_zero() {
        let summary = summarize_accuracy(&[], 0.8);
        assert_eq!(summary.total_records, 0);
        assert_eq!(summary.average_accuracy, 0.0);
        assert_eq!(summary.min_accuracy, 0.0);
        assert_eq!(summary.max_accuracy, 0.0);
    }

    #[test]
    fn test_analyze_accuracy_trend_improving() {
        let recent = vec![0.7, 0.8, 0.9];
        assert_eq!(analyze_accuracy_trend(&recent, 0.01), "improving");
    }

    #[test]
    fn test_analyze_accuracy_trend_declining() {
        let recent = vec![0.9, 0.8, 0.7];
        assert_eq!(analyze_accuracy_trend(&recent, 0.01), "declining");
    }

    #[test]
    fn test_analyze_accuracy_trend_stable() {
        let recent = vec![0.8, 0.81, 0.805];
        assert_eq!(analyze_accuracy_trend(&recent, 0.01), "stable");
    }

    #[test]
    fn test_analyze_accuracy_trend_insufficient() {
        assert_eq!(analyze_accuracy_trend(&[0.8], 0.01), "insufficient_data");
        assert_eq!(analyze_accuracy_trend(&[], 0.01), "insufficient_data");
    }

    #[test]
    fn test_change_rate_zero_prev() {
        assert_eq!(calculate_change_rate(0.0, 100.0), 0.0);
    }

    #[test]
    fn test_change_rate_normal() {
        assert_eq!(calculate_change_rate(100.0, 150.0), 50.0);
        assert_eq!(calculate_change_rate(100.0, 80.0), -20.0);
    }
}
