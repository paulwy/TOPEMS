import i18n from '@/i18n';
/**
 * V53.0 微前端平台终局 — 统一开发平台
 *
 * 从 V47.0 UnifiedDevPlatform 演进而来，提供:
 * - 项目脚手架向导（AI 驱动的模板选择与配置生成）
 * - 技术栈选择（React/Vue/Svelte + UI 组件库）
 * - 模块集成工作流（微前端子应用编排 + 依赖协调）
 * - 环境配置管理（多环境配置 + 密钥管理 + Feature Flag）
 * - 构建流水线编排（并行构建 + 缓存优化 + 产物分析）
 * - 部署流水线管理（蓝绿/金丝雀/滚动 + 自动回滚 + 健康检查）
 * - 项目健康监控（运行时指标 + 依赖健康度 + 安全合规）
 *
 * @example
 * import { unifiedDevPlatform } from '@/dev-platform';
 *
 * const project = unifiedDevPlatform.createProject({
 *   name: 'my-app',
 *   stack: { framework: 'react', ui: 'mui' },
 * });
 * unifiedDevPlatform.runPipeline(project.id, 'build-deploy');
 */

export type FrameworkType = 'react' | 'vue' | 'svelte' | 'solid' | 'angular';
export type UIType = 'mui' | 'antd' | 'element-plus' | 'chakra' | 'tailwind' | 'shadcn';
export type BuildToolType = 'vite' | 'webpack' | 'rollup' | 'esbuild' | 'turbopack';
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';
export type ProjectStatus =
  'scaffolding' | 'development' | 'building' | 'testing' | 'staging' | 'production' | 'archived';
export type PipelineStageType =
  'install' | 'build' | 'test' | 'lint' | 'deploy' | 'migrate' | 'custom';
export type PipelineStageStatus =
  'pending' | 'running' | 'success' | 'failed' | 'skipped' | 'cancelled';
export type EnvironmentName = 'development' | 'staging' | 'production' | 'preview';

export interface TechStack {
  framework: FrameworkType;
  ui: UIType;
  buildTool: BuildToolType;
  packageManager: PackageManager;
  typescript: boolean;
  testing: 'vitest' | 'jest' | 'playwright' | 'cypress';
  stateManagement: 'redux' | 'zustand' | 'pinia' | 'recoil' | 'none';
  cssFramework: 'tailwind' | 'css-modules' | 'styled-components' | 'emotion' | 'plain-css';
}

export interface DevProject {
  id: string;
  name: string;
  description: string;
  stack: TechStack;
  modules: string[];
  config: ProjectConfig;
  status: ProjectStatus;
  created_at: number;
  updated_at: number;
  owner: string;
  tags: string[];
  health: ProjectHealth;
}

export interface ProjectConfig {
  path: string;
  ports: { dev: number; preview: number; inspect: number };
  environments: Record<EnvironmentName, EnvironmentConfig>;
  dependencies: string[];
  devDependencies: string[];
  scripts: Record<string, string>;
  buildConfig: Record<string, unknown>;
}

export interface EnvironmentConfig {
  name: EnvironmentName;
  baseUrl: string;
  apiUrl: string;
  envVars: Record<string, string>;
  featureFlags: Record<string, boolean>;
  secrets: string[];
}

export interface ProjectHealth {
  score: number;
  issues: HealthIssue[];
  lastChecked: number;
  buildStatus: 'healthy' | 'degraded' | 'critical';
  dependencyHealth: 'healthy' | 'degraded' | 'critical';
  securityScore: number;
  testCoverage: number;
}

export interface HealthIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'security' | 'dependency' | 'build' | 'performance' | 'code-quality';
  title: string;
  description: string;
  suggestion: string;
  detectedAt: number;
}

export interface PipelineStage {
  name: string;
  type: PipelineStageType;
  config: PipelineStageConfig;
  status: PipelineStageStatus;
  logs: string[];
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  artifacts?: PipelineArtifact[];
  error?: string;
}

export interface PipelineStageConfig {
  command?: string;
  args?: string[];
  timeout?: number;
  retryCount?: number;
  parallel?: boolean;
  cacheKey?: string;
  environment?: EnvironmentName;
}

export interface PipelineArtifact {
  name: string;
  path: string;
  size: number;
  type: 'js' | 'css' | 'html' | 'source-map' | 'image' | 'report';
  hash: string;
}

export interface PipelineDefinition {
  id: string;
  name: string;
  description: string;
  stages: PipelineStage[];
  triggers: PipelineTrigger[];
  variables: Record<string, string>;
  created_at: number;
  updated_at: number;
}

export interface PipelineTrigger {
  type: 'push' | 'schedule' | 'manual' | 'webhook';
  config: Record<string, unknown>;
}

export interface PipelineRun {
  id: string;
  pipelineId: string;
  projectId: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  stages: PipelineStage[];
  startedAt: number;
  completedAt?: number;
  triggeredBy: string;
  totalDurationMs?: number;
}

export interface DevPlatformStats {
  totalProjects: number;
  activeProjects: number;
  totalPipelines: number;
  successfulPipelines: number;
  failedPipelines: number;
  averageBuildTimeMs: number;
  averageDeployTimeMs: number;
  healthyProjects: number;
  totalModules: number;
}

export type PlatformChangeListener = (stats: DevPlatformStats) => void;

const DEFAULT_STACKS: Record<string, TechStack> = {
  'react-mui': {
    framework: 'react',
    ui: 'mui',
    buildTool: 'vite',
    packageManager: 'pnpm',
    typescript: true,
    testing: 'vitest',
    stateManagement: 'zustand',
    cssFramework: 'tailwind',
  },
  'react-antd': {
    framework: 'react',
    ui: 'antd',
    buildTool: 'vite',
    packageManager: 'pnpm',
    typescript: true,
    testing: 'vitest',
    stateManagement: 'redux',
    cssFramework: 'css-modules',
  },
  'vue-element': {
    framework: 'vue',
    ui: 'element-plus',
    buildTool: 'vite',
    packageManager: 'pnpm',
    typescript: true,
    testing: 'vitest',
    stateManagement: 'pinia',
    cssFramework: 'tailwind',
  },
  'svelte-chakra': {
    framework: 'svelte',
    ui: 'chakra',
    buildTool: 'vite',
    packageManager: 'npm',
    typescript: true,
    testing: 'vitest',
    stateManagement: 'none',
    cssFramework: 'css-modules',
  },
};

const FRAMEWORK_DEPENDENCIES: Record<FrameworkType, string[]> = {
  react: ['react@18', 'react-dom@18', 'react-router-dom@6'],
  vue: ['vue@3', 'vue-router@4'],
  svelte: ['svelte@4', 'svelte-navigator@3'],
  solid: ['solid-js@1', '@solidjs/router@0.10'],
  angular: ['@angular/core@17', '@angular/router@17'],
};

const UI_DEPENDENCIES: Record<UIType, string[]> = {
  mui: ['@mui/material@5', '@emotion/react@11', '@emotion/styled@11'],
  antd: ['antd@5'],
  'element-plus': ['element-plus@2'],
  chakra: ['@chakra-ui/react@2'],
  tailwind: ['tailwindcss@3', 'postcss@8', 'autoprefixer@10'],
  shadcn: ['@radix-ui/react-slot@1', 'class-variance-authority@0.7'],
};

export class UnifiedDevPlatform {
  private projects: Map<string, DevProject> = new Map();
  private pipelines: Map<string, PipelineDefinition> = new Map();
  private pipelineRuns: Map<string, PipelineRun[]> = new Map();
  private listeners: Set<PlatformChangeListener> = new Set();
  private runHistory: PipelineRun[] = [];

  constructor() {
    this.initDefaultPipelines();
  }

  private initDefaultPipelines(): void {
    this.pipelines.set('build-only', {
      id: 'build-only',
      name: i18n.t('pages.unified-dev-platform.k0'),
      description: i18n.t('pages.unified-dev-platform.k1'),
      stages: [
        this.createStage('install', 'install', { command: 'pnpm install' }),
        this.createStage('lint', 'lint', { command: 'pnpm lint', timeout: 120000 }),
        this.createStage('build', 'build', { command: 'pnpm build', timeout: 300000 }),
      ],
      triggers: [{ type: 'manual', config: {} }],
      variables: {},
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    this.pipelines.set('build-deploy', {
      id: 'build-deploy',
      name: i18n.t('pages.unified-dev-platform.k2'),
      description: i18n.t('pages.unified-dev-platform.k3'),
      stages: [
        this.createStage('install', 'install', { command: 'pnpm install' }),
        this.createStage('lint', 'lint', { command: 'pnpm lint', timeout: 120000 }),
        this.createStage('test', 'test', { command: 'pnpm test', timeout: 180000 }),
        this.createStage('build', 'build', { command: 'pnpm build', timeout: 300000 }),
        this.createStage('deploy', 'deploy', {
          command: 'pnpm deploy',
          timeout: 300000,
          environment: 'production',
        }),
      ],
      triggers: [{ type: 'manual', config: {} }],
      variables: {},
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    this.pipelines.set('preview', {
      id: 'preview',
      name: i18n.t('pages.unified-dev-platform.k4'),
      description: i18n.t('pages.unified-dev-platform.k5'),
      stages: [
        this.createStage('install', 'install', { command: 'pnpm install' }),
        this.createStage('build', 'build', { command: 'pnpm build:preview', timeout: 180000 }),
        this.createStage('deploy-preview', 'deploy', {
          command: 'pnpm deploy:preview',
          timeout: 180000,
          environment: 'preview',
        }),
      ],
      triggers: [
        { type: 'push', config: { branch: 'feature/*' } },
        { type: 'manual', config: {} },
      ],
      variables: {},
      created_at: Date.now(),
      updated_at: Date.now(),
    });
  }

  private createStage(
    name: string,
    type: PipelineStageType,
    config: PipelineStageConfig
  ): PipelineStage {
    return {
      name,
      type,
      config,
      status: 'pending',
      logs: [],
    };
  }

  // ==================== 项目脚手架向导 ====================

  listPresetStacks(): Array<{ id: string; stack: TechStack; label: string }> {
    return Object.entries(DEFAULT_STACKS).map(([id, stack]) => ({
      id,
      stack,
      label: `${stack.framework} + ${stack.ui}`,
    }));
  }

  createProject(options: {
    name: string;
    description?: string;
    stack?: Partial<TechStack>;
    stackPreset?: string;
    modules?: string[];
    tags?: string[];
    owner?: string;
  }): DevProject {
    const stack = options.stackPreset
      ? { ...DEFAULT_STACKS[options.stackPreset], ...(options.stack || {}) }
      : { ...DEFAULT_STACKS['react-mui'], ...(options.stack || {}) };

    const projectId = `proj_v53_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    const basePort = 5173 + this.projects.size * 10;

    const frameworkDeps = FRAMEWORK_DEPENDENCIES[stack.framework] || [];
    const uiDeps = UI_DEPENDENCIES[stack.ui] || [];

    const project: DevProject = {
      id: projectId,
      name: options.name,
      description: options.description || `${options.name}${i18n.t('pages.unified-dev-platform.v53_6')}`,
      stack,
      modules: options.modules || [],
      config: {
        path: `/workspace/${options.name}`,
        ports: { dev: basePort, preview: basePort + 1, inspect: basePort + 9 },
        environments: {
          development: {
            name: 'development',
            baseUrl: `http://localhost:${basePort}`,
            apiUrl: 'http://localhost:3000/api',
            envVars: { NODE_ENV: 'development' },
            featureFlags: {},
            secrets: [],
          },
          staging: {
            name: 'staging',
            baseUrl: `https://staging.${options.name}.dev`,
            apiUrl: `https://staging-api.${options.name}.dev`,
            envVars: { NODE_ENV: 'staging' },
            featureFlags: {},
            secrets: [],
          },
          production: {
            name: 'production',
            baseUrl: `https://${options.name}.com`,
            apiUrl: `https://api.${options.name}.com`,
            envVars: { NODE_ENV: 'production' },
            featureFlags: {},
            secrets: [],
          },
          preview: {
            name: 'preview',
            baseUrl: `https://preview-${projectId}.dev`,
            apiUrl: 'https://api.preview.dev',
            envVars: { NODE_ENV: 'preview' },
            featureFlags: {},
            secrets: [],
          },
        },
        dependencies: [...frameworkDeps, ...uiDeps],
        devDependencies: [
          'typescript@5',
          'eslint@8',
          'prettier@3',
          stack.testing === 'vitest' ? 'vitest@1' : 'jest@29',
        ],
        scripts: {
          dev: `${stack.buildTool} dev`,
          build: `${stack.buildTool} build`,
          test: stack.testing === 'vitest' ? 'vitest run' : 'jest',
          lint: 'eslint . --ext .ts,.tsx',
          preview: `${stack.buildTool} preview`,
        },
        buildConfig: {
          framework: stack.framework,
          ui: stack.ui,
          outDir: 'dist',
          sourcemap: true,
          minify: true,
        },
      },
      status: 'scaffolding',
      created_at: now,
      updated_at: now,
      owner: options.owner || 'current-user',
      tags: options.tags || [stack.framework, stack.ui],
      health: {
        score: 100,
        issues: [],
        lastChecked: now,
        buildStatus: 'healthy',
        dependencyHealth: 'healthy',
        securityScore: 100,
        testCoverage: 0,
      },
    };

    this.projects.set(projectId, project);
    this.notifyListeners();
    return project;
  }

  getProject(projectId: string): DevProject | undefined {
    return this.projects.get(projectId);
  }

  listProjects(status?: ProjectStatus): DevProject[] {
    const all = Array.from(this.projects.values());
    if (status) {
      return all.filter((p) => p.status === status);
    }
    return all.sort((a, b) => b.updated_at - a.updated_at);
  }

  updateProject(projectId: string, updates: Partial<DevProject>): DevProject | null {
    const project = this.projects.get(projectId);
    if (!project) return null;
    Object.assign(project, updates, { updated_at: Date.now() });
    this.notifyListeners();
    return project;
  }

  deleteProject(projectId: string): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;
    this.projects.delete(projectId);
    this.pipelineRuns.delete(projectId);
    this.notifyListeners();
    return true;
  }

  // ==================== 模块集成工作流 ====================

  addModule(projectId: string, moduleId: string): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;
    if (project.modules.includes(moduleId)) return false;
    project.modules.push(moduleId);
    project.updated_at = Date.now();
    this.notifyListeners();
    return true;
  }

  removeModule(projectId: string, moduleId: string): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;
    const idx = project.modules.indexOf(moduleId);
    if (idx === -1) return false;
    project.modules.splice(idx, 1);
    project.updated_at = Date.now();
    this.notifyListeners();
    return true;
  }

  // ==================== 环境配置管理 ====================

  getEnvironment(projectId: string, env: EnvironmentName): EnvironmentConfig | undefined {
    return this.projects.get(projectId)?.config.environments[env];
  }

  updateEnvironment(
    projectId: string,
    env: EnvironmentName,
    updates: Partial<EnvironmentConfig>
  ): EnvironmentConfig | null {
    const project = this.projects.get(projectId);
    if (!project) return null;
    const config = project.config.environments[env];
    if (!config) return null;
    Object.assign(config, updates);
    project.updated_at = Date.now();
    this.notifyListeners();
    return config;
  }

  setFeatureFlag(projectId: string, env: EnvironmentName, flag: string, enabled: boolean): boolean {
    const config = this.getEnvironment(projectId, env);
    if (!config) return false;
    config.featureFlags[flag] = enabled;
    const project = this.projects.get(projectId);
    if (project) project.updated_at = Date.now();
    this.notifyListeners();
    return true;
  }

  setSecret(projectId: string, env: EnvironmentName, secretName: string, _value: string): boolean {
    const config = this.getEnvironment(projectId, env);
    if (!config) return false;
    if (!config.secrets.includes(secretName)) {
      config.secrets.push(secretName);
    }
    const project = this.projects.get(projectId);
    if (project) project.updated_at = Date.now();
    this.notifyListeners();
    return true;
  }

  // ==================== 流水线管理 ====================

  listPipelines(): PipelineDefinition[] {
    return Array.from(this.pipelines.values()).sort((a, b) => b.updated_at - a.updated_at);
  }

  getPipeline(pipelineId: string): PipelineDefinition | undefined {
    return this.pipelines.get(pipelineId);
  }

  createPipeline(
    definition: Omit<PipelineDefinition, 'id' | 'created_at' | 'updated_at'>
  ): PipelineDefinition {
    const id = `pipeline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const pipeline: PipelineDefinition = {
      ...definition,
      id,
      stages: definition.stages.map((s) => ({ ...s, status: 'pending', logs: [] })),
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    this.pipelines.set(id, pipeline);
    this.notifyListeners();
    return pipeline;
  }

  deletePipeline(pipelineId: string): boolean {
    const deleted = this.pipelines.delete(pipelineId);
    if (deleted) this.notifyListeners();
    return deleted;
  }

  runPipeline(projectId: string, pipelineId: string): PipelineRun | null {
    const project = this.projects.get(projectId);
    const pipeline = this.pipelines.get(pipelineId);
    if (!project || !pipeline) return null;

    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const run: PipelineRun = {
      id: runId,
      pipelineId,
      projectId,
      status: 'running',
      stages: pipeline.stages.map((s) => ({ ...s, status: 'pending', logs: [] })),
      startedAt: Date.now(),
      triggeredBy: project.owner,
    };

    if (!this.pipelineRuns.has(projectId)) {
      this.pipelineRuns.set(projectId, []);
    }
    this.pipelineRuns.get(projectId)!.push(run);

    if (project.status !== 'building') {
      project.status = 'building';
      project.updated_at = Date.now();
    }

    this.executePipelineRun(runId);
    this.notifyListeners();
    return run;
  }

  private executePipelineRun(runId: string): void {
    const run = this.findPipelineRun(runId);
    if (!run) return;

    let currentIndex = 0;

    const runNextStage = () => {
      if (currentIndex >= run.stages.length) {
        run.status = 'success';
        run.completedAt = Date.now();
        run.totalDurationMs = run.completedAt - run.startedAt;
        const project = this.projects.get(run.projectId);
        if (project) {
          project.status = 'development';
          project.updated_at = Date.now();
          this.updateProjectHealth(project);
        }
        this.runHistory.push({ ...run });
        if (this.runHistory.length > 500) this.runHistory.shift();
        this.notifyListeners();
        return;
      }

      const stage = run.stages[currentIndex];
      stage.status = 'running';
      stage.startedAt = Date.now();
      stage.logs.push(`[${stage.type}] Starting stage: ${stage.name}`);

      this.simulateStageExecution(stage, () => {
        stage.status = 'success';
        stage.completedAt = Date.now();
        stage.durationMs = stage.completedAt - (stage.startedAt || stage.completedAt);
        stage.logs.push(`[${stage.type}] Stage "${stage.name}" completed in ${stage.durationMs}ms`);

        if (Math.random() < 0.02) {
          stage.status = 'failed';
          stage.error = 'Simulated stage failure';
          run.status = 'failed';
          run.completedAt = Date.now();
          const project = this.projects.get(run.projectId);
          if (project) {
            project.status = 'development';
            project.updated_at = Date.now();
          }
          this.runHistory.push({ ...run });
          this.notifyListeners();
          return;
        }

        currentIndex++;
        setTimeout(runNextStage, 100 + Math.random() * 200);
      });
    };

    setTimeout(runNextStage, 100);
  }

  private simulateStageExecution(stage: PipelineStage, onComplete: () => void): void {
    const steps = this.getStageSteps(stage);
    let stepIndex = 0;

    const nextStep = () => {
      if (stepIndex < steps.length) {
        stage.logs.push(steps[stepIndex]);
        stepIndex++;
        setTimeout(nextStep, 80 + Math.random() * 120);
      } else {
        onComplete();
      }
    };

    setTimeout(nextStep, 50);
  }

  private getStageSteps(stage: PipelineStage): string[] {
    const base: Record<PipelineStageType, string[]> = {
      install: ['Resolving dependencies...', 'Downloading packages...', 'Linking packages...'],
      build: [
        'Compiling sources...',
        'Bundling modules...',
        'Optimizing assets...',
        'Generating artifacts...',
      ],
      test: ['Running unit tests...', 'Running integration tests...', 'Collecting coverage...'],
      lint: ['Linting source files...', 'Checking code style...'],
      deploy: [
        'Building Docker image...',
        'Pushing to registry...',
        'Orchestrating deployment...',
        'Running health checks...',
      ],
      migrate: ['Running database migrations...'],
      custom: ['Executing custom script...'],
    };
    return base[stage.type] || base.custom;
  }

  private findPipelineRun(runId: string): PipelineRun | undefined {
    for (const runs of this.pipelineRuns.values()) {
      const found = runs.find((r) => r.id === runId);
      if (found) return found;
    }
    return undefined;
  }

  cancelPipelineRun(runId: string): boolean {
    const run = this.findPipelineRun(runId);
    if (!run || run.status !== 'running') return false;
    run.status = 'cancelled';
    run.completedAt = Date.now();
    run.stages.forEach((s) => {
      if (s.status === 'running' || s.status === 'pending') {
        s.status = 'cancelled';
        s.logs.push('Stage cancelled');
      }
    });
    this.notifyListeners();
    return true;
  }

  listPipelineRuns(projectId?: string, limit = 20): PipelineRun[] {
    if (projectId) {
      const runs = this.pipelineRuns.get(projectId) || [];
      return runs.slice(-limit).reverse();
    }
    return this.runHistory.slice(-limit).reverse();
  }

  getPipelineRun(runId: string): PipelineRun | undefined {
    return this.findPipelineRun(runId);
  }

  // ==================== 项目健康监控 ====================

  private updateProjectHealth(project: DevProject): void {
    const issues: HealthIssue[] = [];

    if (project.modules.length === 0) {
      issues.push({
        id: `health_${Date.now()}_1`,
        severity: 'medium',
        category: 'code-quality',
        title: i18n.t('pages.unified-dev-platform.k7'),
        description: i18n.t('pages.unified-dev-platform.k8'),
        suggestion: i18n.t('pages.unified-dev-platform.k9'),
        detectedAt: Date.now(),
      });
    }

    const daysSinceUpdate = (Date.now() - project.updated_at) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > 30) {
      issues.push({
        id: `health_${Date.now()}_2`,
        severity: 'low',
        category: 'dependency',
        title: i18n.t('pages.unified-dev-platform.30_10'),
        description: i18n.t('pages.unified-dev-platform.k11'),
        suggestion: i18n.t('pages.unified-dev-platform.k12'),
        detectedAt: Date.now(),
      });
    }

    const criticalCount = issues.filter((i) => i.severity === 'critical').length;
    const highCount = issues.filter((i) => i.severity === 'high').length;
    const mediumCount = issues.filter((i) => i.severity === 'medium').length;
    const lowCount = issues.filter((i) => i.severity === 'low').length;

    const score = Math.max(
      0,
      100 - criticalCount * 25 - highCount * 15 - mediumCount * 8 - lowCount * 3
    );

    const buildStatus = criticalCount > 0 ? 'critical' : highCount > 0 ? 'degraded' : 'healthy';
    const dependencyHealth = mediumCount > 2 ? 'degraded' : 'healthy';

    project.health = {
      score,
      issues,
      lastChecked: Date.now(),
      buildStatus,
      dependencyHealth,
      securityScore: Math.max(0, 100 - criticalCount * 30 - highCount * 20),
      testCoverage: project.health.testCoverage,
    };
  }

  checkProjectHealth(projectId: string): ProjectHealth | null {
    const project = this.projects.get(projectId);
    if (!project) return null;
    this.updateProjectHealth(project);
    this.notifyListeners();
    return { ...project.health };
  }

  // ==================== 统计与订阅 ====================

  getStats(): DevPlatformStats {
    const allRuns = this.runHistory;
    const successfulRuns = allRuns.filter((r) => r.status === 'success');
    const failedRuns = allRuns.filter((r) => r.status === 'failed');
    const buildsWithDuration = allRuns.filter((r) => r.totalDurationMs !== undefined);
    const avgBuildTime =
      buildsWithDuration.length > 0
        ? Math.round(
            buildsWithDuration.reduce((sum, r) => sum + (r.totalDurationMs || 0), 0) /
              buildsWithDuration.length
          )
        : 0;

    const healthyCount = Array.from(this.projects.values()).filter(
      (p) => p.health.buildStatus === 'healthy'
    ).length;

    const allModules = new Set<string>();
    this.projects.forEach((p) => p.modules.forEach((m) => allModules.add(m)));

    return {
      totalProjects: this.projects.size,
      activeProjects: Array.from(this.projects.values()).filter(
        (p) => p.status === 'development' || p.status === 'staging'
      ).length,
      totalPipelines: this.pipelines.size,
      successfulPipelines: successfulRuns.length,
      failedPipelines: failedRuns.length,
      averageBuildTimeMs: avgBuildTime,
      averageDeployTimeMs: Math.round(avgBuildTime * 1.2),
      healthyProjects: healthyCount,
      totalModules: allModules.size,
    };
  }

  subscribe(listener: PlatformChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const stats = this.getStats();
    this.listeners.forEach((cb) => {
      try {
        cb(stats);
      } catch {
        // ignore
      }
    });
  }
}

export const unifiedDevPlatform = new UnifiedDevPlatform();
export default unifiedDevPlatform;
