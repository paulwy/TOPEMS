import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePermission } from "../../hooks/usePermission";

// Mock useAuth
vi.mock("../../hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    hasPermission: vi.fn((perm: string) => {
      const permissions = [
        "user:read",
        "user:write",
        "user:delete",
        "hrm:read",
        "hrm:write",
        "crm:admin",
      ];
      return permissions.includes(perm);
    }),
    hasAnyPermission: vi.fn((perms: string[]) => {
      const userPerms = [
        "user:read",
        "user:write",
        "user:delete",
        "hrm:read",
        "hrm:write",
        "crm:admin",
      ];
      return perms.some((p) => userPerms.includes(p));
    }),
    hasAllPermissions: vi.fn((perms: string[]) => {
      const userPerms = [
        "user:read",
        "user:write",
        "user:delete",
        "hrm:read",
        "hrm:write",
        "crm:admin",
      ];
      return perms.every((p) => userPerms.includes(p));
    }),
    permissions: ["user:read", "user:write", "user:delete", "hrm:read", "hrm:write", "crm:admin"],
    user: { id: "1", name: "Test User", is_superuser: false },
  })),
}));

describe("usePermission hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return permissions from auth", () => {
    const { result } = renderHook(() => usePermission());
    
    expect(result.current.permissions).toContain("user:read");
    expect(result.current.permissions).toContain("hrm:write");
  });

  it("should check single permission with checkPermission", () => {
    const { result } = renderHook(() => usePermission());
    
    expect(result.current.checkPermission("user:read")).toBe(true);
    expect(result.current.checkPermission("user:delete")).toBe(true);
    expect(result.current.checkPermission("nonexistent:read")).toBe(false);
  });

  it("should check any permission with checkAnyPermission", () => {
    const { result } = renderHook(() => usePermission());
    
    expect(result.current.checkAnyPermission(["user:read", "admin:read"])).toBe(true);
    expect(result.current.checkAnyPermission(["nonexistent:read", "admin:read"])).toBe(false);
  });

  it("should check all permissions with checkAllPermissions", () => {
    const { result } = renderHook(() => usePermission());
    
    expect(result.current.checkAllPermissions(["user:read", "user:write"])).toBe(true);
    expect(result.current.checkAllPermissions(["user:read", "nonexistent:read"])).toBe(false);
  });

  it("should get module permissions with getModulePermissions", () => {
    const { result } = renderHook(() => usePermission());
    
    const userPerms = result.current.getModulePermissions("user");
    expect(userPerms.read).toBe(true);
    expect(userPerms.write).toBe(true);
    expect(userPerms.delete).toBe(true);
    expect(userPerms.admin).toBe(false);

    const hrmPerms = result.current.getModulePermissions("hrm");
    expect(hrmPerms.read).toBe(true);
    expect(hrmPerms.write).toBe(true);
    expect(hrmPerms.admin).toBe(false);
  });

  it("should check module access with canAccessModule", () => {
    const { result } = renderHook(() => usePermission());
    
    expect(result.current.canAccessModule("user")).toBe(true);
    expect(result.current.canAccessModule("hrm")).toBe(true);
    expect(result.current.canAccessModule("nonexistent")).toBe(false);
  });

  it("should check module write access with canWriteModule", () => {
    const { result } = renderHook(() => usePermission());
    
    expect(result.current.canWriteModule("user")).toBe(true);
    expect(result.current.canWriteModule("hrm")).toBe(true);
    expect(result.current.canWriteModule("nonexistent")).toBe(false);
  });

  it("should check module delete access with canDeleteModule", () => {
    const { result } = renderHook(() => usePermission());
    
    expect(result.current.canDeleteModule("user")).toBe(true);
    expect(result.current.canDeleteModule("hrm")).toBe(false);
    expect(result.current.canDeleteModule("nonexistent")).toBe(false);
  });

  it("should check module admin access with canAdminModule", () => {
    const { result } = renderHook(() => usePermission());
    
    expect(result.current.canAdminModule("crm")).toBe(true);
    expect(result.current.canAdminModule("user")).toBe(false);
    expect(result.current.canAdminModule("hrm")).toBe(false);
  });

  it("should return isSuperuser as false for regular user", () => {
    const { result } = renderHook(() => usePermission());
    
    expect(result.current.isSuperuser).toBe(false);
  });

  it("should return stable memoized values", () => {
    const { result, rerender } = renderHook(() => usePermission());
    
    const firstRender = result.current;
    rerender();
    
    // The hook should return memoized values - check values are same
    expect(result.current.permissions).toStrictEqual(firstRender.permissions);
    expect(result.current.isSuperuser).toBe(firstRender.isSuperuser);
  });
});
