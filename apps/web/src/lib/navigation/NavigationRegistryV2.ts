import type { ModuleNavConfig, NavItemConfig, NavItem, ModuleCardConfig, NavGroup } from './types';
import { NAV_GROUPS } from './types';

type EventListener = (...args: unknown[]) => void;

class SimpleEventEmitter {
  private listeners: Map<string, EventListener[]> = new Map();
  private maxListeners = 100;

  setMaxListeners(n: number): void {
    this.maxListeners = n;
  }

  on(event: string, listener: EventListener): void {
    const arr = this.listeners.get(event) || [];
    if (arr.length >= this.maxListeners) {
      console.warn(
        `MaxListenersExceededWarning: Possible memory leak detected. ${arr.length + 1} ${event} listeners added.`
      );
    }
    arr.push(listener);
    this.listeners.set(event, arr);
  }

  off(event: string, listener: EventListener): void {
    const arr = this.listeners.get(event);
    if (!arr) return;
    const idx = arr.indexOf(listener);
    if (idx !== -1) arr.splice(idx, 1);
  }

  emit(event: string, ...args: unknown[]): void {
    const arr = this.listeners.get(event);
    if (!arr) return;
    for (const listener of [...arr]) {
      try {
        listener(...args);
      } catch (e: unknown) {
        console.error(`Error in event listener for "${event}":`, e);
      }
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

export class NavigationRegistryV2 {
  private static instance: NavigationRegistryV2;
  private modules: Map<string, ModuleNavConfig> = new Map();
  public emitter: SimpleEventEmitter;

  private constructor() {
    this.emitter = new SimpleEventEmitter();
    this.emitter.setMaxListeners(100);
  }

  static getInstance(): NavigationRegistryV2 {
    if (!NavigationRegistryV2.instance) {
      NavigationRegistryV2.instance = new NavigationRegistryV2();
    }
    return NavigationRegistryV2.instance;
  }

  registerModule(config: ModuleNavConfig): void {
    this.modules.set(config.code, config);
    this.emitter.emit('navigationUpdated', config.code);
  }

  unregisterModule(moduleCode: string): void {
    this.modules.delete(moduleCode);
    this.emitter.emit('navigationUpdated', moduleCode);
  }

  getModule(moduleCode: string): ModuleNavConfig | undefined {
    return this.modules.get(moduleCode);
  }

  getAllModules(): ModuleNavConfig[] {
    return Array.from(this.modules.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  private getModuleFirstPath(module: ModuleNavConfig): string {
    const firstNavItem = module.navItems.find((item) => item.path && item.showInSidebar !== false);
    return firstNavItem?.path || module.path;
  }

  getTopNavItems(hasPermission?: (perm: string) => boolean): NavItem[] {
    const items: NavItem[] = [];
    this.modules.forEach((module) => {
      if (module.permission && hasPermission && !hasPermission(module.permission)) {
        return;
      }
      items.push({
        code: module.code,
        label: module.name,
        icon: module.icon,
        path: this.getModuleFirstPath(module),
        permission: module.permission,
        order: module.order,
        moduleCode: module.code,
        moduleName: module.name,
        showInSidebar: false,
        showInBreadcrumb: true,
        showInTabs: false,
      });
    });
    return items.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getCoreModules(hasPermission?: (perm: string) => boolean): ModuleCardConfig[] {
    return this.getAllModules()
      .filter((m) => m.source === 'core')
      .filter((m) => !m.permission || !hasPermission || hasPermission(m.permission))
      .map((m) => this.toModuleCard(m));
  }

  getBusinessModules(hasPermission?: (perm: string) => boolean): ModuleCardConfig[] {
    return this.getAllModules()
      .filter((m) => m.source === 'plugin')
      .filter((m) => !m.permission || !hasPermission || hasPermission(m.permission))
      .map((m) => this.toModuleCard(m));
  }

  getModuleCards(hasPermission?: (perm: string) => boolean): ModuleCardConfig[] {
    return this.getAllModules()
      .filter((m) => !m.permission || !hasPermission || hasPermission(m.permission))
      .map((m) => this.toModuleCard(m));
  }

  private toModuleCard(module: ModuleNavConfig): ModuleCardConfig {
    return {
      code: module.code,
      name: module.name,
      icon: module.icon,
      path: this.getModuleFirstPath(module),
      permission: module.permission,
      status: module.status || 'online',
      source: module.source,
      suite: module.suite,
      order: module.order,
      description: module.description,
    };
  }

  getSidebarNavItems(moduleCode: string, hasPermission?: (perm: string) => boolean): NavItem[] {
    const module = this.modules.get(moduleCode);
    if (!module) return [];

    return module.navItems
      .filter((item) => item.showInSidebar !== false)
      .filter((item) => !item.permission || !hasPermission || hasPermission(item.permission))
      .map((item) => this.enrichNavItem(item, module))
      .sort((a, b) => {
        const groupOrderA = a.group ? NAV_GROUPS[a.group]?.order || 0 : 0;
        const groupOrderB = b.group ? NAV_GROUPS[b.group]?.order || 0 : 0;
        if (groupOrderA !== groupOrderB) return groupOrderA - groupOrderB;
        return (a.order || 0) - (b.order || 0);
      });
  }

  getSidebarNavGrouped(
    moduleCode: string,
    hasPermission?: (perm: string) => boolean
  ): Record<NavGroup | 'other', NavItem[]> {
    const items = this.getSidebarNavItems(moduleCode, hasPermission);
    const grouped: Record<string, NavItem[]> = {};

    items.forEach((item) => {
      const group = item.group || 'other';
      if (!grouped[group]) {
        grouped[group] = [];
      }
      grouped[group].push(item);
    });

    return grouped as Record<NavGroup | 'other', NavItem[]>;
  }

  getModuleTabs(moduleCode: string, hasPermission?: (perm: string) => boolean): NavItem[] {
    const module = this.modules.get(moduleCode);
    if (!module) return [];

    return module.navItems
      .filter((item) => item.showInTabs !== false)
      .filter((item) => !item.permission || !hasPermission || hasPermission(item.permission))
      .map((item) => this.enrichNavItem(item, module))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  findNavItemByPath(path: string): NavItem | undefined {
    for (const module of this.modules.values()) {
      const found = this.findInTree(path, module.navItems, module);
      if (found) return found;
    }
    return undefined;
  }

  findModuleByPath(path: string): ModuleNavConfig | undefined {
    for (const module of this.modules.values()) {
      if (path === module.path || path.startsWith(`${module.path}/`)) {
        return module;
      }
    }
    return undefined;
  }

  getNavHierarchy(path: string): NavItem[] {
    const hierarchy: NavItem[] = [];
    const module = this.findModuleByPath(path);
    if (!module) return hierarchy;

    hierarchy.push({
      code: module.code,
      label: module.name,
      icon: module.icon,
      path: module.path,
      permission: module.permission,
      order: module.order,
      moduleCode: module.code,
      moduleName: module.name,
    });

    const findInTree = (items: NavItemConfig[], currentHierarchy: NavItem[]): boolean => {
      for (const item of items) {
        const enriched = this.enrichNavItem(item, module);
        const newHierarchy = [...currentHierarchy, enriched];

        if (item.path === path || this.matchDynamicRoute(item.path, path)) {
          hierarchy.push(...newHierarchy.slice(1));
          return true;
        }

        if (path.startsWith(`${item.path}/`)) {
          hierarchy.push(enriched);
          if (item.children && findInTree(item.children, newHierarchy)) {
            return true;
          }
          return false;
        }

        if (item.children && findInTree(item.children, newHierarchy)) {
          return true;
        }
      }
      return false;
    };

    findInTree(module.navItems, [hierarchy[0]]);
    return hierarchy;
  }

  private findInTree(
    path: string,
    items: NavItemConfig[],
    module: ModuleNavConfig
  ): NavItem | undefined {
    for (const item of items) {
      if (item.path === path) {
        return this.enrichNavItem(item, module);
      }

      if (item.path.includes(':') && this.matchDynamicRoute(item.path, path)) {
        return this.enrichNavItem(item, module);
      }

      if (item.children) {
        const found = this.findInTree(path, item.children, module);
        if (found) return found;
      }
    }
    return undefined;
  }

  private matchDynamicRoute(routePath: string, currentPath: string): boolean {
    const routeSegments = routePath.split('/').filter(Boolean);
    const pathSegments = currentPath.split('/').filter(Boolean);

    if (routeSegments.length !== pathSegments.length) {
      return false;
    }

    for (let i = 0; i < routeSegments.length; i++) {
      const routeSegment = routeSegments[i];
      const pathSegment = pathSegments[i];

      if (!routeSegment.startsWith(':') && routeSegment !== pathSegment) {
        return false;
      }
    }

    return true;
  }

  private enrichNavItem(item: NavItemConfig, module: ModuleNavConfig): NavItem {
    return {
      ...item,
      moduleCode: module.code,
      moduleName: module.name,
      showInSidebar: item.showInSidebar !== false,
      showInBreadcrumb: item.showInBreadcrumb !== false,
      showInTabs: item.showInTabs !== false,
    };
  }


  getNavItemsGroupedByBusinessDomain(
    hasPermission?: (perm: string) => boolean
  ): Record<string, ModuleCardConfig[]> {
    const grouped: Record<string, ModuleCardConfig[]> = {};
    const allCards = this.getModuleCards(hasPermission);

    for (const card of allCards) {
      const domain = card.suite || 'other';
      if (!grouped[domain]) {
        grouped[domain] = [];
      }
      grouped[domain].push(card);
    }

    return grouped;
  }

  getAllModuleCodes(): string[] {
    return Array.from(this.modules.keys());
  }
}

export const navigationRegistryV2 = NavigationRegistryV2.getInstance();
