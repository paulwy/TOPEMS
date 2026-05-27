# Frontend Configuration Module

This module provides type-safe access to frontend environment variables and runtime configuration.

## Files

- `runtime.ts` - Runtime configuration loader
- `types.ts` - TypeScript type definitions
- `README.md` - This file

## Usage

### Basic Usage

```typescript
import config from './config/runtime';

// Access API configuration
const apiUrl = config.api.baseUrl;
const wsUrl = config.ws.url;

// Check features
if (config.features.debugMode) {
  console.log('Debug mode is enabled');
}

// Access service URLs
const iamUrl = config.services.iam;
```

### Type Checking

The configuration module provides full TypeScript type safety:

```typescript
import type { RuntimeConfig } from './config/types';

function processConfig(cfg: RuntimeConfig) {
  console.log(cfg.api.baseUrl);
  console.log(cfg.features.debugMode);
}
```

### Environment Detection

```typescript
import { isProduction, isDevelopment, getMode } from './config/runtime';

if (isProduction()) {
  // Production-specific logic
}

if (isDevelopment()) {
  // Development-specific logic
}

console.log(getMode()); // 'development', 'production', or 'test'
```

## Environment Variables

All environment variables must be prefixed with `VITE_` to be accessible in the frontend code.

See [`.env.example`](.env.example) for a complete list of available variables.

## Best Practices

1. **Always use the config module** instead of accessing `import.meta.env` directly
2. **Provide defaults** for all configuration values
3. **Use type definitions** to ensure type safety
4. **Keep sensitive data server-side** - frontend env vars are visible to users

## Example

```typescript
import config from './config/runtime';

async function fetchData<T>(endpoint: string): Promise<T> {
  const url = `${config.api.baseUrl}${endpoint}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(config.api.timeout),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

// Usage
const data = await fetchData('/api/users');
```
