# Shared Library

This directory contains shared code and utilities used across multiple TOPEMS services.

## Structure

```
lib/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── config/
│   │   ├── mod.rs
│   │   ├── env.rs
│   │   ├── database.rs
│   │   ├── auth.rs
│   │   ├── server.rs
│   │   └── validation.rs
│   ├── error.rs
│   ├── logging.rs
│   └── utils/
└── README.md
```

## Configuration Module

The configuration module provides a unified way to load and validate environment variables across all services.

### Features

- Environment-specific configuration (development, test, production)
- Configuration validation and hot-reload
- Sensitive information protection
- Type-safe configuration access

### Usage

```rust
use topems_shared::config::Config;

let config = Config::load()?;
config.validate()?;
```
