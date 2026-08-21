import i18n from '@/i18n';

const TRANSITIONS: Record<string, string[]> = {
  // ProductionOrder
  draft: ['released', 'cancelled'],
  released: ['in_progress', 'draft', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  // WorkOrder
  created: ['dispatched', 'cancelled'],
  dispatched: ['material_picked', 'cancelled'],
  material_picked: ['working', 'dispatched', 'cancelled'],
  working: ['reporting', 'paused', 'cancelled'],
  paused: ['working', 'cancelled'],
  reporting: ['completed'],
  // WorkReport (注意: draft 已在 ProductionOrder 中定义，此处不重复)
  submitted: ['archived', 'rejected'],
  rejected: ['reworking'],
  reworking: ['submitted'],
  // QualityInspection
  pending: ['inspecting'],
  inspecting: ['passed', 'failed'],
  failed: ['concession_received', 'rework_assigned', 'scrapped'],
  // Traceability
  active: ['frozen'],
  frozen: ['locked', 'active'],
  locked: ['investigating', 'active'],
  investigating: ['resolved', 'active'],
  // Equipment
  running: ['idle', 'calibrating', 'down', 'scrapped'],
  idle: ['running', 'scrapped'],
  calibrating: ['running'],
  down: ['maintenance'],
  maintenance: ['running'],
  // Anomaly
  monitoring: ['triggered'],
  triggered: ['false_alarm_verified', 'acknowledged'],
  acknowledged: ['handling'],
  handling: ['closed'],
};

const APPROVAL_TRANSITIONS: Set<string> = new Set([
  'in_progress→cancelled',
  'completed→cancelled',
  'rejected→reworking',
  'failed→concession_received',
  'frozen→active',
  'locked→active',
  'investigating→active',
  'running→scrapped',
  'idle→scrapped',
  'acknowledged→handling',
]);

interface FSMActionButtonsProps {
  status: string;
  onTransition: (to: string) => void;
  disabled?: boolean;
}

export function FSMActionButtons({ status, onTransition, disabled }: FSMActionButtonsProps) {
  const possible = TRANSITIONS[status] ?? [];
  return (
    <div className='flex gap-2'>
      {possible.map((to) => {
        const requiresApproval = APPROVAL_TRANSITIONS.has(`${status}→${to}`);
        return (
          <button
            key={to}
            type='button'
            disabled={disabled}
            onClick={() => onTransition(to)}
            className={
              requiresApproval
                ? 'inline-flex items-center rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50'
                : 'inline-flex items-center rounded-md bg-blue-600 px-3 py-1 text-sm text-var(--color-primary-foreground) hover:bg-blue-700 disabled:opacity-50'
            }
          >
            {to.replace(/_/g, ' ')}
            {requiresApproval && i18n.t('components.fsm_action_buttons.k0')}
          </button>
        );
      })}
    </div>
  );
}
