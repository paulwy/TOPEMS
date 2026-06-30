use chrono::Utc;
use opentelemetry::trace::TraceContextExt;
use serde_json::json;
use std::collections::HashMap;
use tracing::{Event, Level, Subscriber};
use tracing_subscriber::fmt::format::{FormatEvent, FormatFields, Writer};
use tracing_subscriber::registry::LookupSpan;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LogFormat {
    Text,
    Json,
    File,
}

impl LogFormat {
    pub fn from_env() -> Self {
        match std::env::var("LOG_FORMAT")
            .unwrap_or_else(|_| "text".to_string())
            .to_lowercase()
            .as_str()
        {
            "json" => LogFormat::Json,
            "file" => LogFormat::File,
            _ => LogFormat::Text,
        }
    }
}

fn format_level(level: &Level) -> &'static str {
    match *level {
        Level::TRACE => "TRACE",
        Level::DEBUG => "DEBUG",
        Level::INFO => "INFO",
        Level::WARN => "WARN",
        Level::ERROR => "ERROR",
    }
}

pub struct JsonEventFormatter;

impl JsonEventFormatter {
    pub fn new() -> Self {
        Self
    }
}

impl<S, N> FormatEvent<S, N> for JsonEventFormatter
where
    S: Subscriber + for<'a> LookupSpan<'a>,
    N: for<'a> FormatFields<'a> + 'static,
{
    fn format_event(
        &self,
        _ctx: &tracing_subscriber::fmt::FmtContext<'_, S, N>,
        mut writer: Writer<'_>,
        event: &Event<'_>,
    ) -> std::fmt::Result {
        let metadata = event.metadata();
        let mut fields: HashMap<String, serde_json::Value> = HashMap::new();

        let mut visitor = JsonValueVisitor(&mut fields);
        event.record(&mut visitor);

        let message = fields
            .remove("message")
            .and_then(|v| v.as_str().map(String::from))
            .unwrap_or_default();

        let ctx = opentelemetry::Context::current();
        let span = ctx.span();
        let span_context = span.span_context();

        let trace_id = if span_context.is_valid() {
            span_context.trace_id().to_string()
        } else {
            String::new()
        };

        let span_id = if span_context.is_valid() {
            span_context.span_id().to_string()
        } else {
            String::new()
        };

        let trace_flags = if span_context.is_valid() {
            format!("{:?}", span_context.trace_flags())
        } else {
            String::new()
        };

        let log_entry = json!({
            "timestamp": Utc::now().to_rfc3339(),
            "level": format_level(metadata.level()),
            "target": metadata.target(),
            "message": message,
            "module": metadata.module_path(),
            "file": metadata.file(),
            "line": metadata.line(),
            "trace_id": trace_id,
            "span_id": span_id,
            "trace_flags": trace_flags,
            "fields": fields,
        });

        writeln!(writer, "{}", serde_json::to_string(&log_entry).unwrap_or_default())
    }
}

struct JsonValueVisitor<'a>(&'a mut HashMap<String, serde_json::Value>);

impl<'a> tracing::field::Visit for JsonValueVisitor<'a> {
    fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn std::fmt::Debug) {
        self.0.insert(
            field.name().to_string(),
            serde_json::Value::String(format!("{:?}", value)),
        );
    }

    fn record_str(&mut self, field: &tracing::field::Field, value: &str) {
        self.0.insert(
            field.name().to_string(),
            serde_json::Value::String(value.to_string()),
        );
    }

    fn record_bool(&mut self, field: &tracing::field::Field, value: bool) {
        self.0
            .insert(field.name().to_string(), serde_json::Value::Bool(value));
    }

    fn record_u64(&mut self, field: &tracing::field::Field, value: u64) {
        self.0.insert(
            field.name().to_string(),
            serde_json::Value::Number(serde_json::Number::from(value)),
        );
    }

    fn record_i64(&mut self, field: &tracing::field::Field, value: i64) {
        self.0.insert(
            field.name().to_string(),
            serde_json::Value::Number(serde_json::Number::from(value)),
        );
    }

    fn record_f64(&mut self, field: &tracing::field::Field, value: f64) {
        if let Some(num) = serde_json::Number::from_f64(value) {
            self.0
                .insert(field.name().to_string(), serde_json::Value::Number(num));
        } else {
            self.0.insert(
                field.name().to_string(),
                serde_json::Value::String(value.to_string()),
            );
        }
    }
}

pub fn generate_request_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

pub fn generate_trace_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

pub fn generate_span_id() -> String {
    let full = uuid::Uuid::new_v4().to_string();
    full[..8].to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_log_format_from_env_text() {
        std::env::set_var("LOG_FORMAT", "text");
        assert_eq!(LogFormat::from_env(), LogFormat::Text);
    }

    #[test]
    fn test_log_format_from_env_json() {
        std::env::set_var("LOG_FORMAT", "json");
        assert_eq!(LogFormat::from_env(), LogFormat::Json);
        std::env::remove_var("LOG_FORMAT");
    }

    #[test]
    fn test_log_format_default() {
        std::env::remove_var("LOG_FORMAT");
        assert_eq!(LogFormat::from_env(), LogFormat::Text);
    }

    #[test]
    fn test_generate_request_id() {
        let id1 = generate_request_id();
        let id2 = generate_request_id();
        assert_ne!(id1, id2);
        assert_eq!(id1.len(), 36);
    }

    #[test]
    fn test_generate_trace_id() {
        let id = generate_trace_id();
        assert_eq!(id.len(), 36);
    }

    #[test]
    fn test_generate_span_id() {
        let id = generate_span_id();
        assert_eq!(id.len(), 8);
    }

    #[test]
    fn test_format_level() {
        assert_eq!(format_level(&Level::TRACE), "TRACE");
        assert_eq!(format_level(&Level::DEBUG), "DEBUG");
        assert_eq!(format_level(&Level::INFO), "INFO");
        assert_eq!(format_level(&Level::WARN), "WARN");
        assert_eq!(format_level(&Level::ERROR), "ERROR");
    }
}
