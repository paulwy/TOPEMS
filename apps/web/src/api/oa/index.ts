import { addressbookApi } from '../addressbook';
import { expenseApi } from './expense';
import { meetingRoomApi, meetingBookingApi } from '../erp/admin/meeting';
import { announcementApi } from '../erp/admin/announcement';
import { vehicleApi, vehicleRequestApi } from '../erp/admin/vehicle';
import { officeSupplyApi } from '../erp/admin/officeSupplies';
import { approvalApi, approvalTaskApi, instanceApi, taskApi } from '../workflow';
import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  ExpenseClaim,
  ExpenseItem,
  OADashboardStats,
  PaginationParams,
  PaginatedResult,
} from './types';
import type {
  MeetingRoom,
  MeetingBooking,
  Announcement,
  Vehicle,
  VehicleRequest,
  OfficeSupply,
} from '../erp/types';

export * from './types';
export { expenseApi } from './expense';

export const oaApi = {
  addressbook: addressbookApi,
  expenses: expenseApi,
  meetingRooms: meetingRoomApi,
  meetingBookings: meetingBookingApi,
  announcements: announcementApi,
  vehicles: vehicleApi,
  vehicleRequests: vehicleRequestApi,
  officeSupplies: officeSupplyApi,
  approvals: approvalApi,
  approvalTasks: approvalTaskApi,
  workflowInstances: instanceApi,
  workflowTasks: taskApi,

  getContacts: addressbookApi.getContacts,
  getContactDetail: addressbookApi.getContactDetail,
  searchContacts: addressbookApi.search,
  getDepartmentTree: addressbookApi.getDepartmentTree,
  exportContacts: addressbookApi.exportContacts,

  listExpenseClaims: expenseApi.listExpenseClaims,
  getExpenseClaim: expenseApi.getExpenseClaim,
  createExpenseClaim: expenseApi.createExpenseClaim,
  updateExpenseClaim: expenseApi.updateExpenseClaim,
  deleteExpenseClaim: expenseApi.deleteExpenseClaim,
  submitExpenseClaim: expenseApi.submitExpenseClaim,
  approveExpenseClaim: expenseApi.approveExpenseClaim,
  rejectExpenseClaim: expenseApi.rejectExpenseClaim,
  getExpenseItems: expenseApi.getExpenseItems,
  getExpenseStats: expenseApi.getExpenseStats,
  getMyExpenses: expenseApi.getMyExpenses,

  listMeetingRooms: meetingRoomApi.list,
  getMeetingRoom: meetingRoomApi.get,
  createMeetingRoom: meetingRoomApi.create,
  updateMeetingRoom: meetingRoomApi.update,
  deleteMeetingRoom: meetingRoomApi.delete,
  getMeetingRoomBookings: meetingRoomApi.getBookings,

  listMeetingBookings: meetingBookingApi.list,
  getMeetingBooking: meetingBookingApi.get,
  createMeetingBooking: meetingBookingApi.create,
  updateMeetingBooking: meetingBookingApi.update,
  deleteMeetingBooking: meetingBookingApi.delete,

  listAnnouncements: announcementApi.list,
  getAnnouncement: announcementApi.get,
  createAnnouncement: announcementApi.create,
  updateAnnouncement: announcementApi.update,
  deleteAnnouncement: announcementApi.delete,
  publishAnnouncement: announcementApi.publish,
  unpublishAnnouncement: announcementApi.unpublish,

  listVehicles: vehicleApi.list,
  getVehicle: vehicleApi.get,
  createVehicle: vehicleApi.create,
  updateVehicle: vehicleApi.update,
  deleteVehicle: vehicleApi.delete,

  listVehicleRequests: vehicleRequestApi.list,
  getVehicleRequest: vehicleRequestApi.get,
  createVehicleRequest: vehicleRequestApi.create,
  updateVehicleRequest: vehicleRequestApi.update,
  deleteVehicleRequest: vehicleRequestApi.delete,

  listOfficeSupplies: officeSupplyApi.list,
  getOfficeSupply: officeSupplyApi.get,
  createOfficeSupply: officeSupplyApi.create,
  updateOfficeSupply: officeSupplyApi.update,
  deleteOfficeSupply: officeSupplyApi.delete,

  listApprovals: approvalApi.listApprovals,
  createApproval: approvalApi.create,
  getApproval: approvalApi.get,
  processApproval: approvalApi.process,

  listApprovalTasks: approvalTaskApi.listApprovalTasks,
  getApprovalTask: approvalTaskApi.getApprovalTask,
  approveTask: approvalTaskApi.approveTask,
  rejectTask: approvalTaskApi.rejectTask,
  delegateApprovalTask: approvalTaskApi.delegateTask,

  myTasks: taskApi.myTasks,
  myPendingTasks: taskApi.myPending,
  myCompletedTasks: taskApi.myCompleted,
  myInvolvedTasks: taskApi.myInvolved,
  myCreatedTasks: taskApi.myCreated,

  getDashboardStats: async (): Promise<ApiResponse<OADashboardStats>> => {
    return apiClient.erp.get<OADashboardStats>('/oa/dashboard/stats');
  },
};

export default oaApi;
