export type RepairType = 'Restart' | 'ScaleUp' | 'ConfigUpdate' | 'Patched';
export type RepairStatus =
  'Pending' | 'Approved' | 'Executing' | 'Completed' | 'Failed' | 'RolledBack';
export type PlaybookStatus = 'Draft' | 'Active' | 'Paused' | 'Archived';

export interface RepairAction {
  id: string;
  type: RepairType;
  target: string;
  status: RepairStatus;
  created_at: number;
}

export interface RepairPlaybook {
  id: string;
  trigger_condition: string;
  actions: RepairAction[];
  approval_required: boolean;
  rollback_enabled: boolean;
  status: PlaybookStatus;
  name: string;
  description?: string;
}

class IntelligentRepairImpl {
  private playbooks: Map<string, RepairPlaybook> = new Map();
  private actions: Map<string, RepairAction> = new Map();
  private executions: Map<string, RepairAction[]> = new Map();
  private actionHistory: RepairAction[] = [];

  constructor() {
    this.initDefaultPlaybooks();
  }

  private initDefaultPlaybooks(): void {
    const defaults: Omit<RepairPlaybook, 'id'>[] = [
      {
        name: 'CPU High Auto-Scale',
        trigger_condition: 'CPU > 85% for 5 minutes',
        actions: [
          { id: 'pa-1', type: 'ScaleUp', target: 'api-gateway', status: 'Pending', created_at: 0 },
          {
            id: 'pa-2',
            type: 'Restart',
            target: 'order-service',
            status: 'Pending',
            created_at: 0,
          },
        ],
        approval_required: false,
        rollback_enabled: true,
        status: 'Active',
        description: '自动处理 CPU 过载场景',
      },
      {
        name: 'Database Connection Recovery',
        trigger_condition: 'DB connections > 90% pool',
        actions: [
          { id: 'pa-3', type: 'Restart', target: 'database', status: 'Pending', created_at: 0 },
          {
            id: 'pa-4',
            type: 'ConfigUpdate',
            target: 'database',
            status: 'Pending',
            created_at: 0,
          },
        ],
        approval_required: true,
        rollback_enabled: true,
        status: 'Active',
        description: '数据库连接池耗尽恢复',
      },
      {
        name: 'Memory Leak Mitigation',
        trigger_condition: 'Memory > 90% for 10 minutes',
        actions: [
          { id: 'pa-5', type: 'Restart', target: 'unified-core', status: 'Pending', created_at: 0 },
          { id: 'pa-6', type: 'Patched', target: 'unified-core', status: 'Pending', created_at: 0 },
        ],
        approval_required: true,
        rollback_enabled: true,
        status: 'Active',
        description: '内存泄漏紧急缓解',
      },
    ];

    defaults.forEach((p, i) => {
      const playbook: RepairPlaybook = { ...p, id: `pb-${Date.now()}-${i}` };
      this.playbooks.set(playbook.id, playbook);
    });
  }

  createPlaybook(
    name: string,
    triggerCondition: string,
    actions: Omit<RepairAction, 'id' | 'status' | 'created_at'>[],
    approvalRequired: boolean = false,
    rollbackEnabled: boolean = true,
    description?: string
  ): RepairPlaybook {
    const playbookActions: RepairAction[] = actions.map((a, i) => ({
      id: `act-${Date.now()}-${i}`,
      ...a,
      status: 'Pending',
      created_at: Date.now(),
    }));

    const playbook: RepairPlaybook = {
      id: `pb-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name,
      trigger_condition: triggerCondition,
      actions: playbookActions,
      approval_required: approvalRequired,
      rollback_enabled: rollbackEnabled,
      status: 'Draft',
      description,
    };

    this.playbooks.set(playbook.id, playbook);
    return playbook;
  }

  runPlaybook(playbookId: string): RepairAction[] {
    const playbook = this.playbooks.get(playbookId);
    if (!playbook) return [];

    playbook.status = 'Active';
    const executed: RepairAction[] = [];

    for (const action of playbook.actions) {
      const execAction: RepairAction = {
        ...action,
        status: 'Executing',
        created_at: Date.now(),
      };
      this.actions.set(execAction.id, execAction);
      executed.push(execAction);

      setTimeout(
        () => {
          const updated = this.actions.get(execAction.id);
          if (updated) {
            updated.status = Math.random() > 0.15 ? 'Completed' : 'Failed';
            this.actionHistory.unshift(updated);
            if (this.actionHistory.length > 500) this.actionHistory.pop();
          }
        },
        500 + Math.random() * 1500
      );
    }

    this.executions.set(playbookId, executed);
    return executed;
  }

  executeRepair(type: RepairType, target: string, approvable: boolean = false): RepairAction {
    const action: RepairAction = {
      id: `repair-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type,
      target,
      status: approvable ? 'Pending' : 'Executing',
      created_at: Date.now(),
    };

    this.actions.set(action.id, action);

    if (!approvable) {
      setTimeout(
        () => {
          const updated = this.actions.get(action.id);
          if (updated) {
            updated.status = Math.random() > 0.1 ? 'Completed' : 'Failed';
            this.actionHistory.unshift(updated);
          }
        },
        800 + Math.random() * 1200
      );
    }

    return action;
  }

  approveRepair(actionId: string): RepairAction | null {
    const action = this.actions.get(actionId);
    if (!action || action.status !== 'Pending') return null;
    action.status = 'Executing';

    setTimeout(
      () => {
        const updated = this.actions.get(actionId);
        if (updated) {
          updated.status = Math.random() > 0.1 ? 'Completed' : 'Failed';
          this.actionHistory.unshift(updated);
        }
      },
      600 + Math.random() * 1400
    );

    return action;
  }

  rollbackRepair(actionId: string): RepairAction | null {
    const action = this.actions.get(actionId);
    if (!action) return null;
    action.status = 'RolledBack';
    this.actionHistory.unshift(action);
    return action;
  }

  getRepairStatus(actionId: string): RepairAction | null {
    return this.actions.get(actionId) || null;
  }

  getPlaybooks(): RepairPlaybook[] {
    return Array.from(this.playbooks.values());
  }

  getActionHistory(limit: number = 50): RepairAction[] {
    return this.actionHistory.slice(0, limit);
  }

  togglePlaybookStatus(playbookId: string): RepairPlaybook | null {
    const playbook = this.playbooks.get(playbookId);
    if (!playbook) return null;
    playbook.status = playbook.status === 'Active' ? 'Paused' : 'Active';
    return playbook;
  }

  deletePlaybook(playbookId: string): boolean {
    const playbook = this.playbooks.get(playbookId);
    if (!playbook) return false;
    playbook.status = 'Archived';
    return true;
  }
}

export const intelligentRepair = new IntelligentRepairImpl();
export type { IntelligentRepairImpl };
