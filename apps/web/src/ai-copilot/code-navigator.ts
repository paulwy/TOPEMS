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

export class CodeNavigator {
  private files: Map<string, FileStructure> = new Map();
  private symbolIndex: Map<string, SymbolInfo[]> = new Map();
  private importGraph: Map<string, string[]> = new Map();
  private referenceMap: Map<string, { file: string; line: number }[]> = new Map();
  private listeners: Set<Listener> = new Set();
  private lastStats: IndexStats = {
    totalFiles: 0,
    totalSymbols: 0,
    totalImports: 0,
    languages: {},
    indexedAt: 0,
  };

  buildIndex(files: Array<{ path: string; content: string }>): IndexStats {
    this.files.clear();
    this.symbolIndex.clear();
    this.importGraph.clear();
    this.referenceMap.clear();

    const languages: Record<string, number> = {};
    let totalSymbols = 0;
    let totalImports = 0;

    for (const file of files) {
      const structure = this.analyzeFile(file.path, file.content);
      this.files.set(file.path, structure);

      const lang = structure.language;
      languages[lang] = (languages[lang] || 0) + 1;

      for (const symbol of structure.symbols) {
        const key = symbol.name;
        if (!this.symbolIndex.has(key)) {
          this.symbolIndex.set(key, []);
        }
        this.symbolIndex.get(key)!.push(symbol);
        totalSymbols++;
      }

      for (const imp of structure.imports) {
        totalImports++;
        if (!this.importGraph.has(file.path)) {
          this.importGraph.set(file.path, []);
        }
        this.importGraph.get(file.path)!.push(imp.source);

        if (!this.importGraph.has(imp.source)) {
          this.importGraph.set(imp.source, []);
        }
        if (!this.importGraph.get(imp.source)!.includes(file.path)) {
          this.importGraph.get(imp.source)!.push(file.path);
        }
      }

      for (const symbol of structure.symbols) {
        if (symbol.kind === 'function' || symbol.kind === 'class' || symbol.kind === 'method') {
          const refs = this.findReferencesInContent(symbol.name, file.path, file.content);
          if (!this.referenceMap.has(symbol.name)) {
            this.referenceMap.set(symbol.name, []);
          }
          for (const ref of refs) {
            this.referenceMap.get(symbol.name)!.push(ref);
          }
        }
      }
    }

    for (const [path, structure] of this.files) {
      structure.dependencies = this.importGraph.get(path) || [];
      structure.dependents = [];
      for (const [otherPath, deps] of this.importGraph) {
        if (deps.includes(path)) {
          structure.dependents.push(otherPath);
        }
      }
    }

    this.lastStats = {
      totalFiles: this.files.size,
      totalSymbols,
      totalImports,
      languages,
      indexedAt: Date.now(),
    };

    this.listeners.forEach((l) => l(this.lastStats));

    return this.lastStats;
  }

  searchCode(query: string, limit: number = 20): SearchResult[] {
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    for (const [path, structure] of this.files) {
      for (const symbol of structure.symbols) {
        const nameMatch = symbol.name.toLowerCase().includes(lowerQuery);
        const sigMatch = (symbol.signature || '').toLowerCase().includes(lowerQuery);
        const docMatch = (symbol.documentation || '').toLowerCase().includes(lowerQuery);

        if (nameMatch || sigMatch || docMatch) {
          results.push({
            file: path,
            line: symbol.line,
            column: 0,
            match: symbol.name,
            context: symbol.signature || symbol.documentation || symbol.name,
            score: this.calculateScore(symbol, lowerQuery, nameMatch, sigMatch, docMatch),
          });
        }
      }
    }

    for (const [path, structure] of this.files) {
      for (const imp of structure.imports) {
        if (
          imp.name.toLowerCase().includes(lowerQuery) ||
          imp.source.toLowerCase().includes(lowerQuery)
        ) {
          const existing = results.some((r) => r.file === path && r.match === `import:${imp.name}`);
          if (!existing) {
            results.push({
              file: path,
              line: 0,
              column: 0,
              match: `import:${imp.name}`,
              context: `from '${imp.source}'`,
              score: 0.5,
            });
          }
        }
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  findSymbol(name: string, kind?: SymbolInfo['kind']): SymbolInfo | null {
    const symbols = this.symbolIndex.get(name);
    if (!symbols || symbols.length === 0) return null;

    if (kind) {
      return symbols.find((s) => s.kind === kind) || null;
    }

    return symbols[0];
  }

  getReferences(name: string): { file: string; line: number }[] {
    return this.referenceMap.get(name) || [];
  }

  getDefinition(name: string): { file: string; line: number } | null {
    const symbol = this.findSymbol(name);
    if (!symbol) return null;
    return { file: symbol.file, line: symbol.line };
  }

  getImports(filePath: string): ImportInfo[] {
    const structure = this.files.get(filePath);
    return structure ? structure.imports : [];
  }

  getFileStructure(filePath: string): FileStructure | null {
    return this.files.get(filePath) || null;
  }

  getImportGraph(filePath: string): { dependencies: string[]; dependents: string[] } {
    return {
      dependencies: this.importGraph.get(filePath) || [],
      dependents: this.getDependents(filePath),
    };
  }

  getStats(): IndexStats {
    return { ...this.lastStats };
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clear(): void {
    this.files.clear();
    this.symbolIndex.clear();
    this.importGraph.clear();
    this.referenceMap.clear();
    this.lastStats = {
      totalFiles: 0,
      totalSymbols: 0,
      totalImports: 0,
      languages: {},
      indexedAt: 0,
    };
  }

  private analyzeFile(path: string, content: string): FileStructure {
    const language = this.detectLanguage(path);
    const lines = content.split('\n');
    const imports: ImportInfo[] = [];
    const symbols: SymbolInfo[] = [];
    const exports: string[] = [];

    const importRegex = /import\s+(?:(?:\{([^}]+)\}|(\w+))\s+from\s+)?['"](.*?)['"]/g;
    let match: RegExpExecArray | null;

    while ((match = importRegex.exec(content)) !== null) {
      if (match[1]) {
        const named = match[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        for (const name of named) {
          const cleanName = name.replace(/^type\s+/, '').trim();
          imports.push({ name: cleanName, isDefault: false, isNamespace: false, source: match[3] });
        }
      } else if (match[2]) {
        imports.push({ name: match[2], isDefault: true, isNamespace: false, source: match[3] });
      } else if (match[3]) {
        imports.push({ name: '*', isDefault: false, isNamespace: true, source: match[3] });
      }
    }

    const defaultExportRegex = /export\s+default\s+(?:class|function|const|let|var)?\s*(\w+)/g;
    while ((match = defaultExportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    const namedExportRegex =
      /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
    while ((match = namedExportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*(<[^>]*>)?\s*\(([^)]*)\)/g;
    while ((match = functionRegex.exec(content)) !== null) {
      const name = match[1];
      const isExported = content.substring(match.index - 10, match.index).includes('export');
      const lineNum = content.substring(0, match.index).split('\n').length;
      const returnType = this.inferReturnType(content, match.index);
      symbols.push({
        name,
        kind: 'function',
        file: path,
        line: lineNum,
        endLine: this.findEndLine(content, lineNum),
        signature: `${name}(${match[3]})${returnType ? `: ${returnType}` : ''}`,
        exported: isExported,
        documentation: this.extractJSDoc(content, match.index),
      });
    }

    const classRegex =
      /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?/g;
    while ((match = classRegex.exec(content)) !== null) {
      const name = match[1];
      const isExported = content.substring(match.index - 10, match.index).includes('export');
      const lineNum = content.substring(0, match.index).split('\n').length;
      symbols.push({
        name,
        kind: 'class',
        file: path,
        line: lineNum,
        endLine: this.findEndLine(content, lineNum),
        signature: `class ${name}${match[2] ? ` extends ${match[2]}` : ''}${match[3] ? ` implements ${match[3]}` : ''}`,
        exported: isExported,
        documentation: this.extractJSDoc(content, match.index),
      });
    }

    const typeRegex = /(?:export\s+)?type\s+(\w+)/g;
    while ((match = typeRegex.exec(content)) !== null) {
      const name = match[1];
      const isExported = content.substring(match.index - 10, match.index).includes('export');
      const lineNum = content.substring(0, match.index).split('\n').length;
      symbols.push({
        name,
        kind: 'type',
        file: path,
        line: lineNum,
        endLine: lineNum,
        exported: isExported,
        documentation: this.extractJSDoc(content, match.index),
      });
    }

    const interfaceRegex = /(?:export\s+)?interface\s+(\w+)/g;
    while ((match = interfaceRegex.exec(content)) !== null) {
      const name = match[1];
      const isExported = content.substring(match.index - 10, match.index).includes('export');
      const lineNum = content.substring(0, match.index).split('\n').length;
      symbols.push({
        name,
        kind: 'interface',
        file: path,
        line: lineNum,
        endLine: this.findEndLine(content, lineNum),
        exported: isExported,
        documentation: this.extractJSDoc(content, match.index),
      });
    }

    return {
      path,
      imports,
      exports: [...new Set(exports)],
      symbols,
      dependencies: [],
      dependents: [],
      lineCount: lines.length,
      language,
    };
  }

  private detectLanguage(path: string): FileStructure['language'] {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
        return 'typescript';
      case 'tsx':
        return 'tsx';
      case 'js':
        return 'javascript';
      case 'jsx':
        return 'jsx';
      default:
        return 'typescript';
    }
  }

  private findReferencesInContent(
    name: string,
    file: string,
    content: string
  ): { file: string; line: number }[] {
    const refs: { file: string; line: number }[] = [];
    const regex = new RegExp(`\\b${this.escapeRegex(name)}\\b`, 'g');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      refs.push({ file, line: lineNum });
    }

    return refs.slice(0, 50);
  }

  private calculateScore(
    symbol: SymbolInfo,
    lowerQuery: string,
    nameMatch: boolean,
    sigMatch: boolean,
    docMatch: boolean
  ): number {
    let score = 0;
    if (nameMatch) score += 10;
    if (sigMatch) score += 5;
    if (docMatch) score += 2;
    if (symbol.exported) score += 1;
    return score;
  }

  private findEndLine(content: string, startLine: number): number {
    const lines = content.split('\n');
    let braceCount = 0;
    let foundOpen = false;

    for (let i = startLine - 1; i < lines.length; i++) {
      for (const char of lines[i]) {
        if (char === '{') {
          braceCount++;
          foundOpen = true;
        } else if (char === '}') {
          braceCount--;
        }
      }
      if (foundOpen && braceCount <= 0) {
        return i + 1;
      }
    }

    return Math.min(startLine + 20, lines.length);
  }

  private inferReturnType(content: string, matchIndex: number): string | undefined {
    const afterMatch = content.substring(matchIndex);
    const returnMatch = afterMatch.match(/\):\s*([\w<>\[\],\s|&]+)/);
    if (returnMatch) {
      return returnMatch[1].trim();
    }
    return undefined;
  }

  private extractJSDoc(content: string, matchIndex: number): string | undefined {
    const beforeMatch = content.substring(0, matchIndex);
    const jsdocMatch = beforeMatch.match(/\/\*\*([\s\S]*?)\*\/\s*$/);
    if (jsdocMatch) {
      return jsdocMatch[1]
        .split('\n')
        .map((line) => line.replace(/^\s*\*\s?/, '').trim())
        .filter(Boolean)
        .join(' ');
    }
    return undefined;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private getDependents(filePath: string): string[] {
    const result: string[] = [];
    for (const [path, deps] of this.importGraph) {
      if (deps.includes(filePath)) {
        result.push(path);
      }
    }
    return result;
  }
}

export const codeNavigator = new CodeNavigator();
