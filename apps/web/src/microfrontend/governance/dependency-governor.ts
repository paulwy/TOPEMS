import { moduleMarket, type MarketplaceModule } from '../marketplace/module-market';

export interface ModuleDependency {
  module_id: string;
  version: string;
  required_version: string;
  is_optional: boolean;
  is_dev: boolean;
}

export interface DependencyGraphNode {
  id: string;
  name: string;
  version: string;
  level: number;
}

export interface DependencyGraphEdge {
  from: string;
  to: string;
  required_version: string;
  is_optional: boolean;
}

export interface DependencyGraph {
  nodes: DependencyGraphNode[];
  edges: DependencyGraphEdge[];
  adjacency_map: Record<string, string[]>;
}

export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface DependencyConflict {
  module_a: string;
  module_b: string;
  dependency_name: string;
  version_a: string;
  version_b: string;
  severity: ConflictSeverity;
}

export interface VersionUpgradeSuggestion {
  module_name: string;
  current_version: string;
  suggested_version: string;
  reason: string;
  breaking_changes: string[];
  benefits: string[];
}

export interface LicenseInfo {
  module_id: string;
  license_type: string;
  is_commercial: boolean;
  attribution_required: boolean;
  license_text: string;
}

export interface DependencyStats {
  total_modules: number;
  total_dependencies: number;
  direct_dependencies: number;
  transitive_dependencies: number;
  cycles_count: number;
  conflicts_count: number;
  license_compliance_rate: number;
  avg_dependency_depth: number;
}

function parseVersion(version: string): number[] {
  const clean = version.replace(/[^0-9.]/g, '');
  return clean.split('.').map((n) => parseInt(n, 10) || 0);
}

function compareVersions(a: string, b: string): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  const len = Math.max(va.length, vb.length);
  for (let i = 0; i < len; i++) {
    const na = va[i] || 0;
    const nb = vb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

function satisfiesVersion(required: string, actual: string): boolean {
  if (!required || required === '*') return true;
  const cleanRequired = required.replace(/[>=<~^]/g, '').trim();
  if (required.startsWith('>=')) {
    return compareVersions(actual, cleanRequired) >= 0;
  }
  if (required.startsWith('>')) {
    return compareVersions(actual, cleanRequired) > 0;
  }
  if (required.startsWith('<=')) {
    return compareVersions(actual, cleanRequired) <= 0;
  }
  if (required.startsWith('<')) {
    return compareVersions(actual, cleanRequired) < 0;
  }
  if (required.startsWith('~') || required.startsWith('^')) {
    const reqParts = parseVersion(cleanRequired);
    const actParts = parseVersion(actual);
    if (reqParts[0] !== actParts[0]) return false;
    if (required.startsWith('^')) {
      return compareVersions(actual, cleanRequired) >= 0;
    }
    if (reqParts[1] !== actParts[1]) return false;
    return compareVersions(actual, cleanRequired) >= 0;
  }
  return compareVersions(actual, cleanRequired) === 0;
}

const LICENSE_COMPATIBILITY: Record<string, string[]> = {
  MIT: ['MIT', 'Apache-2.0', 'BSD', 'ISC', 'Commercial'],
  'Apache-2.0': ['Apache-2.0', 'MIT', 'BSD', 'ISC', 'Commercial'],
  BSD: ['BSD', 'MIT', 'Apache-2.0', 'ISC', 'Commercial'],
  ISC: ['ISC', 'MIT', 'Apache-2.0', 'BSD', 'Commercial'],
  GPL: ['GPL', 'Commercial'],
  'LGPL-2.1': ['LGPL-2.1', 'GPL', 'MIT', 'Apache-2.0', 'BSD', 'ISC', 'Commercial'],
  Commercial: ['Commercial', 'MIT', 'Apache-2.0', 'BSD', 'ISC'],
};

const PRESET_LICENSES: Record<string, LicenseInfo> = {
  'crm-module': {
    module_id: 'crm-module',
    license_type: 'MIT',
    is_commercial: false,
    attribution_required: true,
    license_text: 'MIT License',
  },
  'mes-dashboard': {
    module_id: 'mes-dashboard',
    license_type: 'MIT',
    is_commercial: false,
    attribution_required: true,
    license_text: 'MIT License',
  },
  'bi-advanced': {
    module_id: 'bi-advanced',
    license_type: 'Commercial',
    is_commercial: true,
    attribution_required: false,
    license_text: 'Commercial License',
  },
  'form-builder': {
    module_id: 'form-builder',
    license_type: 'MIT',
    is_commercial: false,
    attribution_required: true,
    license_text: 'MIT License',
  },
  'workflow-engine': {
    module_id: 'workflow-engine',
    license_type: 'MIT',
    is_commercial: false,
    attribution_required: true,
    license_text: 'MIT License',
  },
  'erp-integration': {
    module_id: 'erp-integration',
    license_type: 'Commercial',
    is_commercial: true,
    attribution_required: false,
    license_text: 'Commercial License',
  },
  'oauth-integration': {
    module_id: 'oauth-integration',
    license_type: 'MIT',
    is_commercial: false,
    attribution_required: true,
    license_text: 'MIT License',
  },
  'dark-theme': {
    module_id: 'dark-theme',
    license_type: 'MIT',
    is_commercial: false,
    attribution_required: true,
    license_text: 'MIT License',
  },
  'material-theme': {
    module_id: 'material-theme',
    license_type: 'MIT',
    is_commercial: false,
    attribution_required: true,
    license_text: 'MIT License',
  },
  'quality-management': {
    module_id: 'quality-management',
    license_type: 'Commercial',
    is_commercial: true,
    attribution_required: false,
    license_text: 'Commercial License',
  },
  'maintenance-module': {
    module_id: 'maintenance-module',
    license_type: 'MIT',
    is_commercial: false,
    attribution_required: true,
    license_text: 'MIT License',
  },
  'notification-center': {
    module_id: 'notification-center',
    license_type: 'MIT',
    is_commercial: false,
    attribution_required: true,
    license_text: 'MIT License',
  },
};

const UPGRADE_SUGGESTIONS: VersionUpgradeSuggestion[] = [
  {
    module_name: 'bi-advanced',
    current_version: '3.0.2',
    suggested_version: '3.1.0',
    reason: '新版本增加了更多图表类型和性能优化',
    breaking_changes: ['部分高级API参数调整'],
    benefits: ['性能提升30%', '新增5种图表类型', '修复12个已知问题'],
  },
  {
    module_name: 'dark-theme',
    current_version: '1.1.0',
    suggested_version: '1.2.0',
    reason: '新增自动切换主题功能和更多配色方案',
    breaking_changes: [],
    benefits: ['自动切换主题', '新增3套配色', '优化对比度'],
  },
  {
    module_name: 'notification-center',
    current_version: '2.0.0',
    suggested_version: '2.1.0',
    reason: '新增飞书推送通道和消息模板功能',
    breaking_changes: [],
    benefits: ['飞书推送', '消息模板', '推送统计'],
  },
  {
    module_name: 'mes-dashboard',
    current_version: '1.8.0',
    suggested_version: '1.8.2',
    reason: '修复多个生产数据计算bug',
    breaking_changes: [],
    benefits: ['修复OEE计算', '修复实时数据同步', '性能优化'],
  },
];

export class DependencyGovernor {
  private modules: Map<string, MarketplaceModule> = new Map();
  private graph: DependencyGraph | null = null;
  private cycles: string[][] = [];
  private conflicts: DependencyConflict[] = [];

  constructor() {
    this.refreshModules();
  }

  refreshModules(): void {
    const allModules = moduleMarket.listModules();
    this.modules.clear();
    allModules.forEach((m) => {
      this.modules.set(m.id, m);
    });
    this.graph = null;
    this.cycles = [];
    this.conflicts = [];
  }

  buildGraph(): DependencyGraph {
    if (this.graph) return this.graph;

    const nodes: DependencyGraphNode[] = [];
    const edges: DependencyGraphEdge[] = [];
    const adjacency_map: Record<string, string[]> = {};
    const visited = new Set<string>();
    const nodeLevels = new Map<string, number>();

    const installedModules = Array.from(this.modules.values()).filter((m) => m.installed);

    const traverse = (moduleId: string, level: number): void => {
      if (visited.has(moduleId)) {
        const existingLevel = nodeLevels.get(moduleId) ?? 0;
        if (level < existingLevel) {
          nodeLevels.set(moduleId, level);
          const node = nodes.find((n) => n.id === moduleId);
          if (node) node.level = level;
        }
        return;
      }

      const mod = this.modules.get(moduleId);
      if (!mod) return;

      visited.add(moduleId);
      nodeLevels.set(moduleId, level);

      nodes.push({
        id: mod.id,
        name: mod.name,
        version: mod.installed_version || mod.version,
        level,
      });

      if (!adjacency_map[moduleId]) {
        adjacency_map[moduleId] = [];
      }

      mod.dependencies.forEach((dep) => {
        if (!dep.is_optional) {
          adjacency_map[moduleId].push(dep.module_id);
          edges.push({
            from: moduleId,
            to: dep.module_id,
            required_version: dep.required_version,
            is_optional: dep.is_optional,
          });
          traverse(dep.module_id, level + 1);
        }
      });
    };

    installedModules.forEach((m) => {
      traverse(m.id, 0);
    });

    this.graph = { nodes, edges, adjacency_map };
    return this.graph;
  }

  detectCycles(): string[][] {
    if (this.cycles.length > 0) return this.cycles;

    const graph = this.buildGraph();
    const adjList = graph.adjacency_map;
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    const tarjan = (node: string): void => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = adjList[node] || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          tarjan(neighbor);
        } else if (recStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            const cycle = path.slice(cycleStart);
            cycle.push(neighbor);
            cycles.push([...cycle]);
          }
        }
      }

      path.pop();
      recStack.delete(node);
    };

    Object.keys(adjList).forEach((node) => {
      if (!visited.has(node)) {
        tarjan(node);
      }
    });

    const uniqueCycles = this.deduplicateCycles(cycles);
    this.cycles = uniqueCycles;
    return uniqueCycles;
  }

  private deduplicateCycles(cycles: string[][]): string[][] {
    const seen = new Set<string>();
    const result: string[][] = [];

    for (const cycle of cycles) {
      const normalized = this.normalizeCycle(cycle);
      const key = normalized.join(',');
      if (!seen.has(key)) {
        seen.add(key);
        result.push(cycle);
      }
    }

    return result;
  }

  private normalizeCycle(cycle: string[]): string[] {
    const minIndex = cycle.indexOf(
      Math.min(...cycle.map((c) => c.charCodeAt(0))) > 0 ? cycle[0] : cycle[0]
    );
    const normalized: string[] = [];
    for (let i = 0; i < cycle.length - 1; i++) {
      normalized.push(cycle[(minIndex + i) % (cycle.length - 1)]);
    }
    return normalized;
  }

  topologicalSort(): string[] | null {
    const graph = this.buildGraph();
    const adjList = graph.adjacency_map;
    const inDegree: Record<string, number> = {};

    graph.nodes.forEach((node) => {
      inDegree[node.id] = 0;
    });

    graph.edges.forEach((edge) => {
      if (inDegree[edge.to] !== undefined) {
        inDegree[edge.to]++;
      }
    });

    const queue: string[] = [];
    const result: string[] = [];

    Object.keys(inDegree).forEach((node) => {
      if (inDegree[node] === 0) {
        queue.push(node);
      }
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const neighbors = adjList[current] || [];
      for (const neighbor of neighbors) {
        if (inDegree[neighbor] !== undefined) {
          inDegree[neighbor]--;
          if (inDegree[neighbor] === 0) {
            queue.push(neighbor);
          }
        }
      }
    }

    if (result.length !== graph.nodes.length) {
      return null;
    }

    return result;
  }

  findConflicts(): DependencyConflict[] {
    if (this.conflicts.length > 0) return this.conflicts;

    const conflicts: DependencyConflict[] = [];
    const installedModules = Array.from(this.modules.values()).filter((m) => m.installed);
    const depVersions: Record<string, { moduleId: string; version: string }[]> = {};

    installedModules.forEach((mod) => {
      mod.dependencies.forEach((dep) => {
        const depMod = this.modules.get(dep.module_id);
        if (depMod && depMod.installed) {
          const actualVersion = depMod.installed_version || depMod.version;
          if (!satisfiesVersion(dep.required_version, actualVersion)) {
            conflicts.push({
              module_a: mod.id,
              module_b: dep.module_id,
              dependency_name: dep.module_id,
              version_a: dep.required_version,
              version_b: actualVersion,
              severity: this.calculateConflictSeverity(dep.required_version, actualVersion),
            });
          }
        }

        if (!depVersions[dep.module_id]) {
          depVersions[dep.module_id] = [];
        }
        depVersions[dep.module_id].push({
          moduleId: mod.id,
          version: dep.required_version,
        });
      });
    });

    for (const depName of Object.keys(depVersions)) {
      const versions = depVersions[depName];
      for (let i = 0; i < versions.length; i++) {
        for (let j = i + 1; j < versions.length; j++) {
          if (versions[i].version !== versions[j].version) {
            const depMod = this.modules.get(depName);
            const installedVersion = depMod?.installed_version || depMod?.version || 'unknown';
            const aSatisfied = satisfiesVersion(versions[i].version, installedVersion);
            const bSatisfied = satisfiesVersion(versions[j].version, installedVersion);

            if (!aSatisfied || !bSatisfied) {
              conflicts.push({
                module_a: versions[i].moduleId,
                module_b: versions[j].moduleId,
                dependency_name: depName,
                version_a: versions[i].version,
                version_b: versions[j].version,
                severity: this.calculateConflictSeverity(versions[i].version, versions[j].version),
              });
            }
          }
        }
      }
    }

    this.conflicts = conflicts;
    return conflicts;
  }

  private calculateConflictSeverity(verA: string, verB: string): ConflictSeverity {
    const a = parseVersion(verA.replace(/[^0-9.]/g, ''));
    const b = parseVersion(verB.replace(/[^0-9.]/g, ''));

    if (a[0] !== b[0]) return 'critical';
    if (a[1] !== b[1]) return 'high';
    if (a[2] !== b[2]) return 'medium';
    return 'low';
  }

  analyzeDependencies(): {
    graph: DependencyGraph;
    cycles: string[][];
    conflicts: DependencyConflict[];
    stats: DependencyStats;
  } {
    const graph = this.buildGraph();
    const cycles = this.detectCycles();
    const conflicts = this.findConflicts();
    const stats = this.getDependencyStats();

    return { graph, cycles, conflicts, stats };
  }

  getDependencyTree(moduleId: string): { node: DependencyGraphNode; children: any[] } | null {
    const graph = this.buildGraph();
    const node = graph.nodes.find((n) => n.id === moduleId);
    if (!node) return null;

    const buildTree = (id: string, visited: Set<string>): any => {
      if (visited.has(id)) return { circular: true, id };
      visited.add(id);

      const currentNode = graph.nodes.find((n) => n.id === id);
      const children = (graph.adjacency_map[id] || []).map((childId) =>
        buildTree(childId, new Set(visited))
      );

      return { node: currentNode, children };
    };

    return buildTree(moduleId, new Set());
  }

  suggestUpgrades(): VersionUpgradeSuggestion[] {
    const installed = Array.from(this.modules.values()).filter((m) => m.installed);

    return UPGRADE_SUGGESTIONS.filter((suggestion) => {
      const mod = installed.find(
        (m) => m.name.includes(suggestion.module_name)
      );
      return mod !== undefined;
    });
  }

  checkLicenseCompliance(): {
    compliant: boolean;
    issues: { module_id: string; issue: string; severity: ConflictSeverity }[];
    licenses: LicenseInfo[];
  } {
    const installedModules = Array.from(this.modules.values()).filter((m) => m.installed);
    const issues: { module_id: string; issue: string; severity: ConflictSeverity }[] = [];
    const licenses: LicenseInfo[] = [];

    const mainModule = installedModules[0];
    const mainLicense = mainModule ? PRESET_LICENSES[mainModule.id]?.license_type || 'MIT' : 'MIT';

    installedModules.forEach((mod) => {
      const licenseInfo = PRESET_LICENSES[mod.id];
      if (licenseInfo) {
        licenses.push(licenseInfo);

        const compatible = LICENSE_COMPATIBILITY[mainLicense];
        if (compatible && !compatible.includes(licenseInfo.license_type)) {
          issues.push({
            module_id: mod.id,
            issue: `许可证 ${licenseInfo.license_type} 与主项目 ${mainLicense} 不兼容`,
            severity: 'high',
          });
        }

        if (licenseInfo.is_commercial) {
          issues.push({
            module_id: mod.id,
            issue: '商业许可证，需确认授权合规',
            severity: 'medium',
          });
        }
      }
    });

    return {
      compliant: issues.length === 0,
      issues,
      licenses,
    };
  }

  getDependencyStats(): DependencyStats {
    const graph = this.buildGraph();
    const cycles = this.detectCycles();
    const conflicts = this.findConflicts();
    const licenseCheck = this.checkLicenseCompliance();

    let totalDeps = 0;
    let directDeps = 0;
    Object.values(graph.adjacency_map).forEach((deps) => {
      totalDeps += deps.length;
    });

    const rootNodes = graph.nodes.filter((n) => n.level === 0);
    rootNodes.forEach((node) => {
      directDeps += (graph.adjacency_map[node.id] || []).length;
    });

    const totalDepth = graph.nodes.reduce((sum, n) => sum + n.level, 0);
    const avgDepth = graph.nodes.length > 0 ? totalDepth / graph.nodes.length : 0;

    const totalModules = graph.nodes.length;
    const compliantLicenses = licenseCheck.licenses.filter(
      (l) => !licenseCheck.issues.some((i) => i.module_id === l.module_id)
    ).length;

    return {
      total_modules: totalModules,
      total_dependencies: totalDeps,
      direct_dependencies: directDeps,
      transitive_dependencies: totalDeps - directDeps,
      cycles_count: cycles.length,
      conflicts_count: conflicts.length,
      license_compliance_rate:
        licenseCheck.licenses.length > 0
          ? Math.round((compliantLicenses / licenseCheck.licenses.length) * 100)
          : 100,
      avg_dependency_depth: Math.round(avgDepth * 100) / 100,
    };
  }

  getTransitiveDependencies(moduleId: string): string[] {
    const graph = this.buildGraph();
    const visited = new Set<string>();

    const traverse = (id: string): void => {
      const deps = graph.adjacency_map[id] || [];
      for (const dep of deps) {
        if (!visited.has(dep)) {
          visited.add(dep);
          traverse(dep);
        }
      }
    };

    traverse(moduleId);
    return Array.from(visited);
  }
}

export const dependencyGovernor = new DependencyGovernor();
export default dependencyGovernor;
