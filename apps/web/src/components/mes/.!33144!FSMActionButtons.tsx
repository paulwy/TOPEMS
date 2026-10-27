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
