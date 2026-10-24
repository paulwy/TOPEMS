export interface SymbolInfo {
  name: string;
  kind:
    'function' | 'class' | 'type' | 'interface' | 'variable' | 'constant' | 'method' | 'property';
  file: string;
  line: number;
  endLine: number;
  signature?: string;
  documentation?: string;
  parent?: string;
  exported: boolean;
  decorators?: string[];
}

export interface ImportInfo {
  name: string;
  isDefault: boolean;
  isNamespace: boolean;
  source: string;
}

export interface SearchResult {
  file: string;
  line: number;
  column: number;
  match: string;
  context: string;
  score: number;
}
