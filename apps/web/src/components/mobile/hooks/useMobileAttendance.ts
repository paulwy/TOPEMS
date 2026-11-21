/**
 * MobileAttendance state management and API calls hook
 * @refactor-split Extracted from MobileAttendancePage.tsx
 */
import type { LeaveApplication } from '@/api/mobile';

export interface LeaveForm {
  leave_type: LeaveApplication['leave_type'];
  start_date: string;
  end_date: string;
  reason: string;
}
