import { type DefectRecord } from '@/api/mobile';

export interface DefectForm {
  defect_type: string;
  severity: DefectRecord['severity'];
  quantity: number;
  description: string;
}
export type ChipColor = 'warning' | 'primary' | 'success' | 'error' | 'info' | 'default';
