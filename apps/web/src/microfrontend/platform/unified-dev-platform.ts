import i18n from '@/i18n';
/**
 * V47.0 微前端平台终局 — 统一开发平台
 *
 * 提供从项目创建到部署上线的全流程开发环境管理:
 * - 项目创建向导（模板选择 + 配置生成 + 依赖安装）
 * - 开发服务器管理（启动/停止/重启/多项目并行）
 * - 构建管理（构建配置 + 构建任务 + 构建产物管理）
 * - 部署管理（环境配置 + 部署流水线 + 回滚）
 *
 * @example
 * import { unifiedDevPlatform, UnifiedDevPlatform } from '@/microfrontend/platform';
 *
 * const project = unifiedDevPlatform.createProject({
 *   name: 'my-app',
 *   template: 'react-ts',
 * });
 *
 * unifiedDevPlatform.startDevServer(project.project_id);
 */

export enum ProjectCategory {
  WEBAPP = 'web-app',
  MICROFRONTEND = 'micro-frontend',
  MOBILEAPP = 'mobile-app',
  DESKTOPAPP = 'desktop-app',
  APISERVICE = 'api-service',
  LIBRARY = 'library',
}

export type DevServerStatus = 'idle' | 'starting' | 'running' | 'stopped' | 'crashed';
export type BuildStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
export type BuildType = 'development' | 'production' | 'staging' | 'analyze';
export type DeploymentEnvironment = 'development' | 'staging' | 'production';
export type DeploymentStrategy = 'blue-green' | 'canary' | 'rolling' | 'recreate';
export type DeploymentStatus = 'pending' | 'deploying' | 'success' | 'failed' | 'rolled-back';

export interface ProjectTemplate {
  template_id: string;
  name: string;
  description: string;
  category: ProjectCategory;
  dependencies: string[];
  file_structure: Record<string, string>;
  config_template: Record<string, unknown>;
  icon: string;
  tags: string[];
  author: string;
  popularity: number;
}

export interface ProjectConfig {
  project_id: string;
  name: string;
  template: string;
  category: ProjectCategory;
  ports: { dev: number; preview: number; inspect: number };
  env_vars: Record<string, string>;
  dependencies: string[];
  dev_dependencies: string[];
  build_config: Record<string, unknown>;
  created_at: number;
  updated_at: number;
  path: string;
}

export interface DevServerInstance {
  project_id: string;
  port: number;
  pid: number;
  status: DevServerStatus;
  started_at: number;
  last_restart_at?: number;
  restart_count: number;
  logs: DevServerLog[];
  url: string;
}

export interface DevServerLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

export interface BuildTask {
  task_id: string;
  project_id: string;
  build_type: BuildType;
  status: BuildStatus;
  started_at: number;
  completed_at?: number;
  artifacts: BuildArtifact[];
  logs: string[];
  progress: number;
  error?: string;
}

export interface BuildArtifact {
  name: string;
  path: string;
  size_kb: number;
  hash: string;
  type: 'js' | 'css' | 'html' | 'asset' | 'source-map';
}

export interface DeploymentConfig {
  environment: DeploymentEnvironment;
  version: string;
  strategy: DeploymentStrategy;
  health_check: HealthCheckConfig;
  rollback_config: RollbackConfig;
  env_vars: Record<string, string>;
  replicas: number;
  timeout_seconds: number;
}

export interface HealthCheckConfig {
  enabled: boolean;
  path: string;
  interval_seconds: number;
  timeout_seconds: number;
  healthy_threshold: number;
  unhealthy_threshold: number;
}

export interface RollbackConfig {
  enabled: boolean;
  max_history: number;
  auto_rollback_on_failure: boolean;
  previous_version?: string;
}

export interface DeploymentRecord {
  deployment_id: string;
  project_id: string;
  config: DeploymentConfig;
  status: DeploymentStatus;
  started_at: number;
  completed_at?: number;
  previous_version?: string;
  logs: string[];
}

export interface PlatformStats {
  total_projects: number;
  active_dev_servers: number;
  running_builds: number;
  successful_deployments: number;
  failed_deployments: number;
  templates_count: number;
  total_builds: number;
  average_build_time_ms: number;
}

const PRESET_TEMPLATES: ProjectTemplate[] = [
  {
    template_id: 'react-ts',
    name: 'React + TypeScript',
    description: i18n.t('microfrontend.unified-dev-platform.k0'),
    category: ProjectCategory.WEBAPP,
    dependencies: ['react@18', 'react-dom@18', 'react-router-dom@6'],
    file_structure: {
      'src/': i18n.t('microfrontend.unified-dev-platform.k0'),
      'src/main.tsx': i18n.t('microfrontend.unified-dev-platform.k1'),
      'src/App.tsx': i18n.t('microfrontend.unified-dev-platform.k2'),
      'src/router.tsx': i18n.t('microfrontend.unified-dev-platform.k3'),
      'src/pages/': i18n.t('microfrontend.unified-dev-platform.k4'),
      'src/components/': i18n.t('microfrontend.unified-dev-platform.k5'),
      'src/store/': i18n.t('microfrontend.unified-dev-platform.k6'),
      'src/api/': i18n.t('microfrontend.unified-dev-platform.k7'),
      'src/utils/': i18n.t('microfrontend.unified-dev-platform.k8'),
      'vite.config.ts': i18n.t('microfrontend.unified-dev-platform.vite_1'),
      'tsconfig.json': i18n.t('microfrontend.unified-dev-platform.typescript_2'),
      'package.json': i18n.t('microfrontend.unified-dev-platform.k9'),
    },
    config_template: {
      framework: 'react',
      bundler: 'vite',
      typescript: true,
      port: 5173,
    },
    icon: 'atom',
    tags: ['React', 'TypeScript', 'Vite', 'SPA'],
    author: 'TOPEMS Team',
    popularity: 9800,
  },
  {
    template_id: 'vue3-ts',
    name: 'Vue 3 + TypeScript',
    description: i18n.t('microfrontend.unified-dev-platform.k3'),
    category: ProjectCategory.WEBAPP,
    dependencies: ['vue@3', 'vue-router@4', 'pinia@2'],
    file_structure: {
      'src/': i18n.t('microfrontend.unified-dev-platform.k10'),
      'src/main.ts': i18n.t('microfrontend.unified-dev-platform.k11'),
      'src/App.vue': i18n.t('microfrontend.unified-dev-platform.k12'),
      'src/router/': i18n.t('microfrontend.unified-dev-platform.k13'),
      'src/views/': i18n.t('microfrontend.unified-dev-platform.k14'),
      'src/components/': i18n.t('microfrontend.unified-dev-platform.k15'),
      'src/stores/': i18n.t('microfrontend.unified-dev-platform.pinia_4'),
      'src/api/': i18n.t('microfrontend.unified-dev-platform.k16'),
      'src/composables/': i18n.t('microfrontend.unified-dev-platform.k17'),
      'vite.config.ts': i18n.t('microfrontend.unified-dev-platform.vite_5'),
      'tsconfig.json': i18n.t('microfrontend.unified-dev-platform.typescript_6'),
      'package.json': i18n.t('microfrontend.unified-dev-platform.k18'),
    },
    config_template: {
      framework: 'vue',
      bundler: 'vite',
      typescript: true,
      port: 5174,
    },
    icon: 'leaf',
    tags: ['Vue3', 'TypeScript', 'Vite', 'Pinia'],
    author: 'TOPEMS Team',
    popularity: 8200,
  },
  {
    template_id: 'micro-frontend-react',
    name: i18n.t('microfrontend.unified-dev-platform.react_19'),
    description: i18n.t('microfrontend.unified-dev-platform.k20'),
    category: ProjectCategory.MICROFRONTEND,
    dependencies: ['react@18', 'react-dom@18', 'qiankun@2'],
    file_structure: {
      'src/': i18n.t('microfrontend.unified-dev-platform.k21'),
      'src/main.tsx': i18n.t('microfrontend.unified-dev-platform.k22'),
      'src/App.tsx': i18n.t('microfrontend.unified-dev-platform.k23'),
      'src/pages/': i18n.t('microfrontend.unified-dev-platform.k24'),
      'src/components/': i18n.t('microfrontend.unified-dev-platform.k25'),
      'src/shared/': i18n.t('microfrontend.unified-dev-platform.k26'),
      'src/bridge/': i18n.t('microfrontend.unified-dev-platform.k27'),
      'vite.config.ts': i18n.t('microfrontend.unified-dev-platform.vite_7'),
      'package.json': i18n.t('microfrontend.unified-dev-platform.k28'),
    },
    config_template: {
      framework: 'react',
      bundler: 'vite',
      micro_frontend: true,
      port: 7100,
    },
    icon: 'boxes',
    tags: [
      i18n.t('microfrontend.unified-dev-platform.k30'),
      'React',
      'qiankun',
      i18n.t('microfrontend.unified-dev-platform.k29'),
    ],
    author: 'TOPEMS Team',
    popularity: 5600,
  },
  {
    template_id: 'micro-frontend-vue',
    name: i18n.t('microfrontend.unified-dev-platform.vue_31'),
    description: i18n.t('microfrontend.unified-dev-platform.k8'),
    category: ProjectCategory.MICROFRONTEND,
    dependencies: ['vue@3', 'vue-router@4', 'wujie-core@1'],
    file_structure: {
      'src/': i18n.t('microfrontend.unified-dev-platform.k32'),
      'src/main.ts': i18n.t('microfrontend.unified-dev-platform.k33'),
      'src/App.vue': i18n.t('microfrontend.unified-dev-platform.k34'),
      'src/views/': i18n.t('microfrontend.unified-dev-platform.k35'),
      'src/components/': i18n.t('microfrontend.unified-dev-platform.k36'),
      'src/shared/': i18n.t('microfrontend.unified-dev-platform.k37'),
      'vite.config.ts': i18n.t('microfrontend.unified-dev-platform.vite_9'),
      'package.json': i18n.t('microfrontend.unified-dev-platform.k38'),
    },
    config_template: {
      framework: 'vue',
      bundler: 'vite',
      micro_frontend: true,
      port: 7200,
    },
    icon: 'boxes',
    tags: [
      i18n.t('microfrontend.unified-dev-platform.k40'),
      'Vue3',
      'wujie',
      i18n.t('microfrontend.unified-dev-platform.k39'),
    ],
    author: 'TOPEMS Team',
    popularity: 4800,
  },
  {
    template_id: 'mobile-rn',
    name: i18n.t('microfrontend.unified-dev-platform.reactnative_10'),
    description: i18n.t('microfrontend.unified-dev-platform.k11'),
    category: ProjectCategory.MOBILEAPP,
    dependencies: ['react-native@0.72', 'expo@49', 'react-navigation@6'],
    file_structure: {
      'src/': i18n.t('microfrontend.unified-dev-platform.k41'),
      'src/App.tsx': i18n.t('microfrontend.unified-dev-platform.k42'),
      'src/screens/': i18n.t('microfrontend.unified-dev-platform.k43'),
      'src/components/': i18n.t('microfrontend.unified-dev-platform.k44'),
      'src/navigation/': i18n.t('microfrontend.unified-dev-platform.k45'),
      'src/store/': i18n.t('microfrontend.unified-dev-platform.k46'),
      'src/api/': i18n.t('microfrontend.unified-dev-platform.k47'),
      'app.json': i18n.t('microfrontend.unified-dev-platform.expo_12'),
      'package.json': i18n.t('microfrontend.unified-dev-platform.k48'),
    },
    config_template: {
      framework: 'react-native',
      platform: 'expo',
      port: 8081,
    },
    icon: 'smartphone',
    tags: ['React Native', 'Expo', 'iOS', 'Android'],
    author: 'TOPEMS Team',
    popularity: 4100,
  },
  {
    template_id: 'desktop-electron',
    name: i18n.t('microfrontend.unified-dev-platform.electron_13'),
    description: i18n.t('microfrontend.unified-dev-platform.k14'),
    category: ProjectCategory.DESKTOPAPP,
    dependencies: ['electron@26', 'react@18', 'electron-builder@24'],
    file_structure: {
      'src/main/': i18n.t('microfrontend.unified-dev-platform.k49'),
      'src/renderer/': i18n.t('microfrontend.unified-dev-platform.k50'),
      'src/preload/': i18n.t('microfrontend.unified-dev-platform.k51'),
      'src/shared/': i18n.t('microfrontend.unified-dev-platform.k52'),
      'electron-builder.yml': i18n.t('microfrontend.unified-dev-platform.k53'),
      'package.json': i18n.t('microfrontend.unified-dev-platform.k54'),
    },
    config_template: {
      framework: 'electron',
      bundler: 'vite',
      port: 5180,
    },
    icon: 'monitor',
    tags: [
      'Electron',
      i18n.t('microfrontend.unified-dev-platform.k56'),
      'React',
      i18n.t('microfrontend.unified-dev-platform.k55'),
    ],
    author: 'TOPEMS Team',
    popularity: 3600,
  },
  {
    template_id: 'api-nestjs',
    name: i18n.t('microfrontend.unified-dev-platform.nestjsapi_15'),
    description: i18n.t('microfrontend.unified-dev-platform.k16'),
    category: ProjectCategory.APISERVICE,
    dependencies: ['nestjs@10', '@nestjs/swagger', '@nestjs/jwt'],
    file_structure: {
      'src/': i18n.t('microfrontend.unified-dev-platform.k57'),
      'src/main.ts': i18n.t('microfrontend.unified-dev-platform.k58'),
      'src/app.module.ts': i18n.t('microfrontend.unified-dev-platform.k59'),
      'src/modules/': i18n.t('microfrontend.unified-dev-platform.k60'),
      'src/common/': i18n.t('microfrontend.unified-dev-platform.k61'),
      'src/config/': i18n.t('microfrontend.unified-dev-platform.k62'),
      'src/entities/': i18n.t('microfrontend.unified-dev-platform.k63'),
      'nest-cli.json': i18n.t('microfrontend.unified-dev-platform.nestcli_17'),
      'package.json': i18n.t('microfrontend.unified-dev-platform.k64'),
    },
    config_template: {
      framework: 'nestjs',
      bundler: 'webpack',
      port: 3000,
    },
    icon: 'server',
    tags: ['NestJS', 'API', 'TypeScript', 'Swagger'],
    author: 'TOPEMS Team',
    popularity: 6700,
  },
  {
    template_id: 'library-ts',
    name: i18n.t('microfrontend.unified-dev-platform.typescript_18'),
    description: i18n.t('microfrontend.unified-dev-platform.k19'),
    category: ProjectCategory.LIBRARY,
    dependencies: ['typescript@5', 'rollup@3', 'vitest@0.34'],
    file_structure: {
      'src/': i18n.t('microfrontend.unified-dev-platform.k65'),
      'src/components/': i18n.t('microfrontend.unified-dev-platform.k66'),
      'src/utils/': i18n.t('microfrontend.unified-dev-platform.k67'),
      'src/index.ts': i18n.t('microfrontend.unified-dev-platform.k68'),
      'tests/': i18n.t('microfrontend.unified-dev-platform.k69'),
      'docs/': i18n.t('microfrontend.unified-dev-platform.k70'),
      'rollup.config.js': i18n.t('microfrontend.unified-dev-platform.k71'),
      'package.json': i18n.t('microfrontend.unified-dev-platform.k72'),
    },
    config_template: {
      type: 'library',
      bundler: 'rollup',
      port: 6006,
    },
    icon: 'package',
    tags: [i18n.t('microfrontend.unified-dev-platform.k73'), 'TypeScript', 'Rollup', 'Vitest'],
    author: 'TOPEMS Team',
    popularity: 5200,
  },
];

type PlatformChangeListener = (stats: PlatformStats) => void;

export class UnifiedDevPlatform {
  private templates: Map<string, ProjectTemplate> = new Map();
  private projects: Map<string, ProjectConfig> = new Map();
  private devServers: Map<string, DevServerInstance> = new Map();
  private buildTasks: Map<string, BuildTask> = new Map();
  private deployments: Map<string, DeploymentRecord[]> = new Map();
  private buildHistory: BuildTask[] = [];
  private pidCounter = 10000;
  private listeners: Set<PlatformChangeListener> = new Set();

  constructor() {
    this.initPresetTemplates();
  }

  private initPresetTemplates(): void {
    PRESET_TEMPLATES.forEach((tpl) => {
      this.templates.set(tpl.template_id, { ...tpl });
    });
  }

  // ==================== 模板管理 ====================

  listTemplates(category?: ProjectCategory): ProjectTemplate[] {
    const all = Array.from(this.templates.values());
    if (category) {
      return all.filter((t) => t.category === category);
    }
    return all.sort((a, b) => b.popularity - a.popularity);
  }

  getTemplate(templateId: string): ProjectTemplate | undefined {
    return this.templates.get(templateId);
  }

  // ==================== 项目管理 ====================

  createProject(options: {
    name: string;
    template: string;
    category?: ProjectCategory;
    env_vars?: Record<string, string>;
    extra_dependencies?: string[];
    build_config?: Record<string, unknown>;
  }): ProjectConfig | null {
    const template = this.templates.get(options.template);
    if (!template) return null;

    const projectId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    const basePort = (template.config_template.port as number) || 5173;

    const config: ProjectConfig = {
      project_id: projectId,
      name: options.name,
      template: options.template,
      category: options.category || template.category,
      ports: {
        dev: basePort,
        preview: basePort + 1,
        inspect: basePort + 9,
      },
      env_vars: { ...options.env_vars },
      dependencies: [...template.dependencies, ...(options.extra_dependencies || [])],
      dev_dependencies: ['typescript', 'eslint', 'prettier'],
      build_config: { ...template.config_template, ...(options.build_config || {}) },
      created_at: now,
      updated_at: now,
      path: `/workspace/${options.name}`,
    };

    this.projects.set(projectId, config);
    this.notifyListeners();
    return config;
  }

  getProjectStatus(projectId: string): {
    project?: ProjectConfig;
    dev_server?: DevServerInstance;
    active_builds: BuildTask[];
    latest_deployment?: DeploymentRecord;
  } | null {
    const project = this.projects.get(projectId);
    if (!project) return null;

    const devServer = this.devServers.get(projectId);
    const activeBuilds = Array.from(this.buildTasks.values()).filter(
      (t) => t.project_id === projectId && (t.status === 'pending' || t.status === 'running')
    );
    const projectDeployments = this.deployments.get(projectId) || [];
    const latestDeployment = projectDeployments[projectDeployments.length - 1];

    return {
      project,
      dev_server: devServer,
      active_builds: activeBuilds,
      latest_deployment: latestDeployment,
    };
  }

  listProjects(category?: ProjectCategory): ProjectConfig[] {
    const all = Array.from(this.projects.values());
    if (category) {
      return all.filter((p) => p.category === category);
    }
    return all.sort((a, b) => b.updated_at - a.updated_at);
  }

  deleteProject(projectId: string): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;

    this.stopDevServer(projectId);
    this.projects.delete(projectId);
    this.devServers.delete(projectId);
    this.deployments.delete(projectId);

    Array.from(this.buildTasks.values()).forEach((task) => {
      if (
        task.project_id === projectId &&
        (task.status === 'pending' || task.status === 'running')
      ) {
        task.status = 'cancelled';
        task.completed_at = Date.now();
      }
    });

    this.notifyListeners();
    return true;
  }

  // ==================== 开发服务器管理 ====================

  startDevServer(projectId: string): DevServerInstance | null {
    const project = this.projects.get(projectId);
    if (!project) return null;

    const existing = this.devServers.get(projectId);
    if (existing && existing.status === 'running') {
      return existing;
    }

    const instance: DevServerInstance = {
      project_id: projectId,
      port: project.ports.dev,
      pid: this.nextPid(),
      status: 'starting',
      started_at: Date.now(),
      restart_count: 0,
      logs: [
        {
          timestamp: Date.now(),
          level: 'info',
          message: `Starting dev server for "${project.name}" on port ${project.ports.dev}...`,
        },
      ],
      url: `http://localhost:${project.ports.dev}`,
    };

    this.devServers.set(projectId, instance);

    // 模拟异步启动完成
    setTimeout(() => {
      const current = this.devServers.get(projectId);
      if (current && current.status === 'starting') {
        current.status = 'running';
        current.logs.push({
          timestamp: Date.now(),
          level: 'info',
          message: `Dev server ready at ${current.url}`,
        });
        this.notifyListeners();
      }
    }, 200);

    this.notifyListeners();
    return instance;
  }

  stopDevServer(projectId: string): boolean {
    const instance = this.devServers.get(projectId);
    if (!instance) return false;

    instance.status = 'stopped';
    instance.logs.push({
      timestamp: Date.now(),
      level: 'info',
      message: `Dev server stopped (pid ${instance.pid})`,
    });
    this.devServers.delete(projectId);
    this.notifyListeners();
    return true;
  }

  restartDevServer(projectId: string): DevServerInstance | null {
    const instance = this.devServers.get(projectId);
    if (!instance) return null;

    instance.status = 'starting';
    instance.last_restart_at = Date.now();
    instance.restart_count++;
    instance.logs.push({
      timestamp: Date.now(),
      level: 'info',
      message: `Restarting dev server (attempt ${instance.restart_count})...`,
    });

    setTimeout(() => {
      const current = this.devServers.get(projectId);
      if (current && current.status === 'starting') {
        current.status = 'running';
        current.logs.push({
          timestamp: Date.now(),
          level: 'info',
          message: `Dev server restarted at ${current.url}`,
        });
        this.notifyListeners();
      }
    }, 200);

    this.notifyListeners();
    return instance;
  }

  getDevServer(projectId: string): DevServerInstance | undefined {
    return this.devServers.get(projectId);
  }

  listRunningDevServers(): DevServerInstance[] {
    return Array.from(this.devServers.values()).filter(
      (s) => s.status === 'running' || s.status === 'starting'
    );
  }

  appendDevServerLog(projectId: string, level: DevServerLog['level'], message: string): void {
    const instance = this.devServers.get(projectId);
    if (!instance) return;
    instance.logs.push({ timestamp: Date.now(), level, message });
    if (instance.logs.length > 500) {
      instance.logs.splice(0, instance.logs.length - 500);
    }
  }

  // ==================== 构建管理 ====================

  runBuild(projectId: string, buildType: BuildType = 'production'): BuildTask | null {
    const project = this.projects.get(projectId);
    if (!project) return null;

    const taskId = `build_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const task: BuildTask = {
      task_id: taskId,
      project_id: projectId,
      build_type: buildType,
      status: 'pending',
      started_at: Date.now(),
      artifacts: [],
      logs: [`Initializing ${buildType} build for "${project.name}"...`],
      progress: 0,
    };

    this.buildTasks.set(taskId, task);
    this.notifyListeners();

    // 模拟构建进度
    this.simulateBuild(taskId, project);

    return task;
  }

  private simulateBuild(taskId: string, project: ProjectConfig): void {
    const task = this.buildTasks.get(taskId);
    if (!task) return;

    task.status = 'running';
    const steps = [
      `Resolving dependencies for ${project.name}`,
      'Compiling TypeScript sources',
      'Bundling modules',
      'Optimizing assets',
      'Generating source maps',
      'Writing build artifacts',
    ];

    let stepIndex = 0;
    const interval = setInterval(() => {
      const current = this.buildTasks.get(taskId);
      if (!current || current.status !== 'running') {
        clearInterval(interval);
        return;
      }

      if (stepIndex < steps.length) {
        current.logs.push(steps[stepIndex]);
        current.progress = Math.round(((stepIndex + 1) / steps.length) * 100);
        stepIndex++;
      } else {
        clearInterval(interval);
        current.status = 'success';
        current.completed_at = Date.now();
        current.progress = 100;
        current.artifacts = [
          {
            name: 'index.js',
            path: `${project.path}/dist/index.js`,
            size_kb: Math.round(180 + Math.random() * 60),
            hash: this.randomHash(),
            type: 'js',
          },
          {
            name: 'index.css',
            path: `${project.path}/dist/index.css`,
            size_kb: Math.round(24 + Math.random() * 16),
            hash: this.randomHash(),
            type: 'css',
          },
          {
            name: 'index.html',
            path: `${project.path}/dist/index.html`,
            size_kb: Math.round(2 + Math.random() * 3),
            hash: this.randomHash(),
            type: 'html',
          },
        ];
        current.logs.push(`Build completed in ${current.completed_at - current.started_at}ms`);

        this.buildHistory.push({ ...current });
        if (this.buildHistory.length > 200) {
          this.buildHistory.shift();
        }
        this.notifyListeners();
      }
    }, 150);
  }

  cancelBuild(taskId: string): boolean {
    const task = this.buildTasks.get(taskId);
    if (!task || (task.status !== 'pending' && task.status !== 'running')) return false;

    task.status = 'cancelled';
    task.completed_at = Date.now();
    task.logs.push('Build cancelled by user');
    this.notifyListeners();
    return true;
  }

  getBuildTask(taskId: string): BuildTask | undefined {
    return this.buildTasks.get(taskId);
  }

  listBuildTasks(projectId?: string): BuildTask[] {
    const all = Array.from(this.buildTasks.values());
    if (projectId) {
      return all.filter((t) => t.project_id === projectId);
    }
    return all.sort((a, b) => b.started_at - a.started_at);
  }

  getBuildArtifacts(taskId: string): BuildArtifact[] {
    return this.buildTasks.get(taskId)?.artifacts || [];
  }

  // ==================== 部署管理 ====================

  deploy(projectId: string, config: DeploymentConfig): DeploymentRecord | null {
    const project = this.projects.get(projectId);
    if (!project) return null;

    const previousDeployments = this.deployments.get(projectId) || [];
    const previousVersion = previousDeployments[previousDeployments.length - 1]?.config.version;

    const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record: DeploymentRecord = {
      deployment_id: deploymentId,
      project_id: projectId,
      config: {
        ...config,
        rollback_config: { ...config.rollback_config, previous_version: previousVersion },
      },
      status: 'deploying',
      started_at: Date.now(),
      previous_version: previousVersion,
      logs: [
        `Deploying ${project.name} v${config.version} to ${config.environment} via ${config.strategy}...`,
      ],
    };

    if (!this.deployments.has(projectId)) {
      this.deployments.set(projectId, []);
    }
    this.deployments.get(projectId)!.push(record);

    // 模拟部署流程
    this.simulateDeployment(deploymentId, project.name, config);

    this.notifyListeners();
    return record;
  }

  private simulateDeployment(
    deploymentId: string,
    projectName: string,
    config: DeploymentConfig
  ): void {
    const steps = [
      `Building artifacts for ${projectName}@${config.version}`,
      `Pushing image to ${config.environment} registry`,
      `Rolling out ${config.replicas} replicas`,
      'Running health checks',
      'Switching traffic',
    ];

    let stepIndex = 0;
    const interval = setInterval(() => {
      const records = this.deployments.get(
        Array.from(this.deployments.entries()).find(([, recs]) =>
          recs.some((r) => r.deployment_id === deploymentId)
        )?.[0] || ''
      );
      const record = records?.find((r) => r.deployment_id === deploymentId);
      if (!record || record.status !== 'deploying') {
        clearInterval(interval);
        return;
      }

      if (stepIndex < steps.length) {
        record.logs.push(steps[stepIndex]);
        stepIndex++;
      } else {
        clearInterval(interval);
        if (config.health_check.enabled && Math.random() < 0.05) {
          record.status = 'failed';
          record.logs.push('Health check failed, deployment aborted');
          if (config.rollback_config.auto_rollback_on_failure && record.previous_version) {
            record.logs.push(`Auto rolling back to v${record.previous_version}`);
          }
        } else {
          record.status = 'success';
          record.logs.push(`Successfully deployed ${projectName}@${config.version}`);
        }
        record.completed_at = Date.now();
        this.notifyListeners();
      }
    }, 200);
  }

  rollback(projectId: string, targetVersion?: string): DeploymentRecord | null {
    const records = this.deployments.get(projectId);
    if (!records || records.length === 0) return null;

    const project = this.projects.get(projectId);
    if (!project) return null;

    const lastSuccess = [...records]
      .reverse()
      .find(
        (r) => r.status === 'success' && (!targetVersion || r.config.version === targetVersion)
      );
    if (!lastSuccess) return null;

    const rollbackRecord: DeploymentRecord = {
      deployment_id: `rollback_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      project_id: projectId,
      config: {
        ...lastSuccess.config,
        version: lastSuccess.config.version,
        rollback_config: { ...lastSuccess.config.rollback_config, previous_version: undefined },
      },
      status: 'success',
      started_at: Date.now(),
      completed_at: Date.now(),
      previous_version: records[records.length - 1].config.version,
      logs: [
        `Rolling back ${project.name} to v${lastSuccess.config.version}`,
        `Rollback completed successfully`,
      ],
    };

    records.push(rollbackRecord);
    this.notifyListeners();
    return rollbackRecord;
  }

  getDeploymentHistory(projectId: string): DeploymentRecord[] {
    return this.deployments.get(projectId) || [];
  }

  // ==================== 统计与订阅 ====================

  getStats(): PlatformStats {
    const successfulBuilds = this.buildHistory.filter((b) => b.status === 'success');
    const totalBuildTime = successfulBuilds.reduce(
      (sum, b) => sum + ((b.completed_at || 0) - b.started_at),
      0
    );
    const allDeployments = Array.from(this.deployments.values()).flat();

    return {
      total_projects: this.projects.size,
      active_dev_servers: this.listRunningDevServers().length,
      running_builds: Array.from(this.buildTasks.values()).filter(
        (t) => t.status === 'running' || t.status === 'pending'
      ).length,
      successful_deployments: allDeployments.filter((d) => d.status === 'success').length,
      failed_deployments: allDeployments.filter((d) => d.status === 'failed').length,
      templates_count: this.templates.size,
      total_builds: this.buildHistory.length,
      average_build_time_ms:
        successfulBuilds.length > 0 ? Math.round(totalBuildTime / successfulBuilds.length) : 0,
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

  private nextPid(): number {
    return ++this.pidCounter;
  }

  private randomHash(): string {
    return Math.random().toString(16).slice(2, 18).padEnd(16, '0');
  }
}

export const unifiedDevPlatform = new UnifiedDevPlatform();
export default unifiedDevPlatform;
