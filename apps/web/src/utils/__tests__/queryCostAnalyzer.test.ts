import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  analyzeQueryCost,
  getCostLevel,
  estimateResponseSize,
  suggestOptimization,
  validateQuery,
  getCostLevelColor,
  getCostLevelLabel,
  parseQueryName,
} from '../queryCostAnalyzer';

// Mock i18n
vi.mock('@/i18n', () => ({
  default: {
    t: (x: string) => x,
  },
}));

// Mock design tokens
vi.mock('@topems/tokens', () => ({
  designTokens: {
    colors: {
      success: { dark: '#006600' },
      warning: { main: '#FFAA00' },
      orange: { 500: '#FF8800' },
      error: { main: '#FF0000' },
    },
  },
}));

// Mock graphqlPerformance
vi.mock('./graphqlPerformance.ts', () => ({
  parseQueryName: vi.fn((query: string) => {
    const match = query.match(/(query|mutation|subscription)\s+(\w+)/i);
    return match ? match[2] : 'Unknown';
  }),
}));

describe('queryCostAnalyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCostLevel', () => {
    it('should return low for score <= 50', () => {
      expect(getCostLevel(0)).toBe('low');
      expect(getCostLevel(50)).toBe('low');
    });

    it('should return medium for score <= 200', () => {
      expect(getCostLevel(51)).toBe('medium');
      expect(getCostLevel(200)).toBe('medium');
    });

    it('should return high for score <= 500', () => {
      expect(getCostLevel(201)).toBe('high');
      expect(getCostLevel(500)).toBe('high');
    });

    it('should return critical for score > 500', () => {
      expect(getCostLevel(501)).toBe('critical');
      expect(getCostLevel(1000)).toBe('critical');
    });
  });

  describe('getCostLevelColor', () => {
    it('should return correct color for each level', () => {
      expect(getCostLevelColor('low')).toBe('#006600');
      expect(getCostLevelColor('medium')).toBe('#FFAA00');
      expect(getCostLevelColor('high')).toBe('#FF8800');
      expect(getCostLevelColor('critical')).toBe('#FF0000');
    });
  });

  describe('getCostLevelLabel', () => {
    it('should return correct label for each level', () => {
      expect(getCostLevelLabel('low')).toBeDefined();
      expect(getCostLevelLabel('medium')).toBeDefined();
      expect(getCostLevelLabel('high')).toBeDefined();
      expect(getCostLevelLabel('critical')).toBeDefined();
    });
  });

  describe('analyzeQueryCost', () => {
    it('should analyze simple query', () => {
      const query = `
        query GetUser {
          user {
            id
            name
            email
          }
        }
      `;
      const result = analyzeQueryCost(query);
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
      expect(result.fieldCount).toBeGreaterThan(0);
      expect(result.depth).toBeGreaterThan(0);
      expect(result.estimatedSizeKB).toBeGreaterThanOrEqual(0);
      expect(result.suggestions).toBeDefined();
      expect(result.level).toBeDefined();
    });

    it('should analyze query with list', () => {
      const query = `
        query GetUsers {
          users(first: 10) {
            id
            name
            email
          }
        }
      `;
      const result = analyzeQueryCost(query);
      expect(result).toBeDefined();
      expect(result.fieldCount).toBeGreaterThan(0);
      expect(result.score).toBeGreaterThan(0);
    });

    it('should analyze query with nested fields', () => {
      const query = `
        query GetUserWithPosts {
          user {
            id
            name
            posts {
              id
              title
              comments {
                id
                text
              }
            }
          }
        }
      `;
      const result = analyzeQueryCost(query);
      expect(result).toBeDefined();
      expect(result.depth).toBeGreaterThanOrEqual(3);
      expect(result.fieldCount).toBeGreaterThan(0);
    });

    it('should analyze query with variables', () => {
      const query = `
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            name
          }
        }
      `;
      const variables = { id: '123' };
      const result = analyzeQueryCost(query, variables);
      expect(result).toBeDefined();
      expect(result.fieldCount).toBeGreaterThan(0);
    });

    it('should handle mutation', () => {
      const query = `
        mutation CreateUser($input: UserInput!) {
          createUser(input: $input) {
            id
            name
          }
        }
      `;
      const result = analyzeQueryCost(query);
      expect(result).toBeDefined();
      expect(result.fieldCount).toBeGreaterThan(0);
    });

    it('should handle empty query gracefully', () => {
      const result = analyzeQueryCost('');
      expect(result).toBeDefined();
      expect(result.score).toBe(0);
      expect(result.fieldCount).toBe(0);
    });

    it('should handle query with comments', () => {
      const query = `
        # This is a comment
        query GetUser {
          user {
            id
            name
          }
        }
      `;
      const result = analyzeQueryCost(query);
      expect(result).toBeDefined();
      expect(result.fieldCount).toBeGreaterThan(0);
    });

    it('should handle query with aliases', () => {
      const query = `
        query GetUser {
          myUser: user {
            userId: id
            userName: name
          }
        }
      `;
      const result = analyzeQueryCost(query);
      expect(result).toBeDefined();
      expect(result.fieldCount).toBeGreaterThan(0);
    });
  });

  describe('estimateResponseSize', () => {
    it('should estimate response size for simple query', () => {
      const query = `
        query GetUser {
          user {
            id
            name
          }
        }
      `;
      const size = estimateResponseSize(query);
      expect(size).toBeGreaterThanOrEqual(0);
    });

    it('should estimate response size for list query', () => {
      const listQuery = `
        query GetUsers {
          users(first: 100) {
            id
            name
            email
          }
        }
      `;
      const size = estimateResponseSize(listQuery);
      expect(size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('suggestOptimization', () => {
    it('should return suggestions for simple query', () => {
      const query = `
        query GetUser {
          user {
            id
            name
          }
        }
      `;
      const suggestions = suggestOptimization(query);
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should return suggestions for very complex query', () => {
      const query = `
        query GetVeryComplexData {
          users(first: 500) {
            id
            name
            email
            posts {
              id
              title
              content
              comments {
                id
                text
                author {
                  id
                  name
                  email
                }
              }
            }
          }
        }
      `;
      const suggestions = suggestOptimization(query);
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('validateQuery', () => {
    it('should return valid for low cost query', () => {
      const query = `
        query GetUser {
          user {
            id
            name
          }
        }
      `;
      const result = validateQuery(query, 1000);
      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.reason).toBeDefined();
    });

    it('should return invalid for very high cost query with low maxScore', () => {
      const query = `
        query GetVeryComplexData {
          users(first: 1000) {
            id
            name
            email
            posts {
              id
              title
              content
              comments {
                id
                text
                author {
                  id
                  name
                  email
                }
              }
            }
          }
        }
      `;
      const result = validateQuery(query, 10);
      expect(result.valid).toBe(false);
      expect(result.score).toBeGreaterThan(10);
      expect(result.reason).toBeDefined();
    });
  });

  describe('parseQueryName', () => {
    it('should parse query name', () => {
      const query = 'query GetUser { user { id } }';
      expect(parseQueryName(query)).toBe('GetUser');
    });

    it('should parse mutation name', () => {
      const query = 'mutation CreateUser { createUser { id } }';
      expect(parseQueryName(query)).toBe('CreateUser');
    });

    it('should parse first field name for anonymous query', () => {
      const query = '{ user { id } }';
      expect(parseQueryName(query)).toBe('user');
    });
  });
});
