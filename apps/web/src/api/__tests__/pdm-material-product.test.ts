import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../client', () => {
  const mockPdmClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    apiClient: { pdm: mockPdmClient },
    default: { pdm: mockPdmClient },
  };
});

describe('PDM Material & Product API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
});
