import { describe, it, expect } from 'vitest';

import { MAX_RETRIES, RETRY_DELAY_MS } from '../retry';

describe('retry constants', () => {
  it('should export MAX_RETRIES as 3', () => {
    expect(MAX_RETRIES).toBe(3);
    expect(typeof MAX_RETRIES).toBe('number');
  });

  it('should export RETRY_DELAY_MS as 1000', () => {
    expect(RETRY_DELAY_MS).toBe(1000);
    expect(typeof RETRY_DELAY_MS).toBe('number');
  });
});
