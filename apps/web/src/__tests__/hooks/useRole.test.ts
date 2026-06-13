import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRole } from "../../hooks/useRole";

// Mock useAuth
vi.mock("../../hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    hasRole: vi.fn((role: string) => {
      const roles = ["admin", "manager", "user"];
      return roles.includes(role);
    }),
    roles: ["admin", "manager", "user"],
    user: { id: "1", name: "Test User", is_superuser: false },
  })),
}));

describe("useRole hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should return roles from auth", () => {
      const { result } = renderHook(() => useRole());
      expect(result.current.roles).toContain("admin");
      expect(result.current.roles).toContain("manager");
      expect(result.current.roles).toContain("user");
    });
  });

  describe("checkRole", () => {
    it("should return true for existing role", () => {
      const { result } = renderHook(() => useRole());
      expect(result.current.checkRole("admin")).toBe(true);
      expect(result.current.checkRole("manager")).toBe(true);
    });

    it("should return false for non-existing role", () => {
      const { result } = renderHook(() => useRole());
      expect(result.current.checkRole("guest")).toBe(false);
      expect(result.current.checkRole("nonexistent")).toBe(false);
    });
  });

  describe("checkAnyRole", () => {
    it("should return true if any role exists", () => {
      const { result } = renderHook(() => useRole());
      expect(result.current.checkAnyRole(["admin", "guest"])).toBe(true);
    });

    it("should return false if no role exists", () => {
      const { result } = renderHook(() => useRole());
      expect(result.current.checkAnyRole(["guest", "nonexistent"])).toBe(false);
    });
  });

  describe("isAdmin", () => {
    it("should return true for admin role", () => {
      const { result } = renderHook(() => useRole());
      expect(result.current.isAdmin()).toBe(true);
    });
  });

  describe("isManager", () => {
    it("should return true for manager role", () => {
      const { result } = renderHook(() => useRole());
      expect(result.current.isManager()).toBe(true);
    });
  });

  describe("isUser", () => {
    it("should return true for user role", () => {
      const { result } = renderHook(() => useRole());
      expect(result.current.isUser()).toBe(true);
    });
  });

  describe("isGuest", () => {
    it("should return false for non-guest user", () => {
      const { result } = renderHook(() => useRole());
      expect(result.current.isGuest()).toBe(false);
    });
  });

  describe("getRoleName", () => {
    it("should return 管理员 for admin", () => {
      const { result } = renderHook(() => useRole());
      expect(result.current.getRoleName()).toBe("管理员");
    });
  });

  describe("getRoleLevel", () => {
    it("should return correct role levels", () => {
      const { result } = renderHook(() => useRole());
      expect(result.current.getRoleLevel()).toBe(100); // admin level
    });
  });

  describe("currentRole", () => {
    it("should return the highest role name", () => {
      const { result } = renderHook(() => useRole());
      expect(result.current.currentRole).toBe("管理员");
    });
  });

  describe("roleLevel", () => {
    it("should return the highest role level", () => {
      const { result } = renderHook(() => useRole());
      expect(result.current.roleLevel).toBe(100);
    });
  });
});

describe("useRole with superuser", () => {
  it("should identify superuser as admin", () => {
    vi.doMock("../../hooks/useAuth", () => ({
      useAuth: vi.fn(() => ({
        hasRole: vi.fn(() => false),
        roles: [],
        user: { id: "1", name: "Admin", is_superuser: true },
      })),
    }));

    const { result } = renderHook(() => useRole());
    expect(result.current.isAdmin()).toBe(true);
    expect(result.current.getRoleName()).toBe("管理员");
  });
});
