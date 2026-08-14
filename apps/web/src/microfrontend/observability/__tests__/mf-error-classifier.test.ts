import { describe, it, expect } from 'vitest';
import {
  classifyMFError,
  getUserMessage,
  shouldShowToast,
  shouldSuppressToast,
  type MFErrorEvent,
} from '../mf-error-classifier';

describe('classifyMFError', () => {
  it('classifies 404 errors as chunk_404', () => {
    const event = classifyMFError({
      error: new Error('Failed to fetch dynamically imported module: 404 Not Found'),
      remoteInfo: { name: 'topems_erp', alias: 'topems_erp' },
      expose: './App',
      lifecycle: 'errorLoadRemote',
    });

    expect(event.type).toBe('chunk_404');
    expect(event.severity).toBe('critical');
    expect(event.moduleName).toBe('topems_erp');
    expect(event.expose).toBe('./App');
    expect(event.recovered).toBe(false);
  });

  it('classifies Content-Type errors as content_type_missing', () => {
    const event = classifyMFError({
      error: new Error('Unexpected Content-Type "text/html" expected application/javascript'),
      remoteInfo: { name: 'topems_crm' },
      lifecycle: 'fetch:content-type',
    });

    expect(event.type).toBe('content_type_missing');
    expect(event.severity).toBe('warning');
    expect(event.contentType).toBe('text/html');
  });

  it('classifies timeout errors as timeout', () => {
    const event = classifyMFError({
      error: new Error('Module load timed out after 30000ms'),
      remoteInfo: { name: 'topems_hrm' },
      lifecycle: 'errorLoadRemote',
    });

    expect(event.type).toBe('timeout');
    expect(event.severity).toBe('warning');
  });

  it('classifies loadShare lifecycle errors as loadShare_failure', () => {
    const event = classifyMFError({
      error: new Error('Share scope resolution failed for react'),
      pkgName: 'react',
      lifecycle: 'errorLoadShare:loadShare',
    });

    expect(event.type).toBe('loadShare_failure');
    expect(event.severity).toBe('critical');
    expect(event.moduleName).toBe('react');
  });

  it('classifies loadRemote lifecycle errors as loadRemote_failure', () => {
    const event = classifyMFError({
      error: new Error('Remote module loading rejected: topems_wms/./App'),
      remoteInfo: { name: 'topems_wms' },
      lifecycle: 'errorLoadRemote',
    });

    expect(event.type).toBe('loadRemote_failure');
    expect(event.severity).toBe('critical');
  });

  it('classifies entry loading errors as remote_entry_error', () => {
    const event = classifyMFError({
      error: new Error('Failed to load remoteEntry.js'),
      remoteInfo: { name: 'topems_finance' },
      lifecycle: 'afterLoadEntry',
    });

    expect(event.type).toBe('remote_entry_error');
    expect(event.severity).toBe('critical');
  });

  it('classifies init container errors as init_container_error', () => {
    const event = classifyMFError({
      error: new Error('Container initialization failed'),
      remoteInfo: { name: 'topems_mes' },
      lifecycle: 'init.container',
    });

    expect(event.type).toBe('init_container_error');
    expect(event.severity).toBe('critical');
  });

  it('extracts HTTP status from error message', () => {
    const event = classifyMFError({
      error: new Error('Loading chunk 123 failed. Server returned 503'),
      remoteInfo: { name: 'topems_pdm' },
      lifecycle: 'fetch',
    });

    expect(event.httpStatus).toBe(503);
  });

  it('extracts chunk URL from error stack', () => {
    const error = new Error('Failed to fetch');
    error.stack = 'Error: Failed to fetch\n    at https://example.com/remote/topems_erp/assets/chunk-abc.js';
    const event = classifyMFError({
      error,
      remoteInfo: { name: 'topems_erp' },
      lifecycle: 'fetch',
    });

    expect(event.chunkUrl).toBeTruthy();
    expect(event.chunkUrl).toContain('chunk-abc.js');
  });

  it('handles non-Error error objects', () => {
    const event = classifyMFError({
      error: 'String error message',
      remoteInfo: { name: 'topems_bi' },
      lifecycle: 'errorLoadRemote',
    });

    expect(event.errorMessage).toBe('String error message');
    expect(event.moduleName).toBe('topems_bi');
  });

  it('handles undefined error', () => {
    const event = classifyMFError({
      error: undefined,
      remoteInfo: { name: 'topems_monitor' },
      lifecycle: 'afterLoadRemote',
    });

    expect(event.errorMessage).toBeTruthy();
    expect(event.moduleName).toBe('topems_monitor');
  });

  it('marks recovered errors correctly', () => {
    const event = classifyMFError({
      error: new Error('Recoverable error'),
      remoteInfo: { name: 'topems_core' },
      lifecycle: 'afterLoadRemote',
      recovered: true,
    });

    expect(event.recovered).toBe(true);
  });

  it('falls back to unknown for unclassifiable errors', () => {
    const event = classifyMFError({
      error: new Error('Some weird error'),
      remoteInfo: { name: 'topems_ai' },
      lifecycle: 'unknownLifecycle',
    });

    expect(event.type).toBe('unknown');
    expect(event.severity).toBe('warning');
  });

  it('falls back to pkgName when remoteInfo is null', () => {
    const event = classifyMFError({
      error: new Error('Share error'),
      remoteInfo: null,
      pkgName: 'react-dom',
      lifecycle: 'errorLoadShare:loadShareSync',
    });

    expect(event.moduleName).toBe('react-dom');
  });

  it('falls back to unknown when no module info', () => {
    const event = classifyMFError({
      error: new Error('Generic error'),
      lifecycle: 'errorLoadRemote',
    });

    expect(event.moduleName).toBe('unknown');
  });
});

describe('getUserMessage', () => {
  it('includes module name in message', () => {
    const event: MFErrorEvent = {
      type: 'chunk_404',
      severity: 'critical',
      moduleName: 'topems_erp',
      errorMessage: '404',
      recovered: false,
      lifecycle: 'errorLoadRemote',
      timestamp: Date.now(),
    };

    const msg = getUserMessage(event);
    expect(msg).toContain('topems_erp');
    expect(msg).toContain('404');
  });

  it('uses generic message when module is unknown', () => {
    const event: MFErrorEvent = {
      type: 'loadShare_failure',
      severity: 'critical',
      moduleName: 'unknown',
      errorMessage: 'error',
      recovered: false,
      lifecycle: 'errorLoadShare',
      timestamp: Date.now(),
    };

    const msg = getUserMessage(event);
    expect(msg).not.toContain('unknown');
  });
});

describe('shouldShowToast', () => {
  it('returns true for critical errors', () => {
    const event: MFErrorEvent = {
      type: 'chunk_404',
      severity: 'critical',
      moduleName: 'topems_erp',
      errorMessage: '404',
      recovered: false,
      lifecycle: 'errorLoadRemote',
      timestamp: Date.now(),
    };
    expect(shouldShowToast(event)).toBe(true);
  });

  it('returns true for warning errors', () => {
    const event: MFErrorEvent = {
      type: 'content_type_missing',
      severity: 'warning',
      moduleName: 'topems_crm',
      errorMessage: 'bad content type',
      recovered: false,
      lifecycle: 'fetch',
      timestamp: Date.now(),
    };
    expect(shouldShowToast(event)).toBe(true);
  });

  it('returns false for recovered errors', () => {
    const event: MFErrorEvent = {
      type: 'chunk_404',
      severity: 'critical',
      moduleName: 'topems_erp',
      errorMessage: '404',
      recovered: true,
      lifecycle: 'afterLoadRemote',
      timestamp: Date.now(),
    };
    expect(shouldShowToast(event)).toBe(false);
  });

  it('returns false for info severity', () => {
    const event: MFErrorEvent = {
      type: 'unknown',
      severity: 'info' as any,
      moduleName: 'topems_erp',
      errorMessage: 'info',
      recovered: false,
      lifecycle: 'afterLoadEntry',
      timestamp: Date.now(),
    };
    expect(shouldShowToast(event)).toBe(false);
  });
});

describe('shouldSuppressToast', () => {
  it('suppresses after 2 similar errors within 10 seconds', () => {
    const now = Date.now();
    const recent: MFErrorEvent[] = [
      {
        type: 'chunk_404',
        severity: 'critical',
        moduleName: 'topems_erp',
        errorMessage: '404',
        recovered: false,
        lifecycle: 'errorLoadRemote',
        timestamp: now - 5000,
      },
      {
        type: 'chunk_404',
        severity: 'critical',
        moduleName: 'topems_erp',
        errorMessage: '404',
        recovered: false,
        lifecycle: 'errorLoadRemote',
        timestamp: now - 3000,
      },
    ];

    const newEvent: MFErrorEvent = {
      type: 'chunk_404',
      severity: 'critical',
      moduleName: 'topems_erp',
      errorMessage: '404',
      recovered: false,
      lifecycle: 'errorLoadRemote',
      timestamp: now,
    };

    expect(shouldSuppressToast(newEvent, recent)).toBe(true);
  });

  it('does not suppress for different modules', () => {
    const now = Date.now();
    const recent: MFErrorEvent[] = [
      {
        type: 'chunk_404',
        severity: 'critical',
        moduleName: 'topems_erp',
        errorMessage: '404',
        recovered: false,
        lifecycle: 'errorLoadRemote',
        timestamp: now - 3000,
      },
      {
        type: 'chunk_404',
        severity: 'critical',
        moduleName: 'topems_erp',
        errorMessage: '404',
        recovered: false,
        lifecycle: 'errorLoadRemote',
        timestamp: now - 1000,
      },
    ];

    const newEvent: MFErrorEvent = {
      type: 'chunk_404',
      severity: 'critical',
      moduleName: 'topems_crm',
      errorMessage: '404',
      recovered: false,
      lifecycle: 'errorLoadRemote',
      timestamp: now,
    };

    expect(shouldSuppressToast(newEvent, recent)).toBe(false);
  });

  it('does not suppress when errors are outside time window', () => {
    const now = Date.now();
    const recent: MFErrorEvent[] = [
      {
        type: 'chunk_404',
        severity: 'critical',
        moduleName: 'topems_erp',
        errorMessage: '404',
        recovered: false,
        lifecycle: 'errorLoadRemote',
        timestamp: now - 20000,
      },
      {
        type: 'chunk_404',
        severity: 'critical',
        moduleName: 'topems_erp',
        errorMessage: '404',
        recovered: false,
        lifecycle: 'errorLoadRemote',
        timestamp: now - 15000,
      },
    ];

    const newEvent: MFErrorEvent = {
      type: 'chunk_404',
      severity: 'critical',
      moduleName: 'topems_erp',
      errorMessage: '404',
      recovered: false,
      lifecycle: 'errorLoadRemote',
      timestamp: now,
    };

    expect(shouldSuppressToast(newEvent, recent)).toBe(false);
  });
});
