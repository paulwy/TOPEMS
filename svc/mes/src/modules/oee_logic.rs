pub fn calculate_oee(
    planned_time: f64,
    run_time: f64,
    ideal_cycle_time: f64,
    actual_output: f64,
    good_output: f64,
) -> (f64, f64, f64, f64) {
    let availability = if planned_time > 0.0 {
        (run_time / planned_time) * 100.0
    } else {
        0.0
    };

    let performance = if run_time > 0.0 && ideal_cycle_time > 0.0 {
        ((actual_output * ideal_cycle_time) / run_time) * 100.0
    } else {
        0.0
    };
    let performance = performance.min(100.0);

    let quality = if actual_output > 0.0 {
        (good_output / actual_output) * 100.0
    } else {
        0.0
    };

    let oee = (availability / 100.0) * (performance / 100.0) * (quality / 100.0) * 100.0;

    (availability, performance, quality, oee)
}

pub fn determine_oee_level(oee: f64) -> String {
    if oee >= 85.0 {
        "world_class".to_string()
    } else if oee >= 75.0 {
        "good".to_string()
    } else if oee >= 60.0 {
        "average".to_string()
    } else {
        "needs_improvement".to_string()
    }
}

pub fn calculate_availability(planned_time: f64, run_time: f64) -> f64 {
    if planned_time > 0.0 {
        (run_time / planned_time) * 100.0
    } else {
        0.0
    }
}

pub fn calculate_performance(run_time: f64, ideal_cycle_time: f64, actual_output: f64) -> f64 {
    if run_time > 0.0 && ideal_cycle_time > 0.0 {
        ((actual_output * ideal_cycle_time) / run_time) * 100.0
    } else {
        0.0
    }
    .min(100.0)
}

pub fn calculate_quality(actual_output: f64, good_output: f64) -> f64 {
    if actual_output > 0.0 {
        (good_output / actual_output) * 100.0
    } else {
        0.0
    }
}

pub fn calculate_efficiency_trend(last_oee: Option<f64>, current_oee: f64) -> String {
    match last_oee {
        Some(last) if current_oee > last + 3.0 => "significantly_improved".to_string(),
        Some(last) if current_oee > last => "improved".to_string(),
        Some(last) if current_oee < last - 3.0 => "significantly_decreased".to_string(),
        Some(last) if current_oee < last => "decreased".to_string(),
        _ => "stable".to_string(),
    }
}

pub fn validate_oee_inputs(
    planned_time: f64,
    run_time: f64,
    downtime: f64,
    ideal_cycle_time: f64,
    actual_output: f64,
    good_output: f64,
) -> Result<(), String> {
    if planned_time < 0.0 {
        return Err("Planned production time cannot be negative".to_string());
    }
    if run_time < 0.0 {
        return Err("Run time cannot be negative".to_string());
    }
    if downtime < 0.0 {
        return Err("Downtime cannot be negative".to_string());
    }
    if ideal_cycle_time < 0.0 {
        return Err("Ideal cycle time cannot be negative".to_string());
    }
    if actual_output < 0.0 {
        return Err("Actual output cannot be negative".to_string());
    }
    if good_output < 0.0 {
        return Err("Good output cannot be negative".to_string());
    }
    if good_output > actual_output {
        return Err("Good output cannot exceed actual output".to_string());
    }
    if run_time > planned_time + downtime {
        return Err("Run time cannot exceed planned time plus downtime".to_string());
    }

    Ok(())
}
