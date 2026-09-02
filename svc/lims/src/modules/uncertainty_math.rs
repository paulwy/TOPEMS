//! 测量不确定度计算纯函数模块（GUM 方法）
//! 参考：JJF 1059.1-2012 测量不确定度评定与表示

use std::f64;

#[derive(Debug, Clone, PartialEq)]
pub enum StatError {
    EmptyInput,
    InsufficientData { min_required: usize, actual: usize },
    NonFiniteValue { index: usize },
}

impl std::fmt::Display for StatError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            StatError::EmptyInput => write!(f, "input data is empty"),
            StatError::InsufficientData {
                min_required,
                actual,
            } => write!(
                f,
                "insufficient data: need at least {}, got {}",
                min_required, actual
            ),
            StatError::NonFiniteValue { index } => write!(f, "non-finite value at index {}", index),
        }
    }
}

impl std::error::Error for StatError {}

#[derive(Debug, Clone, PartialEq)]
pub struct DescriptiveStats {
    pub n: usize,
    pub mean: f64,
    pub sample_std_dev: f64,
    pub rsd_pct: f64, // 相对标准偏差 %
    pub cv_pct: f64,  // 变异系数 %
    pub min: f64,
    pub max: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct TypeAResult {
    pub mean: f64,
    pub sample_std_dev: f64,
    pub standard_uncertainty: f64, // u(x̄) = s/√n
    pub relative_uncertainty: Option<f64>,
    pub degrees_of_freedom: f64, // ν = n-1
    pub confidence_interval: Option<(f64, f64)>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct TypeBResult {
    pub standard_uncertainty: f64,
    pub divisor: f64,
    pub distribution: String,
    pub degrees_of_freedom: f64, // 默认 ∞
}

#[derive(Debug, Clone, PartialEq)]
pub struct UncertaintyContribution {
    pub standard_uncertainty: f64,    // u_i
    pub sensitivity_coefficient: f64, // c_i
    pub degrees_of_freedom: f64,      // ν_i，∞ 用 f64::INFINITY
}

#[derive(Debug, Clone, PartialEq)]
pub struct CombinedResult {
    pub combined_uncertainty: f64,
    pub effective_dof: f64,
    pub coverage_factor: f64,
    pub expanded_uncertainty: f64,
    pub contribution_percentages: Vec<f64>,
}

/// 描述性统计
pub fn descriptive_stats(data: &[f64]) -> Result<DescriptiveStats, StatError> {
    if data.is_empty() {
        return Err(StatError::EmptyInput);
    }
    for (i, &v) in data.iter().enumerate() {
        if !v.is_finite() {
            return Err(StatError::NonFiniteValue { index: i });
        }
    }
    let n = data.len();
    let mean = data.iter().sum::<f64>() / n as f64;
    let sample_std_dev = if n < 2 {
        0.0
    } else {
        let variance = data.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / (n - 1) as f64;
        variance.sqrt()
    };
    let rsd_pct = if mean.abs() < f64::EPSILON {
        0.0
    } else {
        (sample_std_dev / mean.abs()) * 100.0
    };
    let cv_pct = rsd_pct; // CV 与 RSD 同义
    let min = data.iter().cloned().fold(f64::INFINITY, f64::min);
    let max = data.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    Ok(DescriptiveStats {
        n,
        mean,
        sample_std_dev,
        rsd_pct,
        cv_pct,
        min,
        max,
    })
}

/// A 类评定
pub fn type_a_uncertainty(
    measurements: &[f64],
    confidence_level: Option<f64>,
) -> Result<TypeAResult, StatError> {
    if measurements.is_empty() {
        return Err(StatError::EmptyInput);
    }
    if measurements.len() < 2 {
        return Err(StatError::InsufficientData {
            min_required: 2,
            actual: measurements.len(),
        });
    }
    for (i, &v) in measurements.iter().enumerate() {
        if !v.is_finite() {
            return Err(StatError::NonFiniteValue { index: i });
        }
    }
    let n = measurements.len();
    let stats = descriptive_stats(measurements)?;
    let mean = stats.mean;
    let sample_std_dev = stats.sample_std_dev;
    let standard_uncertainty = sample_std_dev / (n as f64).sqrt();
    let relative_uncertainty = if mean.abs() < f64::EPSILON {
        None
    } else {
        Some(standard_uncertainty / mean.abs())
    };
    let degrees_of_freedom = (n - 1) as f64;

    let confidence_interval = confidence_level.and_then(|cl| {
        let k = t_ppf(degrees_of_freedom, cl);
        Some((
            mean - k * standard_uncertainty,
            mean + k * standard_uncertainty,
        ))
    });

    Ok(TypeAResult {
        mean,
        sample_std_dev,
        standard_uncertainty,
        relative_uncertainty,
        degrees_of_freedom,
        confidence_interval,
    })
}

/// B 类评定
pub fn type_b_uncertainty(value: f64, distribution: &str) -> Result<TypeBResult, StatError> {
    if !value.is_finite() {
        return Err(StatError::NonFiniteValue { index: 0 });
    }
    let divisor = match distribution.to_lowercase().as_str() {
        "normal" | "正态" => 1.0, // 假定输入已是标准不确定度
        "rectangular" | "uniform" | "均匀" | "矩形" => 3f64.sqrt(),
        "triangular" | "三角" | "三角形" => 6f64.sqrt(),
        "arcsine" | "反正弦" | "u形" | "u" => 2f64.sqrt(),
        _ => 1.0,
    };
    let standard_uncertainty = if divisor > 0.0 { value / divisor } else { 0.0 };
    Ok(TypeBResult {
        standard_uncertainty,
        divisor,
        distribution: distribution.to_string(),
        degrees_of_freedom: f64::INFINITY,
    })
}

/// 合成不确定度 + 扩展不确定度（GUM 完整流程）
pub fn combine_and_expand(
    contributions: &[UncertaintyContribution],
    confidence_level: f64,
) -> Result<CombinedResult, StatError> {
    if contributions.is_empty() {
        return Ok(CombinedResult {
            combined_uncertainty: 0.0,
            effective_dof: f64::INFINITY,
            coverage_factor: t_ppf(f64::INFINITY, confidence_level),
            expanded_uncertainty: 0.0,
            contribution_percentages: vec![],
        });
    }
    // u_c = sqrt(Σ(c_i·u_i)²)
    let contributions_y: Vec<f64> = contributions
        .iter()
        .map(|c| c.sensitivity_coefficient * c.standard_uncertainty)
        .collect();
    let sum_sq: f64 = contributions_y.iter().map(|y| y * y).sum();
    let combined_uncertainty = sum_sq.sqrt();

    // 贡献百分比
    let total_sq = sum_sq;
    let contribution_percentages: Vec<f64> = contributions_y
        .iter()
        .map(|y| {
            if total_sq > 0.0 {
                (y * y / total_sq) * 100.0
            } else {
                0.0
            }
        })
        .collect();

    // Welch-Satterthwaite 有效自由度
    let numerator: f64 = contributions_y.iter().map(|y| y.powi(4)).sum();
    let denominator: f64 = contributions
        .iter()
        .zip(contributions_y.iter())
        .map(|(c, y)| {
            if c.degrees_of_freedom.is_infinite() || c.degrees_of_freedom == 0.0 {
                0.0
            } else {
                y.powi(4) / c.degrees_of_freedom
            }
        })
        .sum();
    let effective_dof = if denominator > 0.0 {
        numerator / denominator
    } else {
        f64::INFINITY
    };

    // k = t_p(ν_eff)
    let coverage_factor = t_ppf(effective_dof, confidence_level);
    let expanded_uncertainty = combined_uncertainty * coverage_factor;

    Ok(CombinedResult {
        combined_uncertainty,
        effective_dof,
        coverage_factor,
        expanded_uncertainty,
        contribution_percentages,
    })
}

/// t 分布分位数查表（双侧置信水平）
/// confidence_level: 0.90 / 0.95 / 0.99 等
/// 返回双侧 t 值，如 95% 置信 ν=9 → 2.262
pub fn t_ppf(dof: f64, confidence_level: f64) -> f64 {
    // α/2 = (1 - confidence_level) / 2
    let alpha_half = (1.0 - confidence_level) / 2.0;
    let _ = alpha_half; // 标记未使用

    // 标准双侧 t 分布分位数表（95% 置信水平）
    // 来源：标准统计学教材 t 分布表
    if dof.is_infinite() || dof > 100.0 {
        // ν=∞ 退化为正态分布
        return match confidence_level {
            cl if (cl - 0.90).abs() < 0.001 => 1.645,
            cl if (cl - 0.95).abs() < 0.001 => 1.960,
            cl if (cl - 0.99).abs() < 0.001 => 2.576,
            _ => 1.960, // 默认 95%
        };
    }

    // 95% 置信水平的 t 表（双侧）
    let t_95: [(f64, f64); 30] = [
        (1.0, 12.706),
        (2.0, 4.303),
        (3.0, 3.182),
        (4.0, 2.776),
        (5.0, 2.571),
        (6.0, 2.447),
        (7.0, 2.365),
        (8.0, 2.306),
        (9.0, 2.262),
        (10.0, 2.228),
        (12.0, 2.179),
        (15.0, 2.131),
        (20.0, 2.086),
        (25.0, 2.060),
        (30.0, 2.042),
        (40.0, 2.021),
        (50.0, 2.009),
        (60.0, 2.000),
        (80.0, 1.990),
        (100.0, 1.984),
        (1.5, 4.768),
        (2.5, 3.699),
        (3.5, 2.951),
        (4.5, 2.648),
        (5.5, 2.498),
        (6.5, 2.402),
        (7.5, 2.330),
        (8.5, 2.275),
        (9.5, 2.239),
        (11.0, 2.201),
    ];

    // 90% 置信水平
    let t_90: [(f64, f64); 12] = [
        (1.0, 6.314),
        (2.0, 2.920),
        (3.0, 2.353),
        (4.0, 2.132),
        (5.0, 2.015),
        (6.0, 1.943),
        (7.0, 1.895),
        (8.0, 1.860),
        (9.0, 1.833),
        (10.0, 1.812),
        (15.0, 1.753),
        (30.0, 1.697),
    ];

    // 99% 置信水平
    let t_99: [(f64, f64); 12] = [
        (1.0, 63.657),
        (2.0, 9.925),
        (3.0, 5.841),
        (4.0, 4.604),
        (5.0, 4.032),
        (6.0, 3.707),
        (7.0, 3.499),
        (8.0, 3.355),
        (9.0, 3.250),
        (10.0, 3.169),
        (15.0, 2.947),
        (30.0, 2.750),
    ];

    let table: &[(f64, f64)] = match confidence_level {
        cl if (cl - 0.90).abs() < 0.001 => &t_90,
        cl if (cl - 0.95).abs() < 0.001 => &t_95,
        cl if (cl - 0.99).abs() < 0.001 => &t_99,
        _ => &t_95,
    };

    // 线性插值
    if dof <= table[0].0 {
        return table[0].1;
    }
    for i in 1..table.len() {
        if dof <= table[i].0 {
            let (x0, y0) = table[i - 1];
            let (x1, y1) = table[i];
            return y0 + (y1 - y0) * (dof - x0) / (x1 - x0);
        }
    }
    // 超出表范围，返回最后一个值或正态近似
    let last = table.last().copied().unwrap_or((30.0, 1.960));
    let normal = match confidence_level {
        cl if (cl - 0.90).abs() < 0.001 => 1.645,
        cl if (cl - 0.95).abs() < 0.001 => 1.960,
        cl if (cl - 0.99).abs() < 0.001 => 2.576,
        _ => 1.960,
    };
    // 在最后表值与正态极限值之间插值
    if dof > last.0 {
        let extra = (dof - last.0) / 50.0; // 50 为衰减系数
        last.1 + (normal - last.1) * extra.min(1.0)
    } else {
        last.1
    }
}

/// Grubbs 检验（异常值剔除）
/// 返回离群值的索引列表（α=0.05 双侧）
pub fn grubbs_test(data: &[f64], alpha: f64) -> Result<Vec<usize>, StatError> {
    if data.is_empty() {
        return Err(StatError::EmptyInput);
    }
    if data.len() < 3 {
        return Ok(vec![]); // 数据太少不做检验
    }
    for (i, &v) in data.iter().enumerate() {
        if !v.is_finite() {
            return Err(StatError::NonFiniteValue { index: i });
        }
    }
    let stats = descriptive_stats(data)?;
    let mean = stats.mean;
    let std_dev = stats.sample_std_dev;
    if std_dev < f64::EPSILON {
        return Ok(vec![]); // 所有值相同，无离群点
    }

    // Grubbs 临界值表（α=0.05 双侧）
    let critical_value = grubbs_critical_value(data.len(), alpha);

    // 计算每个点的 Grubbs 统计量 G = |x - mean| / std_dev
    let mut outliers: Vec<usize> = vec![];
    for (i, &v) in data.iter().enumerate() {
        let g = (v - mean).abs() / std_dev;
        if g > critical_value {
            outliers.push(i);
        }
    }
    Ok(outliers)
}

/// Grubbs 临界值（双侧 α=0.05）
fn grubbs_critical_value(n: usize, alpha: f64) -> f64 {
    // 简化的临界值表（α=0.05 双侧）
    let table_alpha_05: [(usize, f64); 14] = [
        (3, 1.155),
        (4, 1.481),
        (5, 1.715),
        (6, 1.887),
        (7, 2.020),
        (8, 2.126),
        (9, 2.215),
        (10, 2.290),
        (12, 2.412),
        (15, 2.549),
        (20, 2.708),
        (25, 2.817),
        (30, 2.892),
        (50, 3.082),
    ];

    let table: &[(usize, f64)] = if (alpha - 0.05).abs() < 0.001 {
        &table_alpha_05
    } else {
        &table_alpha_05 // 默认用 0.05
    };

    if n <= table[0].0 {
        return table[0].1;
    }
    for i in 1..table.len() {
        if n <= table[i].0 {
            let (x0, y0) = (table[i - 1].0 as f64, table[i - 1].1);
            let (x1, y1) = (table[i].0 as f64, table[i].1);
            return y0 + (y1 - y0) * (n as f64 - x0) / (x1 - x0);
        }
    }
    table.last().map(|e| e.1).unwrap_or(3.082)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn approx_eq(a: f64, b: f64, epsilon: f64) -> bool {
        (a - b).abs() < epsilon
    }

    #[test]
    fn test_descriptive_stats_basic() {
        let data = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let s = descriptive_stats(&data).unwrap();
        assert_eq!(s.n, 5);
        assert!(approx_eq(s.mean, 3.0, 1e-9));
        assert!(approx_eq(s.sample_std_dev, 1.5811, 1e-3));
        assert!(approx_eq(s.cv_pct, 52.70, 1e-2));
        assert_eq!(s.min, 1.0);
        assert_eq!(s.max, 5.0);
    }

    #[test]
    fn test_descriptive_stats_empty() {
        assert!(matches!(descriptive_stats(&[]), Err(StatError::EmptyInput)));
    }

    #[test]
    fn test_descriptive_stats_single() {
        let s = descriptive_stats(&[5.0]).unwrap();
        assert_eq!(s.n, 1);
        assert_eq!(s.sample_std_dev, 0.0);
        assert_eq!(s.mean, 5.0);
    }

    #[test]
    fn test_descriptive_stats_constant() {
        let s = descriptive_stats(&[5.0, 5.0, 5.0]).unwrap();
        assert_eq!(s.sample_std_dev, 0.0);
        assert_eq!(s.rsd_pct, 0.0);
    }

    #[test]
    fn test_type_a_basic_10_measurements() {
        let data = vec![10.0, 10.1, 9.9, 10.2, 10.1, 9.8, 10.0, 10.1, 9.9, 10.0];
        let r = type_a_uncertainty(&data, None).unwrap();
        assert!(approx_eq(r.mean, 10.01, 1e-9));
        assert!(approx_eq(r.degrees_of_freedom, 9.0, 1e-9));
        // u = s/√n, s≈0.1197, u≈0.0379
        assert!(approx_eq(r.standard_uncertainty, 0.0379, 1e-3));
    }

    #[test]
    fn test_type_a_with_confidence_interval() {
        let data = vec![10.0, 10.1, 9.9, 10.2, 10.1, 9.8, 10.0, 10.1, 9.9, 10.0];
        let r = type_a_uncertainty(&data, Some(0.95)).unwrap();
        let (low, high) = r.confidence_interval.unwrap();
        assert!(low < 10.01);
        assert!(high > 10.01);
    }

    #[test]
    fn test_type_a_single_measurement_errors() {
        assert!(matches!(
            type_a_uncertainty(&[5.0], None),
            Err(StatError::InsufficientData {
                min_required: 2,
                actual: 1
            })
        ));
    }

    #[test]
    fn test_type_a_empty_input_errors() {
        assert!(matches!(
            type_a_uncertainty(&[], None),
            Err(StatError::EmptyInput)
        ));
    }

    #[test]
    fn test_type_a_constant_data_zero_uncertainty() {
        let r = type_a_uncertainty(&[5.0; 5], None).unwrap();
        assert!(approx_eq(r.standard_uncertainty, 0.0, 1e-12));
        assert!(r.relative_uncertainty.unwrap().abs() < 1e-12);
    }

    #[test]
    fn test_type_b_normal_distribution() {
        let r = type_b_uncertainty(0.5, "normal").unwrap();
        assert!(approx_eq(r.standard_uncertainty, 0.5, 1e-9));
        assert!(approx_eq(r.divisor, 1.0, 1e-9));
        assert!(r.degrees_of_freedom.is_infinite());
    }

    #[test]
    fn test_type_b_rectangular_distribution() {
        let r = type_b_uncertainty(1.0, "rectangular").unwrap();
        assert!(approx_eq(r.standard_uncertainty, 0.5774, 1e-3)); // 1/√3
    }

    #[test]
    fn test_type_b_triangular_distribution() {
        let r = type_b_uncertainty(1.0, "triangular").unwrap();
        assert!(approx_eq(r.standard_uncertainty, 0.4082, 1e-3)); // 1/√6
    }

    #[test]
    fn test_type_b_arcsine_distribution() {
        let r = type_b_uncertainty(1.0, "arcsine").unwrap();
        assert!(approx_eq(r.standard_uncertainty, 0.7071, 1e-3)); // 1/√2
    }

    #[test]
    fn test_type_b_chinese_distribution_names() {
        let r1 = type_b_uncertainty(1.0, "均匀").unwrap();
        assert!(approx_eq(r1.standard_uncertainty, 0.5774, 1e-3));
        let r2 = type_b_uncertainty(1.0, "三角").unwrap();
        assert!(approx_eq(r2.standard_uncertainty, 0.4082, 1e-3));
    }

    #[test]
    fn test_combine_two_equal_components() {
        let cs = vec![
            UncertaintyContribution {
                standard_uncertainty: 0.1,
                sensitivity_coefficient: 1.0,
                degrees_of_freedom: 9.0,
            },
            UncertaintyContribution {
                standard_uncertainty: 0.1,
                sensitivity_coefficient: 1.0,
                degrees_of_freedom: 9.0,
            },
        ];
        let r = combine_and_expand(&cs, 0.95).unwrap();
        // u_c = √(0.1² + 0.1²) = 0.1414
        assert!(approx_eq(r.combined_uncertainty, 0.14142, 1e-4));
        // ν_eff = (0.02)² / (2·(0.01)²/9) = 9
        assert!(approx_eq(r.effective_dof, 9.0, 1e-6));
        // t_0.95(9) = 2.262
        assert!(approx_eq(r.coverage_factor, 2.262, 1e-3));
        // U = 2.262 × 0.14142 ≈ 0.3199
        assert!(approx_eq(r.expanded_uncertainty, 0.3199, 1e-3));
    }

    #[test]
    fn test_combine_with_infinite_dof_uses_normal_approx() {
        let cs = vec![
            UncertaintyContribution {
                standard_uncertainty: 0.1,
                sensitivity_coefficient: 1.0,
                degrees_of_freedom: f64::INFINITY,
            },
            UncertaintyContribution {
                standard_uncertainty: 0.1,
                sensitivity_coefficient: 1.0,
                degrees_of_freedom: f64::INFINITY,
            },
        ];
        let r = combine_and_expand(&cs, 0.95).unwrap();
        assert!(r.effective_dof.is_infinite());
        // ν=∞ 时 k 应为 1.96（双侧 95% 正态）
        assert!(approx_eq(r.coverage_factor, 1.96, 1e-2));
    }

    #[test]
    fn test_combine_small_dof_inflates_k() {
        let cs = vec![UncertaintyContribution {
            standard_uncertainty: 0.1,
            sensitivity_coefficient: 1.0,
            degrees_of_freedom: 3.0,
        }];
        let r = combine_and_expand(&cs, 0.95).unwrap();
        // t_0.95(3) = 3.182，明显大于 2.0
        assert!(r.coverage_factor > 2.5);
    }

    #[test]
    fn test_combine_empty_returns_zero() {
        let r = combine_and_expand(&[], 0.95).unwrap();
        assert_eq!(r.combined_uncertainty, 0.0);
        assert_eq!(r.expanded_uncertainty, 0.0);
    }

    #[test]
    fn test_contribution_percentage_sums_to_100() {
        let cs = vec![
            UncertaintyContribution {
                standard_uncertainty: 0.3,
                sensitivity_coefficient: 1.0,
                degrees_of_freedom: f64::INFINITY,
            },
            UncertaintyContribution {
                standard_uncertainty: 0.4,
                sensitivity_coefficient: 1.0,
                degrees_of_freedom: f64::INFINITY,
            },
        ];
        let r = combine_and_expand(&cs, 0.95).unwrap();
        let sum: f64 = r.contribution_percentages.iter().sum();
        assert!(approx_eq(sum, 100.0, 1e-6));
        // 0.4² > 0.3²，第二分量占比应更高
        assert!(r.contribution_percentages[1] > r.contribution_percentages[0]);
    }

    #[test]
    fn test_combine_with_sensitivity_coefficient() {
        let cs = vec![
            UncertaintyContribution {
                standard_uncertainty: 0.1,
                sensitivity_coefficient: 2.0,
                degrees_of_freedom: 9.0,
            },
            UncertaintyContribution {
                standard_uncertainty: 0.1,
                sensitivity_coefficient: 1.0,
                degrees_of_freedom: 9.0,
            },
        ];
        let r = combine_and_expand(&cs, 0.95).unwrap();
        // u_c = √((2·0.1)² + (1·0.1)²) = √(0.04 + 0.01) = √0.05 ≈ 0.2236
        assert!(approx_eq(r.combined_uncertainty, 0.2236, 1e-3));
        // 第一分量贡献更大（80% vs 20%）
        assert!(approx_eq(r.contribution_percentages[0], 80.0, 1e-3));
        assert!(approx_eq(r.contribution_percentages[1], 20.0, 1e-3));
    }

    #[test]
    fn test_t_ppf_infinite_dof() {
        assert!(approx_eq(t_ppf(f64::INFINITY, 0.95), 1.96, 1e-2));
        assert!(approx_eq(t_ppf(f64::INFINITY, 0.90), 1.645, 1e-2));
        assert!(approx_eq(t_ppf(f64::INFINITY, 0.99), 2.576, 1e-2));
    }

    #[test]
    fn test_t_ppf_known_values_95() {
        assert!(approx_eq(t_ppf(9.0, 0.95), 2.262, 1e-3));
        assert!(approx_eq(t_ppf(1.0, 0.95), 12.706, 1e-3));
        assert!(approx_eq(t_ppf(5.0, 0.95), 2.571, 1e-3));
    }

    #[test]
    fn test_t_ppf_interpolation() {
        // ν=10 → 2.228, ν=12 → 2.179，ν=11 应在两者之间
        let t11 = t_ppf(11.0, 0.95);
        assert!(t11 < 2.228);
        assert!(t11 > 2.179);
    }

    #[test]
    fn test_grubbs_no_outliers_in_clean_data() {
        let data = vec![10.0, 10.1, 9.9, 10.2, 10.1, 9.8, 10.0, 10.1, 9.9, 10.0];
        let outliers = grubbs_test(&data, 0.05).unwrap();
        assert!(outliers.is_empty());
    }

    #[test]
    fn test_grubbs_detects_outlier() {
        let data = vec![10.0, 10.1, 9.9, 10.2, 10.1, 9.8, 10.0, 10.1, 9.9, 15.0];
        let outliers = grubbs_test(&data, 0.05).unwrap();
        assert!(outliers.contains(&9)); // 15.0 是离群点
    }

    #[test]
    fn test_grubbs_too_few_data() {
        let outliers = grubbs_test(&[1.0, 2.0], 0.05).unwrap();
        assert!(outliers.is_empty());
    }

    #[test]
    fn test_grubbs_constant_data() {
        let outliers = grubbs_test(&[5.0, 5.0, 5.0, 5.0], 0.05).unwrap();
        assert!(outliers.is_empty());
    }

    #[test]
    fn test_end_to_end_full_gum_workflow() {
        // 端到端：A 类 + B 类 → 合成 → 扩展
        let measurements = vec![10.0, 10.1, 9.9, 10.2, 10.1, 9.8, 10.0, 10.1, 9.9, 10.0];
        let type_a = type_a_uncertainty(&measurements, None).unwrap();
        let type_b = type_b_uncertainty(0.05, "rectangular").unwrap();

        let contributions = vec![
            UncertaintyContribution {
                standard_uncertainty: type_a.standard_uncertainty,
                sensitivity_coefficient: 1.0,
                degrees_of_freedom: type_a.degrees_of_freedom,
            },
            UncertaintyContribution {
                standard_uncertainty: type_b.standard_uncertainty,
                sensitivity_coefficient: 1.0,
                degrees_of_freedom: type_b.degrees_of_freedom,
            },
        ];
        let combined = combine_and_expand(&contributions, 0.95).unwrap();

        // u_c 应大于任一单独分量
        assert!(combined.combined_uncertainty > type_a.standard_uncertainty);
        assert!(combined.combined_uncertainty > type_b.standard_uncertainty);
        // k 应在 1.96 到 2.262 之间（ν_eff 在 9 到 ∞ 之间）
        assert!(combined.coverage_factor >= 1.96);
        assert!(combined.coverage_factor <= 2.262 + 0.1);
    }
}

#[cfg(test)]
mod type_b_edge_tests {
    use super::*;

    #[test]
    fn type_b_unknown_distribution_default_divisor_one() {
        let r = type_b_uncertainty(10.0, "unknown_dist").unwrap();
        assert_eq!(r.divisor, 1.0);
        assert_eq!(r.standard_uncertainty, 10.0);
    }

    #[test]
    fn type_b_uppercase_distribution() {
        // 大小写不敏感
        let r = type_b_uncertainty(10.0, "RECTANGULAR").unwrap();
        assert!((r.divisor - 3f64.sqrt()).abs() < 1e-9);
    }

    #[test]
    fn type_b_zero_value() {
        let r = type_b_uncertainty(0.0, "rectangular").unwrap();
        assert_eq!(r.standard_uncertainty, 0.0);
    }

    #[test]
    fn type_b_non_finite_error() {
        assert!(type_b_uncertainty(f64::NAN, "normal").is_err());
        assert!(type_b_uncertainty(f64::INFINITY, "normal").is_err());
    }

    #[test]
    fn type_b_negative_value() {
        // 负值按绝对值语义处理（除数仍生效）
        let r = type_b_uncertainty(-9.0, "rectangular").unwrap();
        assert!((r.standard_uncertainty - (-9.0 / 3f64.sqrt())).abs() < 1e-9);
    }

    #[test]
    fn type_b_dof_infinite() {
        let r = type_b_uncertainty(1.0, "normal").unwrap();
        assert!(r.degrees_of_freedom.is_infinite());
    }
}
