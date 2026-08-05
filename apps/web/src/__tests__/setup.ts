/**
 * Backward compatibility re-export.
 * The setup is now split into:
 * - setup-core.ts: browser polyfills (matchMedia, ResizeObserver, CSS)
 * - setup-mocks.ts: module mocks (store, opentelemetry, react-query)
 *
 * This file is no longer referenced by vitest.config.ts.
 * New config uses projects to load setup-core for unit tests,
 * and setup-core + setup-mocks for component tests.
 */
import './setup-core';
import './setup-mocks';
