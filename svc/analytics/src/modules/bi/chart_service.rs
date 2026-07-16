use chrono::{DateTime, Utc};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ChartType {
    Line,
    Bar,
    Pie,
    Scatter,
    Area,
    Histogram,
    Gauge,
    Table,
}

impl Default for ChartType {
    fn default() -> Self {
        ChartType::Line
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartDataPoint {
    pub x: String,
    pub y: Vec<f64>,
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartDataset {
    pub name: String,
    pub data: Vec<ChartDataPoint>,
    pub color: Option<String>,
    pub type_: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartResult {
    pub chart_type: ChartType,
    pub title: Option<String>,
    pub datasets: Vec<ChartDataset>,
    pub x_axis_label: Option<String>,
    pub y_axis_label: Option<String>,
    pub legend: Vec<String>,
    pub summary: ChartSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartSummary {
    pub total_count: usize,
    pub min_value: f64,
    pub max_value: f64,
    pub avg_value: f64,
    pub sum_value: f64,
    pub generated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartQuery {
    pub chart_type: ChartType,
    pub data_source: String,
    pub query: String,
    pub params: HashMap<String, String>,
    pub title: Option<String>,
    pub x_axis_label: Option<String>,
    pub y_axis_label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeRange {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

pub struct ChartService {
    pool: PgPool,
}

impl ChartService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn generate_chart(&self, query: ChartQuery) -> Result<ChartResult, String> {
        let data = self.execute_query(&query).await?;
        self.build_chart(query, data).await
    }

    pub async fn generate_line_chart(
        &self,
        data_source: &str,
        x_column: &str,
        y_columns: &[String],
        title: Option<String>,
    ) -> Result<ChartResult, String> {
        let query = ChartQuery {
            chart_type: ChartType::Line,
            data_source: data_source.to_string(),
            query: format!("SELECT {} FROM {}", x_column, data_source),
            params: HashMap::new(),
            title,
            x_axis_label: Some(x_column.to_string()),
            y_axis_label: Some(y_columns.join(", ")),
        };
        self.generate_chart(query).await
    }

    pub async fn generate_bar_chart(
        &self,
        data_source: &str,
        x_column: &str,
        y_columns: &[String],
        title: Option<String>,
    ) -> Result<ChartResult, String> {
        let query = ChartQuery {
            chart_type: ChartType::Bar,
            data_source: data_source.to_string(),
            query: format!("SELECT {} FROM {}", x_column, data_source),
            params: HashMap::new(),
            title,
            x_axis_label: Some(x_column.to_string()),
            y_axis_label: Some(y_columns.join(", ")),
        };
        self.generate_chart(query).await
    }

    pub async fn generate_pie_chart(
        &self,
        data_source: &str,
        label_column: &str,
        _value_column: &str,
        title: Option<String>,
    ) -> Result<ChartResult, String> {
        let query = ChartQuery {
            chart_type: ChartType::Pie,
            data_source: data_source.to_string(),
            query: format!("SELECT {} FROM {}", label_column, data_source),
            params: HashMap::new(),
            title,
            x_axis_label: None,
            y_axis_label: None,
        };
        self.generate_chart(query).await
    }

    pub async fn generate_gauge_chart(
        &self,
        value: f64,
        min: f64,
        max: f64,
        title: Option<String>,
    ) -> Result<ChartResult, String> {
        let data_points = vec![ChartDataPoint {
            x: "value".to_string(),
            y: vec![value],
            label: None,
        }];

        let dataset = ChartDataset {
            name: "Value".to_string(),
            data: data_points,
            color: None,
            type_: None,
        };

        let summary = ChartSummary {
            total_count: 1,
            min_value: min,
            max_value: max,
            avg_value: value,
            sum_value: value,
            generated_at: Utc::now(),
        };

        Ok(ChartResult {
            chart_type: ChartType::Gauge,
            title,
            datasets: vec![dataset],
            x_axis_label: None,
            y_axis_label: None,
            legend: vec![],
            summary,
        })
    }

    async fn execute_query(
        &self,
        query: &ChartQuery,
    ) -> Result<Vec<HashMap<String, serde_json::Value>>, String> {
        let mut results: Vec<HashMap<String, serde_json::Value>> = Vec::new();

        let sample_data = self.generate_sample_data(query).await;

        for row in sample_data {
            results.push(row);
        }

        Ok(results)
    }

    async fn generate_sample_data(
        &self,
        query: &ChartQuery,
    ) -> Vec<HashMap<String, serde_json::Value>> {
        let mut data = Vec::new();

        match query.chart_type {
            ChartType::Line | ChartType::Bar | ChartType::Area => {
                let months = vec!["1月", "2月", "3月", "4月", "5月", "6月"];
                let mut rng = rand::thread_rng();
                for month in months {
                    let mut row = HashMap::new();
                    row.insert(
                        "month".to_string(),
                        serde_json::Value::String(month.to_string()),
                    );
                    row.insert(
                        "value1".to_string(),
                        serde_json::Value::Number(
                            serde_json::Number::from_f64((rng.gen::<f64>() * 100.0) + 50.0)
                                .unwrap_or_else(|| serde_json::Number::from(50)),
                        ),
                    );
                    row.insert(
                        "value2".to_string(),
                        serde_json::Value::Number(
                            serde_json::Number::from_f64((rng.gen::<f64>() * 80.0) + 30.0)
                                .unwrap_or_else(|| serde_json::Number::from(30)),
                        ),
                    );
                    data.push(row);
                }
            }
            ChartType::Pie => {
                let categories = vec!["A类", "B类", "C类", "D类"];
                let mut rng = rand::thread_rng();
                for category in categories {
                    let mut row = HashMap::new();
                    row.insert(
                        "category".to_string(),
                        serde_json::Value::String(category.to_string()),
                    );
                    row.insert(
                        "value".to_string(),
                        serde_json::Value::Number(
                            serde_json::Number::from_f64(rng.gen::<f64>() * 100.0)
                                .unwrap_or_else(|| serde_json::Number::from(0)),
                        ),
                    );
                    data.push(row);
                }
            }
            ChartType::Scatter => {
                let mut rng = rand::thread_rng();
                for _ in 0..20 {
                    let mut row = HashMap::new();
                    row.insert(
                        "x".to_string(),
                        serde_json::Value::Number(
                            serde_json::Number::from_f64(rng.gen::<f64>() * 100.0)
                                .unwrap_or_else(|| serde_json::Number::from(0)),
                        ),
                    );
                    row.insert(
                        "y".to_string(),
                        serde_json::Value::Number(
                            serde_json::Number::from_f64(rng.gen::<f64>() * 100.0)
                                .unwrap_or_else(|| serde_json::Number::from(0)),
                        ),
                    );
                    data.push(row);
                }
            }
            ChartType::Histogram => {
                let mut rng = rand::thread_rng();
                for i in 0..10 {
                    let mut row = HashMap::new();
                    row.insert(
                        "bin".to_string(),
                        serde_json::Value::String(format!("{}-{}", i * 10, (i + 1) * 10)),
                    );
                    row.insert(
                        "count".to_string(),
                        serde_json::Value::Number(
                            serde_json::Number::from_f64((rng.gen::<f64>() * 50.0) + 10.0)
                                .unwrap_or_else(|| serde_json::Number::from(10)),
                        ),
                    );
                    data.push(row);
                }
            }
            ChartType::Table => {
                let mut rng = rand::thread_rng();
                for i in 0..5 {
                    let mut row = HashMap::new();
                    row.insert(
                        "id".to_string(),
                        serde_json::Value::Number(serde_json::Number::from(i + 1)),
                    );
                    row.insert(
                        "name".to_string(),
                        serde_json::Value::String(format!("项目 {}", i + 1)),
                    );
                    row.insert(
                        "value".to_string(),
                        serde_json::Value::Number(
                            serde_json::Number::from_f64((rng.gen::<f64>() * 1000.0) + 100.0)
                                .unwrap_or_else(|| serde_json::Number::from(100)),
                        ),
                    );
                    data.push(row);
                }
            }
            ChartType::Gauge => {}
        }

        data
    }

    async fn build_chart(
        &self,
        query: ChartQuery,
        data: Vec<HashMap<String, serde_json::Value>>,
    ) -> Result<ChartResult, String> {
        let mut datasets = Vec::new();
        let mut legend = Vec::new();

        if data.is_empty() {
            return Ok(ChartResult {
                chart_type: query.chart_type,
                title: query.title,
                datasets: vec![],
                x_axis_label: query.x_axis_label,
                y_axis_label: query.y_axis_label,
                legend: vec![],
                summary: ChartSummary {
                    total_count: 0,
                    min_value: 0.0,
                    max_value: 0.0,
                    avg_value: 0.0,
                    sum_value: 0.0,
                    generated_at: Utc::now(),
                },
            });
        }

        let first_row = &data[0];
        let numeric_keys: Vec<String> = first_row
            .iter()
            .filter(|(_, v)| v.is_number())
            .map(|(k, _)| k.clone())
            .collect();

        let category_keys: Vec<String> = first_row
            .iter()
            .filter(|(_, v)| v.is_string())
            .map(|(k, _)| k.clone())
            .collect();

        let x_key = category_keys
            .first()
            .cloned()
            .unwrap_or_else(|| "x".to_string());
        let mut all_values: Vec<f64> = Vec::new();

        for numeric_key in &numeric_keys {
            let mut data_points = Vec::new();

            for row in &data {
                let x_value = row
                    .get(&x_key)
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                let y_value = row.get(numeric_key).and_then(|v| v.as_f64()).unwrap_or(0.0);

                all_values.push(y_value);

                data_points.push(ChartDataPoint {
                    x: x_value,
                    y: vec![y_value],
                    label: None,
                });
            }

            legend.push(numeric_key.clone());

            datasets.push(ChartDataset {
                name: numeric_key.clone(),
                data: data_points,
                color: None,
                type_: None,
            });
        }

        let total_count = all_values.len();
        let min_value = all_values.iter().cloned().fold(f64::INFINITY, f64::min);
        let max_value = all_values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        let sum_value = all_values.iter().sum::<f64>();
        let avg_value = if total_count > 0 {
            sum_value / total_count as f64
        } else {
            0.0
        };

        Ok(ChartResult {
            chart_type: query.chart_type,
            title: query.title,
            datasets,
            x_axis_label: query.x_axis_label,
            y_axis_label: query.y_axis_label,
            legend,
            summary: ChartSummary {
                total_count,
                min_value,
                max_value,
                avg_value,
                sum_value,
                generated_at: Utc::now(),
            },
        })
    }

    pub async fn get_available_chart_types(&self) -> Vec<String> {
        vec![
            "line".to_string(),
            "bar".to_string(),
            "pie".to_string(),
            "scatter".to_string(),
            "area".to_string(),
            "histogram".to_string(),
            "gauge".to_string(),
            "table".to_string(),
        ]
    }
}
