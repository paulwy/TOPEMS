export type TestType = 'component' | 'hook' | 'api' | 'integration';

export interface TestCase {
  name: string;
  description: string;
  given_when_then: {
    given: string[];
    when: string[];
    then: string[];
  };
  assertions: string[];
  priority: 'high' | 'medium' | 'low';
  category: 'rendering' | 'interaction' | 'data' | 'error' | 'accessibility';
}

export interface TestMethod {
  name: string;
  description: string;
  given_when_then: {
    given: string[];
    when: string[];
    then: string[];
  };
  assertions: string[];
}
