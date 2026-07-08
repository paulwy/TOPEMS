pub fn calculate_overall_score(
    quality_score: Option<f64>,
    delivery_score: Option<f64>,
    service_score: Option<f64>,
    price_score: Option<f64>,
) -> f64 {
    let q = quality_score.unwrap_or(0.0);
    let d = delivery_score.unwrap_or(0.0);
    let s = service_score.unwrap_or(0.0);
    let p = price_score.unwrap_or(0.0);

    ((q * 30.0 + d * 25.0 + s * 25.0 + p * 20.0) / 100.0).clamp(0.0, 100.0)
}

pub fn determine_supplier_grade(overall_score: f64) -> String {
    if overall_score >= 90.0 {
        "A".to_string()
    } else if overall_score >= 80.0 {
        "B".to_string()
    } else if overall_score >= 70.0 {
        "C".to_string()
    } else if overall_score >= 60.0 {
        "D".to_string()
    } else {
        "F".to_string()
    }
}

pub fn determine_evaluation_status(overall_score: f64) -> String {
    if overall_score >= 70.0 {
        "approved".to_string()
    } else {
        "pending_review".to_string()
    }
}

pub fn calculate_score_trend(last_score: Option<f64>, current_score: f64) -> String {
    match last_score {
        Some(last) if current_score > last + 5.0 => "significantly_up".to_string(),
        Some(last) if current_score > last => "up".to_string(),
        Some(last) if current_score < last - 5.0 => "significantly_down".to_string(),
        Some(last) if current_score < last => "down".to_string(),
        _ => "stable".to_string(),
    }
}

pub fn validate_scores(
    quality_score: Option<f64>,
    delivery_score: Option<f64>,
    service_score: Option<f64>,
    price_score: Option<f64>,
) -> Result<(), String> {
    let scores = [quality_score, delivery_score, service_score, price_score];

    for (idx, score) in scores.iter().enumerate() {
        if let Some(s) = score {
            if *s < 0.0 || *s > 100.0 {
                let field_names = [
                    "quality_score",
                    "delivery_score",
                    "service_score",
                    "price_score",
                ];
                return Err(format!("{} must be between 0 and 100", field_names[idx]));
            }
        }
    }

    if scores.iter().all(|s| s.is_none()) {
        return Err("At least one score must be provided".to_string());
    }

    Ok(())
}
