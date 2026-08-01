#!/usr/bin/env python3
"""Apply uncertainty.rs fixes: insert pure functions + refactor handlers."""
PATH = "/Users/air/TOPEMS/svc/lims/src/modules/uncertainty.rs"

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

def must_replace(s, old, new, label):
    assert s.count(old) == 1, "anchor %s count=%d" % (label, s.count(old))
    return s.replace(old, new, 1)

PURE = r'''
// ============ 测量不确定度计算纯函数（pub 便于单元测试）============
//
// 以下函数为 GUM（《测量不确定度表示指南》）评定流程的纯函数实现，
// 不依赖运行时/数据库，可独立单元测试。原 handler 内联数学逻辑已抽取
// 到此处，handler 通过调用这些函数完成计算。

/// 统计计算错误类型
#[derive(Debug, Clone, PartialEq)]
pub enum StatError {
    EmptyInput,
    InsufficientData { min_required: usize, actual: usize },
    NonFiniteValue { index: usize },
}

/// A 类评定结果
#[derive(Debug, Clone, PartialEq)]
pub struct TypeAResult {
    pub mean: f64,
    pub sample_std_dev: f64,
    pub standard_uncertainty: f64,
    pub relative_uncertainty: Option<f64>,
    pub degrees_of_freedom: i64,
}

/// A 类评定（统计法）
///
/// `measurements` 长度需 ≥ 2，否则返回 `InsufficientData`（修复 P0-3：
/// 单次测量无法计算样本标准差，应拒绝而非静默返回 u=0）。
pub fn type_a_uncertainty(measurements: &[f64]) -> Result<TypeAResult, StatError> {
    if measurements.is_empty() {
        return Err(StatError::EmptyInput);
    }
    for (i, v) in measurements.iter().enumerate() {
        if !v.is_finite() {
            return Err(StatError::NonFiniteValue { index: i });
        }
    }
    let n = measurements.len();
    if n < 2 {
        return Err(StatError::InsufficientData {
            min_required: 2,
            actual: n,
        });
    }
    let mean = measurements.iter().sum::<f64>() / n as f64;
    let variance: f64 = measurements
        .iter()
        .map(|x| (x - mean).powi(2))
        .sum::<f64>()
        / (n - 1) as f64;
    let std_dev = variance.sqrt();
    let u = std_dev / (n as f64).sqrt();
    // 修复 P0-4：relative_uncertainty 现在真正被赋值
    let rel = if mean.abs() > f64::EPSILON {
        Some(u / mean.abs())
    } else {
        None
    };
    Ok(TypeAResult {
        mean,
        sample_std_dev: std_dev,
        standard_uncertainty: u,
        relative_uncertainty: rel,
        degrees_of_freedom: (n - 1) as i64,
    })
}

/// B 类分布类型
#[derive(Debug, Clone, PartialEq)]
pub enum DistributionType {
    Normal,
    Uniform,
    Triangular,
    Arcsine,
}

impl DistributionType {
    pub fn divisor(&self) -> f64 {
        match self {
            DistributionType::Normal => 1.0,
            DistributionType::Uniform => 3.0_f64.sqrt(),
            DistributionType::Triangular => 6.0_f64.sqrt(),
            DistributionType::Arcsine => 2.0_f64.sqrt(),
        }
    }

    pub fn from_str(s: &str) -> DistributionType {
        match s.to_lowercase().as_str() {
            "uniform" | "rectangular" => DistributionType::Uniform,
            "triangular" => DistributionType::Triangular,
            "arcsine" => DistributionType::Arcsine,
            _ => DistributionType::Normal,
        }
    }
}

/// B 类评定：`u = uncertainty_value / divisor`
///
/// 修复 P0-2：分布除数不再硬编码，由 `DistributionType::divisor()` 统一提供。
/// 负值视为无效输入，返回 0。
pub fn type_b_uncertainty(uncertainty_value: f64, distribution: DistributionType) -> f64 {
    if uncertainty_value < 0.0 {
        return 0.0;
    }
    let divisor = distribution.divisor();
    if divisor == 0.0 {
        return 0.0;
    }
    uncertainty_value / divisor
}

/// 不确定度分量（用于合成）
#[derive(Debug, Clone, PartialEq)]
pub struct UncertaintyContribution {
    pub standard_uncertainty: f64,
    pub sensitivity_coefficient: f64,
    pub degrees_of_freedom: f64,
}

/// 合成 + 扩展结果
#[derive(Debug, Clone, PartialEq)]
pub struct CombinedResult {
    pub combined_uncertainty: f64,
    pub effective_dof: f64,
    pub coverage_factor: f64,
    pub expanded_uncertainty: f64,
    pub contribution_percentages: Vec<f64>,
}

/// t 分布分位数查表（双侧置信水平）
///
/// 覆盖 ν=1..30, 40, 60, 120, ∞；线性插值。
/// `confidence_level` 取 0.90 / 0.95 / 0.99 三档（按 ≤ 阈值归档）。
pub fn t_ppf(dof: f64, confidence_level: f64) -> f64 {
    // (dof, t_0.90, t_0.95, t_0.99)
    let table: &[(f64, f64, f64, f64)] = &[
        (1.0, 6.314, 12.706, 63.657),
        (2.0, 2.920, 4.303, 9.925),
        (3.0, 2.353, 3.182, 5.841),
        (4.0, 2.132, 2.776, 4.604),
        (5.0, 2.015, 2.571, 4.032),
        (6.0, 1.943, 2.447, 3.707),
        (7.0, 1.895, 2.365, 3.499),
        (8.0, 1.860, 2.306, 3.355),
        (9.0, 1.833, 2.262, 3.250),
        (10.0, 1.812, 2.228, 3.169),
        (15.0, 1.753, 2.131, 2.947),
        (20.0, 1.725, 2.086, 2.845),
        (25.0, 1.708, 2.060, 2.787),
        (30.0, 1.697, 2.042, 2.750),
        (40.0, 1.684, 2.021, 2.704),
        (60.0, 1.671, 2.000, 2.660),
        (120.0, 1.658, 1.980, 2.617),
        (f64::INFINITY, 1.645, 1.960, 2.576),
    ];

    let col_idx: usize = if confidence_level <= 0.90 {
        1
    } else if confidence_level <= 0.95 {
        2
    } else {
        3
    };

    let get_t = |row: &(f64, f64, f64, f64)| -> f64 {
        match col_idx {
            1 => row.1,
            2 => row.2,
            _ => row.3,
        }
    };

    if dof >= 120.0 || dof.is_infinite() {
        return get_t(table.last().unwrap());
    }
    if dof <= 1.0 {
        return get_t(&table[0]);
    }

    let mut prev = &table[0];
    for curr in table.iter().skip(1) {
        if dof <= curr.0 {
            let ratio = (dof - prev.0) / (curr.0 - prev.0);
            let prev_t = get_t(prev);
            let curr_t = get_t(curr);
            return prev_t + ratio * (curr_t - prev_t);
        }
        prev = curr;
    }
    get_t(table.last().unwrap())
}

/// 合成不确定度 + 扩展不确定度（GUM 完整流程）
///
/// 修复 P0-1：扩展不确定度的包含因子 k 由 t 分布查表得到
/// （`k = t_p(ν_eff)`），而非固定取 2.0。
pub fn combine_and_expand(
    contributions: &[UncertaintyContribution],
    confidence_level: f64,
    default_k: f64,
) -> CombinedResult {
    if contributions.is_empty() {
        return CombinedResult {
            combined_uncertainty: 0.0,
            effective_dof: 0.0,
            coverage_factor: default_k,
            expanded_uncertainty: 0.0,
            contribution_percentages: vec![],
        };
    }

    // u_c = sqrt(Σ(c_i · u_i)²)
    let contributions_y: Vec<f64> = contributions
        .iter()
        .map(|c| c.sensitivity_coefficient * c.standard_uncertainty)
        .collect();
    let sum_sq: f64 = contributions_y.iter().map(|y| y.powi(2)).sum();
    let u_c = sum_sq.sqrt();

    // 各分量占比 %
    let total_sq = sum_sq;
    let contribution_percentages: Vec<f64> = contributions_y
        .iter()
        .map(|y| if total_sq > 0.0 { (y.powi(2) / total_sq) * 100.0 } else { 0.0 })
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

    // k = t_p(ν_eff)（修复 P0-1）
    let k = if effective_dof.is_infinite() || effective_dof >= 120.0 {
        t_ppf(f64::INFINITY, confidence_level)
    } else if effective_dof < 1.0 {
        default_k
    } else {
        t_ppf(effective_dof, confidence_level)
    };

    let expanded = u_c * k;

    CombinedResult {
        combined_uncertainty: u_c,
        effective_dof,
        coverage_factor: k,
        expanded_uncertainty: expanded,
        contribution_percentages,
    }
}
'''

anchor1 = "use crate::shared::AppState;\n\npub fn create_routes() -> Router<AppState> {"
replace1 = "use crate::shared::AppState;\n" + PURE + "\npub fn create_routes() -> Router<AppState> {"
src = must_replace(src, anchor1, replace1, "anchor1")

# 2. type_a inline math
anchor2 = '''    if req.measurements.is_empty() {
        return Json(ApiResponse::error(400, "测量数据不能为空"));
    }

    let n = req.measurements.len() as f64;
    let mean = req.measurements.iter().sum::<f64>() / n;

    let variance = if n > 1.0 {
        req.measurements
            .iter()
            .map(|x| (x - mean).powi(2))
            .sum::<f64>()
            / (n - 1.0)
    } else {
        0.0
    };

    let std_dev = variance.sqrt();
    let standard_uncertainty = if n > 0.0 { std_dev / n.sqrt() } else { 0.0 };
    let degrees_freedom = if n > 1.0 { n - 1.0 } else { 0.0 };
    let sensitivity_coeff = req.sensitivity_coefficient.unwrap_or(1.0);

    let params = serde_json::json!({
        "measurements": req.measurements,
        "mean": mean,
        "standard_deviation": std_dev,
        "count": n
    });'''
replace2 = '''    // 调用纯函数完成 A 类评定（修复 P0-3：n<2 拒绝；P0-4：计算 relative_uncertainty）
    let calc = match type_a_uncertainty(&req.measurements) {
        Ok(r) => r,
        Err(StatError::EmptyInput) => {
            return Json(ApiResponse::error(400, "测量数据不能为空"));
        }
        Err(StatError::InsufficientData { actual, .. }) => {
            return Json(ApiResponse::error(
                400,
                &format!("测量数据不足，至少需要 2 次测量，实际 {} 次", actual),
            ));
        }
        Err(StatError::NonFiniteValue { index }) => {
            return Json(ApiResponse::error(
                400,
                &format!("测量数据第 {} 项为非有限值（NaN/Infinity）", index + 1),
            ));
        }
    };

    let n = req.measurements.len() as f64;
    let standard_uncertainty = calc.standard_uncertainty;
    let relative_uncertainty = calc.relative_uncertainty;
    let degrees_freedom = calc.degrees_of_freedom as f64;
    let sensitivity_coeff = req.sensitivity_coefficient.unwrap_or(1.0);

    let params = serde_json::json!({
        "measurements": req.measurements,
        "mean": calc.mean,
        "standard_deviation": calc.sample_std_dev,
        "count": n
    });'''
src = must_replace(src, anchor2, replace2, "anchor2")

# 2b. type_a INSERT add relative_uncertainty
anchor2b = '''        INSERT INTO qa_lims_uncertainty_components (
            project_id, source_id, component_type, component_name,
            standard_uncertainty, sensitivity_coefficient, degrees_freedom,
            calculation_method, parameters
        ) VALUES ($1, $2, 'type_a', $3, $4, $5, $6, 'statistics', $7)
        RETURNING id, project_id, source_id, NULL as source_name, component_type,
                  component_name, standard_uncertainty, relative_uncertainty,
                  sensitivity_coefficient, degrees_freedom, calculation_method,
                  parameters, description, created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(project_id)
    .bind(source_id)
    .bind(&req.component_name)
    .bind(standard_uncertainty)
    .bind(sensitivity_coeff)
    .bind(degrees_freedom)
    .bind(&params)'''
replace2b = '''        INSERT INTO qa_lims_uncertainty_components (
            project_id, source_id, component_type, component_name,
            standard_uncertainty, relative_uncertainty, sensitivity_coefficient, degrees_freedom,
            calculation_method, parameters
        ) VALUES ($1, $2, 'type_a', $3, $4, $5, $6, $7, 'statistics', $8)
        RETURNING id, project_id, source_id, NULL as source_name, component_type,
                  component_name, standard_uncertainty, relative_uncertainty,
                  sensitivity_coefficient, degrees_freedom, calculation_method,
                  parameters, description, created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(project_id)
    .bind(source_id)
    .bind(&req.component_name)
    .bind(standard_uncertainty)
    .bind(relative_uncertainty)
    .bind(sensitivity_coeff)
    .bind(degrees_freedom)
    .bind(&params)'''
src = must_replace(src, anchor2b, replace2b, "anchor2b")

# 3. type_b divisor
anchor3 = '''    let divisor = match req.distribution_type.as_str() {
        "normal" => 1.0,
        "rectangular" | "uniform" => 3.0_f64.sqrt(),
        "triangular" => 6.0_f64.sqrt(),
        "arcsine" => 2.0_f64.sqrt(),
        _ => 3.0_f64.sqrt(),
    };

    let standard_uncertainty = req.uncertainty_value / divisor;'''
replace3 = '''    // 调用纯函数完成 B 类评定（修复 P0-2：除数由 DistributionType 统一管理）
    let distribution = DistributionType::from_str(&req.distribution_type);
    let divisor = distribution.divisor();
    let standard_uncertainty = type_b_uncertainty(req.uncertainty_value, distribution);'''
src = must_replace(src, anchor3, replace3, "anchor3")

# 4. combined inline math
anchor4 = '''    let mut combined_var = 0.0;
    let mut numerator = 0.0;
    let mut denominator = 0.0;

    for row in &components {
        let u: Option<f64> = row.get("standard_uncertainty");
        let c: Option<f64> = row.get("sensitivity_coefficient");
        let v: Option<f64> = row.get("degrees_freedom");

        let ui = u.unwrap_or(0.0);
        let ci = c.unwrap_or(1.0);
        let vi = v.unwrap_or(f64::INFINITY);

        let uici = ci * ui;
        combined_var += uici.powi(2);

        if vi.is_finite() && vi > 0.0 && uici > 0.0 {
            numerator += uici.powi(4);
            denominator += uici.powi(4) / vi;
        }
    }

    let combined_uncertainty = combined_var.sqrt();
    let effective_dof = if denominator > 0.0 {
        numerator / denominator
    } else {
        f64::INFINITY
    };

    let project_row =
        sqlx::query("SELECT coverage_factor FROM qa_lims_uncertainty_projects WHERE id = $1")
            .bind(id)
            .fetch_optional(&state.pool)
            .await;

    let coverage_factor = match project_row {
        Ok(Some(row)) => row.get::<Option<f64>, _>("coverage_factor").unwrap_or(2.0),
        _ => 2.0,
    };

    let expanded_uncertainty = combined_uncertainty * coverage_factor;'''
replace4 = '''    // 构建纯函数输入分量
    let mut contributions: Vec<UncertaintyContribution> = Vec::with_capacity(components.len());
    for row in &components {
        let u: Option<f64> = row.get("standard_uncertainty");
        let c: Option<f64> = row.get("sensitivity_coefficient");
        let v: Option<f64> = row.get("degrees_freedom");
        contributions.push(UncertaintyContribution {
            standard_uncertainty: u.unwrap_or(0.0),
            sensitivity_coefficient: c.unwrap_or(1.0),
            degrees_of_freedom: v.unwrap_or(f64::INFINITY),
        });
    }

    let project_row =
        sqlx::query("SELECT coverage_factor, confidence_level FROM qa_lims_uncertainty_projects WHERE id = $1")
            .bind(id)
            .fetch_optional(&state.pool)
            .await;

    let (default_k, confidence_pct) = match project_row {
        Ok(Some(row)) => (
            row.get::<Option<f64>, _>("coverage_factor").unwrap_or(2.0),
            row.get::<Option<f64>, _>("confidence_level").unwrap_or(95.0),
        ),
        _ => (2.0, 95.0),
    };

    // 置信水平由百分比换算为小数（95.0 -> 0.95）
    let confidence_level = (confidence_pct / 100.0).clamp(0.0, 1.0);
    // 调用纯函数完成合成 + 扩展（修复 P0-1：k 按 t 分布查表）
    let combined = combine_and_expand(&contributions, confidence_level, default_k);

    let combined_uncertainty = combined.combined_uncertainty;
    let effective_dof = combined.effective_dof;
    let coverage_factor = combined.coverage_factor;
    let expanded_uncertainty = combined.expanded_uncertainty;'''
src = must_replace(src, anchor4, replace4, "anchor4")

# 4b. UPDATE add coverage_factor
anchor4b = '''        UPDATE qa_lims_uncertainty_projects 
        SET combined_uncertainty = $2, expanded_uncertainty = $3, updated_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(id)
    .bind(combined_uncertainty)
    .bind(expanded_uncertainty)
    .execute(&state.pool)
    .await;'''
replace4b = '''        UPDATE qa_lims_uncertainty_projects
        SET combined_uncertainty = $2, expanded_uncertainty = $3, coverage_factor = $4, updated_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(id)
    .bind(combined_uncertainty)
    .bind(expanded_uncertainty)
    .bind(coverage_factor)
    .execute(&state.pool)
    .await;
    // TODO(P1-3): effective_dof 当前仅出现在 JSON 响应中。qa_lims_uncertainty_projects
    //   表无 effective_dof 列，受「不修改数据库 schema」约束暂不持久化；
    //   如需持久化，请新增一列 effective_degrees_of_freedom DECIMAL(18,6) 并在此 UPDATE 写入。'''
src = must_replace(src, anchor4b, replace4b, "anchor4b")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print("OK: all replacements applied")
