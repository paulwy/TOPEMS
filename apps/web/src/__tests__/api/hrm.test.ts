import { vi } from "vitest";
import { hrmApi } from "@/api/hrm";

// 模拟 apiClient
vi.mock("../../api/client", () => ({
  __esModule: true,
  default: {
    hrm: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// const mockApiClient = vi.mocked(apiClient);

describe("HRM API Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hrmApi", () => {
    test("should have all HRM API modules", () => {
      expect(hrmApi.departments).toBeDefined();
      expect(hrmApi.employees).toBeDefined();
      expect(hrmApi.positions).toBeDefined();
      expect(hrmApi.leave).toBeDefined();
      expect(hrmApi.attendance).toBeDefined();
      expect(hrmApi.jobOpenings).toBeDefined();
      expect(hrmApi.candidates).toBeDefined();
      expect(hrmApi.interviews).toBeDefined();
      expect(hrmApi.payroll).toBeDefined();
      expect(hrmApi.salaryAdjustments).toBeDefined();
      expect(hrmApi.performanceReviews).toBeDefined();
      expect(hrmApi.performanceGoals).toBeDefined();
      expect(hrmApi.contracts).toBeDefined();
      expect(hrmApi.contractRenewals).toBeDefined();
      expect(hrmApi.trainingPlans).toBeDefined();
      expect(hrmApi.trainingCourses).toBeDefined();
      expect(hrmApi.trainingRecords).toBeDefined();
      expect(hrmApi.health).toBeDefined();
    });

    test("leaveApi should have approve and reject methods", () => {
      expect(hrmApi.leave.approve).toBeDefined();
      expect(hrmApi.leave.reject).toBeDefined();
    });

    test("attendanceApi should have checkIn and checkOut methods", () => {
      expect(hrmApi.attendance.checkIn).toBeDefined();
      expect(hrmApi.attendance.checkOut).toBeDefined();
    });

    test("jobOpeningsApi should have publish and close methods", () => {
      expect(hrmApi.jobOpenings.publish).toBeDefined();
      expect(hrmApi.jobOpenings.close).toBeDefined();
    });

    test("interviewsApi should have complete method", () => {
      expect(hrmApi.interviews.complete).toBeDefined();
    });

    test("payrollApi should have calculate and pay methods", () => {
      expect(hrmApi.payroll.calculate).toBeDefined();
      expect(hrmApi.payroll.pay).toBeDefined();
    });

    test("performanceReviewsApi should have submit and approve methods", () => {
      expect(hrmApi.performanceReviews.submit).toBeDefined();
      expect(hrmApi.performanceReviews.approve).toBeDefined();
    });

    test("salaryAdjustmentsApi should have approve and reject methods", () => {
      expect(hrmApi.salaryAdjustments.approve).toBeDefined();
      expect(hrmApi.salaryAdjustments.reject).toBeDefined();
    });

    test("contractsApi should have getExpiring and renew methods", () => {
      expect(hrmApi.contracts.getExpiring).toBeDefined();
      expect(hrmApi.contracts.renew).toBeDefined();
    });

    test("contractRenewalsApi should have approve, reject, and execute methods", () => {
      expect(hrmApi.contractRenewals.approve).toBeDefined();
      expect(hrmApi.contractRenewals.reject).toBeDefined();
      expect(hrmApi.contractRenewals.execute).toBeDefined();
    });

    test("trainingPlansApi should have activate and deactivate methods", () => {
      expect(hrmApi.trainingPlans.activate).toBeDefined();
      expect(hrmApi.trainingPlans.deactivate).toBeDefined();
    });

    test("trainingRecordsApi should have enroll and complete methods", () => {
      expect(hrmApi.trainingRecords.enroll).toBeDefined();
      expect(hrmApi.trainingRecords.complete).toBeDefined();
    });
  });
});
