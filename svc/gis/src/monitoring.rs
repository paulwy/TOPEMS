use prometheus::{
    register_counter_vec, register_gauge, register_histogram_vec, CounterVec, Gauge, HistogramOpts,
    HistogramVec, Opts, Registry,
};
use std::sync::Arc;
use tokio::time::{self, Duration};

#[derive(Clone)]
pub struct Metrics {
    pub request_counter: CounterVec,
    pub request_duration: HistogramVec,
    pub database_queries: CounterVec,
    pub database_query_duration: HistogramVec,
    pub active_requests: Gauge,
    pub memory_usage: Gauge,
    pub cache_hits: CounterVec,
    pub cache_misses: CounterVec,
}

impl Metrics {
    pub fn new(_registry: &Registry) -> Self {
        let request_counter = register_counter_vec!(
            Opts::new(
                "topems_gis_requests_total",
                "Total number of HTTP requests received",
            ),
            &["method", "endpoint", "status_code"]
        )
        .expect("Failed to register request_counter metric");

        let request_duration = register_histogram_vec!(
            HistogramOpts::new(
                "topems_gis_request_duration_seconds",
                "Duration of HTTP requests in seconds",
            ),
            &["method", "endpoint"]
        )
        .expect("Failed to register request_duration metric");

        let database_queries = register_counter_vec!(
            Opts::new(
                "topems_gis_db_queries_total",
                "Total number of database queries executed",
            ),
            &["query_type", "table"]
        )
        .expect("Failed to register database_queries metric");

        let database_query_duration = register_histogram_vec!(
            HistogramOpts::new(
                "topems_gis_db_query_duration_seconds",
                "Duration of database queries in seconds",
            ),
            &["query_type", "table"]
        )
        .expect("Failed to register database_query_duration metric");

        let active_requests = register_gauge!(Opts::new(
            "topems_gis_active_requests",
            "Number of active HTTP requests",
        ))
        .expect("Failed to register active_requests metric");

        let memory_usage = register_gauge!(Opts::new(
            "topems_gis_memory_usage_bytes",
            "Current memory usage in bytes",
        ))
        .expect("Failed to register memory_usage metric");

        let cache_hits = register_counter_vec!(
            Opts::new("topems_gis_cache_hits_total", "Total number of cache hits",),
            &["cache_type"]
        )
        .expect("Failed to register cache_hits metric");

        let cache_misses = register_counter_vec!(
            Opts::new(
                "topems_gis_cache_misses_total",
                "Total number of cache misses",
            ),
            &["cache_type"]
        )
        .expect("Failed to register cache_misses metric");

        Self {
            request_counter,
            request_duration,
            database_queries,
            database_query_duration,
            active_requests,
            memory_usage,
            cache_hits,
            cache_misses,
        }
    }

    pub fn record_request(&self, method: &str, endpoint: &str, status_code: u16, duration: f64) {
        self.request_counter
            .with_label_values(&[method, endpoint, &status_code.to_string()])
            .inc();
        self.request_duration
            .with_label_values(&[method, endpoint])
            .observe(duration);
    }

    pub fn record_database_query(&self, query_type: &str, table: &str, duration: f64) {
        self.database_queries
            .with_label_values(&[query_type, table])
            .inc();
        self.database_query_duration
            .with_label_values(&[query_type, table])
            .observe(duration);
    }

    pub fn increment_active_requests(&self) {
        self.active_requests.inc();
    }

    pub fn decrement_active_requests(&self) {
        self.active_requests.dec();
    }

    pub fn update_memory_usage(&self, usage: u64) {
        self.memory_usage.set(usage as f64);
    }

    pub fn record_cache_hit(&self, cache_type: &str) {
        self.cache_hits.with_label_values(&[cache_type]).inc();
    }

    pub fn record_cache_miss(&self, cache_type: &str) {
        self.cache_misses.with_label_values(&[cache_type]).inc();
    }
}

pub async fn start_memory_monitor(metrics: Arc<Metrics>, interval: Duration) {
    let mut interval = time::interval(interval);
    loop {
        interval.tick().await;
        update_memory_metric(&metrics);
    }
}

fn update_memory_metric(metrics: &Metrics) {
    let usage = match sys_info::mem_info() {
        Ok(mem) => mem.total - mem.free,
        Err(_) => 0,
    };
    metrics.update_memory_usage(usage);
}

pub struct RequestTimer {
    metrics: Arc<Metrics>,
    method: String,
    endpoint: String,
    start: std::time::Instant,
}

impl RequestTimer {
    pub fn new(metrics: Arc<Metrics>, method: &str, endpoint: &str) -> Self {
        metrics.increment_active_requests();
        Self {
            metrics,
            method: method.to_string(),
            endpoint: endpoint.to_string(),
            start: std::time::Instant::now(),
        }
    }

    pub fn finish(self, status_code: u16) {
        let duration = self.start.elapsed().as_secs_f64();
        self.metrics
            .record_request(&self.method, &self.endpoint, status_code, duration);
        self.metrics.decrement_active_requests();
    }
}

pub struct DatabaseQueryTimer {
    metrics: Arc<Metrics>,
    query_type: String,
    table: String,
    start: std::time::Instant,
}

impl DatabaseQueryTimer {
    pub fn new(metrics: Arc<Metrics>, query_type: &str, table: &str) -> Self {
        Self {
            metrics,
            query_type: query_type.to_string(),
            table: table.to_string(),
            start: std::time::Instant::now(),
        }
    }

    pub fn finish(self) {
        let duration = self.start.elapsed().as_secs_f64();
        self.metrics
            .record_database_query(&self.query_type, &self.table, duration);
    }
}
