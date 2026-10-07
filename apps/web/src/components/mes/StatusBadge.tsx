import { StatusBadge as BaseStatusBadge } from '@/components/common/StatusBadge';

const STATUS_COLORS: Record<string, string> = {
  // ProductionOrder
  draft: 'bg-gray-100 text-gray-700',
  released: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  // WorkOrder
  created: 'bg-gray-100 text-gray-700',
  dispatched: 'bg-blue-100 text-blue-700',
  material_picked: 'bg-cyan-100 text-cyan-700',
  working: 'bg-indigo-100 text-indigo-700',
  reporting: 'bg-purple-100 text-purple-700',
  paused: 'bg-yellow-100 text-yellow-700',
  // WorkReport
  submitted: 'bg-blue-100 text-blue-700',
  archived: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  reworking: 'bg-orange-100 text-orange-700',
  // QualityInspection
  pending: 'bg-gray-100 text-gray-700',
  inspecting: 'bg-blue-100 text-blue-700',
  passed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  concession_received: 'bg-amber-100 text-amber-700',
  rework_assigned: 'bg-orange-100 text-orange-700',
  scrapped: 'bg-red-200 text-red-800',
  // Traceability
  active: 'bg-green-100 text-green-700',
  frozen: 'bg-cyan-100 text-cyan-700',
  locked: 'bg-red-100 text-red-700',
  investigating: 'bg-purple-100 text-purple-700',
  resolved: 'bg-gray-200 text-gray-600',
  // Equipment
  running: 'bg-green-100 text-green-700',
  idle: 'bg-yellow-100 text-yellow-700',
  calibrating: 'bg-blue-100 text-blue-700',
  down: 'bg-red-100 text-red-700',
  maintenance: 'bg-orange-100 text-orange-700',
  // Anomaly
  monitoring: 'bg-gray-100 text-gray-700',
  triggered: 'bg-red-100 text-red-700',
  acknowledged: 'bg-yellow-100 text-yellow-700',
  handling: 'bg-orange-100 text-orange-700',
  closed: 'bg-gray-200 text-gray-600',
  false_alarm_verified: 'bg-gray-200 text-gray-600',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <BaseStatusBadge
      status={status}
      colors={STATUS_COLORS}
      className='rounded-md'
    />
  );
}
