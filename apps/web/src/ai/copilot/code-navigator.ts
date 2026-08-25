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

export interface FileStructure {
  path: string;
  imports: ImportInfo[];
  exports: string[];
  symbols: SymbolInfo[];
  dependencies: string[];
  dependents: string[];
  lineCount: number;
  language: 'typescript' | 'tsx' | 'javascript' | 'jsx';
}

export interface SearchResult {
  file: string;
  line: number;
  column: number;
  match: string;
  context: string;
  score: number;
}

export interface IndexStats {
  totalFiles: number;
  totalSymbols: number;
  totalImports: number;
  languages: Record<string, number>;
  indexedAt: number;
}

type Listener = (stats: IndexStats) => void;
