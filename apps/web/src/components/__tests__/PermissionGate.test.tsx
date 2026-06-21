import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import { PermissionGate, ModuleGate, RoleGate, AdminGate, SuperuserGate } from "../PermissionGate";
import { usePermission } from "../../hooks/usePermission";
import { useRole } from "../../hooks/useRole";

vi.mock("../../hooks/usePermission");
vi.mock("../../hooks/useRole");

describe("PermissionGate Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render children when permission is granted", () => {
    (usePermission as Mock).mockReturnValue({
      checkPermission: vi.fn(() => true),
      checkAnyPermission: vi.fn(),
      checkAllPermissions: vi.fn(),
    });

    render(
      <PermissionGate permission="iam:read">
        <div data-testid="content">Content</div>
      </PermissionGate>
    );

    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("should render fallback when permission is denied", () => {
    (usePermission as Mock).mockReturnValue({
      checkPermission: vi.fn(() => false),
      checkAnyPermission: vi.fn(),
      checkAllPermissions: vi.fn(),
    });

    render(
      <PermissionGate permission="iam:admin" fallback={<div data-testid="fallback">No Access</div>}>
        <div data-testid="content">Content</div>
      </PermissionGate>
    );

    expect(screen.queryByTestId("content")).not.toBeInTheDocument();
    expect(screen.getByTestId("fallback")).toBeInTheDocument();
  });

  it("should render children when no permission prop is provided", () => {
    (usePermission as Mock).mockReturnValue({
      checkPermission: vi.fn(),
      checkAnyPermission: vi.fn(),
      checkAllPermissions: vi.fn(),
    });

    render(
      <PermissionGate>
        <div data-testid="content">Content</div>
      </PermissionGate>
    );

    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("should check any permission when requireAll is false", () => {
    const checkAnyPermission = vi.fn(() => true);
    (usePermission as Mock).mockReturnValue({
      checkPermission: vi.fn(),
      checkAnyPermission,
      checkAllPermissions: vi.fn(),
    });

    render(
      <PermissionGate permission={["iam:read", "hrm:write"]} requireAll={false}>
        <div data-testid="content">Content</div>
      </PermissionGate>
    );

    expect(checkAnyPermission).toHaveBeenCalledWith(["iam:read", "hrm:write"]);
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("should check all permissions when requireAll is true", () => {
    const checkAllPermissions = vi.fn(() => true);
    (usePermission as Mock).mockReturnValue({
      checkPermission: vi.fn(),
      checkAnyPermission: vi.fn(),
      checkAllPermissions,
    });

    render(
      <PermissionGate permission={["iam:read", "hrm:write"]} requireAll={true}>
        <div data-testid="content">Content</div>
      </PermissionGate>
    );

    expect(checkAllPermissions).toHaveBeenCalledWith(["iam:read", "hrm:write"]);
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("should show disabled state when showDisabled is true and permission is denied", () => {
    (usePermission as Mock).mockReturnValue({
      checkPermission: vi.fn(() => false),
      checkAnyPermission: vi.fn(),
      checkAllPermissions: vi.fn(),
    });

    render(
      <PermissionGate permission="iam:admin" showDisabled>
        <button data-testid="button">Action</button>
      </PermissionGate>
    );

    const button = screen.getByTestId("button");
    expect(button).toBeInTheDocument();
    const wrapper = button.parentElement;
    expect(wrapper).toHaveStyle({ opacity: 0.5 });
    expect(wrapper).toHaveStyle({ cursor: "not-allowed" });
  });

  it("should render loading state when loading is true", () => {
    (usePermission as Mock).mockReturnValue({
      checkPermission: vi.fn(),
      checkAnyPermission: vi.fn(),
      checkAllPermissions: vi.fn(),
    });

    render(
      <PermissionGate permission="iam:read" loading>
        <div data-testid="content">Content</div>
      </PermissionGate>
    );

    expect(screen.queryByTestId("content")).not.toBeInTheDocument();
    // Loading state renders a Loader2 icon, check for loader
    const loader = screen.getByTestId("loader");
    expect(loader).toBeInTheDocument();
  });
});

describe("ModuleGate Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render children when module access is granted", () => {
    (usePermission as Mock).mockReturnValue({
      canAccessModule: vi.fn(() => true),
      canWriteModule: vi.fn(),
      canDeleteModule: vi.fn(),
      canAdminModule: vi.fn(),
    });

    render(
      <ModuleGate module="hrm" action="read">
        <div data-testid="content">HRM Content</div>
      </ModuleGate>
    );

    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("should check write permission for write action", () => {
    const canWriteModule = vi.fn(() => true);
    (usePermission as Mock).mockReturnValue({
      canAccessModule: vi.fn(),
      canWriteModule,
      canDeleteModule: vi.fn(),
      canAdminModule: vi.fn(),
    });

    render(
      <ModuleGate module="hrm" action="write">
        <div data-testid="content">HRM Content</div>
      </ModuleGate>
    );

    expect(canWriteModule).toHaveBeenCalledWith("hrm");
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("should check delete permission for delete action", () => {
    const canDeleteModule = vi.fn(() => false);
    (usePermission as Mock).mockReturnValue({
      canAccessModule: vi.fn(),
      canWriteModule: vi.fn(),
      canDeleteModule,
      canAdminModule: vi.fn(),
    });

    render(
      <ModuleGate module="hrm" action="delete" fallback={<div data-testid="fallback">No Delete</div>}>
        <div data-testid="content">HRM Content</div>
      </ModuleGate>
    );

    expect(canDeleteModule).toHaveBeenCalledWith("hrm");
    expect(screen.queryByTestId("content")).not.toBeInTheDocument();
    expect(screen.getByTestId("fallback")).toBeInTheDocument();
  });

  it("should check admin permission for admin action", () => {
    const canAdminModule = vi.fn(() => true);
    (usePermission as Mock).mockReturnValue({
      canAccessModule: vi.fn(),
      canWriteModule: vi.fn(),
      canDeleteModule: vi.fn(),
      canAdminModule,
    });

    render(
      <ModuleGate module="system" action="admin">
        <div data-testid="content">System Admin</div>
      </ModuleGate>
    );

    expect(canAdminModule).toHaveBeenCalledWith("system");
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });
});

describe("RoleGate Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render children when role is granted", () => {
    (useRole as Mock).mockReturnValue({
      checkRole: vi.fn(() => true),
      checkAnyRole: vi.fn(),
      isAdmin: vi.fn(),
      isSuperuser: vi.fn(),
    });

    render(
      <RoleGate role="admin">
        <div data-testid="content">Admin Content</div>
      </RoleGate>
    );

    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("should render fallback when role is denied", () => {
    (useRole as Mock).mockReturnValue({
      checkRole: vi.fn(() => false),
      checkAnyRole: vi.fn(),
      isAdmin: vi.fn(),
      isSuperuser: vi.fn(),
    });

    render(
      <RoleGate role="admin" fallback={<div data-testid="fallback">Not Admin</div>}>
        <div data-testid="content">Admin Content</div>
      </RoleGate>
    );

    expect(screen.queryByTestId("content")).not.toBeInTheDocument();
    expect(screen.getByTestId("fallback")).toBeInTheDocument();
  });

  it("should check any role when role is array and requireAll is false", () => {
    const checkAnyRole = vi.fn(() => true);
    (useRole as Mock).mockReturnValue({
      checkRole: vi.fn(),
      checkAnyRole,
      isAdmin: vi.fn(),
      isSuperuser: vi.fn(),
    });

    render(
      <RoleGate role={["admin", "manager"]} requireAll={false}>
        <div data-testid="content">Content</div>
      </RoleGate>
    );

    expect(checkAnyRole).toHaveBeenCalledWith(["admin", "manager"]);
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("should check all roles when role is array and requireAll is true", () => {
    (useRole as Mock).mockReturnValue({
      checkRole: vi.fn((role: string) => ["admin", "manager"].includes(role)),
      checkAnyRole: vi.fn(),
      isAdmin: vi.fn(),
      isSuperuser: vi.fn(),
    });

    render(
      <RoleGate role={["admin", "manager"]} requireAll={true}>
        <div data-testid="content">Content</div>
      </RoleGate>
    );

    expect(screen.getByTestId("content")).toBeInTheDocument();
  });
});

describe("AdminGate Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render children when user is admin", () => {
    (useRole as Mock).mockReturnValue({
      checkRole: vi.fn(),
      checkAnyRole: vi.fn(),
      isAdmin: vi.fn(() => true),
      isSuperuser: vi.fn(),
    });

    render(
      <AdminGate>
        <div data-testid="content">Admin Panel</div>
      </AdminGate>
    );

    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("should render fallback when user is not admin", () => {
    (useRole as Mock).mockReturnValue({
      checkRole: vi.fn(),
      checkAnyRole: vi.fn(),
      isAdmin: vi.fn(() => false),
      isSuperuser: vi.fn(),
    });

    render(
      <AdminGate fallback={<div data-testid="fallback">Not Admin</div>}>
        <div data-testid="content">Admin Panel</div>
      </AdminGate>
    );

    expect(screen.queryByTestId("content")).not.toBeInTheDocument();
    expect(screen.getByTestId("fallback")).toBeInTheDocument();
  });
});

describe("SuperuserGate Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render children when user is superuser", () => {
    (usePermission as Mock).mockReturnValue({
      isSuperuser: true,
      checkPermission: vi.fn(),
      checkAnyPermission: vi.fn(),
      checkAllPermissions: vi.fn(),
      canAccessModule: vi.fn(),
      canWriteModule: vi.fn(),
      canDeleteModule: vi.fn(),
      canAdminModule: vi.fn(),
    });

    render(
      <SuperuserGate>
        <div data-testid="content">Superuser Panel</div>
      </SuperuserGate>
    );

    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("should render fallback when user is not superuser", () => {
    (usePermission as Mock).mockReturnValue({
      isSuperuser: false,
      checkPermission: vi.fn(),
      checkAnyPermission: vi.fn(),
      checkAllPermissions: vi.fn(),
      canAccessModule: vi.fn(),
      canWriteModule: vi.fn(),
      canDeleteModule: vi.fn(),
      canAdminModule: vi.fn(),
    });

    render(
      <SuperuserGate fallback={<div data-testid="fallback">Not Superuser</div>}>
        <div data-testid="content">Superuser Panel</div>
      </SuperuserGate>
    );

    expect(screen.queryByTestId("content")).not.toBeInTheDocument();
    expect(screen.getByTestId("fallback")).toBeInTheDocument();
  });
});
