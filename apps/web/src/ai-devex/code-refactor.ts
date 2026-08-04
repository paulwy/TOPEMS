export type RefactoringType = 'ExtractFunction' | 'ExtractVariable' | 'Rename' | 'Inline' | 'Move';

export interface RefactoringPlan {
  id: string;
  file: string;
  type: RefactoringType;
  oldCode: string;
  newCode: string;
  reason: string;
  risk: 'low' | 'medium' | 'high';
  createdAt: number;
  status: 'pending' | 'applied' | 'rejected';
}

export type CodeIssueType = 'LongMethod' | 'Complexity' | 'Duplication' | 'GodClass';

export interface CodeIssue {
  id: string;
  file: string;
  line: number;
  type: CodeIssueType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
  metric?: {
    complexity?: number;
    length?: number;
    duplicates?: number;
    classSize?: number;
  };
}

export interface RefactoringHistory {
  planId: string;
  type: RefactoringType;
  file: string;
  appliedAt: number;
  summary: string;
}

export interface ImpactEstimate {
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  dependencies: string[];
  testCoverage: { before: number; after: number };
  risk: 'low' | 'medium' | 'high';
  description: string;
}

function generateId(): string {
  return `ref_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export class CodeRefactorer {
  private static instance: CodeRefactorer;

  private plans: Map<string, RefactoringPlan> = new Map();
  private issues: Map<string, CodeIssue> = new Map();
  private history: RefactoringHistory[] = [];
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private scannedFiles: Set<string> = new Set();

  private constructor() {}

  static getInstance(): CodeRefactorer {
    if (!CodeRefactorer.instance) {
      CodeRefactorer.instance = new CodeRefactorer();
    }
    return CodeRefactorer.instance;
  }

  scanCode(filePath: string, code?: string): CodeIssue[] {
    const issues: CodeIssue[] = [];

    if (!code) {
      issues.push({
        id: generateId(),
        file: filePath,
        line: 0,
        type: 'Complexity',
        severity: 'low',
        description: '无法获取文件内容进行扫描',
        suggestion: '确保文件可访问后重试',
      });
      this.issues.set(issues[0].id, issues[0]);
      return issues;
    }

    this.scannedFiles.add(filePath);

    const lines = code.split('\n');
    const lineCount = lines.length;

    if (lineCount > 200) {
      issues.push({
        id: generateId(),
        file: filePath,
        line: 1,
        type: 'LongMethod',
        severity: 'medium',
        description: `文件 ${filePath} 有 ${lineCount} 行，超出推荐的 200 行限制`,
        suggestion: '将文件拆分为更小的模块或组件',
        metric: { length: lineCount },
      });
    }

    const complexityPatterns = [
      { pattern: /if\s*\(/g, weight: 1 },
      { pattern: /else\s+if\s*\(/g, weight: 1 },
      { pattern: /for\s*\(/g, weight: 2 },
      { pattern: /while\s*\(/g, weight: 2 },
      { pattern: /case\s+/g, weight: 1 },
      { pattern: /&&/g, weight: 1 },
      { pattern: /\|\|/g, weight: 1 },
      { pattern: /\?\s*.*:/g, weight: 1 },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let complexity = 1;
      for (const { pattern, weight } of complexityPatterns) {
        const matches = line.match(pattern);
        if (matches) complexity += matches.length * weight;
      }

      if (complexity > 10) {
        issues.push({
          id: generateId(),
          file: filePath,
          line: i + 1,
          type: 'Complexity',
          severity: complexity > 20 ? 'high' : 'medium',
          description: `第 ${i + 1} 行圈复杂度 ${complexity}，超过阈值 10`,
          suggestion: '拆分复杂条件为独立函数，使用卫语句减少嵌套',
          metric: { complexity },
        });
      }

      const tokens = line.trim().split(/\s+/);
      if (tokens.length > 30) {
        issues.push({
          id: generateId(),
          file: filePath,
          line: i + 1,
          type: 'LongMethod',
          severity: 'medium',
          description: `第 ${i + 1} 行过长 (${line.length} 字符)`,
          suggestion: '将长行拆分为多行或提取变量',
          metric: { length: line.length },
        });
      }
    }

    const normalizedLines = lines.map((l) => l.trim());
    const seen = new Map<string, number[]>();
    for (let i = 0; i < normalizedLines.length; i++) {
      const line = normalizedLines[i];
      if (
        line.length > 20 &&
        !line.startsWith('//') &&
        !line.startsWith('*') &&
        !line.startsWith('import')
      ) {
        if (!seen.has(line)) {
          seen.set(line, []);
        }
        seen.get(line)!.push(i + 1);
      }
    }

    for (const [line, lineNumbers] of seen) {
      if (lineNumbers.length >= 3) {
        issues.push({
          id: generateId(),
          file: filePath,
          line: lineNumbers[0],
          type: 'Duplication',
          severity: 'medium',
          description: `重复代码出现 ${lineNumbers.length} 次: "${line.substring(0, 50)}..."`,
          suggestion: '提取重复代码为公共函数或常量',
          metric: { duplicates: lineNumbers.length },
        });
      }
    }

    const classPattern = /class\s+(\w+)/g;
    const classMatches = code.match(classPattern);
    if (classMatches) {
      for (const match of classMatches) {
        const className = match.replace('class ', '').trim();
        const classStart = code.indexOf(match);
        const braceStart = code.indexOf('{', classStart);
        let braceCount = 0;
        let classEnd = braceStart;
        for (let j = braceStart; j < code.length; j++) {
          if (code[j] === '{') braceCount++;
          if (code[j] === '}') braceCount--;
          if (braceCount === 0) {
            classEnd = j;
            break;
          }
        }
        const classCode = code.substring(classStart, classEnd);
        const classLineCount = classCode.split('\n').length;
        if (classLineCount > 500) {
          issues.push({
            id: generateId(),
            file: filePath,
            line: code.substring(0, classStart).split('\n').length,
            type: 'GodClass',
            severity: 'high',
            description: `类 ${className} 有 ${classLineCount} 行，可能是 God Class`,
            suggestion: '将大类拆分为多个职责单一的小类，遵循单一职责原则',
            metric: { classSize: classLineCount },
          });
        }
      }
    }

    for (const issue of issues) {
      this.issues.set(issue.id, issue);
    }

    this.emit('scan:complete', { file: filePath, issuesFound: issues.length });
    return issues;
  }

  getIssues(file?: string, type?: CodeIssueType, severity?: CodeIssue['severity']): CodeIssue[] {
    let result = Array.from(this.issues.values());
    if (file) result = result.filter((i) => i.file === file);
    if (type) result = result.filter((i) => i.type === type);
    if (severity) result = result.filter((i) => i.severity === severity);
    return result.sort((a, b) => a.severity.localeCompare(b.severity));
  }

  clearIssues(file?: string): void {
    if (file) {
      for (const [id, issue] of this.issues) {
        if (issue.file === file) {
          this.issues.delete(id);
        }
      }
    } else {
      this.issues.clear();
    }
    this.emit('issues:cleared', file || null);
  }

  createPlan(
    file: string,
    type: RefactoringType,
    oldCode: string,
    newCode: string,
    reason: string
  ): RefactoringPlan {
    const risk = this.assessRisk(type, oldCode, newCode);
    const plan: RefactoringPlan = {
      id: generateId(),
      file,
      type,
      oldCode,
      newCode,
      reason,
      risk,
      createdAt: Date.now(),
      status: 'pending',
    };

    this.plans.set(plan.id, plan);
    this.emit('plan:created', plan);
    return plan;
  }

  private assessRisk(
    type: RefactoringType,
    oldCode: string,
    newCode: string
  ): 'low' | 'medium' | 'high' {
    const oldLen = oldCode.length;
    const newLen = newCode.length;
    const changeRatio = Math.abs(newLen - oldLen) / Math.max(oldLen, 1);

    if (type === 'Move' || type === 'Rename') return 'high';
    if (changeRatio > 0.5) return 'high';
    if (changeRatio > 0.2) return 'medium';
    if (type === 'Inline') return 'medium';
    return 'low';
  }

  applyRefactoring(planId: string): RefactoringPlan | null {
    const plan = this.plans.get(planId);
    if (!plan || plan.status !== 'pending') return null;

    plan.status = 'applied';
    this.plans.set(planId, plan);

    const history: RefactoringHistory = {
      planId,
      type: plan.type,
      file: plan.file,
      appliedAt: Date.now(),
      summary: `${plan.type} on ${plan.file}: ${plan.reason}`,
    };
    this.history.push(history);

    this.emit('refactoring:applied', plan);
    return plan;
  }

  previewChanges(planId: string): { additions: string[]; removals: string[] } | null {
    const plan = this.plans.get(planId);
    if (!plan) return null;

    const oldLines = plan.oldCode.split('\n');
    const newLines = plan.newCode.split('\n');

    const removals = oldLines.filter((l) => !newLines.includes(l));
    const additions = newLines.filter((l) => !oldLines.includes(l));

    return { additions, removals };
  }

  rejectPlan(planId: string): RefactoringPlan | null {
    const plan = this.plans.get(planId);
    if (!plan) return null;

    plan.status = 'rejected';
    this.plans.set(planId, plan);
    this.emit('plan:rejected', plan);
    return plan;
  }

  getPendingPlans(): RefactoringPlan[] {
    return Array.from(this.plans.values()).filter((p) => p.status === 'pending');
  }

  getPlan(planId: string): RefactoringPlan | undefined {
    return this.plans.get(planId);
  }

  getRefactoringHistory(): RefactoringHistory[] {
    return [...this.history].sort((a, b) => b.appliedAt - a.appliedAt);
  }

  estimateImpact(planId: string): ImpactEstimate | null {
    const plan = this.plans.get(planId);
    if (!plan) return null;

    const oldLines = plan.oldCode.split('\n');
    const newLines = plan.newCode.split('\n');

    const linesAdded = newLines.filter((l) => !oldLines.includes(l)).length;
    const linesRemoved = oldLines.filter((l) => !newLines.includes(l)).length;

    const dependencies = this.extractDependencies(plan.oldCode, plan.newCode);

    const risk = this.assessRisk(plan.type, plan.oldCode, plan.newCode);

    const descriptions: Record<RefactoringType, string> = {
      ExtractFunction: '提取函数：将代码块提取为独立函数，提高复用性',
      ExtractVariable: '提取变量：将表达式提取为变量，提高可读性',
      Rename: '重命名：修改标识符名称，提高语义清晰度',
      Inline: '内联：将函数调用替换为函数体，减少间接层',
      Move: '移动：将代码移动到新位置或模块，改善组织结构',
    };

    return {
      filesChanged: 1,
      linesAdded,
      linesRemoved,
      dependencies,
      testCoverage: { before: 0, after: 0 },
      risk,
      description: descriptions[plan.type],
    };
  }

  private extractDependencies(oldCode: string, newCode: string): string[] {
    const oldImports = (oldCode.match(/import\s+.*from\s+['"].+['"]/g) || []).map((s) => {
      const match = s.match(/from\s+['"](.+)['"]/);
      return match ? match[1] : '';
    });

    const newImports = (newCode.match(/import\s+.*from\s+['"].+['"]/g) || []).map((s) => {
      const match = s.match(/from\s+['"](.+)['"]/);
      return match ? match[1] : '';
    });

    const all = [...new Set([...oldImports, ...newImports])];
    return all.filter((d) => d);
  }

  getScannedFiles(): string[] {
    return Array.from(this.scannedFiles);
  }

  on<T = unknown>(event: string, callback: (data: T) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as (data: unknown) => void);
    return () => this.off(event, callback);
  }

  off<T = unknown>(event: string, callback: (data: T) => void): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback as (data: unknown) => void);
    }
  }

  private emit(event: string, data: unknown): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(data);
        } catch {
          // ignore
        }
      });
    }
  }

  destroy(): void {
    this.plans.clear();
    this.issues.clear();
    this.history = [];
    this.scannedFiles.clear();
    this.listeners.clear();
  }
}

export const codeRefactorer = CodeRefactorer.getInstance();
